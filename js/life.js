// Port Meridien: The life side of the game: the people of Old Quay with their names and personalities, talking to them,
// the friendships they remember, and your own needs and mood.
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
/** @type {{p:any,person:any,used:Object<string,number>,n:number,busy:number,end:number,sel:number,fireHold:boolean,social:boolean}} */
const TALK={p:null,person:null,used:{},n:0,busy:0,end:0,sel:0,fireHold:false,social:false};
const LIFE={t:0};
// who you can talk to: someone near you on the pavement, not lying down, crossing the road or still shaken by your car
const talkable=p=>!WORK.active&&FOOT.on&&!TALK.p&&!!personOf(p)&&p.m.G.visible&&p.st!=="down"&&p.st!=="cross"&&p!==RIDE.p&&!(copClock-(p.hitAt??-99)<4);
function talkOpen(p){
  if(!talkable(p))return false;
  const who=personOf(p),r=rel(who.id);
  // the pistol is held while you talk (gunFoot): no aim, no fire, and a fire button held through goodbye waits to be let go
  Object.assign(TALK,{p,person:who,used:{},n:0,busy:0,end:0,sel:0,fireHold:true,social:false});
  // what they were doing, to go back to: someone waiting at the kerb waits for the traffic again (they used to walk
  // straight onto the crossing after a goodbye)
  p.was=p.st;p.st="talk";p.v=0;
  // you turn to face them, and they turn to face you (pedUpdate)
  FOOT.h=Math.atan2(p.x-FOOT.x,p.z-FOOT.z);FOOT.v=0;
  emote(p,"talk",1.6);
  talkShow(r.n?(r.f>=35?who.name+" is glad to see you.":r.f<=-15?who.name+" doesn't look pleased to see you.":who.name+" remembers you."):"You walk up to "+who.name+".");
  promptAct=null;show("prompt",false);
  talkSel(0);const b=$("tkActs").children[0];if(b&&!isTouch)/** @type {HTMLElement} */(b).focus({preventScroll:true});
  return true;
}
function talkClose(){
  const p=TALK.p;if(!p)return;
  if(p.st==="talk"){if(p.was==="wait"){p.st="wait";p.t=0}else{p.st="idle";p.t=1.2}}
  TALK.p=TALK.person=null;show("talk",false);document.body.classList.remove("talking");
}
// say something: the friendship moves by the line's weight, times how this person takes it, less each time you repeat
// it in one conversation, and less as a friendship nears its top
function talkPick(k){
  if(!TALK.p||TALK.busy>0||TALK.end>0)return false;
  const t=TALKS.find(x=>x.id===k);if(!t)return false;
  const who=TALK.person,p=TALK.p,r=rel(who.id),used=TALK.used[t.id]||0;
  let d=t.base*TAKES[who.trait][t.id]/(1+used*(t.id==="hello"?4:1));
  if(d>0)d*=(1-Math.max(0,r.f)/125)*skillFactor("charisma");
  if(!used)skillAward("charisma",{hello:2,chat:4,joke:5,compliment:4,tip:2,rude:1}[k]);
  d=Math.round(d);
  TALK.used[t.id]=used+1;TALK.n++;TALK.busy=.7;
  relSet(who.id,r.f+d,r.n+(TALK.n===1?1:0));
  // company: the first friendly line that goes down well in a conversation (not a rude one) lifts Social, once per
  // conversation, and then not again from this person for 30 s of play, however often you walk up to them
  if(t.id!=="rude"&&used===0&&rel(who.id).f>r.f&&!TALK.social&&!(NS.social[who.id]>NS.t)){TALK.social=true;NS.social[who.id]=NS.t+30;needsAdd("social",8)}
  emote(p,d>=8?(t.id==="joke"?"laugh":"heart"):d>=2?(t.id==="joke"?"laugh":"smile"):d>0?"smile":d===0?"meh":d>-8?"frown":"angry");
  let line=talkReaction(who,t.id,d);
  if(t.id==="tip")line+=" “"+talkTip(who)+"”";
  const now=rel(who.id);
  if(!r.n&&now.n)wantEvent("meet");
  if(r.f<15&&now.f>=15)wantEvent("friendly");
  if(r.f<RIDE_AT&&now.f>=RIDE_AT)line+=" You're friends now: ask "+who.name+" to come for a ride.";
  // someone who has come to dislike you badly walks off; someone in a hurry gives you three lines at most
  if(now.f<=-50){line+=" "+who.name+" walks off.";TALK.end=1.4}
  else if(who.trait==="busy"&&TALK.n>=3){line+=" “Sorry, I have to run!”";TALK.end=1.4}
  talkShow(line);persist();
  return true;
}
// Spoken lines follow the existing friendship reaction. Tip introductions lead straight
// into the actual hint. Use the saved encounter count and this line's use count so
// repeats rotate even when the player alternates actions. Reading a line changes no state.
const QUAY_LINES={
  cheerful:{
    hello:["There's a face I know now!","Lovely to see you out here."],
    chat:["I like this end of the quay.","I could watch the boats all day."],
    joke:["It's the way you tell it.","I know who needs to hear that one."],
    compliment:["You've made my afternoon.","That's going home with me."],
    tip:["brightens and points down the street.","turns to share a favourite tip."],
    rude:["I was enjoying our chat.","Can we start that bit again?"]
  },
  grumpy:{
    hello:["What is it?","Morning. Or whatever it is."],
    chat:["They've moved my usual crate.","Quieter here before the cars come through."],
    joke:["I'd keep that one to yourself.","Was that the funny part?"],
    compliment:["These shoes? Had them for years.","Suppose you mean it."],
    tip:["gives the shortest answer possible.","offers a tip with a shrug."],
    rude:["Didn't ask for your opinion.","We're done with that subject."]
  },
  joker:{
    hello:["My audience is here.","Look who made the guest list."],
    chat:["Ever seen a gull steal someone's lunch?","I've got a story about that pier."],
    joke:["Wait till I tell the gulls.","You've been saving that one."],
    compliment:["Finally, a decent review.","I'll put that on my poster."],
    tip:["drops the comedy voice.","pauses for once and points."],
    rude:["Tough crowd.","That one needs a rewrite."]
  },
  chatty:{
    hello:["I've been meaning to catch you.","Oh, good. Got a minute?"],
    chat:["Where was I? Right, the ferry.","My neighbour tells it differently."],
    joke:["That reminds me of another one.","I have to tell my neighbour."],
    compliment:["There's a story behind this jacket.","My sister picked it out, actually."],
    tip:["leans closer to share a tip.","breaks off mid-story to explain."],
    rude:["Let me finish, at least.","You could have just said goodbye."]
  },
  shy:{
    hello:["Oh. Hi there.","I wondered if you'd stop."],
    chat:["I like it when the harbour goes quiet.","I usually sit by the fountain."],
    joke:["It took me a second.","I was trying to keep a straight face."],
    compliment:["You noticed?","I never know what to say to that."],
    tip:["lowers their voice.","offers a quiet suggestion."],
    rude:["I heard you.","I'd rather you didn't."]
  },
  busy:{
    hello:["Got a minute? Just the one.","Hi. I'm due down at the quay."],
    chat:["I've a parcel waiting.","I've only got a moment."],
    joke:["Tell me the short version.","I'll catch the next one."],
    compliment:["Thanks, I'd better get back.","That's kind. Watch the time."],
    tip:["points without breaking eye contact.","checks the time before answering."],
    rude:["I stopped for this?","My time's worth something."]
  }
};
function talkReaction(who,k,d){
  const lines=QUAY_LINES[who.trait][k];
  const line=lines[(who.id+rel(who.id).n+TALK.used[k])%lines.length];
  if(k==="tip")return who.name+" "+line;
  return talkCue(who,k,d)+" “"+line+"”";
}
function talkCue(who,k,d){
  const n=who.name;
  if(k==="hello")return d>=3?n+" waves back.":d>0?n+" nods.":n+" barely looks up.";
  if(k==="chat")return d>=6?n+" chats happily.":d>0?n+" chats a little.":n+" isn't in the mood to chat.";
  if(k==="joke")return d>=4?n+" laughs.":d>0?n+" chuckles.":d===0?n+" doesn't get it.":n+" doesn't laugh.";
  if(k==="compliment")return d>=6&&who.trait==="shy"?n+" blushes.":d>0?n+" smiles.":n+" isn't impressed.";
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
  "Contracts pay well if you're quick about them.",
  "Heading home? They'll repair your car there for free.",
  "Get out during a timed delivery and the clock keeps ticking.",
  "You can pick up a first-aid kit by driving over it, too.",
  "Look under Contracts in the pause menu to see the jobs."
];
// A resident gives practical directions first when the player asks with a low mood.
const QUAY_REMEDIES={
  cheerful:{
    Hungry:["Lucky you, the Market Kitchen is serving!","Come to the yellow stall. The meal's on the house."],
    Tired:["The fountain benches catch a lovely breeze.","Feet up! There's a Rest button back home."],
    Bored:["Fancy a race? The finish is the fun bit.","Take the boat out and give it a little speed!"],
    Lonely:["Stay for a chat. I'd like the company too.","Say hello around the quay. We like a new face."]
  },
  grumpy:{
    Hungry:["Market Kitchen. Even I can't fault the price.","Try the yellow stall. A free meal's a free meal."],
    Tired:["Sit by the fountain. It never asks questions.","Go home and rest. The quay can wait."],
    Bored:["Finish a race. Beats standing here.","Take the boat for a brisk run. Works for me."],
    Lonely:["Try a friendly word. Yes, even round here.","Talk to the locals. Some are cheerier than me."]
  },
  joker:{
    Hungry:["The Kitchen's best dish? Whatever costs zero.","Ask at the yellow stall. Your wallet can stay home."],
    Tired:["A fountain bench has a vacancy. Take a seat.","Give the garage a visit. Park yourself and rest."],
    Bored:["Race to the finish. Second place still counts as fun.","Take the boat for a spin. The fish can referee."],
    Lonely:["Tell someone a joke. Pick your audience, mind.","Try a compliment. Mine cost extra. Kidding!"]
  },
  chatty:{
    Hungry:["The Market Kitchen feeds the whole quay for free.","See the yellow awning? Ask there for a meal."],
    Tired:["Sit by the fountain. I could listen to it for hours.","Home's good for a proper rest. It's in the garage."],
    Bored:["Finish a time trial, then tell me your time.","Get the boat moving. There's a whole coast to see."],
    Lonely:["Ask someone about the quay. We've all got stories.","Stay and chat a bit. How's your day been?"]
  },
  shy:{
    Hungry:["I usually eat at the Market Kitchen. It's free.","The yellow market stall serves a meal, if you like."],
    Tired:["There's a quiet bench by the fountain.","I'd head home and choose Rest in the garage."],
    Bored:["A time trial's nice. Just you and the clock.","I like a brisk boat ride when the day's dragging."],
    Lonely:["A little hello is enough to start, I think.","You can stay and chat with me for a bit."]
  },
  busy:{
    Hungry:["Free meal. Market Kitchen. Yellow awning.","Head to the market for food. No credits needed."],
    Tired:["Benches by the fountain. Sit for a minute.","Home, garage, Rest. That's what I'd do."],
    Bored:["Pick a race. Finish it. Works every time.","Get the boat up to speed. Clears the cobwebs."],
    Lonely:["Quick hello to a local. You've got time.","Try a kind word with someone at the quay."]
  }
};
// a friend points you at a landmark you haven't found yet, with its passport hint and which way it is from here;
// anyone else tells you something useful about the city
function talkTip(who){
  const r=rel(who.id),lines=QUAY_REMEDIES[who.trait][needsMood()];
  if(lines)return lines[(who.id+r.n+(TALK.used.tip||0))%lines.length];
  const todo=LANDMARKS.filter(L=>!save.found[L.id]);
  if(todo.length&&r.f>=15){const L=todo[(who.id+r.n)%todo.length];return"Have you been "+compass(L.x-FOOT.x,L.z-FOOT.z)+" of here? "+L.hint+(/[.!?]$/.test(L.hint)?"":".")}
  return TIPS[(who.id+r.n+TALK.n)%TIPS.length];
}
function talkShow(line){
  const who=TALK.person;if(!who)return;const r=rel(who.id),f=r.f,bar=$("tkBarFill");
  $("tkName").textContent=who.name;$("tkTrait").textContent=TRAIT_LABEL[who.trait];$("tkRelLbl").textContent=relLabel(r);
  bar.style.width=Math.abs(f)/2+"%";bar.style.left=(f<0?50-Math.abs(f)/2:50)+"%";bar.classList.toggle("neg",f<0);
  if(line!==undefined)$("tkLine").textContent=line;
  // friends can be asked along for a ride (40 or more: Friend and up)
  const ride=$("tkRide"),was=!ride.classList.contains("hide");show("tkRide",f>=RIDE_AT);if(was!==(f>=RIDE_AT))talkSel(Math.min(TALK.sel,tkButtons().length-1));
  show("talk",true);document.body.classList.add("talking");if(f>=RIDE_AT)hint("friends");
}
// keys while talking: 1 to 6 say the lines, Escape, E or Backspace says goodbye. True when the key was used
function talkKey(k){
  if(!TALK.p)return false;
  if(k==="escape"||k==="e"||k==="backspace"){talkClose();return true}
  const i="123456".indexOf(k);if(k.length===1&&i>=0){talkPick(TALKS[i].id);return true}
  if(k==="7"&&!$("tkRide").classList.contains("hide")){talkRide();return true}
  return false;
}
// the line picked for a controller: its outline and the index A uses move together, and with keyboard focus (focusin)
const tkButtons=()=>/** @type {HTMLElement[]} */([...$("tkActs").children]).filter(b=>!b.classList.contains("hide"));
function talkSel(i){TALK.sel=i;const bs=tkButtons();[...$("tkActs").children].forEach(b=>b.classList.toggle("sel",bs.indexOf(/** @type {HTMLElement} */(b))===i))}
// a controller: the D-pad moves between the lines, A says the one picked, B or X says goodbye, Start pauses
function talkPad(hit){
  const bs=tkButtons();
  if(hit(1)||hit(2)){talkClose();return}
  if(hit(9)){pauseOn();return}
  const d=hit(12)||hit(14)?-1:hit(13)||hit(15)?1:0;
  if(d){talkSel((TALK.sel+d+bs.length)%bs.length);bs[TALK.sel].focus({preventScroll:true})}
  else if(hit(0))bs[TALK.sel].click();
}
// knocking someone down, or running into them: they like you a good deal less, and they let you see it once they're up
function lifeHurt(p,by){
  const who=personOf(p);if(!who)return;const r=rel(who.id);
  relSet(who.id,r.f-by,Math.max(1,r.n));if(TALK.p===p)talkClose();if(RIDE.p===p)rideEnd("hurt");p.mad=true;persist();
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
  LIFE.t+=dt;const me=BOAT.on?BOAT:FOOT.on?FOOT:P;
  if(TALK.p){
    const p=TALK.p;TALK.busy=Math.max(0,TALK.busy-dt);
    // the conversation ends when you leave it: back in a car, walked off, or they've been knocked down or startled away
    if(!FOOT.on||p.st!=="talk"||Math.hypot(p.x-FOOT.x,p.z-FOOT.z)>FOOT_V.reach+1.2)talkClose();
    else if(TALK.end>0&&(TALK.end-=dt)<=0)talkClose();
  }
  for(const p of PEDS){
    if(p===RIDE.p)continue;   // with you (rideTick)
    const who=personOf(p);
    // someone you knocked down shows it the next time you're near them, on their feet again
    if(p.mad&&p.st!=="down"&&p.m.G.visible&&Math.hypot(p.x-me.x,p.z-me.z)<40){p.mad=false;emote(p,"angry")}
    // a friend passing you on foot waves
    else if(who&&FOOT.on&&!TALK.p&&p.m.G.visible&&p.st!=="down"&&(save.rel[who.id]?.f??0)>=35&&LIFE.t-(p.waved??-99)>40&&Math.hypot(p.x-FOOT.x,p.z-FOOT.z)<7){
      p.waved=LIFE.t;emote(p,"wave",2)}
    emoteTick(p,dt);
  }
}

