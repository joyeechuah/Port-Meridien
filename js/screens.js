// Port Meridien: Game states, the garage, the dealership, menus and prompts, one game tab at a time, and the cloud save.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;
/* ================================================================ STATE */
let state="LOAD",camMode=save.cam,camYaw=0;
const camP=new V3(),camL=new V3();
// the chase camera smooths where it sits relative to the car, not where it is in the world: smoothing a world position
// behind a moving car leaves a lag that depends on each frame's length, so with uneven frames (common on phones, 16 ms
// then 33 ms) the car shook back and forth on screen at speed. camOff/camLOff are the eye's and the look point's offsets
// from the car; camPSet is where the camera was left, so a move by anything else (snapCam, the garage exit) is noticed
const camOff=new V3(),camLOff=new V3(),camPSet=new V3(1e9,0,0),camVel=new V3();
const CAMS=["CHASE","FAR","BUMPER","COCKPIT"];$("chCam").textContent="CAM: "+CAMS[camMode];
let headLight=null,fillLight=null,curId=save.cur,testDrive=null;
// the two street lamps nearest the car shine for real, so the car (not just the road) lights up as it passes under them
const LAMP_LIGHTS=[0,1].map(()=>{const l=new THREE.PointLight(0xffc68a,0,26,1.3);scene.add(l);return l});
const curCar=()=>{const st=STREET.get(curId);return CARS.find(c=>c.id===(st?st.base:curId))||CARS[0]};
function setState(s){if(s==="GARAGE"){gunSync();hintHome()}if(typeof HV!=="undefined"){if(s!=="GARAGE")hvClose();hvShow(s)}if(typeof guestSync==="function")guestSync(s);if(s!=="DRIVE"){workClose();talkClose();FOOT.stop=0}   // a conversation ends with any other screen, the pause menu and Photo Mode too (js/life.js), and so does stopping to get out
  if(s==="GARAGE"||s==="DEALER"||s==="LOAD")rideEnd("home");   // indoors, a friend with you goes on their way
  if(BOAT.on&&(s==="GARAGE"||s==="DEALER"||s==="EXIT"||s==="LOAD"||s==="INTRO"))boatEnd();if(FOOT.on&&(s==="GARAGE"||s==="DEALER"||s==="EXIT"||s==="LOAD"||s==="INTRO"))footEnd();state=s;carIndoors(s==="GARAGE"||s==="DEALER"||s==="LOAD");$("c").style.cursor="default";if(s!=="DRIVE"){promptAct=null;const p=document.getElementById("prompt");if(p)p.classList.add("hide")}}
function show(id,on){$(id).classList.toggle("hide",!on);if(id==="cloud"||id==="cloudPick")syncArrivalClock()}
function hudClock(){const h=Math.floor(save.tod),m=Math.floor((save.tod-h)*60);$("clock").textContent=(h<10?"0":"")+h+":"+(m<10?"0":"")+m}
function hudOn(on){show("hud",on);show("chips",on);show("pads",on&&isTouch)}

/* ---------- player car ---------- */
// The headlight and the fill light exist, switched off, from the moment the world is built. Adding a light later
// makes the graphics card rebuild the program for every lit surface in one go, and that used to happen on the
// first frame after DRIVE: the picture froze there (about a second on a phone, far longer without a graphics card)
function carLights(){
  if(headLight)return;
  headLight=new THREE.SpotLight(0xfff4dc,0,150,.62,.55,1);headLight.target=new THREE.Object3D();fillLight=new THREE.PointLight(0xdfe6ff,0,14,1.4);
  scene.add(headLight);scene.add(headLight.target);scene.add(fillLight);
}
function attachCar(id,temp){
  if(id!==curId){if(pc)showDamageSmoke(pc,0);P.damage=P.damageT=0;repairWarnLevel=0}
  curId=id;if(!temp&&!STREET.has(id))save.cur=id;   // a taken car is never the car the save names as yours (ending a test drive begun in one used to store its made-up id)
  pc=getCar(id);pc.G.visible=true;
  carLights();
  pc.G.add(headLight);pc.G.add(headLight.target);headLight.position.set(0,.7,pc.front_z+.35);headLight.target.position.set(0,-.6,30);
  // behind the car at about its own height, between it and the chase camera: keeps the car readable at
  // night without a glare off the rear window (a light from above lands its highlight right in view)
  pc.G.add(fillLight);fillLight.position.set(0,1.4,-6.5);
}
// the car body's lowest level and the four corners of its underside, in the car's own frame (wheels left out)
function underBox(c){
  const skip=new Set();c.wheels.forEach(w=>(w.parent||w).traverse(o=>skip.add(o)));
  const G=c.G,pos=G.position.clone(),rot=G.rotation.clone();G.position.set(0,0,0);G.rotation.set(0,0,0);G.updateMatrixWorld(true);
  const b=new THREE.Box3(),t=new THREE.Box3();
  G.traverse(o=>{if(!o.isMesh||skip.has(o)||!o.geometry)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();t.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);b.union(t)});
  G.position.copy(pos);G.rotation.copy(rot);G.updateMatrixWorld(true);
  const x=Math.min(-b.min.x,b.max.x)*.97;
  return{y:b.min.y,c:[[-x,b.max.z*.97],[x,b.max.z*.97],[-x,b.min.z*.97],[x,b.min.z*.97],[-x,0],[x,0]]};
}
function placeCarMesh(dt){
  const G=pc.G,vF=speedF(),ch=Math.cos(P.h),sh=Math.sin(P.h),wb=pc.wb||1.45,tr=pc.tr||.92;
  // the ground under each wheel, in the order the wheels were built: (-tr,+wb) (+tr,+wb) (-tr,-wb) (+tr,-wb)
  const W=[[-tr,wb],[tr,wb],[-tr,-wb],[tr,-wb]],h=W.map(([lx,lz])=>surfH(P.x+lx*ch+lz*sh,P.z-lx*sh+lz*ch));
  const front=(h[0]+h[1])/2,rear=(h[2]+h[3])/2,left=(h[1]+h[3])/2,right=(h[0]+h[2])/2;
  // tilt follows the ground but within what a car body would plausibly do
  const slopeF=clamp((front-rear)/(2*wb),-.2,.2),slopeL=clamp((left-right)/(2*tr),-.13,.13);
  // body height: on the plane through the contacts, raised if needed so no wheel ends up in the ground
  let mid=(front+rear)/2;W.forEach(([lx,lz],i)=>{mid=Math.max(mid,h[i]-slopeF*lz-slopeL*(lx>0?1:-1)*tr-.09)});
  P.pitch=lerp(P.pitch,-Math.atan(slopeF)+(kB()&&vF>2?.025:0)+(kG()&&!kB()?-.01:0),Math.min(1,dt*12));
  // side tilt only follows the ground: a lean in bends made the car look lopsided
  P.roll=lerp(P.roll,Math.atan(slopeL),Math.min(1,dt*10));
  // wheels drop or lift a little (suspension travel) to keep touching the ground. Worked out from
  // where the body actually is (its pitch and roll are smoothed), and if a wheel would still end
  // up in the ground the body is lifted by that much.
  // a little extra ride height on the low cars, so their tyres show under the body from the chase camera
  mid+=rideH(pc);
  G.position.set(P.x,mid,P.z);G.rotation.set(P.pitch,P.h,P.roll,"YXZ");G.updateMatrix();
  const me=G.matrix.elements,base=W.map(([lx,lz])=>me[1]*lx+me[9]*lz);   // height of each wheel mount relative to the body origin
  let lift=0;W.forEach((_,i)=>{lift=Math.max(lift,h[i]-(mid+base[i])-.09)});
  // the body's lowest edges keep their normal gap above the road, so a lean in a bend shows as the inner side
  // lifting: the outer side used to drop and close its gap, hiding that side's tyres so the car looked sunk in
  const U=pc.under||(pc.under=underBox(pc));
  for(const[lx,lz] of U.c){const wx=P.x+lx*ch+lz*sh,wz=P.z-lx*sh+lz*ch,y=mid+me[1]*lx+me[5]*U.y+me[9]*lz;
    lift=Math.max(lift,surfH(wx,wz)+Math.max(.02,U.y-.005)-y)}
  if(lift>0){G.position.y=mid+=lift}
  // spinning spokes would strobe at speed: a blurred disc takes over, switching with a dead band so it never flickers
  const om=Math.abs(vF)/pc.wr;if(om>21)pc.blurOn=true;else if(om<15)pc.blurOn=false;
  pc.wheels.forEach((w,i)=>{
    w.rotation.x=(w.rotation.x+vF*dt/pc.wr)%TAU;
    w.parent.position.y=pc.wr+clamp(h[i]-(mid+base[i]),-.28,.09);
    const bl=!!pc.blurOn;if(w.userData.blur&&w.userData.blur.visible!==bl){w.userData.blur.visible=bl;w.userData.spokes.forEach(s=>s.visible=!bl)}
  });
  const d=-P.steer*lerp(.62,.085,Math.pow(clamp(Math.abs(vF)/70,0,1),.6));pc.front.forEach(f=>f.rotation.y=d);
  pc.steerWheel.rotation.z=P.steer*2.2;
  pc.tailM.color.setHex((kB()||P.aBrk)&&vF>.5?0xff3018:night>.3?0xd01800:0x9a0e00);
  headLight.intensity=night*4.6;fillLight.intensity=night*.9;
}
function updateLampLights(){
  const on=night>.02&&pc&&state!=="GARAGE"&&state!=="LOAD"&&state!=="DEALER"&&state!=="EXIT";
  let a=null,b=null,da=1e18,db=1e18;
  if(on){const {x,z}=activePlayer();for(const L of LAMPS){const d=(L.x-x)**2+(L.z-z)**2;if(d<da){db=da;b=a;da=d;a=L}else if(d<db){db=d;b=L}}}
  [[a,da],[b,db]].forEach(([L,d2],i)=>{const l=LAMP_LIGHTS[i];
    if(!on||!L){l.intensity=0;return}
    // fades out before the next lamp takes over, so the light never jumps between poles
    l.position.set(L.x,L.y-.4,L.z);l.intensity=night*1.9*(1-smooth(9,21,Math.sqrt(d2)))});
}
function placeOnRoad(nr,dirSign){
  const ux=nr.dx*dirSign,uz=nr.dz*dirSign,off=RT[nr.e.type].lanes[0]*SIDE();
  P.x=nr.x-uz*off;P.z=nr.z+ux*off;P.h=Math.atan2(ux,uz);P.vx=P.vz=P.vy=0;P.r=0;P.steer=0;P.steerS=0;P.air=false;
  P.ty=surfH(P.x,P.z);P.y=P.ty;P.pitch=0;P.roll=0;streakReset();autoHold=true;
}
// fade to black and run fn in the dark. Meanwhile the game is in state FADE, which takes no input and
// moves nothing, so a key or tap in that half second can't open a menu over it or start something twice
function fadeThen(ms,fn){
  if(tabIdle)return;
  setState("FADE");$("fade").style.opacity=1;
  setTimeout(()=>{if(tabIdle)return;fn();$("fade").style.opacity=0;if(state==="FADE")setState("DRIVE")},ms);
}
function resetToRoad(fade){
  const go=()=>{const nr=nearestRoadGlobal(P.x,P.z,true);if(!nr)return;const f=fwdOf(P.h);placeOnRoad(nr,f.x*nr.dx+f.z*nr.dz>=0?1:-1);
    // a traffic car where you are set down goes elsewhere: you used to land on top of one now and then, and the
    // collision shot you off at up to 8,000 km/h (a test caught it about one time in three)
    // (a police car chasing you only drops back 25 m along its road: sending it far off would be a way to lose it)
    for(const t of TRAFFIC)if(t.e&&Math.abs(t.wx-P.x)<14&&Math.abs(t.wz-P.z)<14){
      if(t.chase){t.s=clamp(t.s-25*t.dir,0,t.e.len);t.v=0;copPose(t,0);continue}
      t.e=null;t.c.G.visible=false;t.wx=t.wz=1e6;t.lost=!spawnTraffic(t,220,560,true)}
    snapCam()};
  if(!fade){go();return}
  fadeThen(420,go);
}
function fastTravel(m){
  workCancel();
  closeMap();
  fadeThen(420,()=>{
    if(RIDE.dest)rideEnd("drop");   // a map jump cannot complete a requested lift
    if(m.act==="home"){goGarage(true);return}
    if(m.act==="event"){const p=edgePos(m.E.route,6);P.x=p.x;P.z=p.z;P.h=Math.atan2(p.dx,p.dz)}
    else{P.x=m.x;P.z=m.z}
    resetToRoad(false);
  });
}

