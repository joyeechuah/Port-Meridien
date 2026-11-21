// Port Meridien: The HUD, on foot, the police, the pistol and health, pedestrians, and the harbour boat.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;
/* ================================================================ HUD + MAIN LOOP */
let hudT=0,waterT=0;
// the on-screen brake also reverses when pressed again once the car has stopped, so its label says which it will do; the first time
// it reverses in a session, a message says so
let padRevShown=false;
function updateHUD(dt){
  const damage=$("damageHud"),amount=damagePct(),label="DAMAGE "+amount+"% · REPAIR";
  if(damage.textContent!==label){damage.textContent=label;show("damageHud",amount>0);
    damage.classList.toggle("high",amount>=60);damage.classList.toggle("critical",amount>=90);
    damage.setAttribute("aria-label","Vehicle damage "+amount+" percent. Open repair options.");}
  const cd=curCar(),vF=speedF(),kph=Math.abs(vF)*3.6,gi=gearInfo(kph,cd.top,vF<-.5);
  const bB=$("bB"),rev=vF<=REVERSE_STOP&&!(P.brkHold&&kB()),lbl=rev?"REVERSE":"BRAKE";if(bB.textContent!==lbl){bB.textContent=lbl;bB.classList.toggle("rev",rev)}
  if(rev&&pad.B&&vF<-.5&&!padRevShown&&!ev){padRevShown=true;toast("REVERSING","Stopped, press REVERSE again to back up. While you're moving forward the same button brakes")}
  drawSpeedo(kph,gi.rpm*8,gi.g);
  if(camMode===3)drawGauges(kph,gi.rpm*8,gi.g);
  const fr=$("streak");fr.classList.toggle("off",!(FR.pts>0&&!ev));
  if(FR.pts>0){$("frLab").textContent=FR.label;$("frPts").textContent=fmtCr(FR.pts);$("frMul").textContent="x"+FR.mult.toFixed(2).replace(/0$/,"");$("frBar").style.width=clamp(FR.timer/4,0,1)*100+"%"}
  hudT-=dt;if(hudT<=0){hudT=.4;$("zone").textContent=zoneAt(P.x,P.z);hudClock();if($("toasts").children.length)toastFit();
    if(testDrive){const t=Math.max(0,Math.ceil(testDrive.t)),mm=Math.floor(t/60),ss=t%60;$("tdT").textContent=mm+":"+(ss<10?"0":"")+ss}}
  $("mblur").style.opacity=clamp((kph-110)/170,0,1);
  $("vig").style.opacity=.35+Math.min(.4,kph/700);
  const vS=P.vx*-Math.cos(P.h)+P.vz*Math.sin(P.h),slip=Math.abs(vS)+(kB()&&vF>12?4:0)+(kH()&&Math.abs(vF)>8?5:0);
  // a brief red edge only for a real crash; none with FLASHES OFF, which promises no red flash when you're hit (it
  // used to cover only gunshots, and a crash still flashed the screen red)
  P.flashT=Math.max(0,(P.flashT||0)-dt);P.scrape=(P.scrape||0)*Math.exp(-dt*7);
  drawDamageEdge(P.flashT*.4);
  const surf=P.onRoad?0:P.nr&&P.nr.d<P.nr.e.half+2.2?1:2;
  audioUpd(gi.rpm,gi.n,kG()?1:0,slip,surf,Math.abs(vF),P.scrape);
}
/* ================================================================ ON FOOT */
// Getting out of the car and walking. The game stays in the DRIVE state: while FOOT.on, driveUpdate runs footUpdate
// in place of the car's physics, the car stays where it was left, and the camera follows the walker.
// Controls are the driving ones: gas walks, brake steps back, steering turns, the handbrake (or Shift) runs.
const FOOT={on:false,x:0,z:0,y:0,h:0,v:0,ph:0,m:null,cy:0,car:[0,0],hudT:0,cp:new THREE.Vector3(),cl:new THREE.Vector3()};
const FOOT_V={walk:1.9,run:5.4,back:1.2,turn:2.5,r:.35,reach:3.4,exitMax:6};
// a simple figure, 1.76 m tall, standing on the group's origin and facing +z; legs and arms swing from hip and shoulder
/* Faces: painted onto the front of the head, the eyes with whites, a coloured iris, a pupil and a catchlight, so a
   face reads as a person at phone size (built from tiny shapes it read as a mannequin: Jo Yee, 19 Nov). Stylized:
   eyes a little larger than life. Each face has an open and a closed (blinking) texture; they are made once per look
   and shared. The canvas is the head sphere's own UV layout (equirectangular), with the front of the face at u = 0.25 */
const FACES=new Map(),FACE_IRIS=[0x5a3a22,0x3b2616,0x7a6233,0x5f7f93];
function faceTex(skin,hair,iris,big){
  const key=[skin,hair,iris,big].join(",");if(FACES.has(key))return FACES.get(key);
  const W=big?512:256,H=W/2,k=W/512,hex=n=>"#"+n.toString(16).padStart(6,"0");
  const mix=(a,b,t)=>{const c=i=>Math.round(((a>>i)&255)*(1-t)+((b>>i)&255)*t);return(c(16)<<16)|(c(8)<<8)|c(0)};
  const draw=closed=>{
    const cv=document.createElement("canvas");cv.width=W;cv.height=H;const c=cv.getContext("2d");
    c.fillStyle=hex(skin);c.fillRect(0,0,W,H);
    const cx=W*.25,ey=H*.462,dx=W*.06,E=15.5*k;
    const glow=(x,y,r,col,a)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col.replace("A",a));g.addColorStop(1,col.replace("A",0));c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)};
    const shade="rgba(70,35,20,A)";
    // soft shading: a little under each brow, a warm blush on the cheeks, the jaw's underside
    for(const s of[-1,1]){glow(cx+s*dx,ey-6*k,18*k,shade,.1);glow(cx+s*W*.09,H*.565,20*k,"rgba(215,95,85,A)",.16)}
    glow(cx,H*.72,26*k,shade,.05);
    // the nose is mostly in the head's shape (faceGeometry); paint only a faint shadow beside the bridge and under the
    // tip, two small nostrils and a highlight on the tip. Darker paint here read as a smudge under the nose at phone size
    glow(cx+5*k,H*.52,7*k,shade,.08);glow(cx,H*.568,7*k,shade,.1);
    c.fillStyle="rgba(70,32,22,.2)";for(const s of[-1,1]){c.beginPath();c.ellipse(cx+s*3.4*k,H*.567,1.9*k,1.1*k,0,0,7);c.fill()}
    glow(cx-k,H*.545,5*k,"rgba(255,240,225,A)",.22);
    // eyebrows: an arch, thicker inside, in the hair's colour
    c.lineCap="round";
    for(const s of[-1,1]){c.fillStyle=hex(mix(hair,skin,.15));c.beginPath();c.moveTo(cx+s*(dx-E*.85),ey-E*.98);c.quadraticCurveTo(cx+s*dx,ey-E*1.3,cx+s*(dx+E*1.05),ey-E*1.02);c.quadraticCurveTo(cx+s*dx,ey-E*1.6,cx+s*(dx-E*.82),ey-E*1.22);c.closePath();c.fill()}
    for(const s of[-1,1]){const x=cx+s*dx;
      if(closed){c.strokeStyle=hex(mix(skin,0x2a1810,.6));c.lineWidth=2.6*k;c.beginPath();c.moveTo(x+s*E,ey);c.quadraticCurveTo(x,ey+E*.45,x-s*E,ey);c.stroke();continue}
      // an almond eye, the inner corner a little lower: the white, the iris, the pupil and a catchlight
      const lid=()=>{c.beginPath();c.moveTo(x-s*E,ey+E*.1);c.quadraticCurveTo(x,ey-E*1.02,x+s*E,ey-E*.06)};
      c.save();lid();c.quadraticCurveTo(x,ey+E*.78,x-s*E,ey+E*.1);c.closePath();c.clip();
      c.fillStyle="#f4efe9";c.fillRect(x-E,ey-E,2*E,2*E);
      c.fillStyle=hex(iris);c.beginPath();c.arc(x,ey+E*.02,E*.5,0,7);c.fill();
      c.strokeStyle=hex(mix(iris,0,.5));c.lineWidth=1.3*k;c.stroke();
      c.fillStyle="#1a110d";c.beginPath();c.arc(x,ey+E*.02,E*.24,0,7);c.fill();
      c.fillStyle="#fff";c.beginPath();c.arc(x-E*.17,ey-E*.17,E*.13,0,7);c.fill();
      // the upper lid's shadow on the eyeball
      const g=c.createLinearGradient(0,ey-E*.6,0,ey);g.addColorStop(0,"rgba(60,30,20,.3)");g.addColorStop(1,"rgba(60,30,20,0)");c.fillStyle=g;c.fillRect(x-E,ey-E,2*E,E);
      c.restore();
      // the upper lid line, darker and heavier toward the outer corner, a lash flick, and a faint lower lid
      c.strokeStyle="#2b1a12";c.lineWidth=2.4*k;lid();c.stroke();
      c.lineWidth=1.6*k;c.beginPath();c.moveTo(x+s*E*.9,ey-E*.12);c.quadraticCurveTo(x+s*E*1.08,ey-E*.2,x+s*E*1.16,ey-E*.32);c.stroke();
      c.strokeStyle="rgba(90,46,35,.32)";c.lineWidth=k;c.beginPath();c.moveTo(x+s*E*.95,ey-E*.02);c.quadraticCurveTo(x,ey+E*.5,x-s*E*.8,ey+E*.12);c.stroke()}
    // lips: a darker upper lip, a fuller lighter lower one, a mouth line that lifts a touch at the corners
    const ly=H*.635,lw=15*k,lip=mix(skin,0x9a4a44,.5);
    c.fillStyle=hex(mix(lip,0x3a1a14,.2));c.beginPath();c.moveTo(cx-lw,ly);c.quadraticCurveTo(cx-lw*.4,ly-4.5*k,cx,ly-2.2*k);c.quadraticCurveTo(cx+lw*.4,ly-4.5*k,cx+lw,ly);c.closePath();c.fill();
    c.fillStyle=hex(lip);c.beginPath();c.moveTo(cx-lw*.88,ly);c.quadraticCurveTo(cx,ly+5.5*k,cx+lw*.88,ly);c.closePath();c.fill();
    c.strokeStyle="rgba(60,22,18,.5)";c.lineWidth=1.2*k;c.beginPath();c.moveTo(cx-lw*1.04,ly-.8*k);c.quadraticCurveTo(cx,ly+2*k,cx+lw*1.04,ly-.8*k);c.stroke();
    const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t};
  const f={open:draw(false),closed:draw(true)};FACES.set(key,f);return f;
}
// a head that blinks every 3 to 6 s, for about an eighth of a second
function faceBlink(F,dt){
  F.t-=dt;
  if(F.shut){if(F.t<=0){F.shut=false;F.m.map=F.tex.open;F.t=3+Math.random()*3}}
  else if(F.t<=0){F.shut=true;F.m.map=F.tex.closed;F.t=.12}
}
// Profiles run from the bottom up. Width and depth can vary independently. The
// vertical texture coordinate follows height so a narrow hem cannot stretch a print.
function tailoredShape(rows,segments=16){
  const g=new THREE.LatheGeometry(rows.map(([y,x])=>new THREE.Vector2(x,y)),segments);
  const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){
    const [y,x,depth,offset=0]=rows[i%rows.length];
    p.setXYZ(i,-p.getX(i),y,offset-(x?p.getZ(i)*depth/x:0));
    uv.setY(i,(y-rows[0][0])/(rows[rows.length-1][0]-rows[0][0]));
  }
  g.computeVertexNormals();
  // The duplicate UV seam runs down the back. Average its normals after shaping.
  const n=g.attributes.normal,last=segments*rows.length,v=new THREE.Vector3(),w=new THREE.Vector3();
  for(let j=0;j<rows.length;j++){
    v.fromBufferAttribute(n,j).add(w.fromBufferAttribute(n,last+j)).normalize();
    n.setXYZ(j,v.x,v.y,v.z);n.setXYZ(last+j,v.x,v.y,v.z);
  }
  return g;
}
// The shirt's profile from the hem up (height, half-width, half-depth, forward offset): the shirt and its collar
const SHIRT_ROWS=[[.902,0,0],[.902,.193,.141],[.92,.194,.14],[1.02,.18,.12],[1.12,.165,.107],[1.24,.179,.116,.005],[1.355,.206,.122,.006],[1.407,.21,.106],[1.447,.159,.084],[1.482,.065,.061]];
// The knee: the shin's top is as wide as the thigh's end and reaches a few centimetres up inside it, and the thigh
// tapers gently into the shin. A thigh wider than the shin, ending in a short cap, left a hard ring at every knee
function figureShapes(crowd){
  const profile=(rows,segments=16)=>tailoredShape(rows,crowd?8:segments);
  return {
  shirt:profile(SHIRT_ROWS,32),
  thigh:profile([[-.475,.058,.062],[-.445,.068,.075,.004],[-.38,.073,.08],[-.23,.085,.094],[-.09,.091,.1,-.004],[.026,.087,.095,-.005],[.047,.067,.071]]),
  shin:profile([[-.413,0,0],[-.413,.054,.061],[-.396,.058,.064],[-.33,.052,.058],[-.185,.065,.082,-.012],[-.1,.069,.082,-.012],[-.04,.066,.074,-.004],[0,.069,.077,.004],[.03,.067,.074,.004],[.05,.05,.052]]),
  shoe:profile([[-.475,0,0,.043],[-.475,.059,.129,.046],[-.461,.063,.133,.047],[-.434,.063,.131,.048],[-.409,.057,.108,.033],[-.385,.05,.068,.004],[-.38,.047,.061]],20),
  sleeve:profile([[-.19,0,0],[-.19,.06,.064],[-.173,.062,.067],[-.085,.065,.072],[-.018,.071,.075],[.014,.061,.067],[.036,.038,.049],[.043,0,0]]),
  upperArm:profile([[-.287,.04,.043],[-.256,.046,.049],[-.197,.05,.055],[-.124,.056,.061],[-.095,.049,.054]]),
  forearm:profile([[-.245,.026,.033],[-.215,.029,.036],[-.113,.038,.046],[-.061,.048,.052],[-.016,.044,.047],[.019,.037,.04]]),
  cuff:profile([[-.242,.034,.04],[-.224,.037,.042],[-.202,.04,.044],[-.192,.044,.05],[-.11,.05,.058],[-.025,.056,.061],[.023,.047,.05]]),
  jacketArm:profile([[-.294,.05,.053],[-.266,.054,.061],[-.18,.06,.065],[-.07,.069,.075],[-.015,.072,.077],[.021,.058,.063],[.043,0,0]])
  };
}
const figureShape=figureShapes(false),crowdShape=figureShapes(true);
// Keep the sphere's UVs for the painted eyelids. Shape the lower jaw and give
// the bridge, nose tip, cheekbones and chin a silhouette even in side view.
function faceGeometry(segments,rings){
  const geo=new THREE.SphereGeometry(1,segments,rings),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),front=Math.max(0,z);
    const mound=(cx,cy,w,h)=>Math.exp(-(((x-cx)/w)**2+((y-cy)/h)**2));
    // a small nose (a low bridge and a rounded tip), soft cheekbones, shallow eye sockets and a little chin. All kept
    // low and fading toward the sides (front squared), so the head stays one smooth shape: stronger mounds made a
    // beak and a muzzle on this many vertices
    const nose=.045*mound(0,.0,.085,.2)+.085*mound(0,-.165,.11,.085);
    const cheeks=.035*mound(Math.sign(x)*.45,-.12,.25,.2);
    const sockets=.035*mound(Math.sign(x)*.36,.11,.16,.09);
    const chin=.06*mound(0,-.8,.32,.14);
    p.setXYZ(i,x*(1-.15*Math.max(0,-y)**1.5),y,z+front*front*(nose+cheeks-sockets+chin));
  }
  geo.computeVertexNormals();return geo;
}
const faceHeadGeo=faceGeometry(40,28),crowdHead=faceGeometry(20,14);
// A single swept hair mass follows the temples and nape. Its part and
// ridges are in the surface itself, so the silhouette works from behind too.
function hairGeometry(segments,rings,burns){
  const geo=new THREE.SphereGeometry(1,segments,rings,0,Math.PI*2,0,Math.PI*.65);
  const p=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++){
    const t=1-uv.getY(i),phi=uv.getX(i)*2*Math.PI,side=-Math.cos(phi),front=Math.sin(phi);
    // where the hair stops, measured down from the crown: high on the forehead, a notch over each ear so the ears
    // show, lowest at the nape; a side part lets the fringe fall lower on one side
    const fringe=Math.exp(-(((side-.42)/.32)**2))*Math.max(0,front);
    // sideburns down in front of each ear (left off the crowd's coarser hair, where they would come out jagged)
    const line=1.45-.5*front-.15*Math.exp(-(((front-.05)/.28)**2))+.24*fringe+burns*Math.exp(-(((front-.3)/.12)**2));
    const angle=t*line,sin=Math.sin(angle),x=side*sin,y=Math.cos(angle),z=front*sin;
    // volume on top, swept up at the front and fuller at the back (a cap that sat on the skull read as a helmet), the
    // part on one side, fine ridges along the sweep. Toward its edge the hair lies flat on the head, so no rim stands off
    const top=Math.max(0,y),part=Math.exp(-(((x+.36-.12*z)/.09)**2)),hug=Math.min(1,(line-angle)/.45);
    const lift=top**1.5*(.16+.05*x+.05*Math.max(0,-z))+.07*top*Math.max(0,z)*(1-part);
    const ridge=.014*Math.cos(16*x+7*z)*top,grow=1.006+hug*(.044+ridge+.03*top);
    p.setXYZ(i,x*grow,y+lift*(1-.55*part),z*grow+hug*(.06*top*Math.max(0,z)+.04*y*y));
  }
  geo.computeVertexNormals();return geo;
}
const sweptHair=hairGeometry(64,18,.34),crowdHair=hairGeometry(16,8,0);
// A collar that stands off the shirt, so it has a shape from the side and catches the light, instead of two flaps
// painted on the print in different greens. One side's flap circles the neck from the back, lies on the shoulder and
// folds down beside the V to a point. Style 0 is the palm shirt's camp collar, 1 the jacket's longer lapel
function collarGeometry(s,style){
  const rowAt=y=>{let i=SHIRT_ROWS.length-1;while(i>2&&SHIRT_ROWS[i-1][0]>y)i--;
    const a=SHIRT_ROWS[i-1],b=SHIRT_ROWS[i],t=Math.min(1,Math.max(0,(y-a[0])/(b[0]-a[0])));
    return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,(a[3]||0)+((b[3]||0)-(a[3]||0))*t]};
  // a point just off the shirt at height y, a radians round from the front
  const onShirt=(y,a,lift)=>{const [rx,rz,off]=rowAt(y);return new THREE.Vector3(s*(rx+lift)*Math.sin(a),y,off+(rz+lift)*Math.cos(a))};
  const chest=(y,x,lift)=>onShirt(y,Math.asin(Math.min(.99,x/rowAt(y)[0])),lift);
  // the jacket's lapels start further round the neck and stay apart lower down, so the shirt shows between them
  const tipY=style?1.335:1.404,tipX=style?.1:.052,vY=style?1.285:1.394,vX=style?.016:.006,front=style?.62:.36;
  const edge=style?1.462:1.468,J=22,K=4,pos=[],idx=[];
  for(let j=0;j<=J;j++){
    const u=j/J,around=Math.min(1,u/.72),d=Math.max(0,(u-.72)/.28),e=d*d*(3-2*d),a=Math.PI-(Math.PI-front)*around;
    // the fold (inner edge) circles the neck, then runs down the V; the outer edge lies on the shoulder, then
    // comes down to the point
    const inner=new THREE.Vector3(s*.064*Math.sin(a),1.49,-.004+.064*Math.cos(a)).lerp(chest(vY,vX,.003),e);
    const outer=onShirt(edge,a,.004).lerp(chest(tipY,tipX,.004),e);
    for(let k=0;k<=K;k++){const t=k/K,p=inner.clone().lerp(outer,t),roll=.005*Math.sin(Math.PI*t)*(1-.6*e);
      // a straight line between two points on the chest runs inside it: below the neck, put each point back on the
      // shirt (just off it), so the lapel lies on the cloth all the way down
      const w=Math.min(1,Math.max(0,(1.478-p.y)/.02));
      if(w>0){const [rx,rz,off]=rowAt(p.y);p.lerp(onShirt(p.y,Math.atan2(Math.abs(p.x)/rx,(p.z-off)/rz),.004+roll),w)}
      else{p.y+=roll;p.x+=s*roll*.5*Math.sin(a);p.z+=roll*.5*Math.cos(a)}
      pos.push(p.x,p.y,p.z)}
  }
  for(let j=0;j<J;j++)for(let k=0;k<K;k++){const a=j*(K+1)+k,b=a+K+1;if(s>0)idx.push(a,b,a+1,b,b+1,a+1);else idx.push(a,a+1,b,b,a+1,b+1)}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
