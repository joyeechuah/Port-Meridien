// Port Meridien: Car models and their looks, input, the player's car physics and traffic.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;
/* ================================================================ CAR MODELS
   Each body is built from its side profile (PROF) as a smooth loft (CAR LOOKS below). Each hero car also carries a
   cockpit (dash, gauges, wheel, pillars) that is shown only in the interior camera. */
// ws = base of the windscreen [z,y]; roofF/roof = front of the roof and its height; wr = wheel radius
const PROF={
  super:{body:[[-2.3,.24],[2.18,.24],[2.36,.4],[2.32,.56],[2.2,.74,1.45,.84],[.55,.97],[-1.55,1.02],[-2.27,.99],[-2.4,.74],[-2.3,.24]],
         cabin:[[.62,.95],[-.12,1.27],[-.95,1.29],[-1.4,1.18,-1.8,1.0],[.62,.95]],w:2.04,cw:1.52,wb:1.42,tr:.93,rear:-2.38,front:2.3,tail:.8,ws:[.62,.95],roofF:-.12,roof:1.28,eye:1.05,wr:.36},
  gt:{body:[[-2.3,.26],[2.22,.26],[2.36,.46],[2.3,.64],[2.05,.8,1.3,.9],[.35,1.0],[-1.5,1.02],[-2.22,.99],[-2.36,.74],[-2.3,.26]],
      cabin:[[.42,.98],[-.3,1.34],[-1.05,1.36],[-1.65,1.22,-2.1,1.0],[.42,.98]],w:1.98,cw:1.5,wb:1.44,tr:.92,rear:-2.34,front:2.3,tail:.82,ws:[.42,.98],roofF:-.3,roof:1.35,eye:1.11,wr:.36},
  hatch:{body:[[-1.95,.26],[1.95,.26],[2.06,.5],[2.0,.72],[1.55,.86],[.85,.95],[-1.6,.99],[-1.98,.92],[-2.03,.5],[-1.95,.26]],
         cabin:[[.85,.94],[.2,1.42],[-1.55,1.45],[-1.9,1.0],[.85,.94]],w:1.8,cw:1.56,wb:1.28,tr:.84,rear:-2.02,front:2.0,tail:.86,ws:[.85,.95],roofF:.2,roof:1.43,eye:1.19,wr:.34},
  muscle:{body:[[-2.4,.3],[2.36,.3],[2.46,.55],[2.42,.8],[1.95,.92],[.55,.97],[-1.6,.99],[-2.36,.97],[-2.48,.72],[-2.4,.3]],
          cabin:[[.55,.96],[-.1,1.33],[-1.05,1.35],[-1.6,1.22,-2.0,.98],[.55,.96]],w:2.0,cw:1.56,wb:1.5,tr:.92,rear:-2.46,front:2.42,tail:.8,ws:[.55,.96],roofF:-.1,roof:1.34,eye:1.12,wr:.37},
  roadster:{body:[[-2.1,.26],[2.05,.26],[2.2,.44],[2.15,.62],[1.9,.78,1.2,.86],[.45,.92],[-1.4,.95],[-2.08,.92],[-2.2,.66],[-2.1,.26]],
            cabin:[[.5,.9],[.04,1.22],[-.06,1.22],[.36,.9],[.5,.9]],w:1.86,cw:1.5,wb:1.3,tr:.86,rear:-2.18,front:2.15,tail:.78,ws:[.5,.9],roofF:-.05,roof:1.22,eye:1.08,wr:.33,open:true},
  sedan:{body:[[-2.3,.26],[2.25,.26],[2.36,.5],[2.3,.68],[1.3,.86],[.55,.95],[-1.75,.98],[-2.3,.94],[-2.38,.6],[-2.3,.26]],
         cabin:[[.6,.93],[-.05,1.38],[-1.15,1.42],[-1.6,1.3,-1.9,.97],[.6,.93]],w:1.82,cw:1.5,wb:1.42,tr:.86,rear:-2.38,front:2.36,tail:.84,ws:[.6,.93],roofF:-.05,roof:1.4,eye:1.15,wr:.34},
  suv:{body:[[-2.42,.32],[2.36,.32],[2.5,.62],[2.46,1.0],[2.05,1.12],[1.15,1.2],[-2.3,1.22],[-2.46,1.0],[-2.52,.6],[-2.42,.32]],
       cabin:[[1.15,1.18],[.45,1.74],[-2.05,1.78],[-2.36,1.22],[1.15,1.18]],w:2.04,cw:1.84,wb:1.48,tr:.92,rear:-2.48,front:2.44,tail:1.02,ws:[1.15,1.18],roofF:.45,roof:1.76,eye:1.52,wr:.43}
};
const wheelGeo={tire:new THREE.CylinderGeometry(.36,.36,.3,20),rim:new THREE.CylinderGeometry(.24,.24,.32,14),sa:new THREE.BoxGeometry(.34,.06,.42),sb:new THREE.BoxGeometry(.34,.42,.06)};
// a spinning wheel seen at speed: the spokes would strobe (seem to stop or turn backwards), so
// they are swapped for a blurred disc
const wheelGeo_blur=(()=>{const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d"),g=x.createRadialGradient(32,32,4,32,32,32);
  g.addColorStop(0,"#9aa0a8");g.addColorStop(.35,"#6c7178");g.addColorStop(.75,"#8a9098");g.addColorStop(1,"#b6bcc4");x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
wheelGeo.blur=new THREE.CylinderGeometry(.245,.245,.335,24);
const blurM=new THREE.MeshPhongMaterial({map:wheelGeo_blur,shininess:60});
const tireM=new THREE.MeshPhongMaterial({color:0x141416,shininess:18});
const rimM=new THREE.MeshPhongMaterial({color:0xb6bcc4,shininess:170,specular:0xffffff});
const spokeM=new THREE.MeshPhongMaterial({color:0x50555c,shininess:80});
// cockpit gauge texture, shared by every car (only one cockpit is ever visible)
const gaugeCv=document.createElement("canvas");gaugeCv.width=256;gaugeCv.height=112;
const gaugeTex=new THREE.CanvasTexture(gaugeCv);
const gaugeM=new THREE.MeshBasicMaterial({map:gaugeTex});
function drawGauges(kph,rpm,gear){
  const x=gaugeCv.getContext("2d");x.fillStyle="#08090b";x.fillRect(0,0,256,112);
  const dial=(cx,v,max,lab)=>{x.strokeStyle="#3a3d42";x.lineWidth=3;x.beginPath();x.arc(cx,58,44,Math.PI*.8,Math.PI*2.2);x.stroke();
    x.strokeStyle="#fff";x.beginPath();x.arc(cx,58,44,Math.PI*.8,Math.PI*.8+Math.PI*1.4*clamp(v/max,0,1));x.stroke();
    const a=Math.PI*.8+Math.PI*1.4*clamp(v/max,0,1);x.strokeStyle="#f2b33d";x.lineWidth=2.5;x.beginPath();x.moveTo(cx,58);x.lineTo(cx+Math.cos(a)*38,58+Math.sin(a)*38);x.stroke();
    x.fillStyle="#9aa1a8";x.font="700 10px Arial";x.textAlign="center";x.fillText(lab,cx,100)};
  dial(64,kph,360,"KM/H");dial(192,rpm,8,"RPM x1000");
  x.fillStyle="#fff";x.font="700 20px Arial";x.textAlign="center";x.fillText(String(Math.round(kph)),64,66);x.fillText(String(gear),192,66);
  gaugeTex.needsUpdate=true;
}
const darkInM=new THREE.MeshPhongMaterial({color:0x2a2c30,shininess:30});
const seatM=new THREE.MeshPhongMaterial({color:0x1c1d20,shininess:20});
const headlinerM=new THREE.MeshLambertMaterial({color:0x2c2e31});
// frees what a car model owns; the wheels, tyres and cockpit materials are shared by every car and stay
// what every car shares and no car may free: wheel and body shapes, their textures, the common materials
function carShared(){
  const G=new Set(Object.values(wheelGeo)),M=new Set([tireM,rimM,spokeM,blurM,gaugeM,darkInM,seatM,headlinerM,shadowM,trafficWheelM]),T=new Set([gaugeTex,blurM.map,shadowM&&shadowM.map]);
  for(const k in SHAPE_CACHE){const p=SHAPE_CACHE[k];G.add(p.body);G.add(p.cabin);G.add(p.bodyR);G.add(p.bodyL);for(const t of [p.bt,p.ct])for(const x of Object.values(t))T.add(x);
    for(const l of Object.values(p.liv))for(const x of [l.R,l.L,l.cab])if(x)T.add(x);for(const m of Object.values(p.glass))M.add(m)}
  for(const t of Object.values(PLATE_TEX))T.add(t);
  for(const k in WHEEL_CACHE)for(const g of Object.values(WHEEL_CACHE[k]))G.add(g);
  for(const k in LOOKM){for(const m of Object.values(LOOKM[k]))if(m.isMaterial)M.add(m);LOOKM[k].rims.forEach(m=>M.add(m))}
  return{G,M,T};
}
function disposeHeroCar(c){
  const sh=carShared(),done=new Set();
  for(const guest of [...c.G.children])if(guest.userData.rider)scene.add(guest);
  c.G.traverse(o=>{if(!o.isMesh)return;if(o.geometry&&!sh.G.has(o.geometry)&&!done.has(o.geometry)){done.add(o.geometry);o.geometry.dispose()}
    (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(!m||sh.M.has(m)||done.has(m))return;done.add(m);
      for(const t of [m.map,m.roughnessMap,m.metalnessMap,m.emissiveMap,m.alphaMap])if(t&&!sh.T.has(t)&&!done.has(t)){done.add(t);t.dispose()}
      CAR_ENV.mats.delete(m);m.dispose()})});
  if(c.G.parent)c.G.parent.remove(c.G);
}

/* ---------- what the cars reflect: the sky (the same shader as the real one, clouds and sun included) over the
   land, rendered into an environment map. It's redrawn when the sky changes enough to see ---------- */
const CAR_ENV={tex:null,mats:new Set(),t:-1e9,key:null,pm:null,scene:null,ground:null,dirty:false};
function carEnvScene(){
  const s=new THREE.Scene(),m=new THREE.Mesh(new THREE.SphereGeometry(90,32,16),sky.material);m.frustumCulled=false;s.add(m);
  const g=new THREE.Mesh(new THREE.CircleGeometry(85,32),new THREE.MeshBasicMaterial({color:0x55524c,fog:false}));g.rotation.x=-Math.PI/2;g.position.y=-3;s.add(g);
  CAR_ENV.ground=g;return s}
function carEnvTex(){if(!CAR_ENV.tex)updateCarEnv(true);return curCarEnv()}
function updateCarEnv(force){
  const k=[skyU.top.value,skyU.hor.value,skyU.sunCol.value].map(c=>c.r+c.g+c.b).concat([skyU.sunDir.value.x,skyU.sunDir.value.y]);
  const old=CAR_ENV.key,now=performance.now();
  // redrawn at most every 4 s as the sky changes slowly with the hour, but at once when it changes a lot: the first map
  // is drawn while the game loads, before the hour's sky is set, and for up to 4 s after START the cars reflected
  // that grey sky (lighter paint, grey windows) and then changed colour
  const big=old&&k.some((v,i)=>Math.abs(v-old[i])>.25);
  if(!force&&old&&!big&&((now-CAR_ENV.t<4000&&!CAR_ENV.dirty)||k.every((v,i)=>Math.abs(v-old[i])<.06))){CAR_ENV.dirty=false;return}CAR_ENV.dirty=false;
  if(!CAR_ENV.pm){CAR_ENV.pm=new THREE.PMREMGenerator(renderer);CAR_ENV.scene=carEnvScene()}
  CAR_ENV.ground.material.color.copy(hemi.groundColor).lerp(scene.fog.color,.35).multiplyScalar(.55);
  const rt=CAR_ENV.pm.fromScene(CAR_ENV.scene,.02,.1,200),old2=CAR_ENV.rt;CAR_ENV.rt=rt;CAR_ENV.tex=rt.texture;
  if(!STUDIO_ENV.on)for(const m of CAR_ENV.mats){m.envMap=rt.texture;m.needsUpdate=true}
  if(old2)old2.dispose();CAR_ENV.key=k;CAR_ENV.t=now;
}
const envMat=m=>{CAR_ENV.mats.add(m);return m};
// Indoors (the garage and the showroom) the cars reflect a studio, a grey room with long light panels overhead and
// soft ones round the sides, instead of the open sky: the sky's blue and its bright horizon used to wash over a car
// standing in the garage
const STUDIO_ENV={tex:null,on:false};
function studioEnvTex(){
  if(STUDIO_ENV.tex)return STUDIO_ENV.tex;
  const s=new THREE.Scene(),basic=(c,side)=>new THREE.MeshBasicMaterial({color:c,side,fog:false});
  const room=new THREE.Mesh(new THREE.BoxGeometry(44,16,44),basic(0x3c4349,THREE.BackSide));room.position.y=5;s.add(room);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(44,44),basic(0x5a6268,THREE.FrontSide));floor.rotation.x=-Math.PI/2;floor.position.y=-1.5;s.add(floor);
  const panel=(w,h,k,x,y,z,rx,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),basic(new THREE.Color(k,k,k*.96),THREE.DoubleSide));m.position.set(x,y,z);m.rotation.set(rx,ry,0);s.add(m)};
  for(const x of [-7.5,-2.5,2.5,7.5])panel(1.2,30,5,x,12,0,Math.PI/2,0);
  for(const sd of [-1,1])panel(16,4.5,2.2,sd*21.5,4.5,0,0,sd*Math.PI/2);
  panel(20,4,1.6,0,4.5,21.5,0,Math.PI);panel(20,4,1.6,0,4.5,-21.5,0,0);
  if(!CAR_ENV.pm){CAR_ENV.pm=new THREE.PMREMGenerator(renderer);CAR_ENV.scene=carEnvScene()}
  STUDIO_ENV.tex=CAR_ENV.pm.fromScene(s,0,.1,100).texture;
  s.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});
  return STUDIO_ENV.tex;
}
// the reflections a car shows now: the studio indoors, the sky outside
const curCarEnv=()=>STUDIO_ENV.on?studioEnvTex():CAR_ENV.tex;
function carIndoors(on){
  if(STUDIO_ENV.on===on)return;STUDIO_ENV.on=on;
  const tex=curCarEnv();if(!tex)return;
  for(const m of CAR_ENV.mats){m.envMap=tex;m.needsUpdate=true}
}
/* ================================================================ CAR LOOKS
   A body is a smooth loft: cross-sections along the car whose top and bottom follow the side profile (PROF), whose
   width narrows towards the nose and tail like a car seen from above, with the sides cut up round the wheels and
   fenders that rise over them. The glasshouse is a second, narrower loft. Each is painted by textures worked out
   from the shape itself (panel lines, grilles, intakes, sills, the dark lenses of the lights, the window glass and
   pillars), so the paint colour can change while every detail stays. Lights glow from an extra copy of the front and
   rear of the body drawn over it with additive light. */
const LOOK={
  super:{p:6,crown:.035,belt:.42,tuck:.1,sill:1,intake:1,louvre:1,doors:[[.25,-.85]],head:"blade",tail:"bar",rim:"y5",cal:0xf2c200,grille:0,mir:.7},
  gt:{p:5,crown:.03,belt:.5,tuck:.09,sill:1,intake:0,louvre:0,doors:[[.3,-.95]],head:"swept",tail:"bar",rim:"ten",cal:0xc8141a,grille:1,mir:.75},
  hatch:{p:5,crown:.025,belt:.55,tuck:.07,sill:1,intake:0,louvre:0,doors:[[.75,-.32],[-.32,-1.3]],head:"box",tail:"pair",rim:"five",cal:0x222428,grille:1,mir:.8},
  muscle:{p:6.5,crown:.03,belt:.52,tuck:.08,sill:0,intake:0,louvre:0,doors:[[.42,-.85]],head:"box",tail:"bar",rim:"split",cal:0x222428,grille:1,mir:.8},
  roadster:{p:5,crown:.03,belt:.48,tuck:.09,sill:1,intake:0,louvre:0,doors:[[.35,-.6]],head:"swept",tail:"pair",rim:"seven",cal:0xc8141a,grille:1,mir:.7},
  sedan:{p:4,crown:.03,belt:.52,tuck:.08,sill:0,intake:0,louvre:0,doors:[[.52,-.42],[-.42,-1.38]],head:"swept",tail:"pair",rim:"five",cal:0x222428,grille:1,mir:.8},
  suv:{p:5.5,crown:.03,belt:.55,tuck:.07,sill:1,intake:0,louvre:0,doors:[[.95,-.15],[-.15,-1.25]],head:"box",tail:"pair",rim:"six",cal:0x222428,grille:1,mir:.9}
};
const smooth01=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
// top and bottom of a side profile at any point along the car
function sampleProfile(pts){
  const sh=new THREE.Shape();sh.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++){const p=pts[i];p.length===4?sh.quadraticCurveTo(p[0],p[1],p[2],p[3]):sh.lineTo(p[0],p[1])}
  const poly=sh.getPoints(20);let z0=1e9,z1=-1e9;for(const p of poly){z0=Math.min(z0,p.x);z1=Math.max(z1,p.x)}
  const N=400,top=new Float32Array(N+1),bot=new Float32Array(N+1);
  for(let i=0;i<=N;i++){const z=z0+(z1-z0)*Math.min(.9995,Math.max(.0005,i/N));let hi=-1e9,lo=1e9;
    for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length];if(a.x===b.x||(a.x-z)*(b.x-z)>0)continue;
      const y=a.y+(b.y-a.y)*(z-a.x)/(b.x-a.x);hi=Math.max(hi,y);lo=Math.min(lo,y)}
    top[i]=hi>-1e8?hi:top[i-1];bot[i]=lo<1e8?lo:bot[i-1]}
  const at=a=>z=>{const f=Math.min(1,Math.max(0,(z-z0)/(z1-z0)))*N,i=Math.min(N-1,Math.floor(f)),k=f-i;return a[i]*(1-k)+a[i+1]*k};
  return{z0,z1,top:at(top),bot:at(bot)};
}
// points along a smooth curve through the control points; each stretch between two control points gets a fixed
// number of points, so a point keeps its place on the car from one cross-section to the next
function segCurve(c,counts,out){
  const m=c.length/2;let o=0;
  for(let i=0;i<m-1;i++){const i0=Math.max(0,i-1),i3=Math.min(m-1,i+2),D=counts[i];
    const x0=c[i0*2],y0=c[i0*2+1],x1=c[i*2],y1=c[i*2+1],x2=c[i*2+2],y2=c[i*2+3],x3=c[i3*2],y3=c[i3*2+1];
    for(let k=0;k<D;k++){const t=k/D,t2=t*t,t3=t2*t;
      out[o++]=.5*((2*x1)+(-x0+x2)*t+(2*x0-5*x1+4*x2-x3)*t2+(-x0+3*x1-3*x2+x3)*t3);
      out[o++]=.5*((2*y1)+(-y0+y2)*t+(2*y0-5*y1+4*y2-y3)*t2+(-y0+3*y1-3*y2+y3)*t3)}}
  out[o++]=c[c.length-2];out[o++]=c[c.length-1];return out;
}
// how many points each stretch gets, from its length on a typical cross-section
function segCounts(c,n){const m=c.length/2,L=[];let tot=0;for(let i=0;i<m-1;i++){const l=Math.hypot(c[i*2+2]-c[i*2],c[i*2+3]-c[i*2+1])+.02;L.push(l);tot+=l}
  const k=L.map(l=>Math.max(1,Math.round(n*l/tot)));return k}
