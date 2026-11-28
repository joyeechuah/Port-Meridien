// Port Meridien: Playing together: rooms with a code, friends drawn where they are, the Play together panel.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;
/* ================================================================ PLAY TOGETHER
   Friends share one city. One of you starts a room and gets a four-letter code; up to three friends join with it,
   each on their own phone or computer. Every game sends where its player is about eight times a second (in a car,
   on foot or on the boat; which car and paint, which outfit, a name) and draws the others there, a fifth of a second
   behind, so they move smoothly however the messages arrive. Traffic, townspeople, the police, races and the time of
   day stay each player's own.
   Online it goes through Firebase's Realtime Database (Singapore), signed in anonymously in a Firebase app of its own,
   so it never touches the cloud save's Google sign-in (database.rules.json says who may write what). With ?mp=local
   in the address it runs through a relay in the game's test server instead (npm start), which is how the tests run
   it, and a way to try it with two browsers on one computer. */
const NET={room:null,uid:null,tx:null,busy:false,joining:false,peers:new Map(),sendT:0,beatT:0,sent:"",note:"",at:0,
  MAX:4,RATE:1/8,BEAT:1,DELAY:.2,STALE:6,FAR:260};
const NET_LETTERS="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no 0 or O, 1 or I: they read alike
const NET_CODE=/^[A-HJ-NP-Z2-9]{4}$/;
const netLocal=()=>/[?&]mp=local\b/.test(location.search);
const netReady=()=>netLocal()||!!(FIREBASE_CONFIG.databaseURL&&FIREBASE_CONFIG.apiKey);
function netNewCode(){const a=new Uint32Array(4);crypto.getRandomValues(a);return [...a].map(v=>NET_LETTERS[v%NET_LETTERS.length]).join("")}
const netCodeOf=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4);
// a name: letters, digits, spaces and a few marks, at most 12 characters; blank is "Player"
// (in one Unicode form, NFC: a pasted "Inês" spelt as e plus a combining accent lost its accent and read "Ines")
// (and cut at a whole character: 12 UTF-16 units, as the room's rules count, without splitting a character beyond the
// first 65,536 in two, which left half of it behind; Codex's review)
const netName=s=>{let o="";for(const ch of String(s||"").normalize("NFC").replace(/[^\p{L}\p{N} .'_-]/gu,"").replace(/\s+/g," ").trim()){if(o.length+ch.length>12)break;o+=ch}return o};
const netMyName=()=>netName(save.nick)||"Player";

/* ---------- the two ways to reach the others ---------- */
// each has connect() → my id, open(code, create, {state, leave, first, lost}), put(message) and close()

// the room on Firebase's Realtime Database: rooms/CODE/players holds four numbered seats, "0" to "3", each {uid, my
// state}. The rules (database.rules.json, published in the Firebase console) let a signed-in player read a room by
// its code, sit in a free seat or keep their own, hold one seat at most and write nothing else, so a room never has
// more than four players. A seat is emptied when its player leaves, closes the game or loses the connection: the
// database does that last one itself. The connection is only open while in a room (the free plan allows 100 at once)
function netFirebase(){
  let auth=null,db=null,room=null,live=null,seat=-1,uid="",on=null,online=false,last=null,moving=null,dead=false;
  const at=(r=room,s=seat)=>r?r.child(String(s)):null,quiet=p=>p?p.catch(()=>{}):Promise.resolve();
  const denied=e=>/permission/i.test(e&&(e.code||e.message)||"");
  // who sits in each seat (null: free), and the seat to take: the one I still hold (just after a reload the database
  // may not have emptied it yet), or the first free one
  const seats=(r=room)=>!r||dead?Promise.reject(new Error("closed")):r.once("value").then(s=>[0,1,2,3].map(i=>{const v=s.child(String(i)).val();return v&&typeof v.uid==="string"?v.uid:null}));
  const pick=t=>t.indexOf(uid)>=0?t.indexOf(uid):t.indexOf(null);
  const write=(d,ref=at())=>!ref||dead?Promise.reject(new Error("closed")):ref.set(Object.assign({},d,{uid}));
  // sit in seat i, and only then ask the database to empty it if the connection drops: asked before, a seat someone
  // else was quicker to would be emptied under them
  const take=(i,d)=>{const r=room,ref=at(r,i);if(!ref||dead)return Promise.reject(new Error("closed"));seat=i;
    return write(d,ref).then(()=>dead?quiet(ref.remove()):ref.onDisconnect().remove().then(()=>{if(dead)return quiet(ref.remove())}),e=>{if(seat===i)seat=-1;throw e})};
  // back online after a drop: the database may have emptied my seat meanwhile, so sit in it again, or in another if
  // someone has taken it (and cancel the request to empty the old one, which is theirs now)
  const reseat=()=>{if(moving||!last||dead||!room||seat<0)return;
    const r=room,ref=at(r,seat);
    moving=write(last,ref).then(()=>dead?quiet(ref.remove()):ref.onDisconnect().remove(),e=>{if(dead)return;if(!denied(e))throw e;
        return quiet(ref.onDisconnect().cancel()).then(()=>seats(r)).then(t=>{if(dead)return;const i=pick(t);if(i<0)throw new Error("full");return take(i,last)})})
      .catch(e=>{if(!dead){console.warn("Play together: lost my seat ("+e.message+")");on.lost()}}).then(()=>{moving=null})};
  return{
    connect(){
      return fbLoad("firebase-app-compat.js").then(()=>Promise.all([fbLoad("firebase-auth-compat.js"),fbLoad("firebase-database-compat.js")])).then(()=>{
        if(dead)throw new Error("closed");
        const fb=window.firebase,app=fb.apps.find(a=>a.name==="play")||fb.initializeApp(FIREBASE_CONFIG,"play");
        auth=app.auth();db=app.database();db.goOnline();
        return auth.currentUser?auth.currentUser:auth.signInAnonymously().then(r=>r.user)}).then(u=>u.uid)},
    open(code,create,handlers){
      on=handlers;uid=auth.currentUser.uid;room=db.ref("rooms/"+code+"/players");
      const sit=n=>seats().then(t=>{const held=t.filter(Boolean).length,i=pick(t);
        if(create&&held&&t.indexOf(uid)<0)throw new Error("taken");
        if(!create&&!held)throw new Error("There's no room with that code. Check it with your friend.");
        if(i<0)throw new Error("That room is full: four players already.");
        // someone sat down in that seat a moment before me: look again
        return take(i,last=on.first()).catch(e=>{if(denied(e)&&n<3)return sit(n+1);throw e})});
      return sit(0).then(()=>{
        if(dead||!room)return;
        online=true;
        // the others, by seat: a seat's player is told apart from whoever sat there before
        const who=new Map(),got=s=>{const d=s.val();if(!d||typeof d.uid!=="string")return;const was=who.get(s.key);
          if(was&&was!==d.uid&&was!==uid)on.leave(was);who.set(s.key,d.uid);if(d.uid!==uid)on.state(d.uid,d)};
        room.on("child_added",got);room.on("child_changed",got);
        room.on("child_removed",s=>{const was=who.get(s.key);who.delete(s.key);if(was&&was!==uid)on.leave(was)});
        live=db.ref(".info/connected");live.on("value",s=>{if(dead)return;const was=online;online=s.val()===true;if(online&&!was)reseat()});
      })},
    // nothing is queued while the connection is down (a minute offline would be hundreds of stale positions); a send
    // refused because the seat has gone to someone else moves me to another
    put(d){last=d;if(!online||moving||seat<0||dead)return;write(d).catch(e=>{if(dead)return;if(denied(e))reseat();else console.warn("Play together: couldn't send ("+e.message+")")})},
    close(){dead=true;const r=room,s=seat,d=db;if(live)live.off();if(r)r.off();live=room=null;seat=-1;
      const done=()=>{if(d&&!NET.tx)d.goOffline()};
      if(r&&s>=0){let off=false;const fin=()=>{if(off)return;off=true;done()};quiet(r.child(String(s)).remove()).then(fin);setTimeout(fin,1500)}
      else done()}
  };
}
// on this computer, through the relay in the game's own test server (npm start, tests/support/server.js): who's
// here, my state, goodbye. Two browsers (or two browser profiles) can play together this way; two tabs of one browser
// can't, because the game runs in one tab at a time to protect the save
function netRelay(){
  const uid="r"+netNewCode()+netNewCode();let es=null,url="",last=null;
  const post=m=>fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(m)}).catch(()=>{});
  return{
    connect(){return Promise.resolve(uid)},
    open(code,create,on){
      // here: the players answering; ahead: others still joining with me, so two of them can't both take the last place
      // (whoever has the lower id goes first; Codex's audit)
      url="/__play/"+code;const here=new Set(),ahead=new Set();let wait=true;
      return new Promise((res,rej)=>{es=new EventSource(url);es.onopen=()=>res();es.onerror=()=>{if(es.readyState!==1)rej(new Error("no relay at "+url))}})
        .then(()=>{
          es.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}if(!m||m.uid===uid)return;
            if(m.k==="who"){if(last)post({k:"st",uid,d:last});else if(wait){if(m.uid<uid)ahead.add(m.uid);post({k:"pend",uid})}}
            else if(m.k==="pend"){if(wait&&m.uid<uid)ahead.add(m.uid)}
            else if(m.k==="st"){here.add(m.uid);ahead.delete(m.uid);on.state(m.uid,m.d)}
            // (someone leaving while I look no longer counts as being here: the last host leaving made an empty room joinable)
            else if(m.k==="bye"){here.delete(m.uid);ahead.delete(m.uid);on.leave(m.uid)}};
          post({k:"who",uid});return new Promise(r=>setTimeout(r,400))})
        .then(()=>{
          if(create&&here.size)throw new Error("taken");
          if(!create&&!here.size)throw new Error("There's no room with that code. Check it with your friend.");
          if(here.size+(create?0:ahead.size)>=NET.MAX)throw new Error("That room is full: four players already.");wait=false})
        .catch(e=>{wait=false;if(es){post({k:"bye",uid});es.close();es=null}throw e})},
    put(d){last=d;if(es)post({k:"st",uid,d})},
    close(){if(es){post({k:"bye",uid});es.close()}es=null}
  };
}