/* ================================================================ NEEDS: energy, hunger, fun and social */
// Step 5, part 2 (docs/LIFE_NEEDS_DESIGN.md). Each need runs from 0 to 100 and falls a little with every needs-hour of
// play out in the city: 30 s of the game's own time on the road, on foot or on the boat, whatever the sky's clock is
// doing (its night runs faster, a fixed time of day stops it). Menus, the garage, Photo Mode, a background tab and
// loading don't count, and nothing is made up from the real clock afterwards. Something in the city puts each back.
// Needs never stop you, slow you or cost you: a low one sets your mood, one suggestion in the pause menu and one
// short hint, and a need at zero just stays there until you see to it
// (hunger was 5 an hour as first approved: Hungry after 5 minutes of play. Jo Yee chose 2 on 24 Nov, after Codex's tuning note)
const NEED_LOSS={energy:3,hunger:2,fun:3,social:2},NEED_HOUR=30,NEED_ORDER=["energy","hunger","fun","social"];
const NEED_LABEL={energy:"Energy",hunger:"Hunger",fun:"Fun",social:"Social"},MOOD_OF={energy:"Tired",hunger:"Hungry",fun:"Bored",social:"Lonely"};
// what to do about each, short for a hint and in full for the pause menu
const NEED_HINT={energy:"Sit on a bench by the fountain, or go home and rest",hunger:"The Market Kitchen in Old Quay serves a free meal",
  fun:"Finish a race, or drive at 80 km/h or more",social:"Stop and talk to someone in Old Quay"};