// the shape of one car: functions giving each cross-section, and where things are
function carShape(pr,shape,openCockpit){
  const S=LOOK[shape],bp=sampleProfile(pr.body),cp=sampleProfile(pr.cabin);
  const z0=bp.z0,z1=bp.z1,zc=(z0+z1)/2,hl=(z1-z0)/2,W=pr.w/2,Ra=pr.wr+.075;
  const arch=z=>{let y=-1;for(const zw of [pr.wb,-pr.wb]){const d=z-zw;if(Math.abs(d)<Ra)y=Math.max(y,pr.wr+Math.sqrt(Ra*Ra-d*d))}return y};
  const cockpit=z=>openCockpit?smooth01(-1.4,-1.06,z)*(1-smooth01(.15,.45,z)):0;
  const halfW=z=>{const t=Math.min(1,Math.abs((z-zc)/hl));let w=W*Math.pow(Math.max(0,1-Math.pow(t,S.p)),1/S.p);
    // fenders swell a little over the wheels
    for(const zw of [pr.wb,-pr.wb]){const d=Math.abs(z-zw);w+=.03*(1-smooth01(Ra*.6,Ra+.35,d))*Math.min(1,w/.5)}return w};
  // control points of the right half of a cross-section, from the middle of the floor round to the middle of the top
  const sec=z=>{
    const T=bp.top(z),Bo=bp.bot(z),H=Math.max(.001,T-Bo),hw=halfW(z),k=Math.min(1,hw/.45),a=arch(z);
    const Ts=a>0?Math.max(T,a+.075):T,yb=Bo+H*S.belt;
    const c=[0,Bo, hw*.72,Bo, hw-.07*k,Bo+.015, hw-.012*k,Bo+Math.min(.09,H*.25), hw,yb, hw-.025*k,Bo+(Ts-Bo)*.82,
      hw-.07*k,Ts-.03*k, hw-S.tuck*1.7*k,Ts, hw*.45,(Ts+T)/2+S.crown*.8, 0,T+S.crown];
    // Raised bonnet shoulders taper into the nose and disappear before the windscreen.
    const bonnet=smooth01(pr.ws[0],pr.ws[0]+.28,z)*(1-smooth01(z1-.42,z1-.12,z));
    c[16]+=hw*.12*bonnet;
    c[17]+=(shape==="muscle"?.048:.024)*bonnet;
    if(a>0)for(const i of [1,2,3]){const y=c[i*2+1];if(y<a){c[i*2+1]=a;if(i===1)c[2]=Math.min(c[2],pr.tr-.24)}}
    // up the side the points only ever climb (the lifted arch used to fold the side over itself)
    for(let i=2;i<=7;i++)c[i*2+1]=Math.max(c[i*2+1],c[i*2-1]+.012);
    // An open-top car's door tops stay high while the centre drops into the cockpit (the Sora 2's first, now every roadster).
    const recess=cockpit(z);
    c[16]+=hw*.25*recess;c[17]-=.23*recess;c[19]-=.34*recess;
    return c};
  // the glasshouse
  const cz0=cp.z0,cz1=cp.z1,cw=pr.cw/2;
  // the glasshouse starts just inside the body's shoulder and leans in towards the roof
  const csec=z=>{const T=cp.top(z),Bo=cp.bot(z),H=Math.max(0,T-Bo),f=Math.min(1,H/.12);
    // but never wider than the body's shoulder under it: towards the tail (and nose) the body narrows, and a glasshouse
    // kept at its full width overhung the sides like a wide black hat on the Kest 25 and the Moorland
    const hw=halfW(z),w=Math.min(Math.max(cw,hw-S.tuck*1.5-.02),hw-S.tuck*1.7*Math.min(1,hw/.45)-.015),wt=w-Math.min(.3,H*.55)*f;
    return[w+.01,Bo-.03, w-(w-wt)*.25,Bo+H*.4, wt+.06*f,T-.04*f, wt-.04*f,T, wt*.4,T+.02*f, 0,T+.024*f]};
  const hy=Math.max(.56,pr.ws[1]-.34);
  return{S,bp,cp,z0,z1,cz0,cz1,sec,csec,arch,halfW,cockpit,Ra,hy,pr,shape};
}
// a lofted surface: stations along z (dense at the ends), each a closed ring made of the right half and its mirror
function loftGeo(za,zb,secFn,NS,NU0,ends){
  const counts=segCounts(secFn((za+zb)/2),NU0),NU=counts.reduce((a,b)=>a+b,0);
  const M=NU*2,pos=new Float32Array((NS+1)*M*3),uv=new Float32Array((NS+1)*M*2),half=new Float32Array((NU+1)*2),idx=[],zs=[];
  for(let i=0;i<=NS;i++){const s=i/NS,f=ends?.5-.5*Math.cos(Math.PI*s):s,z=za+(zb-za)*f;zs.push(z);segCurve(secFn(z),counts,half);
    for(let k=0;k<M;k++){const j=k<=NU?k:M-k,sg=k<=NU?1:-1,o=(i*M+k);pos[o*3]=half[j*2]*sg;pos[o*3+1]=half[j*2+1];pos[o*3+2]=z;uv[o*2]=s;uv[o*2+1]=j/NU}}
  const idxR=[],idxL=[];
  for(let i=0;i<NS;i++)for(let k=0;k<M;k++){const a=i*M+k,b=i*M+(k+1)%M,c=a+M,d=b+M;idx.push(a,b,c,b,d,c);(k<NU?idxR:idxL).push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("uv",new THREE.BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();g.userData={zs,M,NS,counts,NU,idxR,idxL};
  // the left half's normals point the wrong way round the mirror: the winding flips there, so fix by recomputing on
  // a consistent winding (the right half goes up, the left comes down: both wind the same way, nothing to do)
  return g;
}
// texture painter: runs a function over every texel of the surface (position, normal) and writes colour,
// roughness/metalness and light glow
// zr (optional): only the stretch of the car between these z values is painted (the rest stays empty), for small decals
function paintSurface(za,zb,secFn,TW,TH0,ends,fn,geo,zr0){
  // rows line up with the loft's points: each stretch gets r rows per point
  const r=Math.max(1,Math.round(TH0/geo.userData.NU)),counts=geo.userData.counts.map(k=>k*r),TH=geo.userData.NU*r;
  const col=new Uint8ClampedArray(TW*TH*4),rm=new Uint8ClampedArray(TW*TH*4),lit=new Uint8ClampedArray(TW*TH*4);
  const rows=[0,1,2].map(()=>new Float32Array((TH+1)*2)),zr=[0,0,0];
  const rowAt=(i,buf)=>{const s=Math.min(1,Math.max(0,(i+.5)/TW)),f=ends?.5-.5*Math.cos(Math.PI*s):s,z=za+(zb-za)*f;segCurve(secFn(z),counts,buf);return z};
  // the texture maps u (0..1 along z, in loft parameter) to the station; the loft above uses the same mapping
  const zOf=i=>{const s=Math.min(1,Math.max(0,(i+.5)/TW)),f=ends?.5-.5*Math.cos(Math.PI*s):s;return za+(zb-za)*f};
  let fresh=true;
  const o={c:1,r:.3,m:.5,l:0,lr:0,lg:0,lb:0},px=(zb-za)/TW;
  for(let i=0;i<TW;i++){
    if(zr0){const z=zOf(i);if(z<zr0[0]||z>zr0[1]){fresh=true;continue}}
    if(fresh){zr[0]=rowAt(i-1,rows[0]);zr[1]=rowAt(i,rows[1]);fresh=false}
    zr[2]=rowAt(i+1,rows[2]);const A=rows[0],B=rows[1],C=rows[2];
    for(let j=0;j<TH;j++){const x=B[j*2],y=B[j*2+1],z=zr[1];
      const jn=j+1,jp=Math.max(0,j-1);let tx=B[jn*2]-B[jp*2],ty=B[jn*2+1]-B[jp*2+1];const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
      // across: outward normal in the section plane is (ty,-tx) for a curve going up the right side
      let nx=ty,ny=-tx,nz=0;
      // along: slope of the surface in z
      const dz=zr[2]-zr[0]||1e-4,dx=(C[j*2]-A[j*2])/dz,dy=(C[j*2+1]-A[j*2+1])/dz;nz=-(nx*dx+ny*dy);const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
      o.c=1;o.r=.36;o.m=.35;o.l=0;o.lr=1;o.lg=1;o.lb=1;fn(x,y,z,nx,ny,nz,o,px,j/TH);
      const q=((TH-1-j)*TW+i)*4,c=Math.round(Math.pow(Math.min(1,o.c),1/2.2)*255);col[q]=col[q+1]=col[q+2]=c;col[q+3]=255;
      rm[q]=0;rm[q+1]=Math.round(o.r*255);rm[q+2]=Math.round(o.m*255);rm[q+3]=255;
      lit[q]=Math.round(o.l*o.lr*255);lit[q+1]=Math.round(o.l*o.lg*255);lit[q+2]=Math.round(o.l*o.lb*255);lit[q+3]=255}
    rows.push(rows.shift());zr[0]=zr[1];zr[1]=zr[2]}
  const tex=(a,srgb)=>{const cv=document.createElement("canvas");cv.width=TW;cv.height=TH;cv.getContext("2d").putImageData(new ImageData(a,TW,TH),0,0);
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;if(srgb)t.encoding=THREE.sRGBEncoding;return t};
  return{col:tex(col,true),rm:tex(rm,false),lit:tex(lit,true)};
}
const band=(v,a,b,aa)=>smooth01(a-aa,a+aa,v)*(1-smooth01(b-aa,b+aa,v));
const line=(d,w,aa)=>1-smooth01(w,w+aa,Math.abs(d));
// everything about the body's surface: where each detail goes
function bodyPaint(K){
  const{S,pr,bp,arch,halfW,hy}=K,F=K.z1,R=K.z0,wsz=pr.ws[0],cab0=K.cz0,cab1=K.cz1;
  const dA=S.doors;
  return(x,y,z,nx,ny,nz,o,px)=>{
    const ax=Math.abs(x),hw=halfW(z),Bo=bp.bot(z),T=bp.top(z),aa=px*.8;
    const side=Math.abs(nx)>.55,top=ny>.55;
    let dark=0,glossDark=0;
    // underneath and inside the wheel arches
    if(ny<-.3){o.c=.015;o.r=.85;o.m=0;return}
    if(K.cockpit(z)>.12&&ax<hw*.78&&y<T-.075&&y>T-.42){o.c=.045;o.r=.82;o.m=0;return}
    const a=arch(z);if(a>0&&y<a+.012&&ax<hw-.02){o.c=.015;o.r=.85;o.m=0;return}
    // sills between the wheels
    if(S.sill&&side&&y<Bo+.085&&z<pr.wb-K.Ra+.02&&z>-pr.wb+K.Ra-.02)glossDark=1;
    // front: lower intake with a mesh, splitter
    if(nz>.25&&z>F-.6){
      const lo=Bo+.03,hi=Bo+Math.min(.2,(T-Bo)*.42);
      if(y<lo+.02)dark=1;
      else if(y<hi&&ax<hw*.8){const hex=((Math.floor(x/.025)+Math.floor(y/.022))&1)?.05:.012;o.c=hex;o.r=.6;o.m=0;return}
      if(S.grille&&y>hy-.12&&y<hy+.015&&ax<hw*.36){o.c=((Math.floor(y/.018))&1)?.08:.01;o.r=.35;o.m=.2;return}
    }
    // rear: diffuser with fins
    if(nz<-.25&&z<R+.5&&y<Bo+Math.min(.2,(T-Bo)*.4)){o.c=(Math.abs(((x/.12)%1+1)%1-.5)<.06&&ax<hw*.6)?.06:.012;o.r=.5;o.m=0;return}
    // headlights: dark lenses with daytime running lights and projectors
    if(nz>.05&&z>F-.55){
      const xc=hw*.66,lw=hw*.27;let inL=0,drl=0,proj=0;
      if(S.head==="blade"){const yc=hy+.02+(ax-xc)*.22;inL=band(ax,xc-lw,xc+lw*1.15,aa)*band(y,yc-.035,yc+.03,aa);drl=line(y-(yc+.018),.006,aa)*inL}
      else if(S.head==="swept"){const yc=hy+(ax-xc)*.3;inL=band(ax,xc-lw,xc+lw*1.1,aa)*band(y,yc-.05,yc+.045,aa);drl=line(y-(yc-.035),.007,aa)*band(ax,xc-lw*.8,xc+lw,aa);
        for(const c of [xc-lw*.45,xc+lw*.15])proj=Math.max(proj,1-smooth01(.022,.028,Math.hypot(ax-c,y-yc)))}
      else if(S.head==="box"){inL=band(ax,xc-lw*1.2,xc+lw*1.15,aa)*band(y,hy-.065,hy+.06,aa);drl=line(y-(hy+.05),.007,aa)*band(ax,xc-lw*1.1,xc+lw*1.05,aa);
        for(const c of [xc-lw*.45,xc+lw*.35])proj=Math.max(proj,1-smooth01(.028,.034,Math.hypot(ax-c,y-hy+.005)))}
      else{inL=1-smooth01(.07,.07+aa,Math.hypot(ax-xc,y-hy));drl=line(Math.hypot(ax-xc,y-hy)-.058,.005,aa);proj=1-smooth01(.03,.036,Math.hypot(ax-xc,y-hy))}
      if(inL>.5){
        // The reflector cup remains visible behind the running light even with the lamps off.
        const lensHeight=S.head==="swept"?hy+(ax-xc)*.3:S.head==="blade"?hy+.02+(ax-xc)*.22:hy;
        const reflector=1-smooth01(0,.052,Math.abs(y-lensHeight));
        o.c=.036+reflector*.20+proj*.18;o.r=.10+.12*(1-reflector);o.m=.4;o.l=Math.max(drl,proj*.35,.04);o.lr=1;o.lg=.97;o.lb=.9;return}
    }
    // tail lights
    if(nz<-.05&&z<R+.55){
      const yt=pr.tail,xc=hw*.62,lw=hw*.3;let inL=0,led=0;
      if(S.tail==="bar"){inL=band(ax,xc-lw,xc+lw*1.15,aa)*band(y,yt-.045,yt+.03,aa);led=Math.max(line(y-(yt-.005),.008,aa)*inL,.35*inL);
        if(!inL&&ax<xc-lw&&Math.abs(y-(yt-.005))<.006){o.c=.02;o.r=.05;o.m=0;o.l=.55;o.lr=1;o.lg=.12;o.lb=.05;return}}
      else{inL=band(ax,xc-lw*.85,xc+lw*1.1,aa)*band(y,yt-.07,yt+.035,aa);led=Math.max(.3,(line(y-(yt-.02),.01,aa)+line(ax-(xc+lw*.6),.008,aa))*inL)}
      if(inL>.5){o.c=.03;o.r=.05;o.m=0;o.l=led;o.lr=1;o.lg=.1;o.lb=.04;return}
    }
    // A recessed pocket and a painted pull sit just forward of each door's trailing seam.
    if(side&&y>T-.22&&y<T-.055){
      for(const door of dA){
        const dz=z-(door[1]+.17),dy=y-(T-.135);
        if(Math.abs(dz)>.105||Math.abs(dy)>.045)continue;
        const pocket=1-smooth01(.75,1,(dz/.105)**2+(dy/.044)**2);
        const pull=band(dz,-.08,.08,aa)*band(dy,-.004,.018,aa);
        o.c=1-pocket*.72+pull*.5;o.r=.43-pull*.19;
        if(pocket>.01)return;
      }
    }
    // side intake behind the doors (mid-engined cars): a scoop whose leading edge rakes back, with a mesh and a
    // gloss-dark lip, clear of the sill. It was a flat black slab from the sill to the belt, which read as a hole
    if(S.intake&&side){const d1=dA[0][1],bot=Bo+.24,top=T-.12-(d1-.08-z)*.12,lead=d1-.08-(y-bot)*.55,tail=d1-.62;
      if(y>bot&&y<top&&z<lead&&z>tail){const e=Math.min(lead-z,z-tail,y-bot,top-y);
        if(e<.018){o.c=.02;o.r=.22;o.m=0;return}
        o.c=((Math.floor(z/.024)+Math.floor(y/.022))&1)?.05:.012;o.r=.6;o.m=0;return}}
    // engine cover louvres
    if(S.louvre&&top&&z>R+.35&&z<cab0-.05&&ax<hw*.5){if(((z/.06)%1+1)%1<.45){o.c=.015;o.r=.5;o.m=0;return}}
    // panel lines: doors, bonnet, boot
    let pl=0;
    if(side&&y>Bo+.07&&y<T-.03)for(const[d0,d1]of dA)pl=Math.max(pl,line(z-d0,.0018,aa),line(z-d1,.0018,aa));
    if(side&&Math.abs(y-(Bo+.088))<.004&&z<dA[0][0]&&z>dA[dA.length-1][1])pl=Math.max(pl,line(y-(Bo+.088),.0015,aa));
    if(top&&z>wsz&&z<F-.15){pl=Math.max(pl,line(z-(wsz+.07),.0018,aa));pl=Math.max(pl,line(ax-(hw-.2),.0018,aa)*(z>wsz+.07?1:0))}
    if(top&&z<cab1&&z>R+.1&&!S.louvre)pl=Math.max(pl,line(z-(R+.42),.0018,aa)*(ax<hw-.15?1:0));
    if(glossDark){o.c=.02;o.r=.25;o.m=0}
    if(dark){o.c=.012;o.r=.5;o.m=0}
    if(pl>0){o.c*=1-pl*.92;o.r=Math.max(o.r,pl*.7)}
  };
}
function cabinPaint(K){
  const{pr}=K,open=!!pr.open,zB=(pr.ws[0]+pr.roofF)/2-.55,zRF=pr.roofF,zRR=pr.cabin[2][0];
  return(x,y,z,nx,ny,nz,o)=>{
    const T=K.cp.top(z),Bo=K.cp.bot(z);
    const glass=()=>{o.c=.0;o.r=.03;o.m=0;o.l=1};
    if(y<Bo+.012){o.c=.012;o.r=.65;o.m=0;return}           // rubber along the belt line
    if(open){if(y>T-.03){o.c=.015;o.r=.4;o.m=0}else glass();return}
    // the windscreen and rear window are told from the roof by where they are along the car (ahead of the roof's front
    // edge, behind its rear edge), not by how steep they are: the raked screens of the GT, muscle car and supercar
    // face the sky as much as the roof does, and were painted body colour (no front or rear window from above)
    const sd=Math.abs(nx)>.5&&Math.abs(nz)<.5,mid=Math.abs(nx)<.55;
    if(sd){if(Math.abs(z-zB)<.045){o.c=.015;o.r=.15;o.m=0;return}
      if(y>T-.035||z<K.cz0+.25){o.c=1;o.r=.36;o.m=.35;return}glass();return}
    if(z<=zRF-.03&&z>=zRR+.03&&ny>.5){o.c=1;o.r=.36;o.m=.35;return}       // roof
    if(mid&&z>zRF+.03){glass();return}                                     // windscreen
    // rear window: glass in the middle, framed in body colour (a strip under the roof's end, the pillars either side
    // and a strip along the bottom), as on a real hatch or saloon; all dark, it looked like a black slab on the back
    if(z<zRR-.03){if(Math.abs(nx)<.34&&z<zRR-.07&&T-Bo>.1){glass();return}o.c=1;o.r=.36;o.m=.35;return}
    o.c=.012;o.r=.6;o.m=0;                                    // pillars and frames, satin black (gloss caught the sky as white lines)
  };
}
const SHAPE_CACHE={};
function carParts(pr,shape,q,openCockpit){
  const key=shape+":"+q+(openCockpit?":open":"");if(SHAPE_CACHE[key])return SHAPE_CACHE[key];
  const K=carShape(pr,shape,openCockpit),hi=q>0;
  const NS=hi?130:80,NU=hi?30:20,TW=hi?1024:768,TH=hi?512:384;
  const body=loftGeo(K.z0,K.z1,K.sec,NS,NU,true),cabin=loftGeo(K.cz0,K.cz1,K.csec,hi?60:36,hi?18:12,true);
  const bt=paintSurface(K.z0,K.z1,K.sec,TW,TH,true,bodyPaint(K),body),ct=paintSurface(K.cz0,K.cz1,K.csec,hi?512:256,hi?256:128,true,cabinPaint(K),cabin);
  // the stations holding the lights: rear quarter and front quarter of the body, drawn again with light
  const zs=body.userData.zs,M=body.userData.M,cut=(zz)=>{let i=0;while(i<zs.length-1&&zs[i]<zz)i++;return i};
  const iR=cut(K.z0+.6),iF=cut(K.z1-.62);
  const ranges={tail:[0,iR*M*6],head:[iF*M*6,(NS-iF)*M*6]};
  const half=ix=>{const g=new THREE.BufferGeometry();for(const n of ["position","normal","uv"])g.setAttribute(n,body.attributes[n]);g.setIndex(ix);return g};
  return SHAPE_CACHE[key]={K,body,cabin,bt,ct,ranges,bodyR:half(body.userData.idxR),bodyL:half(body.userData.idxL),liv:{},glass:{},q};
}
/* ---------- wheels ---------- */
const WHEEL_CACHE={};
function rimShape(style){
  const R=.245,sh=new THREE.Shape();sh.absarc(0,0,R,0,Math.PI*2,false);
  const n={y5:5,ten:10,five:5,split:5,seven:7,six:6}[style]||5;
  const hole=(a0,a1,r0,r1)=>{const h=new THREE.Path();const s=16;
    h.moveTo(Math.cos(a0)*r0,Math.sin(a0)*r0);
    for(let k=0;k<=s;k++){const a=a0+(a1-a0)*k/s;h.lineTo(Math.cos(a)*r1,Math.sin(a)*r1)}
    for(let k=s;k>=0;k--){const a=a0+(a1-a0)*k/s;h.lineTo(Math.cos(a)*r0,Math.sin(a)*r0)}
    return h};
  const gap=Math.PI*2/n;
  for(let i=0;i<n;i++){const c=i*gap;
    if(style==="y5"){const w=gap*.09;sh.holes.push(hole(c+w,c+gap/2-w*.5,.07,.222));sh.holes.push(hole(c+gap/2+w*.5,c+gap-w,.07,.222))}
    else if(style==="split"){const w=gap*.1;sh.holes.push(hole(c+w,c+gap/2-.025,.075,.222));sh.holes.push(hole(c+gap/2+.025,c+gap-w,.075,.222))}
    else{const w=gap*(style==="ten"?.17:.13);sh.holes.push(hole(c+w,c+gap-w,.072,.222))}}
  return sh;
}
function wheelParts(style){
  if(WHEEL_CACHE[style])return WHEEL_CACHE[style];
  // tyre: a lathe of the tyre's cross-section, its axis along x
  const tp=[];const rI=.24,rO=.36,hw=.15;
  tp.push(new THREE.Vector2(rI,-hw*.86),new THREE.Vector2(rI+.03,-hw),new THREE.Vector2(rO-.03,-hw*.97),new THREE.Vector2(rO-.008,-hw*.84),
    new THREE.Vector2(rO,-hw*.6),new THREE.Vector2(rO,hw*.6),new THREE.Vector2(rO-.008,hw*.84),new THREE.Vector2(rO-.03,hw*.97),new THREE.Vector2(rI+.03,hw),new THREE.Vector2(rI,hw*.86));
  const tire=new THREE.LatheGeometry(tp,40);tire.rotateZ(-Math.PI/2);
  const face=new THREE.ExtrudeGeometry(rimShape(style),{depth:.03,bevelEnabled:true,bevelThickness:.012,bevelSize:.008,bevelSegments:2,curveSegments:40});
  face.rotateY(Math.PI/2);face.translate(.09,0,0);
  const barrel=new THREE.CylinderGeometry(.243,.243,.2,36,1,true);barrel.rotateZ(Math.PI/2);barrel.translate(.0,0,0);
  const lip=new THREE.TorusGeometry(.245,.01,6,40);lip.rotateY(Math.PI/2);lip.translate(.13,0,0);
  const cap=new THREE.CylinderGeometry(.045,.05,.03,20);cap.rotateZ(Math.PI/2);cap.translate(.125,0,0);
  const disc=new THREE.CylinderGeometry(.205,.205,.028,36);disc.rotateZ(Math.PI/2);disc.translate(-.02,0,0);
  const hub=new THREE.CylinderGeometry(.08,.08,.06,16);hub.rotateZ(Math.PI/2);hub.translate(.02,0,0);
  // caliper: a curved block over the top-rear of the disc
  const cs=new THREE.Shape();cs.absarc(0,0,.215,Math.PI*.52,Math.PI*.98,false);cs.absarc(0,0,.14,Math.PI*.98,Math.PI*.52,true);
  const cal=new THREE.ExtrudeGeometry(cs,{depth:.07,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:12});
  cal.translate(0,0,-.035);cal.rotateY(Math.PI/2);cal.translate(.0,0,0);
  return WHEEL_CACHE[style]={tire,face,barrel,lip,cap,disc,hub,cal};
}
// materials that every car shares
const LOOKM={};
function lookMats(env,hi){
  const k=(hi?"h":"l");if(LOOKM[k])return LOOKM[k];
  const P=hi?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
  const o={
    tire:new THREE.MeshStandardMaterial({color:0x0c0d0e,roughness:.9,metalness:0,envMap:env,envMapIntensity:.2}),
    rim:new THREE.MeshStandardMaterial({color:0x9ea3a9,roughness:.3,metalness:1,envMap:env,envMapIntensity:.9}),
    rimIn:new THREE.MeshStandardMaterial({color:0x5a5e63,roughness:.45,metalness:1,envMap:env,envMapIntensity:.6,side:THREE.DoubleSide}),
    disc:new THREE.MeshStandardMaterial({color:0x6d6f72,roughness:.5,metalness:.9,envMap:env,envMapIntensity:.6}),
    chrome:new THREE.MeshStandardMaterial({color:0xe6e8ea,roughness:.08,metalness:1,envMap:env,envMapIntensity:1.2}),
    carbon:new P(Object.assign({color:0x07080a,roughness:.4,metalness:.1,envMap:env,envMapIntensity:.3},hi?{clearcoat:1,clearcoatRoughness:.08}:{})),
    black:new THREE.MeshStandardMaterial({color:0x0c0d0e,roughness:.45,metalness:0,envMap:env,envMapIntensity:.6}),
    glassM:new P(Object.assign({color:0x05070a,roughness:.02,metalness:0,envMap:env,envMapIntensity:1.4},hi?{clearcoat:1,clearcoatRoughness:0}:{}))
  };
  o.rims=MOD_RIMC.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.3,metalness:1,envMap:env,envMapIntensity:.9}));
  for(const m of Object.values(o))if(m.isMaterial)envMat(m);o.rims.forEach(envMat);
  return LOOKM[k]=o;
}
function paintMat(env,hi,color,maps){
  const P=hi?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
  return envMat(new P(Object.assign({color,map:maps.col,roughnessMap:maps.rm,metalnessMap:maps.rm,roughness:1,metalness:1,envMap:env,envMapIntensity:.75},
    hi?{clearcoat:1,clearcoatRoughness:.03}:{})));
}
// plate: a small canvas
const PLATE_TEX={};
function plateMat(text){text=text||MOD_STOCK.plate;
  if(PLATE_TEX[text])PLATE_TEX[text].lastUse=performance.now();
  else{const c=document.createElement("canvas");c.width=256;c.height=56;const x=c.getContext("2d");
    x.fillStyle="#f4f4f0";x.fillRect(0,0,256,56);x.fillStyle="#1d48b8";x.fillRect(0,0,28,56);x.fillStyle="#f2d23a";x.beginPath();x.arc(14,18,6,0,7);x.fill();
    x.fillStyle="#fff";x.font="700 15px Arial";x.textAlign="center";x.fillText("E",14,46);
    x.fillStyle="#141414";x.font="700 36px Arial";x.fillText(text,146,41,212);x.strokeStyle="#141414";x.lineWidth=2;x.strokeRect(1,1,254,54);
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;t.lastUse=performance.now();PLATE_TEX[text]=t;
    const used=new Set([text,MOD_STOCK.plate]);for(const c of builtCars())if(c.mods)used.add(c.mods.plate);
    const byT={};for(const k in PLATE_TEX)byT[k]={t:PLATE_TEX[k].lastUse,x:PLATE_TEX[k]};
    trimCache(byT,8,used,o=>o.x.dispose());for(const k in PLATE_TEX)if(!byT[k])delete PLATE_TEX[k]}
  return new THREE.MeshStandardMaterial({map:PLATE_TEX[text],roughness:.4,metalness:0})}