/* ---------- joining, starting and leaving ---------- */
function netNote(t){NET.note=t;if(!$("play").classList.contains("hide"))netRender()}
function netFail(e){NET.busy=false;NET.joining=false;if(NET.tx&&!NET.room){try{NET.tx.close()}catch(_){}NET.tx=null;for(const p of NET.peers.values())netDrop(p);NET.peers.clear()}
  const m=e&&e.message||"";netNote(/^(There's|That room)/.test(m)?m:"Couldn't connect. Check your internet connection and try again.");
  if(!/^(There's|That room)/.test(m))console.warn("Play together: "+m)}
function netBegin(code,create){
  if(NET.busy||NET.room)return;
  if(!netReady()){netNote("Playing together isn't set up on this copy of the game.");return}
  NET.busy=true;netNote(create?"Starting a room…":"Joining room "+code+"…");
  const tx=NET.tx=netLocal()?netRelay():netFirebase();
  // first: what I sit down with; lost: my seat went while I was offline and the room is full now
  const on={state:netGot,leave:netGone,first:()=>Object.assign(netState(),{t:Date.now()}),lost:netLost};
  let tries=0;
  // joining, the players already there count as arrived; starting, anyone answering means the code is taken
  const attempt=c=>{NET.at=performance.now()/1000;NET.joining=!create;return tx.open(c,create,on).then(()=>c,e=>{if(e.message==="taken"&&create&&++tries<6)return attempt(netNewCode());throw e})};
  // an answer within 20 s, or "Couldn't connect" (a blocked or very slow connection would otherwise wait forever)
  netWithin(tx.connect().then(uid=>{
    if(NET.tx!==tx)throw new Error("closed");
    NET.uid=uid;return attempt(code)}),20).then(c=>{if(NET.tx!==tx)return;
    NET.busy=false;NET.joining=false;NET.room=c;NET.sent="";NET.sendT=NET.beatT=0;netNote("");netSend(true);
    toast(create?"ROOM "+c:"JOINED ROOM "+c,create?"Share the code: your friends join with PLAY TOGETHER in the pause menu":"You're playing together","gold");
  }).catch(e=>{if(NET.tx===tx)netFail(e)});
}
const netWithin=(p,s)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error("no answer in "+s+" s")),s*1000))]);
function netLost(){if(!NET.room)return;netLeave();netNote("Your connection dropped, and the room filled up before it came back.");toast("ROOM FULL","You lost your place while offline")}
function netStart(){netBegin(netNewCode(),true)}
function netJoin(){const c=netCodeOf($("plCode").value);if(!NET_CODE.test(c)){netNote("A room code is four letters and numbers, like K7PM.");return}netBegin(c,false)}
function netLeave(){
  if(NET.tx){try{NET.tx.close()}catch(e){}}
  for(const p of NET.peers.values())netDrop(p);
  NET.peers.clear();NET.tx=null;NET.room=null;NET.busy=false;netNote("");
}
addEventListener("pagehide",()=>{if(NET.room&&NET.tx){try{NET.tx.close()}catch(e){}}});

