// Port Meridien: The Explorer Passport, contracts and class championships.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;
/* ================================================================ EXPLORER PASSPORT
   Landmarks to find by driving to them. Each one is a point on a real road, picked when the island is built
   by a rule over the actual roads and terrain (the highest road, the road nearest Es Vedrà, the tightest bend,
   the road nearest each place the map names, ...), kept apart from each other and from the prompts at the
   house, the dealership and the event starts. Every landmark has a stable id; what has been found is saved
   by id (save.found), so renaming or reordering them later keeps a player's progress.
   A landmark counts only when the car is driven into it: within 26 m, after driving at least 25 m since it
   was last put anywhere (a reset, map travel, an event start, leaving the dealership), so opening the map,
   setting the GPS or being placed next to one never counts. Each pays once; finding them all pays a bonus once. */
const LANDMARK_REWARD=2500,PASSPORT_BONUS=30000,LM_R=26;
const LANDMARKS=[];
const PZ={driven:0,lx:null,lz:null,from:null};
function buildLandmarks(){
  LANDMARKS.length=0;
  const pts=[];
  for(const e of EDGES){if(e.type==="drive")continue;for(let s=6;s<=e.len-6;s+=6){const p=edgePos(e,s);pts.push({e,s,x:p.x,z:p.z,y:edgeY(e,s)})}}
  const hm=gW(0,-8),avoid=[...EVENTS.map(E=>[E.x,E.z]),[hm.x,hm.z],[DEALER_MARK.x,DEALER_MARK.z]];
  const free=q=>avoid.every(([x,z])=>Math.hypot(x-q.x,z-q.z)>=80)&&LANDMARKS.every(L=>Math.hypot(L.x-q.x,L.z-q.z)>=160);
  const best=(score,ok)=>{let b=null,bs=-Infinity;for(const q of pts){if(!free(q)||(ok&&!ok(q)))continue;const v=score(q);if(v>bs){bs=v;b=q}}return b};
  const add=(id,name,hint,q)=>{if(q)LANDMARKS.push({id,name,hint,x:+q.x.toFixed(1),z:+q.z.toFixed(1),road:q.e.type})};
  // bends: heading change over 20 m of road, away from junctions (where roads meet at an angle)
  const head=(e,s)=>{const p=edgePos(e,s);return Math.atan2(p.dx,p.dz)};
  const nearJn=q=>NODES.some(n=>n.adj.length>2&&Math.hypot(n.x-q.x,n.z-q.z)<35);
  const bend=q=>q.s<10||q.s>q.e.len-10?0:Math.abs(wrapA(head(q.e,q.s+10)-head(q.e,q.s-10)));
  const rock=ISLETS.reduce((a,b)=>!a||b.L>a.L?b:a,null);
  add("talaia_summit","Crown Ridge Summit","The highest point any road in the region reaches",best(q=>q.y));
  if(rock)add("vedra_lookout","Sentinel Rock Lookout","Where a road looks out to the great rock standing in the sea",best(q=>-Math.hypot(q.x-rock.cx,q.z-rock.cz)));
  add("sea_level_road","Sea-Level Road","The lowest stretch of road in the region, just above the waves",best(q=>-q.y));
  add("the_hairpin","The Hairpin","The tightest bend in the road network",best(bend,q=>!nearJn(q)));
  add("north_cape","North Cape","As far north as the roads go",best(q=>-q.z));
  add("south_cape","South Cape","As far south as the roads go",best(q=>q.z));
  add("east_cape","East Cape","As far east as the roads go",best(q=>q.x));
  add("west_cape","West Cape","As far west as the roads go",best(q=>-q.x));
  // the places the map names: the nearest road within 260 m of each
  const side=(x,z)=>{const ns=z<-250?"north":z>250?"south":"",ew=x<-250?"west":x>250?"east":"";return ns&&ew?ns+"-"+ew:ns||ew||"middle"};
  for(const[id,zn,name] of [["eivissa_town","OLD QUAY","Old Quay"],["santa_eularia","EASTBANK","Eastbank"],["sant_antoni","WESTHAVEN","Westhaven"],
      ["sant_josep","CEDAR HEIGHTS","Cedar Heights"],["sant_joan","NORTH COMMON","North Common"],["sant_llorenc","CENTRAL GROVE","Central Grove"],
      ["cala_llonga","EAST COVE","East Cove"],["portinatx","NORTH POINT","North Point"],["es_cubells","SOUTH BLUFF","South Bluff"],["sa_talaia_pass","CROWN RIDGE","Crown Ridge Pass"]]){
    const Z=ZONES.find(z=>z.n===zn);if(!Z)continue;
    add(id,name,"A place on the map, in the "+side(Z.x,Z.z)+" of the region",best(q=>-Math.hypot(q.x-Z.x,q.z-Z.z),q=>Math.hypot(q.x-Z.x,q.z-Z.z)<260));
  }
  // first visits only count from the next drive on, so a landmark next to wherever the car starts isn't found by standing still
  PZ.driven=0;PZ.lx=null;
}
const foundCount=(found=save.found)=>LANDMARKS.filter(L=>found&&(found[L.id]===1||found[L.id]===true)).length;
function discoverLandmark(L){
  if(!L||save.found[L.id])return false;
  save.found[L.id]=1;
  const n=foundCount(),done=n>=LANDMARKS.length&&!save.passBonus;if(done)save.passBonus=true;
  earn(LANDMARK_REWARD);
  toast("LANDMARK DISCOVERED",L.name+" · +"+fmtCr(LANDMARK_REWARD)+" CR · "+n+"/"+LANDMARKS.length,"gold");
  if(done){earn(PASSPORT_BONUS);toast("EXPLORER PASSPORT COMPLETE","Every landmark found · +"+fmtCr(PASSPORT_BONUS)+" CR","gold")}
  if(!$("passport").classList.contains("hide"))renderPassport();
  return true;
}
// once a frame while driving
function updatePassport(){
  // how far the car has been driven since it was last put somewhere: a jump of more than 15 m in one frame is a placement
  if(PZ.lx!==null){const d=Math.hypot(P.x-PZ.lx,P.z-PZ.lz);PZ.driven=d>15?0:Math.min(1e6,PZ.driven+d)}
  PZ.lx=P.x;PZ.lz=P.z;
  if(PZ.driven<25)return;
  for(const L of LANDMARKS)if(!save.found[L.id]&&(P.x-L.x)**2+(P.z-L.z)**2<LM_R*LM_R)discoverLandmark(L);
}
// ---- the passport screen (from the pause menu or the map): found ones by name with a GPS button, the rest as hints
function renderPassport(){
  const n=foundCount(),N=LANDMARKS.length,pct=N?Math.round(n/N*100):0;
  $("pzCount").textContent=n+" of "+N+" found · "+pct+"%";$("pzBar").style.width=pct+"%";
  $("pzNote").textContent=save.passBonus?"Complete. The "+fmtCr(PASSPORT_BONUS)+" CR bonus has been paid.":fmtCr(LANDMARK_REWARD)+" CR for each new landmark, and "+fmtCr(PASSPORT_BONUS)+" CR for finding them all.";
  const list=$("pzList");list.innerHTML="";
  for(const L of LANDMARKS){
    const f=!!save.found[L.id],row=document.createElement("div");row.className="pzr"+(f?" found":"");
    const t=document.createElement("div"),b=document.createElement("b"),sp=document.createElement("span");
    // the description only: naming the nearest place on the map could give away another landmark's name
    b.textContent=f?L.name:"Not found yet";sp.textContent=L.hint;t.append(b,sp);row.appendChild(t);
    if(f){const g=document.createElement("button");g.className="mbtn";g.textContent="SET GPS";g.setAttribute("aria-label","Set the GPS to "+L.name);g.onclick=()=>passportGPS(L);row.appendChild(g)}
    list.appendChild(row);
  }
}
function passportOpen(){if(state!=="PAUSE"&&state!=="MAP")return;PZ.from=state;$("pzMsg").textContent="";renderPassport();show("passport",true);try{$("pzClose").focus({preventScroll:true})}catch(e){}}
function passportClose(){show("passport",false)}
function passportGPS(L){
  if(typeof job!=="undefined"&&job){$("pzMsg").textContent="The GPS is following your contract. Finish or abandon it to set another destination.";return}
  setGPS(L.x,L.z,L.name);passportClose();
  if(state==="PAUSE")pauseOff();
}
$("pPass").onclick=passportOpen;$("mapPass").onclick=passportOpen;$("pzClose").onclick=passportClose;