// a wing: an aerofoil across the car, with end plates
function aeroGeo(chord,thick,span){const s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(chord*.25,thick*1.4,chord,thick*.2);s.lineTo(chord,0);s.quadraticCurveTo(chord*.3,-thick*.25,0,0);
  const g=new THREE.ExtrudeGeometry(s,{depth:span,bevelEnabled:false,curveSegments:10});g.rotateY(Math.PI/2);g.translate(-span/2,0,0);g.rotateY(Math.PI);return g}
// paint finishes: METALLIC (stock), GLOSS, MATTE, PEARL. The paint texture holds the stock values; these scale them
const FINISH=[{m:1,r:1,cc:1,e:.75},{m:.3,r:.85,cc:1,e:.75},{m:.4,r:2,cc:0,e:.45},{m:1.6,r:.8,cc:1,e:.85,sh:0xc4d2ff}];
// the simpler material (phones, SMOOTH) has no clear coat to carry the shine, so its paint reflects less, or it looks washed out
function applyFinish(m,i){const f=FINISH[i]||FINISH[0],pl=m.isMeshPhysicalMaterial;m.metalness=f.m*(pl?1:.55);m.roughness=f.r*(pl?1:1.15);m.envMapIntensity=f.e*(pl?1:.6);
  if(m.isMeshPhysicalMaterial){m.clearcoat=f.cc;m.sheen=f.sh?new THREE.Color(f.sh):null}m.needsUpdate=true}
