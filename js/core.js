// Port Meridien: Shared helpers, the car list, the save, the renderer, the sky and the day and night.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
/* ================================================================ UTIL */
// an element by its id. Typed loosely for the type check (npm run typecheck): the game uses it for every kind of
// element, from inputs to canvases, without casting each one
/** @type {(id: string) => any} */
const $=id=>document.getElementById(id);
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)};
const wrapA=a=>a-TAU*Math.round(a/TAU);
const rnd=(i,k)=>{const x=Math.sin(i*12.9898+k*78.233)*43758.5453;return x-Math.floor(x)};
const isTouch=matchMedia("(pointer:coarse)").matches;
if(isTouch){document.body.classList.add("touch");document.getElementById("ghint").textContent="Tap a car to select it, tap it again to drive · drag to look around"}
function loadFailed(message){
  $("lf").parentNode.classList.add("hide");
  $("lmsg").textContent=message;
  $("lretry").classList.remove("hide");
  $("lretry").onclick=()=>location.reload();
}
// If the game can't run here (no three.js, or no WebGL), it says so and goes no further. In one script that was a
// return; across scripts, gameOff() stops this one and every later script stops at its first line. The stop isn't
// an error, so nothing is reported for it
const GAME_OFF={toString:()=>"Port Meridien can't run in this browser"};
addEventListener("error",e=>{if(e.error===GAME_OFF)e.preventDefault()});
function gameOff(){window.__gameOff=GAME_OFF;throw GAME_OFF}
if(typeof THREE==="undefined"){loadFailed("The 3D engine didn't load. Check your connection and reload the page.");gameOff()}
{let gl=null;try{const t=document.createElement("canvas");gl=t.getContext("webgl2")||t.getContext("webgl");const lc=gl&&gl.getExtension("WEBGL_lose_context");if(lc)lc.loseContext()}catch(e){}
 if(!gl){loadFailed("This browser or device can't show 3D graphics (WebGL is off or not supported). Enable hardware acceleration or open the game in a browser with WebGL support.");gameOff()}}
const V3=THREE.Vector3;
const fmtCr=n=>Math.round(n).toLocaleString("en-US");
// rounded once to hundredths, then split, so 59.999 reads 1:00.00 rather than 0:60.00
const fmtT=t=>{const c=Math.round(Math.max(0,t)*100),m=Math.floor(c/6000),s=Math.floor(c/100)%60,h=c%100;return m+":"+String(s).padStart(2,"0")+"."+String(h).padStart(2,"0")};

/* ================================================================ CARS
   Classes run from A1 (slowest) to A7 (hypercars).
   shape picks the body silhouette, wing the rear spoiler. */