const COLLARS=[0,1].map(style=>[-1,1].map(s=>collarGeometry(s,style)));
// Where a collar meets the shirt, in the shirt texture's pixels (512 x 256, the front at x 256, the shirt's top at
// y 0), traced from the collar itself: edge 0 is its fold, which bounds the opening at the neck; 1 its outer edge,
// where it casts a thin shadow on the shirt. Both sides, the right one mirrored (painted by hand, the opening ran out
// past the lapels as white slivers, and the flaps were two different greens)
function collarTrace(style,edge){
  const P=COLLARS[style][1].attributes.position,K=5,pts=[];
  const rowAt=y=>{let i=SHIRT_ROWS.length-1;while(i>2&&SHIRT_ROWS[i-1][0]>y)i--;
    const a=SHIRT_ROWS[i-1],b=SHIRT_ROWS[i],t=Math.min(1,Math.max(0,(y-a[0])/(b[0]-a[0])));
    return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,(a[3]||0)+((b[3]||0)-(a[3]||0))*t]};
  const top=SHIRT_ROWS[SHIRT_ROWS.length-1][0],bottom=SHIRT_ROWS[0][0];
  for(let i=edge?K-1:0;i<P.count;i+=K){const x=P.getX(i),y=Math.min(top,P.getY(i)),z=P.getZ(i),[rx,rz,off]=rowAt(y);
    const a=Math.atan2(x/rx,(z-off)/rz);pts.push([256+Math.max(0,a/(2*Math.PI)*512+(edge?1:-1)),(1-(y-bottom)/(top-bottom))*256+(edge?1.5:0)])}
  const half=pts.filter(([,r])=>r>=0);
  if(edge)return [half.slice().reverse().map(([x,r])=>[512-x,r]),half];
  half.sort((p,q)=>p[1]-q[1]);
  return [[half[0][0],0],...half,...half.slice().reverse().map(([x,r])=>[512-x,r]),[512-half[0][0],0]];
}
function footModel(){
  if(FOOT.m)return FOOT.m;
  const G=new THREE.Group(),mat=(c,r=.88)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:0});
  const skin=mat(0xc49a7a),jacket=mat(0x327e76),trousers=mat(0xc3aa88),shoe=mat(0x44352b),hair=mat(0x2a1d16);
  const ball=new THREE.SphereGeometry(1,16,12);
  const part=(par,g,m,x,y,z,sx=1,sy=sx,sz=sx)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;par.add(o);return o};
  const pivot=(par,x,y,z)=>{const p=new THREE.Group();p.position.set(x,y,z);par.add(p);return p};
  // the seat sits up under the shirt's hem: lower, it showed as a pale lump between the legs
  part(G,ball,trousers,0,.955,-.009,.168,.05,.089);
  const cloth=document.createElement("canvas");cloth.width=512;cloth.height=256;
  const weave=new THREE.CanvasTexture(cloth);weave.encoding=THREE.sRGBEncoding;weave.anisotropy=4;
  const fabric=mat(0xffffff);fabric.map=weave;part(G,figureShape.shirt,fabric,0,0,0);
  part(G,new THREE.CylinderGeometry(.048,.059,.108,16),skin,0,1.518,-.004);
  const faceT=faceTex(0xc49a7a,0x2a1d16,FACE_IRIS[0],true),faceM=mat(0xffffff);faceM.map=faceT.open;
  part(G,faceHeadGeo,faceM,0,1.655,.005,.098,.118,.108);
  for(const s of [-1,1])part(G,ball,skin,s*.094,1.65,-.005,.016,.028,.017);
  part(G,sweptHair,hair,0,1.655,.003,.101,.12,.113);
  const collarM=mat(0x327e76);collarM.side=THREE.DoubleSide;
  const collars=[0,1].map(i=>part(G,COLLARS[0][i],collarM,0,0,0));
  const legs=[],knees=[],arms=[],elbows=[],sleeves=[],lowerArms=[];
  function dress(o){
    const bomber=o.id==="club",c=cloth.getContext("2d"),hex=n=>"#"+n.toString(16).padStart(6,"0");
    jacket.color.setHex(o.shirt);collarM.color.setHex(o.shirt);trousers.color.setHex(o.pants);
    collars.forEach((m,i)=>{m.visible=o.id!=="stripe";m.geometry=COLLARS[bomber?1:0][i]});shoe.color.setHex(bomber?0x302f36:o.id==="stripe"?0x504b48:0x624b39);
    c.fillStyle=hex(o.shirt);c.fillRect(0,0,512,256);
    const path=(color,points)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()};
    // the soft shadow a collar casts along its outer edge, so it reads as a collar at phone size, not just a V
    const shadow=style=>{c.strokeStyle="rgba(10,25,25,.28)";c.lineWidth=2.5;c.lineJoin=c.lineCap="round";
      for(const side of /** @type {number[][][]} */ (collarTrace(style,1))){c.beginPath();side.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}};
    if(o.id==="palms"){
      // Small tonal sprigs leave the placket and collar readable at wardrobe scale.
      for(let row=0;row<5;row++)for(let col=-1;col<9;col++){
        c.save();c.translate(22+col*64+(row%2)*32,40+row*47);c.rotate((row%2?.36:-.30));
        c.strokeStyle="#63988a";c.lineWidth=1.6;c.beginPath();c.moveTo(-4,9);c.quadraticCurveTo(-2,0,6,-11);c.stroke();
        for(let j=0;j<3;j++){
          const x=-3+2*j,y=6-j*4;
          for(const s of [-1,1]){c.fillStyle="#72a394";c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+6*s,y-1,x+8*s,y-7);c.quadraticCurveTo(x+2*s,y-6,x,y);c.fill()}
        }
        c.restore();
      }
      c.fillStyle="#2a6b64";c.fillRect(253,21,5,235);
      for(let y=52;y<256;y+=40){c.fillStyle="#cfccb0";c.beginPath();c.arc(255,y,1.65,0,Math.PI*2);c.fill()}
      // the open neck shows the same skin as the neck (it was a darker tan); the collar itself is modelled (collars)
      path("#c49a7a",collarTrace(0,0));shadow(0);
    }else if(o.id==="stripe"){
      c.fillStyle="#e7bba4";for(let y=74;y<226;y+=32){c.fillRect(0,y,512,6);c.fillRect(0,y+10,512,2)}
      c.fillStyle="#854740";c.fillRect(0,0,512,6);
    }else{
      path("#d9d5c7",collarTrace(1,0));shadow(1);
      path("#c49a7a",[[237,0],[275,0],[268,6],[256,9],[244,6]]);
      c.fillStyle="#262e45";c.fillRect(0,236,512,20);
      c.fillStyle="#ab957a";c.fillRect(255,95,2,143);
    }
    weave.needsUpdate=true;
    for(const mesh of sleeves)mesh.geometry=bomber?figureShape.jacketArm:figureShape.sleeve;
    for(const mesh of lowerArms){mesh.geometry=bomber?figureShape.cuff:figureShape.forearm;mesh.material=bomber?jacket:skin}
  }
  for(const s of[-1,1]){
    const hip=pivot(G,s*.092,.92,0);part(hip,figureShape.thigh,trousers,0,0,0);
    const knee=pivot(hip,0,-.44,0);part(knee,figureShape.shin,trousers,0,0,0);part(knee,figureShape.shoe,shoe,0,0,0);
    legs.push(hip);knees.push(knee);
    const sh=pivot(G,s*.181,1.407,0);sh.rotation.z=s*.105;
    sleeves.push(part(sh,figureShape.sleeve,jacket,0,0,0));part(sh,figureShape.upperArm,skin,0,0,0);
    const el=pivot(sh,0,-.278,0);el.rotation.x=-.18;lowerArms.push(part(el,figureShape.forearm,skin,0,0,0));
    part(el,ball,skin,s*.002,-.266,.005,.025,.049,.034);
    part(el,ball,skin,s*.003,-.305,.012,.022,.036,.029).rotation.x=-.15;
    part(el,ball,skin,-s*.014,-.269,.031,.013,.03,.014).rotation.x=-.36;
    arms.push(sh);elbows.push(el);
  }
  G.visible=false;scene.add(G);dress(OUTFITS.find(o=>o.id===save.outfit));
  return FOOT.m={G,legs,arms,knees,elbows,dress,face:{m:faceM,tex:faceT,t:2+Math.random()*3,shut:false}};
}
function footGround(x,z){
  if(onPier(x,z))return PIER.y;
  let y=Math.max(meshH(x,z),surfH(x,z));
  for(const f of QUAY.floors){
    if(Math.abs(x-f.x)<=f.hx&&Math.abs(z-f.z)<=f.hz)y=Math.max(y,f.top);
  }
  return y;
}
// pushes a point clear of buildings, walls and trees, of traffic, and of your own car; returns the cleared point
function footClear(x,z){
  const r=FOOT_V.r;
  const box=(ox,oz,hx,hz,cs,sn)=>{const dx=x-ox,dz=z-oz,lx=dx*cs-dz*sn,lz=dx*sn+dz*cs,qx=clamp(lx,-hx,hx),qz=clamp(lz,-hz,hz);let ex=lx-qx,ez=lz-qz;const d=Math.hypot(ex,ez);
    if(d>=r)return;let pen;
    if(d<1e-4){const px=hx-Math.abs(lx),pz=hz-Math.abs(lz);if(px<pz){ex=Math.sign(lx)||1;ez=0;pen=px+r}else{ex=0;ez=Math.sign(lz)||1;pen=pz+r}}else{ex/=d;ez/=d;pen=r-d}
    x+=(ex*cs+ez*sn)*pen;z+=(-ex*sn+ez*cs)*pen};
  obstaclesNear(x,z,r+1,o=>{if(o.c){const dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz),pen=r+o.r-d;if(pen>0&&d>1e-4){x+=dx/d*pen;z+=dz/d*pen}}else box(o.x,o.z,o.hx,o.hz,o.cs,o.sn)});
  for(const t of TRAFFIC){if(Math.abs(t.wx-x)>7||Math.abs(t.wz-z)>7)continue;box(t.wx,t.wz,.95,t.c.len,Math.cos(t.yaw),Math.sin(t.yaw))}
  box(P.x,P.z,.95,2.3,Math.cos(P.h),Math.sin(P.h));
  for(const l of LEFT)box(l.x,l.z,.95,2.3,Math.cos(l.h),Math.sin(l.h));
  return[x,z];
}
/* ---------- taking cars: any traffic car that has stopped, and the cars you've left standing ---------- */
// Cars standing in the world that nobody is driving: the ones you got out of and walked away from, yours or taken.
// The car you last drove (P, pc) isn't in this list. Each keeps its place, heading and damage.
const LEFT_MAX=3,STREET_BASE={hatch:["golf","mini"],sedan:["m3","challenger","mustang"]};
const isStreet=id=>STREET.has(id);
// the car you were driving stays where it is, as one of the cars left standing
function leaveCar(){
  LEFT.push({id:curId,x:P.x,z:P.z,h:P.h,damage:P.damage||0});
  // more than three: the taken car left longest ago goes (never one of yours)
  while(LEFT.length>LEFT_MAX){const i=LEFT.findIndex(l=>isStreet(l.id));if(i<0)break;streetFree(LEFT.splice(i,1)[0].id)}
}
// nothing is left standing any more: every taken car goes, except one you're driving (the dealer's BUY, DRIVE and
// SELL park your cars; they used to forget the taken ones without freeing them, and after a few visits there was
// no made-up id left to give the next car)
function leftClear(){LEFT.length=0;for(const id of[...STREET.keys()])if(id!==curId)streetFree(id)}
function streetFree(id){const c=carMeshes[id];if(c){disposeHeroCar(c);delete carMeshes[id]}STREET.delete(id)}
// puts you in the driving seat of a car standing at (x,z), facing h
function driveCar(id,x,z,h,damage){
  FOOT.on=false;if(FOOT.m)FOOT.m.G.visible=false;promptAct=null;show("prompt",false);footHud(false);
  attachCar(id,isStreet(id));
  P.x=x;P.z=z;P.h=h;P.vx=P.vz=P.vy=0;P.r=0;P.steer=P.steerS=0;P.thr=0;P.brkHold=false;P.air=false;P.y=P.ty=surfH(x,z);
  P.damage=damage||0;repairWarnLevel=damageWarnTier(P.damage);showDamageSmoke(pc,P.damage);
  autoHold=true;placeCarMesh(0);snapCam();
}
// a traffic car that has stopped beside you: it becomes a car you drive, and its place in traffic is filled elsewhere
function takeTraffic(t){
  if(!FOOT.on||!t.e||t.v>1.5||t.cop)return false;
  leaveCar();
  // a free made-up id: there is always one (at most three taken cars stand, plus the one you came from), and if
  // there somehow isn't, nothing is taken rather than a car being made under no id
  let id=null;for(let i=0;i<=LEFT_MAX+1;i++)if(!STREET.has("st"+i)){id="st"+i;break}
  if(!id){LEFT.pop();return false}
  const pool=STREET_BASE[t.shape]||STREET_BASE.sedan,base=pool[TRAFFIC.indexOf(t)%pool.length];
  STREET.set(id,{base,paint:t.col,car:Object.assign({},CARS.find(c=>c.id===base),{id})});
  const x=t.wx,z=t.wz,h=t.yaw,dmg=t.damage||0;
  showDamageSmoke(t.c,0);t.damage=t.damageT=0;t.e=null;t.c.G.visible=false;t.wx=t.wz=1e6;t.v=0;t.lost=true;
  driveCar(id,x,z,h,dmg);
  toast("NOT YOUR CAR",carById(id).mk+" "+carById(id).md+" · it stays out here when you go home");
  crime("take",x,z);
  return true;
}
// a car you left standing: you drive it again, and the one you came from stays where it is
function takeLeft(l){
  const i=LEFT.indexOf(l);if(!FOOT.on||i<0)return false;
  LEFT.splice(i,1);leaveCar();driveCar(l.id,l.x,l.z,l.h,l.damage);return true;
}
// going home: your own car is the one you have, and taken cars are gone
function streetReset(){
  if(isStreet(curId))attachCar(save.cur);
  leftClear();
}
// the car within reach to get into, nearest first: the one you got out of, one left standing, or stopped traffic
function footTarget(){
  let best=null,bd=FOOT_V.reach;
  const see=(x,z,o)=>{const d=Math.hypot(FOOT.x-x,FOOT.z-z);if(d<=bd){bd=d;best=o}};
  see(P.x,P.z,{t:"Get in · "+carById(curId).mk+" "+carById(curId).md,a:footEnter});
  for(const l of LEFT)see(l.x,l.z,{t:"Get in · "+carById(l.id).mk+" "+carById(l.id).md,a:()=>takeLeft(l)});
  for(const t of TRAFFIC)if(t.e&&t.v<=1.5&&!t.cop)see(t.wx,t.wz,{t:"Take this car",a:()=>takeTraffic(t)});
  if(BOAT.m&&onPier(FOOT.x,FOOT.z))see(BOAT.x,BOAT.z,{t:"Board the boat",a:boatBoard});
  return best;
}
// why you can't get out just now, or null if you can
function footBlocked(){
  if(ev)return "Finish or quit the event first";
  if(testDrive)return "Return the test car first";
  if(kphNow()>FOOT_V.exitMax)return "Stop the car first";
  if(P.water)return "Not in the water";
  return null;
}
function footExit(){
  if(state!=="DRIVE"||FOOT.on||BOAT.on)return false;
  const why=footBlocked();if(why){toast("CAN'T GET OUT",why,"bad");return false}
  // beside the driver's door if there's room (the driver sits on the side nearest the middle of the road), otherwise
  // the other side, otherwise behind: wherever is clear of walls and out of the sea
  const rx=Math.cos(P.h),rz=-Math.sin(P.h),fx=Math.sin(P.h),fz=Math.cos(P.h),d=SIDE();let spot=null;
  for(const[a,b]of[[-1.75*d,0],[1.75*d,0],[0,-3.4],[0,3.4]]){const x=P.x+rx*a+fx*b,z=P.z+rz*a+fz*b,c=footClear(x,z);
    if(Math.hypot(c[0]-x,c[1]-z)<.25&&footGround(c[0],c[1])>-.4){spot=c;break}}
  if(!spot){toast("CAN'T GET OUT","No room to open the door here","bad");return false}
  const m=footModel();
  P.vx=P.vz=0;P.r=0;P.steer=P.steerS=0;P.thr=0;P.brkHold=false;autoHold=true;
  FOOT.on=true;FOOT.x=spot[0];FOOT.z=spot[1];FOOT.y=footGround(FOOT.x,FOOT.z);FOOT.h=P.h;FOOT.v=0;FOOT.ph=0;FOOT.cy=P.h;FOOT.car=[P.x,P.z];
  m.G.visible=true;footPlace(0);
  pc.inside.visible=false;pc.glass.visible=pc.shell.visible=true;
  placeCarMesh(0);footCam(0,true);footHud(true);
  footPrompt();   // at once, not on the next frame: E pressed straight after getting out did nothing until then
  return true;
}
function footEnter(){
  if(!FOOT.on)return false;
  if(Math.hypot(FOOT.x-P.x,FOOT.z-P.z)>FOOT_V.reach)return false;
  footEnd();return true;
}
// back in the driving seat (also when the car is moved from under you: map travel, back to road, the garage)
function footEnd(){
  if(!FOOT.on)return;FOOT.on=false;if(FOOT.m)FOOT.m.G.visible=false;
  promptAct=null;show("prompt",false);footHud(false);autoHold=true;if(pc)snapCam();
}
// what the screen shows on foot: no speedometer or streak, and the pads say what they do now
// The keys along the bottom on a computer, for driving or for walking, with F to get out, and G whenever the pistol
// can fire. G was only in the README, so on a laptop there seemed to be no way to shoot (Jo Yee, 21 Nov)
const DRIVE_KEYS=$("keys").innerHTML+" &nbsp; <kbd>F</kbd> get out";
const FOOT_KEYS="<kbd>W</kbd><kbd>S</kbd> walk / back &nbsp; <kbd>A</kbd><kbd>D</kbd> turn &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>E</kbd> interact";
let keysShown="";
const gunReady=()=>save.armed&&state==="DRIVE"&&!BOAT.on&&(FOOT.on||(!ev&&!testDrive));
function keyHints(foot){const h=(foot?FOOT_KEYS:DRIVE_KEYS)+(gunReady()?" &nbsp; <kbd>G</kbd> fire":"");if(h!==keysShown){keysShown=h;$("keys").innerHTML=h}}
function footHud(on){
  keyHints(on);
  document.body.classList.toggle("outsideCar",on);
  document.body.classList.toggle("walking",on&&FOOT.on);
  show("speedo",!on);show("streak",!on);show("chFoot",!on);show("chRear",!on);show("chCam",!on);
  $("bG").textContent=on?"WALK":"GAS";$("bH").innerHTML=on?"RUN":"HAND<br>BRAKE";
  const b=$("bB");if(on){b.textContent="BACK";b.classList.remove("rev")}
}
// the prompt for whichever car is within reach: "Get in" for yours and those left standing, "Take this car" for traffic
function footPrompt(){const tg=footTarget();promptAct=tg?tg.a:null;show("prompt",!!tg);if(tg)$("promptTxt").textContent=tg.t}
function footPlace(dt,speed=Math.abs(FOOT.v)){
  const m=FOOT.m,sw=Math.sin(FOOT.ph)*Math.min(.95,speed*.34);
  m.G.position.set(FOOT.x,FOOT.y,FOOT.z);m.G.rotation.y=FOOT.h;
  m.legs[0].rotation.x=sw;m.legs[1].rotation.x=-sw;m.arms[0].rotation.x=-sw*.8;m.arms[1].rotation.x=sw*.8;
  // each knee bends as its leg swings through, and the elbows bend more the faster you go
  const amp=Math.min(1,speed*.3),c=Math.cos(FOOT.ph);
  m.knees[0].rotation.x=amp*(.06+Math.max(0,-c)*1.15);m.knees[1].rotation.x=amp*(.06+Math.max(0,c)*1.15);
  m.elbows[0].rotation.x=m.elbows[1].rotation.x=-(.18+amp*.75);
  // a slight bob with each step
  m.G.rotation.z=Math.sin(FOOT.ph)*amp*.028;
  m.G.rotation.x=amp*.06;
  m.G.position.y+=Math.abs(Math.cos(FOOT.ph))*Math.min(.05,speed*.012);
}
// behind and above the walker, coming in closer when a wall or tree is in the way
function footCam(dt,snap){
  FOOT.cy+=wrapA(FOOT.h-FOOT.cy)*(snap?1:1-Math.exp(-dt*5));
  const fx=Math.sin(FOOT.cy),fz=Math.cos(FOOT.cy),back=boomClear(FOOT.x,FOOT.z,fx,fz,3.9),p={x:FOOT.x,y:FOOT.y,z:FOOT.z};
  const px=FOOT.x-fx*back,pz=FOOT.z-fz*back,py=Math.max(FOOT.y+2.05+(3.9-back)*.2,camFloor(px,pz,p));
  const k=snap?1:1-Math.exp(-dt*10);
  FOOT.cp.lerp(new V3(px,py,pz),k);FOOT.cl.lerp(new V3(FOOT.x+fx*2.3,FOOT.y+1.1,FOOT.z+fz*2.3),k);
  camera.position.copy(FOOT.cp);camera.lookAt(FOOT.cl);
  camera.fov+=(60-camera.fov)*(snap?1:1-Math.exp(-dt*5));camera.updateProjectionMatrix();
}
function footUpdate(dt){
  // the car went somewhere without you (map travel, back to road): you're in it
  if(Math.hypot(P.x-FOOT.car[0],P.z-FOOT.car[1])>.5){footEnd();return}
  updateTraffic(dt);jobTick(dt);   // a timed delivery's clock runs while you're out of the car too (it used to stop)
  if(FOOT.m&&FOOT.m.face)faceBlink(FOOT.m.face,dt);
  if(state!=="DRIVE")return;
  const go=gasIn()>0?1:brakeIn()>0?-1:0,run=!locked&&(keys.shift||kH());
  const want=go>0?(run?FOOT_V.run:FOOT_V.walk):go<0?-FOOT_V.back:0;
  FOOT.v+=clamp(want-FOOT.v,-18*dt,12*dt);
  // right turns right, as in the car: the heading decreases (it was the wrong way round, on foot and on the boat)
  FOOT.h=wrapA(FOOT.h-steerIn()*FOOT_V.turn*dt);
  let strideSpeed=0;
  if(Math.abs(FOOT.v)>.01){
    let nx=FOOT.x+Math.sin(FOOT.h)*FOOT.v*dt,nz=FOOT.z+Math.cos(FOOT.h)*FOOT.v*dt;
    [nx,nz]=footClear(nx,nz);
    // Pedestrians already yield when approaching a walker. Also stop the walker
    // from entering their space from behind, allowing a sideways step or retreat.
    for(const ped of PEDS){
      if(!ped.m.G.visible||ped.st==="down")continue;
      const gap=Math.hypot(nx-ped.x,nz-ped.z);
      if(gap<.48&&gap<Math.hypot(FOOT.x-ped.x,FOOT.z-ped.z)){
        nx=FOOT.x;nz=FOOT.z;break;
      }
    }
    // not into the sea, and not up a step taller than a kerb in one stride
    const g=footGround(nx,nz);
    if(g>-.4&&g-FOOT.y<.6){
      strideSpeed=dt>0?Math.min(Math.abs(FOOT.v),Math.hypot(nx-FOOT.x,nz-FOOT.z)/dt):0;
      FOOT.x=nx;FOOT.z=nz;
    }
    if(strideSpeed<.01)FOOT.v=0;
  }else{const c=footClear(FOOT.x,FOOT.z);FOOT.x=c[0];FOOT.z=c[1]}   // a passing car nudges you aside
  // Plant the feet immediately on a raised surface. Ease down when leaving it.
  const g=footGround(FOOT.x,FOOT.z);
  FOOT.y=Math.max(g,FOOT.y+(g-FOOT.y)*Math.min(1,dt*14));
  FOOT.ph+=strideSpeed*dt*3.1;if(strideSpeed<.05)FOOT.ph+=(Math.round(FOOT.ph/Math.PI)*Math.PI-FOOT.ph)*Math.min(1,dt*10);
  footPlace(dt,strideSpeed);
  gunFoot(dt);
  footPrompt();
  // the car you left is switched off: its engine and tyres are silent (they used to hum on at whatever they were
  // doing when you got out, however far you walked), and the district and the clock keep up with you
  audioUpd(0,0,0,0,0,0,0,0);
  FOOT.hudT-=dt;if(FOOT.hudT<=0){FOOT.hudT=.4;$("zone").textContent=zoneAt(FOOT.x,FOOT.z);hudClock()}
  placeCarMesh(dt);showDamageSmoke(pc,P.damage||0,dt);footCam(dt);drawMini();
}
/* ================================================================ POLICE
   Two patrol cars drive with the traffic. Commit a crime where one of them can see it and you are wanted: one star,
   or two for ramming a police car, and one more for each further crime. The crimes: crashing into a car, running
   into someone on foot, taking a car, speeding past a patrol, and hitting a police car. While you are wanted, police
   cars chase you along the roads (more of them the more stars you have) and the house, the dealership, races,
   contracts and map travel are closed to you. Stay out of their reach long enough and they lose you; let one pull up
   beside you while you're stopped and you're caught: a fine, and the stars are gone. Arrest, health and weapons
   come later (roadmap step 4). Nothing here is saved: a reload clears it. */