// decals painted from the shape itself: stripes over the top, a stripe along the side, a race number on the doors.
// Each is a mask (white where the colour goes) drawn over the paint; masks for stripes are shared by every car of a
// body type, a race number's are drawn per number (one for each side, so the digits read the right way on both)
function liveryMasks(parts,type,num){
  const K=parts.K,S=K.S,key=type===3?"n"+num:"t"+type;if(parts.liv[key]){if(type===3)parts.liv[key].t=performance.now();return parts.liv[key]}
  const base=bodyPaint(K),tw=parts.q>0?1024:512,th=parts.q>0?512:256,dA=S.doors[0];
  const paintAt=(x,y,z,nx,ny,nz)=>{const o={c:1,r:.36,m:.35,l:0,lr:1,lg:1,lb:1};base(x,y,z,nx,ny,nz,o,.004);return o.c>.99&&o.l===0};
  let glyph=null;
  if(type===3){const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");x.fillStyle="#fff";x.font="900 92px Arial";
    x.textAlign="center";x.textBaseline="middle";x.fillText(String(num),64,70,112);glyph=x.getImageData(0,0,128,128).data}
  const zc=(dA[0]+dA[1])/2,yc=K.bp.bot(zc)+(K.bp.top(zc)-K.bp.bot(zc))*.58,R=.2;
  const fn=mirror=>(x,y,z,nx,ny,nz,o)=>{
    if(!paintAt(x,y,z,nx,ny,nz))return;const ax=Math.abs(x);
    if(type===1){if((ny>.2||Math.abs(nz)>.3)&&((ax>.05&&ax<.17)||(ax>.21&&ax<.33)))o.l=1}
    else if(type===2){const T=K.bp.top(z),Bo=K.bp.bot(z),yb=Bo+(T-Bo)*S.belt+.05;if(Math.abs(nx)>.5&&Math.abs(y-yb)<.03&&z<K.z1-.35&&z>K.z0+.3)o.l=1}
    else if(type===3&&Math.abs(nx)>.5){const d=Math.hypot(z-zc,y-yc);if(d<R){
      const u=.5+(mirror?z-zc:zc-z)/(2*R*.82),v=.5-(y-yc)/(2*R*.82);let a=0;
      if(u>=0&&u<1&&v>=0&&v<1)a=glyph[(Math.floor(v*128)*128+Math.floor(u*128))*4+3]/255;
      o.l=a>.5?0:1}}};
  // a race number only covers the doors, so only that stretch is painted (the whole car took about 0.4 s a number)
  const paint=mirror=>paintSurface(K.z0,K.z1,K.sec,tw,th,true,fn(mirror),parts.body,type===3?[zc-R-.03,zc+R+.03]:null).lit;
  let cab=null;
  if(type===1){const cp=cabinPaint(K);cab=paintSurface(K.cz0,K.cz1,K.csec,parts.q>0?512:256,parts.q>0?256:128,true,(x,y,z,nx,ny,nz,o)=>{
    const t={c:1,r:.36,m:.35,l:0,lr:1,lg:1,lb:1};cp(x,y,z,nx,ny,nz,t);const ax=Math.abs(x);
    if(t.c>.99&&t.l===0&&ny>.3&&((ax>.05&&ax<.17)||(ax>.21&&ax<.33)))o.l=1},parts.cabin).lit}
  const made=parts.liv[key]=type===3?{R:paint(false),L:paint(true),cab:null,t:performance.now()}:{R:paint(false),L:null,cab,t:0};
  if(type===3){const nums={},used=new Set([key]);for(const k in parts.liv)if(k[0]==="n")nums[k]=parts.liv[k];
    for(const c of builtCars())if(c.mods&&c.mods.liv===3&&c.shape===K.shape&&c.q===parts.q)used.add("n"+c.mods.num);
    trimCache(nums,4,used,m=>{m.R.dispose();m.L.dispose()});for(const k in parts.liv)if(k[0]==="n"&&!nums[k])delete parts.liv[k]}
  return made;
}
// the window glass for a tint: one material per body type and tint, shared
function glassTint(parts,t,env,hi){
  if(!parts.glass[t]){const P=hi?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
    parts.glass[t]=envMat(new P(Object.assign({color:MOD_TINT[t],roughness:.03,metalness:0,envMap:env,envMapIntensity:1.3,alphaMap:parts.ct.lit,alphaTest:.5,
      polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4},hi?{clearcoat:1,clearcoatRoughness:0}:{})))}
  return parts.glass[t];
}
const tipMat=(i,env,Mt)=>i?envMat(new THREE.MeshStandardMaterial({color:MOD_EXHC[i],roughness:i===1?.4:.15,metalness:1,envMap:env,envMapIntensity:1})):Mt.chrome;
// every car model built now (yours, parked, the dealership's, rivals, the ghost): what a cache may not free
function builtCars(){const l=[...Object.values(carMeshes),...Object.values(showMeshes),...AIC.values()];if(GH.m)l.push(GH.m);return l}
// a cache of textures made for customisations (race numbers, plates) keeps at most n; past that, the ones longest unused
// and on no built car are freed. Without a limit, stepping a race number through 1 to 99 kept 198 large textures
function trimCache(map,n,inUse,free){
  const keys=Object.keys(map);if(keys.length<=n)return;
  keys.sort((a,b)=>map[a].t-map[b].t);
  for(const k of keys){if(Object.keys(map).length<=n)break;if(inUse.has(k))continue;free(map[k]);delete map[k]}
}
// options that only change a colour, a material or a texture are changed on the car where it is; the others (a rim style,
// spoiler, exhaust layout or livery) build the model again
const MOD_REBUILD=["rim","wing","exh","liv"];
function modsInPlace(c,to){
  const M=c.mods,R=c.refs;if(!R)return false;
  if(MOD_REBUILD.some(k=>M[k]!==to[k])||(to.liv===3&&M.num!==to.num))return false;
  if(M.fin!==to.fin)[c.bodyM,c.glass.material,...R.livMats].forEach(m=>applyFinish(m,to.fin));
  if(M.roof!==to.roof){const r=MOD_ROOF[to.roof];c.glass.material.color.copy(r===null?c.bodyM.color:new THREE.Color(r))}
  if(M.rimC!==to.rimC)R.rimMeshes.forEach(m=>m.material=R.Mt.rims[to.rimC]||R.Mt.rim);
  if(M.cal!==to.cal)R.calM.color.setHex(to.cal>0?MOD_CAL[to.cal]:R.S.cal);
  if(M.exhC!==to.exhC){const old=R.tips[0]&&R.tips[0].material,m=tipMat(to.exhC,R.env,R.Mt);R.tips.forEach(t=>t.material=m);if(old&&old!==R.Mt.chrome){CAR_ENV.mats.delete(old);old.dispose()}}
  if(M.livC!==to.livC)R.livMats.forEach(m=>m.color.setHex(MOD_LIVC[to.livC]));
  if(M.tint!==to.tint)R.tintMesh.material=glassTint(R.parts,to.tint,R.env,R.hi);
  if(M.plate!==to.plate){const m=plateMat(to.plate);R.plates.forEach(p=>{if(p.material!==m)p.material.dispose();p.material=m})}
  Object.assign(M,to);return true;
}
// how far out the wheels sit: the track, but never so far that the tyre stands outside the body's side over it
const wheelTrack=(pr,K)=>Math.min(pr.tr,Math.min(K.halfW(pr.wb),K.halfW(-pr.wb))-.15*pr.wr/.36+.01);
function addOpenCockpit(add){
  const shape=new THREE.Shape();
  shape.moveTo(-.16,0);shape.quadraticCurveTo(-.225,0,-.215,.08);
  shape.quadraticCurveTo(-.19,.18,-.21,.29);shape.quadraticCurveTo(-.22,.36,-.135,.39);
  shape.lineTo(-.12,.46);shape.quadraticCurveTo(-.12,.52,-.065,.52);
  shape.lineTo(.065,.52);shape.quadraticCurveTo(.12,.52,.12,.46);
  shape.lineTo(.135,.39);shape.quadraticCurveTo(.22,.36,.21,.29);
  shape.quadraticCurveTo(.19,.18,.215,.08);shape.quadraticCurveTo(.225,0,.16,0);shape.closePath();
  const back=new THREE.ExtrudeGeometry(shape,{depth:.09,bevelSize:.025,bevelThickness:.025,bevelSegments:2,curveSegments:5});
  const cushion=new THREE.SphereGeometry(1,16,10);
  const hoopPath=new THREE.CatmullRomCurve3([
    new V3(-.16,0,0),new V3(-.15,.15,0),new V3(-.09,.23,0),new V3(.09,.23,0),new V3(.15,.15,0),new V3(.16,0,0)
  ]);
  const hoop=new THREE.TubeGeometry(hoopPath,20,.035,8,false);
  for(const side of [-1,1]){
    const x=side*.36;
    add(cushion,seatM,x,.70,-.53).scale.set(.23,.075,.26);
    add(back,seatM,x,.70,-.73).rotation.x=-.22;
    add(hoop,darkInM,x,.94,-1.27);
  }
  // The low trim panel anchors both hoops and keeps the centre wind deflector below the headrests.
  add(new THREE.BoxGeometry(1.16,.08,.16),seatM,0,.94,-1.27);
  add(new THREE.BoxGeometry(.31,.12,.025),darkInM,0,1.02,-1.26);
}
function buildLook(cd,color,env,q,mods){
  const pr=PROF[cd.shape],hi=q>0,parts=carParts(pr,cd.shape,q,!!pr.open),K=parts.K,S=K.S,Mt=lookMats(env,hi),M=Object.assign({},MOD_STOCK,mods||{});
  const roof=MOD_ROOF[M.roof],wing=M.wing?MOD_WING[M.wing]:cd.wing;
  const G=new THREE.Group(),shell=new THREE.Group();G.add(shell);
  const bodyM=paintMat(env,hi,color,parts.bt),cabM=paintMat(env,hi,roof===null?color:roof,parts.ct);cabM.roughnessMap=parts.ct.rm;
  applyFinish(bodyM,M.fin);applyFinish(cabM,M.fin);
  const body=new THREE.Mesh(parts.body,bodyM);body.castShadow=true;shell.add(body);
  const glass=new THREE.Mesh(parts.cabin,cabM);glass.castShadow=true;G.add(glass);
  // window glass in the chosen tint, drawn over the glasshouse where its texture marks glass
  const tintMesh=new THREE.Mesh(parts.cabin,glassTint(parts,M.tint,env,hi));glass.add(tintMesh);const livMats=[];
  // livery: in its own colour, with the paint's shine
  if(M.liv>0){const mk=liveryMasks(parts,M.liv,M.num),P=hi?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
    const lm=(a,rm)=>{const m=envMat(new P(Object.assign({color:MOD_LIVC[M.livC],roughnessMap:rm,metalnessMap:rm,envMap:env,alphaMap:a,alphaTest:.5,
      polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4},hi?{clearcoatRoughness:.03}:{})));applyFinish(m,M.fin);livMats.push(m);return m};
    const lb=lm(mk.R,parts.bt.rm);
    if(mk.L)shell.add(new THREE.Mesh(parts.bodyR,lb),new THREE.Mesh(parts.bodyL,lm(mk.L,parts.bt.rm)));else shell.add(new THREE.Mesh(parts.body,lb));
    if(mk.cab)glass.add(new THREE.Mesh(parts.cabin,lm(mk.cab,parts.ct.rm)))}
  // lights glow from copies of the front and rear of the body, added on top
  const lightMat=c=>new THREE.MeshBasicMaterial({color:c,map:parts.bt.lit,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4});
  const headM=lightMat(0xfff4e0),tailM=lightMat(0x9a0e00);
  const hl=new THREE.Mesh(parts.body,headM),tl=new THREE.Mesh(parts.body,tailM);
  hl.onBeforeRender=(r,s,c,g)=>g.setDrawRange(parts.ranges.head[0],parts.ranges.head[1]);hl.onAfterRender=(r,s,c,g)=>g.setDrawRange(0,Infinity);
  tl.onBeforeRender=(r,s,c,g)=>g.setDrawRange(parts.ranges.tail[0],parts.ranges.tail[1]);tl.onAfterRender=(r,s,c,g)=>g.setDrawRange(0,Infinity);
  shell.add(hl,tl);
  const add=(g,m,x,y,z,par)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;(par||shell).add(o);return o};
  // mirrors on the doors, just behind the windscreen base
  const mz=pr.ws[0]-.18,my=pr.ws[1]+.07;
  // the mirror sits on the door top, just outside the glass, on a short black arm
  // The cap uses the same paint and finish as the body. Sample bare bonnet paint
  // at its centreline; wrapping the whole body atlas around a cap put grille and lamp marks on it.
  const capGeo=new THREE.SphereGeometry(.1,16,10),capUv=capGeo.attributes.uv;
  const bonnetZ=(pr.ws[0]+K.z1)/2;
  const paintU=Math.acos(1-2*(bonnetZ-K.z0)/(K.z1-K.z0))/Math.PI;
  for(let i=0;i<capUv.count;i++)capUv.setXY(i,paintU,1);
  for(const s of [-1,1]){const hw=K.halfW(mz),xs=hw-S.tuck*1.7;
    const cap=add(capGeo,bodyM,s*(hw+.02),my+.07,mz);cap.scale.set(.8,.55,1.1);
    const gl=add(new THREE.CircleGeometry(.075,16),Mt.chrome,s*(hw+.02),my+.07,mz-.105);gl.rotation.y=Math.PI;gl.scale.set(1.05,.68,1);
    add(new THREE.BoxGeometry(hw+.02-xs,.03,.07),Mt.black,s*(xs+hw+.02)/2,my+.03,mz+.02)}
  // number plates
  const pyF=K.bp.bot(K.z1-.1)+.13,pyR=K.bp.bot(K.z0+.1)+.2;
  const pm=plateMat(M.plate);
  const pf=add(new THREE.PlaneGeometry(.46,.1),pm,0,pyF,K.z1);
  const pb=add(new THREE.PlaneGeometry(.46,.1),pm,0,pyR,K.z0);pb.rotation.y=Math.PI;
  // Check the actual bumper across the plate. A cross-section wide enough to hold the plate can sit behind the bumper.
  // The 18 rays took about 9 ms a car (a race start builds three, the dealership one per car shown), so the answer
  // is kept with the body's shape, which every car of that body and quality shares
  let pz=PLATE_Z.get(parts.body);
  if(!pz){pz=[];const plateRay=new THREE.Raycaster();
    for(const [p,dir] of [[pf,1],[pb,-1]]){
      const end=p.position.z;let surface=null;
      plateRay.ray.direction.set(0,0,-dir);
      for(const x of [-.23,0,.23])for(const y of [-.05,0,.05]){
        plateRay.ray.origin.set(x,p.position.y+y,end+dir);
        const hit=plateRay.intersectObject(body)[0];
        if(hit&&(surface===null||dir*hit.point.z>dir*surface))surface=hit.point.z;
      }
      pz.push((surface??end)+dir*.012);
    }
    PLATE_Z.set(parts.body,pz)}
  pf.position.z=pz[0];pb.position.z=pz[1];
  // exhausts in the diffuser
  const ey=K.bp.bot(K.z0+.15)+.1,ez=(()=>{let z=K.z0;for(let i=0;i<40;i++){const zz=K.z0+i*.01;if(K.halfW(zz)>.6){z=zz;break}}return z})();
  // stock tips for the body type, or TWIN (one each side), QUAD (two each side), CENTRE (two in the middle, larger)
  const hwE=Math.min(.62,K.halfW(ez+.02)-.32);
  const ex=M.exh===1?[-hwE,hwE]:M.exh===2?[-hwE,-hwE+.13,hwE-.13,hwE]:M.exh===3?[-.11,.11]:cd.shape==="super"?[-.18,.18]:cd.shape==="hatch"?[.55]:[-.62,-.5,.5,.62];
  const tr=M.exh===3?.065:M.exh?.055:.045,tip=new THREE.CylinderGeometry(tr,tr+.005,.12,18,1,true),tipIn=new THREE.CircleGeometry(tr-.006,14);
  const tipM=tipMat(M.exhC,env,Mt),tips=[];
  for(const x of ex){const t=add(tip,tipM,x,ey,ez+.03);tips.push(t);t.rotation.x=Math.PI/2;const d=add(tipIn,Mt.black,x,ey,ez+.05);d.rotation.y=Math.PI}
  // wings
  const R=K.z0,rt=K.bp.top(R+.25);
  if(wing==="big"){const w=add(aeroGeo(.42,.06,pr.w-.02),Mt.carbon,0,rt+.42,R+.48);w.rotation.x=.12;
    for(const s of [-1,1]){add(new THREE.BoxGeometry(.012,.15,.38),Mt.carbon,s*(pr.w/2-.02),rt+.44,R+.3);const st=add(new THREE.BoxGeometry(.03,.4,.1),Mt.carbon,s*.45,rt+.21,R+.32);st.rotation.x=.25}}
  else if(wing==="mid"){add(aeroGeo(.3,.045,pr.w-.24),Mt.carbon,0,rt+.2,R+.36).rotation.x=.08;for(const s of [-1,1])add(new THREE.BoxGeometry(.03,.2,.08),Mt.carbon,s*.5,rt+.09,R+.28)}
  else if(wing==="lip"){const w=add(aeroGeo(.18,.03,pr.w*.82),bodyM,0,rt+.0,R+.2);w.rotation.x=-.12}
  // open-top cars: low seats in the recessed cockpit, with hoops behind them
  if(pr.open)addOpenCockpit(add);
  // contact shadow
  const sh=new THREE.Mesh(new THREE.PlaneGeometry(pr.w+.7,K.z1-K.z0+.8),shadowMat());sh.rotation.x=-Math.PI/2;sh.position.set(0,.02,(K.z0+K.z1)/2);sh.renderOrder=-1;G.add(sh);
  // wheels
  const rimMeshes=[],W=wheelParts(MOD_RIMS[M.rim]||S.rim),rimM=Mt.rims[M.rimC]||Mt.rim,calM=envMat(new THREE.MeshStandardMaterial({color:M.cal>0?MOD_CAL[M.cal]:S.cal,roughness:.35,metalness:.2,envMap:env,envMapIntensity:.8}));
  const wheels=[],front=[],sc=pr.wr/.36;
  const tw=wheelTrack(pr,K);
  [[-tw,pr.wb,1],[tw,pr.wb,1],[-tw,-pr.wb,0],[tw,-pr.wb,0]].forEach(([x,z,f])=>{
    const st=new THREE.Group();st.position.set(x,pr.wr,z);if(x<0)st.scale.x=-1;
    const spin=new THREE.Group();spin.scale.setScalar(sc);
    const ty=new THREE.Mesh(W.tire,Mt.tire);ty.castShadow=true;const fc=new THREE.Mesh(W.face,rimM),br=new THREE.Mesh(W.barrel,Mt.rimIn),lp=new THREE.Mesh(W.lip,rimM);rimMeshes.push(fc,lp);const cp=new THREE.Mesh(W.cap,Mt.black);
    spin.add(ty,fc,br,lp,cp);
    const bl=new THREE.Mesh(wheelGeo.blur,blurM);bl.rotation.z=Math.PI/2;bl.visible=false;spin.add(bl);spin.userData.spokes=[fc,cp];spin.userData.blur=bl;
    const fixed=new THREE.Group();fixed.scale.setScalar(sc);fixed.add(new THREE.Mesh(W.disc,Mt.disc),new THREE.Mesh(W.hub,Mt.rimIn));
    const cal=new THREE.Mesh(W.cal,calM);cal.position.x=.02;cal.rotation.x=z>0?0:Math.PI*.1;fixed.add(cal);
    st.add(fixed,spin);G.add(st);wheels.push(spin);if(f)front.push(st)});
  return{G,shell,glass,body,bodyM,cabM,headM,tailM,wheels,front,K,mods:M,refs:{parts,env,hi,Mt,S,tintMesh,livMats,tips,rimMeshes,calM,plates:[pf,pb]},
    paint(c){bodyM.color.setHex(c);if(MOD_ROOF[M.roof]===null)cabM.color.setHex(c)}};
}
let shadowM=null;
function shadowMat(){if(shadowM)return shadowM;const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");
  const g=x.createRadialGradient(64,64,10,64,64,64);g.addColorStop(0,"rgba(0,0,0,.75)");g.addColorStop(.55,"rgba(0,0,0,.45)");g.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=g;x.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);
  return shadowM=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,color:0xffffff,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-8})}