const NEED_TIP={energy:"Sit on a bench by the fountain in Old Quay's civic square, or go home and choose REST in the garage.",
  hunger:"The Market Kitchen, the yellow and white stall in Old Quay's market, serves a free meal.",
  fun:"Finish a race or a time trial, or drive at 80 km/h or more (3 m/s on the boat) for a while.",
  social:"Walk up to someone in Old Quay and talk: a friendly word goes a long way."};
// the needs as they are now, fractions and all (the save keeps whole numbers: needsCommit)
/** @type {{energy:number,hunger:number,fun:number,social:number}} */
const NEEDS=Object.assign({},NEEDS_START);
// this session only: active seconds played (the clock for every wait below), when you can next rest at home or eat
// again, the low mood being kept, which needs may give a hint, the speed run towards the next point of fun, and when
// each person next lifts Social
/** @type {{t:number,restAt:number,mealAt:number,low:string|null,armed:Object<string,boolean>,due:Object<string,boolean>,fast:number,mode:string,social:Object<string,number>}} */
const NS={t:0,restAt:0,mealAt:0,low:null,armed:{},due:{},fast:0,mode:"",social:{}};
const needOf=k=>Math.round(NEEDS[k]);
// the needs from a save (missing: the starting values), and the save's needs as a short key, for comparing two saves
const needsOfSave=sv=>needsClean(sv&&sv.needs);
function homeWaitClean(raw){
  const seconds=k=>Number.isFinite(raw?.[k])?clamp(Math.ceil(raw[k]),0,180):0;
  return {snack:seconds("snack"),play:seconds("play")};
}
const homeUntil={snack:0,play:0};
function homeWaitLoad(raw){
  const wait=homeWaitClean(raw);save.homeWait=wait;
  homeUntil.snack=NS.t+wait.snack;homeUntil.play=NS.t+wait.play;
}
homeWaitLoad(save.homeWait);
const needsKey=sv=>{const n=needsOfSave(sv),wait=homeWaitClean(sv.homeWait),key=NEED_ORDER.map(k=>n[k]).join(",");
  return wait.snack||wait.play?key+"/"+wait.snack+"/"+wait.play:key};
