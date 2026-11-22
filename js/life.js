// Port Meridien: The life side of the game: the people of Old Quay with their names and personalities, talking to them,
// and the friendships they remember.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;

/* ================================================================ PEOPLE: who each passer-by is */
// Each pedestrian slot is always the same person (their clothes come from the slot too), so a friend made today is the
// same face tomorrow. Sixteen people; a phone shows the first six, a computer the first ten (PED_V.cap)
const PEOPLE=[
  ["Maya","cheerful"],["Theo","grumpy"],["Inês","joker"],["Kofi","chatty"],["Lena","shy"],["Rafael","busy"],
  ["Aiko","joker"],["Omar","cheerful"],["Sofia","chatty"],["Jonah","grumpy"],["Priya","shy"],["Mateo","busy"],
  ["Nadia","cheerful"],["Elias","joker"],["Mei","chatty"],["Hugo","shy"]
].map(([name,trait],id)=>({id,name,trait}));
const TRAIT_LABEL={cheerful:"Cheerful",grumpy:"Grumpy",joker:"Loves a joke",chatty:"Chatty",shy:"Shy",busy:"Always in a hurry"};
const personOf=p=>PEOPLE[PEDS.indexOf(p)]||null;

/* ================================================================ FRIENDSHIP: from -100 to 100, kept in the save */
// save.rel[id] = {f: friendship, n: conversations had}. Missing means you've never met
const rel=id=>save.rel[id]||{f:0,n:0};
function relSet(id,f,n){save.rel[id]={f:Math.round(clamp(f,-100,100)),n:Math.min(9999,n)}}
function relLabel(r){
  if(!r||!r.n)return"Stranger";const f=r.f;
  return f<=-50?"Enemy":f<=-15?"Dislikes you":f<15?"Acquaintance":f<40?"Friendly":f<70?"Friend":f<90?"Good friend":"Best friend";
}

