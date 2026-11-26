const {test,expect}=require("@playwright/test");
const fs=require("node:fs"),vm=require("node:vm");
const read=name=>fs.readFileSync(require.resolve("../js/"+name+".js"),"utf8");
function part(name,start,end){
  const src=read(name),a=src.indexOf(start),b=src.indexOf(end,a);
  if(a<0||b<0)throw Error(start);
  return src.slice(a,b);
}
function game(stored={}){
  const nodes=new Map(),toasts=[],tasks=[],writes=[];
  const $=id=>{
    if(!nodes.has(id))nodes.set(id,{appendChild(){},addEventListener(){},setAttribute(){},replaceChildren(){},
      classList:{contains:k=>k==="hide"&&!$(id).visible}});
    return nodes.get(id);
  };
  const g=vm.createContext({window:{},document:{hidden:false,querySelector:()=>null,createElement:()=>({dataset:{}})},
    localStorage:{getItem:()=>null,setItem(){}},setTimeout:fn=>tasks.push(fn),clearTimeout(){},
    save:{cr:120000,owned:["starter"],rel:{0:{n:1,f:75},1:{n:1,f:75},2:{n:1,f:75}},...stored},
    state:"GARAGE",SAVE_KEY:"review",isTouch:false,WANTED:{lvl:0},CL:{meta:{},user:{uid:"review"}},tabIdle:false,$,
    SAVE:{ok:true,gen:1,bootProg:""},STARTERS:["starter"],WORK:{cool:0,panel:false},
    show(id,visible){$(id).visible=visible},updateMoney(){},toast(...args){toasts.push(args)},
    lvlOf:()=>1,foundCount:()=>0,clSet(st){g.CL.st=st},clAt:()=>0,clOwn(){},clSaveMeta(){},clChanged(){},clRender(){},
    clForUser(user,run){return run()},clOff(error){throw error},
    persist(){run("needsCommit()");writes.push(JSON.parse(JSON.stringify(g.save)))},
    updateHUD(){},rnd:()=>.5,pedLook:()=>null,scene:{remove(){}},
    gW:(x,z,y)=>({x,y,z,sub(other){return {x:x-other.x,z:z-other.z}}}),
    gYaw:0,pedModel(){return {legs:[],arms:[],G:{position:{copy(p){Object.assign(this,p)}},rotation:{set(){}}},face:{m:{dispose(){}}}}}
  });
  const run=code=>vm.runInContext(code,g);
  run([part("core","const clamp=","\n"),part("core","const NEEDS_START=","const save="),
    "save.skills=skillsClean(save.skills);save.wants=wantsClean(null);save.work=workClean(save.work);",
    part("core","function needsClean(","\ntry{"),read("life"),read("home"),
    part("screens","const CL_PREFS=","function clAdapter("),
    part("screens","function clReconcile(","// this device's save goes to the account"),
    part("screens","function clUpload(","// the progress of the save"),
    part("screens","const HINT_KEY=","let repairConfirm")].join("\n"));
  g.clDisk=()=>run("clProg(save)");
  return {g,run,$,toasts,tasks,writes};
}

test("selling the only seat never puts party guests in the same occupied cell",()=>{
  const {run}=game();
  const result=run(`
    const items=[],add=(id,x,z,r=0)=>items.push({id,x,z,r});
    for(let z=2;z<14;z+=4)add("canopy",0,z);
    add("counter",0,14);add("counter",2,14);add("single",0,19,1);
    for(let x=4;x<40;x+=4){
      for(let z=2;z<18;z+=4)add("canopy",x,z);
      add("double",x,18,1);
    }
    for(let z=2;z<18;z+=4)add("single",40,z);
    add("fridge",40,18);add("stool",40,20);add("lamp",41,20);
    save.home=homeClean({v:1,items});const legal=save.home.items.length===items.length;
    partyInvite([0,1,2]);partyStart();partySync();homeSell(save.home.items.findIndex(p=>p.id==="stool"));partySync();
    const visible=[...PARTY_M.values()].filter(m=>m.G.visible).map(m=>m.G.position);
    const cells=visible.map(p=>({x:Math.floor((p.x-HOME_ORIGIN.x)/HOME_CELL),z:Math.floor((p.z-HOME_ORIGIN.z)/HOME_CELL)}));
    ({legal,valid:cells.every(c=>homeFits(save.home,"stool",c.x,c.z,0)),distinct:new Set(cells.map(c=>c.x+","+c.z)).size===cells.length})
  `);
  expect(result).toEqual({legal:true,valid:true,distinct:true});
});

test("a cooldown synced into the garage cannot strand an active party",()=>{
  const {run}=game();
  expect(run(`
    partyInvite([0]);partyStart();needsCommit();CL.meta.needs=needsKey(save);
    clNeeds({needs:save.needs,homeWait:{party:95}});
    !PARTY.active || !!partyEnd()
  `)).toBe(true);
});

test("an account revision collision cannot extend an already shortened party wait",async()=>{
  const a=game({homeWait:{party:180}}),b=game({homeWait:{party:180}});
  const snapshot=device=>device.run("JSON.stringify(clPayload(save))");
  let doc={rev:1,save:snapshot(a)};
  const put=async(uid,data,rev)=>{
    if(rev!==doc.rev)return {ok:false,doc};
    doc={...data,rev:rev+1};return {ok:true,rev:doc.rev};
  };
  for(const device of [a,b]){
    device.g.CL.ad={put};
    device.run("needsCommit();CL.meta={rev:1,prog:clProg(save),needs:needsKey(save),full:clHash(clCanon(clPayload(save)))}");
  }
  const wait=()=>JSON.parse(doc.save).homeWait.party||0;
  const observed=[];
  for(const [device,clock] of [[a,170],[b,10],[a,171],[b,11]]){
    device.g.clock=clock;
    await device.run("NS.t=clock;needsCommit();clUpload(CL.meta.rev)");
    observed.push(wait());
  }
  expect(observed).toEqual([10,10,9,9]);
});