const CARS=[
 {id:"golf",mk:"Veltren",md:"Kest 25",yr:2009,cls:"A1",price:25000,top:238,acc:.42,grip:.78,body:0xf1f1ef,shape:"hatch",wing:"lip"},
 {id:"mini",mk:"Brindle",md:"Pip S",yr:2014,cls:"A1",price:28000,top:228,acc:.44,grip:.84,body:0x0d5a34,shape:"hatch",wing:"lip"},
 {id:"mx5",mk:"Aokira",md:"Sora 2",yr:2016,cls:"A1",price:30000,top:214,acc:.40,grip:.88,body:0xb3121a,shape:"roadster",wing:"none"},
 {id:"mustang",mk:"Rookwell",md:"Outrider",yr:2015,cls:"A2",price:48000,top:250,acc:.56,grip:.72,body:0x1e3f8c,shape:"muscle",wing:"lip"},
 {id:"challenger",mk:"Darrow",md:"Brawler 8",yr:2010,cls:"A2",price:52000,top:274,acc:.60,grip:.68,body:0xe8761a,shape:"muscle",wing:"lip"},
 {id:"tt",mk:"Veltren",md:"Arc 6",yr:2010,cls:"A2",price:56000,top:250,acc:.58,grip:.84,body:0x2c6fd1,shape:"roadster",wing:"none"},
 {id:"m3",mk:"Veltren",md:"Vektor 4",yr:2021,cls:"A2",price:70000,top:290,acc:.66,grip:.84,body:0x5a6b7a,shape:"gt",wing:"lip"},
 {id:"rrsport",mk:"Brindle",md:"Moorland",yr:2018,cls:"A3",price:85000,top:283,acc:.60,grip:.70,body:0x2a2d31,shape:"suv",wing:"none"},
 {id:"gtr",mk:"Aokira",md:"Kazan 6",yr:2017,cls:"A3",price:95000,top:315,acc:.78,grip:.90,body:0x8d939a,shape:"gt",wing:"mid"},
 {id:"amggt",mk:"Veltren",md:"Strahl R",yr:2019,cls:"A3",price:120000,top:318,acc:.76,grip:.90,body:0x4f6b2a,shape:"gt",wing:"mid"},
 {id:"cayenne",mk:"Kessler Vale",md:"Cairn X",yr:2022,cls:"A3",price:130000,top:300,acc:.74,grip:.78,body:0xd8d8dc,shape:"suv",wing:"none"},
 {id:"viper",mk:"Darrow",md:"Fang 10",yr:2008,cls:"A4",price:140000,top:325,acc:.74,grip:.78,body:0xb3121a,shape:"gt",wing:"lip"},
 {id:"vantage",mk:"Wychford",md:"Vesper R",yr:2021,cls:"A4",price:150000,top:314,acc:.74,grip:.88,body:0x00693a,shape:"gt",wing:"mid"},
 {id:"dbs",mk:"Wychford",md:"Regent",yr:2009,cls:"A4",price:165000,top:307,acc:.72,grip:.86,body:0xa9aeb4,shape:"gt",wing:"none"},
 {id:"r8",mk:"Veltren",md:"Arc 10",yr:2020,cls:"A4",price:175000,top:324,acc:.82,grip:.92,body:0xf1f1ef,shape:"super",wing:"lip"},
 {id:"urus",mk:"Orsini Vale",md:"Torra",yr:2019,cls:"A5",price:210000,top:305,acc:.80,grip:.80,body:0xf0c419,shape:"suv",wing:"lip"},
 {id:"gt3",mk:"Kessler Vale",md:"Ridge RS",yr:2022,cls:"A5",price:220000,top:296,acc:.82,grip:1.00,body:0xd8d8dc,shape:"gt",wing:"big"},
 {id:"f488",mk:"Bellora",md:"Ventra S",yr:2016,cls:"A5",price:245000,top:325,acc:.86,grip:.92,body:0xc0141a,shape:"roadster",wing:"none"},
 {id:"huracan",mk:"Orsini Vale",md:"Saetta",yr:2017,cls:"A6",price:280000,top:325,acc:.88,grip:.94,body:0xe8821a,shape:"super",wing:"big"},
 {id:"mclaren",mk:"Wychford",md:"Needle LT",yr:2021,cls:"A6",price:350000,top:330,acc:.92,grip:.95,body:0xff6a00,shape:"super",wing:"big"},
 {id:"apollo",mk:"Kessler Vale",md:"Anvil S",yr:2008,cls:"A6",price:390000,top:360,acc:.90,grip:.96,body:0xf0b81a,shape:"super",wing:"big"},
 {id:"ccx",mk:"Norrvik",md:"Skeld",yr:2006,cls:"A7",price:450000,top:395,acc:.94,grip:.90,body:0x232427,shape:"super",wing:"mid"},
 {id:"sf90",mk:"Bellora",md:"Fulmine H",yr:2020,cls:"A7",price:480000,top:340,acc:.96,grip:.92,body:0xcc1100,shape:"super",wing:"lip"},
 {id:"chiron",mk:"Montreval",md:"Sovereign",yr:2021,cls:"A7",price:750000,top:440,acc:1.00,grip:.82,body:0x14267a,shape:"super",wing:"lip"},
];
// Cars taken from traffic aren't yours: each stands in under a made-up id ("st0"...) that borrows a model and its
// figures from one of the game's cars, in the traffic car's colour. They never reach the save or the garage.
const LEFT=[];           // cars standing in the world that nobody is driving (see ON FOOT, taking cars)
const STREET=new Map();   // made-up id -> {base: the car it borrows from, paint, car: that car's data under the made-up id}
const carById=id=>{const st=STREET.get(id);return st?st.car:CARS.find(c=>c.id===id)||CARS[0]};
/* car customisation: every option is an index into its list; a car's save keeps only what differs from stock */
const MOD_OPTS={
  fin:{n:"FINISH",p:4000,o:["METALLIC","GLOSS","MATTE","PEARL"]},
  roof:{n:"ROOF",p:2500,o:["BODY","BLACK","WHITE","GRAPHITE"]},
  rim:{n:"RIMS",p:5000,o:["STOCK","Y-SPOKE","10-SPOKE","5-SPOKE","SPLIT","7-SPOKE","6-SPOKE"]},
  rimC:{n:"RIM COLOUR",p:1500,o:["SILVER","BLACK","GUNMETAL","GOLD","WHITE","BRONZE","RED","BLUE"]},
  cal:{n:"BRAKE CALIPERS",p:1000,o:["STOCK","RED","YELLOW","BLACK","BLUE","GREEN","ORANGE"]},
  wing:{n:"SPOILER",p:6000,o:["STOCK","NONE","LIP","MID","BIG"]},
  exh:{n:"EXHAUST TIPS",p:3000,o:["STOCK","TWIN","QUAD","CENTRE"]},
  exhC:{n:"TIP FINISH",p:1000,o:["CHROME","BLACK","TITANIUM"]},
  exhS:{n:"EXHAUST SOUND",p:4500,o:["STOCK","SPORT"]},
  liv:{n:"LIVERY",p:3500,o:["NONE","TWIN STRIPES","SIDE STRIPE","RACE NUMBER"]},
  livC:{n:"LIVERY COLOUR",p:0,o:["WHITE","BLACK","RED","YELLOW","BLUE","GREEN"]},
  num:{n:"NUMBER",p:0},
  tint:{n:"WINDOW TINT",p:1500,o:["LIGHT","DARK","LIMO"]},
  plate:{n:"NUMBER PLATE",p:500}
};
const MOD_STOCK={fin:0,roof:0,rim:0,rimC:0,cal:0,wing:0,exh:0,exhC:0,exhS:0,liv:0,livC:0,num:7,tint:1,plate:"PM 2026"};
const MOD_ROOF=[null,0x0d0e10,0xf2f2f0,0x3a3d42],MOD_RIMS=[null,"y5","ten","five","split","seven","six"];
const MOD_RIMC=[0xc4c8cd,0x15161a,0x55595f,0xc9a14a,0xeceeee,0x8a5a3a,0xb3121a,0x1d4aa8];
const MOD_CAL=[null,0xc8141a,0xf2c200,0x18191c,0x1f5fd0,0x1f9a4a,0xf07a10],MOD_WING=[null,"none","lip","mid","big"];
const MOD_EXHC=[0xe6e8ea,0x1a1b1e,0x6c6fa6],MOD_LIVC=[0xf4f4f2,0x111214,0xc8141a,0xf2c200,0x1f5fd0,0x1f9a4a],MOD_TINT=[0x34424d,0x0c1115,0x020304];
// a car's customisation (stock where it has none), and what changing from one to another costs: each option changed
// is paid once; the livery's colour and number come with the livery
const modsOf=id=>Object.assign({},MOD_STOCK,save.mods[id]||{});
function modCost(a,b){let c=0;const liv=a.liv!==b.liv||(b.liv>0&&(a.livC!==b.livC||(b.liv===3&&a.num!==b.num)));
  for(const k in MOD_OPTS){if(k==="livC"||k==="num")continue;if(k==="liv"?liv:a[k]!==b[k])c+=MOD_OPTS[k].p}return c}