/* ================================================================ CONTRACTS
   Optional, repeatable driving jobs between the island's towns: parcel deliveries, timed courier runs and
   scenic tours. Pickups, drop-offs and tour stops are points on real roads near each town the map names, kept
   clear of the landmarks (contracts don't lead you to undiscovered ones), of the prompts and of each other.
   (East Cove has no contract point: its only road is shared with two landmarks.)
   A contract is available -> active -> completed | failed | abandoned. Only one runs at a time; it pays once,
   on completion, inside a guard that ends the contract first, so nothing (arriving again, a second callback)
   can pay twice. While one runs it owns the GPS, races and test drives wait, map travel is off, and going home
   ends it. Its timer, like a race's, only runs while you drive (pause, the map, the dealership and photo mode
   stop it). A contract isn't kept across a reload: the page records that one was under way, and the next time
   the game starts it says so, pays nothing, and clears it. */
const JOB_R=16,JOB_KPH=30;
const JOB_TYPES={parcel:"PARCEL DELIVERY",courier:"TIMED COURIER",tour:"SCENIC TOUR"};
const JOB_TOWNS=[["eivissa","OLD QUAY","Old Quay"],["santa_eularia","EASTBANK","Eastbank"],["sant_antoni","WESTHAVEN","Westhaven"],["sant_josep","CEDAR HEIGHTS","Cedar Heights"],
  ["sant_joan","NORTH COMMON","North Common"],["sant_llorenc","CENTRAL GROVE","Central Grove"],["portinatx","NORTH POINT","North Point"],["es_cubells","SOUTH BLUFF","South Bluff"]];