test("the delayed home tutorial does not interrupt an active party",()=>{
  const {run,tasks,toasts}=game();
  run("hintHome();partyInvite([0]);partyStart()");
  tasks.shift()();
  expect(toasts).toHaveLength(0);
  expect(run("!!HINTS.home")).toBe(false);
});

test("an Inspired toast while wanted does not advertise an XP bonus already in effect",()=>{
  const {g,run,toasts}=game();
  run('state="DRIVE";WANTED.lvl=1;feel("inspired","A postcard");');
  expect(run("needsMood()")).toBe("Tense");
  expect(run('feeling()')).toBe("inspired");
  expect(toasts[0][1]).not.toMatch(/Photography grows 50% faster$/);
  g.WANTED.lvl=0;
  expect(run("needsMood()")).toBe("Inspired");
});

test("photo capture culls postcard markers from the camera used for the still",async()=>{
  const {g,run}=game();
  const position={x:0,z:0},marker={G:{position:{x:325,z:0},visible:false},card:{}};
  const rendered=[];
  Object.assign(g,{PH:{on:true,busy:false},state:"PHOTO",camera:{position},
    FOOT:{on:false},P:{x:0,z:0},POSTCARD_MARKS:new Map([["summit",marker]]),
    document:{hidden:false,createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:fn=>fn({})})},
    W:640,H:480,prNow:1,PR_MAX:1,scene:{},renderer:{domElement:{width:640,height:480},render(){rendered.push(marker.G.visible)}},
    applyDayNight(){},updateLampLights(){},photoFrame(){position.x=10},syncRenderView(){},
    photoShotShow(){},skillPhoto(){},hint(){throw Error("A photo must not show a postcard hint")}});
  run("let postcardT=0,postcardCalm=true;"+part("progress","function postcardTick(","// Postcard collection")+
    part("media","function photoCapture(","function photoShotShow("));
  run("postcardTick(0)");
  expect(marker.G.visible).toBe(false);
  expect(await run("photoCapture()")).toBe(true);
  expect(rendered).toEqual([true]);
});

test("an account restore blocks party settlement until the session is reset",()=>{
  const {g,run,tasks,writes}=game();
  const reloads=[];
  Object.assign(g,{location:{reload(){reloads.push(true)}},saveWrite(sv){
    writes.push(JSON.parse(JSON.stringify(sv)));return 2;
  }});
  run('partyInvite([0]);partyStart();clApply({rev:7},{...save,homeWait:{party:95}})');
  expect(g.CL.applying).toBe(true);
  expect(run("partyEnd()")).toBe(false);
  expect(writes).toHaveLength(1);
  tasks.shift()();
  expect(reloads).toEqual([true]);
  const restored=game(writes[0]);
  expect(restored.run("[PARTY.active,PARTY.ids,homeUntil.party]")).toEqual([false,[],95]);
});

test("garage Y is consumed by the Cloud and Customise guards",()=>{
  const {g,run,$}=game();
  const buttons=Array.from({length:16},()=>({pressed:false,value:0}));
  Object.assign(g,{navigator:{getGamepads:()=>[{connected:true,index:0,axes:[],buttons}]},
    GP:{prev:[],index:null},GO:{stick:[0,0]},HV:{on:false},cuOpen:()=>g.custom,
    clOverlayOpen:()=>g.cloud,clEscape(){}});
  run(part("cars","function pollPad(","addEventListener(\"gamepadconnected\""));
  let clicks=0;$("gParty").click=()=>clicks++;
  run("partyInvite([0]);partyStart();partySync()");
  function y(){
    buttons[3].pressed=false;run("pollPad()");
    buttons[3].pressed=true;run("pollPad()");
  }
  g.cloud=true;y();expect(clicks).toBe(0);
  g.cloud=false;g.custom=true;y();expect(clicks).toBe(0);
  g.custom=false;y();expect(clicks).toBe(1);
});

test("moving a seat reseats its guest and leaves the other guests standing in distinct cells",()=>{
  const {run}=game();
  expect(run(`
    homePlace("sofa",10,10);partyInvite([0,1,2]);partyStart();partySync();
    const first=PARTY_M.get(0).G.position.x;
    homeMove(0,14,10);partySync();
    const moved=PARTY_M.get(0).G.position.x-first;
    const standing=[1,2].map(id=>PARTY_M.get(id).G.position);
    ({moved,clear:Math.hypot(standing[0].x-standing[1].x,standing[0].z-standing[1].z)>=1})
  `)).toEqual({moved:2,clear:true});
});

test("the party invitations overlay blocks the garage camera stick",()=>{
  const {g,run}=game();
  const buttons=Array.from({length:16},()=>({pressed:false,value:0}));
  Object.assign(g,{navigator:{getGamepads:()=>[{connected:true,index:0,axes:[0,0,1,0],buttons}]},
    GP:{prev:[],index:null},GO:{stick:[0,0]},HV:{on:false},cuOpen:()=>false,clOverlayOpen:()=>false});
  run(part("cars","function padIn(","// either stick scrolls")+
    part("cars","function pollPad(","addEventListener(\"gamepadconnected\""));
  g.$("party").querySelectorAll=()=>[];
  run('show("party",true);$("gui").inert=true;pollPad()');
  expect(g.GO.stick).toEqual([0,0]);
});