const PAINTS=[0xf1f1ef,0x141518,0xa9aeb4,0x5a6168,0xc0141a,0xe8761a,0xf0c419,0x1d4aa8,0x2c8ad8,0x0d6b3c];
const STARTERS=["golf","mx5","mustang","rrsport","gtr"];
const GARAGE_CAP=12;

/* ================================================================ SAVE */
const SAVE_KEY="port-meridien-v1";
const OUTFITS=[
  {id:"palms",name:"Harbour palms",detail:"Palm-print shirt · sand chinos",shirt:0x327e76,pants:0xc3aa88,trim:0xf1e0b4},
  {id:"stripe",name:"Boardwalk stripe",detail:"Coral striped tee · dark denim",shirt:0xaf5a53,pants:0x394c59,trim:0xffcfaa},
  {id:"club",name:"Night shift",detail:"Ink jacket · ivory trousers",shirt:0x323958,pants:0xd9ccae,trim:0xcaa57f}
];
// what each of the four needs (js/life.js) starts at, out of 100
const NEEDS_START={energy:80,hunger:75,fun:65,social:65};
// Active slots hold catalogue ids. Only completed wants count towards cloud progress.
const WANT_CATALOG=[
  {id:"meet",label:"Talk to someone new",cr:600},{id:"friendly",label:"Reach Friendly with someone",cr:1000},
  {id:"race",label:"Finish a race",cr:1200},{id:"shift",label:"Finish a kitchen shift",cr:1000},
  {id:"landmark",label:"Discover a landmark",cr:900},{id:"photo",label:"Take a photo",cr:400},
  {id:"place",label:"Place a new piece of furniture",cr:650},{id:"home",label:"Have a snack or play at home",cr:500},
  {id:"walk",label:"Walk 500 m",cr:750},{id:"level",label:"Gain a skill level",cr:1500},
  {id:"repair",label:"Repair real damage",cr:800},{id:"promote",label:"Get a promotion at the kitchen",cr:1500}
];
const wantIds=WANT_CATALOG.map(w=>w.id);
function wantsClean(raw){
  const data=raw&&typeof raw==="object"&&!Array.isArray(raw)&&raw.v===1?raw:{};
  const active=[],completed={};
  if(Array.isArray(data.active))for(const id of data.active.slice(0,3)){
    if(wantIds.includes(id)&&!active.includes(id))active.push(id);
  }
  for(const id of ["meet","walk","friendly"])if(active.length<3&&!active.includes(id))active.push(id);
  for(const id of wantIds){
    const n=data.completed?.[id];
    if(Object.prototype.hasOwnProperty.call(data.completed||{},id)&&Number.isSafeInteger(n)&&n>0)completed[id]=Math.min(n,1e9);
  }
  const today=Math.floor(Date.now()/86400000);
  const day=Number.isSafeInteger(data.day)&&data.day>=0?Math.min(today,data.day):-1;
  const metres=active.includes("walk")&&Number.isFinite(data.metres)?clamp(data.metres,0,499.999):0;
  return {v:1,active,completed,day,metres};
}
function wantsSync(remoteRaw){
  const local=save.wants,remote=wantsClean(remoteRaw);
  if(remote.day>local.day){
    local.day=remote.day;local.active=remote.active;local.metres=remote.metres;return true;
  }
  if(local.day===remote.day&&local.active.includes("walk")&&remote.active.includes("walk")&&remote.metres>local.metres){
    local.metres=remote.metres;return true;
  }
  return false;
}
// (no promotion to want once you're the kitchen's head chef)
const wantOpen=id=>id!=="promote"||typeof workRank!=="function"||workRank()<WORK_RANKS.length-1;
function wantDraw(exclude){
  const choices=wantIds.filter(id=>!exclude.includes(id)&&wantOpen(id));
  return choices[Math.floor(Math.random()*choices.length)];
}
// A want drawn to replace one just done can't be done by the same action, only by a later one: a shift that also
// levelled Cooking used to pay for a "Gain a skill level" drawn that instant, and a promotion could follow it. The new
// slot opens once the action's code has run (a microtask)
const wantFresh=new Set();
function wantEvent(id,metres=0){
  const w=save.wants,slot=w.active.indexOf(id);
  if(slot<0||wantFresh.has(slot))return false;
  if(id==="walk"){
    if(!Number.isFinite(metres)||metres<=0)return false;
    w.metres+=metres;if(w.metres<500)return false;w.metres=0;
  }
  const item=WANT_CATALOG.find(it=>it.id===id);
  w.active[slot]=wantDraw(w.active);w.completed[id]=Math.min(1e9,(w.completed[id]||0)+1);
  if(!wantFresh.size)Promise.resolve().then(()=>wantFresh.clear());wantFresh.add(slot);
  save.cr+=item.cr;updateMoney();toast("WANT COMPLETE",item.label+" · +"+fmtCr(item.cr)+" CR","gold");
  return true;
}
function wantsReroll(){
  const w=save.wants,today=Math.floor(Date.now()/86400000);
  if(state!=="PAUSE"||tabIdle||document.hidden||w.day>=today)return false;
  const previous=w.active.slice(),next=[];
  while(next.length<3)next.push(wantDraw(previous.concat(next)));
  w.active=next;w.day=today;w.metres=0;persist();return true;
}
const SKILL_RATE={driving:.02,cooking:.03,charisma:.04,fitness:-.03,photography:.02,handiness:-.03};
const skillThreshold=level=>25*level*(level+1);
function skillsClean(raw){
  const valid=raw&&typeof raw==="object"&&!Array.isArray(raw)&&raw.v===1;
  const clean={v:1,driving:0,cooking:0,charisma:0,fitness:0,photography:0,handiness:0};
  for(const k of Object.keys(SKILL_RATE)){
    const xp=valid&&Object.prototype.hasOwnProperty.call(raw,k)?raw[k]:0;
    clean[k]=Number.isFinite(xp)?clamp(Math.floor(xp),0,skillThreshold(10)):0;
  }
  return clean;
}
function skillLevel(k){
  const xp=save.skills[k];let level=0;
  while(level<10&&xp>=skillThreshold(level+1))level++;
  return level;
}
function skillFactor(k){return 1+SKILL_RATE[k]*skillLevel(k)}
function skillAward(k,xp){
  const before=skillLevel(k);
  save.skills[k]=Math.min(skillThreshold(10),save.skills[k]+xp);
  const after=skillLevel(k);if(after>before)wantEvent("level");
  for(let level=before+1;level<=after;level++)toast("SKILL LEVEL UP",k[0].toUpperCase()+k.slice(1)+" · level "+level,"gold");
}
// Distance remainders belong to this session. Teleports never enter the physics/footstep samples.
const skillMetres={driving:0,fitness:0};
function skillDistance(k,metres){
  if(!(metres>0)||!Number.isFinite(metres)||skillLevel(k)===10)return;
  const interval=k==="driving"?250:50;
  skillMetres[k]+=metres;
  if(skillMetres[k]>=interval){
    const xp=Math.floor(skillMetres[k]/interval);skillMetres[k]%=interval;skillAward(k,xp);persist();
  }
}
// the UTC day of the photos counted, and how many. A day still to come (the clock was set ahead, here or on another
// device) is taken as today with its count, on loading, from the account and at a capture: putting the clock right
// then neither blocks the photos until that day nor gives five more
function photoDayClean(raw){
  const today=Math.floor(Date.now()/86400000);
  return Number.isSafeInteger(raw?.day)&&raw.day>=0&&Number.isInteger(raw.count)?
    {day:Math.min(raw.day,today),count:clamp(raw.count,0,5)}:{day:0,count:0};
}
function skillPhoto(){
  const today=Math.floor(Date.now()/86400000),record=save.photoDay;
  if(today>record.day){record.day=today;record.count=0}else if(today<record.day)record.day=today;
  if(record.count>=5)return;
  record.count++;skillAward("photography",10);persist();
}
function workClean(w){
  const valid=w&&typeof w==="object"&&!Array.isArray(w)&&w.v===1;
  const value=(k,max)=>valid&&Number.isFinite(w[k])?clamp(w[k],0,max):0;
  return {v:1,completed:Math.floor(value("completed",9999)),cool:Math.ceil(value("cool",120))};
}
const save={aspire:{v:1,claimed:{}},wants:wantsClean(null),home:{v:1,wall:"plaster",floor:"oak",items:[]},homeWait:{snack:0,play:0},work:workClean(null),v:2,outfit:"palms",nick:"",cr:120000,xp:0,owned:STARTERS.slice(),cur:"golf",paint:{},rec:{},radar:{},auto:false,assist:true,sound:true,music:true,gfx:0,cam:0,todMode:0,tod:16.6,found:{},passBonus:false,jobs:{},jobActive:null,diff:1,ghost:{},ghostOn:true,steer:1,tilt:false,champ:{},side:"L",armed:false,flash:true,violence:1,mods:{},rel:{},skills:skillsClean(null),photoDay:photoDayClean(null),needs:Object.assign({v:1},NEEDS_START)};
let loadedV=0;
// the needs as a save holds them: version 1, each a whole number from 0 to 100. Anything but a plain object of this
// version starts again from the starting values; a missing or broken number is put back to its own starting value,
// and keys the game doesn't know are left out. Used on loading, and on a save from the account (js/screens.js)
/** @returns {{v:number,energy:number,hunger:number,fun:number,social:number}} */
function needsClean(n){
  const ok=!!n&&typeof n==="object"&&!Array.isArray(n)&&n.v===1,o=/** @type {any} */ ({v:1});
  for(const k in NEEDS_START){const x=ok?n[k]:undefined;o[k]=typeof x==="number"&&Number.isFinite(x)?Math.round(clamp(x,0,100)):NEEDS_START[k]}
  return o;
}
try{
  const s=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");
  if(s&&typeof s==="object"&&!Array.isArray(s)){
    // only the fields the game knows, so stray keys in storage can't add anything to the save
    const old=!s.v;loadedV=+s.v||0;for(const k of Object.keys(save))if(Object.prototype.hasOwnProperty.call(s,k))save[k]=s[k];
    if(old&&Array.isArray(save.owned)){save.v=2;STARTERS.forEach(id=>{if(!save.owned.includes(id))save.owned.push(id)});save.cr=Math.max(+save.cr||0,60000)}
  }
}catch(e){}
// whatever came out of storage, every field ends up with the right type and a sane value
{
  const num=(v,d,lo,hi)=>typeof v==="number"&&Number.isFinite(v)?clamp(v,lo,hi):d;
  const dict=(v,ok)=>{const o={};if(v&&typeof v==="object"&&!Array.isArray(v))for(const k of Object.keys(v))if(ok(v[k]))o[k]=v[k];return o};
  save.v=3;
  if(!OUTFITS.some(o=>o.id===save.outfit))save.outfit=OUTFITS[0].id;
  // the name friends see when playing together (js/net.js): letters, digits, spaces and . ' _ -, at most 12
  save.nick=typeof save.nick==="string"?save.nick.replace(/[^\p{L}\p{N} .'_-]/gu,"").replace(/\s+/g," ").trim().slice(0,12):"";
  save.cr=num(save.cr,120000,0,1e12);save.xp=num(save.xp,0,0,1e12);
  save.todMode=Math.round(num(save.todMode,0,0,4));save.tod=num(save.tod,16.6,0,23.99);
  save.paint=dict(save.paint,c=>Number.isInteger(c)&&c>=0&&c<=0xffffff);
  save.rec=dict(save.rec,t=>typeof t==="number"&&t>0&&Number.isFinite(t));
  save.radar=dict(save.radar,v=>typeof v==="number"&&v>0&&Number.isFinite(v));
  // auto gas starts off on every device; saves from before version 3 had it on by default on touch screens
  if(typeof save.auto!=="boolean"||loadedV<3)save.auto=false;
  if(typeof save.assist!=="boolean")save.assist=true;
  if(typeof save.sound!=="boolean")save.sound=true;
  if(typeof save.music!=="boolean")save.music=true;
  save.gfx=Math.round(num(save.gfx,0,0,2));save.cam=Math.round(num(save.cam,0,0,3));
  // race difficulty: 0 EASY, 1 NORMAL, 2 HARD
  save.diff=Math.round(num(save.diff,1,0,2));
  // time trial ghosts: the record run of each, by event id: the car, the time, and every 0.1 s [x, z, heading, metres
  // along the route]. Anything malformed is dropped whole
  save.ghost=dict(save.ghost,g=>!!g&&typeof g==="object"&&typeof g.c==="string"&&CARS.some(c=>c.id===g.c)&&typeof g.t==="number"&&g.t>0&&Number.isFinite(g.t)&&
    Array.isArray(g.d)&&g.d.length>=8&&g.d.length%4===0&&g.d.length<=12000&&g.d.every(v=>typeof v==="number"&&Number.isFinite(v)));
  for(const k in save.ghost){const g=save.ghost[k];save.ghost[k]={c:g.c,t:g.t,d:g.d}}
  if(typeof save.ghostOn!=="boolean")save.ghostOn=true;
  // steering sensitivity (0 LOW, 1 NORMAL, 2 HIGH) and tilt-to-steer on phones (off unless switched on)
  save.steer=Math.round(num(save.steer,1,0,2));if(typeof save.tilt!=="boolean")save.tilt=false;
  // which side of the road traffic keeps to: L (the default, as in Malaysia or the UK) or R (as in Spain)
  save.side=save.side==="R"?"R":"L";
  // the pistol: whether you took it from the garage, and how violence is shown (0 LOW, 1 STANDARD, 2 STRONG)
  if(typeof save.armed!=="boolean")save.armed=false;if(typeof save.flash!=="boolean")save.flash=true;save.violence=Math.round(num(save.violence,1,0,2));
  // customisation, by car: only cars that exist, only known options with values in range; the rest is dropped
  {const m=save.mods&&typeof save.mods==="object"&&!Array.isArray(save.mods)?save.mods:{},o={};
   for(const id of Object.keys(m)){if(!CARS.some(c=>c.id===id)||!m[id]||typeof m[id]!=="object")continue;const v=m[id],c={};
     for(const k in MOD_STOCK){const x=v[k];if(x===undefined)continue;
       // "WID 2026" was the stock plate this game inherited from White Isle Drive: a save holding it gets today's stock plate
       if(k==="plate"){if(typeof x==="string"&&/^[A-Z0-9 ]{1,8}$/.test(x)&&x.trim()&&x!=="WID 2026")c[k]=x}
       else if(k==="num"){if(Number.isInteger(x)&&x>=1&&x<=99)c[k]=x}
       else if(Number.isInteger(x)&&x>=0&&x<MOD_OPTS[k].o.length)c[k]=x}
     if(Object.keys(c).length)o[id]=c}
   save.mods=o}
  // friendships with the people of Old Quay (js/life.js), by person 0 to 15: between -100 and 100, and how many times
  // you've talked
  {const r=save.rel&&typeof save.rel==="object"&&!Array.isArray(save.rel)?save.rel:{},o={};
   for(const k of Object.keys(r)){const v=r[k];if(!/^(1[0-5]|[0-9])$/.test(k)||!v||typeof v!=="object")continue;
     o[k]={f:Math.round(num(v.f,0,-100,100)),n:Math.round(num(v.n,0,0,9999))}}
   save.rel=o}
  save.wants=wantsClean(save.wants);save.skills=skillsClean(save.skills);save.photoDay=photoDayClean(save.photoDay);
  save.needs=needsClean(save.needs);save.work=workClean(save.work);
  // class championships, by class: rounds driven (0 to 3), the points from each, and whether the cup was ever won
  {const c=save.champ&&typeof save.champ==="object"&&!Array.isArray(save.champ)?save.champ:{},o={};
   for(const k of ["A1","A2","A3","A4","A5","A6","A7"]){const v=c[k];if(!v||typeof v!=="object")continue;
     const pts=Array.isArray(v.pts)?v.pts.filter(x=>[0,3,4,6,10].includes(x)).slice(0,3):[];
     o[k]={r:pts.length,pts,won:v.won===true}}
   save.champ=o}
  // Island Passport: landmarks found, by stable id (ids not in this version are kept, so nothing is lost), and the one-time bonus
  save.found=dict(save.found,v=>v===1||v===true);for(const k in save.found)save.found[k]=1;
  if(typeof save.passBonus!=="boolean")save.passBonus=false;
  // Contracts: completed runs by type and by contract id, failed and abandoned runs, credits earned; and a note
  // that one was under way (so a reload can say it was cancelled)
  {const j=/** @type {any} */ (save.jobs&&typeof save.jobs==="object"&&!Array.isArray(save.jobs)?save.jobs:{}),n=v=>Math.round(num(v,0,0,1e9));
   save.jobs={parcel:n(j.parcel),courier:n(j.courier),tour:n(j.tour),failed:n(j.failed),abandoned:n(j.abandoned),earned:n(j.earned),runs:dict(j.runs,v=>Number.isInteger(v)&&v>0)}}
  save.jobActive=save.jobActive&&typeof save.jobActive==="object"&&typeof save.jobActive.id==="string"?{id:save.jobActive.id}:null;
  if(!Array.isArray(save.owned))save.owned=[];
}
save.owned=[...new Set(save.owned.filter(id=>CARS.some(c=>c.id===id)))].slice(0,GARAGE_CAP);
if(!save.owned.length)save.owned=STARTERS.slice();
if(!save.owned.includes(save.cur))save.cur=save.owned[0];
// if the browser refuses to store the save (private mode, storage full) the game carries on, and says so once
let saveWarned=false,CL=null,tabIdle=false;   // tabIdle: the game is open in a newer tab, and this one has stopped   // CL: the cloud save's state, set up with it below (null until then, or with no cloud)
// (the needs are kept with fractions while you play, js/life.js; the save gets them as whole numbers, here)
function persist(){if(tabIdle)return;if(typeof needsCommit==="function")needsCommit();if(CL){if(CL.applying)return;clChanged()}if(typeof aspireCheck==="function")aspireCheck();try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){if(!saveWarned&&typeof toast==="function"){saveWarned=true;toast("PROGRESS NOT SAVED","This browser isn't letting the game store your progress","bad")}}}
const paintOf=id=>STREET.has(id)?STREET.get(id).paint:save.paint[id]!==undefined?save.paint[id]:carById(id).body;

/* ================================================================ RENDERER */
let W=innerWidth,H=innerHeight;
// sharp on high-density phone screens too: up to 2 rendered pixels per CSS pixel, with edge smoothing
// (multisampling is cheap on the tile-based GPUs in phones). adaptRes lowers this if frames run slow.
// GRAPHICS setting: AUTO starts sharp and can lower the render scale even on a 1x display when frames stay slow;
// SHARP always renders at the screen's full sharpness; SMOOTH renders at 1 for weak phones and long battery
let PR_DEV=Math.min(devicePixelRatio||1,2),PR_MAX=PR_DEV,PR_MIN=PR_DEV;
// Diagnostic switches, for measuring on a phone what the picture costs (nothing changes without them):
// ?scale=N holds the render scale at N (up to the screen's), whatever the GRAPHICS setting; ?shadows=off draws no
// shadows; ?far=near draws trees and rocks out to about 400 m instead of up to 1.7 km
const DIAG=(()=>{const q=location.search,sc=/[?&]scale=([\d.]+)/.exec(q);
  return{scale:sc?Math.max(.5,Math.min(2,+sc[1]||1)):null,shadows:!/[?&]shadows=off/.test(q),near:/[?&]far=near/.test(q)}})();
function gfxLimits(){const g=save.gfx;PR_MAX=g===2?Math.min(PR_DEV,1):PR_DEV;PR_MIN=g===0?Math.min(PR_MAX,.75):PR_MAX;
  if(DIAG.scale)PR_MAX=PR_MIN=Math.min(PR_DEV,DIAG.scale)}
gfxLimits();
let prNow=PR_MAX;
const renderer=new THREE.WebGLRenderer({canvas:$("c"),antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(prNow);
renderer.setSize(W,H,false);
renderer.shadowMap.enabled=DIAG.shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
// Light in linear space, filmic tone mapping, sRGB on screen. Colours in this
// code are written as ordinary sRGB hex values, so they are converted to
// linear as they are set; canvas textures are marked as sRGB images.
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
{const sh=THREE.Color.prototype.setHex;THREE.Color.prototype.setHex=function(h){sh.call(this,h);return this.convertSRGBToLinear()}}
{const CT=THREE.CanvasTexture;THREE.CanvasTexture=class extends CT{constructor(...a){super(...a);this.encoding=THREE.sRGBEncoding}}}
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0xcfe0ea,260,1700);
const camera=new THREE.PerspectiveCamera(60,W/H,.25,4400);
// fov is vertical, so a tall portrait screen would see only a narrow slice of the road; widen it there
const fitZoom=()=>{camera.zoom=W<H?Math.sqrt(W/H):1};fitZoom();
addEventListener("resize",()=>{
  W=innerWidth;H=innerHeight;
  // Browser zoom and moving the window between screens can change the pixel density during play.
  const density=Math.min(devicePixelRatio||1,2);
  // A phone can resize the page while the later scripts are still loading, as its viewport settles: resolution sampling
  // (js/main.js) and the HUD layout (js/play.js) join in once they exist. This threw before the canvas was resized,
  // which left it at the old size until the next resize
  if(typeof resetResolutionSample==="function"){if(RES.baseline){prNow=RES.previous;renderer.setPixelRatio(prNow)}resetResolutionSample()}
  if(density!==PR_DEV){const atMax=prNow===PR_MAX;PR_DEV=density;gfxLimits();
    prNow=atMax?PR_MAX:clamp(prNow,PR_MIN,PR_MAX);renderer.setPixelRatio(prNow)}
  renderer.setSize(W,H,false);camera.aspect=W/H;fitZoom();camera.updateProjectionMatrix();if(typeof layoutHUD==="function")layoutHUD()
});

/* ================================================================ SKY + DAY/NIGHT */
// tileable cloud noise (periodic value-noise fbm), linear data
function cloudTex(){
  const N=256,img=new ImageData(N,N),hs=(x,y,p)=>{x=((x%p)+p)%p;y=((y%p)+p)%p;return hash2(x+p*7.1,y+p*3.3)};
  const vn=(x,y,p)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
    const a=hs(xi,yi,p),b=hs(xi+1,yi,p),c=hs(xi,yi+1,p),d=hs(xi+1,yi+1,p);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v};
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let v=0,amp=.5,tot=0;for(let o=0,p=6;o<5;o++,p*=2){v+=vn(x/N*p,y/N*p,p)*amp;tot+=amp;amp*=.5}
    v/=tot;const i=(y*N+x)*4;img.data[i]=img.data[i+1]=img.data[i+2]=v*255;img.data[i+3]=255}
  const c=document.createElement("canvas");c.width=c.height=N;c.getContext("2d").putImageData(img,0,0);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.LinearEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
const skyU={top:{value:new THREE.Color()},hor:{value:new THREE.Color()},bot:{value:new THREE.Color(0x163e55)},
  sunDir:{value:new V3(0,1,0)},sunCol:{value:new THREE.Color()},sunVis:{value:1},
  cloudT:{value:null},cT:{value:0},cLit:{value:new THREE.Color()},cShade:{value:new THREE.Color()}};
// hash2 is needed before the terrain section defines the noise helpers
function hash2(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s)}
skyU.cloudT.value=cloudTex();
const sky=new THREE.Mesh(new THREE.SphereGeometry(3800,32,16),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:"varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader:"uniform vec3 top,hor,bot,sunCol,sunDir,cLit,cShade;uniform float sunVis,cT;uniform sampler2D cloudT;varying vec3 vD;"+
  "void main(){vec3 d=normalize(vD);float y=d.y;vec3 c=y>0.?mix(hor,top,pow(smoothstep(0.,.5,y),.75)):mix(hor,bot,smoothstep(0.,.06,-y));"+
  "float s=max(dot(d,normalize(sunDir)),0.);c+=sunCol*(pow(s,1400.)*5.+pow(s,90.)*.3+pow(s,7.)*.16)*sunVis;"+
  // clouds: a flat layer seen in perspective, drifting slowly, lit on the sun side and fading into the haze
  "if(y>0.){vec2 p=d.xz/(y+.09)*.16+vec2(cT*.0025,cT*.0011);float n=texture2D(cloudT,p).r*.65+texture2D(cloudT,p*2.7+.31).r*.35;"+
  "float cov=smoothstep(.5,.78,n)*smoothstep(.0,.16,y);float th=smoothstep(.5,.95,n);"+
  "vec3 cc=mix(cLit,cShade,th*.75)+sunCol*pow(s,6.)*.5*sunVis;c=mix(c,cc,cov*.92);}"+
  "gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}"}));
sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);

const stars=(()=>{const n=1400,p=new Float32Array(n*3);for(let i=0;i<n;i++){const u=Math.random()*TAU,v=Math.acos(Math.random()*.95);p[i*3]=Math.sin(v)*Math.cos(u)*3500;p[i*3+1]=Math.cos(v)*3500;p[i*3+2]=Math.sin(v)*Math.sin(u)*3500}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(p,3));
  const m=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));
  m.frustumCulled=false;m.renderOrder=-9;scene.add(m);return m})();

const hemi=new THREE.HemisphereLight(0xd6e4f0,0x6b5a40,1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff2dc,2.3);
sun.castShadow=true;sun.shadow.mapSize.set(isTouch?1024:2048,isTouch?1024:2048);
sun.shadow.camera.near=1;sun.shadow.camera.far=700;
sun.shadow.camera.left=-95;sun.shadow.camera.right=95;sun.shadow.camera.top=95;sun.shadow.camera.bottom=-95;
sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;
scene.add(sun);scene.add(sun.target);

// keyframes by sun elevation (sine of the sun's angle above the horizon)
const SKYK=[
 // night: a bright moon and a blue sky glow, so the land stays readable without losing the night look
 {e:-.3, top:0x07102a,hor:0x1a2848,sun:0x000000,lc:0x9fb4e6,li:.95,hi:1.05,hs:0x4a6296,hg:0x23252f,fog:0x16223c,sea:0x2e3d5c,cl:0x26304a,cs:0x111827},
 {e:-.05,top:0x1d2d52,hor:0xc77b55,sun:0xff6a30,lc:0xff9a62,li:.8, hi:.45,hs:0x7a6e86,hg:0x2c2220,fog:0x6f5a5a,sea:0x8a7f92,cl:0xd38a6a,cs:0x4a4058},
 {e:.06, top:0x3d6aa6,hor:0xf0b07a,sun:0xffaa5a,lc:0xffbf80,li:2.4,hi:.6, hs:0xb8bccb,hg:0x5a4a38,fog:0xdcb592,sea:0xe6d6c8,cl:0xffd2a8,cs:0x8d7f8c},
 {e:.28, top:0x2c6cc0,hor:0xb9d2e4,sun:0xfff0d0,lc:0xfff1da,li:3.2,hi:.62,hs:0xc4d8ee,hg:0x5e4f38,fog:0xbcd2e2,sea:0xffffff,cl:0xffffff,cs:0xaab4c2},
 {e:1,   top:0x1f5fb6,hor:0xaac8e0,sun:0xfff6e0,lc:0xfff8ee,li:3.4,hi:.62,hs:0xc4d8ee,hg:0x5e4f38,fog:0xb4cde0,sea:0xffffff,cl:0xffffff,cs:0xa9b3c1}];
