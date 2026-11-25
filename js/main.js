// Port Meridien: Each frame: the drive update, adaptive resolution, the ?perf panel and the main loop, and the boot that builds the world.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;
// a hint shown at most once every 6 s per kind
const TOAST_AT={};
function toastOnce(k,[t,m]){const now=performance.now();if(TOAST_AT[k]!==undefined&&now-TOAST_AT[k]<6000)return;TOAST_AT[k]=now;toast(t,m,"bad")}
function driveUpdate(dt){
  needsTick(dt);   // your needs fall while you play, whether you drive, walk or sail (js/life.js)
  rideTick(dt);    // a friend with you, following you or riding beside you (js/life.js)
  if(BOAT.on){boatUpdate(dt);return}
  if(FOOT.on){footUpdate(dt);return}
  tickDamage(P,dt);
  const startX=P.x,startZ=P.z;
  const steps=Math.ceil(dt/.017),h=dt/steps;
  for(let i=0;i<steps;i++){stepPlayer(h);collidePlayer()}
  const travelled=Math.hypot(P.x-startX,P.z-startZ);
  if(P.hitT>0||P.damageT>0||!P.onRoad||P.water)skillMetres.driving=0;
  else if(travelled<=150*dt)skillDistance("driving",travelled);
  P.hitT-=dt;
  if(FOOT.stop){footStopTick(dt);if(FOOT.on)return}
  updateTraffic(dt);
  if(ev)updateEvent(dt);
  if(state!=="DRIVE")return;
  if(testDrive){testDrive.t-=dt;if(testDrive.t<=0){testDrive.t=1e9;toast("TEST DRIVE OVER","Taking the car back to the dealer");endTestDrive()}}
  updateStreak(dt);updateRadars(dt);updatePassport();jobTick(dt);if(state!=="DRIVE")return;updateGPS(dt);updatePrompt();gunCar(dt);
  placeCarMesh(dt);showDamageSmoke(pc,P.damage||0,dt);updateCam(dt);updateHUD(dt);drawMini();
  // every visit to the sea gets the same 0.6 s: the count starts again at the reset and whenever the car is out
  // of the water (it used to be left at -1 after a reset, so every later visit took 1.6 s). Nothing moves during
  // the fade, so the reset can't fire twice
  if(P.water){waterT+=dt;if(waterT>.6){waterT=0;toast("BACK ON THE ROAD","The sea is not a road");resetToRoad(true)}}else waterT=0;
}
let prevTs=0,fishT=0,doorOpen=1;
// dynamic resolution: if frames run slow for a couple of seconds, render fewer pixels; when there is headroom
// again, step back up. Steps are small and spaced out so the picture never pumps.
// A level that turned out too slow right after stepping up to it is not retried for 30 s, so a phone on the
// edge doesn't flip back and forth.
const RES={frames:[],elapsed:0,baseline:0,previous:0,retry:0,raiseWait:0,sinceRaise:Infinity};
function resetResolutionSample(){
  RES.frames.length=0;RES.elapsed=0;RES.baseline=0;RES.retry=0;RES.raiseWait=0;RES.sinceRaise=Infinity;
}
function adaptRes(dt){
  if(document.hidden||PR_MIN>=PR_MAX||!(dt>0))return;
  RES.retry=Math.max(0,RES.retry-dt);RES.raiseWait=Math.max(0,RES.raiseWait-dt);RES.sinceRaise+=dt;
  RES.frames.push(dt);RES.elapsed+=Math.min(dt,.25);
  if(RES.elapsed<3||RES.frames.length<8)return;
  RES.frames.sort((a,b)=>a-b);
  const median=RES.frames[Math.floor(RES.frames.length/2)];
  RES.frames.length=0;RES.elapsed=0;
  let next=prNow;
  if(RES.baseline){
    // A cheaper picture should earn its loss of detail. Roll back a fruitless trial.
    if(median>RES.baseline*.95){next=RES.previous;RES.retry=60}
    RES.baseline=0;
  }
  if(next===prNow){
    if(median>1/36&&prNow>PR_MIN&&RES.retry===0){
      RES.previous=prNow;RES.baseline=median;next=Math.max(PR_MIN,prNow-.25);
      RES.raiseWait=RES.sinceRaise<8?30:6;
    }else if(median<1/50&&prNow<PR_MAX&&RES.raiseWait===0){
      next=Math.min(PR_MAX,prNow+.25);RES.sinceRaise=0;
    }
  }
  if(next!==prNow){prNow=next;renderer.setPixelRatio(next);renderer.setSize(W,H,false)}
}
// Measurement panel, shown only with ?perf in the address, for finding what makes a phone slow or its sound break
// up before anything is changed. Frame times (p50/p95/p99 over the last 10 s, the slowest, and how many went over
// 33, 50 and 100 ms since opening), the CPU time of the game's code per frame, split into simulation and the render
// call (the graphics chip's own work runs later and isn't in it), browser long tasks, JS heap, what was drawn,
// render scale, and for sound: its state, the buffer the browser actually gave, Chrome's underrun count where the
// browser reports one, the audio and output clocks against real time (supporting evidence only: a steady clock
// doesn't prove the sound played without a gap), and sound sources active now. Counters a browser doesn't offer
// read n/a.
const PERF={on:/[?&]perf\b/.test(location.search),el:null,t0:0,n:0,ft:[],sim:0,ren:0,simMax:0,renMax:0,
  over:[0,0,0],worst:0,frames:0,lt:0,ltMax:0,ltOk:false,w0:null,a0:0,o0:null,src:0,srcMax:0,made:0,start:performance.now(),res:[]};
