const {test,expect}=require("@playwright/test");
const fs=require("node:fs"),vm=require("node:vm");
const read=n=>fs.readFileSync(require.resolve("../js/"+n+".js"),"utf8");
function part(file,start,end){
  const s=read(file),a=s.indexOf(start),b=s.indexOf(end,a);
  if(a<0||b<0)throw Error("Missing "+start);return s.slice(a,b);
}
function game(){
  const nodes=new Map(),alerts=[],document={hidden:false,createElement:()=>node()};
  const node=()=>({children:[],style:{},querySelectorAll(){return this.children},setAttribute(){},append(...v){this.children.push(...v)},appendChild(v){this.children.push(v)},replaceChildren(){this.children=[]},
    focus(){document.activeElement=this},classList:{contains:()=>false,add(){},remove(){}}});
  const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
  const g={needsMood:()=>"Okay", wantEvent:()=>false,save:{cr:10000},document,$,state:"PAUSE",tabIdle:false,ev:null,testDrive:null,pc:null,
    toast:(...args)=>alerts.push(args),persist(){},show:(id,on)=>{$(id).visible=on},clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),
    fmtCr:String,earn(x){g.save.cr+=x},Date:{now:()=>86400000*20000}};
  const ctx=vm.createContext(g),run=s=>vm.runInContext(s,ctx);
  run(part("core","const SKILL_RATE=","function workClean("));run(part("life","function traitLoss(","function needsTick("));run(part("core","function wantPay(","function wantEvent("));run("save.traits=traitsClean(null);save.skills=skillsClean(null);save.photoDay=photoDayClean(null)");
  return {g,run,alerts,$};
}
test("saved XP is finite, bounded and own-field only; every next level costs more",()=>{
  const {run,alerts}=game();
  expect(run('skillsClean({v:1,driving:Infinity,cooking:-2,charisma:1.9,fitness:"99",photography:NaN,handiness:1e9,junk:3})')).toEqual({v:1,driving:0,cooking:0,charisma:1,fitness:0,photography:0,handiness:2750});
  expect(run('skillsClean(Object.assign([],{v:1,fitness:100})).fitness+skillsClean({v:2,fitness:50}).fitness+skillsClean(Object.assign(Object.create({fitness:50}),{v:1})).fitness')).toBe(0);
  for(let i=1;i<=10;i++){
    expect(run('skillThreshold('+i+')-skillThreshold('+(i-1)+')')).toBe(i*50);
    expect(run('save.skills.driving=skillThreshold('+i+')-1;skillAward("driving",1);skillLevel("driving")')).toBe(i);
  }
  expect(run('skillAward("driving",20);save.skills.driving')).toBe(2750);expect(alerts.length).toBe(10);
});
test("skill progress distinguishes real gains from empty legacy saves and refunds",()=>{
  const {g,run}=game();g.homeProgress=()=>null;g.workClean=()=>({completed:0});g.STARTERS=[];
  run(part("screens","const CL_PREFS=","function clSummary("));
  expect(run('clProg({})===clProg({skills:save.skills})')).toBe(true);
  expect(run('skillAward("fitness",1);clProg({})===clProg({skills:save.skills})')).toBe(false);
  expect(run('clFresh({cr:120000,owned:[],skills:save.skills})')).toBe(false);
  g.save.xp=0;g.lvlOf=()=>0;g.updateMoney=()=>{};
  run(read("play").split("\n").find(l=>l.startsWith("function earn("))+';earn(10000);earn(-5000)');
  expect(run('save.skills.driving+save.skills.cooking+save.skills.handiness')).toBe(0);
});
test("a completed shift pays the cooking bonus once; only a home hunger gain awards snack XP",()=>{
  const {g,run}=game();
  Object.assign(g,{WORK:{panel:true,active:true,served:2,wait:0,hp:1},HEALTH:{hp:1},workAvailable:()=>true,
    WORK_ITEMS:["Bread","Bowl","Stew"],workCancel(){g.WORK.active=false},NEEDS:{hunger:90}});
  g.save.work={completed:0};run('save.skills.cooking=skillThreshold(5)');
  run(part("work","const WORK_RANKS=","// Only called")+part("life","function needsAdd(","// your mood"));
  expect(run("workServe(2)")).toBe(true);expect(run("workServe(2)")).toBe(false);
  expect(g.save.cr).toBe(10345);expect(g.save.skills.cooking).toBe(775);
  run('state="DRIVE";needsAdd("hunger",1);state="GARAGE";needsAdd("hunger",30);needsAdd("hunger",30)');
  expect(g.save.skills.cooking).toBe(780);
});
test("clean driving counts actual physics distance; road exits, hits and jumps do not earn it",()=>{
  const {g,run}=game();g.P={x:0,z:0,onRoad:true};g.dt=1;g.startX=0;g.startZ=0;
  const check="{"+part("main","  const travelled=","  P.hitT-=dt")+"}";
  g.P.x=125;run(check);g.P.hitT=1;run(check);g.P.hitT=0;run(check);
  expect(g.save.skills.driving).toBe(0);run(check);expect(g.save.skills.driving).toBe(1);
  g.P.x=1000;run(check);g.P.onRoad=false;run(check);expect(g.save.skills.driving).toBe(1);
});
test("Fitness uses accepted stride distance, running doubles it, and energy decays more slowly only on foot",()=>{
  const {g,run}=game();Object.assign(g,{strideSpeed:0,dt:1,go:1,run:true,FOOT:{on:true},BOAT:{on:false},NEEDS:{energy:100},
    NEED_LOSS:{energy:10},NEED_ORDER:["energy"],NEED_HOUR:1});
  const stride=read("people").split("\n").find(l=>l.includes('skillDistance("fitness"'));
  run(stride);g.strideSpeed=25;g.run=false;run(stride);expect(g.save.skills.fitness).toBe(0);
  g.strideSpeed=12.5;g.run=true;run(stride);expect(g.save.skills.fitness).toBe(1);
  const loss=read("life").split("\n").find(l=>l.includes("NEEDS[k]-NEED_LOSS"));
  run('save.skills.fitness=skillThreshold(10)');run(loss);expect(g.NEEDS.energy).toBe(93);
  g.BOAT.on=true;run(loss);expect(g.NEEDS.energy).toBe(83);
});
test("a race uses the pre-finish driving level; a landmark gives its photography bonus once",()=>{
  const {g,run}=game();Object.assign(g,{E:{type:"race"},rew:100,LANDMARK_REWARD:2500,PASSPORT_BONUS:30000,LANDMARKS:[{},{}],
    foundCount:()=>1,renderPassport(){}});
  g.save.found={};run('save.skills.driving=skillThreshold(5);save.skills.photography=skillThreshold(4)');
  run(read("play").split("\n").find(l=>l.includes('skillAward("driving",30)')));
  expect(g.rew).toBe(110);expect(g.save.skills.driving).toBe(780);
  run(part("progress","function discoverLandmark(","// once a frame"));
  run('discoverLandmark({id:"pier",name:"Pier"});discoverLandmark({id:"pier",name:"Pier"})');
  expect(g.save.cr).toBe(12700);
});
test("Photography awards five successful current captures per UTC day, survives reload and rejects late callbacks",async()=>{
  const {g,run}=game();let callback;
  Object.assign(g,{PH:{on:true},prNow:1,PR_MAX:1,renderer:{render(){},domElement:{}},scene:{},camera:{},
    applyDayNight(){},updateLampLights(){},photoFrame(){},syncRenderView(){},photoShotShow(){},phMsg(){}});
  g.document.createElement=()=>({getContext:()=>({drawImage(){}}),toBlob:cb=>{callback=cb}});
  run(part("media","function photoCapture(","function photoShotShow("));
  let p=run("photoCapture()");g.PH.busy=false;callback({});expect(await p).toBe(false);
  p=run("photoCapture()");callback(null);expect(await p).toBe(false);
  for(let i=0;i<6;i++){p=run("photoCapture()");callback({});await p;}
  expect(g.save.skills.photography).toBe(50);
  const fresh=game();fresh.g.save=JSON.parse(JSON.stringify(g.save));fresh.run("skillPhoto()");expect(fresh.g.save.skills.photography).toBe(50);
  fresh.g.Date.now=()=>86400000*20001;fresh.run("skillPhoto()");expect(fresh.g.save.skills.photography).toBe(60);
});
test("positive conversation gains scale and each available line earns its XP only once per conversation",()=>{
  const {g,run}=game();Object.assign(g,{TALK:{used:{}},who:{trait:"a"},TAKES:{a:{chat:1,rude:1}},r:{f:0},used:0,k:"chat",t:{id:"chat",base:10}});
  const calc=part("life","  let d=t.base","  TALK.used[t.id]");
  run('save.skills.charisma=skillThreshold(10)');expect(run('{'+calc+';d}')).toBe(14);
  run('save.skills.charisma=0');for(const [k,xp] of Object.entries({hello:2,chat:4,joke:5,compliment:4,tip:2,rude:1})){
    g.k=k;g.t={id:k,base:k==="rude"?-12:4};g.TAKES.a[k]=1;g.used=0;const before=g.save.skills.charisma;
    run('{'+calc+'}');g.used=1;run('{'+calc+'}');expect(g.save.skills.charisma-before).toBe(xp);
  }
});
test("a roadside quote and charge agree; garage and roadside XP require damage",()=>{
  const {g,run,$}=game();Object.assign(g,{P:{damage:50},repairConfirm:false,repairReturnPause:true,repairPanel(){},updateMoney(){},repairWarnLevel:0});
  run('save.skills.handiness=skillThreshold(10)');
  run(part("screens","const damagePct=","function repairPanel("));
  run(part("screens",'$("repairNow").onclick',"function pauseOn("));
  expect(run("repairPrice()")).toBe(1400);
  run('save.skills.handiness=skillThreshold(5)');
  $("repairNow").onclick();expect(g.save.cr).toBe(10000);expect(g.save.skills.handiness).toBe(750);
  $("repairNow").onclick();expect(g.save.cr).toBe(8300);expect(g.save.skills.handiness).toBe(765);
  $("repairNow").onclick();expect(g.save.skills.handiness).toBe(765);
  const garage=part("screens","    const repaired=","    P.damage=P.damageT");
  Object.assign(g,{endEvent(){},streetReset(){}});run('{'+garage+'}');expect(g.save.skills.handiness).toBe(765);
  g.P.damage=2;run('{'+garage+'}');expect(g.save.skills.handiness).toBe(780);
});
test("pause skills panel shows six level bars and restores focus through Escape and controller B",()=>{
  const {g,run,$}=game();run(part("screens","const SKILL_TEXT=","function pauseOff("));
  $("pSkills").onclick();expect($("pause").inert).toBe(true);expect(g.document.activeElement).toBe($("skClose"));
  expect($("skRows").children.length).toBe(6);
  const note=i=>$("skRows").children[i].children[3].textContent;
  expect(note(0)).toBe("Clean road driving and races · 50 XP to level 1");
  run('skillsClose();save.skills.handiness=skillThreshold(3)+10');$("pSkills").onclick();
  expect(note(5)).toBe("Repairing real damage · 9% off roadside repairs · 190 XP to level 4");
  g.k="escape";run(read("screens").split("\n").find(l=>l.includes('if(k==="escape")skillsClose()')).trim().replace(/^else /,""));
  expect($("skills").visible).toBe(false);expect(g.document.activeElement).toBe($("pSkills"));
  $("pSkills").onclick();g.hit=i=>i===1;
  for(const id of ["repair","passport","jobs","cups","needs","play"])$(id).classList.contains=()=>true;
  run(part("cars","const PAUSE_SUBS=","// a controller"));run(read("cars").split("\n").find(l=>l.includes('const sub=PAUSE_SUBS.find')).trim().replace(/^else /,""));
  expect($("pause").inert).toBe(false);expect(g.document.activeElement).toBe($("pSkills"));
});
test("a clock set ahead and put right neither blocks Photography XP nor resets the day's five",()=>{
  const {g,run}=game(),xp=()=>g.save.skills.photography;
  g.Date.now=()=>86400000*20007;run("skillPhoto()");expect(xp()).toBe(10);
  // put right and loaded again: the day to come is today, with its photo counted
  g.Date.now=()=>86400000*20000;run("save.photoDay=photoDayClean(save.photoDay)");expect(g.save.photoDay).toEqual({day:20000,count:1});
  run("skillPhoto()");expect(xp()).toBe(20);
  // put right while playing: the same, and the five already taken stay taken
  g.Date.now=()=>86400000*20005;run("for(let i=0;i<4;i++)skillPhoto()");expect(xp()).toBe(60);
  g.Date.now=()=>86400000*20003;run("skillPhoto();skillPhoto()");expect(xp()).toBe(70);expect(g.save.photoDay).toEqual({day:20003,count:5});
  g.Date.now=()=>86400000*20004;run("skillPhoto()");expect(xp()).toBe(80);
  // from the account too
  expect(run("photoDayClean({day:20010,count:3})")).toEqual({day:20004,count:3});
});