const COP_V={patrol:2,pool:isTouch?4:5,see:90,reach:110,caught:8,caughtT:2.5,top:31,acc:6.5,brake:13,speedKph:110,speedNear:45,
  stars:[0,1,2,3,4,4],fine:500};
const WANTED={lvl:0,evadeT:0,seen:true,last:{x:0,z:0},caughtT:0,crimeAt:-99,why:""};
let copClock=0,copNavT=0,COPNAV=null,sirenAU=null;
// an officer on foot: out of a police car that has stopped near you but can't get beside you (you're off the road)
const OFFICER={on:false,x:0,z:0,y:0,h:0,v:0,ph:0,car:null,back:false,m:null,caughtT:0,detA:0,detT:0,detSide:0};
const OFF_V={run:4.4,walk:3,reach:45,giveUp:48,outT:25,grab:1.4,grabCar:2.9,grabT:1};
const copsChasing=()=>TRAFFIC.filter(t=>t.chase&&t.e);
function initCops(){
  for(let i=0;i<COP_V.pool;i++){
    const c=buildTrafficCar(0xf1f2f4,"sedan"),G=c.G,y=TPROF.sedan.b.reduce((m,q)=>Math.max(m,q[1]),0);
    // a blue band along each side and a light bar on the roof (red on the left, blue on the right)
    const band=new THREE.MeshLambertMaterial({color:0x1d4fa8}),red=new THREE.MeshBasicMaterial({color:0x4a1010}),blue=new THREE.MeshBasicMaterial({color:0x10204a});
    // (along the doors only: the body narrows towards the bonnet and the boot, where a band stood out from it)
    for(const sx of[-1,1]){const b=new THREE.Mesh(GEO.box,band);b.scale.set(.04,.18,2.3);b.position.set(sx*.9,.7,.05);G.add(b)}
    const bar=new THREE.Mesh(GEO.box,new THREE.MeshLambertMaterial({color:0x22262b}));bar.scale.set(1.15,.1,.3);bar.position.set(0,y+.05,-.25);G.add(bar);
    for(const[sx,m]of[[-.3,red],[.3,blue]]){const l=new THREE.Mesh(GEO.box,m);l.scale.set(.5,.13,.24);l.position.set(sx,y+.15,-.25);G.add(l)}
    G.visible=false;scene.add(G);
    if(!OFFICER.m)OFFICER.m=pedModel(0,1,figureLook(0x1f2f4f,0x1a2233,0xc49a7a,0x151c2a,true));
    TRAFFIC.push({c,col:0xf1f2f4,shape:"sedan",e:null,lost:true,dir:1,s:0,lane:0,off:0,offCur:0,base:0,v:0,stopT:0,hitT:0,waitT:0,passT:0,pa:null,
      wx:1e6,wz:1e6,yaw:0,cop:true,patrol:i<COP_V.patrol,chase:false,offDuty:false,lights:[red,blue]});
  }
}
// a car out of service: off the road and out of sight until it is called on
// (repaired while out of service: one shot to a stop comes back whole the next time it is called)
function copStandDown(t){t.chase=false;t.offDuty=false;t.e=null;t.lost=true;t.c.G.visible=false;t.wx=t.wz=1e6;t.v=0;t.damage=t.damageT=0;t.stopT=0;showDamageSmoke(t.c,0)}
const copSees=(x,z)=>TRAFFIC.some(t=>t.cop&&t.e&&Math.hypot(t.wx-x,t.wz-z)<COP_V.see);
const wantedBlock=()=>toast("LOSE THE POLICE FIRST","They're still after you: get out of their reach for a while","bad");
const CRIME={crash:["Crashed into a car in front of the police",1],ped:["Ran into someone in front of the police",1],take:["Took a car in front of the police",1],
  speed:["Speeding past the police",1],cop:["Hit a police car",2],fire:["Fired a gun in front of the police",1],
  shoot:["Shot at a car in front of the police",1],shootPed:["Shot at someone in front of the police",1],shootCop:["Shot at the police",2]};