// the curated set, by stable id; stops are town points. Courier limits are the route's ideal time (the same
// model the races' medal times use) times `slack`, plus 15 s
const JOB_DEFS=[
  {id:"parcel_eivissa_santaeularia",type:"parcel",stops:["eivissa","santa_eularia"]},
  {id:"parcel_santantoni_santjosep",type:"parcel",stops:["sant_antoni","sant_josep"]},
  {id:"parcel_santllorenc_portinatx",type:"parcel",stops:["sant_llorenc","portinatx"]},
  {id:"courier_eivissa_santantoni",type:"courier",stops:["eivissa","sant_antoni"],slack:2},
  {id:"courier_santaeularia_eivissa",type:"courier",stops:["santa_eularia","eivissa"],slack:1.6},
  {id:"courier_santjoan_escubells",type:"courier",stops:["sant_joan","es_cubells"],slack:1.35},
  {id:"tour_north",type:"tour",title:"Northern villages",stops:["sant_llorenc","sant_joan","portinatx","santa_eularia"]},
  {id:"tour_southwest",type:"tour",title:"South and west",stops:["sant_antoni","sant_josep","es_cubells"]},
  {id:"tour_eastside",type:"tour",title:"East side",stops:["eivissa","santa_eularia","sant_llorenc"]}];