// the save's needs become the ones in play: on loading, and when another device's are newer (js/screens.js)
function needsLoad(n){n=needsClean(n);for(const k of NEED_ORDER){NEEDS[k]=n[k];NS.armed[k]=n[k]>25;NS.due[k]=false}NS.low=null;save.needs=n}
function needsCommit(){save.homeWait=homeWaitClean({snack:homeUntil.snack-NS.t,play:homeUntil.play-NS.t});save.needs={v:1,energy:needOf("energy"),hunger:needOf("hunger"),fun:needOf("fun"),social:needOf("social")}}
// adds to a need (never past 100) and returns how much it really went up
function needsAdd(k,v){const was=NEEDS[k];NEEDS[k]=clamp(was+v,0,100);if(k==="hunger"&&state==="GARAGE"&&NEEDS[k]>was)skillAward("cooking",5);return NEEDS[k]-was}
// your mood: Tense while the police are after you; otherwise the lowest need at 25 or under (the first in the list on
// a tie) gives Tired, Hungry, Bored or Lonely, kept until that need is back to 35, unless another drops to 15 or under
// and lower still. With no low need: Content when all four are at 70 or more, otherwise Okay
function needsMood(){
  if(NS.low&&needOf(NS.low)>=35)NS.low=null;
  let lo=null;for(const k of NEED_ORDER)if(needOf(k)<=25&&(lo===null||needOf(k)<needOf(lo)))lo=k;
  if(!NS.low)NS.low=lo;else if(lo&&lo!==NS.low&&needOf(lo)<=15&&needOf(lo)<needOf(NS.low))NS.low=lo;
  return WANTED.lvl?"Tense":NS.low?MOOD_OF[NS.low]:NEED_ORDER.every(k=>needOf(k)>=70)?"Content":"Okay";
}
// the one suggestion the pause menu makes: about the mood, or the need lowest now
function needsTip(){
  const m=needsMood();if(m==="Tense")return"The police are after you. Lose them first; the rest can wait.";
  if(m==="Content")return"You're in good shape. Enjoy the city.";
  if(NS.low)return NEED_TIP[NS.low];
  return NEED_TIP[NEED_ORDER.reduce((a,b)=>needOf(b)<needOf(a)?b:a)];
}
// each frame of play (driveUpdate): the needs fall, fast driving or sailing is fun, the bench rests you
function needsTick(dt){
  if(state!=="DRIVE"||document.hidden||!(dt>0))return;
  workTick(dt);NS.t+=dt;
  for(const k of NEED_ORDER)NEEDS[k]=Math.max(0,NEEDS[k]-NEED_LOSS[k]*dt/NEED_HOUR*(k==="energy"&&FOOT.on&&!BOAT.on?skillFactor("fitness"):1));
  // a point of fun for every 5 s on end at 80 km/h or more in a car, or 3 m/s on the boat; slowing down, or getting
  // out or aboard, starts the 5 s again
  const mode=BOAT.on?"boat":FOOT.on?"foot":"car",fast=mode==="car"?kphNow()>=80:mode==="boat"&&Math.abs(BOAT.v)>=3;
  if(!fast||mode!==NS.mode){NS.fast=0;NS.mode=mode}
  if(fast&&(NS.fast+=dt)>=5){NS.fast-=5;needsAdd("fun",1)}
  // a bench visit is over once you've walked out of its reach (or driven off)
  if(VISIT.b&&!SIT.on&&(!FOOT.on||Math.hypot(FOOT.x-VISIT.b.x,FOOT.z-VISIT.b.z)>FOOT_V.reach))VISIT.b=null;
  needsMood();needsHints();
}
// A hint when a need drops to 25: one, once, in free ride only. It waits while you're busy (a race, a contract, a
// test drive, the police, a conversation, the bench) and while any other message is showing, so it never stacks up
// with them over the score, the map, the car or you. A need back up to 35 can give its hint again later
function needsHints(){
  for(const k of NEED_ORDER){const v=needOf(k);if(v>=35){NS.armed[k]=true;NS.due[k]=false}else if(v<=25&&NS.armed[k]){NS.armed[k]=false;NS.due[k]=true}}
  const due=NEED_ORDER.filter(k=>NS.due[k]);
  if(!due.length||WORK.panel||WORK.active||ev||job||testDrive||WANTED.lvl||TALK.p||SIT.on||locked||$("toasts").children.length)return;
  const k=due.reduce((a,b)=>needOf(b)<needOf(a)?b:a);for(const q of due)NS.due[q]=false;
  toast(MOOD_OF[k].toUpperCase(),NEED_HINT[k],"needHint");
}

