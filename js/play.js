// Port Meridien: Free-ride streaks, races and time trials, speed radars, the GPS, money and messages, the HUD canvases and the full map.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;
/* ================================================================ STREAK
   Free-ride points: speed, near misses, oncoming lane and drifts
   build a chain. It banks as credits once you go 4 s without a new action,
   and a crash loses it. */
const FR={pts:0,mult:1,timer:0,label:"",flash:0};
function streakAction(label,pts,discrete){
  if(ev||testDrive||job||state!=="DRIVE")return;
  FR.pts+=pts*FR.mult;FR.label=label;FR.flash=1;
  if(discrete){FR.mult=Math.min(5,FR.mult+.25);FR.timer=4}else FR.timer=Math.max(FR.timer,3.2);
}
function streakReset(){FR.pts=0;FR.mult=1;FR.timer=0}
function streakCrash(){if(FR.pts>200)toast("STREAK LOST","Crashed with "+fmtCr(FR.pts)+" pts on the line","bad");streakReset()}
function updateStreak(dt){
  if(ev||job){streakReset();return}
  const kph=kphNow();
  if(kph>150&&!P.air)streakAction("SPEED",(kph-150)*.9*dt,false);
  const nr=P.nr;
  if(nr&&P.onRoad&&nr.e.type!=="drive"&&kph>70){
    const f=fwdOf(P.h),al=f.x*nr.dx+f.z*nr.dz;
    const sd=nr.side*SIDE();if((al>.3&&sd<-.8)||(al<-.3&&sd>.8))streakAction("ONCOMING",kph*.55*dt,false);
  }
  const vF=speedF(),vS=P.vx*-Math.cos(P.h)+P.vz*Math.sin(P.h),ang=Math.abs(Math.atan2(vS,Math.abs(vF)))*57.3;
  if(ang>12&&kph>40&&!P.air)streakAction("DRIFT",ang*4*dt,false);
  if(FR.timer>0){FR.timer-=dt;if(FR.timer<=0&&FR.pts>0){const cr=Math.round(FR.pts);earn(cr);toast("STREAK BANKED","+"+fmtCr(cr)+" CR","gold");FR.pts=0;FR.mult=1}}
  FR.flash=Math.max(0,FR.flash-dt*2);
}
/* ================================================================ EVENTS (time trials and races with AI rivals) */
P.lat=0;
const EVENTS=[
  {id:"cubells",name:"South Bluff Coast",type:"tt",wp:()=>[ringPt(.25),ringPt(.7),ringPt(1.15),ringPt(1.6),ringPt(2.0)]},
  {id:"talaia",name:"Crown Ridge Climb",type:"race",wp:()=>[[-292,98],[-200,-200],[-120,-360],[-60,-560],[-20,-845]]},
  {id:"oldtown",name:"Old Quay Dash",type:"tt",wp:()=>[[566,-118],[757,-118],[757,186],[566,186],[566,60]]},
  {id:"highway",name:"Coastal Highway",type:"race",wp:()=>[[-690,8],[-300,110],[260,-10],[560,40],[930,10]]},
  {id:"south",name:"Cedar Heights Descent",type:"tt",wp:()=>[[62,-8],[110,260],[150,520],[24,795]]},
  {id:"antoni",name:"Westhaven Loop",type:"race",wp:()=>[ringPt(2.3),ringPt(2.8),ringPt(3.3),ringPt(3.8),ringPt(4.2)]},
];
// race difficulty: rivals' pace, their top speed and acceleration alike (HARD is how rivals drove before difficulty
// existed), and the reward multiplier
const DIFFS=[{n:"EASY",pace:.85,pay:.75},{n:"NORMAL",pace:.93,pay:1},{n:"HARD",pace:1,pay:1.3}];
const raceRewards=(E,d)=>E.rewards.map(r=>Math.round(r*DIFFS[d].pay/100)*100);
// ---- time trial ghost: your record run replayed as a see-through car, with the live gap to it
const GH={m:null,id:null,o:{}};
function ghostModel(id){
  if(GH.m&&GH.id===id&&GH.m.q===carQ())return GH.m;
  if(GH.m)disposeHeroCar(GH.m);
  const m=buildHeroCar(carById(id));
  // its own see-through copy of every material (some are shared with the other cars), and no shadow
  // one clone per material (a material used by several parts gets one clone); clones that reflect the sky are kept
  // up to date with it; the car's own originals are freed (the shared ones stay); no contact shadow
  const sh=carShared(),own=new Map();
  const drop=[];
  m.G.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;if(o.material===shadowM){drop.push(o);return}
    o.material=(Array.isArray(o.material)?o.material:[o.material]).map(x=>{if(!own.has(x)){const c=x.clone();c.transparent=true;c.opacity=.36;c.depthWrite=false;own.set(x,c)}return own.get(x)});
    if(o.material.length===1)o.material=o.material[0]});
  for(const o of drop)o.parent.remove(o);
  for(const [x,c] of own){if(CAR_ENV.mats.has(x)){envMat(c);if(CAR_ENV.tex)c.envMap=curCarEnv()}if(!sh.M.has(x)){CAR_ENV.mats.delete(x);x.dispose()}}
  m.bodyM=own.get(m.bodyM)||m.bodyM;m.tailM=own.get(m.tailM)||m.tailM;
  if(m.inside)m.inside.visible=false;
  m.G.visible=false;scene.add(m.G);GH.m=m;GH.id=id;GH.o={};return m;
}
// the ghost's place at time t (seconds since GO), or null once it has finished
function ghostAt(g,t){
  const d=g.d,n=d.length/4,k=Math.max(0,t*10),i=Math.floor(k),f=k-i;
  if(i>=n-1)return null;
  const a=i*4,b=a+4;return{x:lerp(d[a],d[b],f),z:lerp(d[a+1],d[b+1],f),h:d[a+2]+wrapA(d[b+2]-d[a+2])*f,s:lerp(d[a+3],d[b+3],f)};
}
// when the ghost had driven s metres along the route
function ghostTimeAt(g,s){
  const d=g.d,n=d.length/4;if(s<=d[3])return 0;if(s>=d[(n-1)*4+3])return null;
  let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(d[m*4+3]<s)lo=m;else hi=m}
  const s0=d[lo*4+3],s1=d[hi*4+3];return (lo+(s1>s0?(s-s0)/(s1-s0):0))/10;
}
function ghostHide(){if(GH.m)GH.m.G.visible=false;show("evGhost",false)}
function routeTime(k,aLat,vTop,acc,brk){
  const n=k.length,v=new Array(n);
  for(let i=0;i<n;i++)v[i]=Math.min(vTop,Math.sqrt(aLat/k[i]));
  for(let i=n-2;i>=0;i--)v[i]=Math.min(v[i],Math.sqrt(v[i+1]**2+2*brk*4));
  v[0]=Math.min(v[0],3);for(let i=1;i<n;i++)v[i]=Math.min(v[i],Math.sqrt(v[i-1]**2+2*acc*4));
  let t=0;for(let i=0;i<n-1;i++)t+=8/(v[i]+v[i+1]);return t;
}
function buildEvents(){
  for(const E of EVENTS){
    const wp=E.wp();let pts=[];
    for(let i=0;i<wp.length-1;i++){const r=routeBetween(wp[i][0],wp[i][1],wp[i+1][0],wp[i+1][1]);if(r)pts=pts.concat(i?r.pts.slice(1):r.pts)}
    const R=resample(makePath(pts),4);E.route=R;
    const n=R.pts.length,ang=[],k=[],vp=[];
    for(let i=0;i<n;i++){const a=R.pts[Math.max(0,i-1)],b=R.pts[Math.min(n-1,i+1)];ang.push(Math.atan2(b.x-a.x,b.z-a.z))}
    for(let i=0;i<n;i++)k.push(Math.abs(wrapA(ang[Math.min(n-1,i+2)]-ang[Math.max(0,i-2)]))/16+1e-4);
    vp[n-1]=60;for(let i=n-1;i>=0;i--){const vc=Math.sqrt(11.5/k[i]);vp[i]=Math.min(vc,i<n-1?Math.sqrt(vp[i+1]**2+2*9*4):vc)}
    // medal times follow the route's own bends: a well driven lap in a quick
    // road car (about 13 m/s² through corners, 225 km/h top, brisk acceleration)
    E.tIdeal=routeTime(k,13,62,5.5*1.15,8);
    E.k=k;E.vp=vp;E.cps=[];for(let s=330;s<R.len-120;s+=330)E.cps.push(s);E.cps.push(R.len);
    const L=R.len;
    E.gold=E.tIdeal*1.02;E.silver=E.tIdeal*1.15;E.bronze=E.tIdeal*1.32;
    E.rewards=E.type==="tt"?[Math.round(L*16/100)*100,Math.round(L*9/100)*100,Math.round(L*5/100)*100]:[Math.round(L*22/100)*100,Math.round(L*11/100)*100,Math.round(L*5/100)*100];
    const s=R.pts[0];E.x=s.x;E.z=s.z;E.mk=marker(s.x,s.z,true);
  }
}
// checkpoint gates (pooled)
const gates=[];
function buildGates(){
  const postM=new THREE.MeshLambertMaterial({color:0x1b1d21}),banM=new THREE.MeshBasicMaterial({color:0xffffff});
  const c=document.createElement("canvas");c.width=256;c.height=32;const x=c.getContext("2d");for(let i=0;i<32;i++)for(let j=0;j<4;j++){x.fillStyle=(i+j)%2?"#fff":"#111";x.fillRect(i*8,j*8,8,8)}
  const finM=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)});
  for(let i=0;i<2;i++){
    const g=new THREE.Group(),pl=new THREE.Mesh(GEO.box,postM),pr=new THREE.Mesh(GEO.box,postM),bn=new THREE.Mesh(GEO.box,banM);
    g.add(pl,pr,bn);g.visible=false;scene.add(g);gates.push({g,pl,pr,bn,banM,finM});
  }
}
function placeGate(G,route,s,fin){
  const p=edgePos(route,s),nr=nearestRoad(p.x,p.z,20),hw=(nr?nr.e.half:6)+1.2,y=surfH(p.x,p.z,nr)-YO;
  G.g.visible=true;G.g.position.set(p.x,y,p.z);G.g.rotation.y=Math.atan2(p.dx,p.dz);
  G.pl.scale.set(.5,6,.5);G.pl.position.set(-hw,3,0);G.pr.scale.set(.5,6,.5);G.pr.position.set(hw,3,0);
  G.bn.scale.set(hw*2+.5,1.1,.2);G.bn.position.set(0,6,0);G.bn.material=fin?G.finM:G.banM;
}
const AIM=[];let ev=null;
function trackRoute(route,x,z,hint){
  const n=route.pts.length;let bi=hint,bd=1e9;
  for(let i=Math.max(0,hint-15);i<Math.min(n-1,hint+70);i++){const p=route.pts[i],d=(p.x-x)**2+(p.z-z)**2;if(d<bd){bd=d;bi=i}}
  const p=route.pts[bi],q=route.pts[Math.min(n-1,bi+1)],sx=q.x-p.x,sz=q.z-p.z,L=Math.hypot(sx,sz)||1;
  const t=clamp(((x-p.x)*sx+(z-p.z)*sz)/(L*L),0,1);
  return{i:bi,s:route.cum[bi]+t*L,d:Math.sqrt(bd),side:((x-p.x)*-sz+(z-p.z)*sx)/L};
}
// nearest point on the whole route (used when the car has strayed beyond the local search), not past maxS
// projected onto every segment up to maxS, the last one cut off at maxS, so the answer can never lie beyond it
function trackRouteFull(route,x,z,maxS){
  const P=route.pts,C=route.cum,n=P.length;let best=null;
  for(let i=0;i<n-1&&C[i]<=maxS;i++){
    const p=P[i],q=P[i+1],sx=q.x-p.x,sz=q.z-p.z,L=Math.hypot(sx,sz)||1;
    const tMax=clamp((maxS-C[i])/L,0,1),t=clamp(((x-p.x)*sx+(z-p.z)*sz)/(L*L),0,tMax);
    const px=p.x+sx*t,pz=p.z+sz*t,d=Math.hypot(x-px,z-pz);
    if(!best||d<best.d)best={i,s:C[i]+t*L,d,side:((x-p.x)*-sz+(z-p.z)*sx)/L};
  }
  return best;
}
// a checkpoint counts only when the car drives through its gate: forwards, between the posts
function gateOf(R,s){const p=edgePos(R,s),nr=nearestRoad(p.x,p.z,20);return{x:p.x,z:p.z,dx:p.dx,dz:p.dz,hw:(nr?nr.e.half:6)+1.2}}
// how far along the move from (x0,z0) to (x1,z1) the gate's line is crossed (0 to 1)
function crossAt(g,x0,z0,x1,z1){const a0=(x0-g.x)*g.dx+(z0-g.z)*g.dz,a1=(x1-g.x)*g.dx+(z1-g.z)*g.dz;return a0===a1?1:clamp(a0/(a0-a1),0,1)}
function crossedGate(g,x0,z0,x1,z1){
  const a0=(x0-g.x)*g.dx+(z0-g.z)*g.dz,a1=(x1-g.x)*g.dx+(z1-g.z)*g.dz;
  if(!(a0<0&&a1>=0))return false;
  const t=a0/(a0-a1),xi=x0+(x1-x0)*t,zi=z0+(z1-z0)*t;
  return Math.abs((xi-g.x)*-g.dz+(zi-g.z)*g.dx)<=g.hw+1;
}
const AIC=new Map();   // rival car models (by car id, and which copy when two rivals drive the same car), most recently used last; at most 6 kept
function rivalModel(cd,key){
  let m=AIC.get(key);
  if(m)AIC.delete(key);
  // one built before a graphics change is built again at the new level
  if(m&&m.q!==carQ()&&!AIM.includes(m)){disposeHeroCar(m);m=null}
  if(!m){m=buildHeroCar(cd);m.id=key;scene.add(m.G)}
  AIC.set(key,m);
  while(AIC.size>6){const[id,old]=AIC.entries().next().value;if(AIM.includes(old))break;AIC.delete(id);disposeHeroCar(old)}
  return m;
}
function startEvent(E,cup){
  P.damage=P.damageT=0;repairWarnLevel=0;
  const R=E.route,me=curCar(),idx=CARS.indexOf(me);
  ev={E,R,lanes:null,t:-3,phase:"count",cp:0,hint:0,s:14,sNow:14,d:99,ai:[],done:false,wrongT:0,last:4,px:null,pz:null,gate:gateOf(R,E.cps[0]),reT:0,missT:0,diff:E.type==="race"?save.diff:1,obs:[],cup:cup||null,tg:cup&&E.type==="tt"?cupTimes(E,cup.cls):E,rec:E.type==="tt"?[]:null,ghost:E.type==="tt"&&save.ghost[E.id]?save.ghost[E.id]:null};
  const p=edgePos(R,14);
  // the grid: you on the outer side of the road, rivals beside and behind (mirrored when driving on the left)
  const S=SIDE(),L1=1.9*S,L2=-1.7*S;
  P.x=p.x-p.dz*L2;P.z=p.z+p.dx*L2;P.h=Math.atan2(p.dx,p.dz);P.vx=P.vz=0;P.r=0;P.steer=0;P.steerS=0;P.ty=surfH(P.x,P.z);P.y=P.ty;P.air=false;
  if(E.type==="race"){
    // second row far enough back that the chase camera is not inside the car behind you
    const grid=[[14,L1],[3,L2],[3,L1]],used=new Set();ev.lanes=[L1,L2];AIM.forEach(m=>m&&(m.G.visible=false));
    // in a championship the rivals drive cars of the cup's class
    const pool=cup?CARS.filter(c=>c.cls===cup.cls&&c.id!==me.id):[];
    for(let i=0;i<3;i++){
      const pick=pool.length?pool[i%pool.length]:CARS[clamp(idx+[1,-1,0][i],0,CARS.length-1)];
      let key,k=0;do key=pick.id+"#"+(k++);while(used.has(key));used.add(key);
      const m=rivalModel(pick,key);AIM[i]=m;
      m.G.visible=true;showDamageSmoke(m,0);
      ev.ai.push({m,s:grid[i][0],lat:grid[i][1],lane:grid[i][1],v:0,sk:[.95,.91,.98][i],vmax:pick.top/3.6*[.91,.88,.94][i],acc:HD.pBase+pick.acc*HD.pAcc,fin:0,x:0,z:0,yaw:0,name:pick.mk+" "+pick.md});
    }
  }
  evDirs=routeDirs(R);clearOncoming();
  streakReset();snapCam();
}
function endEvent(){ev=null;evDirs=null;ghostHide();AIM.forEach(m=>m&&(m.G.visible=false));gates.forEach(g=>g.g.visible=false);$("evhud").classList.add("hide");$("wrong").classList.add("hide");$("count").classList.add("hide");locked=false}
function updateEvent(dt){
  const R=ev.R,E=ev.E;
  ev.t+=dt;
  // over the line: the car brakes to a stop (stepPlayer), then the result shows; at most 4 s
  if(ev.phase==="finish"){ev.fin.T+=dt;locked=true;if(kphNow()<5||ev.fin.T>4){showResult();return}}
  if(ev.phase==="count"){
    locked=true;P.vx*=.9;P.vz*=.9;
    const c=Math.ceil(-ev.t);$("count").classList.remove("hide");$("count").textContent=c>0?c:"GO";
    if(c!==ev.last){ev.last=c;beep(c>0?520:880)}
    if(ev.t>=0){ev.phase="run";locked=false;setTimeout(()=>$("count").classList.add("hide"),600)}
  }
  let tr=trackRoute(R,P.x,P.z,ev.hint);
  // strayed beyond the local search (a long detour): look along the whole route, but never past the next
  // checkpoint still to be driven through, so a shortcut can't move you up the order
  ev.reT-=dt;
  if(tr.d>=40&&ev.reT<=0){ev.reT=.4;const f=trackRouteFull(R,P.x,P.z,E.cps[Math.min(ev.cp,E.cps.length-1)]+30);if(f&&f.d<tr.d)tr=f}
  ev.d=tr.d;ev.sNow=tr.s;
  // race position and rival pacing follow progress, which stops at the next gate until the car drives through it
  if(tr.d<40){ev.hint=tr.i;ev.s=Math.max(ev.s,Math.min(tr.s,E.cps[Math.min(ev.cp,E.cps.length-1)]+2));P.lat=tr.side}
  // wrong way
  const dir=edgePos(R,ev.s),along=(P.vx*dir.dx+P.vz*dir.dz);
  ev.wrongT=along<-2?ev.wrongT+dt:0;$("wrong").classList.toggle("hide",ev.wrongT<1.2);
  // AI rivals. What they keep clear of, in route terms (metres along it, metres right of its centre, speed along it):
  // each other, and traffic cars on the route (found once a frame, near a rival)
  const obs=ev.obs;obs.length=0;
  if(ev.ai.length){for(const a of ev.ai)obs.push(a);
    for(const t of TRAFFIC){if(!t.e)continue;let near=null,nd=60;for(const a of ev.ai){const d=Math.hypot(t.wx-a.x,t.wz-a.z);if(d<nd){nd=d;near=a}}
      if(!near)continue;
      // (a rival that has rolled on past the finish is beyond the route's last point: search from the end)
      const tr=trackRoute(R,t.wx,t.wz,clamp(Math.floor(near.s/4),0,R.pts.length-1));if(tr.d>4.5)continue;
      const q=edgePos(R,tr.s);obs.push({s:tr.s,lat:tr.side,v:Math.max(0,t.v*(Math.sin(t.yaw)*q.dx+Math.cos(t.yaw)*q.dz)),tc:t})}}
  const pace=DIFFS[ev.diff].pace;
  for(const a of ev.ai){
    tickDamage(a,dt);
    // Finished rivals coast to a stop without receiving racing acceleration.
    if(a.fin){a.v=Math.max(0,a.v-2.5*dt);a.s+=a.v*dt}
    else if(ev.phase!=="count"){
      const i=Math.min(E.vp.length-1,Math.floor(a.s/4));
      const lead=a.s-ev.s,rb=lead>120?.9:lead<-150?1.07:1;
      let vt=Math.min(a.vmax,E.vp[i]*a.sk)*rb*pace*damagePower(a);
      // room for the others: closing on a car in its lane (another rival, or traffic), a rival moves out to pass once
      // the other lane is clear beside it, and holds back behind until then (two of them start in the same lane, and
      // used to drive through each other)
      let ahead=null,ag=1e9;
      for(const b of obs){const g=b.s-a.s;if(b!==a&&g>0&&g<(b.tc?30:16)&&Math.abs(b.lat-a.lat)<2.2&&g<ag){ag=g;ahead=b}}
      if(ahead){const other=Math.abs(a.lane-ev.lanes[0])<.1?ev.lanes[1]:ev.lanes[0];
        if(ahead.v<a.v+1&&obs.every(b=>b===a||Math.abs(b.lat-other)>2.2||b.s-a.s<-7||b.s-a.s>(b.tc?25:12)))a.lane=other;
        if(ag<(ahead.tc?22:10))vt=Math.min(vt,Math.max(0,ahead.v-(ag<6.5?1.5:0))+(ahead.tc?Math.max(0,ag-8)*.6:0))}
      a.v+=clamp(vt-a.v,-11*dt,a.acc*pace*Math.max(.15,1-(a.v/a.vmax)**2)*dt);
      // its finish time is when it reached the line within this frame (two cars over the line in the same frame are
      // placed by who got there first, not both given the frame's end)
      a.s+=a.v*dt;if(a.s>=R.len)a.fin=ev.t-(a.v>0?Math.min(dt,(a.s-R.len)/a.v):0);
      // keep out of the player's way
      const ds=ev.s-a.s;
      let nl=a.lat;
      if(ds>-3&&ds<16&&Math.abs(P.lat-a.lat)<2.4){
        const side=Math.sign(a.lat-P.lat||1);
        // If the player is near the edge, that side can run out of space to pass.
        const pass=Math.abs(P.lat-side*3.2)>=2.4?side:-side;
        nl+=clamp(pass*3.2-a.lat,-3*dt,3*dt);
      }else nl+=clamp(a.lane-a.lat,-1.4*dt,1.4*dt);
      nl=clamp(nl,-3.2,3.2);
      // a sideways move never takes it closer to a car level with it along the road (that left one inside the other,
      // and the spacing below then made the one behind drop back)
      if(!obs.some(b=>b!==a&&Math.abs(b.s-a.s)<5.4&&Math.abs(b.lat-nl)<1.9&&Math.abs(b.lat-nl)<Math.abs(b.lat-a.lat)))a.lat=nl;
      // and never closer than a car length to a rival ahead that is still level with it across the road (it drops back
      // to that at most 0.3 m a frame, so it never moves backwards on screen); behind a traffic car that has only just
      // come onto the route that close, it brakes hard instead
      for(const b of obs){const g=b.s-a.s;if(b!==a&&g>=0&&g<5&&Math.abs(b.lat-a.lat)<1.8){
        const closing=a.v-b.v;damageVehicle(a,closing);damageVehicle(b.tc||b,closing);
        if(b.tc)a.v=Math.min(a.v,b.v*.7);else{a.s=Math.max(b.s-5,a.s-.3);a.v=Math.min(a.v,b.v*.9)}
      }}
      // note any traffic car this rival is inside (dealt with below, once every rival has been seen)
      for(const b of obs)if(b.tc&&Math.abs(b.s-a.s)<4.6&&Math.abs(b.lat-a.lat)<1.8)b.tc.ovHit=true;
    }
    const q=edgePos(R,Math.min(a.s,R.len)),over=Math.max(0,a.s-R.len);a.x=q.x-q.dz*a.lat+q.dx*over;a.z=q.z+q.dx*a.lat+q.dz*over;a.yaw=Math.atan2(q.dx,q.dz);
    // on all four wheels on hills and crests (they used to sit level, nose in the road and tail in the air)
    seatCar(a,a.m.G,a.x,a.z,a.yaw,a.m.wb||1.45,a.m.tr||.92,dt,0);
    showDamageSmoke(a.m,a.damage||0,dt);
    for(const w of a.m.wheels)w.rotation.x+=a.v*dt/.36;
  }
  // a traffic car that stays inside any rival for 0.3 s (it came onto the route right there) is taken off the road and
  // put back somewhere out of sight, rather than the two staying inside each other. The time counts while it is inside
  // one rival or another (it used to start again whenever a rival it wasn't touching was looked at, so with three
  // rivals it could stay inside one for a second or more)
  for(const b of obs){const t=b.tc;if(!t||!t.e)continue;t.ovT=t.ovHit?(t.ovT||0)+dt:0;t.ovHit=false;
    if(t.ovT>.3){t.ovT=0;t.e=null;t.c.G.visible=false;t.wx=t.wz=1e6;t.lost=!spawnTraffic(t,220,560,true)}}
  // checkpoints
  const cps=E.cps;
  if(ev.phase==="run"&&ev.cp<cps.length&&ev.px!==null&&crossedGate(ev.gate,ev.px,ev.pz,P.x,P.z)){
    ev.cp++;ev.missT=0;
    // your time is when you reached the line within this frame, as the rivals' are
    if(ev.cp>=cps.length){finishEvent(ev.t-dt*(1-crossAt(ev.gate,ev.px,ev.pz,P.x,P.z)));return}
    ev.gate=gateOf(R,cps[ev.cp]);beep(700);
  }else if(ev.phase==="run"&&ev.cp<cps.length&&(ev.sNow>cps[ev.cp]+25||
      // the finish is the route's end, so progress can't run past it: there, being 25 m beyond the line counts
      (ev.cp===cps.length-1&&ev.sNow>=cps[ev.cp]-5&&(P.x-ev.gate.x)*ev.gate.dx+(P.z-ev.gate.z)*ev.gate.dz>25))){
    // went past a gate without driving through it: say so, once every few seconds
    ev.missT-=dt;if(ev.missT<=0){ev.missT=5;toast("MISSED CHECKPOINT","Drive back through "+(ev.cp===cps.length-1?"the finish line":"gate "+(ev.cp+1))+" to continue","bad")}
  }
  ev.px=P.x;ev.pz=P.z;
  placeGate(gates[0],R,cps[Math.min(ev.cp,cps.length-1)],ev.cp>=cps.length-1);
  if(ev.cp+1<cps.length)placeGate(gates[1],R,cps[ev.cp+1],ev.cp+1===cps.length-1);else gates[1].g.visible=false;
  // HUD
  $("evhud").classList.remove("hide");
  const pos=1+ev.ai.filter(a=>a.s>ev.s).length;
  $("evL1").textContent=E.type==="race"?"POSITION":"TARGET";
  // time trials: record this run every 0.1 s (kept as the ghost if it's a record), and show the record's ghost
  if(ev.rec&&ev.phase==="run"&&ev.rec.length<12000&&ev.t>=ev.rec.length/40){ev.rec.push(+P.x.toFixed(1),+P.z.toFixed(1),+P.h.toFixed(2),+ev.s.toFixed(1))}
  const g=ev.ghost&&save.ghostOn?ev.ghost:null;
  if(g){const at=ghostAt(g,ev.phase==="count"?0:ev.t),m=ghostModel(g.c);m.G.visible=!!at;
    if(at)seatCar(GH.o,m.G,at.x,at.z,at.h,m.wb||1.45,m.tr||.92,dt,rideH(m));
    for(const w of m.wheels)w.rotation.x+=(at?30:0)*dt/.36;
    // the gap: how much later than the ghost you reached the point you're at (+ behind, − ahead)
    let gap=null;if(ev.fin)gap=ev.fin.t-g.t;else if(ev.phase==="run"){const tg=ghostTimeAt(g,ev.s);if(tg!==null)gap=ev.t-tg}
    show("evGhost",true);const el=$("evGap");el.textContent=gap===null?"--":(gap>=0?"+":"\u2212")+Math.abs(gap).toFixed(1);el.classList.toggle("ahead",gap!==null&&gap<0);el.classList.toggle("behind",gap!==null&&gap>0)}
  else ghostHide();
  // over the line, the panel holds the time and place you finished with
  const tt=ev.fin?ev.fin.t:ev.t;
  $("evPos").textContent=E.type==="race"?(ev.fin?ev.fin.pos:pos)+"/"+(ev.ai.length+1):(tt<ev.tg.gold?"GOLD":tt<ev.tg.silver?"SILVER":tt<ev.tg.bronze?"BRONZE":"--");
  $("evTime").textContent=fmtT(Math.max(0,tt));
  $("evCp").textContent=ev.cp+"/"+cps.length;
}
function finishEvent(tx){
  const E=ev.E,t=tx!==undefined?tx:ev.t;let title,rew=0,rows=[],pos=0,medal=0;
  if(E.type==="race"){
    pos=1+ev.ai.filter(a=>a.fin&&a.fin<t).length;
    title=["1ST PLACE","2ND PLACE","3RD PLACE","4TH PLACE"][pos-1];rew=raceRewards(E,ev.diff)[pos-1]||0;
    rows.push(["Position",pos+" of 4"],["Difficulty",DIFFS[ev.diff].n]);
  }else{
    const G=ev.tg;medal=t<G.gold?0:t<G.silver?1:t<G.bronze?2:3;title=["GOLD","SILVER","BRONZE","NO MEDAL"][medal];rew=E.rewards[medal]||0;
    rows.push(["Gold time",fmtT(G.gold)]);
  }
  if(E.type==="race"){rew=Math.round(rew*skillFactor("driving"));skillAward("driving",30)}
  const cupRows=ev.cup?cupScore(ev.cup,E.type==="race"?pos-1:medal):null;
  const best=save.rec[E.id];const isRec=!best||t<best;if(isRec)save.rec[E.id]=t;
  // a record time trial run becomes the ghost (the last sample is the line itself)
  if(isRec&&ev.rec&&ev.rec.length>=8&&ev.rec.length<12000){ev.rec.push(+P.x.toFixed(1),+P.z.toFixed(1),+P.h.toFixed(2),+E.route.len.toFixed(1));save.ghost[E.id]={c:curCar().id,t,d:ev.rec}   /* a taken car's ghost is kept as the model it borrows: its made-up id means nothing after a reload, and the ghost was dropped */}
  rows.unshift(["Your time",fmtT(t)]);rows.push(["Best",fmtT(save.rec[E.id])+(isRec?"  · new record":"")],["Reward",rew?"+"+fmtCr(rew)+" CR":"none"]);
  if(cupRows)rows.push(...cupRows.rows);
  // finishing is fun, wherever you came (js/life.js); quitting isn't
  needsRace();
  if(rew)earn(rew);if(cupRows&&cupRows.prize)earn(cupRows.prize);persist();
  // the result shows once the car has stopped past the line (updateEvent): it used to show at once, with the car
  // frozen at race speed, which carried on the moment you pressed OK
  ev.phase="finish";ev.fin={t,pos,title,rows,T:0,next:cupRows&&cupRows.next};locked=true;
  $("count").textContent="FINISH";$("count").classList.remove("hide");beep(990);
}
function showResult(){
  const f=ev.fin;
  $("rType").textContent=ev.E.name.toUpperCase();$("rTitle").textContent=f.title;
  $("rRows").innerHTML=f.rows.map(r=>`<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");
  // in a championship with a round to go, NEXT ROUND opens it
  resNext=f.next||null;show("rNext",!!resNext);
  endEvent();P.vx=P.vz=0;P.r=0;autoHold=true;setState("RESULT");audioOn(false);$("result").classList.remove("hide");
}
let resNext=null;
function openIntro(E,cup){
  if(WORK.active){toast("LEAVE YOUR SHIFT FIRST");return}
  if(WANTED.lvl){wantedBlock();return}
  const rows=[["Distance",(E.route.len/1000).toFixed(1)+" km"]],G=cup&&E.type==="tt"?cupTimes(E,cup.cls):E;
  if(E.type==="tt")rows.push(["Gold / silver / bronze",fmtT(G.gold)+" / "+fmtT(G.silver)+" / "+fmtT(G.bronze)]);else rows.push(["Opponents",cup?"3 rivals in "+cup.cls+" cars":"3 rivals in cars near your class"]);
  if(cup)rows.push(["Cup points",E.type==="race"?"10 / 6 / 4 / 3 for 1st to 4th":"10 / 6 / 4 / 3 for gold to no medal"]);
  rows.push(["Rewards",(E.type==="race"?raceRewards(E,save.diff):E.rewards).map(fmtCr).join(" / ")+" CR"],["Your best",save.rec[E.id]?fmtT(save.rec[E.id]):"--"]);
  $("iType").textContent=(cup?cup.cls+" CUP · ROUND "+(cup.round+1)+" OF 3 · ":"")+(E.type==="tt"?"TIME TRIAL":"RACE");$("iName").textContent=E.name;
  $("iRows").innerHTML=rows.map(r=>`<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");
  // races: how fast the rivals drive, and what it pays
  const dz=$("iDiff");dz.innerHTML="";show("iDiff",E.type==="race");
  if(E.type==="race")DIFFS.forEach((d,k)=>{const b=document.createElement("button");b.className="mbtn"+(k===save.diff?" on":"");b.textContent=d.n;
    b.setAttribute("aria-pressed",k===save.diff?"true":"false");b.setAttribute("aria-label","Difficulty "+d.n+", rewards ×"+d.pay);b.onclick=()=>setDiff(k);dz.appendChild(b)});
  introE=E;introCup=cup||null;setState("INTRO");audioOn(false);$("intro").classList.remove("hide");
}
function setDiff(k){if(!introE||introE.type!=="race")return;save.diff=clamp(k,0,2);persist();openIntro(introE,introCup)}
let introE=null,introCup=null;

/* ================================================================ SPEED RADARS */
const RADARS=[];
function buildRadars(){
  const pick=[[1,.3],[1,.72],[0,.12],[0,.55],[4,.5],[6,.45]];
  const poleM=new THREE.MeshLambertMaterial({color:0x6a6f76}),camM=new THREE.MeshLambertMaterial({color:0xe9e9e6});
  let i=0;
  for(const[ri,f] of pick){
    const es=EDGES.filter(e=>e.ri===ri).sort((a,b)=>b.len-a.len);const e=es[0];if(!e)continue;
    const s=e.len*f,p=edgePos(e,s),rx=-p.dz,rz=p.dx,o=e.half+1.6,x=p.x+rx*o,z=p.z+rz*o,y=edgeY(e,s);
    const g=new THREE.Group();g.position.set(x,y,z);
    const pole=new THREE.Mesh(GEO.pole,poleM);pole.scale.set(1,5,1);pole.position.y=2.5;g.add(pole);
    const cam=new THREE.Mesh(GEO.box,camM);cam.scale.set(.6,.5,.9);cam.position.y=5.2;g.add(cam);
    g.rotation.y=Math.atan2(-p.dx,-p.dz);g.traverse(m=>m.castShadow=true);scene.add(g);
    addCircle(x,z,.4);
    RADARS.push({id:"r"+(i++),x:p.x,z:p.z,dx:p.dx,dz:p.dz,half:e.half+2,prev:null});
  }
}
// where the car was at the last radar check: a jump since then (resetting to the road, map travel, the garage, the end
// of an event) isn't a drive past a radar, so every radar forgets which side the car was on. A radar used to count a
// "crossing" when the car was put down on its other side
let radLast=null;
function updateRadars(dt){
  if(ev){radLast=null;return}
  // a jump: further than the car could have driven since the last check (twice its speed over the frame, plus a metre)
  const v=Math.hypot(P.vx,P.vz),far=Math.max(v,radLast?radLast.v:0)*(dt||.05)*2+1;
  if(!radLast||Math.hypot(P.x-radLast.x,P.z-radLast.z)>far){for(const r of RADARS)r.prev=null;radLast={x:P.x,z:P.z,v}}
  radLast.x=P.x;radLast.z=P.z;radLast.v=v;
  for(const r of RADARS){
    const dx=P.x-r.x,dz=P.z-r.z,al=dx*r.dx+dz*r.dz,side=Math.abs(dx*-r.dz+dz*r.dx);
    if(r.prev!==null&&al*r.prev<0&&side<r.half&&Math.abs(al)<15){
      const kph=Math.round(kphNow()),best=save.radar[r.id]||0;
      if(testDrive)toast("SPEED RADAR · "+kph+" KM/H","Test drive · records count in your own cars");
      else if(kph>best){save.radar[r.id]=kph;const cr=Math.round(kph*(best?12:18));earn(cr);toast("SPEED RADAR · "+kph+" KM/H",(best?"New record, was "+best:"First record")+" · +"+fmtCr(cr)+" CR","gold")}
      else toast("SPEED RADAR · "+kph+" KM/H","Record "+best+" km/h");
    }
    if(al!==0)r.prev=Math.abs(al)<60?al:null;
  }
}

/* ================================================================ GPS */
const gps={t:null,route:null,label:"",timer:0,remain:0};
function setGPS(x,z,label,forJob){gps.t={x,z};gps.label=label;gps.job=!!forJob;gps.timer=0;recalcGPS();if(gps.route&&!forJob)toast("GPS SET",label+" · "+(gps.route.len/1000).toFixed(1)+" km")}
function clearGPS(){gps.t=null;gps.route=null;gps.job=false;$("gpsTxt").textContent=""}
function recalcGPS(){if(!gps.t)return;gps.route=routeBetween(P.x,P.z,gps.t.x,gps.t.z)}
function updateGPS(dt){
  if(!gps.t||!gps.route){$("gpsTxt").textContent="";return}
  gps.timer-=dt;
  const R=gps.route,n=R.pts.length;let bi=0,bd=1e9;
  for(let i=0;i<Math.min(n,90);i++){const p=R.pts[i],d=(p.x-P.x)**2+(p.z-P.z)**2;if(d<bd){bd=d;bi=i}}
  if(Math.sqrt(bd)>40&&gps.timer<=0){gps.timer=1.5;recalcGPS();return}
  if(bi>2){gps.route=makePath(R.pts.slice(bi))}
  gps.remain=gps.route.len;
  if(!gps.job&&Math.hypot(P.x-gps.t.x,P.z-gps.t.z)<28){toast("ARRIVED",gps.label);clearGPS();return}
  $("gpsTxt").textContent="GPS · "+(gps.remain>=1000?(gps.remain/1000).toFixed(1)+" km":Math.round(gps.remain/10)*10+" m")+" · "+gps.label;
}
/* ================================================================ MONEY, LEVEL, TOASTS */
const lvlOf=xp=>1+Math.floor(Math.sqrt(xp/3000));
function earn(cr){save.cr=Math.max(0,save.cr+cr);if(cr>0){const l0=lvlOf(save.xp);save.xp+=cr;const l1=lvlOf(save.xp);if(l1>l0)toast("LEVEL "+l1,"Your driver level went up","gold")}persist();updateMoney()}
function updateMoney(){
  $("crv").textContent=fmtCr(save.cr);$("gcrv").textContent=fmtCr(save.cr);$("dcr").textContent=fmtCr(save.cr);
  const l=lvlOf(save.xp),a=(l-1)**2*3000,b=l*l*3000;$("lvv").textContent=l;$("xpf").style.width=clamp((save.xp-a)/(b-a),0,1)*100+"%";
}
function toast(t,sub,kind){
  const box=$("toasts"),d=document.createElement("div");d.className="toast "+(kind||"");
  const b=document.createElement("b");b.textContent=t;d.appendChild(b);
  if(sub){const s=document.createElement("span");s.textContent=sub;d.appendChild(s)}
  box.querySelector(".needHint")?.remove();   // an incoming message takes priority over a needs hint
  box.prepend(d);while(box.children.length>4)box.lastChild.remove();toastFit();
  setTimeout(()=>d.classList.add("out"),2800);setTimeout(()=>d.remove(),3200);
}
// On a phone held upright the messages sit in the column under the speedometer. They start below the free-ride score,
// the race panel or the contract panel when one is showing, and only as many as fit above the car (and above the
// test drive time, the GPS line or a prompt, if one reaches into the column) are shown, newest first; the newest always
// shows. Anywhere else they keep their usual place. It runs when a message comes up, when one of those panels comes or
// goes, when the left column changes height, and on each HUD tick while a message is up
function toastFit(){
  const box=$("toasts"),r=document.documentElement,kids=[...box.children];
  for(const c of kids)c.style.display="";
  if(!kids.length||!matchMedia("(max-width:560px)").matches){r.style.setProperty("--tsx","0px");return}
  const on=e=>!e.classList.contains("hide")&&!e.classList.contains("off")&&e.getClientRects().length>0;
  const base=box.getBoundingClientRect().top-(parseFloat(r.style.getPropertyValue("--tsx"))||0);
  const col=box.getBoundingClientRect(),need=kids[0].getBoundingClientRect().height;
  // what reaches into the column, top to bottom: the messages go under anything that starts above them (or too close
  // below for one to fit), and stop above the next thing down, or a little above the car
  const items=["streak","evhud","jobhud","tl","tdPill","gpsTxt","prompt"].map($).filter(on).map(e=>e.getBoundingClientRect())
    .filter(b=>b.right>col.left&&b.left<col.right).sort((a,b)=>a.top-b.top);
  let below=base,limit=innerHeight*.52;
  for(const b of items){if(b.top<below+need)below=Math.max(below,b.bottom+6);else{limit=Math.min(limit,b.top-6);break}}
  r.style.setProperty("--tsx",Math.ceil(below-base)+"px");
  let full=false;kids.forEach((c,i)=>{if(full||(i&&c.getBoundingClientRect().bottom>limit)){full=true;c.style.display="none"}});
}
addEventListener("resize",toastFit);
if(window.MutationObserver){const mo=new MutationObserver(toastFit);for(const id of ["streak","evhud","jobhud","tdPill","prompt"])mo.observe($(id),{attributes:true,attributeFilter:["class"]})}
const ZONES=[{n:"OLD QUAY",x:680,z:40},{n:"WESTHAVEN",x:-650,z:80,lz:150},{n:"CROWN RIDGE",x:-260,z:-160},{n:"NORTH POINT",x:0,z:-800},
  {n:"EASTBANK",x:450,z:-500},{n:"SOUTH BLUFF",x:60,z:680},{n:"CEDAR HEIGHTS",x:-480,z:470,lz:545},{n:"NORTH COMMON",x:-250,z:-650},{n:"CENTRAL GROVE",x:150,z:-250},{n:"EAST COVE",x:850,z:-420}];
const zoneAt=(x,z)=>{let b=ZONES[0],bd=1e18;for(const Z of ZONES){const d=(Z.x-x)**2+(Z.z-z)**2;if(d<bd){bd=d;b=Z}}return b.n};

/* ================================================================ HUD CANVASES */
const spc=$("speedo"),spx=spc.getContext("2d"),mm=$("mini"),mmx=mm.getContext("2d");
let SPS=220,MMS=184;
function fitCanvas(cv,css){const d=Math.min(devicePixelRatio,2);cv.width=css*d;cv.height=css*d;cv.style.width=css+"px";cv.style.height=css+"px";return d}
let spD=1,mmD=1;
// very short touch screens (a phone held sideways, 360 px tall on many Androids) get a smaller dial and minimap,
// so neither runs into the pedals and steering buttons below them
// On a phone the minimap sits under the money, level and place. When that block grows (the damage pill, the stars,
// the pistol) the minimap, and everything below it, moves down by as much: it used to cover the place and the clock
function hudStack(){
  const r=document.documentElement;r.style.setProperty("--tlx","0px");
  if(!isTouch)return;
  const tl=$("tl").getBoundingClientRect(),mw=$("minWrap").getBoundingClientRect();if(!tl.height||!mw.height)return;
  // The district clock stretches to the width of the damage label in this column.
  r.style.setProperty("--hud-left-clear",Math.ceil(tl.right+6)+"px");
  r.style.setProperty("--tlx",Math.max(0,Math.ceil(tl.bottom+6-mw.top))+"px");toastFit();
}
if(window.ResizeObserver)new ResizeObserver(hudStack).observe($("tl"));addEventListener("resize",hudStack);
function layoutHUD(){const small=isTouch||W<700,short=isTouch&&H<=400;SPS=small?(short?104:128):220;MMS=small?(short?100:118):184;spD=fitCanvas(spc,SPS);mmD=fitCanvas(mm,MMS)}
const RATIOS=[0,.2,.36,.52,.68,.84,1.05];
function gearInfo(kph,top,rev){
  if(rev)return{g:"R",n:1,rpm:clamp(kph/40,.12,.9)};
  if(kph<3)return{g:"N",n:0,rpm:.11};
  for(let g=1;g<=6;g++){const hi=top*RATIOS[g];if(kph<=hi||g===6){const lo=g===1?0:top*RATIOS[g-1]*.72;return{g:String(g),n:g,rpm:clamp((kph-lo)/(hi-lo),.12,1)}}}
}
function drawSpeedo(kph,rpm,gear){
  const S=SPS,c=spx,cx=S/2,cy=S/2,R=S*.43;c.setTransform(spD,0,0,spD,0,0);c.clearRect(0,0,S,S);
  c.fillStyle="rgba(10,12,15,.66)";c.beginPath();c.arc(cx,cy,S*.48,0,TAU);c.fill();
  const a0=Math.PI*.75,sw=Math.PI*1.5;
  for(let i=0;i<=40;i++){const a=a0+sw*i/40,maj=i%5===0,red=i>=34,r2=R-(maj?S*.07:S*.035);
    c.strokeStyle=red?"#f2b33d":maj?"rgba(255,255,255,.95)":"rgba(255,255,255,.4)";c.lineWidth=maj?2:1;
    c.beginPath();c.moveTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);c.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);c.stroke();
    if(maj&&S>150){c.fillStyle="rgba(255,255,255,.75)";c.font=`600 ${S*.055}px Barlow,Arial`;c.textAlign="center";c.textBaseline="middle";c.fillText(i/5,cx+Math.cos(a)*(R-S*.13),cy+Math.sin(a)*(R-S*.13))}}
  const t=clamp(rpm/8,0,1),an=a0+sw*t;
  c.strokeStyle="rgba(255,255,255,.18)";c.lineWidth=S*.03;c.beginPath();c.arc(cx,cy,R+S*.035,a0,a0+sw);c.stroke();
  c.strokeStyle=t>.85?"#f2b33d":"#fff";c.beginPath();c.arc(cx,cy,R+S*.035,a0,an);c.stroke();
  c.strokeStyle="#f2b33d";c.lineWidth=S*.014;c.beginPath();c.moveTo(cx+Math.cos(an)*S*.06,cy+Math.sin(an)*S*.06);c.lineTo(cx+Math.cos(an)*(R-S*.02),cy+Math.sin(an)*(R-S*.02));c.stroke();
  c.fillStyle="#fff";c.beginPath();c.arc(cx,cy,S*.03,0,TAU);c.fill();
  c.textAlign="center";c.textBaseline="alphabetic";
  c.font=`800 ${S*.2}px "Barlow Condensed","Arial Narrow",sans-serif`;c.fillText(Math.round(kph),cx,cy+S*.27);
  c.fillStyle="#9aa1a8";c.font=`700 ${S*.05}px Barlow,Arial`;c.fillText("KM/H",cx,cy+S*.35);
  c.fillStyle="rgba(255,255,255,.12)";c.fillRect(cx-S*.06,cy-S*.25,S*.12,S*.12);
  c.fillStyle="#fff";c.font=`800 ${S*.1}px "Barlow Condensed",sans-serif`;c.fillText(gear,cx,cy-S*.155);
}
let mapImg=null;const MAPX=1350;
// muted, hill-shaded island for both maps
function buildMapImage(){
  const N=isTouch?400:560;mapImg=document.createElement("canvas");mapImg.width=mapImg.height=N;const x=mapImg.getContext("2d"),im=x.createImageData(N,N);
  const st=MAPX*2/N;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const wx=(i/N*2-1)*MAPX,wz=(j/N*2-1)*MAPX,h=groundH(wx,wz),k=(j*N+i)*4;let r,g,b;
    if(h<0){const t=smooth(0,-10,h);r=lerp(58,22,t);g=lerp(118,52,t);b=lerp(140,80,t)}
    else if(h<3.2){r=200;g=188;b=152}
    else{const n=vegN(wx,wz),t=clamp(h/90,0,1);
      r=lerp(132,150,t);g=lerp(132,140,t);b=lerp(100,112,t);
      if(n>.55){r-=34;g-=16;b-=26}else if(n>.05){r-=12;g-=6;b-=12}
      const sh=clamp((groundH(wx-st*1.5,wz-st*1.5)-h)*.09,-.22,.28);r*=1+sh;g*=1+sh;b*=1+sh}
    im.data[k]=r;im.data[k+1]=g;im.data[k+2]=b;im.data[k+3]=255;
  }
  x.putImageData(im,0,0);
  // the rock islets offshore (Es Vedrà, Es Vedranell) are separate meshes, so draw them in too
  const sc=N/(MAPX*2);
  for(const I of ISLETS){x.save();x.translate((I.cx/MAPX+1)/2*N,(I.cz/MAPX+1)/2*N);x.rotate(-I.yaw);
    x.fillStyle="#9a917c";x.strokeStyle="#6d6658";x.lineWidth=1;x.beginPath();x.ellipse(I.L*.08*sc,0,I.L*.5*sc,I.Wd*.5*sc,0,0,TAU);x.fill();x.stroke();
    x.fillStyle="rgba(255,255,255,.18)";x.beginPath();x.ellipse(I.L*.08*sc-I.L*.08*sc,-I.Wd*.1*sc,I.L*.25*sc,I.Wd*.2*sc,0,0,TAU);x.fill();x.restore()}
}
const RSTYLE={highway:[18,"#ffffff"],coast:[12,"#f4f4f0"],country:[10,"#ebebe6"],town:[10,"#e2e2dc"],drive:[7,"#d4d4ce"]};
// roads keep a minimum on-screen width so they stay readable when zoomed out
function strokeRoads(c,scale,min){
  c.lineCap="round";c.lineJoin="round";
  for(const t in ROAD_PATHS){const[w]=RSTYLE[t];c.strokeStyle="rgba(10,14,18,.55)";c.lineWidth=Math.max(w+4,(min+2.5)/scale);c.stroke(ROAD_PATHS[t])}
  for(const t in ROAD_PATHS){const[w,col]=RSTYLE[t];c.strokeStyle=col;c.lineWidth=Math.max(w,min/scale);c.stroke(ROAD_PATHS[t])}
}
function drawRoute(c,R,scale,col,w){if(!R||R.pts.length<2)return;c.beginPath();c.moveTo(R.pts[0].x,R.pts[0].z);for(let i=1;i<R.pts.length;i++)c.lineTo(R.pts[i].x,R.pts[i].z);c.strokeStyle="rgba(0,0,0,.55)";c.lineWidth=(w+3)/scale;c.stroke();c.strokeStyle=col;c.lineWidth=w/scale;c.stroke()}
function dotAt(c,x,z,r,col,scale,ring){c.beginPath();c.arc(x,z,r/scale,0,TAU);c.fillStyle=col;c.fill();if(ring){c.lineWidth=2/scale;c.strokeStyle="#0d1a22";c.stroke()}}
// map icons drawn at a fixed screen size: house, dealership, event, radar
function icon(c,kind,x,z,scale,big){
  const u=(big?1.25:1)/scale;c.save();c.translate(x,z);c.scale(u,u);
  c.lineWidth=2;c.strokeStyle="#0d1a22";
  if(kind==="home"){c.fillStyle="#fff";c.beginPath();c.moveTo(0,-8);c.lineTo(8,0);c.lineTo(6,0);c.lineTo(6,7);c.lineTo(-6,7);c.lineTo(-6,0);c.lineTo(-8,0);c.closePath();c.stroke();c.fill()}
  else if(kind==="dealer"){c.fillStyle="#f2b33d";c.beginPath();c.arc(0,0,7.5,0,TAU);c.stroke();c.fill();c.fillStyle="#0d1a22";c.font="800 9px Barlow,Arial";c.textAlign="center";c.textBaseline="middle";c.fillText("$",0,.5)}
  else if(kind==="event"){c.fillStyle="#fff";c.beginPath();c.arc(0,0,7.5,0,TAU);c.stroke();c.fill();c.fillStyle="#0d1a22";c.beginPath();c.arc(0,0,3.2,0,TAU);c.fill()}
  else if(kind==="radar"){c.fillStyle="#c9ced4";c.fillRect(-4.5,-4.5,9,9);c.strokeRect(-4.5,-4.5,9,9)}
  else if(kind==="landmark"){c.fillStyle="#7fd1c7";c.beginPath();c.moveTo(0,-6.5);c.lineTo(6.5,0);c.lineTo(0,6.5);c.lineTo(-6.5,0);c.closePath();c.stroke();c.fill()}
  // your needs (js/life.js): the Market Kitchen, a bowl; the benches round the fountain, a bench
  else if(kind==="kitchen"){c.fillStyle="#e8846b";c.beginPath();c.arc(0,0,7.5,0,TAU);c.stroke();c.fill();c.fillStyle="#fff";c.beginPath();c.arc(0,-.5,4.6,0,Math.PI);c.closePath();c.fill();c.fillRect(-2.2,3.6,4.4,1.3)}
  else if(kind==="rest"){c.fillStyle="#8fc7e8";c.beginPath();c.arc(0,0,7.5,0,TAU);c.stroke();c.fill();c.fillStyle="#0d1a22";c.fillRect(-4.6,-1.4,9.2,2);c.fillRect(-3.8,.6,1.4,3.2);c.fillRect(2.4,.6,1.4,3.2)}
  else if(kind==="flag"){c.fillStyle="#f2b33d";c.beginPath();c.moveTo(0,0);c.lineTo(0,-14);c.lineTo(9,-10);c.lineTo(0,-6);c.stroke();c.fill();c.fillRect(-1,-14,2,14)}
  c.restore();
}
function carArrow(c,x,z,h,scale,big){
  c.save();c.translate(x,z);c.rotate(-h+Math.PI);const u=(big?1.2:1)/scale;c.scale(u,u);
  c.fillStyle="#fff";c.strokeStyle="#0d1a22";c.lineWidth=2;
  c.beginPath();c.moveTo(0,-10);c.lineTo(7,8);c.lineTo(0,3);c.lineTo(-7,8);c.closePath();c.fill();c.stroke();c.restore();
}
let miniZoom=2.4;
function drawMini(){
  const P=activePlayer();   // the map follows the walker or the boat when you're out of the car
  const S=MMS,c=mmx,R=S/2,py=R+S*.16;c.setTransform(mmD,0,0,mmD,0,0);c.clearRect(0,0,S,S);
  c.save();c.beginPath();c.arc(R,R,R-1,0,TAU);c.clip();
  c.fillStyle="#163450";c.fillRect(0,0,S,S);
  // zooms out as you go faster: about 250 m ahead when parked, 520 m at full speed
  const want=lerp(2.2,4.6,clamp(kphNow()/260,0,1))*(184/S);miniZoom+=(want-miniZoom)*.04;
  const sc=1/miniZoom,rot=-Math.PI/2-Math.atan2(Math.cos(P.h),Math.sin(P.h));
  c.translate(R,py);c.rotate(rot);c.scale(sc,sc);c.translate(-P.x,-P.z);
  c.globalAlpha=.78;c.imageSmoothingEnabled=true;c.drawImage(mapImg,-MAPX,-MAPX,MAPX*2,MAPX*2);c.globalAlpha=1;
  strokeRoads(c,sc,3);
  const route=ev?ev.R:gps.route;if(route)drawRoute(c,route,sc,"#f2b33d",5);
  for(const t of TRAFFIC)if(t.c.G.visible&&!t.cop)dotAt(c,t.wx,t.wz,2,"rgba(255,255,255,.6)",sc);
  // the police, on top: blue on patrol, flashing red and blue when they're after you
  for(const t of TRAFFIC)if(t.cop&&t.e&&(t.c.G.visible||t.chase))dotAt(c,t.wx,t.wz,3.4,t.chase?(copClock%.5<.25?"#e2483d":"#3d7bf2"):"#3d7bf2",sc,true);
  if(ev)for(const a of ev.ai)dotAt(c,a.x,a.z,3.6,"#e2483d",sc,true);
  if(NET.room)netMini(c,sc);   // friends, when playing together
  // first-aid kits within 150 m, as a small green cross
  for(const k of KITS)if(k.back<=0&&Math.hypot(k.x-P.x,k.z-P.z)<150){c.fillStyle="#3fbf6a";const u=3/sc;c.fillRect(k.x-u,k.z-u*3,u*2,u*6);c.fillRect(k.x-u*3,k.z-u,u*6,u*2)}
  const hm=gW(0,-8);
  // icons stay upright: undo the map rotation around each one
  const up=(fn,x,z)=>{c.save();c.translate(x,z);c.rotate(-rot);fn();c.restore()};
  up(()=>icon(c,"home",0,0,sc),hm.x,hm.z);up(()=>icon(c,"dealer",0,0,sc),DEALER_MARK.x,DEALER_MARK.z);
  if(!ev)for(const E of EVENTS)up(()=>icon(c,"event",0,0,sc),E.x,E.z);
  if(gps.t&&!ev)up(()=>icon(c,"flag",0,0,sc),gps.t.x,gps.t.z);
  c.restore();c.setTransform(mmD,0,0,mmD,0,0);
  // destination beyond the edge: a marker on the rim pointing at it
  const tgt=ev?null:gps.t;
  if(tgt){const dx=tgt.x-P.x,dz=tgt.z-P.z,d=Math.hypot(dx,dz);
    if(d*sc>R-14){const a=Math.atan2(dz,dx)+rot,mx=R+Math.cos(a)*(R-9),my=R+Math.sin(a)*(R-9);c.fillStyle="#f2b33d";c.strokeStyle="#0d1a22";c.lineWidth=1.5;c.beginPath();c.arc(mx,my,5,0,TAU);c.fill();c.stroke()}}
  c.fillStyle="#fff";c.strokeStyle="#0d1a22";c.lineWidth=1.5;
  c.beginPath();c.moveTo(R,py-9);c.lineTo(R+7,py+7);c.lineTo(R,py+2);c.lineTo(R-7,py+7);c.closePath();c.fill();c.stroke();
  const na=rot-Math.PI/2,nx=R+Math.cos(na)*(R-12),ny=R+Math.sin(na)*(R-12);
  c.fillStyle="rgba(13,26,34,.85)";c.beginPath();c.arc(nx,ny,8,0,TAU);c.fill();
  c.fillStyle="#fff";c.font="700 11px Barlow,Arial";c.textAlign="center";c.textBaseline="middle";c.fillText("N",nx,ny+.5);
  c.strokeStyle="rgba(255,255,255,.4)";c.lineWidth=1.5;c.beginPath();c.arc(R,R,R-1,0,TAU);c.stroke();
}