/* ---------- cameras ---------- */
// keep the chase camera out of tree crowns and buildings: when one stands between the car
// and the camera, the camera comes in closer (and a little higher) until it is clear.
// Low walls and guardrails are ignored, the camera is above them.
let camBoom=null,lookingBehind=false;
function boomClear(px,pz,fx,fz,back){
  for(let d=2.2;d<=back+.01;d+=.8){const x=px-fx*d,z=pz-fz*d;let hit=false;
    obstaclesNear(x,z,3.6,o=>{if(hit)return;
      if(o.c){if(o.r>=.36&&Math.hypot(x-o.x,z-o.z)<o.r+2.6)hit=true}
      else if(Math.min(o.hx,o.hz)>=.6){const dx=x-o.x,dz=z-o.z,lx=dx*o.cs-dz*o.sn,lz=dx*o.sn+dz*o.cs;if(Math.abs(lx)<o.hx+.6&&Math.abs(lz)<o.hz+.6)hit=true}});
    if(hit)return Math.max(2.6,d-.8)}
  return back;
}
// lowest the chase camera may sit at (x,z): clear of the road or ground under it (the road can stand
// above the terrain), and high enough that rising ground between it and the car, such as a crest or a
// junction plateau behind the car, does not cut across the view of the car
function camFloor(x,z,p){
  const gnd=(qx,qz)=>Math.max(meshH(qx,qz),surfH(qx,qz));
  let y=gnd(x,z)+1.1;
  for(const f of [.3,.6,.85]){
    const need=gnd(x+(p.x-x)*f,z+(p.z-z)*f)+.5,cy=(need-(p.y+1)*f)/(1-f);   // sight line to 1 m above the car's base
    if(cy>y)y=cy;
  }
  return y;
}
// the chase camera: height above the car, how far ahead it aims and at what height. It sits high enough, and
// aims far enough ahead, that the road and the cars in front show over the roof (it was 2 m up aiming 9 m ahead,
// and the car hid two thirds of the road from 12 to 45 m ahead; now about a third)
const CAMV={up:3.0,ahead:24,lookY:1.2};
function camWant(dt,at){
  const p=at||pc.G.position,v=Math.abs(speedF()),f={x:Math.sin(camYaw),z:Math.cos(camYaw)},big=pc.shape==="suv"?1.2:1;
  const full=(camMode===0?6.6+Math.min(1.6,v*.02):11.5+Math.min(3,v*.04))*big,clear=boomClear(p.x,p.z,f.x,f.z,full);
  // Keep the original 60 Hz response as frame time varies.
  const retain=clear<camBoom?.65:.95;
  camBoom=camBoom===null?clear:lerp(camBoom,clear,1-Math.pow(retain,dt*60));
  const back=Math.min(full,camBoom),up=(camMode===0?CAMV.up:3.8)*big+(full-back)*.18,ah=camMode===0?CAMV.ahead:9;
  return{pos:new V3(p.x-f.x*back,p.y+up,p.z-f.z*back),look:new V3(p.x+f.x*ah,p.y+(camMode===0?CAMV.lookY:1.4)*big,p.z+f.z*ah),fov:(camMode===0?58:60)+Math.min(13,v*.15)};
}
// after a teleport the car mesh only moves on the next frame, so aim from the physics position
function snapCam(){if(!pc)return;camYaw=P.h;camBoom=null;if(camMode<2){const c=camWant(0,new V3(P.x,P.y,P.z));camP.copy(c.pos);camL.copy(c.look)}}
function updateCam(dt){
  const v=Math.abs(speedF());
  const rear=!!(keys.b||pad.rear||GP.rear);
  if(rear!==lookingBehind){
    lookingBehind=rear;$("chRear").setAttribute("aria-pressed",String(rear));
    if(!rear)snapCam();
  }
  if(rear){
    const p=pc.G.position,fx=Math.sin(P.h),fz=Math.cos(P.h);
    const front=boomClear(p.x,p.z,-fx,-fz,5.5),x=p.x+fx*front,z=p.z+fz*front;
    pc.inside.visible=false;pc.glass.visible=pc.shell.visible=true;
    camera.position.set(x,Math.max(p.y+3.2,camFloor(x,z,p)),z);
    camera.lookAt(p.x-fx*18,p.y+1.2,p.z-fz*18);
    camera.fov=64;camera.updateProjectionMatrix();return;
  }
  pc.inside.visible=camMode===3;pc.glass.visible=camMode!==3;pc.shell.visible=camMode!==3;
  if(camMode>=2){
    pc.G.updateMatrixWorld(true);
    const eye=camMode===3?pc.eye.clone():new V3(0,.78,pc.front_z+.05),look=camMode===3?new V3(pc.eye.x,pc.eye.y-.08,40):new V3(0,.72,40);
    camera.position.copy(pc.G.localToWorld(eye));camera.lookAt(pc.G.localToWorld(look));
    camera.fov+=((camMode===3?66:70)+Math.min(12,v*.14)-camera.fov)*(1-Math.exp(-dt*6.3));
  }else{
    camYaw+=wrapA(P.h-camYaw)*(1-Math.exp(-dt*(camMode===0?4.5:3.5)));
    const c=camWant(dt,null),base=pc.G.position;
    if(!camP.equals(camPSet)){camOff.subVectors(camP,base);camLOff.subVectors(camL,base)}
    // the old follow trailed the car by its speed over the follow rate (v/14 for the eye, v/20 for the look point), which
    // pulls the view back as you speed up; that lag is now asked for directly, so the look doesn't change
    camVel.set(P.vx,P.vy||0,P.vz);
    camOff.lerp(c.pos.sub(base).addScaledVector(camVel,-1/14),1-Math.exp(-dt*14));
    camLOff.lerp(c.look.sub(base).addScaledVector(camVel,-1/20),1-Math.exp(-dt*20));
    camP.copy(base).add(camOff);camL.copy(base).add(camLOff);
    camP.y=Math.max(camP.y,camFloor(camP.x,camP.z,pc.G.position));camOff.y=camP.y-base.y;camPSet.copy(camP);
    camera.position.copy(camP);
    if(shake>.01){camera.position.x+=(Math.random()-.5)*shake*.6;camera.position.y+=(Math.random()-.5)*shake*.4}
    // the zoom with speed eases in by time, not by frame (uneven frames made it twitch too)
    camera.lookAt(camL);camera.fov+=(c.fov-camera.fov)*(1-Math.exp(-dt*5));
  }
  camera.updateProjectionMatrix();
  shake*=Math.pow(.02,dt);
}
function cycleCam(){camMode=(camMode+1)%4;save.cam=camMode;persist();$("chCam").textContent="CAM: "+CAMS[camMode];snapCam();toast("CAMERA",CAMS[camMode].toLowerCase())}

/* ---------- paint swatches ---------- */
// each swatch is named for screen readers, and says whether it's the paint on the car
const PAINT_NAMES={0xf1f1ef:"White",0x141518:"Black",0xa9aeb4:"Silver",0x5a6168:"Grey",0xc0141a:"Red",0xe8761a:"Orange",0xf0c419:"Yellow",0x1d4aa8:"Blue",0x2c8ad8:"Light blue",0x0d6b3c:"Green"};
function paintName(col,original){const hex="#"+col.toString(16).padStart(6,"0").toUpperCase();return (PAINT_NAMES[col]||(original?"Original":"Custom"))+" paint"+(PAINT_NAMES[col]?"":" "+hex)}
function swatches(box,current,original,onPick){
  box.innerHTML="";
  const list=[...new Set([current,original,...PAINTS])];
  list.forEach(col=>{
    const b=document.createElement("button"),on=col===current;b.className="swb"+(on?" on":"");
    b.style.background="#"+col.toString(16).padStart(6,"0");b.setAttribute("aria-label",paintName(col,col===original));b.setAttribute("aria-pressed",on?"true":"false");
    b.onclick=()=>{[...box.children].forEach(x=>{x.classList.remove("on");x.setAttribute("aria-pressed","false")});b.classList.add("on");b.setAttribute("aria-pressed","true");onPick(col)};
    box.appendChild(b);
  });
}

/* ================================================================ GARAGE */
let gSel=0,gT=0,exitT=0,exitCurve=null,exitLen=1,exitDoorU=1;
// the garage view turns all the way round the picked car (drag, or a controller's right stick) and moves in and out
// (mouse wheel or pinch); picking another car starts from the usual view again. While you've turned it, the view
// stops its slow sway
const GO={yaw:0,yawS:0,pitch:0,zoom:1,user:false,spin:false,ptr:new Map(),last:null,pinch:null,moved:0,stick:[0,0]};
const GO_STICK=2.4;   // radians (and pitch units) per second with the right stick all the way
const GO_P=[-1.9,3.2],GO_Z=[.55,1.6];
// SPIN on or off, with its button (style and aria-pressed) kept in step wherever it changes: the button, a drag,
// a view button, opening, closing or picking another car
function goSpin(on){GO.spin=!!on;if(on)GO.user=true;const b=$("cuSpin");if(b){b.classList.toggle("on",GO.spin);b.setAttribute("aria-pressed",String(GO.spin))}}
// fingers or a mouse button held on the view: forgotten when the garage view changes hands (open, close, pick)
function goRelease(){for(const id of GO.ptr.keys()){try{$("c").releasePointerCapture(id)}catch(_){}}GO.ptr.clear();GO.pinch=null;GO.last=null}
function goReset(){GO.yaw=GO.yawS=0;GO.pitch=0;GO.zoom=1;GO.user=false;goSpin(false);goRelease()}
// while customising, the car stands on its own in the open part of the garage (the bays are near walls, the stairs
// and the other cars, which got in the way of the side and rear views), and goes back to its bay after
const GO_STAGE=[-10,13,.35];
function goStage(on){const c=getCar(save.owned[gSel]);if(!c)return;
  if(on){const[x,z,y]=GO_STAGE;c.G.position.copy(gW(x,z));c.G.rotation.set(0,gYaw+Math.PI+y,0)}else parkCar(c,gSel);
  const p=c.G.position;selRing.position.set(p.x,gY+.03,p.z);selSpot.position.set(p.x,gY+8.8,p.z).addScaledVector(gOut,1);selSpot.target.position.copy(p)}
// the usual view looks at the car's front three-quarter; these turn the view to look straight at a side of it
const GO_VIEWS={front:.16,side:Math.PI/2+.16,rear:Math.PI+.16};
function goView(v){goSpin(false);if(v==="reset"){const y=GO.yawS;goReset();GO.yawS=y;GO.yaw=Math.round((y-0)/(Math.PI*2))*Math.PI*2;GO.user=true;return}
  const t=GO_VIEWS[v],k=Math.round((GO.yawS-t)/(Math.PI*2));GO.yaw=t+k*Math.PI*2;GO.pitch=v==="side"?-.4:0;GO.user=true}
const goRay=new THREE.Raycaster();
const dots=$("gdots");
function buildGarageUI(){
  dots.innerHTML="";
  save.owned.forEach((id,i)=>{const c=carById(id),d=document.createElement("button");d.className="gdot"+(i===gSel?" on":"");d.setAttribute("aria-label",c.mk+" "+c.md);d.onclick=()=>gPick(i);dots.appendChild(d)});
  $("gcount").textContent=save.owned.length+"/"+GARAGE_CAP+" CARS";
  const won=CUPS.filter(C=>save.champ[C.cls]&&save.champ[C.cls].won).map(C=>C.cls);$("gcups").textContent=won.length?" · CUPS WON: "+won.join(" "):"";
  restSync();   // REST, at home (js/life.js)
}
function statBars(c,p){
  $(p+"1").style.width="0";$(p+"2").style.width="0";$(p+"3").style.width="0";
  requestAnimationFrame(()=>requestAnimationFrame(()=>{$(p+"1").style.width=c.top/440*100+"%";$(p+"2").style.width=c.acc*100+"%";$(p+"3").style.width=c.grip*100+"%"}));
}
function carText(c,p){
  $(p+"mk").textContent=c.mk;$(p+"md").textContent=c.md;$(p+"yr").innerHTML=`<span class="cls">${c.cls}</span>${c.yr} · ${({super:"Supercar",gt:"Coupé",hatch:"Hatchback",muscle:"Muscle car",roadster:"Roadster",suv:"SUV"})[c.shape]}`;
}
function gPick(i){
  goReset();
  gSel=clamp(i,0,save.owned.length-1);const id=save.owned[gSel],c=carById(id);
  carText(c,"g");
  $("v1").textContent=c.top+" km/h";$("v2").textContent=Math.round(c.acc*10)+" / 10";$("v3").textContent=Math.round(c.grip*10)+" / 10";
  statBars(c,"f");
  swatches($("gSw"),paintOf(id),c.body,col=>{save.paint[id]=col;getCar(id).paint(col);if(showMeshes[id])showMeshes[id].paint(col);persist()});
  [...dots.children].forEach((d,k)=>{d.classList.toggle("on",k===gSel);d.setAttribute("aria-pressed",String(k===gSel))});
  const s=SPOTS[gSel],p=gW(s[0],s[1]);selRing.position.set(p.x,gY+.03,p.z);
  selSpot.position.copy(gW(s[0],s[1]+1,8.8));selSpot.target.position.copy(p);
}
function garageWant(){
  if(HV.on)return hvCam();   // designing your home (js/homeview.js): over the mezzanine
  const car=getCar(save.owned[gSel]).G,h=car.rotation.y,fw=new V3(Math.sin(h),0,Math.cos(h)),sd=new V3(-fw.z,0,fw.x),big=getCar(save.owned[gSel]).shape==="suv"?1.15:1;
  const o=fw.clone().multiplyScalar(7.4).addScaledVector(sd,1.2+(GO.user?0:Math.sin(gT*.35)*1.3)).applyAxisAngle(new V3(0,1,0),GO.yawS).multiplyScalar(big*GO.zoom);
  const centre=car.position.clone().setY(gY+.9*big),look=centre.clone(),w={pos:car.position.clone().add(o).setY(gY+Math.max(.35,(3.1+GO.pitch)*big*GO.zoom)),look};
  // while customising, the view moves so the car sits clear of the panel: left of it on a wide screen, above it on a narrow one
  if(cuOpen()){const r=new V3().subVectors(w.look,w.pos).normalize(),right=new V3(-r.z,0,r.x).normalize();
    if(W>640)w.look.addScaledVector(right,1.9*big);else{w.look.y-=1.6*big;w.pos.addScaledVector(r,-1.5)}}
  // then, turned towards a wall, the mezzanine or the stairs, the camera comes in along its line to the car so it stays
  // inside the room (this used to run before the panel shift, which could push it back out through a wall)
  if((GO.user||cuOpen())&&HOUSE_MESHES.length){const d=new V3().subVectors(w.pos,centre),L=d.length();goRay.set(centre,d.normalize());goRay.far=L+.4;
    const h=goRay.intersectObjects(HOUSE_MESHES,false)[0];if(h&&h.distance<L+.4)w.pos.copy(centre).addScaledVector(d,Math.max(1.6,h.distance-.4))}
  return w;
}
function garageCam(dt){
  gT+=dt;
  // the view goes round the car along a circle (a straight line from front to back would pass through it)
  if(GO.stick[0]||GO.stick[1]){GO.yaw-=GO.stick[0]*GO_STICK*dt;GO.pitch=clamp(GO.pitch+GO.stick[1]*GO_STICK*dt,GO_P[0],GO_P[1]);GO.user=true;if(GO.spin)goSpin(false)}
  if(GO.spin)GO.yaw+=dt*.4;GO.yawS+=(GO.yaw-GO.yawS)*(1-Math.exp(-dt*6));const g=garageWant();
  camP.lerp(g.pos,1-Math.exp(-dt*4));camL.lerp(g.look,1-Math.exp(-dt*6));
  camera.position.copy(camP);camera.lookAt(camL);camera.fov+=(50-camera.fov)*.06;camera.updateProjectionMatrix();
  selRing.material.opacity=.6+Math.sin(gT*3)*.25;selRing.visible=!HV.on;
}
/* ---------- customise: options for the car picked in the garage, seen on the car as you choose, paid on APPLY ---------- */
let cuId=null,cuBase=null,cuDraft=null;
const CU_ORDER=["fin","roof","rim","rimC","cal","wing","exh","exhC","exhS","liv","livC","num","tint","plate"],CU_SW={rimC:MOD_RIMC,cal:MOD_CAL,livC:MOD_LIVC};
const cuOpen=()=>cuId!==null;
function custOpen(){
  if(state!=="GARAGE"||cuOpen())return;
  cuId=save.owned[gSel];cuBase=modsOf(cuId);cuDraft=Object.assign({},cuBase);
  const c=carById(cuId);$("cuCar").textContent=(c.mk+" "+c.md).toUpperCase();
  $("gui").classList.add("cust-on");show("cust",true);custRender();
  // the other parked cars step out of the picture while you look round this one
  for(const o of save.owned)if(o!==cuId&&carMeshes[o])carMeshes[o].G.visible=false;
  goRelease();goSpin(false);goStage(true);
}
function custRender(){
  const L=$("cuList"),d=cuDraft,top=L.scrollTop;L.innerHTML="";
  for(const k of CU_ORDER){
    const O=MOD_OPTS[k];if((k==="livC"||k==="num")&&!(d.liv>0))continue;if(k==="num"&&d.liv!==3)continue;
    const sec=document.createElement("div");sec.className="cus";sec.dataset.k=k;
    const changed=k==="plate"||k==="num"||k==="livC"?false:d[k]!==cuBase[k];
    sec.innerHTML='<div class="cl"><span>'+O.n+"</span><b>"+(O.p?(changed?"+"+fmtCr(O.p)+" CR":fmtCr(O.p)+" CR"):"")+"</b></div>";
    const row=document.createElement("div");row.className="cos";sec.appendChild(row);
    if(k==="num"){const mk=(t,dv)=>{const b=document.createElement("button");b.className="co";b.textContent=t;b.setAttribute("aria-label",dv<0?"Lower number":"Higher number");
        b.onclick=()=>{d.num=(d.num-1+dv+99)%99+1;custChange()};return b};
      const v=document.createElement("span");v.className="num";v.textContent=d.num;row.append(mk("\u2212",-1),v,mk("+",1))}
    else if(k==="plate"){const i=document.createElement("input");i.id="cuPlate";i.maxLength=8;i.value=d.plate;i.setAttribute("aria-label","Number plate text");i.autocomplete="off";i.spellcheck=false;
      // committed without drawing the list again: the field loses focus because another option was clicked, and
      // rebuilding the list then removed that button before its click arrived (the first click did nothing)
      i.onchange=()=>{if(cuPlateCommit()){custFooter();rebuildCar(cuId,cuDraft)}};row.appendChild(i)}
    else O.o.forEach((name,i)=>{const b=document.createElement("button"),on=d[k]===i,sw=CU_SW[k];
      if(sw&&sw[i]!==null){b.className="swb"+(on?" on":"");b.style.background="#"+sw[i].toString(16).padStart(6,"0")}else{b.className="co"+(on?" on":"");b.textContent=name}
      b.setAttribute("aria-label",O.n.toLowerCase()+": "+name.toLowerCase());b.setAttribute("aria-pressed",on?"true":"false");
      b.onclick=()=>{d[k]=i;custChange()};row.appendChild(b)});
    L.appendChild(sec)}
  L.scrollTop=top;custFooter()}