/* ---------- what I send ---------- */
// m: 0 driving, 1 on foot, 2 on the boat, 3 away (in the garage, the dealership or another screen)
function netState(){
  // (a hidden tab is away, from the first message on: a join while hidden published you driving; Codex's audit)
  const r=(v,k)=>Number.isFinite(v)?Math.round(v*k)/k:0,a=activePlayer(),out=!(typeof document!=="undefined"&&document.hidden)&&(state==="DRIVE"||state==="PAUSE"||state==="MAP"||state==="PHOTO");
  const d={n:netMyName(),o:save.outfit,m:3,x:0,y:0,z:0,h:0,v:0};
  if(!out||!pc)return d;
  if(BOAT.on){d.m=2;d.y=r(BOAT.m.position.y,100);d.v=r(BOAT.v||0,10)}
  else if(FOOT.on){d.m=1;d.y=r(FOOT.y,100);d.v=r(FOOT.v||0,10)}
  else{d.m=0;d.y=r(pc.G.position.y,100);d.v=r(speedF(),10);d.c=STREET.has(curId)?STREET.get(curId).base:curCar().id;d.p=testDrive?testDrive.paint:paintOf(curId);const q=pc.G.quaternion;d.q=[q.x,q.y,q.z,q.w].map(v=>r(v,1000))}
  if(state!=="DRIVE")d.v=0;
  d.x=r(a.x,100);d.z=r(a.z,100);d.h=r(a.h,1000);
  return d;
}
function netSend(force){
  if(!NET.room||!NET.tx)return;
  // (away whenever the tab is hidden, as the hiding itself says: a send meanwhile, a join finishing in a tab in the
  // background, say, said "driving" again straight after; Codex's review)
  const d=netState();if(document.hidden)d.m=3;
  const key=JSON.stringify(d);
  if(!force&&key===NET.sent&&NET.beatT<NET.BEAT)return;
  NET.sent=key;NET.beatT=0;d.t=Date.now();NET.tx.put(d);
}
addEventListener("visibilitychange",()=>{if(document.hidden&&NET.room&&NET.tx){const d=netState();d.m=3;d.t=Date.now();NET.tx.put(d);NET.sent=""}});