test("every mood scales every skill, including Lonely Charisma",()=>{
  for(const [mood,rate] of Object.entries({Content:115,Okay:100,Tired:85,Hungry:85,Bored:85,Tense:85,Lonely:85})){
    const {g,run}=game();g.needsMood=()=>mood;
    for(const k of Object.keys(g.save.skills).filter(k=>k!=="v")){
      for(let i=0;i<100;i++)run('skillAward("'+k+'",1)');
      expect(g.save.skills[k],mood+" "+k).toBe(mood==="Lonely"&&k==="charisma"?150:rate);
    }
  }
});
test("fractional gains cross moods independently and disappear on reload without changing cloud progress",()=>{
  const {g,run}=game();g.homeProgress=()=>null;g.workClean=()=>({completed:0});
  run(part("screens","const CL_PREFS=","function clSummary("));
  const before=JSON.stringify(g.save),fingerprint=run("clProg(save)");
  g.needsMood=()=>"Tired";run('skillAward("driving",1);skillAward("fitness",1)');
  expect(JSON.stringify(g.save)).toBe(before);expect(run("clProg(save)")).toBe(fingerprint);
  g.needsMood=()=>"Content";run('skillAward("driving",1)');
  expect(g.save.skills.driving).toBe(2);expect(g.save.skills.fitness).toBe(0);
  const fresh=game();fresh.g.save=JSON.parse(JSON.stringify(g.save));fresh.g.needsMood=()=>"Content";
  fresh.run('skillAward("fitness",1)');expect(fresh.g.save.skills.fitness).toBe(1);
});