// the total, the message and APPLY, from the draft
function custFooter(){const d=cuDraft,cost=modCost(cuBase,d),short=cost>save.cr;
  $("cuTotal").textContent=cost?fmtCr(cost)+" CR":"NO CHANGES";
  $("cuMsg").textContent=short?"Not enough credits: you have "+fmtCr(save.cr)+" CR":"";
  $("cuApply").disabled=short;$("cuApply").textContent=cost?"APPLY":"DONE";
}
function custChange(){custRender();rebuildCar(cuId,cuDraft)}
// the plate field's text into the draft (uppercase letters, digits and spaces, up to 8; empty is the stock plate). Runs
// when the field is committed, and before APPLY by any route: a controller's A applied while the field still had focus
// and the typed text was lost. True if the draft changed
function cuPlateCommit(){const i=$("cuPlate");if(!i||!cuDraft)return false;const v=i.value.toUpperCase().replace(/[^A-Z0-9 ]/g,"").slice(0,8),p=v.trim()?v:MOD_STOCK.plate;
  if(p===cuDraft.plate)return false;cuDraft.plate=p;return true}
// only what differs from stock is kept (a livery's colour and number only with the livery)
function modsCompact(d){const o={};for(const k in MOD_STOCK)if(d[k]!==MOD_STOCK[k])o[k]=d[k];if(!(d.liv>0)){delete o.livC;delete o.num}else if(d.liv!==3)delete o.num;return o}
function custClose(apply){
  if(!cuOpen())return;const id=cuId;
  if(apply){if(cuPlateCommit())custRender();const cost=modCost(cuBase,cuDraft);if(cost>save.cr)return;
    const m=modsCompact(cuDraft);if(Object.keys(m).length)save.mods[id]=m;else delete save.mods[id];
    if(cost>0){earn(-cost);toast("CUSTOMISED","Paid "+fmtCr(cost)+" CR")}else persist()}
  cuId=null;show("cust",false);$("gui").classList.remove("cust-on");rebuildCar(id);goStage(false);
  save.owned.forEach((o,i)=>{if(carMeshes[o]&&i<SPOTS.length)carMeshes[o].G.visible=true});goSpin(false);goRelease();
}
$("gCust").onclick=custOpen;
document.querySelectorAll("#cuViews [data-v]").forEach(b=>b.onclick=()=>goView(b.dataset.v));
$("cuSpin").onclick=()=>goSpin(!GO.spin);
$("cuMin").onclick=()=>{const m=$("cust").classList.toggle("mini");$("cuMin").innerHTML=m?"&#9652;":"&#9662;";$("cuMin").setAttribute("aria-pressed",String(m));$("cuMin").setAttribute("aria-label",m?"Make the panel bigger":"Make the panel smaller")};$("cuApply").onclick=()=>custClose(true);$("cuCancel").onclick=()=>custClose(false);
function goGarage(fromFade){
  // every way home goes through here, so one check closes them all while the police are after you (the repair
  // screen's RETURN HOME used to get round the pause menu's)
  if(WANTED.lvl){wantedBlock();return false}
  workCancel();
  const doIt=()=>{
    const repaired=(testDrive?testDrive.damage:P.damage)>0;
    endEvent();if(testDrive)finishTestDrive(false);streetReset();if(repaired){wantEvent("repair");skillAward("handiness",15)}
    P.damage=P.damageT=0;repairWarnLevel=0;if(pc)showDamageSmoke(pc,0);
    // going home ends a contract; the garage hides the HUD, so the message waits for the next drive
    if(job&&jobEnd("abandoned"))jobNotices.push(["CONTRACT ABANDONED","You went home, so it ended without a reward"]);
    setState("GARAGE");audioOn(false);
    if(pc){pc.inside.visible=false;pc.glass.visible=true;pc.shell.visible=true}
    parkAll(null);gSel=Math.max(0,save.owned.indexOf(save.cur));buildGarageUI();gPick(gSel);
    hudOn(false);show("gui",true);show("pause",false);show("dealer",false);show("map",false);
    selRing.visible=true;selSpot.intensity=1.1;
    const g=garageWant();camP.copy(g.pos);camL.copy(g.look);
    $("fade").style.opacity=0;persist();
  };
  if(fromFade)doIt();else fadeThen(450,doIt);
}
function gunSync(){const b=$("gGun");b.textContent=save.armed?"PISTOL: TAKING IT":"PISTOL: LEFT HERE";b.setAttribute("aria-pressed",save.armed?"true":"false")}
$("gGun").onclick=()=>{if(state!=="GARAGE")return;save.armed=!save.armed;persist();gunSync()};
function prepareDrive(){
  audioInit();audioOn(true);
  GUN.ammo=save.armed?GUN.max:0;HEALTH.hp=HEALTH.max;
  attachCar(save.owned[gSel]);persist();
  show("gui",false);selRing.visible=false;selSpot.intensity=0;
}
function goDrive(){
  if(state!=="GARAGE")return;
  prepareDrive();setState("EXIT");exitT=0;
  const s=SPOTS[gSel];
  const way=s[1]>18?[gW(s[0],16.5),gW(0,15),gW(0,7)]:[gW(s[0]*.45,4.2)];
  exitCurve=new THREE.CatmullRomCurve3([pc.G.position.clone(),...way,gW(0,.6),gW(0,-8),gW(.5,-16)],false,"centripetal");
  exitLen=exitCurve.getLength();
  // where along the path the car passes the door: from there on it rides on the driveway, which climbs
  const door=gW(0,.6);let bd=1e9;for(let i=0;i<=200;i++){const q=exitCurve.getPointAt(i/200),d=Math.hypot(q.x-door.x,q.z-door.z);if(d<bd){bd=d;exitDoorU=i/200}}
}
function exitSeq(dt){
  exitT+=dt;const dur=3.2+exitLen/40,u=Math.min(1,exitT/dur),e=.35*u+.65*u*u;
  const p=exitCurve.getPointAt(Math.min(.999,e)),tg=exitCurve.getTangentAt(Math.min(.999,e));
  // past the door the car follows the driveway's height and slope instead of the flat garage floor
  const w=smooth(exitDoorU,Math.min(1,exitDoorU+.08),e),fl=Math.hypot(tg.x,tg.z)||1,fx=tg.x/fl,fz=tg.z/fl;
  let pitch=0;
  if(w>0){p.y=lerp(p.y,surfH(p.x,p.z)+rideH(pc),w);pitch=-Math.atan(clamp((surfH(p.x+fx*1.4,p.z+fz*1.4)-surfH(p.x-fx*1.4,p.z-fz*1.4))/2.8,-.2,.2))*w}
  pc.G.position.copy(p);pc.G.rotation.set(pitch,pc.G.rotation.y+wrapA(Math.atan2(tg.x,tg.z)-pc.G.rotation.y)*Math.min(1,dt*9),0,"YXZ");
  for(const w of pc.wheels)w.rotation.x+=exitLen*(.35+1.3*u)/dur*dt/pc.wr;
  const back=new V3(tg.x,0,tg.z).normalize();
  camP.lerp(p.clone().addScaledVector(back,-7).setY(p.y+2.3),1-Math.exp(-dt*(1.5+u*6)));
  camL.lerp(p.clone().addScaledVector(back,4).setY(p.y+1.2),1-Math.exp(-dt*8));
  camera.position.copy(camP);camera.lookAt(camL);camera.fov+=(60-camera.fov)*.04;camera.updateProjectionMatrix();
  audioUpd(.2+u*.4,1,1,0);
  if(u>=1){
    const h=pc.G.rotation.y,v=exitLen*1.65/dur;
    Object.assign(P,{x:p.x,z:p.z,h,vx:Math.sin(h)*v,vz:Math.cos(h)*v,vy:0,r:0,steer:0,steerS:0,air:false,pitch,roll:0});
    P.ty=surfH(p.x,p.z);P.y=P.ty;camYaw=h;
    beginFreeRide();
  }
}

function beginFreeRide(){
  setState("DRIVE");hudOn(true);updateMoney();
  keyHints(false);$("keys").style.opacity=1;setTimeout(()=>$("keys").style.opacity=0,10000);
  for(const t of TRAFFIC)if(!t.cop||t.patrol)spawnTraffic(t,60,600,false);   // police cars beyond the two patrols wait until they are called
  toast("FREE RIDE",isTouch?"Explore Port Meridien. Tap MAP to plan a route.":"Explore Port Meridien. Press M for the map.");
  while(jobNotices.length){const[t,s]=jobNotices.shift();toast(t,s,"bad")}
}

// A harbour establishing shot cuts to a crane descending along the player's street.
let arrivalTime=0,arrivalSince=null;
// Count foreground viewing time even when the GPU takes seconds to draw a frame.
// Settle the clock at pause boundaries so a hidden tab or a cloud dialog costs no intro time.
function syncArrivalClock(){
  if(state!=="ARRIVAL")return;
  const now=performance.now();
  if(arrivalSince!==null)arrivalTime+=(now-arrivalSince)/1000;
  arrivalSince=document.hidden||clOverlayOpen()?null:now;
}
document.addEventListener("visibilitychange",syncArrivalClock);
function arrivalCamera(t){
  if(t<3.4){
    const u=smooth(0,3.4,t),shore=PIER.x1-18;
    camera.position.set(shore+135-56*u,62-24*u,92-27*u);
    camera.lookAt(shore-14-18*u,4,0);
  }else{
    const u=smooth(3.4,7.6,t),back=lerp(52,9,u),side=lerp(3,1.5,u);
    const fx=Math.sin(P.h),fz=Math.cos(P.h);
    camera.position.set(P.x-fx*back+fz*side,P.y+lerp(28,3.1,u),P.z-fz*back-fx*side);
    camera.lookAt(P.x+fx*4,P.y+1.1,P.z+fz*4);
  }
  camera.fov=56;camera.updateProjectionMatrix();
}
function startArrival(){
  prepareDrive();
  const x=680,road=nearestRoadGlobal(x,avenueZ(x),true);
  placeOnRoad(road,road.dx>=0?1:-1);placeCarMesh(0);
  arrivalTime=0;arrivalSince=null;setState("ARRIVAL");syncArrivalClock();arrivalCamera(0);show("arrival",true);
  if(!clOverlayOpen())$("arrivalSkip").focus({preventScroll:true});
}
function finishArrival(){
  if(state!=="ARRIVAL"||tabIdle||clOverlayOpen())return;
  show("arrival",false);clearInput();setState("WARDROBE");show("wardrobe",true);
  openFitting();
}
let fittingScene,fittingCamera,lookIndex=0,backView=false;
function openFitting(){
  const m=footModel();
  fittingScene=new THREE.Scene();fittingScene.background=new THREE.Color(0xb2c9bd);
  fittingCamera=new THREE.OrthographicCamera(-2,2,2,-2,.1,30);
  fittingScene.add(new THREE.HemisphereLight(0xfff4df,0xb99d97,1.15));
  const key=new THREE.DirectionalLight(0xffe1ca,1.15);key.position.set(-3,5,4);fittingScene.add(key);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.08,48),new THREE.MeshStandardMaterial({color:0x738f89}));
  floor.position.y=-.045;fittingScene.add(floor);
  // Sunset disc with horizontal bands behind the fitting platform.
  const sunDisc=new THREE.Mesh(new THREE.CircleGeometry(1.48,64),new THREE.MeshBasicMaterial({color:0xffccaa}));
  sunDisc.position.set(-.32,1.42,-2.5);fittingScene.add(sunDisc);
  for(let i=0;i<5;i++){
    const slat=new THREE.Mesh(new THREE.BoxGeometry(4,.016+i*.014,.02),new THREE.MeshBasicMaterial({color:0xb2c9bd}));
    slat.position.set(-.32,.82-i*.13,-2.47);fittingScene.add(slat);
  }
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:0x586e68}));
  shadow.rotation.x=-Math.PI/2;shadow.scale.set(.28,.15,1);shadow.position.y=.001;fittingScene.add(shadow);
  fittingScene.add(m.G);m.G.position.set(0,0,0);m.G.visible=true;backView=false;
  const list=$("wardLooks");list.replaceChildren();
  OUTFITS.forEach((o,i)=>{
    const b=document.createElement("button");
    b.innerHTML='<i aria-hidden="true"></i><span><strong></strong><em></em></span>';
    b.style.setProperty("--sw","#"+o.shirt.toString(16).padStart(6,"0"));
    b.querySelector("strong").textContent=o.name;b.querySelector("em").textContent=o.detail;
    b.onclick=()=>selectLook(i);list.appendChild(b);
  });
  // Let one knee relax and one shoulder fall back in the mirror. Walking sets
  // the limb rotations from its own gait when this model returns to the street.
  m.legs[0].rotation.x=-.065;m.legs[1].rotation.x=.035;
  m.knees[0].rotation.x=.12;m.knees[1].rotation.x=.045;
  m.arms[0].rotation.x=.085;m.arms[1].rotation.x=-.055;
  m.elbows[0].rotation.x=-.19;m.elbows[1].rotation.x=-.29;
  selectLook(OUTFITS.findIndex(o=>o.id===save.outfit));
  list.children[lookIndex].focus({preventScroll:true});
}
function selectLook(i){
  lookIndex=(i+OUTFITS.length)%OUTFITS.length;
  Array.from($("wardLooks").children).forEach((b,j)=>b.setAttribute("aria-pressed",String(j===lookIndex)));
  FOOT.m.dress(OUTFITS[lookIndex]);
}
function moveLook(step){selectLook(lookIndex+step);$("wardLooks").children[lookIndex].focus({preventScroll:true})}
function drawFitting(dt){
  if(FOOT.m.face)faceBlink(FOOT.m.face,dt);
  const r=$("fitting").getBoundingClientRect(),button=$("wardTurn").getBoundingClientRect();
  const h=Math.max(80,button.top-r.top),unit=2.04/h,x=r.left+r.width/2,y=r.top+h/2;
  const c=fittingCamera;c.left=-x*unit;c.right=(innerWidth-x)*unit;c.top=y*unit;c.bottom=-(innerHeight-y)*unit;
  c.position.set(.25,1.15,4);c.lookAt(0,.87,0);c.updateProjectionMatrix();
  FOOT.m.G.rotation.y=backView?Math.PI+.24:.24;renderer.render(fittingScene,c);
}
function wearOutfit(){
  if(state!=="WARDROBE"||tabIdle||clOverlayOpen())return;
  save.outfit=OUTFITS[lookIndex].id;persist();
  const m=FOOT.m;m.G.visible=false;scene.add(m.G);
  fittingScene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});
  fittingScene=fittingCamera=null;show("wardrobe",false);clearInput();snapCam();updateCam(1);beginFreeRide();
}
$("arrivalSkip").onclick=finishArrival;
$("wardTurn").onclick=()=>{backView=!backView};
$("wardWear").onclick=wearOutfit;