// a crime at (x,z): it counts only where a police car can see it, never during a race or a test drive, and at most
// one star every 4 s (a crash is several contacts in a row). In tests the police look away unless a test asks
function crime(kind,x,z){
  if(window.__noCrime||ev||testDrive)return false;
  if(!copSees(x,z))return false;
  if(copClock-WANTED.crimeAt<4)return false;
  const[why,base]=CRIME[kind],lvl=WANTED.lvl?Math.min(5,WANTED.lvl+1):base;
  WANTED.crimeAt=copClock;if(lvl===WANTED.lvl)return false;
  const first=!WANTED.lvl;WANTED.lvl=lvl;WANTED.why=why;WANTED.evadeT=0;WANTED.seen=true;const me=copMe();WANTED.last={x:me.x,z:me.z};
  toast(first?"WANTED":"MORE POLICE",why+(first?" · get out of their reach to lose them":" · "+"★".repeat(lvl)),"bad");
  copDispatch();wantedHud();return true;
}
// you hit a car: a crash if it was hard enough (a nudge isn't), a worse one if it was the police
function copBump(t,rel){
  if(rel<4||copClock-(t.bumpAt||-9)<2)return;t.bumpAt=copClock;
  crime(t.cop?"cop":"crash",t.wx,t.wz);
}
const copMe=()=>BOAT.on?BOAT:FOOT.on?FOOT:P;
// as many police cars after you as your stars call for: the nearest patrol first, then cars from out of sight
function copDispatch(){
  const me=copMe(),want=COP_V.stars[WANTED.lvl];let have=copsChasing().length;
  // never one still standing wrecked where you stopped it (Codex's review of #31: it could be sent after you again)
  const free=TRAFFIC.filter(t=>t.cop&&!t.chase&&!(t.e&&(t.damage||0)>=100)).sort((a,b)=>(a.e?Math.hypot(a.wx-me.x,a.wz-me.z):1e9)-(b.e?Math.hypot(b.wx-me.x,b.wz-me.z):1e9));
  for(const t of free){if(have>=want)break;
    if(!t.e||Math.hypot(t.wx-me.x,t.wz-me.z)>400){if(!copPlace(t,170,340))continue}
    t.chase=true;t.offDuty=false;t.passT=0;have++}
  COPNAV=null;copNavT=0;
}
// a police car put on a road 170 to 340 m away, out of the camera's view, on no other car
function copPlace(t,dmin,dmax){
  const me=copMe(),cf=new V3();camera.getWorldDirection(cf);
  for(let k=0;k<80;k++){
    const e=pickEdge(),s=Math.random()*e.len,p=edgePos(e,s),dx=p.x-me.x,dz=p.z-me.z,d=Math.hypot(dx,dz);
    if(d<dmin||d>dmax||(dx*cf.x+dz*cf.z)/d>.2)continue;
    if(TRAFFIC.some(o=>o!==t&&o.e&&Math.abs(o.wx-p.x)<14&&Math.abs(o.wz-p.z)<14))continue;
    t.e=e;t.s=s;t.dir=Math.random()<.5?1:-1;t.lost=false;t.lane=0;setLane(t);t.v=8;t.offCur=t.off;
    const ux=p.dx*t.dir,uz=p.dz*t.dir;t.wx=p.x-uz*t.off;t.wz=p.z+ux*t.off;t.yaw=Math.atan2(ux,uz);return true;
  }
  return false;
}
// how far it is along the roads from every junction to where the police are heading (you, or where you were last seen)
function copNav(){
  const W=WANTED,me=copMe(),tx=W.seen?me.x:W.last.x,tz=W.seen?me.z:W.last.z,nr=nearestRoad(tx,tz,70)||nearestRoadGlobal(tx,tz,false);
  const dist=new Map();if(!nr)return null;
  const Q=[[nr.s,nr.e.a],[nr.e.len-nr.s,nr.e.b]];for(const[d,n]of Q)if(!dist.has(n)||d<dist.get(n))dist.set(n,d);
  // a plain search: the island has a few hundred junctions, worked out at most twice a second
  const open=[...dist.entries()];
  while(open.length){let bi=0;for(let i=1;i<open.length;i++)if(open[i][1]<open[bi][1])bi=i;const[n,d]=open.splice(bi,1)[0];if(d>dist.get(n))continue;
    for(const a of n.adj){const o=a.end==="a"?a.e.b:a.e.a,nd=d+a.e.len;if(!dist.has(o)||nd<dist.get(o)){dist.set(o,nd);open.push([o,nd])}}}
  return{dist,e:nr.e,s:nr.s,x:tx,z:tz,off:nr.d};
}
// the road a chasing car takes from a junction: the one that gets it nearest, soonest
function copPick(t,node){
  let best=null,bc=1e18;
  for(const a of node.adj){if(a.e===t.e&&node.adj.length>1)continue;
    const c=a.e===COPNAV.e?(a.end==="a"?COPNAV.s:a.e.len-COPNAV.s):a.e.len+(COPNAV.dist.get(a.end==="a"?a.e.b:a.e.a)??1e9);
    if(c<bc){bc=c;best=a}}
  return best;
}
// a chasing police car: along the roads at up to about 110 km/h, round the slower traffic, straight at you once it is
// on your road, and it stops beside you
function copDrive(t,dt){
  if(!COPNAV||OFFICER.car===t){t.v=Math.max(0,t.v-COP_V.brake*dt);return copPose(t,dt)}
  tickDamage(t,dt);t.hitT-=dt;
  const N=COPNAV,end=t.dir>0?t.e.b:t.e.a,back=t.dir>0?t.e.a:t.e.b,dEnd=t.dir>0?t.e.len-t.s:t.s;
  const top=Math.min(COP_V.top,RT[t.e.type].spd*2.1)*damagePower(t);let target=top,offT=t.off;
  if(t.e===N.e){
    // on the same road as you: head your way and pull up a few metres short
    const want=N.s>t.s?1:-1,gap=Math.abs(N.s-t.s);
    if(want!==t.dir){if(t.v<7){t.dir=want;t.offCur=-t.offCur;t.off=-t.off}else target=0}
    else{target=Math.min(top,Math.sqrt(2*7*Math.max(0,gap-6)));
      if(gap<30){const q=edgePos(t.e,t.s),ux=q.dx*t.dir,uz=q.dz*t.dir,me=copMe();offT=clamp((me.x-q.x)*-uz+(me.z-q.z)*ux,-t.e.half+1,t.e.half-1)}}
  }else{
    // the way it is facing against turning round: a U-turn if the other way is clearly shorter
    const ahead=dEnd+(N.dist.get(end)??1e9),behind=(t.e.len-dEnd)+(N.dist.get(back)??1e9);
    if(behind+40<ahead){if(t.v<7){t.dir=-t.dir;t.s=clamp(t.s,0,t.e.len);t.offCur=-t.offCur;t.off=-t.off}else target=0}
    else{const a=copPick(t,end);
      if(a){const p0=edgePos(t.e,t.dir>0?t.e.len:0),q=edgePos(a.e,a.end==="a"?0:a.e.len),inx=p0.dx*t.dir,inz=p0.dz*t.dir,od=a.end==="a"?1:-1,
          turn=Math.acos(clamp(inx*q.dx*od+inz*q.dz*od,-1,1));
        // slows for a corner: about 13 m/s through a right angle
        if(turn>.35)target=Math.min(target,Math.sqrt(13*13+2*8*Math.max(0,dEnd-4)))}}
  }
  // slower traffic in its lane ahead: round it on the other side of the road, or slow behind it if both are full
  {const p=edgePos(t.e,t.s),tx=p.dx*t.dir,tz=p.dz*t.dir;let blocked=false,other=false;
    for(const o of TRAFFIC){if(o===t||!o.e)continue;const ox=o.wx-t.wx,oz=o.wz-t.wz;if(Math.abs(ox)>24||Math.abs(oz)>24)continue;
      const gap=ox*tx+oz*tz,side=ox*-tz+oz*tx;if(gap<=0||gap>22)continue;
      if(Math.abs(side-(offT-t.offCur))<1.8)blocked=true;if(Math.abs(side-(-offT-t.offCur))<1.8)other=true}
    if(blocked){if(!other)offT=-offT;else target=Math.min(target,4)}}
  t.offCur+=clamp(offT-t.offCur,-3.5*dt,3.5*dt);
  t.v+=clamp(target-t.v,-COP_V.brake*dt,COP_V.acc*dt);
  t.s+=t.v*dt*t.dir;
  if(t.s>t.e.len||t.s<0){const node=t.s>t.e.len?t.e.b:t.e.a,over=t.s>t.e.len?t.s-t.e.len:-t.s,a=copPick(t,node);
    if(!a){t.dir=-t.dir;t.s=clamp(t.s,0,t.e.len);t.offCur=-t.offCur}
    else{t.e=a.e;if(a.end==="a"){t.dir=1;t.s=Math.min(over,t.e.len)}else{t.dir=-1;t.s=Math.max(0,t.e.len-over)}
      const ln=RT[t.e.type].lanes;t.lane=0;t.off=ln[0]*SIDE()}}
  copPose(t,dt);
}
// where a chasing car stands and how it is drawn (as updateTraffic does for the others)
function copPose(t,dt){
  const q=edgePos(t.e,t.s),ux=q.dx*t.dir,uz=q.dz*t.dir,me=copMe();
  t.wx=q.x-uz*t.offCur;t.wz=q.z+ux*t.offCur;t.yaw=Math.atan2(ux,uz);
  const d=Math.hypot(t.wx-me.x,t.wz-me.z);t.c.G.visible=d<560;
  if(t.c.G.visible){const yF=edgeY(t.e,t.s+1.3*t.dir),yB=edgeY(t.e,t.s-1.3*t.dir);t.c.G.position.set(t.wx,(yF+yB)/2+YO,t.wz);t.c.G.rotation.set(-Math.atan((yF-yB)/2.6),t.yaw,0,"YXZ");showDamageSmoke(t.c,t.damage||0,dt)}
}
function copUpdate(dt){
  copClock+=dt;const W=WANTED,me=copMe(),driving=!FOOT.on&&!BOAT.on;
  // speeding past a patrol, when you aren't wanted already
  if(!W.lvl&&driving&&kphNow()>COP_V.speedKph&&TRAFFIC.some(t=>t.cop&&t.e&&Math.hypot(t.wx-P.x,t.wz-P.z)<COP_V.speedNear))crime("speed",P.x,P.z);
  // the light bars: flashing red and blue on a chase, dark otherwise
  const ph=copClock%.5<.25;
  for(const t of TRAFFIC)if(t.cop){t.lights[0].color.setHex(t.chase&&ph?0xff2a2a:0x4a1010);t.lights[1].color.setHex(t.chase&&!ph?0x2a6bff:0x10204a)}
  copSiren(dt);
  if(!W.lvl){if(OFFICER.on)copOfficer(dt,[],false);return}
  // twice a second: the way to you, and more cars if your stars call for them (a placement can fail: no road out of sight)
  copNavT-=dt;if(copNavT<=0||!COPNAV){copNavT=.5;if(copsChasing().length<COP_V.stars[W.lvl])copDispatch();COPNAV=copNav()}
  const ch=copsChasing();
  let near=1e9;for(const t of ch)near=Math.min(near,Math.hypot(t.wx-me.x,t.wz-me.z));
  // in reach of one of them, or of an officer coming for you on foot: they know where you are. Out of reach, they
  // head for where you were last seen
  W.seen=near<COP_V.reach||(OFFICER.on&&!OFFICER.back&&Math.hypot(OFFICER.x-me.x,OFFICER.z-me.z)<COP_V.reach);
  if(W.seen){W.evadeT=0;W.last={x:me.x,z:me.z}}
  else{W.evadeT+=dt;if(W.evadeT>=copLoseT()){copClear();toast("LOST THEM","The police have stopped looking for you","gold");return}}
  // caught: one beside you while you're stopped (or on foot); the boat is out of their reach
  const still=BOAT.on?false:FOOT.on?true:Math.hypot(P.vx,P.vz)<2;
  if(still&&near<COP_V.caught)W.caughtT+=dt;else W.caughtT=Math.max(0,W.caughtT-dt);
  if(W.caughtT>=COP_V.caughtT){copCaught();return}
  if(copOfficer(dt,ch,still))return;
  copCarFire(dt,ch);
  // one that has fallen far behind is brought back nearer, out of sight
  for(const t of ch)if(Math.hypot(t.wx-me.x,t.wz-me.z)>700&&!t.c.G.visible)copPlace(t,200,360);
  wantedHud();
}
// The officer: gets out of a chasing car that has stopped within 45 m of you when it can get no nearer (you're off
// the road), on foot or sitting still in a car. They run at you (a little slower than you run: you can get away), and
// you're caught when they reach you, on foot, or reach your door while you sit still. Get back on the move, get
// more than 48 m away, keep away for 25 s, or leave them going round walls for 15 s without getting nearer, and they go back to the car, which then carries on.
// One officer at a time
function copOfficer(dt,ch,still){
  if(OFFICER.m&&OFFICER.m.face)faceBlink(OFFICER.m.face,dt);
  const O=OFFICER,me=copMe(),car=O.car;
  if(!O.on){
    if(BOAT.on||!(FOOT.on||still)||!WANTED.seen)return false;
    const t=ch.find(t=>t.v<.4&&t.e&&copClock-(t.offAt??-99)>12&&Math.hypot(t.wx-me.x,t.wz-me.z)>COP_V.caught&&Math.hypot(t.wx-me.x,t.wz-me.z)<OFF_V.reach);
    if(!t)return false;
    // out of the door on the side nearer you
    const rx=Math.cos(t.yaw),rz=-Math.sin(t.yaw),sd=((me.x-t.wx)*rx+(me.z-t.wz)*rz)>=0?1:-1,c=footClear(t.wx+rx*sd*1.6,t.wz+rz*sd*1.6);
    Object.assign(O,{on:true,x:c[0],z:c[1],y:footGround(c[0],c[1]),h:t.yaw,v:0,car:t,back:false,caughtT:0,detA:0,detT:0,detSide:0,outT:0,best:1e9,down:0,fall:0});O.m.G.rotation.set(0,t.yaw,0,"YXZ");O.m.G.visible=true;
    return false;
  }
  if(!car||!car.e){copOfficerIn();return false}
  // shot: down for 6 s (standing still on LOW, where nobody falls), then back to the car
  if(O.down>0){O.down-=dt;O.caughtT=0;O.fall=Math.min(1,(O.fall||0)+dt*4*(save.violence?1:0));O.m.G.rotation.set(-Math.PI/2*O.fall,O.h,0,"YXZ");
    if(O.down<=0){O.back=true;car.offAt=copClock;O.fall=0;O.m.G.rotation.set(0,O.h,0,"YXZ")}return false}
  const dMe=Math.hypot(me.x-O.x,me.z-O.z);O.outT+=dt;
  // once they turn back they go all the way to the car; it waits 12 s before sending anyone again
  if(!O.back&&(!WANTED.lvl||BOAT.on||(!FOOT.on&&!still)||dMe>OFF_V.giveUp||O.detT>15||O.outT>OFF_V.outT)){O.back=true;car.offAt=copClock}
  const tx=O.back?car.wx:me.x,tz=O.back?car.wz:me.z,dx=tx-O.x,dz=tz-O.z,d=Math.hypot(dx,dz);
  if(O.back&&d<1.9){copOfficerIn();return false}
  // the chase over and you long gone: back in the car without the walk
  if(O.back&&!WANTED.lvl&&dMe>120){copOfficerIn();return false}
  const want=O.back&&!WANTED.lvl?OFF_V.walk:OFF_V.run;O.v+=clamp(want-O.v,-10*dt,6*dt);
  if(d>.05){
    // straight for you. A wall or fence in the way: round it, keeping to one side (the side with the way open
    // nearer the straight line), always taking the heading nearest straight that is open for the next metre and a half.
    // Straight is taken again as soon as it is open (one that only slid along a dry-stone wall stood there for good)
    const rot=(a)=>[dx/d*Math.cos(a)-dz/d*Math.sin(a),dx/d*Math.sin(a)+dz/d*Math.cos(a)];
    const open=(a)=>{const[vx,vz]=rot(a);for(const k of[.45,.9,1.35]){const px=O.x+vx*k,pz=O.z+vz*k,q=footClear(px,pz);if(Math.hypot(q[0]-px,q[1]-pz)>.05)return false}return true};
    if(d<1.4||open(0)){O.detA=0;O.detT=0;O.best=d}
    else{if(!O.detA)O.detSide=0;
      const sides=O.detSide?[O.detSide]:[1,-1];let best=null;
      for(const a of[.35,.7,1.05,1.4,1.75,2.1,2.45,2.8]){for(const k of sides)if(open(a*k)){best=a*k;break}if(best!==null)break}
      if(best===null)best=(O.detSide||1)*2.8;
      // the 15 s counts only while they get no nearer to where they are going: going round a long wall and gaining
      // ground starts it again (ChatGPT's review of #28)
      O.detA=best;O.detSide=Math.sign(best);if(d<O.best-2){O.best=d;O.detT=0}else O.detT+=dt}
    const[ux,uz]=rot(O.detA),st=Math.min(d,O.v*dt),c=footClear(O.x+ux*st,O.z+uz*st);
    O.x=c[0];O.z=c[1];O.h+=wrapA(Math.atan2(ux,uz)-O.h)*Math.min(1,dt*10)}
  O.y+=(footGround(O.x,O.z)-O.y)*Math.min(1,dt*12);
  O.ph+=O.v*dt*3.3;const sw=Math.sin(O.ph)*Math.min(.9,O.v*.3),G=O.m.G;
  G.position.set(O.x,O.y,O.z);G.rotation.y=O.h;O.m.legs[0].rotation.x=sw;O.m.legs[1].rotation.x=-sw;O.m.arms[0].rotation.x=-sw*.8;O.m.arms[1].rotation.x=sw*.8;
  // at three stars or more an officer fires at you while you're on foot, from within 20 m with a clear line: about
  // one shot in three hits at 10 m, fewer further off, 10 health a hit (the violence setting changes how hits look,
  // not the rules)
  O.shootT=(O.shootT||0)-dt;
  if(WANTED.lvl>=3&&FOOT.on&&!O.back&&dMe>2&&dMe<20&&O.shootT<=0&&gunClear(O.x,O.z,me.x,me.z,.6)){
    O.shootT=1.2;gunMuzzle(O.x+Math.sin(O.h)*.5,O.y+1.35,O.z+Math.cos(O.h)*.5);gunSound();
    if(Math.random()<Math.max(.08,.45-dMe*.015))hurt(10)}
  // caught: they have hold of you (on foot), or are at your door while you sit still
  const grab=FOOT.on?dMe<OFF_V.grab:still&&dMe<OFF_V.grabCar;
  if(!O.back&&grab)O.caughtT+=dt;else O.caughtT=0;
  if(O.caughtT>=OFF_V.grabT){copOfficerIn();copCaught();return true}
  return false;
}
// the officer back in their car (or gone, if the car has been taken off the road), and the car free to drive again
function copOfficerIn(){const O=OFFICER;if(O.car)O.car.stopT=0;O.on=false;O.car=null;O.back=false;O.m.G.visible=false}
// At four stars or more the two nearest chasing police cars within 30 m, with a clear line to you, fire every 1.5 s:
// in your car a hit damages the car (6), on foot it hurts you (8). Never at sea, never from a wrecked car
function copCarFire(dt,ch){
  if(WANTED.lvl<4||BOAT.on)return;
  const me=copMe(),near=ch.filter(t=>(t.damage||0)<100).map(t=>[t,Math.hypot(t.wx-me.x,t.wz-me.z)]).filter(a=>a[1]<30).sort((a,b)=>a[1]-b[1]).slice(0,2);
  for(const[t,d]of near){t.shootT=(t.shootT??.6)-dt;if(t.shootT>0)continue;t.shootT=1.5;
    // the line starts 3 m out of the police car's front, clear of its own body
    const stop=FOOT.on?.6:2.8,ux=(me.x-t.wx)/d,uz=(me.z-t.wz)/d;if(d<4||!gunClear(t.wx+ux*3,t.wz+uz*3,me.x,me.z,stop))continue;
    gunMuzzle(t.wx+Math.sin(t.yaw)*2.2,1.3+footGround(t.wx,t.wz),t.wz+Math.cos(t.yaw)*2.2);gunSound();
    if(Math.random()<Math.max(.08,.45-d*.015)){if(FOOT.on)hurt(8);else{P.damageT=0;damageVehicle(P,4+6/1.4);HEALTH.hurtT=.35}}}
}
// how long out of reach it takes to lose them: longer with more stars
const copLoseT=()=>6+3*WANTED.lvl;
function copClear(){
  const W=WANTED;W.lvl=0;W.evadeT=0;W.caughtT=0;W.seen=true;COPNAV=null;
  // patrol cars go back to patrolling where they are; the others drive off and are stood down once out of sight
  for(const t of TRAFFIC)if(t.cop&&t.chase){t.chase=false;if(t.e){t.lane=0;setLane(t);t.v=Math.min(t.v,t.base);t.offDuty=!t.patrol}}
  if(OFFICER.on){OFFICER.back=true;if(OFFICER.car)OFFICER.car.stopT=1e6}
  wantedHud();
}
function copCaught(){
  const fine=Math.min(save.cr,COP_V.fine*WANTED.lvl),armed=save.armed;
  save.cr-=fine;if(armed)save.armed=false;persist();updateMoney();copClear();
  if(armed){gunArrest(fine);return}
  toast("CAUGHT",fine?"Fined "+fmtCr(fine)+" CR. Drive carefully near the police":"No fine: you have no credits","bad");
}
function wantedHud(){
  const el=$("wanted"),W=WANTED;show("wanted",!!W.lvl);if(!W.lvl)return;
  const key=W.lvl+(W.seen?"":"l");if(el.dataset.k===key)return;el.dataset.k=key;
  el.innerHTML="";for(let i=1;i<=5;i++){const s=document.createElement("i");s.textContent="★";if(i<=W.lvl)s.className="on";el.append(s)}
  el.classList.toggle("lost",!W.seen);el.setAttribute("aria-label","Wanted: "+W.lvl+" of 5 stars"+(W.seen?"":", out of their reach"));
}
// a two-tone siren from the nearest chasing car, louder as it comes closer
function copSiren(dt){
  if(!AU)return;
  if(!sirenAU){const o=AC.createOscillator(),g=AC.createGain();o.type="triangle";o.frequency.value=700;g.gain.value=0;o.connect(g);g.connect(AU.master);o.start();sirenAU={o,g}}
  const me=copMe();let d=1e9;for(const t of TRAFFIC)if(t.chase&&t.e)d=Math.min(d,Math.hypot(t.wx-me.x,t.wz-me.z));
  const now=AC.currentTime,v=save.sound?clamp(1-d/320,0,1)*.045:0;
  sirenAU.g.gain.setTargetAtTime(v,now,.15);sirenAU.o.frequency.setTargetAtTime(copClock%1.2<.6?660:880,now,.04);
}
/* ================================================================ PISTOL AND HEALTH (roadmap step 4, first part)
   Working decisions in docs/STEP4_DECISIONS.md. Take the pistol from the garage (GARAGE: PISTOL) and you carry it
   on foot: it locks onto the nearest target in front of you (a car, a police car, someone walking, an officer) and
   fires with G, the FIRE pad, or the controller's right shoulder. 48 rounds, refilled at the house. Cars and police
   cars stop when badly damaged; people are knocked down and get up again; officers go back to their car. What the
   police see counts towards the wanted level, as for any crime. Once you carry the pistol, being caught is an
   arrest: the fine, the pistol back to the garage, and you start outside the Harbour Hall.
   Health is yours only: 100, back to 50 slowly when nothing hurts you for 6 s, full at the house; at 0 you are
   knocked out and wake at home, 10% of your credits poorer (at most 5,000). The VIOLENCE setting: LOW nobody falls,
   STANDARD people fall, STRONG hits leave a red mark that fades. */