/* ---------- putting them back ---------- */
// Rest at home: the garage's REST, +40 energy, then not again for 30 s of play. Going home because you were knocked
// out or chose GO HOME is no rest in itself
function needsRest(){
  if(!homeEditable()||document.hidden||WANTED.lvl||NS.t<NS.restAt||needOf("energy")>=100)return false;
  needsAdd("energy",homeGain("rest"));
  NS.restAt=NS.t+30;persist();restSync();return true;
}
function homeGain(action){
  const base=action==="rest"?(homeHas(save.home,"rest")?60:40):action==="snack"?30:25;
  return base*(1+homeComfort(save.home)/1000);
}
function homeUse(action){
  if(action!=="snack"&&action!=="play")return false;
  const need=action==="snack"?"hunger":"fun";
  if(!homeEditable()||document.hidden||WANTED.lvl||!homeHas(save.home,action)||NS.t<homeUntil[action]||needOf(need)>=100)return false;
  needsAdd(need,homeGain(action));homeUntil[action]=NS.t+180;wantEvent("home");persist();restSync();return true;
}
function homeChanged(){persist();updateMoney();restSync()}
function restSync(){
  for(const [action,id,k] of [["snack","gSnack","hunger"],["play","gPlay","fun"]]){
    const button=$(id);show(id,homeHas(save.home,action));button.disabled=needOf(k)>=100||NS.t<homeUntil[action];
    button.textContent=action.toUpperCase()+" · "+k.toUpperCase()+" "+needOf(k);
  }
  const b=$("gRest"),e=needOf("energy"),wait=NS.t<NS.restAt;
  b.textContent=e>=100?"ENERGY FULL":(wait?"RESTED":"REST")+" · ENERGY "+e;b.disabled=e>=100||wait;
  b.setAttribute("aria-label",e>=100?"Your energy is full":wait?"Rested. Energy "+e+" of 100. Go out for a while before resting again":"Rest: energy +"+Math.round(homeGain("rest"))+". Energy "+e+" of 100")}
// The Market Kitchen (js/world.js): a free meal, +35 hunger, at any balance, even none; then not again for 30 s of play
function needsEat(){return job?kitchenMeal():workOpen()}
function kitchenMeal(){
  if(!FOOT.on||state!=="DRIVE")return false;
  if(WANTED.lvl){wantedBlock();return false}
  if(NS.t<NS.mealAt){toast("YOU'VE JUST EATEN","Come back in a little while");return false}
  if(needOf("hunger")>=100){toast("NOT HUNGRY","Hunger is full");return false}
  const got=needsAdd("hunger",35);
  NS.mealAt=NS.t+30;persist();toast("A GOOD MEAL","Hunger +"+Math.round(got)+" · on the house","gold");return true;
}
const kitchenText=()=>WORK.active?"Market Kitchen · continue shift":!job?"Market Kitchen · eat or work":NS.t<NS.mealAt?"Market Kitchen · you've just eaten":needOf("hunger")>=100?"Market Kitchen · you're full":"Eat at the Market Kitchen · free";
// finishing a race or a time trial, however it went: +15 fun, at the result (finishEvent), once a result
function needsRace(){needsAdd("fun",15)}
// Sitting on a bench by the fountain: +3 energy for every 5 s sat there, up to +15 a visit. Standing up and sitting
// down again doesn't start the visit again; walking out of the bench's reach does. Walking, turning, the police
// coming after you or getting hurt stands you up. You face the fountain, the pistol held, as while talking
const SIT={on:false,b:null,t:0,hp:0},VISIT={b:null,got:0};
function sitDown(b){
  if(!FOOT.on||SIT.on||TALK.p||state!=="DRIVE")return false;
  if(WANTED.lvl){wantedBlock();return false}
  if(VISIT.b!==b){VISIT.b=b;VISIT.got=0}
  Object.assign(SIT,{on:true,b,t:0,hp:HEALTH.hp});TALK.fireHold=true;
  FOOT.v=0;FOOT.h=b.a+Math.PI;FOOT.x=b.x+Math.sin(b.a)*.06;FOOT.z=b.z+Math.cos(b.a)*.06;
  sitPose();footPrompt();return true;
}
// up, a step towards the fountain, clear of the bench
function sitEnd(){
  if(!SIT.on)return;const b=SIT.b;SIT.on=false;SIT.b=null;
  const c=footClear(b.x-Math.sin(b.a)*.9,b.z-Math.cos(b.a)*.9);FOOT.x=c[0];FOOT.z=c[1];FOOT.v=0;
  if(FOOT.on&&state==="DRIVE")footPrompt();
}
function sitTick(dt){
  if(!SIT.on)return;
  if(!FOOT.on||WANTED.lvl||HEALTH.hp<SIT.hp){sitEnd();return}
  SIT.hp=HEALTH.hp;
  if((SIT.t+=dt)>=5){SIT.t-=5;if(VISIT.got<15)VISIT.got+=needsAdd("energy",Math.min(3,15-VISIT.got))}
}
const sitText=()=>"Stand up · energy "+needOf("energy")+(VISIT.got>=15?" · rested":"");
// sitting: thighs forward along the seat, shins down, hands in your lap
function sitPose(){
  const m=FOOT.m;m.G.position.set(FOOT.x,SIT.b.y-.84,FOOT.z);m.G.rotation.set(0,FOOT.h,0);
  for(const l of m.legs)l.rotation.x=-1.5;for(const k of m.knees)k.rotation.x=1.42;
  m.arms[0].rotation.x=m.arms[1].rotation.x=-.3;m.elbows[0].rotation.x=m.elbows[1].rotation.x=-.75;
}