test("Needs shows the effect beside the mood, including the Lonely exception",()=>{
  const {g,run,$}=game();
  Object.assign(g,{NEED_ORDER:[],needsTip:()=>""});g.save.wants={active:[],day:-1};
  run(part("life","function needsRender(","const needsLabel=")+part("life","function moodEffect(","// the one suggestion"));
  for(const [mood,label] of Object.entries({Happy:"Skills grow 25% faster",Confident:"Driving grows 50% faster",
    Inspired:"Photography grows 50% faster",Energised:"Fitness grows 50% faster",Content:"Skills grow 15% faster",Okay:"Skills grow at their usual rate",
    Tired:"Skills grow 15% slower",Hungry:"Skills grow 15% slower",Bored:"Skills grow 15% slower",
    Tense:"Skills grow 15% slower",Lonely:"Charisma grows 50% faster · other skills grow 15% slower"})){
    g.needsMood=()=>mood;run("needsRender()");
    expect($("ndMood").textContent).toBe(mood);expect($("ndMoodEffect").textContent).toBe(label);
  }
});

test("each skill trait multiplies a Content award exactly over 400 one-point awards",()=>{
  const {g,run}=game();g.needsMood=()=>"Content";
  for(const [id,skill] of Object.entries({foodie:"cooking",gearhead:"driving",athletic:"fitness",outgoing:"charisma",shutterbug:"photography",handy:"handiness"})){
    g.save.traits.ids=[id];run('for(let i=0;i<400;i++)skillAward("'+skill+'",1)');
    expect(g.save.skills[skill]).toBe(575);
  }
});
test("traits picker commits two choices together, locks today and restores focus",()=>{
  const {g,run,$}=game();run(part("screens","const SKILL_TEXT=","function pauseOff("));
  $("pSkills").onclick();expect($("skTraits").children).toHaveLength(8);
  $("skTraits").children[0].onclick();$("skTraits").children[1].onclick();
  expect($("skTraits").children[2].disabled).toBe(true);expect(g.save.traits.ids).toEqual([]);
  $("skTraitsApply").onclick();expect(g.save.traits.ids).toEqual(["foodie","gearhead"]);
  expect($("skTraitsApply").disabled).toBe(true);expect(run('traitsApply([])')).toBe(false);
  g.Date.now=()=>86400000*20001;expect(run('traitsApply([])')).toBe(true);
  $("skClose").onclick();expect(g.document.activeElement).toBe($("pSkills"));
});
test("traits clean and cloud progress retain a deliberate removal and match an untouched legacy save",()=>{
  const {g,run}=game();Object.assign(g,{homeProgress:()=>null,workClean:()=>({completed:0}),STARTERS:[]});
  run(part("screens","const CL_PREFS=","function clSummary("));
  expect(run('traitsClean({v:1,ids:["bad","handy","handy","foodie","outgoing"],day:99999})')).toEqual({v:1,ids:["foodie","outgoing"],day:20000});
  expect(run('clProg({})===clProg({traits:traitsClean(null)})')).toBe(true);
  expect(run('traitsApply(["foodie"]);clFresh(save)')).toBe(false);
  expect(run('clProg({})===clProg({traits:{v:1,ids:[],day:20000}})')).toBe(false);
});
test("secondary effects adjust the actual repair price, snack XP, home gains and photo limit",()=>{
  const {g,run}=game();Object.assign(g,{damagePct:()=>50,homeComfort:()=>0,homeHas:()=>false,NEEDS:{hunger:0},FOOT:{on:true},BOAT:{on:false}});
  run(read("screens").split("\n").find(l=>l.startsWith("const repairPrice=")));
  run(part("life","function homeGain(","function homeUse(")+part("life","function needsAdd(","// your mood"));
  g.save.traits.ids=["gearhead","shutterbug"];expect(run("repairPrice()")).toBe(1800);
  run("for(let i=0;i<7;i++)skillPhoto()");expect(g.save.photoDay.count).toBe(6);expect(g.save.skills.photography).toBe(75);
  expect(run("photoDayClean(save.photoDay).count")).toBe(6);
  g.save.traits.ids=["handy","homebody"];g.state="GARAGE";run('needsAdd("hunger",30)');expect(g.save.skills.cooking).toBe(10);
  expect(run('["rest","snack","play"].map(homeGain)')).toEqual([48,36,30]);
  expect(run('traitLoss("fun")')).toBe(1.1);
  g.save.traits.ids=["athletic","outgoing"];expect(run('traitLoss("energy")')).toBe(.9);expect(run('traitLoss("social")')).toBe(1.15);
  g.BOAT.on=true;expect(run('traitLoss("energy")')).toBe(1);g.save.traits.ids=["foodie"];expect(run('traitLoss("hunger")')).toBe(1.15);
});

test("a traits day left ahead by a clock put back while playing unlocks the next day", () => {
  const { g, run } = game();
  g.save.traits = { v: 1, ids: [], day: 20005 };
  expect(run('traitsApply(["foodie"])')).toBe(false);
  g.Date.now = () => 86400000 * 20001;
  expect(run('traitsLocked()')).toBe(false);
  expect(run('traitsApply(["foodie"])')).toBe(true);
  expect(g.save.traits).toEqual({ v: 1, ids: ["foodie"], day: 20001 });
});