/* ================================================================ TALKING */
// What you can say, and how much it moves a friendship before their personality and repetition change it
const TALKS=[
  {id:"hello",label:"Say hello",base:4},{id:"chat",label:"Chat",base:6},{id:"joke",label:"Tell a joke",base:7},
  {id:"compliment",label:"Compliment",base:6},{id:"tip",label:"Ask for a local tip",base:2},{id:"rude",label:"Be rude",base:-12}
];
// how each personality takes each kind of talk: a multiplier on its effect, and a negative one turns a friendly line sour
const TAKES={
  cheerful:{hello:1.3,chat:1.2,joke:1.3,compliment:1.2,tip:1,rude:1.3},
  grumpy:{hello:.5,chat:.6,joke:-.6,compliment:.7,tip:.8,rude:1},
  joker:{hello:1,chat:.9,joke:2,compliment:.8,tip:1,rude:.8},
  chatty:{hello:1.1,chat:1.8,joke:1,compliment:1,tip:1.4,rude:1.2},
  shy:{hello:1.2,chat:.8,joke:.8,compliment:1.5,tip:1,rude:2},
  busy:{hello:.8,chat:.5,joke:.7,compliment:.8,tip:1.2,rude:1}
};
/** @type {{p:any,person:any,used:Object<string,number>,n:number,busy:number,end:number,sel:number}} */
const TALK={p:null,person:null,used:{},n:0,busy:0,end:0,sel:0};
const LIFE={t:0};
// who you can talk to: someone near you on the pavement, not lying down, crossing the road or still shaken by your car
const talkable=p=>FOOT.on&&!TALK.p&&!!personOf(p)&&p.m.G.visible&&p.st!=="down"&&p.st!=="cross"&&!(copClock-(p.hitAt??-99)<4);
function talkOpen(p){
  if(!talkable(p))return false;
  const who=personOf(p),r=rel(who.id);
  Object.assign(TALK,{p,person:who,used:{},n:0,busy:0,end:0,sel:0});
  p.st="talk";p.v=0;
  // you turn to face them, and they turn to face you (pedUpdate)
  FOOT.h=Math.atan2(p.x-FOOT.x,p.z-FOOT.z);FOOT.v=0;
  emote(p,"talk",1.6);
  talkShow(r.n?(r.f>=35?who.name+" is glad to see you.":r.f<=-15?who.name+" doesn't look pleased to see you.":who.name+" remembers you."):"You walk up to "+who.name+".");
  promptAct=null;show("prompt",false);
  const b=$("tkActs").children[0];if(b&&!isTouch)/** @type {HTMLElement} */(b).focus({preventScroll:true});
  return true;
}
function talkClose(){
  const p=TALK.p;if(!p)return;
  if(p.st==="talk"){p.st="idle";p.t=1.2}
  TALK.p=TALK.person=null;show("talk",false);
}
// say something: the friendship moves by the line's weight, times how this person takes it, less each time you repeat
// it in one conversation, and less as a friendship nears its top
function talkPick(k){
  if(!TALK.p||TALK.busy>0||TALK.end>0)return false;
  const t=TALKS.find(x=>x.id===k);if(!t)return false;
  const who=TALK.person,p=TALK.p,r=rel(who.id),used=TALK.used[t.id]||0;
  let d=t.base*TAKES[who.trait][t.id]/(1+used*(t.id==="hello"?4:1));
  if(d>0)d*=1-Math.max(0,r.f)/125;
  d=Math.round(d);
  TALK.used[t.id]=used+1;TALK.n++;TALK.busy=.7;
  relSet(who.id,r.f+d,r.n+(TALK.n===1?1:0));
  emote(p,d>=8?(t.id==="joke"?"laugh":"heart"):d>=2?(t.id==="joke"?"laugh":"smile"):d>0?"smile":d===0?"meh":d>-8?"frown":"angry");
  let line=talkReaction(who,t.id,d);
  if(t.id==="tip")line+=" “"+talkTip(who)+"”";
  const now=rel(who.id);
  // someone who has come to dislike you badly walks off; someone in a hurry gives you three lines at most
  if(now.f<=-50){line+=" "+who.name+" walks off.";TALK.end=1.4}
  else if(who.trait==="busy"&&TALK.n>=3){line+=" “Sorry, I have to run!”";TALK.end=1.4}
  talkShow(line);persist();
  return true;
}
function talkReaction(who,k,d){
  const n=who.name;
  if(k==="hello")return d>=3?n+" waves back.":d>0?n+" nods.":n+" barely looks up.";
  if(k==="chat")return d>=6?n+" chats happily.":d>0?n+" chats a little.":n+" isn't in the mood to chat.";
  if(k==="joke")return d>=4?n+" laughs.":d>0?n+" chuckles.":d===0?n+" doesn't get it.":n+" doesn't laugh.";
  if(k==="compliment")return d>=6&&who.trait==="shy"?n+" blushes.":d>0?n+" smiles.":n+" isn't impressed.";
  if(k==="tip")return d>=0?n+" thinks for a moment.":n+" sighs.";
  return d<=-15?n+" looks hurt.":d>-8?n+" shrugs it off.":n+" glares at you.";
}
const COMPASS=["north","north-east","east","south-east","south","south-west","west","north-west"];
// east is +x and south is +z, as on the map
const compass=(dx,dz)=>COMPASS[Math.round(((Math.atan2(dx,-dz)/TAU)*8+8))%8];
const TIPS=[
  "Any car parked with nobody in it is yours to take. Just walk up to it.",
  "There's a first-aid kit by the fountain in the civic square, and another by the harbour pier.",
  "The police give up once you've been out of their sight for a while.",
  "The Auto Gallery lets you test-drive a car before you buy it.",
  "The boat at the harbour pier will take you round the coast.",
  "Contracts pay well if you're quick about them."
];
// a friend points you at a landmark you haven't found yet, with its passport hint and which way it is from here;
// anyone else tells you something useful about the city
function talkTip(who){
  const r=rel(who.id),todo=LANDMARKS.filter(L=>!save.found[L.id]);
  if(todo.length&&r.f>=15){const L=todo[(who.id+r.n)%todo.length];return"Have you been "+compass(L.x-FOOT.x,L.z-FOOT.z)+" of here? "+L.hint}
  return TIPS[(who.id+r.n+TALK.n)%TIPS.length];
}
function talkShow(line){
  const who=TALK.person;if(!who)return;const r=rel(who.id),f=r.f,bar=$("tkBarFill");
  $("tkName").textContent=who.name;$("tkTrait").textContent=TRAIT_LABEL[who.trait];$("tkRelLbl").textContent=relLabel(r);
  bar.style.width=Math.abs(f)/2+"%";bar.style.left=(f<0?50-Math.abs(f)/2:50)+"%";bar.classList.toggle("neg",f<0);
  if(line!==undefined)$("tkLine").textContent=line;
  show("talk",true);
}
// keys while talking: 1 to 6 say the lines, Escape, E or Backspace says goodbye. True when the key was used
function talkKey(k){
  if(!TALK.p)return false;
  if(k==="escape"||k==="e"||k==="backspace"){talkClose();return true}
  const i="123456".indexOf(k);if(k.length===1&&i>=0){talkPick(TALKS[i].id);return true}
  return false;
}
// a controller: the D-pad moves between the lines, A says the one picked, B or X says goodbye, Start pauses
function talkPad(hit){
  const bs=/** @type {HTMLElement[]} */([...$("tkActs").children]);
  if(hit(1)||hit(2)){talkClose();return}
  if(hit(9)){pauseOn();return}
  const d=hit(12)||hit(14)?-1:hit(13)||hit(15)?1:0;
  if(d){TALK.sel=(TALK.sel+d+bs.length)%bs.length;bs.forEach((b,i)=>b.classList.toggle("sel",i===TALK.sel));bs[TALK.sel].focus({preventScroll:true})}
  else if(hit(0))bs[TALK.sel].click();
}
// knocking someone down, or running into them: they like you a good deal less, and they let you see it once they're up
function lifeHurt(p,by){
  const who=personOf(p);if(!who)return;const r=rel(who.id);
  relSet(who.id,r.f-by,Math.max(1,r.n));if(TALK.p===p)talkClose();p.mad=true;persist();
}