const GUN={max:48,ammo:0,cool:0,range:40,cone:.6,dmg:12,lock:null,flashT:0,m:null,flash:null,ring:null,sparks:[],marks:[],aimT:0,hudT:0};
const HEALTH={hp:100,max:100,calm:99,hurtT:0};
function initGun(){
  // the pistol in the right hand (the walker's right is its arm on the -x side), a flash at the muzzle, a ring
  // over the locked target, and small pools of sparks and marks: all made now, so the graphics card has them ready
  const m=footModel(),gm=new THREE.MeshStandardMaterial({color:0x1d1f22,roughness:.5,metalness:.4});
  GUN.m=new THREE.Group();const b=new THREE.Mesh(GEO.box,gm);b.scale.set(.045,.11,.2);b.position.set(0,-.02,.06);GUN.m.add(b);
  const g2=new THREE.Mesh(GEO.box,gm);g2.scale.set(.04,.12,.05);g2.position.set(0,-.09,0);g2.rotation.x=.3;GUN.m.add(g2);
  // in the scene, not in the walker's figure, following the right forearm each frame (as part of the figure it
  // changed the figure's size and shape)
  GUN.m.visible=false;scene.add(GUN.m);GUN.hand=new THREE.Object3D();GUN.hand.position.set(0,-.27,.04);m.elbows[0].add(GUN.hand);
  const hot=new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending});
  GUN.flash=new THREE.Mesh(GEO.ball,hot);GUN.flash.scale.setScalar(.09);GUN.flash.position.set(0,-.02,.2);GUN.m.add(GUN.flash);GUN.flash.visible=false;
  GUN.ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.05,6,24),new THREE.MeshBasicMaterial({color:0xe2483d,transparent:true,opacity:.85,depthWrite:false}));
  GUN.ring.rotation.x=Math.PI/2;GUN.ring.visible=false;scene.add(GUN.ring);
  for(let i=0;i<6;i++){const k=new THREE.Mesh(GEO.ball,hot.clone());k.scale.setScalar(.18);k.visible=false;scene.add(k);GUN.sparks.push({m:k,t:0})}
  const red=new THREE.MeshBasicMaterial({color:0x7a0d0d,transparent:true,opacity:0,depthWrite:false});
  for(let i=0;i<6;i++){const k=new THREE.Mesh(new THREE.CircleGeometry(.35,12),red.clone());k.rotation.x=-Math.PI/2;k.visible=false;scene.add(k);GUN.marks.push({m:k,t:0})}
}
const gunWant=()=>!locked&&(keys.g||pad.F||GP.fire);
// whether a shot from (x0,z0) gets to (x1,z1) without a wall in the way (cars count as cover too)
function gunClear(x0,z0,x1,z1,stop){
  const d=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.floor((d-stop)/.8));
  for(let k=1;k<=n;k++){const t=k*.8/d,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t,c=footClear(x,z);if(Math.hypot(c[0]-x,c[1]-z)>.05)return false}
  return true;
}
// the nearest target within 40 m and about 35 degrees of where you face, in a clear line. From the car, the shot
// starts 3 m ahead of its middle (clear of its own body: your car never blocks your shots)
function gunFrom(){if(FOOT.on)return{x:FOOT.x,z:FOOT.z,h:FOOT.h,y:FOOT.y+1.3};const f=fwdOf(P.h);return{x:P.x+f.x*3,z:P.z+f.z*3,h:P.h,y:P.y+1.1}}
function gunPick(){
  const F=gunFrom(),fx=Math.sin(F.h),fz=Math.cos(F.h),list=[];
  for(const t of TRAFFIC)if(t.e&&t.c.G.visible&&(t.damage||0)<100)list.push({k:t.cop?"cop":"car",x:t.wx,z:t.wz,y:1,o:t,stop:2.8});
  if(pedOn)for(const p of PEDS)if(p.m.G.visible&&p.st!=="down")list.push({k:"ped",x:p.x,z:p.z,y:1.2,o:p,stop:.6});
  if(OFFICER.on&&!(OFFICER.down>0))list.push({k:"officer",x:OFFICER.x,z:OFFICER.z,y:1.2,o:OFFICER,stop:.6});
  let best=null,bs=1e9;
  for(const q of list){const dx=q.x-F.x,dz=q.z-F.z,d=Math.hypot(dx,dz);if(d<.8||d>GUN.range)continue;
    const a=Math.acos(clamp((dx*fx+dz*fz)/d,-1,1));if(a>GUN.cone)continue;
    const sc=d+a*25;if(sc<bs&&gunClear(F.x,F.z,q.x,q.z,q.stop)){bs=sc;best=q}}
  return best;
}
function gunSpark(x,y,z){const s=GUN.sparks.find(s=>s.t<=0)||GUN.sparks[0];s.t=.12;s.m.position.set(x,y,z);s.m.visible=true}
// a flash at a gun's muzzle: none with FLASHES OFF (Codex's review of #35: police and car shots still flashed).
// Where a shot lands still shows; nothing else about the shot changes
function gunMuzzle(x,y,z){if(save.flash)gunSpark(x,y,z)}
function gunMark(x,z){if(save.violence<2)return;const k=GUN.marks.find(k=>k.t<=0)||GUN.marks[0];k.t=4;k.m.position.set(x,footGround(x,z)+.03,z);k.m.material.opacity=.7;k.m.visible=true}
function gunSound(){if(!AU||!save.sound)return;const s=AC.createBufferSource();s.buffer=AU.buf;const f=AC.createBiquadFilter();f.type="bandpass";f.frequency.value=1500;f.Q.value=.6;
  const g=AC.createGain(),t=AC.currentTime;g.gain.setValueAtTime(.45,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);s.connect(f);f.connect(g);g.connect(AU.master);s.start(0,Math.random()*.5);s.stop(t+.18)}