/* ================================================================ DEALERSHIP */
let dSel=0,dAng=0,dPaint=0;
function openDealer(selId){
  if(WANTED.lvl){wantedBlock();return}
  setState("DEALER");hudOn(false);show("dealer",true);audioOn(false);
  dSel=selId?CARS.findIndex(c=>c.id===selId):CARS.findIndex(c=>!save.owned.includes(c.id));if(dSel<0)dSel=0;
  const list=$("dList");list.innerHTML="";
  CARS.forEach((c,i)=>{const b=document.createElement("button");b.className="di";b.innerHTML=`<span class="cls">${c.cls}</span><span class="nm"></span><span class="pr num"></span>`;
    b.querySelector(".nm").textContent=c.mk+" "+c.md;b.onclick=()=>dPick(i);list.appendChild(b)});
  dPick(dSel);updateMoney();
}
function dPick(i){
  dSel=(i+CARS.length)%CARS.length;const c=CARS[dSel],own=save.owned.includes(c.id),full=save.owned.length>=GARAGE_CAP;
  [...$("dList").children].forEach((b,k)=>{b.classList.toggle("on",k===dSel);const pr=b.querySelector(".pr"),cc=CARS[k];const o=save.owned.includes(cc.id);pr.textContent=o?"OWNED":fmtCr(cc.price);pr.classList.toggle("own",o)});
  for(const id in showMeshes)showMeshes[id].G.visible=false;
  const m=getShowCar(c.id);m.G.visible=true;dPaint=paintOf(c.id);m.paint(dPaint);
  carText(c,"d");
  $("dv1").textContent=c.top+" km/h";$("dv2").textContent=Math.round(c.acc*10)+" / 10";$("dv3").textContent=Math.round(c.grip*10)+" / 10";statBars(c,"df");
  swatches($("dSw"),dPaint,c.body,col=>{dPaint=col;m.paint(col);if(own){save.paint[c.id]=col;getCar(c.id).paint(col);persist()}});
  const sellPrice=Math.round(c.price*.6/100)*100;
  $("dPrice").textContent=own?"In your garage":fmtCr(c.price)+" CR";
  $("dNote").textContent=own?(c.id===curId?"You are driving this car":"Sells for "+fmtCr(sellPrice)+" CR"):(save.cr>=c.price?(full?"Your garage is full":"Delivered to your house after purchase"):"You need "+fmtCr(c.price-save.cr)+" more CR");
  $("dCap").textContent="Garage "+save.owned.length+"/"+GARAGE_CAP+(full&&!own?" · sell a car to make room":"");
  show("dBuy",!own);$("dBuy").disabled=save.cr<c.price||full;
  show("dDrive",own&&c.id!==curId);
  show("dTest",!own);$("dTest").disabled=!!job;if(job&&!own)$("dCap").textContent+=" · no test drives during a contract";
  show("dSell",own&&c.id!==curId&&save.owned.length>1);
  [...$("dList").children][dSel].scrollIntoView({block:"nearest",inline:"nearest"});
}
function dealerCam(dt){
  dAng+=dt*.18;podium.rotation.y+=dt*.25;
  const big=CARS[dSel].shape==="suv"?1.12:1;
  camera.position.set(SHOW.x+Math.sin(dAng)*8.6*big,SHOW.y+2.3*big,SHOW.z+Math.cos(dAng)*8.6*big);camera.lookAt(SHOW.x,SHOW.y+.8,SHOW.z);
  camera.fov+=(48-camera.fov)*.1;camera.updateProjectionMatrix();
}
$("dBuy").onclick=()=>{const c=CARS[dSel];if(save.cr<c.price||save.owned.includes(c.id)||save.owned.length>=GARAGE_CAP)return;
  save.owned.push(c.id);save.paint[c.id]=dPaint;earn(-c.price);getCar(c.id).paint(dPaint);parkAll(curId);
  toast("PURCHASED",c.mk+" "+c.md+" is in your garage","gold");dPick(dSel)};
$("dDrive").onclick=()=>{const c=CARS[dSel];if(!save.owned.includes(c.id))return;
  attachCar(c.id);parkAll(c.id);persist();dPick(dSel);toast("CAR SWAPPED",c.mk+" "+c.md)};
$("dSell").onclick=()=>{const c=CARS[dSel];if(!save.owned.includes(c.id)||c.id===curId||save.owned.length<2)return;delete save.mods[c.id];
  // its models go too: kept, they still wore the old upgrades when you looked at it, test-drove it or bought it back
  for(const M of [carMeshes,showMeshes])if(M[c.id]){disposeHeroCar(M[c.id]);delete M[c.id]}
  // the sale's credits without driver XP: earn() counts every credit earned as XP, so buying and selling cars over
  // and over used to raise your level
  const v=Math.round(c.price*.6/100)*100;save.owned=save.owned.filter(id=>id!==c.id);if(save.cur===c.id)save.cur=save.owned[0];save.cr+=v;updateMoney();persist();parkAll(curId);
  toast("SOLD",c.mk+" "+c.md+" · +"+fmtCr(v)+" CR","gold");dPick(dSel)};
$("dTest").onclick=()=>startTestDrive(CARS[dSel].id);
$("dExit").onclick=closeDealer;
function leaveDealerOnRoad(){
  const nr=nearestRoadGlobal(DEALER_MARK.x,DEALER_MARK.z,true);placeOnRoad(nr,1);
}
function closeDealer(){
  show("dealer",false);leaveDealerOnRoad();
  setState("DRIVE");hudOn(true);audioOn(true);snapCam();updateMoney();
}

/* ---------- test drives: 90 s in any car from the dealership ---------- */
function startTestDrive(id){
  if(WORK.active||save.owned.includes(id))return;
  testDrive={id,prev:curId,t:90,paint:dPaint,damage:P.damage||0};
  if(pc)pc.G.visible=false;   // your own car waits at the dealer
  getCar(id).paint(dPaint);
  attachCar(id,true);
  show("dealer",false);leaveDealerOnRoad();
  setState("DRIVE");hudOn(true);show("tdPill",true);audioOn(true);snapCam();
  toast("TEST DRIVE",carById(id).md+" · 90 seconds, then it goes back to the dealer");
}
function finishTestDrive(backToDealer){
  const td=testDrive;if(!td)return;testDrive=null;
  show("tdPill",false);
  if(!save.owned.includes(td.id))getCar(td.id).G.visible=false;
  attachCar(td.prev);
  P.damage=td.damage||0;repairWarnLevel=damageWarnTier(P.damage);showDamageSmoke(pc,P.damage);
  if(backToDealer)openDealer(td.id);
}
function endTestDrive(){
  if(!testDrive)return;
  show("pause",false);
  fadeThen(450,()=>finishTestDrive(true));
}

/* ================================================================ MENUS + PROMPTS */
let promptAct=null;
function updatePrompt(){
  let best=null,bd=1e9;
  if(!ev&&kphNow()<38){
    const hm=gW(0,-8),c=[];
    // the dealer sits back from the street: 24 m reaches it from the road, where map travel drops you
    if(testDrive)c.push({x:DEALER_MARK.x,z:DEALER_MARK.z,r:24,t:"Return the test car",a:endTestDrive});
    else{
      c.push({x:hm.x,z:hm.z,r:11,t:"Enter your house · change car"+(job?" · ends your contract":""),a:()=>goGarage(false)},{x:DEALER_MARK.x,z:DEALER_MARK.z,r:24,t:"Enter Auto Gallery · buy or test drive",a:()=>openDealer()});
      // during a contract a race waits: the prompt says so instead of opening the race
      for(const E of EVENTS)c.push({x:E.x,z:E.z,r:14,t:(E.type==="tt"?"Time trial: ":"Race: ")+E.name+(job?" · after your contract":""),a:()=>{if(job)toast("FINISH YOUR CONTRACT FIRST","Or abandon it in the pause menu to race","bad");else openIntro(E)}});
    }
    for(const o of c){const d=Math.hypot(P.x-o.x,P.z-o.z);if(d<o.r&&d<bd){bd=d;best=o}}
    // the police are after you: nowhere to hide indoors, and no racing
    if(best&&WANTED.lvl&&!testDrive)best={t:"Lose the police first",a:wantedBlock};
    // stopped with a friend aboard (js/life.js): let them out here
    if(!best)best=ridePrompt();
  }
  promptAct=best?best.a:null;show("prompt",!!best);if(best)$("promptTxt").textContent=best.t;
}
$("prompt").onclick=()=>{if(state==="DRIVE"&&promptAct)promptAct()};
// The repair screen uses PAUSE so the car stays still and the menu cannot charge credits while driving.
// Damage is session-only. Credits are saved only after the player confirms a roadside repair.
/* ---------- first-time hints: once on each device, as each newer part of life comes into reach (kept apart from the
   save, so they're neither progress nor a setting the account carries) ---------- */
const HINT_KEY=SAVE_KEY+"-hints",HINT_TEXT={
  home:["NEW AT HOME","DESIGN HOME furnishes your mezzanine. Friends you invite over wait there."],
  you:["YOU","SKILLS has your skills and aspirations; NEEDS, your wants and mood."],
  friends:["FRIENDS",isTouch?"Ask a friend along for a ride, or over to your place.":"Ask a friend along for a ride (7), or over to your place (8)."],
  kitchen:["KITCHEN CAREER","Shifts and Cooking take you from Dishwasher to Head chef, with better pay at each rank."]};
const HINTS=(()=>{try{const h=JSON.parse(localStorage.getItem(HINT_KEY)||"{}");return h&&typeof h==="object"&&!Array.isArray(h)?h:{}}catch(e){return {}}})();
function hint(id){
  if(window.__noHints||tabIdle||HINTS[id]||!HINT_TEXT[id])return false;
  HINTS[id]=1;try{localStorage.setItem(HINT_KEY,JSON.stringify(HINTS))}catch(e){}
  toast(HINT_TEXT[id][0],HINT_TEXT[id][1]);return true;
}
// home's: a moment after the garage opens, unless something else is on screen (then the next time)
function hintHome(){setTimeout(()=>{if(state==="GARAGE"&&!document.querySelector(".ov:not(.hide)"))hint("home")},1500)}
let repairConfirm=false,repairReturnPause=false;
const damagePct=()=>Math.ceil(Math.max(0,P.damage||0));
const repairPrice=()=>Math.round((1000+20*damagePct())*skillFactor("handiness")*(hasTrait("gearhead")?.9:1));
function repairBlocked(){
  if(!damagePct())return "Your vehicle has no damage.";
  if(testDrive)return "Repair your own car after the test drive ends.";
  if(ev)return "Roadside repairs are unavailable during a race or time trial.";
  if(Math.hypot(P.vx||0,P.vz||0)>.55)return "Stop the vehicle before requesting a roadside repair.";
  if(save.cr<repairPrice())return "Not enough credits. Returning home repairs the car for free.";
  return "";
}
function repairPanel(){
  const damage=damagePct(),price=repairPrice(),blocked=repairBlocked();
  $("repairTitle").textContent="DAMAGE "+damage+"%";
  $("repairFill").style.width=damage+"%";
  $("repairFill").style.background=damage>=90?"#e2483d":damage>=60?"#f2b33d":"#a4c8b0";
  $("repairDetails").textContent=damage?"Engine power reduced by "+Math.round((1-damagePower(P))*100)+"%. The vehicle remains drivable.":"Your vehicle is fully repaired.";
  // the rule, what it comes to, and the Handiness and Gearhead discounts on it, so the sum agrees with the price on the button
  const base=1000+20*damage,off=Math.round((1-skillFactor("handiness"))*100),
    cuts=[off>0?off+"% for your Handiness":"",hasTrait("gearhead")?"10% as a Gearhead":""].filter(Boolean);
  $("repairHint").textContent=testDrive?"End this test drive to return to your own vehicle.":"Garage repairs are FREE. Roadside repairs cost 1,000 + 20 credits per damage percentage point"+
    (damage?": "+fmtCr(base)+" CR"+(cuts.length?", less "+cuts.join(" and ")+": "+fmtCr(price)+" CR.":"."):".");
  $("repairHome").disabled=!!testDrive||!!WANTED.lvl;
  $("repairHome").textContent=WANTED.lvl?"RETURN HOME · LOSE THE POLICE FIRST":job?"RETURN HOME · END CONTRACT · REPAIR FREE":ev?"RETURN HOME · END RACE · REPAIR FREE":"RETURN HOME · REPAIR FREE";
  if(blocked)repairConfirm=false;
  $("repairNow").disabled=!!blocked;
  $("repairNow").textContent=repairConfirm?"CONFIRM SPEND "+fmtCr(price)+" CR":"ROADSIDE REPAIR · "+fmtCr(price)+" CR";
  $("repairRule").textContent=blocked||(repairConfirm?"Confirm to spend credits and repair now.":"Stay stopped to repair here. Credits are deducted only after confirmation.");
  $("repairClose").textContent=repairReturnPause?"BACK TO PAUSE":"RESUME DRIVING";
}
function openRepair(){
  if(tabIdle||state!=="DRIVE"&&state!=="PAUSE")return;
  repairReturnPause=state==="PAUSE";repairConfirm=false;
  if(!repairReturnPause)pauseOn();
  show("pause",false);show("repair",true);repairPanel();
  $("repairClose").focus({preventScroll:true});
}
function closeRepair(){
  if($("repair").classList.contains("hide"))return;
  repairConfirm=false;show("repair",false);
  if(tabIdle)return;
  if(repairReturnPause)show("pause",true);
  else pauseOff();
}
$("damageHud").onclick=openRepair;$("pRepair").onclick=openRepair;$("repairClose").onclick=closeRepair;
$("repairHome").onclick=()=>{
  if(tabIdle||state!=="PAUSE"||$("repair").classList.contains("hide")||testDrive)return;
  if(WANTED.lvl){wantedBlock();repairPanel();return}
  repairConfirm=false;show("repair",false);goGarage(false);
};
$("repairNow").onclick=()=>{
  if(tabIdle||state!=="PAUSE"||$("repair").classList.contains("hide"))return;
  if(repairBlocked()){repairPanel();return}
  if(!repairConfirm){repairConfirm=true;repairPanel();return}
  const price=repairPrice();
  if(price>save.cr||repairBlocked()){repairPanel();return}
  wantEvent("repair");skillAward("handiness",15);save.cr-=price;P.damage=P.damageT=0;repairWarnLevel=0;
  if(pc)showDamageSmoke(pc,0);
  persist();updateMoney();repairConfirm=false;
  show("repair",false);
  if(repairReturnPause)show("pause",true);else pauseOff();
  show("damageHud",false);
  toast("VEHICLE REPAIRED","Roadside repair: -"+fmtCr(price)+" CR","gold");
};
function pauseOn(){if(state!=="DRIVE")return;setState("PAUSE");clearInput();audioOn(false);
  $("pTitle").textContent=ev?ev.E.name:testDrive?"Test drive · "+carById(testDrive.id).md:job?"Contract · "+job.def.title:"Free ride";
  $("pHome").textContent=job?"GO HOME · ENDS CONTRACT":"GO HOME · REPAIR FREE";
  $("pRepair").textContent="VEHICLE CONDITION · "+damagePct()+"%";$("pNeeds").textContent=needsLabel();
  show("pQuit",!!(ev||testDrive));$("pQuit").textContent=testDrive?"END TEST DRIVE":ev&&ev.fin?"SEE RESULT":"QUIT EVENT";show("pHome",!testDrive);
  syncPause();$("pFb").classList.toggle("wide",[...document.querySelectorAll("#pause .mbtn")].filter(b=>b.id!=="pRes"&&!b.classList.contains("hide")).length%2===1);$("pause").inert=false;show("pause",true);hint("you")}