/* ================================================================ REACTIONS: a bubble over a person's head */
const EMO={};
function emoTex(kind){
  if(EMO[kind])return EMO[kind];
  const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d");
  const col={smile:"#2f9e57",laugh:"#2f9e57",heart:"#d9435e",meh:"#7d8790",frown:"#d9822b",angry:"#d6453a",talk:"#4a78b8",wave:"#4a78b8"}[kind];
  x.fillStyle="rgba(255,255,255,.95)";x.beginPath();x.arc(32,32,27,0,TAU);x.fill();
  x.lineWidth=4;x.strokeStyle=col;x.stroke();x.fillStyle=col;x.lineCap="round";
  const eyes=()=>{x.beginPath();x.arc(23,26,3.2,0,TAU);x.arc(41,26,3.2,0,TAU);x.fill()};
  if(kind==="smile"){eyes();x.beginPath();x.arc(32,32,12,.2*Math.PI,.8*Math.PI);x.stroke()}
  else if(kind==="laugh"){x.beginPath();x.arc(23,28,4,Math.PI,TAU);x.moveTo(45,28);x.arc(41,28,4,Math.PI,TAU);x.stroke();
    x.beginPath();x.moveTo(20,36);x.lineTo(44,36);x.arc(32,36,12,0,Math.PI);x.closePath();x.fill()}
  else if(kind==="heart"){x.beginPath();x.moveTo(32,47);x.bezierCurveTo(13,34,16,17,27,18);x.bezierCurveTo(30,18,32,21,32,24);
    x.bezierCurveTo(32,21,34,18,37,18);x.bezierCurveTo(48,17,51,34,32,47);x.fill()}
  else if(kind==="meh"){eyes();x.beginPath();x.moveTo(22,41);x.lineTo(42,41);x.stroke()}
  else if(kind==="frown"||kind==="angry"){eyes();x.beginPath();x.arc(32,52,12,1.2*Math.PI,1.8*Math.PI);x.stroke();
    if(kind==="angry"){x.beginPath();x.moveTo(17,17);x.lineTo(28,21);x.moveTo(47,17);x.lineTo(36,21);x.stroke()}}
  else if(kind==="talk"){for(const cx of[21,32,43]){x.beginPath();x.arc(cx,32,4,0,TAU);x.fill()}}
  else{x.font="bold 21px sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText("Hi!",32,33)}
  return EMO[kind]=new THREE.CanvasTexture(c);
}
function emote(p,kind,secs=2.4){
  let s=p.emo;
  if(!s){const sp=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));sp.position.set(0,2.08,0);sp.renderOrder=3;
    p.m.G.add(sp);s=p.emo={sp,kind:"",t:0,T:0}}
  if(s.kind!==kind){s.sp.material.map=emoTex(kind);s.sp.material.needsUpdate=true;s.kind=kind}
  s.t=0;s.T=secs;s.sp.visible=true;
}

/* ================================================================ EACH FRAME (from pedUpdate, near Old Quay) */
function lifeUpdate(dt){
  LIFE.t+=dt;
  if(TALK.p){
    const p=TALK.p;TALK.busy=Math.max(0,TALK.busy-dt);
    // the conversation ends when you leave it: back in a car, walked off, or they've been knocked down or startled away
    if(!FOOT.on||p.st!=="talk"||Math.hypot(p.x-FOOT.x,p.z-FOOT.z)>FOOT_V.reach+1.2)talkClose();
    else if(TALK.end>0&&(TALK.end-=dt)<=0)talkClose();
  }
  for(const p of PEDS){
    const who=personOf(p);
    if(p.mad&&p.st!=="down"){p.mad=false;emote(p,"angry")}
    // a friend passing you on foot waves
    else if(who&&FOOT.on&&!TALK.p&&p.m.G.visible&&p.st!=="down"&&(save.rel[who.id]?.f??0)>=35&&LIFE.t-(p.waved??-99)>40&&Math.hypot(p.x-FOOT.x,p.z-FOOT.z)<7){
      p.waved=LIFE.t;emote(p,"wave",2)}
    const s=p.emo;if(!s||!s.sp.visible)continue;
    s.t+=dt;const k=s.t/s.T;if(k>=1){s.sp.visible=false;continue}
    const pop=Math.min(1,s.t/.18)*.44;s.sp.scale.set(pop,pop,1);s.sp.position.y=2.08+Math.min(.12,s.t*.1);
    s.sp.material.opacity=k>.8?(1-k)/.2:1;
  }
}

// the lines, as buttons: a number key for each on a keyboard, and goodbye last
{const box=$("tkActs");
  TALKS.forEach((t,i)=>{const b=document.createElement("button");b.className="btn tkAct"+(t.id==="rude"?" bad":"");b.dataset.k=t.id;
    b.innerHTML=t.label+" <kbd>"+(i+1)+"</kbd>";b.onclick=()=>talkPick(t.id);box.appendChild(b)});
  const bye=document.createElement("button");bye.className="btn ghost tkAct";bye.dataset.k="bye";bye.innerHTML="Goodbye <kbd>Esc</kbd>";bye.onclick=talkClose;box.appendChild(bye)}