function gunFire(){
  if(GUN.ammo<=0){toastOnce("gun",["OUT OF ROUNDS","Refill at your house"]);GUN.cool=.4;return false}
  GUN.ammo--;GUN.cool=.32;GUN.flashT=.06;GUN.aimT=1.2;gunSound();
  const F=gunFrom(),q=GUN.lock;
  if(!FOOT.on)gunMuzzle(F.x,F.y,F.z);   // from the car: the flash at the bonnet
  if(!q){const x=F.x+Math.sin(F.h)*25,z=F.z+Math.cos(F.h)*25;gunSpark(x,footGround(x,z)+.2,z);crime("fire",F.x,F.z);return true}
  gunSpark(q.x,q.y+(q.k==="car"||q.k==="cop"?0:.1),q.z);
  // a hit counts where the police can see it happen, or see you fire (Codex's review of #31: a patrol beside you
  // could watch you shoot someone 40 m away and do nothing). One crime either way, never two
  const seen=(k,x,z)=>{if(!copSees(x,z)&&copSees(F.x,F.z))crime(k,F.x,F.z);else crime(k,x,z)};
  if(q.k==="car"||q.k==="cop"){const t=q.o;t.damageT=0;damageVehicle(t,4+GUN.dmg/1.4);
    // badly damaged: it stops where it is, out of the chase for good
    if((t.damage||0)>=100){t.stopT=1e6;t.v=0;if(t.cop){t.chase=false;t.offDuty=true}}
    seen(q.k==="cop"?"shootCop":"shoot",q.x,q.z)}
  // the same in every violence setting: down for 6 s. The setting only changes what you see (on LOW they stand still
  // instead of falling)
  else if(q.k==="ped"){const p=q.o;p.st="down";p.t=6;p.v=0;gunMark(p.x,p.z);seen("shootPed",p.x,p.z)}
  else{const O=q.o;O.down=6;O.caughtT=0;gunMark(O.x,O.z);seen("shootCop",O.x,O.z)}
  return true;
}
// in the car, every frame: the lock ahead and firing (the pistol itself isn't seen). Not in a race or a test drive
function gunCar(dt){
  const on=save.armed&&!ev&&!testDrive;GUN.cool-=dt;GUN.flashT-=dt;GUN.aimT-=dt;GUN.m.visible=false;GUN.flash.visible=false;
  GUN.lock=on?gunPick():null;
  if(on&&gunWant()&&GUN.cool<=0)gunFire();
  const q=GUN.lock;GUN.ring.visible=!!q;if(q){GUN.ring.position.set(q.x,footGround(q.x,q.z)+(q.k==="car"||q.k==="cop"?2.1:2.05),q.z);GUN.ring.rotation.z+=dt*2}
}
// on foot, every frame: the pistol in your hand, the lock, firing, the right arm raised to aim
function gunFoot(dt){
  const on=save.armed&&FOOT.on;GUN.m.visible=on;GUN.cool-=dt;GUN.flashT-=dt;GUN.aimT-=dt;GUN.flash.visible=GUN.flashT>0&&save.flash;
  GUN.lock=on?gunPick():null;
  if(on&&gunWant()&&GUN.cool<=0)gunFire();
  const q=GUN.lock;GUN.ring.visible=!!q;if(q){GUN.ring.position.set(q.x,(q.k==="car"||q.k==="cop"?footGround(q.x,q.z)+2.1:footGround(q.x,q.z)+2.05),q.z);GUN.ring.rotation.z+=dt*2}
  if(on&&(q||GUN.aimT>0)){const m=FOOT.m;m.arms[0].rotation.x=-1.45;m.elbows[0].rotation.x=-.05;
    // turn a little towards the target while aiming, so the arm points at it
    if(q)FOOT.h+=wrapA(Math.atan2(q.x-FOOT.x,q.z-FOOT.z)-FOOT.h)*Math.min(1,dt*6);m.G.rotation.y=FOOT.h}
  if(on){FOOT.m.G.updateMatrixWorld(true);GUN.hand.matrixWorld.decompose(GUN.m.position,GUN.m.quaternion,GUN.m.scale)}
}
// First-aid kits at four fixed places: walk or drive over one for +50 health (up to 100). Each comes back 2 minutes
// after it is taken; a kit isn't taken at full health. Shown on the minimap within 150 m
const KITS=[];
function initKits(){
  const hm=gW(0,-8),spots=[[QUAY.fountain[0]+13,QUAY.fountain[1]],[PIER.x0-18,4],[hm.x+6,hm.z+4],[DEALER_MARK.x-8,DEALER_MARK.z+3]];
  const white=new THREE.MeshLambertMaterial({color:0xf4f4f2}),red=new THREE.MeshBasicMaterial({color:0xd8322a});
  for(const[x0,z0]of spots){const c=footClear(x0,z0),G=new THREE.Group();
    const b=new THREE.Mesh(GEO.box,white);b.scale.set(.6,.42,.42);G.add(b);
    for(const[w,h]of[[.34,.1],[.1,.34]])for(const sz of[-1,1]){const r=new THREE.Mesh(GEO.box,red);r.scale.set(w,h,.02);r.position.z=sz*.215;G.add(r)}
    G.position.set(c[0],footGround(c[0],c[1])+.8,c[1]);scene.add(G);KITS.push({x:c[0],z:c[1],G,back:0})}
}
function kitTick(dt){
  const me=FOOT.on?FOOT:P,reach=FOOT.on?1.6:3,H=HEALTH;
  for(const k of KITS){
    if(k.back>0){k.back-=dt;k.G.visible=k.back<=0;continue}
    k.G.rotation.y+=dt*1.5;k.G.position.y=footGround(k.x,k.z)+.8+Math.sin(copClock*2+k.x)*.08;
    if(!BOAT.on&&state==="DRIVE"&&H.hp<H.max&&H.hp>0&&Math.hypot(me.x-k.x,me.z-k.z)<reach){H.hp=Math.min(H.max,H.hp+50);k.back=120;k.G.visible=false;
      toast("FIRST AID","+50 health · this one is back in 2 minutes","gold")}}
}
function hurt(n){
  const H=HEALTH;if(H.hp<=0||n<=0)return;H.hp=Math.max(0,H.hp-n);H.calm=0;H.hurtT=.5;
  if(H.hp<=0)knockedOut();
}
// out cold: home, a little poorer; nothing you were doing carries on (a chase, a contract, a taken car)
function knockedOut(){
  const fine=Math.min(Math.round(save.cr*.1),5000);save.cr-=fine;persist();updateMoney();
  if(OFFICER.on)copOfficerIn();copClear();
  toast("KNOCKED OUT","You came round at home"+(fine?" · "+fmtCr(fine)+" CR gone":""),"bad");
  goGarage(false);HEALTH.hp=HEALTH.max;
}
// arrested (caught while carrying the pistol): out of the car, the pistol taken back to the garage, and set down
// on the road outside the Harbour Hall
function gunArrest(fine){
  if(FOOT.on)footEnd();
  fadeThen(420,()=>{const nr=nearestRoadGlobal(QUAY.hall[0],QUAY.hall[1]+QUAY.hall[3]+14,true);if(nr){placeOnRoad(nr,1);snapCam()}});
  toast("ARRESTED",(fine?"Fined "+fmtCr(fine)+" CR. ":"")+"Your pistol is back in the garage","bad");
}
function drawDamageEdge(crash){
  const hit=save.flash?Math.max(crash,HEALTH.hurtT*.9,0):0;
  const opacity=hit+(HEALTH.hp<30?.15:0);
  $("edge").style.boxShadow=`inset 0 0 140px rgba(226,72,61,${opacity.toFixed(3)})`;
}
function healthTick(dt){
  const H=HEALTH;H.calm+=dt;H.hurtT-=dt;kitTick(dt);
  // the pistol and the lock ring go on the boat and whenever you aren't playing (the ring stayed over the target)
  if(BOAT.on||state!=="DRIVE"){GUN.ring.visible=false;GUN.m.visible=false;GUN.lock=null}
  if(H.calm>6&&H.hp<50&&H.hp>0)H.hp=Math.min(50,H.hp+4*dt);
  for(const s of GUN.sparks)if(s.t>0){s.t-=dt;if(s.t<=0)s.m.visible=false}
  for(const k of GUN.marks)if(k.t>0){k.t-=dt;k.m.material.opacity=Math.min(.7,k.t*.35);if(k.t<=0)k.m.visible=false}
  if(FOOT.on||BOAT.on)drawDamageEdge(0);
  GUN.hudT-=dt;if(GUN.hudT<=0){GUN.hudT=.1;
    const show1=(save.armed&&!BOAT.on)||H.hp<H.max;show("gunHud",show1);
    // the FIRE pad: whenever the pistol can be fired, kept up to date here rather than only on getting in or out
    // (Codex's review of #35: it was missing on the first drive after taking the pistol, and stayed in races)
    const ready=gunReady();show("bF",ready);if(!BOAT.on)keyHints(FOOT.on);
    if(show1){$("hpBar").style.width=Math.round(H.hp/H.max*100)+"%";$("gunHud").classList.toggle("low",H.hp<30);
      // on a computer the pill also says which key fires (on a phone the FIRE pad does)
      const t=save.armed?(GUN.ammo?"PISTOL "+GUN.ammo+(ready&&!isTouch?" · G TO FIRE":""):"PISTOL EMPTY"):"";$("gunTxt").textContent=t;$("gunHud").classList.toggle("empty",save.armed&&!GUN.ammo)}}
}
/* ================================================================ PEDESTRIANS
   People walking in Old Quay: round the blocks on the pavements, across the streets on the zebra crossings when no car is
   coming, standing a while now and then. They are scenery with manners, nothing more yet: a car can't hurt them
   (they hurry out of its way and are never left inside it), and traffic stops for one who is crossing. They are
   only worked out while you are near the town. */