// how detailed car models are: SMOOTH graphics, and AUTO on phones and tablets, get the simpler paint (no clear coat) and
// less detailed shapes; SHARP always gets the detailed ones
const carQ=()=>save.gfx===1?1:save.gfx===2||isTouch?0:1;
// after a graphics change: every car model already built at the other level is built again (keeping where it is, its
// paint and whether it shows), so SMOOTH lightens the cars on the road and in the garage at once. Rivals in a race and
// the ghost follow at their next use
// one car's model built again where it stands (its customisation changed, or to preview one); the dealership's copy
// is dropped, to be built afresh when next shown
function rebuildCar(id,mods){
  const o=carMeshes[id];if(!o)return getCar(id);
  if(o.q===carQ()&&modsInPlace(o,Object.assign({},MOD_STOCK,mods||modsOf(id)))){if(showMeshes[id]){disposeHeroCar(showMeshes[id]);delete showMeshes[id]}return o}
  const par=o.G.parent,paint=testDrive?.id===id?testDrive.paint:paintOf(id);
  disposeHeroCar(o);const n=buildHeroCar(carById(id),paint,mods||modsOf(id));carMeshes[id]=n;(par||scene).add(n.G);
  n.G.position.copy(o.G.position);n.G.quaternion.copy(o.G.quaternion);
  // A graphics change can rebuild the car while paused, when the drive loop cannot restore its pose.
  for(const part of ["inside","glass","shell"])n[part].visible=o[part].visible;
  n.tailM.color.copy(o.tailM.color);n.steerWheel.rotation.z=o.steerWheel.rotation.z;n.blurOn=o.blurOn;
  n.wheels.forEach((wheel,i)=>{
    const old=o.wheels[i];
    wheel.rotation.x=old.rotation.x;wheel.parent.position.y=old.parent.position.y;
    wheel.userData.blur.visible=old.userData.blur.visible;
    wheel.userData.spokes.forEach((spoke,j)=>spoke.visible=old.userData.spokes[j].visible);
  });
  n.front.forEach((mount,i)=>mount.rotation.y=o.front[i].rotation.y);
  if(id===curId){attachCar(id,id!==save.cur);if(RIDE.st==="ride"&&RIDE.car===id)rideSeat()}
  n.G.visible=o.G.visible;
  if(showMeshes[id]){disposeHeroCar(showMeshes[id]);delete showMeshes[id]}
  return n;
}
function rebuildCarModels(){
  const q=carQ();
  for(const id in carMeshes)if(carMeshes[id].q!==q)rebuildCar(id);
  for(const id in showMeshes){const o=showMeshes[id];if(o.q===q)continue;disposeHeroCar(o);delete showMeshes[id]}
  if(state==="DEALER")dPick(dSel);
}
const PLATE_Z=new WeakMap();   // where the plates sit, by body shape (see buildLook)
function buildHeroCar(cd,color,mods){
  const pr=PROF[cd.shape];
  const q=carQ(),L=buildLook(cd,color===undefined?cd.body:color,carEnvTex(),q,mods);
  const G=L.G,body=L.bodyM,shell=L.shell,glass=L.glass,tailM=L.tailM,headM=L.headM;
  const add=(g,m,x,y,z,rx=0,ry=0,par)=>{const q=new THREE.Mesh(g,m);q.position.set(x,y,z);q.rotation.set(rx,ry,0);q.castShadow=true;(par||G).add(q);return q};
  const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  const w={wheels:L.wheels,front:L.front};
  // cockpit (left-hand drive)
  const inside=new THREE.Group();inside.visible=false;G.add(inside);
  const[wz,wy]=pr.ws,dx=.37,cw=pr.cw,ez=wz-1.0;   // driver sits on the left (+x)
  // the outer shell is hidden in this view, so the dash, doors and floor stand in for it
  add(B(cw+.1,.3,.8),darkInM,0,wy-.13,ez+.74,0,0,inside);
  add(B(cw+.1,.04,2.6),seatM,0,wy-.62,ez-.4,0,0,inside);
  add(B(.28,.34,.7),darkInM,0,wy-.36,ez+.05,0,0,inside);
  add(B(.38,.13,.16),darkInM,dx,wy+.065,ez+.6,0,0,inside);
  add(B(.4,.03,.12),darkInM,dx,wy+.145,ez+.56,0,0,inside);
  const gp=new THREE.Mesh(new THREE.PlaneGeometry(.33,.11),gaugeM);gp.position.set(dx,wy+.07,ez+.518);gp.rotation.set(-.15,Math.PI,0,"YXZ");inside.add(gp);
  const wheelG=new THREE.Group();wheelG.position.set(dx,wy-.05,ez+.27);wheelG.rotation.x=-.42;inside.add(wheelG);
  const sw=new THREE.Group();wheelG.add(sw);
  sw.add(new THREE.Mesh(new THREE.TorusGeometry(.19,.026,8,28),darkInM));
  sw.add(new THREE.Mesh(B(.36,.035,.02),darkInM));sw.add(new THREE.Mesh(B(.035,.17,.02),darkInM).translateY(-.085));
  const pill=(a,b)=>{const L=a.distanceTo(b),m=new THREE.Mesh(B(.07,.07,L),body);m.position.copy(a).add(b).multiplyScalar(.5);m.lookAt(b);inside.add(m)};
  [-1,1].forEach(s=>{
    if(pr.open)pill(new V3(s*(cw/2-.06),wy+.02,wz-.02),new V3(s*(cw/2-.2),pr.roof-.02,pr.roofF+.05));
    else pill(new V3(s*(cw/2-.06),wy+.02,wz-.02),new V3(s*(cw/2-.16),pr.roof-.03,pr.roofF));
    add(B(.08,.5,1.9),darkInM,s*(cw/2+.02),wy-.2,ez,0,0,inside);
  });
  if(!pr.open){add(B(cw-.08,.04,1.5),headlinerM,0,pr.roof-.04,pr.roofF-.7,0,0,inside);add(B(.24,.07,.03),darkInM,0,pr.roof-.12,pr.roofF-.12,0,0,inside)}
  else add(B(cw-.2,.05,.05),darkInM,0,pr.roof-.02,pr.roofF+.05,0,0,inside);
  return{G,damageSmoke:createDamageSmoke(G),id:cd.id,wheels:w.wheels,front:w.front,tailM,headM,glass,shell,inside,steerWheel:sw,bodyM:body,wr:pr.wr,wb:pr.wb,tr:pr.tr,
    eye:new V3(dx,Math.max(pr.eye+.03,wy+.24),ez),front_z:pr.front,shape:cd.shape,paint:L.paint,q,mods:L.mods,refs:L.refs};
}

const TPROF={
  hatch:{b:[[-1.85,.24],[1.85,.24],[1.96,.5],[1.86,.66],[1.15,.82],[.42,1.34],[-1.45,1.4],[-1.88,1.1],[-1.93,.5],[-1.85,.24]],w:1.74,wb:1.25,tr:.84,len:1.9},
  sedan:{b:[[-2.3,.26],[2.25,.26],[2.36,.5],[2.25,.72],[1.3,.86],[.6,1.38],[-1.2,1.42],[-1.85,1.0],[-2.3,.96],[-2.38,.6],[-2.3,.26]],w:1.82,wb:1.42,tr:.86,len:2.35}
};
const tGeoCache={},TRAFFIC_MATS=new Set();
function buildTrafficCar(color,shape){
  const pr=PROF[shape==="hatch"?"hatch":"sedan"],key=shape==="hatch"?"hatch":"sedan",parts=carParts(pr,key,0),env=carEnvTex();
  if(!tGeoCache[key]){const W=wheelParts(LOOK[key].rim),items=[],sc=pr.wr/.36;
    const tw=wheelTrack(pr,parts.K);
    for(const [x,z] of [[-tw,pr.wb],[tw,pr.wb],[-tw,-pr.wb],[tw,-pr.wb]]){
      const m=new THREE.Matrix4().makeTranslation(x,pr.wr,z).multiply(new THREE.Matrix4().makeScale(x<0?-sc:sc,sc,sc));
      items.push({g:W.tire,m,c:0x101112},{g:trafficDisc,m,c:0x7d8288},{g:W.cap,m,c:0x2a2c2f})}
    // Batch the two satin door mirrors with the wheels so distant traffic keeps three draws.
    const mirrorZ=pr.ws[0]-.18,mirrorY=pr.ws[1]+.12,shoulder=parts.K.halfW(mirrorZ);
    const housing=new THREE.SphereGeometry(1,8,5),stem=new THREE.BoxGeometry(1,1,1);
    for(const side of [-1,1]){
      items.push({g:stem,m:mat(side*(shoulder-.035),mirrorY-.04,mirrorZ,0,.18,.035,.055),c:0x292c2e},
        {g:housing,m:mat(side*(shoulder+.065),mirrorY,mirrorZ,0,.095,.057,.11),c:0x383c40});
    }
    tGeoCache[key]=merge(items);housing.dispose();stem.dispose()}
  const G=new THREE.Group();
  const bodyM=envMat(new THREE.MeshStandardMaterial({color,map:parts.bt.col,roughnessMap:parts.bt.rm,metalnessMap:parts.bt.rm,roughness:1,metalness:1,
    envMap:env,envMapIntensity:.7,emissive:0xffffff,emissiveMap:parts.bt.lit,emissiveIntensity:.35}));
  const cabM=envMat(new THREE.MeshStandardMaterial({color,map:parts.ct.col,roughnessMap:parts.ct.rm,metalnessMap:parts.ct.rm,roughness:1,metalness:1,envMap:env,envMapIntensity:.8}));
  TRAFFIC_MATS.add(bodyM);
  const b=new THREE.Mesh(parts.body,bodyM),c=new THREE.Mesh(parts.cabin,cabM),w=new THREE.Mesh(tGeoCache[key],trafficWheelM);
  b.castShadow=c.castShadow=true;G.add(b,c,w);
  return{G,damageSmoke:createDamageSmoke(G),wheels:[],len:TPROF[shape].len};
}
const trafficWheelM=new THREE.MeshLambertMaterial({vertexColors:true});
// traffic wheels don't turn, so they get a plain dished disc rather than spokes that would stand still at speed
const trafficDisc=(()=>{const g=new THREE.CylinderGeometry(.238,.225,.04,28);g.rotateZ(Math.PI/2);g.translate(.1,0,0);return g})();

/* ---------- hero car instances: one per car you drive or park, separate ones for the showroom ---------- */
const carMeshes={},showMeshes={};
function getCar(id){if(!carMeshes[id]){carMeshes[id]=buildHeroCar(carById(id),paintOf(id),modsOf(id));scene.add(carMeshes[id].G)}return carMeshes[id]}
function getShowCar(id){if(!showMeshes[id]){const c=buildHeroCar(carById(id),paintOf(id),modsOf(id));c.G.visible=false;podium.add(c.G);c.G.position.y=.3;showMeshes[id]=c}return showMeshes[id]}
function parkCar(c,slot){
  const[sx,sz,sy]=SPOTS[slot];c.G.position.copy(gW(sx,sz));c.G.rotation.set(0,gYaw+Math.PI+sy,0);c.front.forEach(f=>f.rotation.y=0);
  c.inside.visible=false;c.glass.visible=true;c.shell.visible=true;c.G.visible=true;
  // A car can be parked straight from a drive, with blurred spokes and its suspension still loaded.
  c.blurOn=false;c.wheels.forEach(w=>{w.parent.position.y=c.wr;w.userData.blur.visible=false;w.userData.spokes.forEach(s=>s.visible=true)});
}
// park every owned car in its bay; cars you no longer own are hidden
// cars parked in the garage are only drawn when the camera is near the house
function cullParked(){const near=Math.hypot(camera.position.x-HOUSE.x,camera.position.z-HOUSE.z)<150;
  save.owned.forEach((id,i)=>{const c=carMeshes[id];if(c&&c!==pc&&i<SPOTS.length&&!LEFT.some(l=>l.id===id))c.G.visible=near});
  // and your home's furniture and finishes, now that you can walk up to the room (they were only drawn in the garage, so
  // the room stood empty, its furniture there to bump into all the same)
  if(typeof HV!=="undefined"&&HV.root&&state!=="EXIT"&&state!=="LOAD")HV.root.visible=near;
  // and a friend you've asked over, in the room (js/life.js guestAbout)
  if(typeof guestAbout==="function"&&state!=="EXIT"&&state!=="LOAD")guestAbout(near)}
function parkAll(except){
  leftClear();   // cars left out in the world: yours go back to their bays, taken ones are gone
  for(const id in carMeshes)if(!save.owned.includes(id)&&id!==except)carMeshes[id].G.visible=false;
  save.owned.forEach((id,i)=>{if(id!==except&&i<SPOTS.length)parkCar(getCar(id),i)});
}
/* ================================================================ INPUT */
const keys={},pad={};
const PAD_OWN=[];   // touch pointers held on each group of on-screen pads (set up with the pads)
function clearInput(){if(typeof workClose==="function")workClose();for(const k in keys)keys[k]=false;for(const k in pad)pad[k]=false;PAD_OWN.forEach(m=>m.clear());document.querySelectorAll(".pb.on").forEach(e=>e.classList.remove("on"))}
let locked=false,autoHold=false;
// a game controller (the first one connected, standard layout): left stick steers, right trigger is the gas, left
// trigger the brake, A the handbrake; Start pauses, View/Back opens the map, Y changes camera, X is the prompt key
const GP={on:false,steer:0,gas:0,brake:0,hb:false,rear:false,fire:false,index:null,prev:[],t:0};
// screens opened from the pause menu, and how each closes
/** @type {[string, () => void][]} */
const PAUSE_SUBS=[["repair",()=>closeRepair()],["passport",()=>passportClose()],["jobs",()=>jobsClose()],["cups",()=>cupsClose()],["skills",()=>skillsClose()],["needs",()=>needsClose()],["play",()=>netClose()],["collections",()=>collectionsClose()]];
// a controller in the pause menu: the D-pad moves between the buttons of the menu (or of the screen opened from it),
// with an outline on the one picked, and A presses it
function padMenu(hit){
  const sub=PAUSE_SUBS.map(([id])=>$(id)).find(e=>!e.classList.contains("hide"));padIn(sub||$("pause"),hit);
}
// the same in any panel: the D-pad moves between its buttons and A presses the one picked
function padIn(box,hit){
  const bs=/** @type {HTMLElement[]} */([...box.querySelectorAll("button,a.mbtn,input")]).filter(b=>b.offsetParent&&!(/** @type {HTMLButtonElement} */(b).disabled));
  if(!bs.length)return;
  const i=bs.indexOf(/** @type {HTMLElement} */(document.activeElement)),d=hit(12)||hit(14)?-1:hit(13)||hit(15)?1:0;
  if(d){const b=bs[i<0?(d>0?0:bs.length-1):(i+d+bs.length)%bs.length];document.querySelectorAll(".padSel").forEach(e=>e.classList.remove("padSel"));
    b.classList.add("padSel");b.focus({preventScroll:true});b.scrollIntoView({block:"nearest"})}
  else if(hit(0)&&i>=0)bs[i].click();
}
// either stick scrolls the list in a screen opened from the pause menu: the Postcards list has no buttons for the
// D-pad to move through, and the Passport's places not found yet have none, so a list taller than the screen could
// only be seen in part with a controller
// (at 840 px a second, whatever the frame rate: it was 14 px a frame, four times as far at 120 frames a second as at
// 30; Codex's audit)
function padScroll(g,dt=1/60){
  const sub=PAUSE_SUBS.map(([id])=>$(id)).find(e=>!e.classList.contains("hide"));if(!sub)return;
  const dz=a=>Math.abs(a)<.2?0:Math.sign(a)*(Math.abs(a)-.2)/.8,y=dz(g.axes[3]||0)||dz(g.axes[1]||0);if(!y)return;
  // the innermost first (a list inside a card that scrolls too), and what's left of the move, once it's at its end, to
  // the one round it: the card used to take it all, and its list never moved (Codex's review)
  const els=/** @type {HTMLElement[]} */([...sub.querySelectorAll("ol,ul,div")]).filter(el=>el.scrollHeight>el.clientHeight+1&&/auto|scroll/.test(getComputedStyle(el).overflowY));
  els.sort((a,b)=>a.contains&&a.contains(b)?1:b.contains&&b.contains(a)?-1:0);
  let d=y*840*dt;
  for(const el of els){const was=el.scrollTop;el.scrollTop=was+d;d-=el.scrollTop-was;if(Math.abs(d)<1)break}
}
function pollPad(){
  let g=null;try{const l=navigator.getGamepads?navigator.getGamepads():[];for(const x of l)if(x&&x.connected){g=x;break}}catch(e){}
  // (and the pause menu's scroll clock starts again: reconnected in a screen of the pause menu, the first move jumped)
  if(!g){GP.on=false;GP.steer=GP.gas=GP.brake=0;GP.hb=GP.rear=GP.fire=false;GP.prev.length=0;GP.index=null;GP.t=0;GO.stick[0]=GO.stick[1]=0;return}
  const ax=g.axes[0]||0,b=i=>g.buttons[i]||{pressed:false,value:0},v=i=>{const q=b(i);return typeof q.value==="number"&&q.value>0?q.value:q.pressed?1:0};
  GP.on=true;GP.steer=Math.abs(ax)<.12?0:Math.sign(ax)*(Math.abs(ax)-.12)/.88;GP.gas=v(7);GP.brake=v(6);GP.hb=b(0).pressed;GP.rear=b(4).pressed;GP.fire=b(5).pressed;
  // buttons pressed since the last frame
  const now=g.buttons.map(q=>!!(q&&q.pressed)),was=g.index===GP.index?GP.prev:[],hit=i=>now[i]&&!was[i];GP.index=g.index;GP.prev=now;
  // the cloud save's screens sit over the garage or the pause menu: B closes them, and nothing behind them reacts
  // a stopped tab, or the cloud save's screens open: the garage view's stick stops too (it kept turning behind them)
  if(tabIdle||clOverlayOpen())GO.stick[0]=GO.stick[1]=0;
  if(tabIdle)return;
  // (the D-pad and A work its buttons too: only B did, so the chooser couldn't be answered; Codex's audit)
  if(clOverlayOpen()){if(hit(1))clEscape();else if(typeof padIn==="function")padIn($($("cloudPick").classList.contains("hide")?"cloud":"cloudPick"),hit);return}
  if(WORK.panel){GP.steer=GP.gas=GP.brake=0;GP.fire=GP.hb=false;workPad(hit);return}
  // the party's invitations, opened on foot in the house: B closes them, and the walker stays put behind
  if(state==="DRIVE"&&typeof partyOpen==="function"&&partyOpen()){GP.steer=GP.gas=GP.brake=0;GP.fire=GP.hb=false;if(hit(1))partyPanelClose();else padIn($("party"),hit);return}
  const inputState=state;
  // (the pause menu's scroll clock starts again on each visit: it kept the last one's time, and the first move jumped)
  if(state!=="PAUSE")GP.t=0;
  if(state==="ARRIVAL"){if(hit(0)||hit(1)||hit(9))finishArrival();return}
  else if(state==="WARDROBE"){
    if(hit(14)||hit(12))moveLook(-1);
    else if(hit(15)||hit(13))moveLook(1);
    else if(hit(3))backView=!backView;
    else if(hit(0)||hit(9))wearOutfit();
    return;
  }
  else if(state==="DRIVE"&&TALK.p)talkPad(hit);
  else if(state==="DRIVE"){if(hit(9))pauseOn();else if(hit(8))openMap();else if(hit(3)&&!FOOT.on&&!BOAT.on)cycleCam();else if(hit(2)&&promptAct)promptAct();else if(hit(1)&&!FOOT.on&&!BOAT.on)footExit()}
  // in the pause menu, B or Start closes a screen opened from it (passport, contracts) before the menu itself
  else if(state==="PAUSE"){if(hit(9)||hit(1)){const sub=PAUSE_SUBS.find(([id])=>!$(id).classList.contains("hide"));if(sub)sub[1]();else pauseOff()}else{padMenu(hit);const now=performance.now(),pdt=GP.t?clamp((now-GP.t)/1000,0,.1):1/60;GP.t=now;padScroll(g,pdt)}}
  else if(state==="LOAD"){if(hit(0)&&!$("lstart").classList.contains("hide"))$("lstart").click()}
  else if(state==="MAP"){if(hit(8)||hit(1)){if(!$("passport").classList.contains("hide"))passportClose();else closeMap()}}
  // B closes the picture just taken first, as Escape does; from Photo Mode itself it goes back
  else if(state==="PHOTO"){if(hit(1)){if(!$("phShot").classList.contains("hide"))photoShotClose();else photoExit()}}
  // A press that opened another screen belongs only to the screen it started on.
  if(state!==inputState){GO.stick[0]=GO.stick[1]=0;return}
  // the right stick turns the garage view; it's read here and applied by time in garageCam (per frame, it turned four
  // times as fast at 120 fps as at 30). Not while designing your home, whose view it would turn unseen, to jump to on DONE
  {const dz=a=>Math.abs(a)<.2?0:Math.sign(a)*(Math.abs(a)-.2)/.8;const turn=state==="GARAGE"&&!HV.on&&!(typeof partyOpen==="function"&&partyOpen());GO.stick[0]=turn?dz(g.axes[2]||0):0;GO.stick[1]=turn?dz(g.axes[3]||0):0}
  if(state==="GARAGE"&&cuOpen()){if(hit(1))custClose(false);else if(hit(0))custClose(true)}
  else if(state==="GARAGE"&&typeof partyOpen==="function"&&partyOpen()){if(hit(1))partyPanelClose();else padIn($("party"),hit)}
  // designing: the D-pad and A work the panel (BUY included), the left stick moves the piece's preview, Y turns it
  else if(state==="GARAGE"&&HV.on){if(hit(1)||hit(9))hvClose();else if(hit(3))hvTurn();else{padIn($("hd"),hit);hvStick(g)}}
  // Y: HANG OUT with a friend over, or the party's button (THROW A PARTY, SEE THEM OFF)
  else if(state==="GARAGE"&&hit(3)){const b=/** @type {HTMLButtonElement|undefined} */(["gGuest","gParty"].map(id=>$(id)).find(x=>!x.classList.contains("hide")&&!(/** @type {HTMLButtonElement} */(x).disabled)));if(b)b.click()}
  // (RB, SLEEP, after the D-pad: first, held with it, it took the press and the next car was never picked)
  else if(state==="GARAGE"){if(hit(0))goDrive();else if(hit(2))needsRest();else if(hit(14))$("gprev").onclick();else if(hit(15))$("gnext").onclick();else if(hit(5))needsSleep();else if(hit(4))goUpstairs()}
  // in the dealership A buys the car shown (or drives it, if it's yours), X takes it for a test drive
  else if(state==="DEALER"){const on=id=>{const b=$(id);return !b.classList.contains("hide")&&!b.disabled};
    if(hit(1))closeDealer();else if(hit(12)||hit(14))dPick(dSel-1);else if(hit(13)||hit(15))dPick(dSel+1);
    else if(hit(0)){if(on("dBuy"))$("dBuy").onclick();else if(on("dDrive"))$("dDrive").onclick()}else if(hit(2)&&on("dTest"))$("dTest").onclick()}
  else if(state==="INTRO"){if(hit(0))$("iGo").onclick();else if(hit(1))$("iNo").onclick();else if(hit(14))setDiff(save.diff-1);else if(hit(15))setDiff(save.diff+1)}
  // A goes on to the next championship round when there is one, B (or A otherwise) continues
  else if(state==="RESULT"){if(hit(0)&&resNext)$("rNext").onclick();else if(hit(0)||hit(1))$("rOk").onclick()}
}
addEventListener("gamepadconnected",e=>{if(typeof toast==="function")toast("CONTROLLER CONNECTED","Stick to steer, triggers for gas and brake, A handbrake, Start pause")});
// tilt-to-steer on phones: the phone is a steering wheel. Its turn in the screen's own plane is worked out from the
// up direction (from the tilt angles), so it works however far back the phone is held; the angle it's held at when
// tilt is switched on, or the game is resumed, is straight ahead. About 26 degrees is full lock
const TILT={phi:null,zero:null};
function tiltPhi(e){
  if(e.beta==null||e.gamma==null)return null;
  const b=e.beta*Math.PI/180,g=e.gamma*Math.PI/180,ux=-Math.cos(b)*Math.sin(g),uy=Math.sin(b);
  const a=((screen.orientation&&typeof screen.orientation.angle==="number"?screen.orientation.angle:+window.orientation||0))*Math.PI/180;
  const sx=ux*Math.cos(a)-uy*Math.sin(a),sy=ux*Math.sin(a)+uy*Math.cos(a);
  // lying flat there's no clear up within the screen: no steering from tilt
  return Math.hypot(sx,sy)<.3?null:Math.atan2(-sx,sy);
}
addEventListener("deviceorientation",e=>{TILT.phi=tiltPhi(e);if(TILT.zero===null&&TILT.phi!==null)TILT.zero=TILT.phi});
const tiltSteer=()=>{if(!save.tilt||!isTouch||TILT.phi===null||TILT.zero===null)return 0;const d=wrapA(TILT.phi-TILT.zero);return Math.abs(d)<.03?0:clamp(d/.45,-1,1)};
// steering, -1 (full left) to 1 (full right): keys and on-screen pads win, then the controller's stick, then tilt
function steerIn(){if(locked)return 0;const k=((keys.arrowright||keys.d||pad.R)?1:0)-((keys.arrowleft||keys.a||pad.L)?1:0);if(k)return k;if(GP.on&&GP.steer)return GP.steer;return tiltSteer()}
const gasIn=()=>locked?0:(keys.arrowup||keys.w||pad.G)?1:GP.gas>.05?GP.gas:0;
const brakeIn=()=>locked?0:(keys.arrowdown||keys.s||pad.B)?1:GP.brake>.05?GP.brake:0;
const kL=()=>steerIn()<-.3;
const kR=()=>steerIn()>.3;
const kB=()=>brakeIn()>0;
// auto gas waits after the car is placed at a standstill (map travel, reset, leaving the dealer)
// until the player touches a control, so the car doesn't roll away from where it was put
const kG=()=>{if(locked)return false;if(autoHold&&(gasIn()||kB()||kL()||kR()||kH()))autoHold=false;return !!(gasIn()||(save.auto&&!autoHold&&!kB()))};
const kH=()=>!locked&&(keys[" "]||pad.H||GP.hb);
// how far the pedals are pressed: keys, pads and auto gas are all the way; a controller's triggers anywhere between
const gasAmt=()=>{const g=gasIn();return g>0?g:kG()?1:0};