/* ---------- the Needs screen, from the pause menu ---------- */
// four bars out of 100, each with its number and a word for its colour, the mood, and one suggestion
const NEED_STATE=v=>v<=15?["Very low","vlow"]:v<=25?["Low","low"]:v>=70?["Good","good"]:["Okay","ok"];
function needsRender(){
  const list=$("ndWants");list.replaceChildren();
  for(const id of save.wants.active){const it=WANT_CATALOG.find(w=>w.id===id),li=document.createElement("li");
    li.textContent=it.label+(id==="walk"?" ("+Math.floor(save.wants.metres)+"/500 m)":"")+" · "+fmtCr(it.cr)+" CR";list.appendChild(li)}
  // one reroll a day (UTC): once it's used, the button says when the next one comes
  const used=save.wants.day>=Math.floor(Date.now()/86400000);$("ndReroll").disabled=used;$("ndReroll").textContent=used?"NEW REROLL TOMORROW":"REROLL WANTS";
  const mood=needsMood();$("ndMood").textContent=mood;$("ndTip").textContent=needsTip();
  for(const k of NEED_ORDER){const v=needOf(k),[w,c]=NEED_STATE(v),row=$("nd_"+k);
    row.querySelector("i").style.width=v+"%";row.querySelector(".ndb").setAttribute("aria-valuenow",String(v));
    row.querySelector(".ndb").setAttribute("aria-valuetext",v+" of 100, "+w.toLowerCase());
    row.querySelector("b").textContent=String(v);row.querySelector("em").textContent=w;row.className="ndr "+c}
}
const needsLabel=()=>"NEEDS · "+needsMood().toUpperCase();
function needsOpen(){if(state!=="PAUSE")return;needsRender();$("pause").inert=true;show("needs",true);try{$("ndClose").focus({preventScroll:true})}catch(e){}}
// back to the pause menu, on the button that opened it
function needsClose(){show("needs",false);$("pause").inert=false;try{$("pNeeds").focus({preventScroll:true})}catch(e){}}
{const list=$("ndList");
  for(const k of NEED_ORDER){const r=document.createElement("div");r.id="nd_"+k;r.className="ndr";
    r.innerHTML='<span class="ndl">'+NEED_LABEL[k]+'</span><div class="ndb" role="meter" aria-valuemin="0" aria-valuemax="100" aria-label="'+NEED_LABEL[k]+'"><i></i></div><b class="num"></b><em></em>';
    list.appendChild(r)}
  $("ndReroll").onclick=()=>{if(wantsReroll())needsRender()};
  $("pNeeds").onclick=needsOpen;$("ndClose").onclick=needsClose;$("gSnack").onclick=()=>homeUse("snack");$("gPlay").onclick=()=>homeUse("play");$("gRest").onclick=()=>needsRest()}
needsLoad(save.needs);

/* ================================================================ RIDES: a friend comes along in your car */
// Step 5, part 3 (docs/LIFE_DESIGN.md). Ask a friend (40 or more) to come for a ride: they walk with you to your car,
// get in beside you, talk as you drive, and now and then ask for a lift somewhere. Company lifts Social and, slowly,
// the friendship; driving like a maniac, crashing or bringing the police along doesn't. Stop and choose "Drop off",
// get out, or go indoors, and they go on their way. A ride isn't saved: the friendship it earns is
const RIDE_AT=40,RIDE_V={follow:1.6,hurry:3.6,door:1.35,board:1.8,wait:90,social:6,friend:20,friendMax:10,chat:[26,40],fast:130,
  tip:250,lift:.5,near:[300,1500]};