/* ================================================================ FULL MAP (drag to pan, wheel / pinch / buttons to zoom) */
const mapc=$("mapc"),mpx=mapc.getContext("2d");
const MV={z:1,cx:0,cz:0,s:1,ox:0,oy:0};
function mapBase(){const w=innerWidth,h=innerHeight,side=w>700?250:0;return{w,h,side,s0:Math.min((w-side)/(MAPX*1.7),h/(MAPX*1.7)),ox:side+(w-side)/2,oy:h/2}}
function mapToWorld(sx,sy){return{x:(sx-MV.ox)/MV.s+MV.cx,z:(sy-MV.oy)/MV.s+MV.cz}}
function mapZoomAt(f,sx,sy){const before=mapToWorld(sx,sy);MV.z=clamp(MV.z*f,1,10);const b=mapBase();MV.s=b.s0*MV.z;const after=mapToWorld(sx,sy);MV.cx+=before.x-after.x;MV.cz+=before.z-after.z;clampMap()}
function clampMap(){const lim=MAPX*.95;MV.cx=clamp(MV.cx,-lim,lim);MV.cz=clamp(MV.cz,-lim,lim)}
function mapMarkers(){
  const hm=gW(0,-8);
  /** @type {any[]} */
  const list=[{x:hm.x,z:hm.z,name:"Your house",desc:"Change car, paint it, or pick another",kind:"home",act:"home"},{x:DEALER_MARK.x,z:DEALER_MARK.z,name:"Auto Gallery",desc:"Buy, sell and test drive cars",kind:"dealer",act:"dealer"}];
  for(const E of EVENTS)list.push({x:E.x,z:E.z,name:E.name,desc:(E.type==="tt"?"Time trial":"Race")+" · "+(E.route.len/1000).toFixed(1)+" km"+(save.rec[E.id]?" · best "+fmtT(save.rec[E.id]):""),kind:"event",act:"event",E});
  for(const r of RADARS)list.push({x:r.x,z:r.z,name:"Speed radar",desc:save.radar[r.id]?"Record "+save.radar[r.id]+" km/h":"No record yet",kind:"radar"});
  // where your needs are seen to (js/life.js)
  if(QUAY.kitchen)list.push({x:QUAY.kitchen.sx,z:QUAY.kitchen.sz,name:"Market Kitchen",desc:"A free meal · hunger +35",kind:"kitchen"});
  list.push({x:QUAY.fountain[0],z:QUAY.fountain[1],name:"Benches by the fountain",desc:"Sit down to rest · energy up to +15",kind:"rest"});
  // landmarks show once found (the passport keeps the rest a secret)
  for(const L of LANDMARKS)if(save.found[L.id])list.push({x:L.x,z:L.z,name:L.name,desc:"Landmark · found",kind:"landmark"});
  return list;
}
function drawMap(){
  const d=Math.min(devicePixelRatio,2),b=mapBase();
  if(mapc.width!==Math.round(b.w*d)||mapc.height!==Math.round(b.h*d)){mapc.width=Math.round(b.w*d);mapc.height=Math.round(b.h*d)}
  MV.s=b.s0*MV.z;MV.ox=b.ox;MV.oy=b.oy;const s=MV.s;
  const c=mpx;c.setTransform(d,0,0,d,0,0);c.fillStyle="#163450";c.fillRect(0,0,b.w,b.h);
  c.save();c.translate(MV.ox,MV.oy);c.scale(s,s);c.translate(-MV.cx,-MV.cz);
  c.imageSmoothingEnabled=true;c.drawImage(mapImg,-MAPX,-MAPX,MAPX*2,MAPX*2);
  strokeRoads(c,s,MV.z>3?3:2);
  if(gps.route)drawRoute(c,gps.route,s,"#f2b33d",5);
  c.font=`700 ${12/s}px Barlow,Arial`;c.textAlign="center";c.textBaseline="middle";
  for(const Z of ZONES){const lx=Z.lx??Z.x,lz=Z.lz??Z.z;c.fillStyle="rgba(13,26,34,.6)";const tw=c.measureText(Z.n).width;c.fillRect(lx-tw/2-5/s,lz-26/s,tw+10/s,16/s);c.fillStyle="#fff";c.fillText(Z.n,lx,lz-18/s)}
  for(const m of mapMarkers())icon(c,m.kind,m.x,m.z,s,true);
  if(gps.t)icon(c,"flag",gps.t.x,gps.t.z,s,true);
  if(NET.room)netMap(c,s);
  const player=activePlayer();
  carArrow(c,player.x,player.z,player.h,s,true);
  c.restore();
  // scale bar
  const m=MV.z<2?500:MV.z<5?200:100,px=m*s,x0=16;c.fillStyle="rgba(13,26,34,.8)";c.fillRect(x0,b.h-40,px+20,24);
  c.fillStyle="#fff";c.fillRect(x0+10,b.h-24,px,2);c.font="700 11px Barlow,Arial";c.textAlign="center";c.fillText(m+" m",x0+10+px/2,b.h-31);
}
function openMapPopup(sx,sy){
  const w=mapToWorld(sx,sy),pop=$("mapPop");
  let best=null,bd=20/MV.s;for(const m of mapMarkers()){const d=Math.hypot(m.x-w.x,m.z-w.z);if(d<bd){bd=d;best=m}}
  pop.innerHTML="";
  if(!best){
    const nr=nearestRoadGlobal(w.x,w.z,true);
    if(nr&&nr.d<40/MV.s+15){if(job){mapPopNote(sx,sy,"The GPS is following your contract. Finish or abandon it to set a waypoint.");return}setGPS(nr.x,nr.z,"Waypoint")}
    pop.classList.add("hide");return;
  }
  const b=document.createElement("b");b.textContent=best.name;const sp=document.createElement("span");sp.textContent=best.desc;pop.append(b,sp);
  if(job){const n=document.createElement("span");n.className="note";n.textContent="The GPS is following your contract.";pop.append(n)}
  else{const g=document.createElement("button");g.className="mbtn pri";g.textContent="SET GPS";g.onclick=()=>{setGPS(best.x,best.z,best.name);pop.classList.add("hide")};pop.append(g)}
  if(best.act&&!ev&&!testDrive&&!job&&!WANTED.lvl){const t=document.createElement("button");t.className="mbtn";t.textContent="TRAVEL THERE";t.onclick=()=>{pop.classList.add("hide");fastTravel(best)};pop.append(t)}
  pop.style.left=Math.max(8,Math.min(innerWidth-236,sx+12))+"px";pop.style.top=Math.max(8,Math.min(innerHeight-170,sy+12))+"px";pop.classList.remove("hide");
}
function mapPopNote(sx,sy,text){const pop=$("mapPop");pop.innerHTML="";const n=document.createElement("span");n.className="note";n.textContent=text;pop.append(n);
  pop.style.left=Math.max(8,Math.min(innerWidth-236,sx+12))+"px";pop.style.top=Math.max(8,Math.min(innerHeight-170,sy+12))+"px";pop.classList.remove("hide")}