if(PERF.on&&window.PerformanceObserver&&(PerformanceObserver.supportedEntryTypes||[]).includes("longtask")){try{new PerformanceObserver(l=>{for(const e of l.getEntries()){PERF.lt++;PERF.ltMax=Math.max(PERF.ltMax,e.duration)}}).observe({type:"longtask",buffered:true});PERF.ltOk=true}catch(e){}}
// counts sound sources: each oscillator or sample started, until it stops
function perfAudio(ctx){if(!PERF.on||!ctx)return;
  for(const k of ["createOscillator","createBufferSource","createConstantSource"]){const f=ctx[k];if(!f)continue;
    ctx[k]=function(){const n=f.apply(this,arguments),st=n.start;PERF.made++;let on=false;
      n.start=function(){if(!on){on=true;PERF.src++;PERF.srcMax=Math.max(PERF.srcMax,PERF.src)}return st.apply(this,arguments)};
      n.addEventListener("ended",()=>{if(on){on=false;PERF.src--}});return n}}}
function perfStart(){return PERF.on?performance.now():0}
function perfEnd(t0,tR,raw){if(!PERF.on)return;const now=performance.now();
  if(!PERF.el){const d=document.createElement("div");d.id="perf";d.style.cssText="position:fixed;left:50%;transform:translateX(-50%);top:36%;z-index:99;pointer-events:none;background:rgba(0,0,0,.75);color:#fff;font:600 10px/1.35 ui-monospace,monospace;padding:4px 7px;border-radius:4px;white-space:pre;text-align:left";document.body.appendChild(d);PERF.el=d;PERF.t0=now}
  const ms=raw*1000;PERF.frames++;PERF.n++;PERF.ft.push([now,ms]);while(PERF.ft.length&&PERF.ft[0][0]<now-10000)PERF.ft.shift();
  if(PERF.frames>30){PERF.worst=Math.max(PERF.worst,ms);if(ms>33)PERF.over[0]++;if(ms>50)PERF.over[1]++;if(ms>100)PERF.over[2]++}
  const sm=tR-t0,rm=now-tR;PERF.sim+=sm;PERF.ren+=rm;PERF.simMax=Math.max(PERF.simMax,sm);PERF.renMax=Math.max(PERF.renMax,rm);
  if(now-PERF.t0<1000)return;
  const span=(now-PERF.t0)/1000,fps=PERF.n/span,last=PERF.ft.map(f=>f[1]).sort((a,b)=>a-b),
    q=f=>last[Math.min(last.length-1,Math.floor(f*last.length))].toFixed(0);
  if(prNow!==PERF.res[PERF.res.length-1])PERF.res.push(prNow);if(PERF.res.length>6)PERF.res.shift();
  const mins=((now-PERF.start)/60000).toFixed(1),mem=performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576)+" MB":"n/a",
    ri=renderer.info,cv=renderer.domElement,ua=navigator.userAgent,os=(/Android [\d.]+/.exec(ua)||/(iPhone|Mac|Windows|Linux)[^;)]*/.exec(ua)||["?"])[0],
    br=(/(Chrome|CriOS|Firefox|Version)\/[\d]+/.exec(ua)||["?"])[0],sha=(/[0-9a-f]{40}/.exec(location.pathname)||["main"])[0].slice(0,7);
  let au="sound: not started (tap first)";
  if(AC){const run=AC.state==="running";
    let ot=null;try{ot=AC.getOutputTimestamp?AC.getOutputTimestamp():null}catch(e){}
    if(!run){PERF.w0=null;PERF.o0=null}else if(PERF.w0===null){PERF.w0=now;PERF.a0=AC.currentTime;if(ot&&ot.performanceTime)PERF.o0=[ot.performanceTime,ot.contextTime]}
    const am=PERF.w0===null?0:(now-PERF.w0)/60000,behind=PERF.w0===null?0:Math.max(0,(now-PERF.w0)-(AC.currentTime-PERF.a0)*1000),
      outB=PERF.o0&&ot&&ot.performanceTime?Math.round((ot.performanceTime-PERF.o0[0])-(ot.contextTime-PERF.o0[1])*1000)+" ms":"n/a",
      ps=AC.playbackStats;
    au="sound "+AC.state+" "+AC.sampleRate+" Hz, buffer "+Math.round((AC.baseLatency||0)*1000)+"+"+Math.round((AC.outputLatency||0)*1000)+" ms"+(/[?&]audio=safe/.test(location.search)?" (larger asked)":"")+"\n"+
      "underruns "+(ps&&ps.underrunEvents!==undefined?ps.underrunEvents+" ("+Math.round((ps.underrunDuration||0)*1000)+" ms)":"n/a")+"\n"+
      "clocks behind, "+am.toFixed(1)+" min: audio "+Math.round(behind)+" ms, output "+outB+"\n"+
      "sources active "+PERF.src+" (most "+PERF.srcMax+"; created in all "+PERF.made+")\n"+
      "fx "+(save.sound?"on":"off")+"\nmusic "+(save.music?musicState():"off")}
  PERF.el.textContent=os+" "+br+"  "+innerWidth+"x"+innerHeight+" @"+(devicePixelRatio||1).toFixed(2)+"  "+sha+"  "+mins+" min\n"+
    fps.toFixed(0)+" fps  frame p50 "+q(.5)+" p95 "+q(.95)+" p99 "+q(.99)+" ms (10 s)\n"+
    "slowest "+Math.round(PERF.worst)+" ms  over 33/50/100 ms: "+PERF.over.join("/")+" of "+PERF.frames+"\n"+
    "CPU/frame: sim "+(PERF.sim/PERF.n).toFixed(1)+" (max "+Math.round(PERF.simMax)+")  render call "+(PERF.ren/PERF.n).toFixed(1)+" (max "+Math.round(PERF.renMax)+") ms\n"+
    "long tasks "+(PERF.ltOk?PERF.lt+" (max "+Math.round(PERF.ltMax)+" ms)":"n/a")+"  heap "+mem+"\n"+
    "draws "+ri.render.calls+"  tris "+Math.round(ri.render.triangles/1000)+"k  textures "+ri.memory.textures+"  geometries "+ri.memory.geometries+"\n"+
    "scale "+prNow.toFixed(2)+" of "+PR_DEV.toFixed(2)+" "+cv.width+"x"+cv.height+" "+["AUTO","SHARP","SMOOTH"][save.gfx]+"\nscale history "+PERF.res.map(x=>x.toFixed(2)).join(" > ")+"\n"+au;
  // the diagnostic switches in use, last
  const sw=[DIAG.scale?"scale held "+DIAG.scale:"",DIAG.shadows?"":"shadows off",DIAG.near?"far near":""].filter(Boolean).join(", ");
  if(sw)PERF.el.textContent+="\nswitches: "+sw;
  PERF.n=PERF.sim=PERF.ren=PERF.simMax=PERF.renMax=0;PERF.t0=now}