const JOB_PTS={},JOBS=[];
let job=null,jobMk=null;const jobNotices=[];
function idealTime(R){
  const Q=resample(R,4),n=Q.pts.length,ang=[],k=[];
  for(let i=0;i<n;i++){const a=Q.pts[Math.max(0,i-1)],b=Q.pts[Math.min(n-1,i+1)];ang.push(Math.atan2(b.x-a.x,b.z-a.z))}
  for(let i=0;i<n;i++)k.push(Math.abs(wrapA(ang[Math.min(n-1,i+2)]-ang[Math.max(0,i-2)]))/16+1e-4);
  return routeTime(k,13,62,5.5,8);
}
const fmtSecs=t=>{t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+":"+String(t%60).padStart(2,"0")};
const round100=v=>Math.round(v/100)*100;
function buildJobs(){
  const pts=[];for(const e of EDGES){if(e.type==="drive")continue;for(let s=6;s<=e.len-6;s+=6){const p=edgePos(e,s);pts.push({x:p.x,z:p.z})}}
  const hm=gW(0,-8),avoid=[...EVENTS.map(E=>[E.x,E.z,80]),[hm.x,hm.z,80],[DEALER_MARK.x,DEALER_MARK.z,80],...LANDMARKS.map(L=>[L.x,L.z,120])];
  for(const[id,zn,name] of JOB_TOWNS){const Z=ZONES.find(z=>z.n===zn);if(!Z)continue;let b=null,bd=1e9;
    // within 300 m, and nearer this town than any other the map names, so a contract never says one town and means another
    for(const q of pts){const d=Math.hypot(q.x-Z.x,q.z-Z.z);if(d>=bd||d>300||zoneAt(q.x,q.z)!==zn)continue;
      if(avoid.some(([x,z,r])=>Math.hypot(x-q.x,z-q.z)<r))continue;if(Object.values(JOB_PTS).some(o=>Math.hypot(o.x-q.x,o.z-q.z)<150))continue;bd=d;b=q}
    if(b)JOB_PTS[id]={id,name,x:+b.x.toFixed(1),z:+b.z.toFixed(1)}}
  JOBS.length=0;
  for(const d of JOB_DEFS){
    const stops=d.stops.map(k=>JOB_PTS[k]);if(stops.some(s=>!s))continue;
    const legs=[];for(let i=1;i<stops.length;i++){const r=routeBetween(stops[i-1].x,stops[i-1].z,stops[i].x,stops[i].z);if(!r){legs.length=0;break}legs.push(r)}
    if(legs.length!==stops.length-1)continue;
    const len=legs.reduce((a,r)=>a+r.len,0),J={id:d.id,type:d.type,stops,len};
    if(d.type==="parcel"){J.title=stops[0].name+" to "+stops[1].name;J.reward=round100(900+len*3.2);J.diff=len<1300?"Easy":len<2300?"Medium":"Hard"}
    else if(d.type==="courier"){J.title=stops[0].name+" to "+stops[1].name;J.limit=Math.ceil(idealTime(legs[0])*d.slack+15);J.reward=round100(1500+len*5.5);J.diff=d.slack>=1.9?"Easy":d.slack>=1.5?"Medium":"Hard"}
    else{J.title=d.title;J.reward=round100(800+len*2.4+400*stops.length);J.diff=len<2500?"Easy":len<4200?"Medium":"Hard"}
    JOBS.push(J);
  }
  // a contract under way when the page was closed is cancelled now, unpaid, and you're told so when you next drive
  if(save.jobActive){const J=JOBS.find(j=>j.id===save.jobActive.id);
    jobNotices.push(["CONTRACT CANCELLED",(J?J.title+": t":"T")+"he game was closed during the contract, so it ended without a reward"]);
    save.jobActive=null;save.jobs.abandoned++;persist()}
}
function jobTarget(){if(!job)return null;return job.def.stops[job.stop]}
function jobObjective(){
  if(!job)return "";const J=job.def,t=jobTarget();
  if(J.type==="tour")return "Stop "+(job.stop+1)+" of "+J.stops.length+": "+t.name;
  return job.stop===0?"Pick up the parcel in "+t.name:"Deliver it to "+t.name;
}
function jobMarker(on){
  if(!jobMk){jobMk=marker(0,0,true,0xf2b33d);jobMk.visible=false}
  if(!on||!job){jobMk.visible=false;return}
  const t=jobTarget(),y=surfH(t.x,t.z)+.2;jobMk.children[0].position.set(t.x,y,t.z);if(jobMk.children[1])jobMk.children[1].position.set(t.x,y+35,t.z);jobMk.visible=true;
}
function jobAim(){const t=jobTarget();setGPS(t.x,t.z,t.name,true);jobMarker(true);jobHUD()}
// can a contract start now? the reason if not
function jobBlocked(){if(WORK.active)return "Leave your kitchen shift first";if(WANTED.lvl)return "Lose the police first";if(job)return "Finish or abandon your current contract first";if(ev)return "Not during a race";if(testDrive)return "Not during a test drive";return ""}
function jobStart(J){
  if(!J||jobBlocked()||(state!=="DRIVE"&&state!=="PAUSE"))return false;
  // a free-ride streak in progress is paid out now (streaks don't score during a contract, as in a race)
  if(FR.pts>0){const cr=Math.round(FR.pts);earn(cr);toast("STREAK BANKED","+"+fmtCr(cr)+" CR","gold")}streakReset();
  job={def:J,stop:0,left:J.type==="courier"?J.limit:null,timing:false,ended:false,t:0};
  save.jobActive={id:J.id};persist();
  jobAim();show("jobhud",true);
  toast(JOB_TYPES[J.type],jobObjective()+(J.type==="courier"?" · the clock starts at pickup":""));
  return true;
}
// the one way a contract ends: completed (pays, once), failed or abandoned (never pays)
function jobEnd(how,why){
  if(!job||job.ended)return false;
  const J=job.def;job.ended=true;job=null;
  save.jobActive=null;
  if(how==="completed"){save.jobs[J.type]++;save.jobs.runs[J.id]=(save.jobs.runs[J.id]||0)+1;save.jobs.earned+=J.reward}else save.jobs[how==="failed"?"failed":"abandoned"]++;
  if(how==="completed")earn(J.reward);else persist();
  clearGPS();jobMarker(false);show("jobhud",false);
  if(how==="completed")toast("CONTRACT COMPLETE",J.title+" · +"+fmtCr(J.reward)+" CR","gold");
  else if(how==="failed")toast("CONTRACT FAILED",why||"No reward","bad");
  else if(why)toast("CONTRACT ABANDONED",why,"bad");
  if(!$("jobs").classList.contains("hide"))renderJobs();
  return true;
}
// the same contract again from the start. Nothing changes if it couldn't start again now (the police after you): the
// delivery under way and its clock carry on. It used to end the contract first and then fail to start the new one,
// so it counted as abandoned and the route was gone (Codex's audit, 24 Nov)
const jobRestartWhy=()=>WANTED.lvl?"Lose the police first":ev?"Not during a race":testDrive?"Not during a test drive":state!=="DRIVE"&&state!=="PAUSE"?"Not now":"";
function jobRestart(){if(!job||jobRestartWhy())return false;const J=job.def;jobEnd("abandoned");return jobStart(J)}
// once a frame while driving
function jobTick(dt){
  if(!job)return;
  if(job.timing){job.left-=dt;if(job.left<=0){jobEnd("failed","Out of time: "+job.def.title);return}}
  // Walking and sailing must keep a courier's deadline running, but the parked car is not
  // making a delivery by itself. P stays at the car while FOOT/BOAT are elsewhere.
  if(FOOT.on||BOAT.on){job.near=false;jobHUD();return}
  const t=jobTarget(),d=Math.hypot(P.x-t.x,P.z-t.z),kph=kphNow();
  if(d<JOB_R&&kph<JOB_KPH){
    const J=job.def;job.stop++;
    if(job.stop>=J.stops.length){jobEnd("completed");return}
    if(J.type==="courier"&&job.stop===1){job.timing=true;toast("PARCEL COLLECTED","Deliver it to "+jobTarget().name+" within "+fmtSecs(job.left))}
    else if(J.type==="parcel")toast("PARCEL COLLECTED","Deliver it to "+jobTarget().name);
    else toast("STOP "+job.stop+" OF "+J.stops.length,t.name+" · next: "+jobTarget().name);
    beep(760);jobAim();return;
  }
  job.near=d<45&&kph>=JOB_KPH;
  jobHUD();
}
function jobHUD(){
  if(!job)return;const J=job.def;
  $("jbType").textContent=JOB_TYPES[J.type];$("jbObj").textContent=job.near?"Slow down to stop at "+jobTarget().name:jobObjective();
  $("jbTime").textContent=J.type==="courier"?(job.timing?fmtSecs(job.left):"Limit "+fmtSecs(J.limit)):"";
  $("jbTime").classList.toggle("low",!!(job.timing&&job.left<15));
  $("jbPay").textContent="+"+fmtCr(J.reward)+" CR";
}
// ---- the contracts screen, from the pause menu
function renderJobs(){
  const s=save.jobs,why=jobBlocked();
  $("jbStats").textContent="Completed: "+s.parcel+" parcel · "+s.courier+" courier · "+s.tour+" tour"+(s.tour===1?"":"s")+" · earned "+fmtCr(s.earned)+" CR";
  const cur=$("jbCur");cur.innerHTML="";
  if(job){const J=job.def,b=document.createElement("b"),sp=document.createElement("span");b.textContent="Under way: "+JOB_TYPES[J.type]+" · "+J.title;sp.textContent=jobObjective()+(job.timing?" · "+fmtSecs(job.left)+" left":"");
    const r=document.createElement("button"),a=document.createElement("button");r.className="mbtn";r.id="jbRestart";r.textContent="RESTART";r.onclick=()=>{const why=jobRestartWhy();if(why){$("jbNote").textContent=why+" to restart: this contract carries on.";return}jobRestart();jobsClose();if(state==="PAUSE")pauseOff()};
    a.className="mbtn";a.id="jbAbandon";a.textContent="ABANDON";a.onclick=()=>{jobEnd("abandoned","No reward");renderJobs()};
    const acts=document.createElement("div");acts.className="jbacts";acts.append(r,a);cur.append(b,sp,acts)}
  show("jbCur",!!job);
  $("jbNote").textContent=why&&!job?why+": contracts can start once it's over.":"";
  const list=$("jbList");list.innerHTML="";
  for(const J of JOBS){
    const row=document.createElement("div");row.className="jbr";
    const t=document.createElement("div"),k=document.createElement("i"),b=document.createElement("b"),sp=document.createElement("span");
    k.textContent=JOB_TYPES[J.type];b.textContent=J.title;
    const extra=J.type==="courier"?" · "+fmtSecs(J.limit)+" from pickup":J.type==="tour"?" · "+J.stops.length+" stops: "+J.stops.map(s=>s.name).join(", "):"";
    sp.textContent=J.diff+" · "+(J.len/1000).toFixed(1)+" km"+extra+" · +"+fmtCr(J.reward)+" CR"+(save.jobs.runs[J.id]?" · done "+save.jobs.runs[J.id]+"×":"");
    t.append(k,b,sp);row.appendChild(t);
    const g=document.createElement("button");g.className="mbtn"+(job&&job.def===J?"":" pri");g.textContent=job&&job.def===J?"UNDER WAY":"START";g.disabled=!!why;g.setAttribute("aria-label","Start "+J.title);
    g.onclick=()=>{if(jobStart(J)){jobsClose();if(state==="PAUSE")pauseOff()}};row.appendChild(g);list.appendChild(row);
  }
}
function jobsOpen(){if(state!=="PAUSE")return;renderJobs();show("jobs",true);try{$("jbClose").focus({preventScroll:true})}catch(e){}}
function jobsClose(){show("jobs",false)}
$("pJobs").onclick=jobsOpen;$("jbClose").onclick=jobsClose;
/* ================================================================ CLASS CHAMPIONSHIPS
   Seven cups, A1 to A7, in the style of Test Drive Unlimited 2. Each is three of the island's events, entered in a car
   of the cup's class (a cup opens once you own one). Rounds score 10, 6, 4 or 3 points (1st to 4th in a race, gold to
   no medal in a time trial); 22 of the 30 points wins the cup, which pays its prize the first time. Each round also
   pays its event's own reward. A cup's time trial has medal times for its class, from the class's cars, the same way
   the usual medal times come from a quick road car (A3, the usual times). In a cup race the rivals drive cars of the
   class. Quitting a round leaves the cup where it was; after the third round the next start begins it afresh. */