const mptr=new Map();let mDrag=null,mPinch=null;
// a pinch belongs to two particular fingers (the first two down). Its starting spread and zoom are only ever
// compared with those same two fingers: when one of them lifts and two or more are still down, the pinch starts
// afresh from the fingers now on the glass, so the zoom can't jump by comparing one pair's spread with another's
function pinchStart(){const it=[...mptr.entries()];if(it.length<2){mPinch=null;return}const[[ia,a],[ib,b]]=it;mPinch={ia,ib,d:Math.max(8,Math.hypot(a.x-b.x,a.y-b.y)),z:MV.z};mDrag=null}
mapc.addEventListener("pointerdown",e=>{if(e.button!==0)return;try{mapc.setPointerCapture(e.pointerId)}catch(err){}mptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(mptr.size===1)mDrag={x:e.clientX,y:e.clientY,cx:MV.cx,cz:MV.cz,moved:0};
  else if(!mPinch)pinchStart()});
mapc.addEventListener("pointermove",e=>{if(!mptr.has(e.pointerId))return;mptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(mPinch){const a=mptr.get(mPinch.ia),b=mptr.get(mPinch.ib);if(a&&b){const d=Math.max(8,Math.hypot(a.x-b.x,a.y-b.y));mapZoomAt(mPinch.z*d/mPinch.d/MV.z,(a.x+b.x)/2,(a.y+b.y)/2)}return}
  if(mDrag){const dx=e.clientX-mDrag.x,dy=e.clientY-mDrag.y;mDrag.moved=Math.max(mDrag.moved,Math.hypot(dx,dy));if(mDrag.moved>5){MV.cx=mDrag.cx-dx/MV.s;MV.cz=mDrag.cz-dy/MV.s;clampMap();$("mapPop").classList.add("hide")}}});