// An immediate Photo Mode capture needs the same sky and shadow placement as a frame from the main loop.
function syncRenderView(){
  sky.position.copy(camera.position);stars.position.copy(camera.position);
  const f=state==="DEALER"?SHOW:BOAT.on?BOAT.m.position:FOOT.on?FOOT.m.G.position:pc&&state!=="GARAGE"&&state!=="LOAD"?pc.G.position:gW(0,12);
  sun.position.copy(f).addScaledVector(MOON,220);sun.target.position.copy(f);sun.target.updateMatrixWorld();
}
function frame(ts){
  requestAnimationFrame(frame);
  if(tabIdle){prevTs=ts;return}
  pollPad();
  const raw=(ts-prevTs)/1000||.016,dt=Math.min(.05,raw);prevTs=ts;if(state==="WARDROBE"&&fittingScene){drawFitting(dt);return}adaptRes(raw);const pt0=perfStart();
  // automatic time: an hour every 30 s by day, and the night passes about twice as fast
  if(save.todMode===0&&(state==="DRIVE"||state==="GARAGE"||state==="EXIT"))save.tod=(save.tod+dt/30*(1+1.4*night))%24;
  // photo mode stops the scenery's clocks too (sea, foam, boats, grass, fish, clouds); they carry on from the same
  // point afterwards. Showing and hiding by distance still follows the photo camera
  const wdt=state==="PHOTO"?0:dt;if(state!=="PHOTO")skyClock+=raw;
  applyDayNight();updateLampLights();if(VTL.size)updateVegetation(wdt);if(water)updateSea(wdt);
  fishT+=wdt;
  for(const f of fishes){const ph=fishT*.5+f.ph;f.g.position.copy(gW(12+Math.sin(ph)*7.5,f.zc,f.yc+Math.sin(fishT*.9+f.ph*1.7)*.5));f.g.rotation.y=f.yaw+(Math.cos(ph)>0?0:Math.PI)}
  if(aquaLight)aquaLight.intensity=1.2+Math.sin(fishT*2)*.2;
  const wantOpen=state==="EXIT"?1:0;doorOpen+=(wantOpen-doorOpen)*Math.min(1,dt*1.6);
  if(doorMesh)doorMesh.position.y=gY+3.3+doorOpen*6.3;
  if(state==="GARAGE"||state==="LOAD")garageCam(dt);
  else if(state==="ARRIVAL"){
    syncArrivalClock();
    if(arrivalSince!==null){
      if(arrivalTime>=7.6||matchMedia("(prefers-reduced-motion: reduce)").matches){
        finishArrival();drawFitting(0);return;
      }
      arrivalCamera(arrivalTime);
    }
  }
  else if(state==="EXIT")exitSeq(dt);
  else if(state==="DRIVE")driveUpdate(dt);
  else if(state==="DEALER")dealerCam(dt);
  else if(state==="MAP")drawMap();
  else if(state==="PHOTO")photoFrame(dt);
  netTick(raw);   // playing together: send where I am, move my friends
  syncRenderView();
  const ptR=perfStart();
  if(state!=="MAP")renderer.render(scene,camera);
  perfEnd(pt0,ptR,raw);
}