/* ================================================================ PLAYER CAR PHYSICS
   Arcade model: throttle/brake along the car, tyres bleed
   off sideways speed (less with the handbrake or off the asphalt), the yaw rate
   follows the steering angle but is capped by how much grip the tyres have. */
const P={x:0,y:0,z:0,h:0,vx:0,vz:0,vy:0,r:0,ty:0,air:false,airT:0,steer:0,pitch:0,roll:0,nr:null,onRoad:true,hit:0,hitT:0,water:false};
const activePlayer=()=>BOAT.on?BOAT:FOOT.on?FOOT:P;
let pc=null;        // current car instance
let shake=0;
const fwdOf=h=>({x:Math.sin(h),z:Math.cos(h)});
// extra ride height on the low cars, so their tyres show under the body from the chase camera
function rideH(c){return c&&c.shape==="suv"?0:.04}
// sits a car on the ground under its four wheels: height, nose up or down and side tilt, eased so it doesn't jitter
function seatCar(o,G,x,z,yaw,wb,tr,dt,ride){
  const c=Math.cos(yaw),s=Math.sin(yaw),g=(lx,lz)=>surfH(x+lx*c+lz*s,z-lx*s+lz*c);
  const fl=g(-tr,wb),fr=g(tr,wb),rl=g(-tr,-wb),rr=g(tr,-wb);
  const pitch=-Math.atan(clamp((fl+fr-rl-rr)/(4*wb),-.2,.2)),roll=Math.atan(clamp((fr+rr-fl-rl)/(4*tr),-.13,.13));
  if(o.pitch===undefined){o.pitch=pitch;o.roll=roll}else{const k=Math.min(1,dt*12);o.pitch+=(pitch-o.pitch)*k;o.roll+=(roll-o.roll)*k}
  G.position.set(x,(fl+fr+rl+rr)/4+(ride||0),z);G.rotation.set(o.pitch,yaw,o.roll,"YXZ");
}
function speedF(){return P.vx*Math.sin(P.h)+P.vz*Math.cos(P.h)}
function kphNow(){return Math.abs(speedF())*3.6}
// handling tune (one place so it can be balanced against the race AI, whose acceleration uses pBase and pAcc too).
// Nov 2026 playtest: engines 15% stronger (pBase, pAcc); the corner-speed assist takes bends closer to the tyres'
// grip (csGrip, was .76); at speed the wheel turns in more slowly and short presses are softer (rUpHi was 3.4,
// expHi 1.3, and both now reach their high-speed value by 140 km/h, steerV), so a tap at 100 km/h moves the car less
// Playtest, 8 Nov: holding W in a bend at speed, the car ran up to about a metre wide of its lane (towards the centre
// line on a bend away from it, which read as pulling left). The assist now pulls back to the lane three times as hard
// (laneK, was 1): in the Kazan 6 at about 125 km/h, 90% of the time within 0.34 m of the lane centre (was 0.75 m)
// Out of the tightest hairpin that stronger pull (and the throttle) still took the car across the centre line, 2 m
// off its lane, because the tyres were already at their limit: now, while the assist is turning as hard as grip
// allows and the road wants more (satAt), the car lifts off and brakes gently (satLift) instead. Worst case 0.8 m
// Junction turns with the assist (Jo Yee's video, 24 Nov 2026): a right-angle turn is planned as an arc of jR m. A
// steering key held into a junction sets how much room the turn has from where it began (its distance to the
// junction's middle plus jIn, at least jMin) and brakes at up to csTurn m/s² to suit
const STEER_SENS=[.7,1,1.35];
const HD={latBase:1.2,latGrip:.6,latLow:.25,rUp:6,rUpHi:2,rBack:10,rBackHi:7,rCounter:14,steerEase:25,expHi:1.6,steerV:39,
  asK:2.6,asLim:.9,csGrip:.83,csBrake:5,csPlan:4,csBand:3,thrUp:3.2,pBase:3.7,pAcc:9.2,offDrag:2.2,offDragV:.035,yawResp:10,rMin0:5,rMinV:.7,laneK:3,laneMax:.15,antT:.15,antMax:12,satAt:.97,satLift:2,brk0:6,brk1:13,brkUp:1,revMax:8,thrUp0:9,jR:18,jIn:4,jMin:10,csTurn:10};