// what builds each skill, and what each level of it gives (its rate from SKILL_RATE, as a percentage)
const SKILL_TEXT={driving:["Clean road driving and races","race prizes","+"],cooking:["Kitchen shifts and home snacks","shift pay","+"],
  charisma:["Talking to people","friendship from kind words","+"],fitness:["Walking and running","slower tiring on foot",""],
  photography:["Photos, up to five a day","landmark rewards","+"],handiness:["Repairing real damage","off roadside repairs",""]};
let traitDraft=[];
function traitsRender(){
  const box=$("skTraits");box.replaceChildren();
  const locked=save.traits.day>=Math.floor(Date.now()/86400000);
  for(const [id,[name,effect]] of Object.entries(TRAITS)){
    // a card each: the name, and what it does under it; a chosen one in the accent colour
    const b=document.createElement("button"),on=traitDraft.includes(id),n=document.createElement("b"),e=document.createElement("small");
    b.className="trt"+(on?" on":"");n.textContent=name;e.textContent=effect;b.append(n,e);
    b.setAttribute("aria-label",name+". "+effect);b.setAttribute("aria-pressed",String(on));b.disabled=locked||!on&&traitDraft.length>=2;
    b.onclick=()=>{traitDraft=on?traitDraft.filter(t=>t!==id):traitDraft.concat(id);traitsRender();
      $("skTraits").querySelectorAll("button")[Object.keys(TRAITS).indexOf(id)].focus()};
    box.appendChild(b);
  }
  const apply=$("skTraitsApply");apply.disabled=locked||traitDraft.slice().sort().join()===save.traits.ids.slice().sort().join();
  apply.textContent=locked?"CHANGE TOMORROW":"APPLY TRAITS";
}
$("skTraitsApply").onclick=()=>{if(traitsApply(traitDraft))skillsOpen()};
function skillsOpen(){
  if(state!=="PAUSE")return;
  traitDraft=save.traits.ids.slice();traitsRender();
  const rows=$("skRows");rows.replaceChildren();
  for(const k of Object.keys(SKILL_RATE)){
    const level=skillLevel(k),lo=skillThreshold(level),next=skillThreshold(Math.min(10,level+1)),xp=save.skills[k],
      [how,gives,sign]=SKILL_TEXT[k],name=k[0].toUpperCase()+k.slice(1),pct=level===10?100:Math.round((xp-lo)/(next-lo)*100);
    const row=document.createElement("div"),label=document.createElement("span"),bar=document.createElement("div"),
      fill=document.createElement("i"),num=document.createElement("b"),note=document.createElement("small");
    row.className="skr";label.className="ndl";label.textContent=name;
    bar.className="ndb";bar.setAttribute("role","progressbar");bar.setAttribute("aria-label",name+" level "+level);
    bar.setAttribute("aria-valuemin","0");bar.setAttribute("aria-valuemax","100");bar.setAttribute("aria-valuenow",String(pct));
    fill.style.width=pct+"%";bar.appendChild(fill);
    num.className="num"+(level===10?" top":"");num.textContent="LV "+level;
    note.textContent=(k==="photography"&&hasTrait("shutterbug")?"Photos, up to six a day":how)+(level?" · "+sign+Math.round(Math.abs(SKILL_RATE[k])*level*100)+"% "+gives:"")+
      (level===10?" · top level":" · "+(next-xp)+" XP to level "+(level+1));
    row.append(label,bar,num,note);rows.appendChild(row);
  }
  if(typeof aspireRender==="function")aspireRender();
  $("pause").inert=true;show("skills",true);$("skClose").focus();
}
function skillsClose(){show("skills",false);$("pause").inert=false;$("pSkills").focus()}
$("pSkills").onclick=skillsOpen;$("skClose").onclick=skillsClose;
function pauseOff(){show("pause",false);if(state==="PAUSE"){setState("DRIVE");audioOn(true);TILT.zero=TILT.phi}}
/** @type {[string, number|null][]} */
const TODS=[["AUTO",null],["MORNING",8.5],["NOON",13],["SUNSET",17.75],["NIGHT",22.5]];
const VIOL=["LOW","STANDARD","STRONG"];
function syncPause(){$("pViol").textContent="VIOLENCE: "+VIOL[save.violence];$("pFlash").textContent="FLASHES: "+(save.flash?"ON":"OFF");$("pAssist").textContent="DRIVING ASSIST: "+(save.assist?"ON":"OFF");$("pTime").textContent="TIME OF DAY: "+TODS[save.todMode][0];$("pAuto").textContent="AUTO GAS: "+(save.auto?"ON":"OFF");$("pSnd").textContent="SOUND FX: "+(save.sound?"ON":"OFF");$("pMus").textContent=$("gMus").textContent="MUSIC: "+(save.music?"ON":"OFF");$("pGfx").textContent="GRAPHICS: "+["AUTO","SHARP","SMOOTH"][save.gfx];$("pGhost").textContent="GHOST CAR: "+(save.ghostOn?"ON":"OFF");$("pSteer").textContent="STEERING: "+["LOW","NORMAL","HIGH"][save.steer];$("pTilt").textContent="TILT STEERING: "+(save.tilt?"ON":"OFF");show("pTilt",isTouch);$("pSide").textContent="DRIVE ON: "+(save.side==="R"?"RIGHT":"LEFT")}
$("pRes").onclick=pauseOff;
$("pMap").onclick=()=>{show("pause",false);setState("DRIVE");openMap()};
$("pQuit").onclick=()=>{if(testDrive){endTestDrive();return}if(ev&&ev.fin){pauseOff();showResult();return}endEvent();pauseOff();toast("EVENT CANCELLED","Back to free ride")};
$("pHome").onclick=()=>{if(WANTED.lvl){wantedBlock();return}show("pause",false);goGarage(false)};   // (goGarage checks too; this keeps the menu open)
$("pTime").onclick=()=>{save.todMode=(save.todMode+1)%TODS.length;CAR_ENV.dirty=true;if(TODS[save.todMode][1]!==null)save.tod=TODS[save.todMode][1];syncPause();persist()};
$("pAuto").onclick=()=>{save.auto=!save.auto;syncPause();persist()};
const GFX=["AUTO","SHARP","SMOOTH"];
function applyGfx(){gfxLimits();const p=clamp(save.gfx===0?Math.max(prNow,PR_MIN):PR_MAX,PR_MIN,PR_MAX);resetResolutionSample();
  if(p!==prNow){prNow=p;renderer.setPixelRatio(p);renderer.setSize(W,H,false)}}
$("pGfx").onclick=()=>{save.gfx=(save.gfx+1)%3;applyGfx();rebuildCarModels();syncPause();persist();toast("GRAPHICS: "+GFX[save.gfx],["Sharp, eases off a little if frames slow down","Always full sharpness","Lighter on weak phones and battery"][save.gfx])};
$("pAssist").onclick=()=>{save.assist=!save.assist;syncPause();persist()};
// which side traffic keeps to; the cars on the road move over to it straight away
$("pSide").onclick=()=>{save.side=save.side==="R"?"L":"R";for(const t of TRAFFIC)if(t.e){const ln=RT[t.e.type].lanes;t.off=ln[Math.min(t.lane,ln.length-1)]*SIDE();t.offCur=t.off;t.passT=0}
  syncPause();persist();toast("DRIVE ON THE "+(save.side==="R"?"RIGHT":"LEFT"),"Traffic keeps to the "+(save.side==="R"?"right":"left")+(ev?" · the race's grid changes from the next start":""))};
$("pSteer").onclick=()=>{save.steer=(save.steer+1)%3;syncPause();persist()};
// iPhones only send tilt after the player allows it, which must be asked from a tap
$("pTilt").onclick=()=>{
  if(save.tilt){save.tilt=false;syncPause();persist();return}
  const on=()=>{save.tilt=true;TILT.zero=TILT.phi;syncPause();persist();toast("TILT STEERING","Hold the phone the way you want to drive straight, then resume")};
  // requestPermission only exists in Safari on iPhones and iPads
  const D=/** @type {any} */ (window.DeviceOrientationEvent);
  if(D&&typeof D.requestPermission==="function")D.requestPermission().then(r=>{if(r==="granted")on();else toast("TILT NOT ALLOWED","Allow motion and orientation access to steer by tilting","bad")}).catch(()=>toast("TILT NOT ALLOWED","Allow motion and orientation access to steer by tilting","bad"));
  else on()};
// off: no muzzle flash, and no red flash at the screen edges when you are hit (only a steady tint while health is low)
$("pFlash").onclick=()=>{save.flash=!save.flash;syncPause();persist()};
$("pViol").onclick=()=>{save.violence=(save.violence+1)%3;syncPause();persist();toast("VIOLENCE: "+VIOL[save.violence],["Nobody falls: someone hit stands still a moment","People hit fall and stay down, no blood","People hit fall and stay down, and bleed"][save.violence])};
$("pGhost").onclick=()=>{save.ghostOn=!save.ghostOn;syncPause();persist();if(!save.ghostOn)ghostHide()};
$("pSnd").onclick=()=>{save.sound=!save.sound;if(save.sound)audioInit();syncPause();persist()};
$("pMus").onclick=$("gMus").onclick=()=>{save.music=!save.music;audioInit();musicInit();syncPause();persist()};
const mapKey=$("mapKey");
mapKey.onclick=()=>{mapKey.setAttribute("aria-expanded",String(mapKey.getAttribute("aria-expanded")!=="true"));show("mapPop",false)};
function openMap(){if(state!=="DRIVE")return;mapKey.setAttribute("aria-expanded","false");setState("MAP");clearInput();audioOn(false);show("map",true);show("mapPop",false);MV.z=1;MV.cx=0;MV.cz=0}
function closeMap(){if(state!=="MAP")return;
  // A release after reopening belongs to the old visit and must not set a waypoint.
  for(const id of mptr.keys()){if(mapc.hasPointerCapture(id))mapc.releasePointerCapture(id)}
  mptr.clear();mDrag=mPinch=null;
  show("map",false);setState("DRIVE");audioOn(true)
}
$("mapClose").onclick=closeMap;$("chMap").onclick=openMap;$("chCam").onclick=cycleCam;$("chFoot").onclick=()=>footExit();$("chPause").onclick=pauseOn;
const rearButton=$("chRear");
rearButton.addEventListener("pointerdown",e=>{
  if(e.button!==0||state!=="DRIVE")return;
  rearButton.setPointerCapture(e.pointerId);pad.rear=true;
});
["pointerup","pointercancel","lostpointercapture","blur"].forEach(type=>rearButton.addEventListener(type,()=>{pad.rear=false}));
function rearButtonKey(e){
  if(e.key!==" "&&e.key!=="Enter")return;
  e.preventDefault();e.stopPropagation();pad.rear=e.type==="keydown";
}
rearButton.addEventListener("keydown",rearButtonKey);rearButton.addEventListener("keyup",rearButtonKey);
// each acts once: a second click or key press while the first is under way does nothing
$("iGo").onclick=()=>{if(state!=="INTRO")return;show("intro",false);const c=introCup;fadeThen(420,()=>{startEvent(introE,c);audioOn(true)})};
$("iNo").onclick=()=>{if(state!=="INTRO")return;show("intro",false);setState("DRIVE");audioOn(true)};
$("rOk").onclick=()=>{if(state!=="RESULT")return;show("result",false);setState("DRIVE");audioOn(true)};
$("rNext").onclick=()=>{if(state!=="RESULT"||!resNext)return;const n=resNext;resNext=null;show("result",false);setState("DRIVE");cupStart(n.cls)};
$("drive").onclick=goDrive;$("gprev").onclick=()=>gPick((gSel-1+save.owned.length)%save.owned.length);$("gnext").onclick=()=>gPick((gSel+1)%save.owned.length);

/* ---------- input wiring ---------- */
// Safari zooms on a pinch (its own gesture events) and on a double tap even where touch-action says not to, on some
// versions: both are stopped here, and so is a two-finger move (an iPad still zoomed in on one with the gesture
// events alone). A second tap on a button within 0.3 s still presses it.
// Once the page IS zoomed in, all of this steps aside: stopping the pinch also stopped the pinch back out, so an iPad
// stayed zoomed in whatever you did
let pageZoomed=false;
for(const t of ["gesturestart","gesturechange"])document.addEventListener(t,e=>{if(!pageZoomed)e.preventDefault()});
document.addEventListener("touchmove",e=>{if(!pageZoomed&&e.touches.length>1&&e.cancelable)e.preventDefault()},{passive:false});
// (not when the two "taps" are the two fingers of a pinch lifting one after the other: that pressed a paint colour
// under the second finger)
let lastTapEnd=0,twoDown=false;
document.addEventListener("touchstart",e=>{twoDown=e.touches.length>1},{passive:true});
document.addEventListener("touchend",e=>{const now=performance.now();
  if(!pageZoomed&&e.cancelable&&now-lastTapEnd<300&&e.changedTouches.length===1&&!e.target.closest("#pzList,#jbList,#cpList,#dList,#cuList")){e.preventDefault();const b=e.target.closest("button,a");if(b&&!twoDown)b.click()}
  lastTapEnd=now},{passive:false});
// if the page is zoomed in anyway, a button at the top left of what's on screen zooms back out, and pinching works too.
// A page can't set the browser's zoom directly: writing the viewport tag again with its scale fixed at 1 makes Safari
// go back to 1, and the tag is then put back as it was
let resettingZoom=false;
function zoomReset(){if(resettingZoom)return;resettingZoom=true;const m=document.querySelector('meta[name="viewport"]'),was=m.content;
  m.content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";
  setTimeout(()=>{m.content=was;resettingZoom=false},300)}
if(window.visualViewport){const vv=visualViewport,z=$("zoomed"),fit=()=>{const on=vv.scale>1.05,was=pageZoomed;pageZoomed=on;
    document.documentElement.classList.toggle("zoomed",on);show("zoomed",on);
    if(on){z.style.transform=`translate(${vv.offsetLeft}px,${vv.offsetTop}px) scale(${1/vv.scale})`;if(!was)zoomReset()}};
  vv.addEventListener("resize",fit);vv.addEventListener("scroll",fit);z.onclick=zoomReset;fit()}