/* ---------- the others ---------- */
// a friend's message: finite numbers, and a place on or around the island at a speed a car can reach. The room's rules
// only check they're numbers, so a message from a broken or hostile client with 1e308 for a position used to be drawn,
// and the maths that placed its car and name tag came out as Infinity and NaN
const NET_LIM={xz:6000,y:[-60,600],v:200};   // roads reach about 1.2 km out; the fastest car tops out near 122 m/s
const NET_OK=d=>d&&typeof d==="object"&&[d.x,d.y,d.z,d.h,d.v].every(v=>typeof v==="number"&&Number.isFinite(v))&&[0,1,2,3].includes(d.m)&&
  Math.abs(d.x)<=NET_LIM.xz&&Math.abs(d.z)<=NET_LIM.xz&&d.y>=NET_LIM.y[0]&&d.y<=NET_LIM.y[1]&&Math.abs(d.v)<=NET_LIM.v;
// a car's rotation: four finite numbers, or none (then the heading is used). The rules accept part of one, and the
// database may hand it back as an object, so it's checked here rather than trusted
const NET_Q=q=>{const a=Array.isArray(q)?q:q&&typeof q==="object"?[q[0],q[1],q[2],q[3]]:null;
  return a&&a.length===4&&a.every(v=>typeof v==="number"&&Number.isFinite(v))&&Math.hypot(a[0],a[1],a[2],a[3])>.5?a:undefined};