// fastest speed for a bend of curvature k: limited by grip, and in tight
// corners by the smallest circle the car turns at that speed
const vCorner=(k,aC)=>Math.min(Math.sqrt(aC/k),Math.max(4,(.92/k-HD.rMin0)/HD.rMinV));
// jn: the samples that cross a junction. There the roads' centre lines meet at a point, so the turn looks much sharper
// than the arc a car drives across the junction: it counts as an arc of HD.jR m for a right angle (tighter for a sharper
// turn). Counted as the kink it was, a right-angle turn asked for about 22 km/h, and the car braked from 130 km/h to
// a crawl 120 m before an Old Quay T-junction with only the throttle held (Jo Yee's video, 24 Nov 2026)
function limitFromAngles(ang,sp,aC,jn){
  let lim=1e9;
  for(let i=1;i<ang.length-1;i++){
    let k=Math.abs(wrapA(ang[i+1]-ang[i-1]))/16+1e-4;
    if(jn&&jn.length)for(const j of jn)if(i>=j-1&&i<=j+2){
      const turn=Math.abs(wrapA(ang[Math.min(ang.length-1,j+3)]-ang[Math.max(0,j-2)]));
      k=Math.min(k,Math.max(turn,.2)/(Math.PI/2)/HD.jR+1e-4);break}
    const vc=vCorner(k,aC),dd=i*8;
    lim=Math.min(lim,Math.sqrt(vc*vc+2*HD.csPlan*Math.max(0,dd-sp*.35)));
  }
  return lim;
}
// Include reaction travel and braking distance. The cap bounds each plan to 63 eight-metre samples.
const lookAhead=sp=>Math.min(480,Math.max(24+sp*2.4,sp*.35+sp*sp/(2*HD.csPlan)));
function cornerLimit(nr,dir,sp,aC){
  // the fastest speed at which the car can still take the bends coming up,
  // braking at a comfortable rate before each one. The look-ahead carries on
  // through junctions along the straightest way out (at a T-junction that is
  // the turn itself). Also reports how far ahead the next junction is.
  const look=lookAhead(sp),ang=[],jn=[];let e=nr.e,s=nr.s,d=0,jD=1e9,jN=null,jLimit=1e9;
  while(d<=look+16){
    const q=edgePos(e,s),h=Math.atan2(q.dx*dir,q.dz*dir);ang.push(h);
    let ns=s+dir*8;d+=8;
    if(ns>e.len||ns<0){
      const over=ns>e.len?ns-e.len:-ns,node=ns>e.len?e.b:e.a;
      if(node.adj.length>2){if(d-over<jD){jD=d-over;jN=node}jn.push(ang.length)}
      let best=null,bd=9;
      for(const a of node.adj){if(a.e===e||(a.e.type==="drive"&&e.type!=="drive"))continue;
        const d2=a.end==="a"?1:-1,q2=edgePos(a.e,d2>0?0:a.e.len),dd=Math.abs(wrapA(Math.atan2(q2.dx*d2,q2.dz*d2)-h));
        if(dd<bd){bd=dd;best={e:a.e,dir:d2}}}
      // A country approach can meet the coast at an oblique T. Until the driver
      // chooses an exit, allow enough room for the tighter of the two arcs.
      if(node.adj.length===3&&e.type==="country"){
        const inPos=edgePos(e,dir>0?e.len-12:12),incoming=Math.atan2(node.x-inPos.x,node.z-inPos.z);
        let minTurn=Infinity,maxTurn=0;
        for(const arm of node.adj)if(arm.e!==e){
          const out=edgePos(arm.e,arm.end==="a"?12:arm.e.len-12);
          const turn=Math.abs(wrapA(Math.atan2(out.x-node.x,out.z-node.z)-incoming));
          minTurn=Math.min(minTurn,turn);maxTurn=Math.max(maxTurn,turn);
        }
        if(minTurn>Math.PI/4){
          const radius=HD.jR/Math.max(1,Math.tan(maxTurn/2));
          const vc=vCorner(1/radius,aC);
          jLimit=Math.min(jLimit,Math.sqrt(vc*vc+2*HD.csPlan*Math.max(0,d-over-HD.jR-sp*.35)));
        }
      }
      if(!best)break;
      e=best.e;dir=best.dir;s=dir>0?Math.min(over,e.len):Math.max(0,e.len-over);
    }else s=ns;
  }
  return{lim:Math.min(jLimit,limitFromAngles(ang,sp,aC,jn)),jD,jN};
}
// the same along a known route (an event, or the GPS line), which knows which way it turns at junctions
function pathLimit(R,s0,sp,aC){
  const look=lookAhead(sp),ang=[],jn=[];let last=null;
  for(let d=0;d<=look+16&&s0+d<=R.len;d+=8){const q=edgePos(R,s0+d);ang.push(Math.atan2(q.dx,q.dz));
    const n=junctionAt(q.x,q.z);if(n&&n!==last&&n.adj.length>2)jn.push(ang.length-1);last=n}
  return limitFromAngles(ang,sp,aC,jn);
}
// the middle of the nearest lane, on either side of the road, for a position across it (0 = the centre line);
// a position beyond the road's edge is left as it is
function laneNear(e,x){
  if(Math.abs(x)>e.half)return x;
  let best=x,bd=1e9;for(const l of RT[e.type].lanes)for(const c of [l,-l]){const d=Math.abs(x-c);if(d<bd){bd=d;best=c}}
  return best;
}
const REVERSE_STOP=.03; // allow for tiny residual movement, but brake a car that is still creeping forwards
function stepPlayer(dt){
  const cd=curCar();
  const fx=Math.sin(P.h),fz=Math.cos(P.h),rx=-fz,rz=fx;
  let vF=P.vx*fx+P.vz*fz,vS=P.vx*rx+P.vz*rz;
  const nr=nearestRoad(P.x,P.z,24);P.nr=nr;
  const onRoad=(!!nr&&nr.d<nr.e.half+.7)||!!junctionAt(P.x,P.z);P.onRoad=onRoad;
  const th=groundH(P.x,P.z),sand=!onRoad&&th<3.4;
  const surf=onRoad?1:sand?.55:.72;
  // past the finish line the car brakes itself to a stop (the controls are locked) before the result shows
  // stopping to get out (FOOT.stop, js/people.js) takes over both pedals and brakes the car to rest, going forwards or
  // backwards (Codex's review of #79: reversing with S held, it waited 4 s and gave up, still going at 28.8 km/h)
  const stopping=FOOT.stop>0,pedB=kB()&&!stopping;
  const gas=kG()&&!stopping,brake=pedB||(!!ev&&ev.phase==="finish"&&vF>.5)||(stopping&&Math.abs(vF)>.5),hb=kH(),sp0=Math.abs(vF),gA=gas?gasAmt():0,bA=pedB?brakeIn():1;
  const vMax=onRoad?cd.top/3.6:sand?Math.min(cd.top/3.6*.35,20):Math.min(cd.top/3.6*.45,30),power=(HD.pBase+cd.acc*HD.pAcc)*damagePower(P);
  // tyre grip: arcade-strong on asphalt, a bit more at low speed
  const vN=clamp(sp0/55,0,1),aLatRoad=9.81*(HD.latBase+cd.grip*HD.latGrip)*(1+HD.latLow*(1-vN)),aLat=aLatRoad*surf;
  // road the car is driving along, and which way along it
  const f0=fwdOf(P.h),rdir=nr?((f0.x*nr.dx+f0.z*nr.dz)>=0?1:-1):1;
  const alongRoad=!!nr&&Math.abs(wrapA(Math.atan2(nr.dx*rdir,nr.dz*rdir)-P.h))<.6;
  // corner speed assist: holding W into a bend the car cannot make eases off and brakes gently
  // and holding a steering key into a junction slows the car enough to make the turn
  const si=steerIn(),tgt0=Math.abs(si)>.5?Math.sign(si):0;
  P.holdT=tgt0&&tgt0===P.holdDir?(P.holdT||0)+dt:0;P.holdDir=tgt0;
  let over=0,brkMax=HD.csBrake;P.aBrk=false;
  if(!P.holdT)P.turnRoom=null;
  if(save.assist&&vF>12&&!brake&&!hb&&nr&&nr.d<nr.e.half+5){
    const aC=aLatRoad*HD.csGrip;let jD=1e9,jN=null,path=null,ps=0;
    if(ev&&ev.phase==="run"&&ev.d<14){path=ev.R;ps=ev.sNow}
    else if(!ev&&gps.route&&gps.route.len>40){const tr=trackRoute(gps.route,P.x,P.z,0);if(tr.d<14){path=gps.route;ps=tr.s}}
    if(path){const q=edgePos(path,ps);if(q.dx*f0.x+q.dz*f0.z<.5)path=null}
    if(path)over=vF-pathLimit(path,ps,vF,aC);
    else if(alongRoad){const c=cornerLimit(nr,rdir,vF,aC);over=vF-c.lim;jD=c.jD;jN=c.jN}
    // a steering key held into a junction: slow enough to make the turn from where it began. Begun about a turning
    // circle out, the car goes round on an arc of HD.jR m; begun later it needs a tighter one, so it brakes harder,
    // up to HD.csTurn, since the junction ahead was planned for that arc and a late turn has more speed to lose.
    // It was a 16 m arc wherever the turn began: late turns ran wide, so the plan ahead had to be a crawl
    const jx=P.holdT>.2&&Math.abs(P.steer)>.7?junctionAt(P.x,P.z)||(jD<32?jN:null):null;
    if(jx){
      if(P.turnRoom==null)P.turnRoom=clamp((jx.x-P.x)*f0.x+(jx.z-P.z)*f0.z+HD.jIn,HD.jMin,HD.jR);
      over=Math.max(over,vF-vCorner(1/P.turnRoom,aC));brkMax=HD.csTurn;
    }else P.turnRoom=null;
  }
  // the assist is already turning the car as hard as the tyres allow and the road wants more: lift off rather than
  // accelerate wide (out of a hairpin the car used to power across the centre line)
  if(save.assist&&P.asSat&&!brake)over=Math.max(over,HD.satLift);
  // throttle comes in over a fraction of a second instead of all at once (quicker pulling away, 0.1 s, than at speed).
  // Near the speed the assist allows for the bend ahead it eases off gradually over the last csBand m/s instead of
  // cutting out and coming back each step (Nov 2026: the car lost 50-70 km/h before bends with W held)
  const thrCap=gas&&!brake&&over<=0?(over===0?1:Math.min(1,-over/HD.csBand)):0,thrUp=lerp(HD.thrUp0,HD.thrUp,clamp(vF/15,0,1));
  // it eases towards how far the pedal is pressed (a controller's trigger part-way), never past it: ramping towards full
  // and pulling back afterwards let a light trigger build up to full throttle at a crawl, where the ramp is quickest
  const tT=Math.min(thrCap,gA),t0=P.thr||0;P.thr=t0<tT?Math.min(tT,t0+thrUp*dt):Math.max(tT,t0-8*dt);
  // Holding the brake from a crawl must stop the car. Check motion before this step's slope force.
  const bHeld=pedB;if(!bHeld)P.brkHold=false;else if(vF>REVERSE_STOP)P.brkHold=true;
  if(!P.air){const sl=(surfH(P.x+fx*2,P.z+fz*2)-surfH(P.x-fx*2,P.z-fz*2))/4;vF-=9.81*sl*.75*dt}
  // the brake builds up while it's held: gentle at first (6 m/s²), full (13 m/s²) after a second, so a quick press
  // slows the car instead of stopping it dead. Nov 2026: was 9 to 22 m/s² in 0.7 s, which threw away speed into bends.
  // Past the finish line it's strong at once
  P.brkT=brake&&vF>.5?(P.brkT||0)+dt:0;
  const bF=ev&&ev.phase==="finish"?24:lerp(HD.brk0,HD.brk1,smooth(0,HD.brkUp,P.brkT));
  // a brake held from moving stops the car and keeps it there; reversing takes a fresh press at a standstill
  // (holding the brake to stop used to carry straight on into reverse, up to 40 km/h)
  if(gas&&!brake&&vF<-.5)vF+=22*dt;
  else if(brake){if(vF>.5)vF-=bF*bA*dt;else if(P.brkHold||!bHeld){const d=Math.max(bF,6)*dt;vF=Math.abs(vF)<=d?0:vF-Math.sign(vF)*d}else vF=Math.max(vF-5*bA*dt,-HD.revMax)}
  else if(P.thr>0&&!P.air)vF+=power*P.thr*Math.max(0,1-(vF/vMax)**2)*dt;
  if(!gas&&!brake||over>0){const dec=(.7+.00042*vF*vF)*dt;vF=Math.abs(vF)<=dec?0:vF-Math.sign(vF)*dec}
  if(over>.6){vF-=Math.min(brkMax,(over-.6)*3)*dt;P.aBrk=true}
  if(!onRoad){const d=((sand?3:HD.offDrag)+HD.offDragV*Math.abs(vF))*dt;vF=Math.abs(vF)<=d?0:vF-Math.sign(vF)*d}
  if(vF>vMax)vF-=7*dt;
  if(hb){const d=6*dt;vF=Math.abs(vF)<=d?0:vF-Math.sign(vF)*d}
  if(!P.air)vS*=Math.exp(-(7+cd.grip*8)*surf*(hb?.16:1)*dt);
  // steering. Keys turn the wheel in quickly, a little more gently at speed,
  // and the turn rate is capped by the tyres' grip.
  // the steering input can be anywhere from -1 to 1 (a controller's stick, tilt); STEERING sensitivity scales how fast
  // the wheel turns in
  const tgt=si,on=Math.abs(tgt)>=.05,sp=Math.abs(vF),dirV=vF>=0?1:-1,vNs=clamp(sp/HD.steerV,0,1);
  const rate=!on?lerp(HD.rBack,HD.rBackHi,vN):(P.steer*tgt<0?HD.rCounter:lerp(HD.rUp,HD.rUpHi,vNs)*STEER_SENS[save.steer]);
  P.steer+=clamp(tgt-P.steer,-rate*dt,rate*dt);
  // a short easing on top rounds off the start and end of each key press so the turn builds and lets go smoothly
  P.steerS=(P.steerS||0)+(P.steer-(P.steerS||0))*(1-Math.exp(-dt*HD.steerEase));
  const s=Math.sign(P.steerS)*Math.pow(Math.abs(P.steerS),lerp(1,HD.expHi,vNs));
  // at low speed a full key press would spin the car on the spot, so the
  // tightest circle grows with speed (about 12 m at 30 km/h, 20 m at 60 km/h)
  const rGeo=sp*Math.tan(.62)/2.6,rLat=aLat/Math.max(sp,2.5),rLow=sp/(HD.rMin0+sp*HD.rMinV),rCap=Math.min(rGeo,rLat,rLow);
  let rT=s*rCap*dirV;
  if(hb&&sp>6)rT=s*Math.min(rGeo,rLat*2)*dirV;
  // steering assist: follows the road and holds your line. With no key pressed
  // it keeps the car at the spot across the road where you last let go of
  // A/D, steering back gently if it drifts. That line is the middle of the lane
  // you were nearest (either side of the road), so a short press doesn't leave the
  // car on the divider or the edge line. With a key pressed the way the road
  // bends, it makes sure the car turns at least enough to follow it. Steering
  // against it (changing lanes, turning off) always wins, and the line is re-set
  // to the nearest lane wherever you let go.
  P.asSat=false;
  if(save.assist&&!hb&&nr&&sp>4&&dirV>0&&(onRoad||nr.d<nr.e.half+5)){
    const sideDrv=nr.side*rdir,gap=nr.e.half-Math.abs(sideDrv),band=Math.max(.6,nr.e.half-1.3);
    // road direction just ahead (covers the car's reaction lag) and its bend
    const ant=Math.min(HD.antMax,sp*HD.antT),q=edgePos(nr.e,nr.s+rdir*ant);
    let want=Math.atan2(q.dx*rdir,q.dz*rdir);
    // the line to hold: while you steer, and until the car has straightened
    // up after you let go, it follows the car; then it stays put
    if(on||P.laneT==null){P.laneT=sideDrv;P.laneLock=false;P.laneWait=0}
    if(!P.laneLock){P.laneT=sideDrv;P.laneWait+=dt;if(Math.abs(wrapA(want-P.h))<.03||P.laneWait>1.5){P.laneLock=true;P.laneT=laneNear(nr.e,sideDrv)}}
    const laneT=clamp(P.laneT,-band,band);
    const pb=edgePos(nr.e,nr.s+rdir*(ant-6)),pf=edgePos(nr.e,nr.s+rdir*(ant+6));
    const rFF=-wrapA(Math.atan2(pf.dx*rdir,pf.dz*rdir)-Math.atan2(pb.dx*rdir,pb.dz*rdir))/12*sp;
    // back toward the held line (positive heading = to the left)
    if(P.laneLock||Math.abs(sideDrv)>band)want+=clamp(Math.atan2(HD.laneK*(sideDrv-laneT),Math.max(sp,6)),-HD.laneMax,HD.laneMax);
    const err=wrapA(want-P.h);
    // the assist fades out as the car points further from the road, instead of switching off at a
    // fixed angle, so the turn rate never jumps
    const lim=junctionAt(P.x,P.z)?.35:HD.asLim,aw=1-smooth(lim*.6,lim,Math.abs(err));
    if(aw>0){
      const dem=rFF-err*HD.asK,rA=clamp(dem,-rCap,rCap)*aw;
      P.asSat=aw>.5&&Math.abs(dem)>rCap*HD.satAt&&(!on||Math.sign(tgt)===Math.sign(dem));
      if(!on)rT+=rA*(1-Math.abs(P.steer));
      else if(Math.sign(rA)===Math.sign(rT)&&Math.abs(rA)>Math.abs(rT))rT=rA;
      // already on the edge at speed: steering further towards it is softened, more the closer it gets
      else if(onRoad&&sp>15&&gap<.6&&Math.sign(rT)===Math.sign(sideDrv))rT*=lerp(1,.5,aw*(1-Math.max(0,gap)/.6));
    }
  }else if(!nr||nr.d>nr.e.half+5||sp<=4)P.laneT=null;
  P.r+=(rT-P.r)*(1-Math.exp(-dt*HD.yawResp));
  P.vx=fx*vF+rx*vS;P.vz=fz*vF+rz*vS;
  P.h-=P.r*dt;                       // positive steer = right = heading decreases
  P.x+=P.vx*dt;P.z+=P.vz*dt;
  // vertical: the car stays on the ground; a little smoothing acts as suspension
  const nr2=nearestRoad(P.x,P.z,24),tNew=surfH(P.x,P.z,nr2);
  if(Math.abs(tNew-P.ty)>.8)P.ty=tNew;else P.ty=clamp(P.ty+(tNew-P.ty)*Math.min(1,dt*35),tNew,tNew+.08);
  P.air=false;P.vy=0;P.y=P.ty;
  P.water=tNew<-.6;
}
// Glancing contact is harmless. A hard impact loses power, but the car always remains drivable.
const damagePower=car=>1-(car.damage||0)*.0035;
let repairWarnLevel=0;
const damageWarnTier=n=>n>=100?4:n>=90?3:n>=60?2:n>=25?1:0;
function damageAlert(amount){
  const tier=damageWarnTier(amount);if(tier<=repairWarnLevel)return;
  repairWarnLevel=tier;
  const msgs=[null,
    ["VEHICLE DAMAGED","Tap DAMAGE for repair options. Garage repairs are free."],
    ["ENGINE POWER REDUCED","Repair at home for free, or use credits when stationary."],
    ["CRITICAL DAMAGE","Tap DAMAGE to see repair options."],
    ["MAXIMUM DAMAGE","The car can still drive. Tap DAMAGE to repair."]];
  const m=msgs[tier];toast(m[0],m[1],tier>=3?"bad":undefined);
}
function damageVehicle(car,speed){
  if(speed<=4||(car.damageT||0)>0)return;
  car.damage=Math.min(100,(car.damage||0)+Math.min(30,(speed-4)*1.4));car.damageT=.25;
  if(car===P)damageAlert(car.damage);
}
function tickDamage(car,dt){if(car.damageT>0)car.damageT-=dt}
let smokeMaterial=null;
// Allocate one hidden puff with each car, so collisions never grow the scene.
// Its material/texture are shared for the session; disposing a car must not dispose them.
function createDamageSmoke(group){
  if(!smokeMaterial){
    const canvas=document.createElement("canvas");canvas.width=canvas.height=32;
    const ctx=canvas.getContext("2d"),g=ctx.createRadialGradient(16,16,1,16,16,16);
    g.addColorStop(0,"rgba(91,92,94,.65)");g.addColorStop(.55,"rgba(108,110,112,.33)");g.addColorStop(1,"rgba(115,116,118,0)");
    ctx.fillStyle=g;ctx.fillRect(0,0,32,32);
    smokeMaterial=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false});
  }
  const smoke=new THREE.Sprite(smokeMaterial);
  smoke.visible=false;smoke.userData.age=0;group.add(smoke);return smoke;
}
function showDamageSmoke(model,damage,dt=0){
  const smoke=model.damageSmoke;
  if(!(damage>=35)){smoke.visible=false;smoke.userData.age=0;return}
  smoke.visible=true;const age=smoke.userData.age=(smoke.userData.age+dt*.8)%1;
  smoke.position.set(0,1.15+age*.65,model.front_z?model.front_z*.62:1.05);
  smoke.scale.setScalar(.6+age*.45+damage*.004);
}
function collidePlayer(){
  const fx=Math.sin(P.h),fz=Math.cos(P.h);let impact=0;const pvx=P.vx,pvz=P.vz;
  let touch=false,cn=null;
  // push out of the obstacle; the speed into it bounces back a little, and the speed
  // along it is only trimmed by friction, so the car slides along a wall or guardrail
  const resolve=(nx,nz,pen,npc,sn,cs)=>{P.x+=nx*pen;P.z+=nz*pen;touch=true;
    const along=npc?nx*sn+nz*cs:0,speed=npc?.v||0,closing=speed*along-P.vx*nx-P.vz*nz;
    if(closing>0){
      const impulse=closing*(npc ? .72 : closing>6 ? 1.25 : 1.05);P.vx+=impulse*nx;P.vz+=impulse*nz;
      // NPCs follow lanes, so the impact changes the part of their speed along the lane.
      if(npc){npc.v=Math.max(0,speed-impulse*along);damageVehicle(npc,closing)}
      const vb=P.vx*nx+P.vz*nz,tx=P.vx-vb*nx,tz=P.vz-vb*nz,tl=Math.hypot(tx,tz);
      if(tl>1e-3){const k=Math.max(0,1-.28*closing/tl);P.vx=vb*nx+tx*k;P.vz=vb*nz+tz*k}
      if(closing>impact){impact=closing;cn=[nx,nz]}}};
  const boxHit=(cx,cz,r,ox,oz,hx,hz,cs,sn,npc)=>{
    const dx=cx-ox,dz=cz-oz,lx=dx*cs-dz*sn,lz=dx*sn+dz*cs;
    const qx=clamp(lx,-hx,hx),qz=clamp(lz,-hz,hz);let ex=lx-qx,ez=lz-qz,d=Math.hypot(ex,ez);
    if(d>=r)return;
    let pen;if(d<1e-4){const px=hx-Math.abs(lx),pz=hz-Math.abs(lz);if(px<pz){ex=Math.sign(lx)||1;ez=0;pen=px+r}else{ex=0;ez=Math.sign(lz)||1;pen=pz+r}}else{ex/=d;ez/=d;pen=r-d}
    resolve(ex*cs+ez*sn,-ex*sn+ez*cs,pen,npc,sn,cs);return true;
  };
  for(const k of [-1.35,0,1.35]){
    const cx=P.x+fx*k,cz=P.z+fz*k,r=1.0;
    obstaclesNear(cx,cz,r+1,o=>{
      if(o.c){const dx=cx-o.x,dz=cz-o.z,d=Math.hypot(dx,dz),pen=r+o.r-d;if(pen>0&&d>1e-4)resolve(dx/d,dz/d,pen)}
      else boxHit(cx,cz,r,o.x,o.z,o.hx,o.hz,o.cs,o.sn);
    });
    for(const t of TRAFFIC){if(Math.abs(t.wx-cx)>7||Math.abs(t.wz-cz)>7)continue;
      if(boxHit(cx,cz,r,t.wx,t.wz,.95,t.c.len,Math.cos(t.yaw),Math.sin(t.yaw),t)){t.hitT=1.5;copBump(t,Math.hypot(pvx-Math.sin(t.yaw)*t.v,pvz-Math.cos(t.yaw)*t.v))}}
    for(const l of LEFT)if(Math.abs(l.x-cx)<7&&Math.abs(l.z-cz)<7)boxHit(cx,cz,r,l.x,l.z,.95,2.3,Math.cos(l.h),Math.sin(l.h));
    if(ev)for(const a of ev.ai){if(Math.abs(a.x-cx)>7||Math.abs(a.z-cz)>7)continue;
      if(boxHit(cx,cz,r,a.x,a.z,1.0,2.3,Math.cos(a.yaw),Math.sin(a.yaw),a))a.lat+=Math.sign(a.lat-P.lat||1)*.05}
  }
  if(impact>3){P.r*=.6;const f=1-.3*Math.min(1,(impact-3)/17);P.vx*=f;P.vz*=f}else if(impact>0)P.r*=.92;
  // a glancing contact turns the car along the wall or rail instead of letting it grind into it;
  // a near head-on hit (more than about 60 degrees) does not
  if(cn&&speedF()>2){const tx=-cn[1],tz=cn[0],sg=(P.vx*tx+P.vz*tz)>=0?1:-1,e=wrapA(Math.atan2(tx*sg,tz*sg)-P.h);
    if(Math.abs(e)<1.05){P.h+=e*Math.min(.45,.12+impact*.05);P.r*=.5}}
  if(touch)P.scrape=Math.max(P.scrape||0,Math.min(1,Math.hypot(P.vx,P.vz)/22));
  damageVehicle(P,impact);
  if(impact>5.5){const now=performance.now()/1000;shake=Math.max(shake,Math.min(.6,(impact-4)/16));P.hitT=1.2;streakCrash();
    if(impact>8)P.flashT=Math.min(.7,impact/30);
    if(!(now-(P.lastThump||0)<.3)){P.lastThump=now;playThump(impact)}}
}