addEventListener("blur",()=>{clearInput();if(state==="DRIVE"&&!window.__autostart)pauseOn()});
document.addEventListener("visibilitychange",()=>{if(document.hidden){clearInput();if(state==="DRIVE")pauseOn()}});
// a button reached with Tab belongs to the keyboard user: Enter presses it and does nothing else. Focus that
// arrives after a click or tap (the last input was the pointer) came from the pointer, and a later key press
// doesn't change that; focus that arrives after a key (Tab), or before any input at all, is the keyboard's
let lastPtrT=-1,lastKeyT=0,kbFocusEl=null;
addEventListener("pointerdown",()=>{lastPtrT=performance.now()},true);
addEventListener("keydown",()=>{lastKeyT=performance.now()},true);
document.addEventListener("focusin",e=>{kbFocusEl=lastKeyT>=lastPtrT?e.target:null},true);
function kbFocusedButton(){const el=document.activeElement;return !!el&&el===kbFocusEl&&(el.tagName==="BUTTON"||el.tagName==="A")}
addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if(tabIdle)return;
  // the cloud save's screens stand over everything, repairs included: their keys come first (Escape over repairs used to
  // close repairs and drive on, with the cloud's choice still on screen)
  if(clOverlayOpen()){if(k==="escape"&&!e.repeat)clEscape();return}
  if(!$("repair").classList.contains("hide")){if((k==="escape"||k==="p")&&!e.repeat){e.preventDefault();closeRepair()}return}
  // typing in a text field (the number plate) isn't driving or a shortcut; Enter or Escape leaves the field. Sliders (photo
  // mode's zoom and distance) keep the shortcuts: they used to swallow Escape, V, R and Enter while they had focus
  const tg=e.target;if(tg&&tg.tagName==="INPUT"&&tg.type!=="range"){if(k==="enter"||k==="escape")tg.blur();return}
  // a focused slider keeps its own arrow, Home, End and Page keys (they moved the photo camera and the slider stood still)
  if(tg&&tg.tagName==="INPUT"&&tg.type==="range"&&/^(arrow(up|down|left|right)|home|end|pageup|pagedown)$/.test(k))return;
  if(workKey(e,k))return;
  if(state==="ARRIVAL"){if(["escape","enter"," "].includes(k)){e.preventDefault();if(!e.repeat)finishArrival()}return}
  if(state==="WARDROBE"){
    if(e.repeat&&(k==="enter"||k===" ")){e.preventDefault();return}
    if(k==="arrowleft"||k==="arrowright"){
      e.preventDefault();moveLook(k==="arrowright"?1:-1);
    }
    return;
  }
  if(cuOpen()){if(k==="escape"&&!e.repeat)custClose(false);return}
  // Space is the handbrake while driving, focused button or not (a stray Tab mustn't turn it into a map or pause
  // key mid-race; Enter presses a Tab-focused button there). Anywhere else Space presses the focused button, as on
  // any page, and isn't recorded as a held handbrake
  if(k===" "&&state!=="DRIVE"&&document.activeElement&&document.activeElement.tagName==="BUTTON")return;
  keys[k]=true;
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)&&state!=="DEALER")e.preventDefault();
  // otherwise Enter is the game's own key: a button the mouse clicked earlier keeps focus, and without this
  // Enter would press it as well (CAM switching camera while starting a race, NEXT changing the garage pick)
  if(k==="enter"){if(kbFocusedButton())return;e.preventDefault()}
  if(e.repeat)return;
  // talking to someone (js/life.js): its keys come first
  if(state==="DRIVE"&&talkKey(k))return;
  if(state==="DRIVE"){
    if(k==="escape"||k==="p")pauseOn();else if(k==="m")openMap();else if(k==="c"){if(!FOOT.on&&!BOAT.on)cycleCam()}else if(k==="v")photoEnter();
    else if(k==="e"||k==="enter"){if(promptAct)promptAct()}
    else if(k==="f"){if(FOOT.on||BOAT.on){if(promptAct)promptAct()}else footExit()}
    else if(k==="r"&&!ev&&!FOOT.on&&!BOAT.on)resetToRoad(true);
  }else if(!$("passport").classList.contains("hide")){if(k==="escape")passportClose()}
  else if(!$("jobs").classList.contains("hide")){if(k==="escape")jobsClose()}
  else if(!$("play").classList.contains("hide")){if(k==="escape")netClose()}
  else if(!$("cups").classList.contains("hide")){if(k==="escape")cupsClose()}
  else if(!$("skills").classList.contains("hide")){if(k==="escape")skillsClose()}
  else if(!$("needs").classList.contains("hide")){if(k==="escape")needsClose()}
  else if(state==="PAUSE"){if(k==="escape"||k==="p")pauseOff();else if(k==="v")photoEnter()}
  else if(state==="PHOTO"){
    if(!$("phShot").classList.contains("hide")){if(k==="escape")photoShotClose()}
    else if(k==="escape"||k==="v")photoExit();else if(k==="enter")photoCapture();else if(k==="r")photoReset();else if(k>="1"&&k<="4"&&k.length===1)photoLookSet(+k-1)}
  else if(state==="MAP"){if(k==="escape"&&mapKey.offsetWidth&&mapKey.getAttribute("aria-expanded")==="true"){mapKey.click();mapKey.focus()}else if(k==="escape"||k==="m")closeMap();else if(k==="+"||k==="=")$("mapIn").onclick();else if(k==="-")$("mapOut").onclick()}
  else if(state==="GARAGE"){if(k==="arrowleft"||k==="a")$("gprev").onclick();else if(k==="arrowright"||k==="d")$("gnext").onclick();else if(k==="enter")goDrive()}
  else if(state==="DEALER"){if(k==="arrowup"||k==="arrowleft"){e.preventDefault();dPick(dSel-1)}else if(k==="arrowdown"||k==="arrowright"){e.preventDefault();dPick(dSel+1)}else if(k==="escape")closeDealer()}
  else if(state==="INTRO"){if(k==="enter")$("iGo").onclick();else if(k==="escape")$("iNo").onclick();else if(k==="arrowleft"||k==="a")setDiff(save.diff-1);else if(k==="arrowright"||k==="d")setDiff(save.diff+1)}
  else if(state==="RESULT"){if(k==="enter"||k==="escape")$("rOk").onclick()}
});
addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});
// the pedals, and the two steering pads, each work as one strip: a thumb can roll from BRAKE onto GAS (or from left
// to right) without lifting, and with two fingers down the one that landed or moved there last counts. Before, a
// press stayed with the button it started on, and BRAKE held by one finger beat GAS pressed by another, so pulling
// away after braking could do nothing, or reverse
for(const grp of [[["bL","L"],["bR","R"]],[["bG","G"],["bB","B"]],[["bH","H"]],[["bF","F"]]]){
  const els=grp.map(([id,k])=>({el:$(id),k})),own=new Map();PAD_OWN.push(own);
  const keyAt=(x,y)=>{let best=null,bd=1e9;for(const o of els){const r=o.el.getBoundingClientRect(),d=Math.hypot(Math.max(r.left-x,0,x-r.right),Math.max(r.top-y,0,y-r.bottom));if(d<bd){bd=d;best=o.k}}return best};
  const sync=()=>{let top=null;for(const v of own.values())if(!top||v.t>top.t)top=v;for(const o of els){const on=!!top&&top.k===o.k;pad[o.k]=on;o.el.classList.toggle("on",on)}};
  for(const o of els){
    o.el.addEventListener("pointerdown",e=>{e.preventDefault();try{o.el.setPointerCapture(e.pointerId)}catch(_){}own.set(e.pointerId,{k:o.k,t:performance.now()});sync()});
    o.el.addEventListener("pointermove",e=>{const v=own.get(e.pointerId);if(!v||els.length<2)return;const k=keyAt(e.clientX,e.clientY);if(k!==v.k){v.k=k;v.t=performance.now();sync()}});
    const off=e=>{if(own.delete(e.pointerId))sync()};
    ["pointerup","pointercancel","lostpointercapture"].forEach(ev=>o.el.addEventListener(ev,off));
    o.el.addEventListener("contextmenu",e=>e.preventDefault());
  }
}
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function hitSlot(cx,cy){ndc.x=cx/W*2-1;ndc.y=-(cy/H)*2+1;ray.setFromCamera(ndc,camera);const h=ray.intersectObjects(pickers,false).filter(x=>x.object.userData.slot<save.owned.length);return h.length?h[0].object.userData.slot:-1}
// dragging the garage view (a short drag still counts as a tap on a car)
const cv=$("c");
function goPinchStart(){
  const pair=[...GO.ptr.entries()];if(pair.length<2){GO.pinch=null;return}
  const[[ia,a],[ib,b]]=pair;GO.pinch={ia,ib,d:Math.max(8,Math.hypot(a.x-b.x,a.y-b.y)),z:GO.zoom};
}
// the view keeps the finger or mouse it started with even when it slides off the canvas or over the panel
// (pointer capture), and lets go of it however the press ends: lifted, cancelled by the browser, or capture lost
const goDown=e=>{if(state!=="GARAGE")return;try{cv.setPointerCapture(e.pointerId)}catch(_){}GO.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});if(GO.ptr.size===1)GO.moved=0;
  if(GO.ptr.size===1)GO.last={id:e.pointerId,x:e.clientX,y:e.clientY};else if(!GO.pinch)goPinchStart()};
cv.addEventListener("pointerdown",goDown);
// The car's name and figures cover the bottom of the screen (two fifths of a phone held upright). A finger that lands
// there, away from its buttons, turns and zooms the view too: pinching out starts with the fingers apart, one of them
// usually down there, and the view then only turned, so a phone could zoom in but not back out. It never counts as
// a tap on a car behind the bar. With a finger already on the view, a second one anywhere on the garage screen
// (a button included) is the other half of a pinch, and doesn't press what it landed on
$("gui").addEventListener("pointerdown",e=>{const btn=e.target.closest("button,a,input");
  if(GO.ptr.size?e.pointerType!=="touch":btn||!e.target.closest("#gbar"))return;
  goDown(e);GO.moved=Math.max(GO.moved,7)});
cv.addEventListener("pointermove",e=>{if(state!=="GARAGE"||!GO.ptr.has(e.pointerId))return;const p=GO.ptr.get(e.pointerId);GO.moved+=Math.abs(e.clientX-p.x)+Math.abs(e.clientY-p.y);p.x=e.clientX;p.y=e.clientY;
  if(GO.pinch){const a=GO.ptr.get(GO.pinch.ia),b=GO.ptr.get(GO.pinch.ib);GO.zoom=clamp(GO.pinch.z*GO.pinch.d/Math.max(8,Math.hypot(a.x-b.x,a.y-b.y)),GO_Z[0],GO_Z[1]);GO.user=true;return}
  if(GO.last&&GO.last.id===e.pointerId){const dx=e.clientX-GO.last.x,dy=e.clientY-GO.last.y;GO.last.x=e.clientX;GO.last.y=e.clientY;
    if(GO.moved>6){GO.yaw-=dx*.009;GO.yawS-=dx*.009;GO.pitch=clamp(GO.pitch+dy*.012,GO_P[0],GO_P[1]);GO.user=true;if(GO.spin)goSpin(false)}}});
// lifting one of two fingers carries on as a one-finger turn from where the other finger is, without a jump
const goUp=e=>{if(!GO.ptr.delete(e.pointerId))return;
  if(GO.pinch&&(e.pointerId===GO.pinch.ia||e.pointerId===GO.pinch.ib))goPinchStart();
  if(!GO.ptr.size)GO.last=null;else if(!GO.last||GO.last.id===e.pointerId||GO.ptr.size===1){const[id,p]=[...GO.ptr.entries()][0];GO.last={id,x:p.x,y:p.y}}};
["pointerup","pointercancel","lostpointercapture"].forEach(t=>cv.addEventListener(t,goUp));
cv.addEventListener("wheel",e=>{if(state!=="GARAGE")return;e.preventDefault();GO.zoom=clamp(GO.zoom*Math.exp(e.deltaY*.0012),GO_Z[0],GO_Z[1]);GO.user=true},{passive:false});
$("c").addEventListener("click",e=>{if(state!=="GARAGE"||cuOpen()||GO.moved>6)return;const i=hitSlot(e.clientX,e.clientY);if(i<0)return;if(i===gSel)goDrive();else gPick(i)});
$("c").addEventListener("pointermove",e=>{if(state!=="GARAGE"||e.pointerType!=="mouse"||cuOpen())return;$("c").style.cursor=hitSlot(e.clientX,e.clientY)>=0?"pointer":"default"});

/* ================================================================ ONE GAME TAB AT A TIME
   Each tab holds its own copy of the save and writes all of it. Two tabs open at once would write over each other
   (credits earned in one, then lost when the other saved). The tab opened last plays; any other stops, saves nothing
   more and says so, with a button to play there instead (it reloads, taking the latest save). */
const TAB_ID=Math.random().toString(36).slice(2),TAB_KEY="port-meridien-tab";
const tabCh=typeof BroadcastChannel==="function"?new BroadcastChannel("port-meridien-tabs"):null;
function tabStop(){if(tabIdle)return;tabIdle=true;if(state==="DRIVE")pauseOn();clearInput();audioOn(false);
  if(AC){try{const p=AC.suspend();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
  show("tabIdle",true);try{$("tiHere").focus({preventScroll:true})}catch(e){}}
// by BroadcastChannel; a browser without it gets a note in storage instead (the save stays the only key otherwise)
function tabHello(){const m={t:"hello",id:TAB_ID};if(tabCh){tabCh.postMessage(m);return}try{localStorage.setItem(TAB_KEY,JSON.stringify(Object.assign({at:Date.now()},m)))}catch(e){}}
if(tabCh)tabCh.onmessage=e=>{if(e.data&&e.data.t==="hello"&&e.data.id!==TAB_ID)tabStop()};
addEventListener("storage",e=>{if(e.key===TAB_KEY&&e.newValue){try{if(JSON.parse(e.newValue).id!==TAB_ID)tabStop()}catch(x){}}
  // another tab wrote the save (one that missed the hello): this one stops rather than write over it
  else if(e.key===SAVE_KEY&&!tabIdle)tabStop()});
// back from the browser's page cache, this tab's save may be out of date: start again from the stored one
addEventListener("pageshow",e=>{if(e.persisted)location.reload()});
$("tiHere").onclick=()=>location.reload();
tabHello();

/* ================================================================ CLOUD SAVE (optional sign-in)
   Guests play with the save in this browser, as always. SAVE MY PROGRESS signs in with Google and backs the save up to
   the player's own record in Firestore; signing in on another device brings it back. The browser copy stays: the game
   never waits for the network, keeps working offline, and backs up again when it can. When this device and the account
   both have progress that differs, the player picks which to keep; nothing is added together.
   Firebase identifies the project with the values below. They are public by design (anyone loading the page sees
   them); what protects each save is firestore.rules, which lets a signed-in player read and write only their own.
   Left empty, the game has no cloud save and says so. */
// Port Meridien's own Firebase project (set up on 21 Nov 2026, CLOUD_SETUP.md): cloud saves (Google sign-in and
// Firestore) and playing together (the Realtime Database, js/net.js). These values only identify the project; the
// rules in firestore.rules and database.rules.json protect the data. The policy at the top of index.html allows the
// project's sign-in frame (https://<authDomain>) and its database's addresses
const FIREBASE_CONFIG={apiKey:"AIzaSyDLil4gAN9cI9vBDzwbNdwQwIi2z7tgVTw",authDomain:"port-meridien-cc723.firebaseapp.com",projectId:"port-meridien-cc723",
  appId:"1:1089130569125:web:73917baf756cc7a9459c4c",databaseURL:"https://port-meridien-cc723-default-rtdb.asia-southeast1.firebasedatabase.app"};
// Google sign-in only accepts the sites listed in the project (Authentication, Authorized domains): elsewhere (a copy
// of the page, a preview) the game says where cloud saves work instead of offering a sign-in that would fail
const CLOUD_HOSTS=["joyeechuah.github.io"];
const FB_VER="10.12.2",CLOUD_KEY="port-meridien-cloud";
// Firebase's scripts: pinned version, each file checked against its hash (as three.js is), from cdnjs. Each is loaded
// once, whoever asks first (the cloud save or playing together): loaded twice, a script would set Firebase up again.
// A failed load is forgotten, so the next try fetches it again
const FB_SRI={"firebase-app-compat.js":"sha384-AQ3POAMqIhwS81FrUH95ekxqBZHeP5tG2JfEL3+7GuTtfRLWnrRh32UxwzM+//A9",
  "firebase-auth-compat.js":"sha384-TnlRYaR4JYz/lpaGuaiU61PjNberSA4vjLjtF+oRC/IkohkJqnWxw5EmDSOt1vA1",
  "firebase-firestore-compat.js":"sha384-qn4Jh88HhJA8dplNQyGjOh9OGI4izVhrfj/qIFgaKcdgOE06pXqIKGlsCILZcLAC",
  "firebase-database-compat.js":"sha384-1/m+A1jVWbD3yiK3/vtFvm1+LjK1WLpSoDY+Kaxppwn/yP9BVSgdHTNQVOjrzUO5"};
const FB_LOADS={};
function fbLoad(f){
  return FB_LOADS[f]||(FB_LOADS[f]=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/firebase/"+FB_VER+"/"+f;
    s.integrity=FB_SRI[f];s.async=true;s.crossOrigin="anonymous";s.onload=res;
    s.onerror=()=>{delete FB_LOADS[f];s.remove();console.warn("Couldn't load "+s.src);rej(new Error("Couldn't load "+f))};document.head.appendChild(s)}));
}
// what isn't progress: settings (FLASHES, VIOLENCE and the pistol choice among them: two saves that differed only there
// used to ask which to keep), the car picked, a note about a contract under way, your needs (js/life.js). They're
// backed up too, but don't count as a difference worth asking about. Ghost laps stay on each device (they can pass
// Firestore's 1 MB limit)
const CL_PREFS=["outfit","nick","auto","assist","sound","music","gfx","cam","todMode","tod","steer","tilt","side","diff","cur","jobActive","ghost","ghostOn","needs","homeWait","flash","violence","armed"];
function clCanon(v){if(Array.isArray(v))return "["+v.map(clCanon).join(",")+"]";if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+clCanon(v[k])).join(",")+"}";return JSON.stringify(v===undefined?null:v)}
function clHash(str){let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)}return(h>>>0).toString(36)+":"+str.length}
const clProg=sv=>{const o={};for(const k in sv)if(k!=="home"&&k!=="work"&&!CL_PREFS.includes(k))o[k]=sv[k];
  delete o.traits;if(sv.traits){const t=traitsClean(sv.traits);if(t.ids.length||t.day>=0)o.traits=t}
  delete o.wants;const counts=sv.wants&&wantsClean(sv.wants).completed;if(counts&&Object.keys(counts).length)o.wants=counts;
  // aspiration steps paid count as progress, and none matches a save from before aspirations (js/progress.js)
  delete o.aspire;if(sv.aspire&&typeof aspireClean==="function"){const paid=aspireClean(sv.aspire).claimed;if(Object.keys(paid).length)o.aspire=paid}
  const layout=homeProgress(sv.home);if(layout)o.home=layout;
  const skills=skillsClean(sv.skills);delete o.skills;delete o.photoDay;
  if(Object.keys(SKILL_RATE).some(k=>skills[k]>0))o.skills=skills;
  const shifts=workClean(sv.work).completed;if(shifts)o.work={completed:shifts};
  // no friendships yet (js/life.js) is the same progress as a save from before they existed, so the new empty field
  // doesn't make two devices disagree
  if(o.rel&&typeof o.rel==="object"&&!Object.keys(o.rel).length)delete o.rel;return clHash(clCanon(o))};