const PED_V={walk:1.35,hurry:3.3,r:.3,line:6.3,cap:isTouch?6:10,near:420,see:260};
const PEDS=[],PED_NODES=[],PED_EDGES=[];let pedOn=false;
// the avenue's centre line where it passes the blocks (it curves; the other streets are straight)
const avenueZ=x=>{const A=[[560,40],[640,38],[720,36],[800,32]];for(let i=1;i<A.length;i++)if(x<=A[i][0]||i===A.length-1){const[a,b]=[A[i-1],A[i]];return a[1]+(b[1]-a[1])*clamp((x-a[0])/(b[0]-a[0]),0,1)}};
// one shape per kind of limb and body for each mix of clothes, shared by everyone dressed that way
const PED_LOOKS=[],PED_MAT=new THREE.MeshLambertMaterial({vertexColors:true});
function pedLook(k){
  if(PED_LOOKS[k])return PED_LOOKS[k];
  const top=[0xb8452f,0x3d6b78,0xd8b23a,0x5a7a4a,0x7a5a8a,0xe9e2d2,0x2f4a6b][k%7],legs=[0x3b4658,0x6b5a45,0x2a2f33,0x8a8f96][k%4],
    skin=[0xc49a7a,0x8d5a3c,0xe0b89a,0x6b4a34][(k*3+1)%4],hair=[0x2a1d16,0x151210,0x6b4a2a,0x8a8a86][(k*5+2)%4];
  return PED_LOOKS[k]=figureLook(top,legs,skin,hair,false);
}
// a person's body, legs and arms as three shared shapes; cap adds a peaked cap's brim (the police)
function figureLook(top,legs,skin,hair,cap){
  const shoe=0x2a2320;
  const ball=new THREE.SphereGeometry(1,10,8),cyl=(a,b,l)=>new THREE.CylinderGeometry(a,b,l,8);
  const body=merge([{g:ball,m:mat(0,.955,-.009,0,.168,.05,.089),c:legs},{g:crowdShape.shirt,m:mat(0,0,0),c:top},
    {g:cyl(.048,.059,.108),m:mat(0,1.518,-.004),c:skin},
    {g:crowdHair,m:mat(0,1.655,.003,0,.101,.12,.113),c:hair},...(cap?[{g:new THREE.CylinderGeometry(.118,.118,.05,12),m:mat(0,1.745,0),c:hair},{g:GEO.box,m:mat(0,1.725,.1,0,.2,.02,.1),c:0x0b0f18}]:[])]);
  const leg=merge([{g:crowdShape.thigh,m:mat(0,0,0),c:legs},{g:crowdShape.shin,m:mat(0,-.44,0),c:legs},{g:crowdShape.shoe,m:mat(0,-.44,0),c:shoe}]);
  const arm=merge([{g:cap?crowdShape.jacketArm:crowdShape.sleeve,m:mat(0,0,0),c:top},
    ...(!cap?[{g:crowdShape.upperArm,m:mat(0,0,0),c:skin}]:[]),
    {g:cap?crowdShape.cuff:crowdShape.forearm,m:mat(0,-.278,0),c:cap?top:skin},
    {g:ball,m:mat(0,-.549,.008,0,.026,.068,.033),c:skin}]);
  // the head is its own mesh, with a painted face (faceTex); the eyes' colour follows the clothes, for variety
  return{body,leg,arm,face:faceTex(skin,hair,FACE_IRIS[(top^legs)%FACE_IRIS.length],false)};
}
function pedModel(k,h,look){
  const L=look||pedLook(k),G=new THREE.Group(),legs=[],arms=[];
  const b=new THREE.Mesh(L.body,PED_MAT);b.castShadow=true;G.add(b);
  const fm=new THREE.MeshLambertMaterial({map:L.face.open}),hd=new THREE.Mesh(crowdHead,fm);
  hd.position.set(0,1.655,.005);hd.scale.set(.098,.118,.108);hd.castShadow=true;G.add(hd);
  for(const s of[-1,1]){const l=new THREE.Mesh(L.leg,PED_MAT);l.position.set(s*.092,.92,0);G.add(l);legs.push(l);
    const a=new THREE.Mesh(L.arm,PED_MAT);a.position.set(s*.181,1.407,0);a.rotation.z=s*.105;G.add(a);arms.push(a)}
  G.scale.setScalar(h);G.visible=false;scene.add(G);return{G,legs,arms,face:{m:fm,tex:L.face,t:1+Math.random()*5,shut:false}};
}
function buildPeds(){
  const xs=[560,620,690,760],o=PED_V.line,B=/** @type {any[]} */ ([]);
  const node=(x,z)=>{const n={x,z,adj:[]};PED_NODES.push(n);return n};
  // in: the unit direction from the pavement into the block (away from the road), for stepping aside. Crossings have none
  const link=(a,b,cross,inx=0,inz=0)=>{const e={a,b,cross,len:Math.hypot(b.x-a.x,b.z-a.z),inx,inz};a.adj.push(e);b.adj.push(e);PED_EDGES.push(e)};
  // how far from a junction's middle its zebra crossings are painted (see buildRoadMeshes: 0.8 m clear of the
  // junction, 3 m wide)
  const zebra=(x,z)=>{let b=null,bd=1e9;for(const n of NODES){const d=Math.hypot(n.x-x,n.z-z);if(d<bd){bd=d;b=n}}return(b.r||6)+2.3};
  const chain=(ns,inx,inz)=>{for(let k=1;k<ns.length;k++)link(ns[k-1],ns[k],false,inx,inz)};
  for(let i=0;i<3;i++){B[i]=[];for(let j=0;j<2;j++){
    const xa=xs[i],xb=xs[i+1],x0=xa+o,x1=xb-o,zT=x=>j?avenueZ(x):-120,zB=x=>j?190:avenueZ(x);
    // the four corners, and on each side the two places where a zebra crossing meets this pavement
    const nw=node(x0,zT(x0)+o),ne=node(x1,zT(x1)+o),se=node(x1,zB(x1)-o),sw=node(x0,zB(x0)-o);
    const top=x=>node(x,zT(x)+o),bot=x=>node(x,zB(x)-o);
    const N1=top(xa+zebra(xa,zT(xa))),N2=top(xb-zebra(xb,zT(xb))),S1=bot(xa+zebra(xa,zB(xa))),S2=bot(xb-zebra(xb,zB(xb))),
      W1=node(x0,zT(xa)+zebra(xa,zT(xa))),W2=node(x0,zB(xa)-zebra(xa,zB(xa))),E1=node(x1,zT(xb)+zebra(xb,zT(xb))),E2=node(x1,zB(xb)-zebra(xb,zB(xb)));
    chain([nw,N1,N2,ne],0,1);chain([ne,E1,E2,se],-1,0);chain([se,S2,S1,sw],0,-1);chain([sw,W2,W1,nw],1,0);
    B[i][j]={N1,N2,S1,S2,W1,W2,E1,E2}}}
  // on the zebra crossings: over the side streets between neighbouring blocks, and over the avenue
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){link(B[i][j].E1,B[i+1][j].W1,true);link(B[i][j].E2,B[i+1][j].W2,true)}
  for(let i=0;i<3;i++){link(B[i][0].S1,B[i][1].N1,true);link(B[i][0].S2,B[i][1].N2,true)}
  const walks=PED_EDGES.filter(e=>!e.cross);
  for(let i=0;i<PED_V.cap;i++){
    const e=walks[Math.floor(rnd(i,31)*walks.length)],fwd=rnd(i,32)<.5;
    PEDS.push({e,from:fwd?e.a:e.b,s:rnd(i,33)*e.len,v:0,st:"walk",t:0,off:(rnd(i,34)-.5)*1.1,o:0,ph:rnd(i,35)*TAU,h:0,x:0,z:0,y:0,
      seed:1+Math.floor(rnd(i,36)*1e6),pace:.85+rnd(i,37)*.35,m:pedModel(i,.94+rnd(i,38)*.12)});
  }
}
// each person's own run of chances: the same every time the game is loaded, so what they do can be tested
const pedRnd=p=>{p.seed=(p.seed*16807+11)%2147483647;return p.seed/2147483647};
// where a person is on their stretch of pavement or crossing, before anything pushes them aside
function pedSpot(p){
  const e=p.e,a=p.from,b=a===e.a?e.b:e.a,k=clamp(p.s/e.len,0,1);
  return[a.x+(b.x-a.x)*k+e.inx*p.o,a.z+(b.z-a.z)*k+e.inz*p.o,Math.atan2(b.x-a.x,b.z-a.z)];
}
// whether it is safe to step out onto a crossing: no car standing on it (moving or not: traffic waiting there, your
// car, one you left), none close by and moving, and none heading for it from further off. "Heading for it" follows
// the car's actual motion, so a car reversing towards the crossing counts and one driving away doesn't. Traffic
// stops for someone crossing, so it only needs its stopping distance; your car doesn't, so it gets about 5 s
function pedClear(e){
  const ax=e.a.x,az=e.a.z,bx=e.b.x-ax,bz=e.b.z-az,L2=bx*bx+bz*bz,mx=ax+bx/2,mz=az+bz/2,half=e.len/2+2.6;
  const risk=(x,z,vx,vz,yields)=>{
    const k=clamp(((x-ax)*bx+(z-az)*bz)/L2,0,1);
    if(Math.hypot(ax+bx*k-x,az+bz*k-z)<3.6)return true;   // on the stripes: half a car's length plus half the zebra
    const v=Math.hypot(vx,vz);if(v<.5)return false;
    const dx=mx-x,dz=mz-z;if(Math.hypot(dx,dz)<24)return true;
    const ux=vx/v,uz=vz/v,along=dx*ux+dz*uz,side=Math.abs(dx*-uz+dz*ux);
    return along>0&&side<half&&along<(yields?v*v/14+12:Math.min(120,v*5+10));
  };
  for(const t of TRAFFIC)if(t.e&&risk(t.wx,t.wz,Math.sin(t.yaw)*t.v,Math.cos(t.yaw)*t.v,true))return false;
  // your car, wherever you are: driving it, or standing where you left it
  if(risk(P.x,P.z,FOOT.on||BOAT.on?0:P.vx,FOOT.on||BOAT.on?0:P.vz,false))return false;
  for(const l of LEFT)if(risk(l.x,l.z,0,0,false))return false;
  return true;
}
// the next stretch from the corner a person has reached: mostly on round the block, sometimes across the street
function pedNext(p,node){
  const walk=node.adj.filter(e=>!e.cross&&e!==p.e),cross=node.adj.filter(e=>e.cross&&e!==p.e);
  let e;
  if(p.e.cross)e=walk[Math.floor(pedRnd(p)*walk.length)];              // just crossed: carry on along a pavement
  else if(cross.length&&pedRnd(p)<.3)e=cross[Math.floor(pedRnd(p)*cross.length)];
  else e=walk[0];
  p.e=e;p.from=node;p.s=0;
  if(e.cross){p.st="wait";p.t=0}
  else if(pedRnd(p)<.15){p.st="idle";p.t=2+pedRnd(p)*5}
  else p.st="walk";
}
function pedUpdate(dt){
  if(!PEDS.length)return;
  const me=BOAT.on?BOAT:FOOT.on?FOOT:P,on=Math.hypot(me.x-660,me.z-36)<PED_V.near;
  if(on!==pedOn){pedOn=on;if(!on)for(const p of PEDS)p.m.G.visible=false}
  if(!on)return;
  const driving=!FOOT.on&&!BOAT.on,psp=Math.hypot(P.vx,P.vz);
  for(const p of PEDS){
    if(p.m.G.visible)faceBlink(p.m.face,dt);
    const e=p.e;let want=0,hurry=false;
    // a car coming at them (yours, or traffic): step in towards the buildings, or hurry off the crossing
    let danger=driving&&psp>2.5&&Math.hypot(P.x-p.x,P.z-p.z)<4+psp*.9&&((p.x-P.x)*P.vx+(p.z-P.z)*P.vz)/psp>0&&Math.abs((p.x-P.x)*-P.vz+(p.z-P.z)*P.vx)/psp<2.2;
    if(p.st==="down")danger=false;
    if(p.st==="walk"||p.st==="cross"){
      want=PED_V.walk*p.pace;
      // you, on foot, standing in the way just ahead: wait for you (other walkers pass through each other for now)
      const fx=Math.sin(p.h),fz=Math.cos(p.h);
      const ahead=(X,Z)=>{const dx=X-p.x,dz=Z-p.z,a=dx*fx+dz*fz;return a>0&&a<1.1&&Math.abs(dx*-fz+dz*fx)<.55};
      if(FOOT.on&&ahead(FOOT.x,FOOT.z))want=0;
      if(p.st==="cross"&&(danger||p.t>0)){hurry=true;want=PED_V.hurry}
    }
    if(p.st==="wait"){p.t+=dt;
      if(pedClear(e)){p.st="cross";p.t=0}
      else if(p.t>10){   // tired of waiting: back along the pavement instead
        const walk=p.from.adj.filter(a=>!a.cross);p.e=walk[Math.floor(pedRnd(p)*walk.length)];p.s=0;p.st="walk"}
    }else if(p.st==="idle"){p.t-=dt;if(p.t<=0)p.st="walk"}
    else if(p.st==="down"){p.t-=dt;if(p.t<=0){p.st="idle";p.t=1.5}}
    else if(p.st==="cross"&&danger)p.t=1;   // keeps hurrying to the far side once startled
    // on the pavement, step aside from a car and drift back afterwards
    p.o+=clamp((!e.cross&&danger?2.1:p.off)-p.o,-1.2*dt,(danger?4:1.2)*dt);
    p.v+=clamp(want-p.v,-8*dt,(hurry?9:3)*dt);
    p.s+=p.v*dt;
    if(p.s>=e.len)pedNext(p,p.from===e.a?e.b:e.a);
    const[sx,sz,sh]=pedSpot(p);
    // your car running into someone: they stagger and stand a while, and it is a crime if the police see it
    if(driving&&psp>3&&copClock-(p.hitAt||-9)>3){const dx=sx-P.x,dz=sz-P.z,cs=Math.cos(P.h),sn=Math.sin(P.h);
      if(Math.abs(dx*cs-dz*sn)<1.25&&Math.abs(dx*sn+dz*cs)<2.6){p.hitAt=copClock;p.st="idle";p.t=4;p.v=0;crime("ped",sx,sz)}}
    // never inside a wall, a post or a car: whatever is there pushes them out, as it does you
    const c=footClear(sx,sz);p.x=c[0];p.z=c[1];
    p.h+=wrapA(sh-p.h)*Math.min(1,dt*8);p.y=footGround(p.x,p.z);
    const G=p.m.G,vis=Math.hypot(p.x-me.x,p.z-me.z)<PED_V.see;G.visible=vis;
    if(vis){p.ph+=p.v*dt*3.3;if(p.v<.05)p.ph+=(Math.round(p.ph/Math.PI)*Math.PI-p.ph)*Math.min(1,dt*10);
      const sw=Math.sin(p.ph)*Math.min(.8,p.v*.42);
      // lying down after being shot, and getting up again
      p.fall=clamp((p.fall||0)+(p.st==="down"&&save.violence?dt*4:-dt*1.6),0,1);
      G.position.set(p.x,p.y+Math.abs(Math.cos(p.ph))*Math.min(.04,p.v*.012)+p.fall*.12,p.z);G.rotation.set(-Math.PI/2*p.fall,p.h,0,"YXZ");
      p.m.legs[0].rotation.x=sw;p.m.legs[1].rotation.x=-sw;p.m.arms[0].rotation.x=-sw*.7;p.m.arms[1].rotation.x=sw*.7}
  }
}
/* ================================================================ HARBOUR + BOAT */
// A pier on the east coast, out from the town, and a motorboat moored beside it. Walk onto the pier and board; the
// driving controls sail (gas, brake for reverse, steering). Back beside the pier, step off. The game stays in the
// DRIVE state, as on foot: while BOAT.on, driveUpdate runs boatUpdate.
const PIER={x0:1176,x1:1252,z0:-4,z1:4,y:1.95};   // the deck stands a step above the beach at the lane's end (1.8 m there)
const onPier=(x,z)=>x>=PIER.x0&&x<=PIER.x1&&z>=PIER.z0&&z<=PIER.z1;
const BOAT={on:false,x:1236,z:-5.6,y:0,h:Math.PI/2,v:0,steer:0,m:null,wake:null,cy:0,cp:new THREE.Vector3(),cl:new THREE.Vector3(),car:[0,0],home:[1236,-5.6,Math.PI/2],hudT:0};
// top speed 17 m/s (33 knots); it needs 1.3 m of water under it; 2.7 km from the island's middle the open sea turns it back
const BOAT_V={top:17,rev:4,acc:5.5,turn:.85,r:1.25,half:2.6,depth:-1.3,land:4.4,edge:2700};
function buildHarbour(){
  const wood=new THREE.MeshStandardMaterial({color:0x8a6a48,roughness:.9}),dark=new THREE.MeshStandardMaterial({color:0x4a3a2a,roughness:.95}),
    metal=new THREE.MeshStandardMaterial({color:0x2b3138,roughness:.6,metalness:.3});
  const L=PIER.x1-PIER.x0,Wd=PIER.z1-PIER.z0,cx=(PIER.x0+PIER.x1)/2,G=new THREE.Group();
  const add=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;G.add(o);return o};
  add(new THREE.BoxGeometry(L,.22,Wd),wood,cx,PIER.y-.11,0);
  // a low kerb along both sides and across the far end, and posts down into the sea bed
  for(const z of[PIER.z0+.1,PIER.z1-.1])add(new THREE.BoxGeometry(L,.2,.2),dark,cx,PIER.y+.1,z);
  add(new THREE.BoxGeometry(.2,.2,Wd),dark,PIER.x1-.1,PIER.y+.1,0);
  for(let x=PIER.x0+4;x<PIER.x1;x+=9)for(const z of[PIER.z0+.4,PIER.z1-.4])add(new THREE.CylinderGeometry(.22,.22,9,8),dark,x,PIER.y-4.6,z);
  // bollards across the landward end: people walk between them, cars don't fit
  for(const z of[-3,-1.5,0,1.5,3]){add(new THREE.CylinderGeometry(.14,.16,.9,10),metal,PIER.x0+1,PIER.y+.45,z);addCircle(PIER.x0+1,z,.14)}
  // a mast with a marker at the far end, to find the pier from the road
  add(new THREE.CylinderGeometry(.09,.12,7,8),metal,PIER.x1-1,PIER.y+3.5,0);add(new THREE.BoxGeometry(.9,.9,.9),new THREE.MeshBasicMaterial({color:0xe2483d}),PIER.x1-1,PIER.y+7.3,0);
  scene.add(G);
  // the kerbs are solid: nothing drives onto the deck from the side, and you step off only at the landward end
  addBox(cx,PIER.z0+.1,L/2,.12,0);addBox(cx,PIER.z1-.1,L/2,.12,0);addBox(PIER.x1-.1,0,.12,Wd/2,0);
  // the boat: a 6.4 m open motorboat, bow towards +z
  const B=new THREE.Group(),hull=new THREE.MeshStandardMaterial({color:0xf2f2ee,roughness:.5}),navy=new THREE.MeshStandardMaterial({color:0x1d3a5c,roughness:.6}),
    glass=new THREE.MeshStandardMaterial({color:0x9fc4d8,roughness:.2,transparent:true,opacity:.55});
  const bp=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;B.add(o);return o};
  bp(hullGeo(6.4,2.3,1.0),hull,0,-.45,0);bp(hullGeo(6.1,2.05,.06),wood,0,.5,0);
  bp(new THREE.BoxGeometry(2.34,.16,5.2),navy,0,.42,-.5);
  bp(new THREE.BoxGeometry(1.3,.75,.7),hull,0,.9,.5);bp(new THREE.BoxGeometry(1.4,.5,.06),glass,0,1.5,.85).rotation.x=-.35;
  bp(new THREE.BoxGeometry(1.5,.45,.6),navy,0,.75,-.9);bp(new THREE.BoxGeometry(.5,.9,.6),metal,0,.55,-3.25);
  const wk=new THREE.BufferGeometry();wk.setAttribute("position",new THREE.Float32BufferAttribute([0,0,-2.6, 3.4,0,-24, -3.4,0,-24],3));wk.computeVertexNormals();
  wk.setAttribute("uv",new THREE.Float32BufferAttribute([.5,1, 1,0, 0,0],2));
  // strongest at the stern, gone by the far end (a flat wedge read as a beam of light on a phone)
  const fade=document.createElement("canvas");fade.width=4;fade.height=64;{const x=fade.getContext("2d"),g=x.createLinearGradient(0,0,0,64);g.addColorStop(0,"#fff");g.addColorStop(.55,"#555");g.addColorStop(1,"#000");x.fillStyle=g;x.fillRect(0,0,4,64)}
  BOAT.wake=new THREE.Mesh(wk,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,alphaMap:new THREE.CanvasTexture(fade)}));// just above the water and drawn after it, or the sea's surface hides it
  BOAT.wake.renderOrder=10;BOAT.wake.position.y=.1;B.add(BOAT.wake);
  scene.add(B);BOAT.m=B;boatPlace(0);
}
function boatPlace(dt){
  const m=BOAT.m,sp=Math.abs(BOAT.v);
  BOAT.y=.12+Math.sin(seaT*.9)*.07+Math.min(.18,sp*.012);
  m.position.set(BOAT.x,BOAT.y,BOAT.z);const pitch=Math.min(.1,sp*.007),roll=BOAT.steer*Math.min(.16,sp*.012);m.rotation.set(-pitch,BOAT.h,-roll,"YXZ");
  // the wake lies flat on the water whatever the hull does: tilted with the bow up, its far end was 2 m under the sea
  BOAT.wake.rotation.set(pitch,0,roll,"ZXY");
  BOAT.wake.material.opacity=Math.min(.22,sp*.016);BOAT.wake.visible=sp>.6&&BOAT.v>0;
}
// whether the boat can float with its middle at (x,z) facing h: deep enough from bow to stern, clear of the pier and
// of other boats, and not out past the edge of the map
function boatFree(x,z,h){
  if(Math.hypot(x,z)>BOAT_V.edge)return false;
  const fx=Math.sin(h),fz=Math.cos(h),r=BOAT_V.r;
  for(const k of[-BOAT_V.half+r,0,BOAT_V.half-r]){const px=x+fx*k,pz=z+fz*k;
    if(meshH(px,pz)>BOAT_V.depth)return false;
    if(px>PIER.x0-r&&px<PIER.x1+r&&pz>PIER.z0-r&&pz<PIER.z1+r)return false}
  for(const b of BOATS)if(Math.hypot(b.x-x,b.z-z)<9)return false;
  return true;
}
// the spot on the pier's deck you'd step onto from where the boat is, or null if it's too far or still moving
function boatLandSpot(){
  if(Math.abs(BOAT.v)>1.5)return null;
  const x=clamp(BOAT.x,PIER.x0+2.2,PIER.x1-1),z=BOAT.z<0?PIER.z0+.75:PIER.z1-.75;
  return Math.hypot(BOAT.x-x,BOAT.z-z)<=BOAT_V.land?[x,z]:null;
}
function boatHud(){footHud(true);keysShown="";$("keys").innerHTML="<kbd>W</kbd><kbd>S</kbd> power / reverse &nbsp; <kbd>A</kbd><kbd>D</kbd> steer &nbsp; <kbd>E</kbd> land";$("bG").textContent="POWER";$("bB").textContent="REVERSE";$("bH").innerHTML=""}
function boatBoard(){
  if(!FOOT.on||BOAT.on||!BOAT.m)return false;
  FOOT.on=false;FOOT.m.G.visible=false;BOAT.on=true;BOAT.v=0;BOAT.steer=0;BOAT.car=[P.x,P.z];BOAT.cy=BOAT.h;
  promptAct=null;show("prompt",false);boatHud();boatCam(0,true);
  toast("ABOARD",isTouch?"POWER to sail, REVERSE to back up. Come back beside the pier to step off.":"W sails, S reverses, A and D steer. Come back beside the pier to step off.");
  return true;
}
// stepping off: the boat stays where you leave it, and you stand on the deck
function boatLand(){
  const sp=BOAT.on?boatLandSpot():null;if(!sp)return false;
  BOAT.on=false;BOAT.v=0;BOAT.steer=0;boatPlace(0);
  const m=footModel();FOOT.on=true;FOOT.x=sp[0];FOOT.z=sp[1];FOOT.y=PIER.y;FOOT.h=BOAT.z<0?0:Math.PI;FOOT.v=0;FOOT.ph=0;FOOT.cy=FOOT.h;FOOT.car=[P.x,P.z];
  m.G.visible=true;footPlace(0);footHud(true);footCam(0,true);footPrompt();
  return true;
}
// back in the driving seat without stepping off (the car was moved from under you, or you went home): the boat goes
// back to its mooring
function boatEnd(){
  if(!BOAT.on)return;BOAT.on=false;BOAT.v=0;BOAT.steer=0;[BOAT.x,BOAT.z,BOAT.h]=BOAT.home;boatPlace(0);
  promptAct=null;show("prompt",false);footHud(false);autoHold=true;if(pc)snapCam();
}
function boatCam(dt,snap){
  BOAT.cy+=wrapA(BOAT.h-BOAT.cy)*(snap?1:1-Math.exp(-dt*3.5));
  const fx=Math.sin(BOAT.cy),fz=Math.cos(BOAT.cy),sp=Math.abs(BOAT.v),back=9.5+sp*.14,k=snap?1:1-Math.exp(-dt*8);
  BOAT.cp.lerp(new V3(BOAT.x-fx*back,4.6+sp*.06,BOAT.z-fz*back),k);BOAT.cl.lerp(new V3(BOAT.x+fx*9,1.2,BOAT.z+fz*9),k);
  camera.position.copy(BOAT.cp);camera.lookAt(BOAT.cl);camera.fov+=(60+Math.min(10,sp*.5)-camera.fov)*(snap?1:1-Math.exp(-dt*5));camera.updateProjectionMatrix();
}
function boatUpdate(dt){
  if(Math.hypot(P.x-BOAT.car[0],P.z-BOAT.car[1])>.5){boatEnd();return}
  updateTraffic(dt);jobTick(dt);
  if(state!=="DRIVE")return;
  const go=gasIn(),bk=brakeIn(),want=go>0?BOAT_V.top*go:bk>0?-BOAT_V.rev*bk:0;
  // power builds the speed up; with the throttle shut the water slows it
  BOAT.v+=clamp(want-BOAT.v,-(want===0?2.2:6)*dt,BOAT_V.acc*dt);
  BOAT.steer+=clamp(steerIn()-BOAT.steer,-3*dt,3*dt);
  // it only turns while moving, and the wrong way round in reverse, like a boat
  const nh=wrapA(BOAT.h-BOAT.steer*BOAT_V.turn*clamp(BOAT.v/5,-1,1)*dt);
  const nx=BOAT.x+Math.sin(nh)*BOAT.v*dt,nz=BOAT.z+Math.cos(nh)*BOAT.v*dt;
  if(boatFree(nx,nz,nh)){BOAT.x=nx;BOAT.z=nz;BOAT.h=nh}
  else if(boatFree(BOAT.x,BOAT.z,nh)){BOAT.h=nh;if(Math.abs(BOAT.v)>3)toastOnce("boat",Math.hypot(nx,nz)>BOAT_V.edge?["OPEN SEA","Nothing out there: turn back towards the island"]:["TOO SHALLOW","The boat needs deeper water"]);BOAT.v*=-.2}
  else BOAT.v*=-.2;
  boatPlace(dt);
  const sp=boatLandSpot();promptAct=sp?boatLand:null;show("prompt",!!sp);if(sp)$("promptTxt").textContent="Step onto the pier";
  BOAT.hudT-=dt;if(BOAT.hudT<=0){BOAT.hudT=.25;$("zone").textContent="AT SEA · "+Math.round(Math.abs(BOAT.v)*1.944)+" KN";hudClock()}
  // the outboard: it idles at the mooring, rises with speed and throttle, and the hull washes through the water
  {const sp=Math.abs(BOAT.v);audioUpd(.1+sp/BOAT_V.top*.5,1,Math.max(go,bk*.5),0,0,0,0,.8,sp)}
  boatCam(dt);drawMini();
}