/* ================================================================ BOOT (built in steps so the loader can update) */
/** @type {[string, () => void][]} */
const STEPS=[
  ["Laying the roads",()=>{buildNetwork();buildRoadGrid();buildGroundGrid()}],
  ["Shaping the terrain",buildTerrain],
  ["Paving",buildRoadMeshes],
  ["Planting pines and palms",buildScenery],
  ["Growing the garrigue",buildVegetation],
  ["Building walls and signs",buildRoadside],
  ["Opening your house",()=>{buildHouse();homeBuild()}],
  ["Stocking the dealership",buildDealer],
  ["Building the harbour",buildHarbour],
  ["Waking the town",()=>{buildPeds();initGun();initKits()}],
  ["Setting up events",()=>{buildEvents();buildGates();buildRadars();buildLandmarks();buildJobs()}],
  ["Filling the roads",()=>{initTraffic();initCops();buildMapImage()}],
  ["Parking your cars",()=>{parkAll(null);carLights()}],
  // The first time a surface is drawn, its picture is sent to the graphics card and its program is built. Left
  // alone, that all lands on the frame the garage door opens. Done here, it is part of the loading bar instead
  ["Warming up",warmUp],
];
// what the warm-up did, for the tests and for anyone checking a slow start: pictures sent, any that failed, and how long it took
const WARM={textures:0,failed:0,ms:0};
function warmUp(){
  const seen=new Set(),t0=performance.now();
  scene.traverse(o=>{for(const m of [].concat(o.material||[]))for(const k in m){const t=m[k];if(t&&t.isTexture&&t.image&&!seen.has(t)){seen.add(t);try{renderer.initTexture(t)}catch(e){WARM.failed++}}}});
  try{renderer.compile(scene,camera)}catch(e){WARM.failed++}
  WARM.textures=seen.size;WARM.ms=Math.round(performance.now()-t0);
  // a failure here is not fatal (the surface is prepared when first drawn instead) but it should not pass unseen
  if(WARM.failed)console.warn("Warm-up: "+WARM.failed+" step(s) failed; the first drive may stutter");
}
let stepI=0;
function boot(){
  if(stepI<STEPS.length){
    const[msg,fn]=STEPS[stepI];$("lmsg").textContent=msg;
    setTimeout(()=>{try{fn()}catch(err){loadFailed("Something went wrong while loading: "+err.message);console.error(err);return}
      stepI++;$("lf").style.width=stepI/STEPS.length*100+"%";boot()},window.__autostart?0:30);
    return;
  }
  layoutHUD();updateMoney();syncPause();applyDayNight();
  gSel=Math.max(0,save.owned.indexOf(save.cur));buildGarageUI();gPick(gSel);
  const g=garageWant();camP.copy(g.pos).add(new V3(0,2,0));camL.copy(g.look);
  $("chCam").textContent="CAM: "+CAMS[camMode];
  requestAnimationFrame(frame);
  // Start the city sequence from a player gesture so the browser can enable sound.
  let entered=false;
  const enter=(openCloud=false)=>{if(entered)return;entered=true;removeEventListener("keydown",onKey,true);
    if(window.__autostart){
      // Existing automated gameplay fixtures begin at the car selector, without the loading bar's pauses between
      // steps or the cover's fade (about 1.2 s on every test's start)
      $("load").style.opacity=0;show("load",false);show("gui",true);setState("GARAGE");
      return;
    }
    firstGesture();
    // Change the camera before fading the cover. Defer one frame so the key that starts
    // the game cannot also skip the arrival or activate a newly focused button.
    requestAnimationFrame(()=>{
      startArrival();if(openCloud===true)clOpen();
      $("load").style.opacity=0;
      setTimeout(()=>show("load",false),600);
    })};
  const onKey=e=>{if(clOverlayOpen()||e.target===$("lcloud")&&(e.key==="Enter"||e.key===" "))return;if(e.key!=="Tab"&&e.key!=="Shift"&&e.key!=="Control"&&e.key!=="Alt"&&e.key!=="Meta")enter()};
  clBoot();
  if(window.__autostart){enter();return}
  $("lmsg").textContent="Ready";$("lf").parentNode.classList.add("hide");
  show("lstart",true);show("lhint",true);$("lstart").onclick=()=>enter();addEventListener("keydown",onKey,true);
  // signed in: PLAY carries on (the backup runs by itself); a guest can choose SAVE MY PROGRESS, which plays and opens it
  clStartScreen(()=>enter(true));
  try{$("lstart").focus({preventScroll:true})}catch(e){}
}
boot();