/** @type {{p:any,who:any,st:string,t:number,stuck:number,gain:number,soc:number,fr:number,chat:number,fastAt:number,hitAt:number,dmg:number,dest:any,cops:boolean,car:string|null}} */
const RIDE={p:null,who:null,st:"",t:0,stuck:0,gain:0,soc:0,fr:0,chat:30,fastAt:-99,hitAt:-99,dmg:0,dest:null,cops:false,car:null};
// what each kind of person says: yes, a word on the way, at speed, after a crash, with the police behind
const RIDE_LINES={
  cheerful:{yes:"I'd love to!",chat:["I love this road.","Put the radio on, go on!"],fast:"Whee! Faster!",crash:"Oops! Everyone all right?",cops:"Oh no, oh no. Drive!"},
  grumpy:{yes:"Fine. Just don't speed.",chat:["Mind the potholes.","You drive like my brother."],fast:"Slow down, would you?",crash:"That's coming out of your pocket.",cops:"I knew this was a mistake."},
  joker:{yes:"Shotgun!",chat:["What's a car's favourite meal? Brake-fast.","I'd tell you a joke about this road, but it goes nowhere."],fast:"Is this the express?",crash:"Lovely parking.",cops:"Floor it!"},
  chatty:{yes:"Ooh, yes. I'll tell you all about my week.",chat:["My aunt used to live up this way.","Did I ever tell you about the ferry strike?"],fast:"My cousin drove like this. He walks now.",crash:"Well, that's a story for later.",cops:"Is that... for us?"},
  shy:{yes:"Okay... thank you.",chat:["It's nice, just driving.","I don't get out much."],fast:"Could we go a bit slower?",crash:"Oh!",cops:"Please, I want to get out."},
  busy:{yes:"Quickly, then.",chat:["Is there a quicker way?","I've a call in five minutes."],fast:"Good, I'm late anyway.",crash:"I haven't got time for this.",cops:"I really haven't got time for this."}
};
const rideSay=(line,kind="talk")=>{if(!RIDE.who)return;toast(RIDE.who.name.toUpperCase(),"“"+line+"”");emote(RIDE.p,kind,2.2)};
// whether a friend comes, or why not
function rideWhy(who,p){
  const r=rel(who.id);
  if(r.f<RIDE_AT)return"Maybe when we know each other better.";
  if(RIDE.p)return RIDE.p===p?"I'm coming, I'm coming!":"Looks like you've got company already.";
  if(WANTED.lvl)return"Not while the police are after you!";
  if(who.trait==="busy"&&r.f<70)return"Sorry, I'm late as it is!";
  if(who.trait==="grumpy"&&r.f<55)return"I'll walk, thanks.";
  if(ev||testDrive)return"Not now, you're busy.";
  if(Math.hypot(P.x-FOOT.x,P.z-FOOT.z)>40)return"Where's your car? Bring it closer and ask again.";
  return"";
}
// "Come for a ride", from a conversation: yes ends the conversation and they come with you; no is just a line
function talkRide(){
  const p=TALK.p,who=TALK.person;if(!p||TALK.busy>0||TALK.end>0)return false;
  const why=rideWhy(who,p);if(why){talkShow(who.name+" shakes their head. “"+why+"”");emote(p,"meh");TALK.busy=.7;return false}
  const r=rel(who.id);relSet(who.id,r.f+3,r.n);
  if(!TALK.social&&!(NS.social[who.id]>NS.t)){TALK.social=true;NS.social[who.id]=NS.t+30;needsAdd("social",8)}
  Object.assign(RIDE,{p,who,st:"follow",t:0,stuck:0,gain:0,soc:0,fr:0,chat:RIDE_V.chat[0],fastAt:-99,hitAt:-99,dmg:P.damage||0,dest:null,cops:false,car:null});
  talkClose();p.st="follow";p.v=0;
  rideSay(RIDE_LINES[who.trait].yes,"smile");persist();rideHud();
  return true;
}
// where a follower is heading: just behind you on foot, or the passenger door of your car (its right-hand side)
function rideGoal(){
  if(FOOT.on){const fx=Math.sin(FOOT.h),fz=Math.cos(FOOT.h);return{x:FOOT.x-fx*1.3-fz*.7,z:FOOT.z-fz*1.3+fx*.7,stop:.35}}
  return{x:P.x-Math.cos(P.h)*RIDE_V.door,z:P.z+Math.sin(P.h)*RIDE_V.door,stop:.2};
}
// in the seat beside you: their model rides in the car, facing forward, legs under the dash
function rideSeat(){
  const G=RIDE.p.m.G,e=pc.eye,h=G.scale.x;if(G.parent)G.parent.remove(G);pc.G.add(G);G.userData.rider=true;
  G.position.set(-e.x,e.y-1.62*h,e.z-.05);G.rotation.set(0,0,0);G.visible=true;
  for(const l of RIDE.p.m.legs)l.rotation.x=-1.35;for(const a of RIDE.p.m.arms)a.rotation.x=-.45;
}
function rideBoard(){
  RIDE.st="ride";RIDE.car=curId;RIDE.t=0;RIDE.p.st="ride";rideSeat();
  // sometimes they'd like a lift somewhere: a landmark, the pier or the Auto Gallery, a good drive away
  if(!job&&!ev&&Math.random()<RIDE_V.lift){
    const all=[...LANDMARKS.map(L=>({name:L.name,x:L.x,z:L.z})),{name:"the harbour pier",x:PIER.x0-14,z:0},{name:"the Auto Gallery",x:DEALER_MARK.x,z:DEALER_MARK.z}],
      far=all.filter(d=>{const k=Math.hypot(d.x-P.x,d.z-P.z);return k>RIDE_V.near[0]&&k<RIDE_V.near[1]});
    if(far.length){const d=far[Math.floor(Math.random()*far.length)],nr=nearestRoadGlobal(d.x,d.z,true)||d;
      RIDE.dest={name:d.name,x:nr.x,z:nr.z};setGPS(nr.x,nr.z,d.name);rideSay("Could you drop me at "+d.name+"?")}
  }
  if(!RIDE.dest)rideSay(RIDE_LINES[RIDE.who.trait].chat[0]);
  rideHud();
}
// the ride is over: they get out (on the pavement in Old Quay, or off on their own business anywhere else)
function rideEnd(why){
  const p=RIDE.p,who=RIDE.who;if(!p)return;
  const G=p.m.G,riding=RIDE.st==="ride";
  if(G.parent!==scene){if(G.parent)G.parent.remove(G);scene.add(G)}G.userData.rider=false;G.rotation.set(0,p.h,0);
  for(const l of p.m.legs)l.rotation.x=0;for(const a of p.m.arms)a.rotation.x=0;
  if(riding){p.x=P.x-Math.cos(P.h)*RIDE_V.door;p.z=P.z+Math.sin(P.h)*RIDE_V.door;const c=footClear(p.x,p.z);p.x=c[0];p.z=c[1]}
  // back to a walk round the blocks, from the nearest stretch of pavement: in Old Quay they step straight onto it;
  // anywhere else they stay where they got out, and are back on their pavement when you next come to town
  let best=null,bd=1e18;for(const e of PED_EDGES){if(e.cross)continue;const ax=e.b.x-e.a.x,az=e.b.z-e.a.z,k=clamp(((p.x-e.a.x)*ax+(p.z-e.a.z)*az)/(e.len*e.len),0,1),d=(e.a.x+ax*k-p.x)**2+(e.a.z+az*k-p.z)**2;if(d<bd){bd=d;best={e,s:k*e.len}}}
  if(best){p.e=best.e;p.from=best.e.a;p.s=best.s;p.o=0;if(bd<40*40&&why!=="hurt"){const[sx,sz]=pedSpot(p);p.x=sx;p.z=sz}}
  if(why!=="hurt"){p.st="idle";p.t=1.5;p.v=0}
  p.y=footGround(p.x,p.z);G.position.set(p.x,p.y,p.z);G.visible=true;
  const dest=RIDE.dest;Object.assign(RIDE,{p:null,who:null,st:"",dest:null,car:null});
  if(dest&&gps.t&&gps.label===dest.name&&!job)clearGPS();
  rideHud();
  const say=(t)=>toast(who.name.toUpperCase(),"“"+t+"”");
  if(why==="drop")say(riding?"Thanks for the ride!":"Another time, then.");
  else if(why==="out")say(riding?"Thanks for the ride!":"Another time, then.");
  else if(why==="home"&&riding)say("See you around!");
}
// each frame of play (driveUpdate): following you, getting in, the ride itself
function rideTick(dt){
  if(!RIDE.p||state!=="DRIVE"||!(dt>0))return;
  const p=RIDE.p,who=RIDE.who,r=()=>rel(who.id);RIDE.t+=dt;
  if(RIDE.st==="follow"){
    if(BOAT.on){rideSay("I'll wait on dry land.","meh");rideEnd("left");return}
    if(RIDE.t>RIDE_V.wait){rideEnd("drop");return}
    const g=rideGoal(),dx=g.x-p.x,dz=g.z-p.z,d=Math.hypot(dx,dz),car=!FOOT.on,psp=Math.hypot(P.vx,P.vz);
    // you drove off without them
    if(car&&psp>4&&Math.hypot(P.x-p.x,P.z-p.z)>10){relSet(who.id,r().f-4,r().n);rideSay("You drove off without me!","frown");rideEnd("left");persist();return}
    if(car&&d<RIDE_V.board&&psp<1.5){rideBoard();return}
    // walking (or hurrying) over; stuck behind something for a while, or left far behind, they catch you up
    const want=d<=g.stop?0:d>4?RIDE_V.hurry:RIDE_V.follow;p.v+=clamp(want-p.v,-8*dt,6*dt);
    const step=Math.min(d,p.v*dt);
    if(d>.01){
      const [nx,nz]=footClear(p.x+dx/d*step,p.z+dz/d*step);
      // Compare movement towards this frame's goal. A walking player moves that goal every frame.
      const progress=((nx-p.x)*dx+(nz-p.z)*dz)/d;
      RIDE.stuck=d>1.5&&progress<step*.15?RIDE.stuck+dt:0;
      p.x=nx;p.z=nz;
      if(p.v>.05)p.h+=wrapA(Math.atan2(dx,dz)-p.h)*Math.min(1,dt*8);
    }else RIDE.stuck=0;
    if(d>45||RIDE.stuck>4){[p.x,p.z]=footClear(g.x,g.z);RIDE.stuck=0}
    if(d<=g.stop&&!car)p.h+=wrapA(FOOT.h-p.h)*Math.min(1,dt*4);
    p.y=footGround(p.x,p.z);
    const G=p.m.G;G.visible=true;p.ph+=p.v*dt*3.3;const sw=Math.sin(p.ph)*Math.min(.8,p.v*.42);
    G.position.set(p.x,p.y,p.z);G.rotation.set(0,p.h,0,"YXZ");p.m.legs[0].rotation.x=sw;p.m.legs[1].rotation.x=-sw;p.m.arms[0].rotation.x=-sw*.7;p.m.arms[1].rotation.x=sw*.7;
    faceBlink(p.m.face,dt);emoteTick(p,dt);
    return;
  }
  // riding: the car you set out in, still (a graphics change rebuilds it: they sit down again in the new one)
  if(RIDE.car!==curId||FOOT.on||BOAT.on){rideEnd("out");return}
  if(p.m.G.parent!==pc.G)rideSeat();
  p.x=P.x;p.z=P.z;faceBlink(p.m.face,dt);emoteTick(p,dt);
  // company: Social now and then, and the friendship a little, up to a point each ride
  if((RIDE.soc+=dt)>=RIDE_V.social){RIDE.soc-=RIDE_V.social;needsAdd("social",1)}
  if((RIDE.fr+=dt)>=RIDE_V.friend&&RIDE.gain<RIDE_V.friendMax){RIDE.fr-=RIDE_V.friend;RIDE.gain++;relSet(who.id,r().f+1,r().n)}
  const L=RIDE_LINES[who.trait],kph=kphNow();
  // the police: once a chase, a word and a dent in the friendship
  if(WANTED.lvl&&!RIDE.cops){RIDE.cops=true;relSet(who.id,r().f-8,r().n);rideSay(L.cops,"frown");persist()}
  else if(!WANTED.lvl)RIDE.cops=false;
  // a crash: a word (and a little less friendship) at most every 6 s
  if((P.damage||0)>RIDE.dmg+2&&RIDE.t-RIDE.hitAt>6){RIDE.hitAt=RIDE.t;relSet(who.id,r().f-2,r().n);rideSay(L.crash,who.trait==="joker"?"laugh":"frown")}
  RIDE.dmg=P.damage||0;
  if(kph>=RIDE_V.fast&&RIDE.t-RIDE.fastAt>25){RIDE.fastAt=RIDE.t;rideSay(L.fast,who.trait==="cheerful"||who.trait==="joker"?"laugh":"frown")}
  else if((RIDE.chat-=dt)<=0){RIDE.chat=RIDE_V.chat[0]+Math.random()*(RIDE_V.chat[1]-RIDE_V.chat[0]);rideSay(L.chat[Math.floor(RIDE.t/7)%L.chat.length])}
  // their stop: pull up near it (slowly) and they get out, with thanks and something for the fuel
  const D=RIDE.dest;
  if(D&&Math.hypot(P.x-D.x,P.z-D.z)<30&&kph<15){relSet(who.id,r().f+8,r().n);needsAdd("social",6);earn(RIDE_V.tip);
    toast(who.name.toUpperCase(),"“This is me. Thanks! Here, for the fuel.” +"+fmtCr(RIDE_V.tip)+" CR","gold");rideEnd("there");persist()}
}
// the bubble over someone's head, out of Old Quay too (pedUpdate isn't running there)
function emoteTick(p,dt){const s=p.emo;if(!s||!s.sp.visible)return;s.t+=dt;const k=s.t/s.T;if(k>=1){s.sp.visible=false;return}
  // over the car's roof when they're riding with you
  const pop=Math.min(1,s.t/.18)*.44;s.sp.scale.set(pop,pop,1);s.sp.position.y=(p.st==="ride"?2.3:2.08)+Math.min(.12,s.t*.1);s.sp.material.opacity=k>.8?(1-k)/.2:1}