const mapUp=e=>{const id=e.pointerId;if(!mptr.delete(id))return;
  if(mDrag&&mDrag.moved<=5&&e.type==="pointerup")openMapPopup(e.clientX,e.clientY);
  if(mPinch){
    // pinch ended with one finger still down: that finger pans from here (marked as moved, so lifting it is not a tap)
    if(mptr.size===1){const[r]=[...mptr.values()];mDrag={x:r.x,y:r.y,cx:MV.cx,cz:MV.cz,moved:6};mPinch=null}
    else if(mptr.size>=2&&(id===mPinch.ia||id===mPinch.ib))pinchStart();
    else if(!mptr.size)mPinch=null;
  }
  if(!mptr.size)mDrag=null};
["pointerup","pointercancel","lostpointercapture"].forEach(type=>mapc.addEventListener(type,mapUp));
mapc.addEventListener("wheel",e=>{e.preventDefault();mapZoomAt(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY)},{passive:false});
$("mapIn").onclick=()=>mapZoomAt(1.6,MV.ox,MV.oy);
$("mapOut").onclick=()=>mapZoomAt(1/1.6,MV.ox,MV.oy);
$("mapMe").onclick=()=>{const player=activePlayer();MV.cx=player.x;MV.cz=player.z;if(MV.z<2.5)MV.z=2.5;clampMap()};