/* ================================================================ TRAFFIC (two-way, right-hand lanes) */
const TRAFFIC=[];let TEDGES=[],TEDGE_CUM=[],bubbleT=0;
// town streets near you hold at most TOWN_CAP cars: traffic is slow there, so cars piled up in the narrow streets and
// were hard to drive through without hitting one (about 7 within 150 m, against 3 to 5 on open roads). townN is the count
// within TOWN_R of you, kept up to date every half second
const TOWN_CAP=isTouch?3:5,TOWN_R=200;let townN=0;
const nearTown=t=>{const me=activePlayer();return !t.free&&!!t.e&&t.e.type==="town"&&Math.abs(t.wx-me.x)<TOWN_R&&Math.abs(t.wz-me.z)<TOWN_R};
const TCOLS=[0xe8e8e6,0xbfc3c8,0x2d2f33,0x7a1f1f,0x2b4a7a,0xd9cfb8,0x5d6b4a,0xa0a4a8,0x1f1f22,0xc9b27a,0x8a2c2c,0xf0f0f0];
function initTraffic(){
  TEDGES=EDGES.filter(e=>e.type!=="drive"&&e.len>24);let c=0;TEDGE_CUM=TEDGES.map(e=>c+=e.len);
  const n=isTouch?22:34;
  for(let i=0;i<n;i++){const col=TCOLS[i%TCOLS.length],shape=i%3===0?"hatch":"sedan",c=buildTrafficCar(col,shape);c.G.visible=false;scene.add(c.G);TRAFFIC.push({c,col,shape,e:null,lost:true,dir:1,s:0,lane:0,off:0,offCur:0,base:0,v:0,stopT:0,hitT:0,waitT:0,passT:0,pa:null,wx:1e6,wz:1e6,yaw:0})}
}
function pickEdge(){const r=Math.random()*TEDGE_CUM[TEDGE_CUM.length-1];let i=0;while(TEDGE_CUM[i]<r)i++;return TEDGES[i]}
function setLane(t){const ln=RT[t.e.type].lanes;t.lane=Math.min(t.lane,ln.length-1);t.off=ln[t.lane]*SIDE();t.offCur=t.off;t.passT=0;t.waitT=0;t.base=RT[t.e.type].spd*(.85+Math.random()*.3)}
// during a race or time trial, traffic on the route only drives the same way as the race: a car coming the other
// way blocks overtaking. evDirs maps each road the route uses to the race's direction along it (0 = both ways)
let evDirs=null;
function routeDirs(R){
  const m=new Map();
  for(let s=0;s<=R.len;s+=4){const q=edgePos(R,s),nr=nearestRoad(q.x,q.z,3);if(!nr||nr.d>1.5)continue;
    const al=q.dx*nr.dx+q.dz*nr.dz;if(Math.abs(al)<.8)continue;
    const d=al>0?1:-1,o=m.get(nr.e);m.set(nr.e,o===undefined||o===d?d:0)}
  return m;
}
const oncoming=(e,dir)=>!!evDirs&&evDirs.has(e)&&evDirs.get(e)!==dir;
function spawnTraffic(t,dmin,dmax,avoidView){
  const me=activePlayer();
  for(let k=0;k<50;k++){
    const e=pickEdge(),s=Math.random()*e.len,p=edgePos(e,s),dx=p.x-me.x,dz=p.z-me.z,d=Math.hypot(dx,dz);
    if(d<dmin||d>dmax)continue;
    if(e.type==="town"&&townN>=TOWN_CAP&&d<TOWN_R+150)continue;
    if(avoidView){const cf=new V3();camera.getWorldDirection(cf);if((dx*cf.x+dz*cf.z)/d>.2)continue}
    let dir=Math.random()<.5?1:-1;if(oncoming(e,dir)){dir=-dir;if(oncoming(e,dir))continue}
    // never too close to a junction ahead to slow for it at its speed, nor just past one (a car put on the highway
    // 25 m before a junction at 87 km/h couldn't stop when another car took its turn there, overshot the line and
    // stood in the junction, and the car crossing drove through it)
    {const ahead=dir>0?e.b:e.a,behind=dir>0?e.a:e.b,vmax=RT[e.type].spd*1.15;
      if(ahead.adj.length>2&&(dir>0?e.len-s:s)<20+vmax*vmax/14)continue;
      if(behind.adj.length>2&&(dir>0?s:e.len-s)<12)continue}
    // never on top of another car
    if(TRAFFIC.some(o=>o!==t&&o.e&&Math.abs(o.wx-p.x)<14&&Math.abs(o.wz-p.z)<14))continue;
    if(t.cop)t.free=false;   // successful road placement also ends free driving after a wreck
    t.e=e;t.lost=false;t.s=s;t.dir=dir;t.lane=Math.floor(Math.random()*2);setLane(t);t.v=t.base;t.stopT=0;t.pa=null;
    t.damage=t.damageT=0;showDamageSmoke(t.c,0);
    // where it stands now and which way it faces, so a car placed next in the same frame sees it, and nothing reads
    // its old heading at its new place
    const ux=p.dx*dir,uz=p.dz*dir;t.wx=p.x-uz*t.off;t.wz=p.z+ux*t.off;t.yaw=Math.atan2(ux,uz);return true;
  }
  // A failed placement remains hidden and retries with the next traffic bubble.
  t.e=null;t.lost=true;t.c.G.visible=false;t.wx=t.wz=1e6;
  return false;
}
// at the start of an event: every car driving against the race on its route goes somewhere else, out of sight
// (a car with nowhere to go for now tries again every half second)
function clearOncoming(){
  for(const t of TRAFFIC){if(t.free||!t.e||!oncoming(t.e,t.dir))continue;
    t.e=null;t.c.G.visible=false;t.wx=t.wz=1e6;
    t.lost=!spawnTraffic(t,220,560,true)}
}
// the roads a car could take at a junction (not back the way it came, nor against a race), and which of them are
// free to turn into now: none whose first few metres hold a car going the same way, none where a race rival is about
// to pass where it would join
function exitsAt(t,node){
  const opts=node.adj.filter(a=>a.e!==t.e&&a.e.type!=="drive"&&!oncoming(a.e,a.end==="a"?1:-1));
  const free=opts.filter(a=>{const d2=a.end==="a"?1:-1,s0=d2>0?0:a.e.len;if(TRAFFIC.some(o=>o!==t&&!o.free&&o.e===a.e&&o.dir===d2&&(o.s-s0)*d2<9))return false;
    if(ev&&ev.ai.length){const q=edgePos(a.e,s0);if(ev.ai.some(r=>Math.hypot(r.x-q.x,r.z-q.z)<16))return false}
    return true});
  return{opts,free};
}
function junction(t,node,over){
  const{opts,free}=exitsAt(t,node);
  if(!opts.length){
    // a dead end: turn round, unless that would mean driving against a race, then reappear elsewhere
    if(oncoming(t.e,-t.dir)){t.e=null;t.c.G.visible=false;t.wx=t.wz=1e6;t.lost=!spawnTraffic(t,220,560,true);return}
    t.dir*=-1;t.s=t.dir>0?Math.min(over,t.e.len):Math.max(0,t.e.len-over);return}
  // give way: a road that isn't free can't be turned into yet (cars used to merge into each other here). A car
  // normally waits at the stop line when no way out is free (updateTraffic); one that got here anyway stops at the end
  if(!free.length){t.s=t.dir>0?t.e.len-.01:.01;t.v=0;return}
  // a town street near you that's full already: another way if there is one
  const me=activePlayer();
  let pick=free;if(townN>=TOWN_CAP&&Math.abs(t.wx-me.x)<TOWN_R&&Math.abs(t.wz-me.z)<TOWN_R){const o=free.filter(a=>a.e.type!=="town");if(o.length)pick=o}
  const a=pick[Math.floor(Math.random()*pick.length)];
  t.e=a.e;if(a.end==="a"){t.dir=1;t.s=Math.min(over,t.e.len)}else{t.dir=-1;t.s=Math.max(0,t.e.len-over)}
  setLane(t);
}
function updateTraffic(dt){
  bubbleT-=dt;const bubble=bubbleT<=0;if(bubble)bubbleT=.5;
  if(bubble){townN=0;const me=activePlayer(),cf=new V3();camera.getWorldDirection(cf);
    for(const t of TRAFFIC){if(t.chase||!nearTown(t))continue;
      const dx=t.wx-me.x,dz=t.wz-me.z,d=Math.hypot(dx,dz);
      // one too many, and out of the camera's view (it never vanishes in front of you): it reappears somewhere else.
      // One in view stays until it leaves the view, so the cap is a target rather than a hard limit
      if(townN>=TOWN_CAP&&(dx*cf.x+dz*cf.z)/Math.max(d,1)<.2&&d>25){t.e=null;t.c.G.visible=false;t.wx=t.wz=1e6;t.lost=!spawnTraffic(t,220,560,true);if(!nearTown(t))continue}
      townN++}}
  const pf=fwdOf(P.h),kph=kphNow();
  for(const t of TRAFFIC){
    // (a police car beyond the two patrols waits off the road until it is called: copDispatch places it)
    if(!t.e){if(bubble&&t.lost&&(!t.cop||t.patrol))t.lost=!spawnTraffic(t,220,560,true);continue}
    if(t.chase){copDrive(t,dt);continue}
    if(t.free){copFreeIdle(t,dt);continue}   // a police car stood down off the road (js/people.js)
    tickDamage(t,dt);
    let target=t.base*damagePower(t);
    if(t.stopT>0){t.stopT-=dt;target=0}
    t.hitT-=dt;
    const p0=edgePos(t.e,t.s),tx=p0.dx*t.dir,tz=p0.dz*t.dir;
    // following: ease off behind any car ahead in its path going its way, on this road or just round a corner or
    // junction on the next, stop a car length short of it, and brake harder when that close (cars on the next road used to be missed,
    // and the one behind drove into them)
    let close=false;
    // (it looks as far ahead as it needs to stop at a comfortable 7 m/s2: at highway speed a car used to see the
    // queue 20 m ahead too late to stop, and ran into the back of it)
    const look=Math.max(20,10+t.v*t.v/14);
    for(const o of TRAFFIC){if(o===t||!o.e)continue;const ox=o.wx-t.wx,oz=o.wz-t.wz;if(Math.abs(ox)>look||Math.abs(oz)>look)continue;
      const gap=ox*tx+oz*tz,side=Math.abs(ox*-tz+oz*tx);if(gap<=0||gap>=look||side>=1.6)continue;
      const alignment=Math.sin(o.yaw)*tx+Math.cos(o.yaw)*tz;
      const closing=t.v-o.v*alignment;
      if(gap<t.c.len+o.c.len&&closing>4){
        damageVehicle(t,closing);damageVehicle(o,closing);t.hitT=o.hitT=1.5;
      }
      // only cars going its way: one waiting to cross, or coming the other way, is not followed (that could lock both)
      if(alignment<.5)continue;
      target=Math.min(target,gap<6.5?0:Math.min(o.v*(gap<9?.4:.95)+Math.sqrt(14*Math.max(0,gap-9)),Math.sqrt(o.v*o.v+14*(gap-6.5))));if(gap<9)close=true}
    // where roads meet, one car crosses at a time: it holds the junction from 12 m out until it is 14 m clear of it,
    // and the others wait 7.5 m short, clear of the road they cross (cars crossing a junction together used to drive
    // through each other)
    const jn=t.dir>0?t.e.b:t.e.a,dEnd=t.dir>0?t.e.len-t.s:t.s;
    if(jn.adj.length>2&&dEnd<Math.max(18,11.5+t.v*t.v/14)){
      const h=jn.res;if(h&&h!==t&&!(h.e&&Math.hypot(h.wx-jn.x,h.wz-jn.z)<14))jn.res=null;
      // with no way out free yet, it waits at the stop line too, and lets the others cross meanwhile (it used to roll
      // up to the middle of the junction and wait there, in the way of cars crossing)
      const ex=exitsAt(t,jn),stuck=ex.opts.length&&!ex.free.length;
      // and it gives way to you: in the junction, or heading into it within about 2 s (cars used to pull out across
      // you). Not when you're behind it on its own road, which would leave you both waiting
      const pd=Math.hypot(P.x-jn.x,P.z-jn.z),pTo=((jn.x-P.x)*P.vx+(jn.z-P.z)*P.vz)/Math.max(pd,1),
        pBehind=(P.x-t.wx)*tx+(P.z-t.wz)*tz<0&&Math.abs((P.x-t.wx)*-tz+(P.z-t.wz)*tx)<4,
        you=jn.res!==t&&!pBehind&&(pd<10||(pTo>2&&pd<10+pTo*2.2));
      if((jn.res&&jn.res!==t)||stuck||you){target=Math.min(target,Math.sqrt(14*Math.max(0,dEnd-7.5)),Math.max(0,(dEnd-7.5)*1.2+(dEnd>12?6:0)));if(dEnd<12)close=true;if(stuck&&jn.res===t)jn.res=null}
      else if(dEnd<12)jn.res=t;
      // until it has its turn it comes in at a speed it can stop from: 40 km/h by 12 m out, where it takes its turn
      // if the junction is free (a car off the highway at 78 km/h found the junction taken when it was 13 m out,
      // overshot the stop line and stood in the junction, and the car crossing drove through it)
      if(jn.res!==t)target=Math.min(target,Math.sqrt(121+14*Math.max(0,dEnd-12)));
    }
    // slow down behind you (or a car left standing in its lane); if it stays stopped in its way it pulls out and drives round
    if(t.passT>0){t.passT-=dt;target=Math.min(target,8)}
    else{let inWay=false,slow=false;
      for(let i=-1;i<LEFT.length;i++){const b=i<0?P:LEFT[i],ddx=b.x-t.wx,ddz=b.z-t.wz,ah=ddx*tx+ddz*tz,lt=ddx*-tz+ddz*tx;
        if(!(ah>0&&ah<24&&Math.abs(lt)<2.4))continue;
        const pv=i<0&&!FOOT.on?P.vx*tx+P.vz*tz:0;inWay=true;target=Math.min(target,Math.max(0,pv*(ah<10?.5:.95)));if(pv<1.5)slow=true}
      // counts from wherever it stopped: a car that pulled up more than 16 m back used to wait for good
      if(inWay){if(slow){t.waitT+=dt;if(t.waitT>2){t.waitT=0;t.passT=4.5}}}
      else t.waitT=Math.max(0,t.waitT-dt)}
    // someone on foot in its way: it stops short and waits (it doesn't pull out round a person)
    // (you, or someone crossing the street in town)
    {const stopFor=(X,Z)=>{const wx=X-t.wx,wz=Z-t.wz,wa=wx*tx+wz*tz;
        if(wa>0&&wa<Math.max(14,7+t.v*t.v/14)&&Math.abs(wx*-tz+wz*tx)<1.9){target=Math.min(target,wa<7?0:Math.sqrt(14*(wa-7)));if(wa<9)close=true}};
      if(FOOT.on)stopFor(FOOT.x,FOOT.z);
      if(pedOn)for(const p of PEDS)if(p.st==="cross"||p.st==="down")stopFor(p.x,p.z)}
    const ln=RT[t.e.type].lanes,offT=t.passT>0?(ln.length>1&&t.lane===0?ln[1]:-ln[0])*SIDE():t.off;
    t.offCur+=clamp(offT-t.offCur,-2.2*dt,2.2*dt);
    t.v+=clamp(target-t.v,-(close?20:9)*dt,3*dt);
    t.s+=t.v*dt*t.dir;
    if(t.s>t.e.len)junction(t,t.e.b,t.s-t.e.len);else if(t.s<0)junction(t,t.e.a,-t.s);
    // a car that had nowhere to go here was taken off the road (and will try to reappear elsewhere): nothing more to do
    if(!t.e)continue;
    const q=edgePos(t.e,t.s),ux=q.dx*t.dir,uz=q.dz*t.dir;
    t.wx=q.x-uz*t.offCur;t.wz=q.z+ux*t.offCur;t.yaw=Math.atan2(ux,uz);
    const me=BOAT.on?BOAT:FOOT.on?FOOT:P,dpx=t.wx-me.x,dpz=t.wz-me.z,d=Math.hypot(dpx,dpz);
    t.c.G.visible=d<560;
    // nose up or down with the road, so a car on a hill sits on all four wheels
    if(t.c.G.visible){const yF=edgeY(t.e,t.s+1.3*t.dir),yB=edgeY(t.e,t.s-1.3*t.dir);t.c.G.position.set(t.wx,(yF+yB)/2+YO,t.wz);t.c.G.rotation.set(-Math.atan((yF-yB)/2.6),t.yaw,0,"YXZ");for(const w of t.c.wheels)w.rotation.x+=t.v*dt/.36;showDamageSmoke(t.c,t.damage||0,dt)}
    // near miss: the car passes beside you without touching
    if(d<14){const along=dpx*pf.x+dpz*pf.z,side=Math.abs(dpx*-pf.z+dpz*pf.x);
      if(t.pa!==null&&((t.pa>0&&along<=0)||(t.pa<0&&along>=0))&&side>2.05&&side<4.2&&kph>70&&t.hitT<=0&&P.hitT<=0)streakAction("NEAR MISS",Math.round(150+kph*1.6),true);
      t.pa=along}else t.pa=null;
    if(t.cop&&t.offDuty&&bubble&&d>140){const cf=new V3();camera.getWorldDirection(cf);if((dpx*cf.x+dpz*cf.z)/d<.2){copStandDown(t);continue}}
    if(bubble&&d>720)spawnTraffic(t,220,560,true);
  }
  copUpdate(dt);
  pedUpdate(dt);
  healthTick(dt);
}