// the HUD's line under the place and the clock: who's with you, and where they're going
function rideHud(){const on=!!RIDE.p;show("ride",on);if(!on)return;$("rideWho").textContent=RIDE.who.name;
  $("rideTo").textContent=RIDE.st==="follow"?"· to your car":RIDE.dest?"· to "+RIDE.dest.name:""}
// the drive prompt, stopped with a friend aboard (updatePrompt): let them out here
// (not in the first seconds after they get in: it read as being told to put them straight out again)
const ridePrompt=()=>RIDE.st==="ride"&&RIDE.t>5&&kphNow()<5?{t:"Drop off "+RIDE.who.name,a:()=>rideEnd("drop")}:null;

// the lines, as buttons: a number key for each on a keyboard, and goodbye last
{const box=$("tkActs");
  TALKS.forEach((t,i)=>{const b=document.createElement("button");b.className="btn tkAct"+(t.id==="rude"?" bad":"");b.dataset.k=t.id;
    b.innerHTML=t.label+" <kbd>"+(i+1)+"</kbd>";b.onclick=()=>talkPick(t.id);box.appendChild(b)});
  const ride=document.createElement("button");ride.className="btn tkAct hide";ride.id="tkRide";ride.dataset.k="ride";ride.innerHTML="Come for a ride <kbd>7</kbd>";ride.onclick=()=>talkRide();box.appendChild(ride);
  const bye=document.createElement("button");bye.className="btn ghost tkAct";bye.dataset.k="bye";bye.innerHTML="Goodbye <kbd>Esc</kbd>";bye.onclick=talkClose;box.appendChild(bye);
  box.addEventListener("focusin",e=>{const i=tkButtons().indexOf(/** @type {HTMLElement} */(e.target));if(i>=0)talkSel(i)})}