const CUP_PTS=[10,6,4,3],CUP_WIN=22;
const CUPS=[
  {cls:"A1",ev:["oldtown","talaia","antoni"],prize:25000},{cls:"A2",ev:["cubells","highway","talaia"],prize:40000},
  {cls:"A3",ev:["south","antoni","highway"],prize:60000},{cls:"A4",ev:["oldtown","highway","antoni"],prize:85000},
  {cls:"A5",ev:["cubells","talaia","antoni"],prize:110000},{cls:"A6",ev:["south","talaia","highway"],prize:140000},
  {cls:"A7",ev:["cubells","antoni","highway"],prize:180000}];
const cupOf=cls=>CUPS.find(c=>c.cls===cls);
const evById=id=>EVENTS.find(E=>E.id===id);
// medal times for a class: the route's ideal time for the class's average car, scaled from the usual (A3) times
const CUPT={};
function cupTimes(E,cls){
  const key=E.id+cls;if(CUPT[key])return CUPT[key];
  const avg=c=>{const L=CARS.filter(x=>x.cls===c);return{top:L.reduce((a,x)=>a+x.top,0)/L.length,acc:L.reduce((a,x)=>a+x.acc,0)/L.length,grip:L.reduce((a,x)=>a+x.grip,0)/L.length}};
  const a=avg(cls),r=avg("A3"),pw=x=>HD.pBase+x*HD.pAcc,gr=x=>HD.latBase+x*HD.latGrip;
  const t=routeTime(E.k,13*gr(a.grip)/gr(r.grip),62*a.top/r.top,5.5*1.15*pw(a.acc)/pw(r.acc),8);
  return CUPT[key]={gold:t*1.02,silver:t*1.15,bronze:t*1.32};
}
const champOf=cls=>save.champ[cls]||(save.champ[cls]={r:0,pts:[],won:false});
const cupTotal=c=>c.pts.reduce((a,x)=>a+x,0);
// can a cup start now? the reason if not
// (the police first: a won cup played AGAIN during a chase used to wipe its rounds and points, then be refused)
function cupBlocked(cls){
  if(WORK.active)return "Leave your kitchen shift first";
  if(WANTED.lvl)return "Lose the police first";if(job)return "Finish or abandon your contract first";if(testDrive)return "Not during a test drive";if(ev)return "Finish or quit this event first";
  const own=save.owned.map(carById).filter(c=>c.cls===cls);
  if(!own.length)return "Opens once you own an "+cls+" car";
  if(curCar().cls!==cls)return "Drive an "+cls+" car to enter: your "+own.map(c=>c.md).join(", ")+(own.length>1?" are":" is")+" at home";
  return "";
}
function cupStart(cls){
  const C=cupOf(cls);if(!C||cupBlocked(cls))return false;
  const c=champOf(cls);if(c.r>=3){c.r=0;c.pts=[]}
  persist();openIntro(evById(C.ev[c.r]),{cls,round:c.r});return true;
}
// after a cup round: its points, and at the third round whether the cup is won (the prize is paid the first time)
function cupScore(cup,place){
  const C=cupOf(cup.cls),c=champOf(cup.cls),pts=CUP_PTS[place]||0;
  if(cup.round!==c.r)return{rows:[["Cup points","+"+pts+" (this round was already scored)"]]};
  c.pts.push(pts);c.r++;const total=cupTotal(c),rows=[["Cup points","+"+pts+" · "+total+" of "+c.r*10]];let prize=0,next=null;
  if(c.r<3)next={cls:cup.cls};
  else if(total>=CUP_WIN){if(!c.won){prize=C.prize;rows.push(["Cup won",cup.cls+" Cup · +"+fmtCr(prize)+" CR"])}else rows.push(["Cup won","again · the prize was paid the first time"]);c.won=true;toast(cup.cls+" CUP WON",total+" of 30 points","gold")}
  else rows.push(["Cup over",total+" points, "+CUP_WIN+" needed to win"]);
  return{rows,prize,next};
}
// ---- the championships screen, from the pause menu
function renderCups(){
  const list=$("cpList");list.innerHTML="";const busy=job?"Finish or abandon your contract first":testDrive?"Not during a test drive":ev?"Finish or quit this event first":"";
  $("cpNote").textContent=busy?busy+": cups can start once it's over.":"";
  for(const C of CUPS){
    const c=save.champ[C.cls]||{r:0,pts:[],won:false},why=cupBlocked(C.cls),row=document.createElement("div");row.className="jbr";
    const t=document.createElement("div"),k=document.createElement("i"),b=document.createElement("b"),sp=document.createElement("span");
    k.textContent=C.cls+" CUP"+(c.won?" · WON":"");b.textContent=C.ev.map(id=>evById(id).name).join(" · ");
    const st=c.r>0&&c.r<3?"Round "+(c.r+1)+" of 3 · "+cupTotal(c)+" points so far":c.r>=3?"Last time: "+cupTotal(c)+" points"+(cupTotal(c)>=CUP_WIN?", won":", "+CUP_WIN+" needed"):"Win with "+CUP_WIN+" of 30 points";
    sp.textContent=(why&&!busy?why+" · ":"")+st+" · prize "+fmtCr(C.prize)+" CR"+(c.won?" (paid)":"");
    t.append(k,b,sp);row.appendChild(t);
    const g=document.createElement("button");g.className="mbtn"+(why?"":" pri");g.textContent=c.r>0&&c.r<3?"ROUND "+(c.r+1):c.r>=3?"AGAIN":"START";g.disabled=!!why;g.setAttribute("aria-label",g.textContent+" "+C.cls+" Cup");
    g.onclick=()=>{if(cupBlocked(C.cls))return;cupsClose();show("pause",false);cupStart(C.cls)};row.appendChild(g);list.appendChild(row);
  }
}
function cupsOpen(){if(state!=="PAUSE")return;renderCups();show("cups",true);try{$("cpClose").focus({preventScroll:true})}catch(e){}}
function cupsClose(){show("cups",false)}
$("pCups").onclick=cupsOpen;$("cpClose").onclick=cupsClose;