function netGot(uid,d){
  if(!NET_OK(d)||(!NET.room&&!NET.joining))return;
  d=Object.assign({},d,{q:NET_Q(d.q)});
  let p=NET.peers.get(uid);const now=performance.now()/1000;
  if(!p){
    // a full room on the local relay: someone gone quiet for good (their browser closed with no goodbye, and the relay has
    // no seats to empty) makes way for the player it has just let in, who was otherwise never seen (Codex's review)
    if(NET.peers.size>=NET.MAX-1&&netLocal()){const old=[...NET.peers.values()].filter(q=>now-q.seen>NET.STALE).sort((a,b)=>a.seen-b.seen)[0];
      if(old){if(typeof netGone==="function")netGone(old.uid);else NET.peers.delete(old.uid)}}
    if(NET.peers.size>=NET.MAX-1)return;p={uid,buf:[],model:null,key:"",tag:null,name:"",phase:0,seen:now,shown:false,lost:false};NET.peers.set(uid,p);
    // whoever was already there when I joined "is here"; anyone after that "joined"
    toast(netName(d.n).toUpperCase()||"A FRIEND",now-NET.at<3?"is in the room":"joined the room","gold")}
  p.seen=now;
  // (an older message arriving after a newer one is dropped: it moved them back; Codex's audit)
  const last=p.buf.length?p.buf[p.buf.length-1].d:null;
  if(last&&Number.isFinite(d.t)&&Number.isFinite(last.t)&&d.t<last.t)return;
  p.buf.push({t:now,d});if(p.buf.length>12)p.buf.shift();
  const name=netName(d.n)||"Friend";if(name!==p.name){p.name=name;netTag(p)}
  if(!$("play").classList.contains("hide"))netRender();
}
function netGone(uid){const p=NET.peers.get(uid);if(!p)return;netDrop(p);NET.peers.delete(uid);toast(p.name.toUpperCase(),"left the room");if(!$("play").classList.contains("hide"))netRender()}
// a friend's car is theirs alone and goes with them; a walker's shapes are shared by outfit (netLook) and its face's
// picture by everyone with that face, but the face's material is its own (a friend in and out of cars left one each time)
function netDropModel(p){if(!p.model)return;if(p.model.kind==="car")disposeHeroCar(p.model);else{scene.remove(p.model.G);if(p.model.face)p.model.face.m.dispose()}p.model=null}
function netDrop(p){netDropModel(p);if(p.tag){scene.remove(p.tag);p.tag.material.map.dispose();p.tag.material.dispose()}p.model=p.tag=null}
// a name above each friend, readable from a distance and through walls, so you can find each other
function netTag(p){
  if(p.tag){scene.remove(p.tag);p.tag.material.map.dispose();p.tag.material.dispose()}
  const cv=document.createElement("canvas");cv.width=256;cv.height=64;const c=cv.getContext("2d");
  c.font="700 30px Barlow,Arial";const w=Math.min(240,c.measureText(p.name).width+28);
  c.fillStyle="rgba(13,26,34,.78)";c.beginPath();c.roundRect?c.roundRect(128-w/2,8,w,48,12):c.rect(128-w/2,8,w,48);c.fill();
  c.fillStyle="#3fe0a0";c.fillRect(128-w/2+10,28,8,8);
  c.fillStyle="#fff";c.textAlign="center";c.textBaseline="middle";c.fillText(p.name,134,33,w-34);
  const t=new THREE.CanvasTexture(cv),m=new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true});
  p.tag=new THREE.Sprite(m);p.tag.scale.set(2.4,.6,1);p.tag.renderOrder=30;p.tag.visible=false;scene.add(p.tag);
}
// a friend on foot in an outfit: the body, legs and arms, made once per outfit (each new walker made three new shapes)
const NET_LOOKS=new Map();
function netLook(o){let L=NET_LOOKS.get(o.id);if(!L)NET_LOOKS.set(o.id,L=figureLook(o.shirt,o.pants,0xc49a7a,0x2a1d16,false));return L}
// the model a friend needs now: their car in its paint, a person in their outfit, or a copy of the boat
function netModel(p,d){
  const key=d.m===0?"car:"+d.c+":"+d.p:d.m===1?"foot:"+d.o:d.m===2?"boat":"away";
  if(key===p.key)return;
  netDropModel(p);p.key=key;
  if(d.m===0){const cd=carById(d.c)||CARS[0],col=Number.isInteger(d.p)&&d.p>=0&&d.p<=0xffffff?d.p:cd.body;p.model={kind:"car",G:buildHeroCar(cd,col,Object.assign({},MOD_STOCK)).G};scene.add(p.model.G)}
  else if(d.m===1){const o=OUTFITS.find(x=>x.id===d.o)||OUTFITS[0],m=pedModel(0,1,netLook(o));p.model={kind:"foot",G:m.G,legs:m.legs,arms:m.arms,face:m.face}}
  else if(d.m===2&&BOAT.m){const G=BOAT.m.clone();G.traverse(o=>{if(o===BOAT.wake||o.material===BOAT.wake.material)o.visible=false});scene.add(G);p.model={kind:"boat",G}}
}
// where a friend is now: between the two messages either side of a fifth of a second ago, or a little past the
// last one if the next is late (then holding still)
function netAt(p,t){
  const b=p.buf;if(!b.length)return null;
  if(t<=b[0].t)return b[0].d;
  for(let i=b.length-1;i>0;i--)if(b[i-1].t<=t){const A=b[i-1],B=b[i];if(t>B.t)break;const k=(t-A.t)/Math.max(1e-3,B.t-A.t),a=A.d,c=B.d;
    // getting in or out (or aboard): as they were until the moment it happened (the new state used to show at once, up
    // to a whole message early; Codex's review)
    if(a.m!==c.m)return k>=1?c:a;
    // a jump no car could drive in the time between (map travel, going home, a missed message): there at once, not a
    // glide across the island through the middle (Codex's audit). Faster than 120 m/s, with 80 m to spare
    if(Math.hypot(c.x-a.x,c.z-a.z)>80+120*(B.t-A.t))return k>=1?c:a;
    return {...c,x:lerp(a.x,c.x,k),y:lerp(a.y,c.y,k),z:lerp(a.z,c.z,k),h:a.h+wrapA(c.h-a.h)*k,
      q:a.q&&c.q?(()=>{const q=new THREE.Quaternion(...a.q).slerp(new THREE.Quaternion(...c.q),k);return[q.x,q.y,q.z,q.w]})():c.q}}
  const L=b[b.length-1],ahead=Math.min(.4,Math.max(0,t-L.t)),d=L.d;
  return d.m===3?d:{...d,x:d.x+Math.sin(d.h)*d.v*ahead,z:d.z+Math.cos(d.h)*d.v*ahead};
}
// every frame (from the main loop): send mine when it changed (at most eight times a second, and once a second
// anyway), and move the others. In Photo Mode they hold still with everything else
function netTick(dt){
  if(!NET.room)return;
  NET.sendT+=dt;NET.beatT+=dt;if(NET.sendT>=NET.RATE){NET.sendT=0;netSend(false)}
  if(state==="PHOTO")return;
  const now=performance.now()/1000,me=activePlayer();
  for(const p of NET.peers.values()){
    const d=netAt(p,now-NET.DELAY),stale=now-p.seen>NET.STALE;
    // going quiet (or back) shows in the open room list at once; it said "driving" until something else redrew it
    if(stale!==!!p.lost){p.lost=stale;if(!$("play").classList.contains("hide"))netRender()}
    if(!d||stale||d.m===3){if(p.model)p.model.G.visible=false;if(p.tag)p.tag.visible=false;p.shown=false;continue}
    netModel(p,d);if(!p.model)continue;
    const G=p.model.G,far=Math.hypot(d.x-me.x,d.z-me.z)>NET.FAR;
    G.visible=true;p.shown=true;
    if(p.model.kind==="car"){G.position.set(d.x,d.y,d.z);if(d.q)G.quaternion.set(d.q[0],d.q[1],d.q[2],d.q[3]);else G.rotation.set(0,d.h,0)}
    else{G.position.set(d.x,d.y,d.z);G.rotation.set(0,d.h,0)}
    if(p.model.kind==="foot"){
      // legs and arms swing with the distance walked, like the people in town
      p.phase+=Math.abs(d.v)*dt*2.6;const sw=Math.sin(p.phase)*Math.min(.6,Math.abs(d.v)*.25);
      p.model.legs[0].rotation.x=sw;p.model.legs[1].rotation.x=-sw;p.model.arms[0].rotation.x=-sw*.8;p.model.arms[1].rotation.x=sw*.8}
    if(p.tag){p.tag.visible=!far;p.tag.position.set(d.x,d.y+(d.m===1?2.25:d.m===2?3:2.2),d.z)}
  }
}
// friends on the minimap and the map: a green dot (a ring when they're out of the car)
function netMini(c,sc){
  const now=performance.now()/1000;
  for(const p of NET.peers.values()){if(!p.shown)continue;const d=netAt(p,now-NET.DELAY);if(d)dotAt(c,d.x,d.z,4.2,"#3fe0a0",sc,true)}
}
function netMap(c,s){
  const now=performance.now()/1000;c.font=`700 ${12/s}px Barlow,Arial`;c.textAlign="center";c.textBaseline="middle";
  for(const p of NET.peers.values()){if(!p.shown)continue;const d=netAt(p,now-NET.DELAY);if(!d)continue;
    dotAt(c,d.x,d.z,6,"#3fe0a0",s,true);c.fillStyle="#fff";c.strokeStyle="rgba(13,26,34,.9)";c.lineWidth=3/s;c.strokeText(p.name,d.x,d.z-14/s);c.fillText(p.name,d.x,d.z-14/s)}
}