const clPayload=sv=>{const o=Object.assign({},sv);delete o.ghost;return o};
// a save with nothing earned yet (the starting credits and cars, no records, landmarks, contracts, cups or customisation)
function clFresh(sv){if(!sv)return true;const e=o=>!o||!Object.keys(o).length;
  // (an aspiration step paid is progress, even with the credits spent back to the start: js/progress.js)
  if(sv.traits){const t=traitsClean(sv.traits);if(t.ids.length||t.day>=0)return false}
  if(sv.aspire&&typeof aspireClean==="function"&&Object.keys(aspireClean(sv.aspire).claimed).length)return false;
  const skills=skillsClean(sv.skills);if(Object.keys(SKILL_RATE).some(k=>skills[k]>0))return false;
  return !(sv.wants&&Object.keys(wantsClean(sv.wants).completed).length)&&!homeProgress(sv.home)&&!workClean(sv.work).completed&&(sv.xp||0)===0&&sv.cr===120000&&Array.isArray(sv.owned)&&sv.owned.join()===STARTERS.join()&&e(sv.paint)&&e(sv.rec)&&e(sv.found)&&e(sv.radar)&&e(sv.champ)&&e(sv.mods)&&e(sv.rel)&&!sv.passBonus&&
    (!sv.jobs||!Object.values(sv.jobs).some(v=>typeof v==="number"?v>0:!e(v)))}
function clSummary(sv){const champ=sv.champ||{};return{cr:sv.cr||0,cars:(sv.owned||[]).length,lvl:lvlOf(sv.xp||0),found:foundCount(sv.found||{}),
  cups:Object.values(champ).filter(c=>c&&c.won).length,mods:Object.keys(sv.mods||{}).length}}
function clAdapter(){if(window.__cloudAdapter)return window.__cloudAdapter;
  if(!FIREBASE_CONFIG.apiKey||!FIREBASE_CONFIG.projectId||!CLOUD_HOSTS.includes(location.hostname)||window.__cloudOff)return null;return fbAdapter()}
// Firebase (Google sign-in and Firestore), loaded only when cloud save is used: guests never download it
function fbAdapter(){
  let auth=null,db=null,ready=null;
  // pinned version, each file checked against its hash (as three.js is): about 510 KB, fetched on first use. From cdnjs,
  // like three.js. The page's security policy (the meta tag at the top) must allow every host Firebase uses: cdnjs and
  // apis.google.com (scripts), the sign-in frame on the authDomain, and the Auth and Firestore addresses (connect-src).
  // Google's own sign-in page opens in its own window, under its own policy, so it needs nothing here.
  // It once allowed none of them, and sign-in said "Couldn't reach the sign-in service" on every device.
  const load=f=>fbLoad(f).catch(()=>{throw new Error("Couldn't load Google sign-in. Try again.")});
  const usr=u=>u?{uid:u.uid,name:u.displayName||"",email:u.email||""}:null;
  return{
    loaded:false,
    init(){if(ready)return ready;const me=this;
      return ready=load("firebase-app-compat.js").then(()=>Promise.all([load("firebase-auth-compat.js"),load("firebase-firestore-compat.js")])).then(()=>{
        // the default app: playing together runs in a Firebase app of its own ("play"), which may exist already
        const fb=window.firebase,app=fb.apps.some(a=>a.name==="[DEFAULT]")?fb.app():fb.initializeApp(FIREBASE_CONFIG);auth=app.auth();db=app.firestore();me.loaded=true;
        return new Promise(r=>{const off=auth.onAuthStateChanged(u=>{off();r(usr(u))})})}).catch(e=>{ready=null;throw e})},
    // Google's sign-in window, opened straight from the button press (the panel loads the service first, so nothing
    // waits in between and the browser allows the window). Sign-in by redirect isn't used: on a site other than
    // Firebase's own, today's browsers block the storage it needs
    signIn(){const pv=new window.firebase.auth.GoogleAuthProvider();pv.setCustomParameters({prompt:"select_account"});
      return auth.signInWithPopup(pv).then(r=>usr(r.user))},
    signOut(){return auth.signOut()},
    get(uid){return db.collection("saves").doc(uid).get().then(d=>d.exists?d.data():null)},
    // written only if nobody else wrote since the version this device knows (rev); otherwise returns what's there
    put(uid,data,rev){const ref=db.collection("saves").doc(uid);
      return db.runTransaction(t=>t.get(ref).then(d=>{const cur=d.exists?d.data():null;if((cur&&cur.rev||0)!==rev)return{ok:false,doc:cur};
        t.set(ref,Object.assign({},data,{rev:rev+1,at:window.firebase.firestore.FieldValue.serverTimestamp()}));return{ok:true,rev:rev+1}}))}
  }}
const clErr=e=>{const c=e&&e.code||"";if(c==="auth/popup-closed-by-user"||c==="auth/user-cancelled")return "Sign-in was cancelled.";
  if(c==="auth/popup-blocked")return "The browser blocked Google's sign-in window. Allow pop-ups for this site and try again.";
  if(c==="auth/web-storage-unsupported")return "This browser's settings block the storage Google sign-in needs. Allow site data for this site (or turn off strict tracking protection) and try again.";
  if(c==="auth/unauthorized-domain")return "Sign-in isn't allowed on this copy of the game. It works on the GitHub Pages version.";
  if(clOff(e))return "You're offline. Your progress is safe on this device and will back up when you're connected.";
  return(e&&e.message)||"Something went wrong."};
// offline, or the service can't be reached: worth waiting and trying again (anything else is a problem to show)
const clOff=e=>!navigator.onLine||["unavailable","auth/network-request-failed","deadline-exceeded"].includes(e&&e.code);
const clAt=d=>d&&d.at?(typeof d.at==="number"?d.at:d.at.toMillis?d.at.toMillis():0):0;
function clAgo(t){if(!t)return "never";const s=(Date.now()-t)/1000;if(s<60)return "just now";if(s<3600)return Math.floor(s/60)+" min ago";if(s<86400)return Math.floor(s/3600)+" h ago";
  return new Date(t).toLocaleDateString()}
function clLoadMeta(){let m=null;try{m=JSON.parse(localStorage.getItem(CLOUD_KEY)||"null")}catch(e){}
  // owner: the id of the account this device's progress last went to or came from. It stays after signing out, so
  // another account signing in here is asked before that progress goes to it. Only the id: no name or email of a
  // signed-out account is kept on the device (older saves stored the name; it's dropped here)
  const o=Object.assign({uid:null,name:"",email:"",rev:0,prog:"",full:"",needs:"",at:0,rehash:false,owner:null,ownerName:""},m&&typeof m==="object"?m:{});
  if(o.uid&&!o.owner)o.owner=o.uid;
  // Migrate even when the remembered session has expired or Firebase is offline.
  if(o.name||o.email||o.ownerName){
    o.name="";o.email="";o.ownerName="";
    try{localStorage.setItem(CLOUD_KEY,JSON.stringify(o))}catch(e){}
  }
  return o}
function clSaveMeta(){if(tabIdle)return;try{localStorage.setItem(CLOUD_KEY,JSON.stringify(CL.meta))}catch(e){}}
CL={meta:clLoadMeta(),ad:null,user:null,st:"guest",msg:"",busy:false,timer:0,pick:null,lastPut:0,other:false,mustRead:false,signingOut:null};
const clOwn=()=>{CL.meta.owner=CL.user.uid;CL.other=false};
// state: guest | connecting | synced | pending | offline | signedout (session ended) | conflict | error
// a backup a few seconds after a change, and at most every 30 s (the free Firebase plan allows 20,000 writes a day)
// Later changes don't push a backup already waiting further back (steady progress would otherwise postpone it for good)
function clChanged(){if(!CL.user||CL.st==="conflict"||CL.timer)return;
  CL.timer=setTimeout(clSync,Math.max(4000,(window.__cloudGap!==undefined?window.__cloudGap:30000)-(Date.now()-CL.lastPut)))}
function clSet(st,msg){CL.st=st;CL.msg=msg||"";clRender();saveMark()}
function clBoot(){
  CL.ad=clAdapter();
  // straight after a restore from the account: the save as this game reads it is the version now in step
  if(CL.meta.rehash){CL.meta.rehash=false;CL.meta.prog=clProg(save);CL.meta.full=clHash(clCanon(clPayload(save)));CL.meta.needs=needsKey(save);clSaveMeta()}
  if(CL.meta.uid&&CL.ad)clConnect(false);else clRender();
  addEventListener("online",()=>{if(CL.user&&(CL.st==="offline"||CL.st==="pending"))clSync()});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&CL.user)clSync()});
  setInterval(()=>{if(CL.user&&(CL.st==="offline"||CL.st==="pending"))clSync()},60000);
}
function clStartScreen(go){const b=$("lcloud");show("lcloud",!!CL.ad&&!CL.meta.uid);b.onclick=go;
  if(CL.meta.uid)$("lstart").textContent="PLAY";clRender()}
// connecting: loads the service and finds who is signed in on this device (Firebase remembers it)
const clAccountError=e=>clSet(clOff(e)?"offline":"error",clErr(e));
// Cloud replies only belong to the session that started them.
function clForUser(user,run){
  const current=()=>{if(!tabIdle&&CL.user===user)return run()};
  return CL.signingOut?CL.signingOut.then(current):current();
}
function clReadAccount(){const user=CL.user;
  return CL.ad.get(user.uid).then(doc=>clForUser(user,()=>clReconcile(doc)),e=>clForUser(user,()=>{throw e}))}
function clConnect(interactive){
  if(!CL.ad){clSet("error");return Promise.resolve()}
  clSet("connecting");
  const who=interactive&&CL.ad.loaded?CL.ad.signIn():CL.ad.init().then(u=>u||(interactive?CL.ad.signIn():null));
  return who.then(u=>{
    if(tabIdle)return;
    if(!u){if(CL.meta.uid){clSet("signedout","You're signed out. Sign in again to keep backing up; your progress is safe on this device.")}else clSet("guest");return}
    CL.user=u;CL.other=!!(CL.meta.owner&&CL.meta.owner!==u.uid);
    if(CL.meta.uid&&CL.meta.uid!==u.uid||CL.other){CL.meta.rev=0;CL.meta.prog="";CL.meta.full="";CL.meta.needs="";CL.meta.at=0}
    CL.meta.uid=u.uid;clSaveMeta();
    return clReadAccount()}).catch(clAccountError)}
function clReconcile(doc){
  let cloud=null;try{cloud=doc&&typeof doc.save==="string"?JSON.parse(doc.save):null}catch(e){cloud=null}
  // An existing document with an unreadable payload may still contain recoverable progress.
  // Retry by reading it again before either copy can be replaced.
  CL.mustRead=!!doc&&(!cloud||!Array.isArray(cloud.owned)||!Number.isFinite(cloud.cr));
  if(CL.mustRead){clSet("error","Your account backup could not be read. Your progress is still on this device.");return}
  if(!doc){
    // nothing in the account yet: back this device up, unless its progress belongs to another account (a shared browser)
    if(CL.other&&!clFresh(save)){CL.pick={doc,cloud:null};clSet("conflict","This device has another Google account's progress. Choose whether to use it.");clPickShow();return}
    return clUpload(doc&&doc.rev||0)}
  const L=clProg(save),C=clProg(cloud),rev=doc.rev||0;
  // the same progress, or neither side moved on since this device last synced: in step (settings are sent if changed)
  if(L===C||(CL.meta.rev===rev&&CL.meta.prog===L)){const other=CL.other;CL.meta.rev=rev;CL.meta.prog=L;CL.meta.at=clAt(doc)||CL.meta.at;clOwn();save.photoDay=photoDayClean(save.photoDay);
    // wants taken from the account give way at once if they can't be done (a head chef's promotion want), before saving
    if(L===C&&cloud.wants&&wantsSync(cloud.wants)){wantsTidy();persist()}
    // the day's photos: the higher count for the same account; when this device's save was another account's, this
    // account's own count (the other's five used went over to an account that had used none)
    const day=photoDayClean(cloud.photoDay);
    if(other?day.day!==save.photoDay.day||day.count!==save.photoDay.count:day.day>save.photoDay.day||day.day===save.photoDay.day&&day.count>save.photoDay.count){save.photoDay=day;persist()}
    clWork(cloud);clNeeds(cloud);clSaveMeta();return clUpload(rev,true)}
  if(clFresh(save))return clApply(doc,cloud);                                      // a new device: bring the account's progress here
  if(CL.meta.rev===rev&&CL.meta.prog)return clUpload(rev);                          // only this device moved on since it last synced
  if(CL.meta.rev&&CL.meta.prog===L)return clApply(doc,cloud);                        // only the account moved on (another device)
  CL.pick={doc,cloud};clSet("conflict","This device and your account have different progress. Choose which to keep.");clPickShow()}