SKYK.forEach(k=>{for(const f of ["top","hor","sun","lc","hs","hg","fog","sea","cl","cs"])k[f]=new THREE.Color(k[f])});
const SUN=new V3(),MOON=new V3();let night=0;
function mixKey(f,a,b,t,out){return out.copy(a[f]).lerp(b[f],t)}
let water=null,lampMat=null,townMat=null,poolMat=null;
// a photo-mode look: lights the scene as at its own hour, with a little exposure and colour of its own, without
// changing save.tod. Everything below is worked out afresh every frame, so the island's own light is back the
// moment the look is cleared
let photoLook=null;
// the clouds' clock: real time since the page opened, less the time spent in photo mode (frame() advances it)
let skyClock=0;
function applyDayNight(){
  const L=photoLook,th=((L&&L.tod!==undefined?L.tod:save.tod)-6)/24*TAU;
  SUN.set(Math.cos(th),Math.sin(th),.42).normalize();
  const e=SUN.y;
  let i=0;while(i<SKYK.length-2&&e>SKYK[i+1].e)i++;
  const a=SKYK[i],b=SKYK[i+1],t=clamp((e-a.e)/(b.e-a.e),0,1);
  mixKey("top",a,b,t,skyU.top.value);mixKey("hor",a,b,t,skyU.hor.value);mixKey("sun",a,b,t,skyU.sunCol.value);
  skyU.sunDir.value.copy(SUN);skyU.sunVis.value=smooth(-.12,.02,e);
  mixKey("cl",a,b,t,skyU.cLit.value);mixKey("cs",a,b,t,skyU.cShade.value);skyU.cT.value=skyClock;
  mixKey("lc",a,b,t,sun.color);sun.intensity=lerp(a.li,b.li,t);
  hemi.intensity=lerp(a.hi,b.hi,t);mixKey("hs",a,b,t,hemi.color);mixKey("hg",a,b,t,hemi.groundColor);
  mixKey("fog",a,b,t,scene.fog.color);
  night=smooth(.04,-.12,e);
  scene.fog.near=lerp(260,140,night);scene.fog.far=lerp(1700,900,night);
  if(water)mixKey("sea",a,b,t,water.material.color);
  stars.material.opacity=night*.9;
  renderer.toneMappingExposure=.92+.2*night;
  if(poolMat){poolMat.opacity=night*.5;poolMat.visible=night>.02}
  if(lampMat)lampMat.color.setRGB(lerp(.62,1,night),lerp(.62,.93,night),lerp(.58,.78,night)).convertSRGBToLinear();
  if(townMat)townMat.emissiveIntensity=night*1.1;
  if(e>-.06)MOON.copy(SUN);else MOON.copy(SUN).negate();
  if(MOON.y<.25){MOON.y=.25;MOON.normalize()}
  if(L&&L.col){renderer.toneMappingExposure*=L.exp;scene.fog.color.lerp(L.col,L.k);sun.color.lerp(L.col,L.k*.5)}
  if(CAR_ENV.tex)updateCarEnv(false);
  for(const m of TRAFFIC_MATS)m.emissiveIntensity=.35+night*1.1;
}