/* ---------- the Play together panel (pause menu) ---------- */
const NET_DOING=["driving","on foot","on the boat","in a menu"];
function netRender(){
  const inRoom=!!NET.room;
  show("plOut",!inRoom);show("plIn",inRoom);
  $("plStart").disabled=$("plJoin").disabled=NET.busy;
  if(document.activeElement!==$("plName"))$("plName").value=save.nick||"";
  if(inRoom){$("plRoom").textContent=NET.room;
    const list=$("plList");list.replaceChildren();
    const row=(name,what,me)=>{const r=document.createElement("div");r.className="plRow"+(me?" me":"");const b=document.createElement("b"),s=document.createElement("span");b.textContent=name;s.textContent=what;r.append(b,s);list.appendChild(r)};
    row(netMyName()+" (you)","",true);
    const now=performance.now()/1000;
    for(const p of NET.peers.values()){const d=p.buf.length?p.buf[p.buf.length-1].d:null;row(p.name,now-p.seen>NET.STALE?"not responding":d?NET_DOING[d.m]:"",false)}
    $("plCount").textContent=(NET.peers.size+1)+" of "+NET.MAX+" players";}
  $("plNote").textContent=NET.note;
}
function netOpen(){if(state!=="PAUSE")return;netRender();$("pause").inert=true;show("play",true);try{(NET.room?$("plLeave"):$("plStart")).focus({preventScroll:true})}catch(e){}}
function netClose(){show("play",false);$("pause").inert=false;try{$("pPlay").focus({preventScroll:true})}catch(e){}}
$("pPlay").onclick=netOpen;$("plClose").onclick=netClose;$("plStart").onclick=netStart;$("plJoin").onclick=netJoin;
$("plLeave").onclick=()=>{netLeave();netRender()};
$("plCode").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();netJoin()}});
$("plCode").addEventListener("input",()=>{const c=netCodeOf($("plCode").value);if($("plCode").value!==c)$("plCode").value=c});
$("plName").addEventListener("change",()=>{save.nick=netName($("plName").value);$("plName").value=save.nick;persist();if(NET.room)netSend(true);netRender()});
// the invitation: the room and this page, keeping ?mp=local in a room on the local relay, or a friend following the
// link would look for the room on the other service
const netInvite=()=>"Play Port Meridien with me: room "+NET.room+". "+location.origin+location.pathname+(netLocal()?"?mp=local":"");
$("plShare").onclick=()=>{
  const text=netInvite();
  if(navigator.share)navigator.share({title:"Port Meridien",text}).catch(()=>{});
  else if(navigator.clipboard)navigator.clipboard.writeText(text).then(()=>netNote("Copied. Send it to your friends."),()=>netNote("Room "+NET.room+": tell your friends this code."));
  else netNote("Room "+NET.room+": tell your friends this code.");
};