// With the same completed shifts, the cooldown can only have counted down on either device.
function clWork(cloud){
  const remote=workClean(cloud.work);
  if(remote.completed===save.work.completed&&remote.cool<WORK.cool){
    WORK.cool=remote.cool;save.work=remote;persist();
  }
}
// Your needs (js/life.js) aren't progress, so two saves that differ only there are in step. Whose go up with the next
// backup? The account's, if this device hasn't changed its own since it last synced (it would only be sending old
// ones back over newer ones from another device): they become this device's. Otherwise this device's are the newer.
// One whole set or the other, never the higher of each; a save from before needs has the starting values
function clNeeds(cloud){
  needsCommit();   // bench and speed rewards can be newer than the last local checkpoint
  const here=needsKey(save),there=needsKey(cloud);
  if(here!==there&&(!CL.meta.needs||CL.meta.needs===here)){needsLoad(needsOfSave(cloud));homeWaitLoad(cloud.homeWait);persist();if(state==="GARAGE")restSync()}
  if(needsKey(save)===there)CL.meta.needs=there}
// the account's save becomes this device's (its ghost laps stay), and the game starts again from it
// From here until the page reloads, this tab neither saves nor backs up: the progress still in memory would otherwise
// go back over the restored save (on leaving the page) and up to the account
function clApply(doc,cloud){const lost=[],sv=Object.assign({},cloud,{home:homeClean(cloud.home,lost),ghost:save.ghost||{}});
  // (an old back-row piece with no room is paid back: see homeClean)
  if(lost.length)sv.cr=(Number.isFinite(sv.cr)?sv.cr:0)+homeRefund(lost);
  // the day's photos counted on this device stay counted when the same account's save, with an older count, is restored
  // over it (that reopened the five a day); another account's save keeps its own
  if(!CL.other){const a=photoDayClean(save.photoDay),b=photoDayClean(sv.photoDay);if(a.day>b.day||a.day===b.day&&a.count>b.count)sv.photoDay=a}
  CL.applying=true;clearTimeout(CL.timer);CL.timer=0;
  // if the browser won't store it, nothing changed: saving and backing up carry on, and the choice stays to try again
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(sv))}catch(e){CL.applying=false;CL.pick={doc,cloud};clSet("error","This browser won't store the restored progress.");return}
  CL.meta.rev=doc.rev||0;CL.meta.rehash=true;clOwn();CL.meta.at=clAt(doc);clSaveMeta();
  clSet("synced","Restoring your progress…");if(window.__cloudNoReload){window.__cloudApplied=sv;return}setTimeout(()=>{if(!tabIdle)location.reload()},400)}
// this device's save goes to the account, if nobody else wrote there since (otherwise: compare again)
function clUpload(rev,onlyIfChanged){if(tabIdle||CL.applying||CL.signingOut)return Promise.resolve();
  const user=CL.user;
  const pay=clPayload(save),full=clHash(clCanon(pay)),prog=clProg(save);
  if(onlyIfChanged&&full===CL.meta.full){clSet("synced");return Promise.resolve()}
  CL.busy=true;CL.lastPut=Date.now();clRender();
  return CL.ad.put(user.uid,{save:JSON.stringify(pay),v:save.v||2,summary:clSummary(save)},rev).then(r=>clForUser(user,()=>{CL.busy=false;
    if(!r.ok){CL.meta.rev=-1;return clReconcile(r.doc)}
    CL.meta.rev=r.rev;CL.meta.prog=prog;CL.meta.full=full;CL.meta.needs=needsKey(pay);CL.meta.at=Date.now();clOwn();clSaveMeta();clSet("synced");
    if(clHash(clCanon(clPayload(save)))!==full)clChanged()})).catch(e=>clForUser(user,()=>{CL.busy=false;clSet(clOff(e)?"offline":"pending",clErr(e))}))}
// a backup after the progress changed (a few seconds after, on leaving the page, when back online, and BACK UP NOW)
function clSync(){clearTimeout(CL.timer);CL.timer=0;if(!CL.user||CL.busy||CL.applying||CL.signingOut||tabIdle||CL.st==="conflict"||CL.st==="connecting")return Promise.resolve();
  // If the new account could not be read, retry the comparison before writing another player's local progress.
  if(CL.other||CL.mustRead){clSet("connecting");return clReadAccount().catch(clAccountError)}
  const full=clHash(clCanon(clPayload(save)));if(full===CL.meta.full&&CL.st==="synced")return Promise.resolve();
  return clUpload(CL.meta.rev)}
// If the service isn't loaded yet (loading it failed when the panel opened), the tap only loads it and the button
// comes back for a fresh tap: phones block a window opened after a wait, so it never opens one late
function clSignIn(){if(CL.busy||CL.signingOut)return;
  if(CL.ad&&CL.ad.loaded===false){clSet("connecting");CL.ad.init().then(()=>clSet(CL.meta.uid?"signedout":"guest","Ready: tap SIGN IN WITH GOOGLE."),e=>clSet(clOff(e)?"offline":"error",clErr(e)));return}
  clConnect(true)}
function clSignOut(){if(!CL.ad||CL.signingOut||CL.applying)return;
  CL.signingOut=CL.ad.signOut().then(()=>{
    // An already submitted first backup may succeed even if its reply arrives after sign-out.
    const owner=CL.meta.owner||(CL.busy&&CL.user?CL.user.uid:null);
    clearTimeout(CL.timer);CL.timer=0;CL.user=null;CL.pick=null;CL.busy=false;CL.other=false;CL.signingOut=null;
    CL.meta={uid:null,name:"",email:"",rev:0,prog:"",full:"",needs:"",at:0,rehash:false,owner:owner||null,ownerName:""};
    clSaveMeta();clSet("guest");toast("SIGNED OUT","Your progress stays on this device; it isn't backed up now");
  },()=>{
    CL.signingOut=null;clSet(CL.st,"Couldn't sign out. Try again.");clChanged();
  });
  clRender();
}
function clRow(sv,at,other){const m=clSummary(sv),li=t=>"<li>"+t+"</li>",p=clPeople(sv,other);
  return li("<b>"+fmtCr(m.cr)+"</b> credits")+li(m.cars+" car"+(m.cars===1?"":"s")+(m.mods?" · "+m.mods+" customised":""))+li("Driver level "+m.lvl)+li(m.found+" landmark"+(m.found===1?"":"s")+" · "+m.cups+" cup"+(m.cups===1?"":"s")+" won")+(p?li(p):"")+(at?li("Saved "+clAgo(at)):"")}
// the people met and friends made (js/life.js) on a choice card; where the two saves' friendships differ, the first
// person they differ on and where you stand with them, since the rest of the two cards can be the same
function clPeople(sv,other){
  const r=sv.rel&&typeof sv.rel==="object"?sv.rel:{},o=other&&other.rel&&typeof other.rel==="object"?other.rel:{},vs=Object.values(r);
  const met=vs.filter(v=>v&&v.n>0).length,fr=vs.filter(v=>v&&v.f>=35).length;
  const id=other?PEOPLE.findIndex((x,i)=>(r[i]?.f??0)!==(o[i]?.f??0)||(r[i]?.n??0)!==(o[i]?.n??0)):-1;
  if(!met&&id<0)return"";
  return met+(met===1?" person":" people")+" met · "+fr+" friend"+(fr===1?"":"s")+(id>=0?" · "+PEOPLE[id].name+": "+relLabel(r[id]):"");
}
function clPickShow(){if(!CL.pick)return;
  // not over a race or a drive: it waits for the pause menu or the garage, and a message says so
  if(state!=="GARAGE"&&state!=="PAUSE"&&state!=="LOAD"&&state!=="ARRIVAL"){toast("CLOUD SAVE","Your account has different progress. Pause to choose which to keep");return}
  // another account's progress on this device, and nothing in this account yet: use it here too, or start new
  const ot=!CL.pick.cloud;
  $("cpkTitle").textContent=ot?"Use this device's progress for this account?":"Which progress do you want to keep?";
  $("cpkP").textContent=ot?"This device's progress was last backed up to another Google account. Use it for this account too, or start new here. Starting new doesn't touch the other account's backup.":
    "This device and your Google account have different progress. The one you don't keep is replaced. Credits aren't added together.";
  $("cpkKeepDev").textContent=ot?"USE THIS DEVICE'S":"KEEP THIS DEVICE'S";$("cpkKeepAcc").textContent=ot?"START NEW":"KEEP THE ACCOUNT'S";
  $("cpkDev").innerHTML=clRow(save,0,CL.pick.cloud);$("cpkAcc").innerHTML=ot?"<li>No progress saved yet</li>":clRow(CL.pick.cloud,clAt(CL.pick.doc),save);show("cloud",false);show("cloudPick",true)}
// a new game in this account: this device's save goes (its progress stays in the other account, up to its last backup)
function clStartNew(doc){CL.applying=true;clearTimeout(CL.timer);CL.timer=0;
  try{localStorage.removeItem(SAVE_KEY)}catch(e){CL.applying=false;CL.pick={doc,cloud:null};clSet("error","This browser won't let the game start new progress.");return}
  CL.meta.rev=doc&&doc.rev||0;CL.meta.rehash=true;clOwn();CL.meta.at=0;clSaveMeta();
  clSet("synced","Starting new progress…");if(window.__cloudNoReload){window.__cloudApplied="new";return}setTimeout(()=>{if(!tabIdle)location.reload()},400)}
function clKeep(which){const p=CL.pick;if(tabIdle||!p)return;CL.pick=null;show("cloudPick",false);CL.st="pending";
  if(which==="acc"){if(p.cloud)clApply(p.doc,p.cloud);else clStartNew(p.doc)}else clUpload(p.doc&&p.doc.rev||0)}
function clOpen(){if(CL.pick){clPickShow();return}show("cloud",true);
  // the service loads while the panel is open, so SIGN IN can open Google's window at once
  if(CL.ad&&!CL.user&&CL.ad.init&&!CL.ad.loaded&&CL.st!=="connecting"){CL.st="connecting";CL.ad.init().then(()=>{if(CL.st==="connecting")clSet(CL.meta.uid?"signedout":"guest")},e=>clSet(clOff(e)?"offline":"error",clErr(e)))}
  clRender();try{$(CL.user?"clClose":"clIn").focus({preventScroll:true})}catch(e){}}
const clOverlayOpen=()=>!$("cloud").classList.contains("hide")||!$("cloudPick").classList.contains("hide");
function clDeferPick(){if(CL.pick)CL.pick.deferred=true;show("cloudPick",false);clRender()}
function clEscape(){if(!$("cloudPick").classList.contains("hide"))clDeferPick();else show("cloud",false)}
function clLine(){const m=CL.meta;
  if(!CL.ad)return "";
  if(CL.st==="conflict")return "Choose which progress to keep";
  if(CL.st==="connecting")return "Connecting…";
  if(CL.busy)return "Backing up…";
  if(CL.st==="signedout")return "Signed out · not backed up";
  if(CL.st==="offline")return "Offline · last backed up "+clAgo(m.at);
  if(CL.st==="pending"||CL.st==="error")return m.uid?"Not backed up · last "+clAgo(m.at):"";
  if(CL.user)return "Backed up "+clAgo(m.at);
  return ""}
// NOT SAVED (js/core.js persist) shows on the drive HUD and in the garage until a save goes in. Signed in, with the
// account holding all of the progress so far, it says IN YOUR ACCOUNT ONLY: the next start brings it back from there
function saveMark(){
  const acct=!SAVE.ok&&!!CL&&!!CL.user&&!!CL.meta.full&&clHash(clCanon(clPayload(save)))===CL.meta.full;
  for(const id of ["saveHud","gSave"]){const b=$(id);if(!b)continue;
    b.textContent=acct?"IN YOUR ACCOUNT ONLY":"NOT SAVED";b.classList.toggle("acct",acct);show(id,!SAVE.ok)}}
function saveWhy(){const acct=$("saveHud").classList.contains("acct");
  toast(acct?"IN YOUR ACCOUNT ONLY":"PROGRESS NOT SAVED",acct?"This browser isn't storing your progress, but your account has all of it, for next time":
    CL&&CL.user?"This browser isn't storing your progress. It goes to your account a few seconds after each change":
    CL&&CL.ad?"This browser isn't storing your progress. SAVE MY PROGRESS in the garage backs it up to your Google account":
    "This browser isn't storing your progress: its storage is full or turned off, as in some private windows","bad")}
$("saveHud").onclick=saveWhy;$("gSave").onclick=saveWhy;
function clRender(){if(!CL)return;const on=!!CL.user,line=clLine(),bad=CL.st==="offline"||CL.st==="pending"||CL.st==="error"||CL.st==="signedout"||CL.st==="conflict";
  const g=$("gCloud");g.textContent=on||CL.meta.uid?(line||"SAVED").toUpperCase():"SAVE MY PROGRESS";g.classList.toggle("warn",bad&&!!CL.meta.uid);show("gCloud",!!CL.ad);
  $("pCloud").textContent=on?"CLOUD SAVE: "+(bad?"CHECK":"ON"):"SAVE MY PROGRESS";
  $("lcl").textContent=CL.meta.uid?(CL.user&&CL.user.name?"Signed in as "+CL.user.name+" · ":"")+line:CL.ad?"Sign in with Google to back up your cars and credits and play on any device":"";
  show("clIntro",!on);show("clWho",on);show("clIn",!on);show("clNow",on);show("clOut",on||CL.st==="signedout");
  $("clWho").innerHTML=on?"Signed in as <b>"+(CL.user.name||"you").replace(/[<>&]/g,"")+"</b>"+(CL.user.email?" ("+CL.user.email.replace(/[<>&]/g,"")+")":"")+". Your progress backs up by itself, and a copy stays on this device for playing offline.":"";
  $("clIn").disabled=!CL.ad||CL.st==="connecting"||!!CL.signingOut;$("clIn").textContent=CL.st==="connecting"?"CONNECTING…":"SIGN IN WITH GOOGLE";$("clNow").disabled=CL.busy||!!CL.signingOut;$("clOut").disabled=CL.applying||!!CL.signingOut;
  const st=$("clStat"),txt=!CL.ad?(FIREBASE_CONFIG.apiKey&&!CLOUD_HOSTS.includes(location.hostname)?"Cloud saves work on the game's own site, joyeechuah.github.io/Port-Meridien.":"Cloud saves aren't set up on this copy of the game."):CL.msg||(on?"Last backed up: "+(CL.meta.at?new Date(CL.meta.at).toLocaleString()+" ("+clAgo(CL.meta.at)+")":"not yet"):"Playing as a guest. Progress is saved in this browser only.");
  st.textContent=txt;st.classList.toggle("bad",bad||!CL.ad)}
$("gCloud").onclick=$("pCloud").onclick=clOpen;$("clClose").onclick=()=>show("cloud",false);$("clIn").onclick=clSignIn;$("clOut").onclick=clSignOut;
$("clNow").onclick=()=>{if(CL.user){CL.meta.full="";clSync()}};
$("cpkKeepDev").onclick=()=>clKeep("dev");$("cpkKeepAcc").onclick=()=>clKeep("acc");$("cpkLater").onclick=clDeferPick;
// a choice that waited (it came up during a drive) shows when the game is paused or back in the garage
const clWaiting=()=>{if(CL.pick&&!CL.pick.deferred&&(state==="PAUSE"||state==="GARAGE")&&!clOverlayOpen())clPickShow()};
setInterval(()=>{clRender();clWaiting()},15000);
