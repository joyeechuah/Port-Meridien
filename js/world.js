// Port Meridien: The island: terrain, the road network, scenery, the house, the dealership, plants, the sea and the roadside.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;
/* ================================================================ TERRAIN
   Island shaped by a wobbly coast radius, hills from a few sine layers plus
   two peaks (Sa Talaia in the west, a smaller one in the south), flattened pads
   under the house and the old town. */
const HOUSE={x:430,z:-430};
const DEALER={x:722,z:84};
const TOWN={x:660,z:36};
function coastR(x,z){const a=Math.atan2(z,x);return 1050*(1+.12*Math.sin(3*a+.5)+.07*Math.sin(5*a+1.3)+.05*Math.sin(9*a))}
function hLand(x,z){
  return 20+12*Math.sin(x*.0042+1)*Math.cos(z*.0037+.4)+6*Math.sin(x*.0091+z*.0063)+3*Math.sin(z*.013+2)*Math.cos(x*.007)
    +58*Math.exp(-((x+260)**2+(z+160)**2)/150000)+26*Math.exp(-((x-120)**2+(z-430)**2)/90000);
}
function Hbase(x,z){
  const d=coastR(x,z)-Math.hypot(x,z);
  if(d<0)return lerp(1.4,-11,smooth(0,110,-d));
  return lerp(1.4,Math.max(2.2,hLand(x,z)),smooth(10,320,d));
}
const PADS=[{x:HOUSE.x+15,z:HOUSE.z,r0:40,r1:82},{x:TOWN.x+20,z:TOWN.z+30,r0:220,r1:320}];
PADS.forEach(p=>p.h=Hbase(p.x,p.z));
function Hf(x,z){
  let h=Hbase(x,z);
  for(const p of PADS){const dx=x-p.x,dz=z-p.z;if(dx*dx+dz*dz>p.r1*p.r1)continue;const m=1-smooth(p.r0,p.r1,Math.hypot(dx,dz));h=lerp(h,p.h,m)}
  return h;
}
function vegN(x,z){return Math.sin(x*.021)*Math.sin(z*.017)+.6*Math.sin((x-z)*.011)+.3*Math.sin(x*.05+z*.043)}
// smooth value noise for natural variation (0..1)
function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);
  const a=hash2(xi,zi),b=hash2(xi+1,zi),c=hash2(xi,zi+1),d=hash2(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,z){return(vnoise(x,z)*.5+vnoise(x*2.03+5.2,z*2.03+1.3)*.25+vnoise(x*4.1+9.1,z*4.1+3.7)*.125+vnoise(x*8.3+2.8,z*8.3+7.4)*.0625)/.9375}
// Ibiza ground: pale beaches, red earth fields, golden dry grass, green
// garrigue scrub, dark pine-forest floor and bare limestone on steep slopes
const TCOL={sand:[.88,.81,.64],wet:[.70,.62,.48],red:[.60,.33,.21],grass:[.63,.55,.33],scrub:[.44,.46,.27],forest:[.29,.33,.19],needle:[.38,.31,.21],rock:[.62,.58,.51],cliff:[.70,.64,.53]};
function mixC(o,a,t){o[0]+=(a[0]-o[0])*t;o[1]+=(a[1]-o[1])*t;o[2]+=(a[2]-o[2])*t}
function terrainColor(x,z,h,slope,c){
  if(h<-.15){const t=smooth(-.15,-9,h);c.setRGB(lerp(.78,.10,t),lerp(.74,.28,t),lerp(.58,.36,t)).convertSRGBToLinear();return}
  const o=TCOL.sand.slice();
  if(h<1.1)mixC(o,TCOL.wet,smooth(1.1,.2,h));
  if(h>=2.4){
    const n=vegN(x,z),f=fbm(x*.011,z*.011),f2=fbm(x*.045+3,z*.045+7);
    const land=[0,0,0];
    // open country: patches of red earth (fields) and dry grass
    const g=TCOL.grass.slice();mixC(g,TCOL.red,smooth(.52,.68,f)*.9);
    land[0]=g[0];land[1]=g[1];land[2]=g[2];
    mixC(land,TCOL.scrub,smooth(-.15,.35,n)*.85);
    mixC(land,TCOL.forest,smooth(.4,.7,n));
    mixC(land,TCOL.needle,smooth(.55,.8,n)*smooth(.45,.7,f2)*.6);
    const t=smooth(2.4,4.2,h);mixC(o,land,t);
  }
  // steep ground shows the limestone underneath, paler near the sea
  if(slope>.28){const rk=h<14?TCOL.cliff:TCOL.rock;mixC(o,rk,smooth(.28,.62,slope))}
  const v=.86+.28*fbm(x*.09+1,z*.09+4);
  c.setRGB(o[0]*v,o[1]*v,o[2]*v).convertSRGBToLinear();
}
// fine ground detail (pebbles, grass blades, soil), tiled at two scales in the shader
function groundDetailTex(){
  const N=512,c=document.createElement("canvas");c.width=c.height=N;const x=c.getContext("2d");
  x.fillStyle="#d8d8d8";x.fillRect(0,0,N,N);
  const dot=(px,py,r,col)=>{for(const ox of [-N,0,N])for(const oy of [-N,0,N]){x.fillStyle=col;x.beginPath();x.arc(px+ox,py+oy,r,0,TAU);x.fill()}};
  for(let i=0;i<900;i++){const v=150+Math.random()*90|0;dot(Math.random()*N,Math.random()*N,6+Math.random()*26,`rgba(${v},${v},${v},.22)`)}
  for(let i=0;i<9000;i++){const v=Math.random()<.5?110+Math.random()*60|0:225+Math.random()*30|0;dot(Math.random()*N,Math.random()*N,.6+Math.random()*1.6,`rgba(${v},${v},${v-6},.55)`)}
  x.lineWidth=1.1;
  for(let i=0;i<5000;i++){const px=Math.random()*N,py=Math.random()*N,a=-Math.PI/2+(Math.random()-.5)*1.2,l=3+Math.random()*7,v=120+Math.random()*120|0;
    x.strokeStyle=`rgba(${v},${v},${v-10},.5)`;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.LinearEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}
// the terrain as it is actually drawn: the same triangles as the mesh, so the car,
// plants, walls and verges sit exactly on the ground you see
const TERR={SZ:0,SEG:0,h:null};
function meshH(x,z){
  if(!TERR.h)return groundH(x,z);
  const st=TERR.SZ/TERR.SEG,fx=(x+TERR.SZ/2)/st,fz=(z+TERR.SZ/2)/st,ix=Math.floor(fx),iz=Math.floor(fz);
  if(ix<0||iz<0||ix>=TERR.SEG||iz>=TERR.SEG)return groundH(x,z);
  const u=fx-ix,v=fz-iz,W=TERR.SEG+1,H=TERR.h,h00=H[iz*W+ix],h10=H[iz*W+ix+1],h01=H[(iz+1)*W+ix],h11=H[(iz+1)*W+ix+1];
  return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
}
function buildTerrain(){
  const SZ=2800,SEG=isTouch?190:256;
  const g=new THREE.PlaneGeometry(SZ,SZ,SEG,SEG);g.rotateX(-Math.PI/2);
  const p=g.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color();
  TERR.SZ=SZ;TERR.SEG=SEG;TERR.h=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=groundH(x,z);p.setY(i,h);TERR.h[i]=h}
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),h=p.getY(i);
    const sl=Math.hypot(groundH(x+3,z)-groundH(x-3,z),groundH(x,z+3)-groundH(x,z-3))/6;
    terrainColor(x,z,h,sl,c);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
  }
  g.setAttribute("color",new THREE.BufferAttribute(col,3));g.computeVertexNormals();
  const tm=new THREE.MeshLambertMaterial({vertexColors:true,map:groundDetailTex()});
  // two scales of the detail texture so it does not visibly repeat; the vertex colours carry the ground type
  tm.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace("#include <map_fragment>",
    "vec3 dA=texture2D(map,vUv*"+(SZ/9).toFixed(1)+").rgb,dB=texture2D(map,vUv*"+(SZ/53).toFixed(1)+"+.37).rgb;diffuseColor.rgb*=dA*dB*1.55;")};
  const m=new THREE.Mesh(g,tm);
  m.receiveShadow=true;scene.add(m);
  buildSea();
}

/* ================================================================ MERGE HELPERS */
function merge(items){
  const P=[],N=[],C=[],U=[],I=[];let off=0;const col=new THREE.Color();
  for(const it of items){
    const g=it.g.clone();g.applyMatrix4(it.m);
    const p=g.attributes.position.array,n=g.attributes.normal.array,cnt=g.attributes.position.count,uv=g.attributes.uv;
    for(let i=0;i<p.length;i++)P.push(p[i]);
    for(let i=0;i<n.length;i++)N.push(n[i]);
    if(uv)for(let i=0;i<cnt*2;i++)U.push(uv.array[i]);else for(let i=0;i<cnt*2;i++)U.push(0);
    col.setHex(it.c);for(let i=0;i<cnt;i++)C.push(col.r,col.g,col.b);
    // a mirrored part (negative scale) would turn its faces inside out: reverse each triangle's corners
    const flip=it.m.determinant()<0;
    if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3)flip?I.push(a[i]+off,a[i+2]+off,a[i+1]+off):I.push(a[i]+off,a[i+1]+off,a[i+2]+off)}
    else for(let i=0;i<cnt;i+=3)flip?I.push(i+off,i+2+off,i+1+off):I.push(i+off,i+1+off,i+2+off);
    off+=cnt;g.dispose();
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(P,3));
  geo.setAttribute("normal",new THREE.Float32BufferAttribute(N,3));
  geo.setAttribute("color",new THREE.Float32BufferAttribute(C,3));
  geo.setAttribute("uv",new THREE.Float32BufferAttribute(U,2));
  geo.setIndex(I);return geo;
}
function mat(x,y,z,ry=0,sx=1,sy=1,sz=1,rx=0,rz=0){
  return new THREE.Matrix4().compose(new V3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,"YXZ")),new V3(sx,sy,sz));
}
/* ================================================================ ROAD NETWORK
   1. Roads are drawn as curves and sampled every 4 m.
   2. Junction points are found where roads cross, and where a road end meets
      another road (T-junction). Ends that overshoot a crossing are trimmed.
   3. Every road passing a junction point gets a vertex there, then roads are
      cut at those vertices into edges between shared nodes.
   4. Each road gets a smoothed height profile (no sideways tilt, no bumps),
      and node heights are shared so junctions are level.
   5. The terrain is cut and filled to sit just under the roads. */
const RT={
  coast:{half:5.6,lanes:[2.5],spd:17,prio:3},
  highway:{half:9.2,lanes:[2,6.3],spd:25,prio:4},
  country:{half:4.8,lanes:[2.2],spd:14,prio:2},
  town:{half:5.2,lanes:[2.4],spd:10.5,prio:1},
  drive:{half:3.4,lanes:[1.4],spd:6,prio:0}
};
// lane offsets in RT are for driving on the right; SIDE() turns them to the side the player chose (-1 = left)
const SIDE=()=>save.side==="R"?1:-1;
const YO=.16,WALK_W=2.8;            // road surface above its bed; town pavement width beyond the kerb
const ROADS=[],NODES=[],EDGES=[];
const ringPt=a=>{const R=coastR(Math.cos(a),Math.sin(a))*.8;return[Math.cos(a)*R,Math.sin(a)*R]};
function addRoad(type,ctrl,closed){
  let pts;
  if(ctrl.length===2){
    const[a,b]=ctrl,L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(L/4));pts=[];
    for(let k=0;k<=n;k++)pts.push({x:lerp(a[0],b[0],k/n),z:lerp(a[1],b[1],k/n)});
  }else{
    const curve=new THREE.CatmullRomCurve3(ctrl.map(p=>new V3(p[0],0,p[1])),!!closed,"centripetal");
    const n=Math.max(2,Math.ceil(curve.getLength()/4));
    pts=curve.getSpacedPoints(n).map(v=>({x:v.x,z:v.z}));
    if(closed)pts.pop();
  }
  ROADS.push({type,pts,closed:!!closed});
}
function defineRoads(){
  const ring=[];for(let k=0;k<30;k++){const a=k/30*TAU,R=coastR(Math.cos(a),Math.sin(a))*.8+Math.sin(k*1.7)*10;ring.push([Math.cos(a)*R,Math.sin(a)*R])}
  addRoad("coast",ring,true);
  addRoad("highway",[[-700,0],[-520,90],[-300,110],[-120,30],[60,-20],[260,-10],[430,30],[560,40]]);
  addRoad("town",[[560,40],[640,38],[720,36],[800,32],[880,20],[940,5]]);
  addRoad("country",[[-20,-850],[-90,-700],[-60,-560],[-170,-470],[-120,-360],[-250,-300],[-200,-200],[-300,-120],[-260,40],[-300,100]]);
  addRoad("country",[[60,-10],[40,120],[110,260],[60,400],[150,520],[90,650],[20,800]]);
  addRoad("country",[[260,-5],[240,-140],[310,-250],[290,-350],[310,-440],[360,-560],[340,-660],[384,-770]]);
  addRoad("country",[[-520,95],[-560,250],[-500,420],[-600,560],[-690,690]]);
  addRoad("town",[[560,-120],[760,-120]]);
  addRoad("town",[[560,190],[760,190]]);
  for(const x of [560,620,690,760])addRoad("town",[[x,-120],[x,190]]);
  addRoad("drive",[[HOUSE.x-1,HOUSE.z],[372,-436],[312,-440]]);
  // The harbour lane: from where the town's avenue meets the coast road, down to the shore, ending 16 m short of the
  // pier (PIER.x0 is 1176). You park at the end and walk on between the bollards. It is a lane like the one to your
  // house, added last and starting exactly on that junction, so no other road, race, landmark or contract moves:
  // carrying the avenue itself on to the shore shifted the junction, a race route and four landmarks
  addRoad("drive",[[945.904,1.596],[975,2],[1020,0],[1080,0],[1135,0],[1160,0]]);
}
const segCount=R=>R.closed?R.pts.length:R.pts.length-1;
function projOnRoad(R,x,z){
  const n=R.pts.length;let best=null;
  for(let i=0;i<segCount(R);i++){
    const p=R.pts[i],q=R.pts[(i+1)%n],sx=q.x-p.x,sz=q.z-p.z,L2=sx*sx+sz*sz;
    const t=L2>0?clamp(((x-p.x)*sx+(z-p.z)*sz)/L2,0,1):0,px=p.x+sx*t,pz=p.z+sz*t,d=Math.hypot(x-px,z-pz);
    if(!best||d<best.d)best={i,t,d,x:px,z:pz};
  }
  return best;
}
function arcAt(R,pr){let s=0;for(let i=0;i<pr.i;i++){const p=R.pts[i],q=R.pts[i+1];s+=Math.hypot(q.x-p.x,q.z-p.z)}const p=R.pts[pr.i],q=R.pts[(pr.i+1)%R.pts.length];return s+pr.t*Math.hypot(q.x-p.x,q.z-p.z)}
function roadLen(R){let s=0;for(let i=0;i<R.pts.length-1;i++)s+=Math.hypot(R.pts[i+1].x-R.pts[i].x,R.pts[i+1].z-R.pts[i].z);return s}
function segX(p,q,r,s){
  const d=(q.x-p.x)*(s.z-r.z)-(q.z-p.z)*(s.x-r.x);if(Math.abs(d)<1e-9)return null;
  const t=((r.x-p.x)*(s.z-r.z)-(r.z-p.z)*(s.x-r.x))/d,u=((r.x-p.x)*(q.z-p.z)-(r.z-p.z)*(q.x-p.x))/d;
  return t>=0&&t<=1&&u>=0&&u<=1?{x:p.x+t*(q.x-p.x),z:p.z+t*(q.z-p.z)}:null;
}
const harbourLane=e=>e.type==="drive"&&e.pts[0].x>900&&e.pts[e.pts.length-1].x>900;   // the lane to the pier (the only other lane is the one to your house)
function buildNetwork(){
  defineRoads();
  const J=[];
  const addJ=(x,z)=>{for(const j of J)if(Math.hypot(j.x-x,j.z-z)<8)return j;const j={x,z};J.push(j);return j};
  // 1. crossings between different roads
  for(let a=0;a<ROADS.length;a++)for(let b=a+1;b<ROADS.length;b++){
    const A=ROADS[a],B=ROADS[b],na=A.pts.length,nb=B.pts.length;
    for(let i=0;i<segCount(A);i++){
      const p=A.pts[i],q=A.pts[(i+1)%na],x0=Math.min(p.x,q.x),x1=Math.max(p.x,q.x),z0=Math.min(p.z,q.z),z1=Math.max(p.z,q.z);
      for(let j=0;j<segCount(B);j++){
        const r=B.pts[j],s=B.pts[(j+1)%nb];
        if(Math.max(r.x,s.x)<x0||Math.min(r.x,s.x)>x1||Math.max(r.z,s.z)<z0||Math.min(r.z,s.z)>z1)continue;
        const X=segX(p,q,r,s);if(X)addJ(X.x,X.z);
      }
    }
  }
  // 2. trim open road ends that run less than 45 m past a crossing
  for(const R of ROADS){
    if(R.closed)continue;
    for(const atEnd of [false,true]){
      const len=roadLen(R);let pick=null;
      for(const j of J){const pr=projOnRoad(R,j.x,j.z);if(pr.d>1)continue;const s=arcAt(R,pr),gap=atEnd?len-s:s;if(gap>1&&gap<45&&(!pick||gap>pick.gap))pick={gap,pr,j}}
      if(!pick)continue;
      if(atEnd)R.pts=R.pts.slice(0,pick.pr.i+1).concat([{x:pick.j.x,z:pick.j.z}]);
      else R.pts=[{x:pick.j.x,z:pick.j.z}].concat(R.pts.slice(pick.pr.i+1));
    }
  }
  // 3. T-junctions: extend open ends onto the nearest other road
  for(const R of ROADS){
    if(R.closed)continue;
    for(const atEnd of [false,true]){
      const p=atEnd?R.pts[R.pts.length-1]:R.pts[0];
      if(J.some(j=>Math.hypot(j.x-p.x,j.z-p.z)<1))continue;
      let best=null;
      for(const B of ROADS){if(B===R)continue;const q=projOnRoad(B,p.x,p.z);if(q.d<60&&(!best||q.d<best.d))best=q}
      if(!best)continue;
      const j=addJ(best.x,best.z),d=Math.hypot(j.x-p.x,j.z-p.z);
      if(d<.3)continue;
      const n=Math.ceil(d/4),fill=[];for(let k=1;k<=n;k++)fill.push({x:lerp(p.x,j.x,k/n),z:lerp(p.z,j.z,k/n)});
      if(atEnd)R.pts.push(...fill);else R.pts=fill.reverse().concat(R.pts);
    }
  }
  // 4. put a vertex at every junction point a road passes within 7 m of
  for(const R of ROADS){
    const ins=[];
    for(const j of J){
      const n=R.pts.length;
      if(!R.closed){
        if(Math.hypot(R.pts[0].x-j.x,R.pts[0].z-j.z)<7){R.pts[0]={x:j.x,z:j.z,j};continue}
        if(Math.hypot(R.pts[n-1].x-j.x,R.pts[n-1].z-j.z)<7){R.pts[n-1]={x:j.x,z:j.z,j};continue}
      }
      const q=projOnRoad(R,j.x,j.z);if(q.d<7)ins.push({i:q.i,t:q.t,j});
    }
    ins.sort((a,b)=>b.i-a.i||b.t-a.t);
    for(const o of ins){
      const n=R.pts.length,P={x:o.j.x,z:o.j.z,j:o.j};
      if(o.t<.15&&!R.pts[o.i].j)R.pts[o.i]=P;
      else if(o.t>.85&&!R.pts[(o.i+1)%n].j)R.pts[(o.i+1)%n]=P;
      else R.pts.splice(o.i+1,0,P);
    }
  }
  // 5. smoothed height profile per road (closed roads wrap around)
  for(const R of ROADS){
    const n=R.pts.length;let ys=R.pts.map(p=>Hf(p.x,p.z));
    for(let pass=0;pass<3;pass++){
      const o=new Array(n);
      for(let i=0;i<n;i++){let s=0,c=0;for(let k=-8;k<=8;k++){let m=i+k;if(R.closed)m=(m+n)%n;else if(m<0||m>=n)continue;s+=ys[m];c++}o[i]=s/c}
      ys=o;
    }
    R.ys=ys.map(y=>Math.max(1.8,y));
  }
  // 6. cut into edges
  const nodeOfJ=new Map();
  const nodeFor=p=>{
    if(p.j){let n=nodeOfJ.get(p.j);if(!n){n={id:0,x:p.j.x,z:p.j.z,adj:[]};NODES.push(n);nodeOfJ.set(p.j,n)}return n}
    const n={id:0,x:p.x,z:p.z,adj:[],dead:true};NODES.push(n);return n;
  };
  ROADS.forEach((R,ri)=>{
    const n=R.pts.length;let cuts=[];
    for(let k=0;k<n;k++)if(R.pts[k].j)cuts.push(k);
    if(!R.closed){if(cuts[0]!==0)cuts.unshift(0);if(cuts[cuts.length-1]!==n-1)cuts.push(n-1)}
    if(R.closed&&!cuts.length){R.pts[0].j={x:R.pts[0].x,z:R.pts[0].z};cuts=[0]}
    const pieces=[];
    for(let k=0;k<cuts.length-1;k++)pieces.push([cuts[k],cuts[k+1]]);
    if(R.closed)pieces.push([cuts[cuts.length-1],cuts[0]+n]);
    for(const[a,b] of pieces){
      const pts=[],ys=[];for(let k=a;k<=b;k++){pts.push(R.pts[k%n]);ys.push(R.ys[k%n])}
      makeEdge(pts,ys,R.type,ri,nodeFor(pts[0]),nodeFor(pts[pts.length-1]));
    }
  });
  // 7. drop short dead-end stubs
  for(const e of EDGES.slice()){
    const deadA=e.a.dead&&e.a.adj.length===1,deadB=e.b.dead&&e.b.adj.length===1;
    if((deadA||deadB)&&e.len<30&&e.type!=="drive"){EDGES.splice(EDGES.indexOf(e),1);e.a.adj=e.a.adj.filter(x=>x.e!==e);e.b.adj=e.b.adj.filter(x=>x.e!==e)}
  }
  for(let i=NODES.length-1;i>=0;i--)if(!NODES[i].adj.length)NODES.splice(i,1);
  NODES.forEach((n,i)=>n.id=i);EDGES.forEach((e,i)=>e.id=i);
  // 8. shared, level node heights; blend each edge into them over up to 50 m
  for(const n of NODES){
    // the lane to your house ends level with the house (the harbour lane, the other lane, ends on the shore: it used
    // to be lifted to the house's height too, 22 m up)
    if(n.dead&&n.adj.some(a=>a.e.type==="drive")&&Math.hypot(n.x-HOUSE.x,n.z-HOUSE.z)<60){n.y=PADS[0].h;continue}
    // where the harbour lane joins, the junction keeps the height the other roads give it: the lane comes up to meet
    // them (counted in, it lowered the junction, and the coast road and avenue beside it, by 0.8 m)
    const arms=n.adj.filter(a=>!harbourLane(a.e)),use=arms.length?arms:n.adj;
    let s=0;for(const a of use)s+=a.end==="a"?a.e.ys[0]:a.e.ys[a.e.ys.length-1];n.y=s/use.length;
  }
  // junction radius used to trim markings and place the junction surface
  for(const n of NODES){let h=0;for(const a of n.adj)h=Math.max(h,a.e.half);n.r=n.adj.length>1?h*1.2+.6:0}
  for(const e of EDGES){
    const m=e.ys.length-1,da=e.a.y-e.ys[0],db=e.b.y-e.ys[m],F=Math.min(50,e.len*.5);
    for(let k=0;k<=m;k++){const s=e.cum[k];e.ys[k]+=da*Math.max(0,1-s/F)+db*Math.max(0,1-(e.len-s)/F)}
    // level plateau around each junction so every road meeting there is at the same height
    const Ra=e.a.r?e.a.r*1.15+2:0,Rb=e.b.r?e.b.r*1.15+2:0,BL=15;
    if(e.len<Ra+Rb+BL){for(let k=0;k<=m;k++)e.ys[k]=lerp(e.a.y,e.b.y,e.cum[k]/e.len)}
    else for(let k=0;k<=m;k++){
      const s=e.cum[k];
      if(Ra)e.ys[k]=lerp(e.ys[k],e.a.y,1-smooth(Ra,Ra+BL,s));
      if(Rb)e.ys[k]=lerp(e.ys[k],e.b.y,1-smooth(Rb,Rb+BL,e.len-s));
    }
    // 9. no stretch steeper than MAXG: where a plateau sits well above or below the road's own
    // profile, the road ramps to it over a longer distance instead of dropping off its edge
    // Both ends stay exactly at their junction heights (the junction pad and the car's surface use them):
    // first keep every point inside the slope cone from both ends, then smooth the inside points only.
    // The level area round each junction is locked (the junction pad and the car's surface sit at the
    // junction height there); only the road between the two level areas is reshaped, inside the slope
    // cone from both, so it can't climb straight out of a junction.
    const ys=e.ys,c=e.cum,short=e.len<Ra+Rb+BL,Pa=short?0:Ra,Pb=short?0:Rb,span=e.len-Pa-Pb;
    const g=Math.max(MAXG,Math.abs(e.a.y-e.b.y)/Math.max(span,1)*1.05);
    const fixed=k=>c[k]<=Pa||c[k]>=e.len-Pb;
    for(let k=0;k<=m;k++){
      if(c[k]<=Pa){ys[k]=e.a.y;continue}if(c[k]>=e.len-Pb){ys[k]=e.b.y;continue}
      const s=c[k]-Pa,r=e.len-Pb-c[k];ys[k]=clamp(ys[k],Math.max(e.a.y-g*s,e.b.y-g*r),Math.min(e.a.y+g*s,e.b.y+g*r));
    }
    for(let pass=0;pass<3;pass++){
      for(let k=1;k<=m;k++){if(fixed(k))continue;const d=g*(c[k]-c[k-1]);ys[k]=clamp(ys[k],ys[k-1]-d,ys[k-1]+d)}
      for(let k=m-1;k>=0;k--){if(fixed(k))continue;const d=g*(c[k+1]-c[k]);ys[k]=clamp(ys[k],ys[k+1]-d,ys[k+1]+d)}
    }
  }
}
const MAXG=.13;
function makeEdge(raw,rawY,type,ri,a,b){
  const pts=[raw[0]],ys=[rawY[0]];
  for(let i=1;i<raw.length;i++){const l=pts[pts.length-1];if(Math.hypot(raw[i].x-l.x,raw[i].z-l.z)>.3||i===raw.length-1){pts.push(raw[i]);ys.push(rawY[i])}}
  if(pts.length<2)return;
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));
  const len=cum[cum.length-1];if(len<1)return;
  const e={id:EDGES.length,pts,ys,cum,len,type,half:RT[type].half,a,b,ri};
  EDGES.push(e);a.adj.push({e,end:"a"});b.adj.push({e,end:"b"});
}
// position + direction at arc length s along any {pts,cum,len} polyline
function edgePos(e,s){
  s=clamp(s,0,e.len);const c=e.cum;let lo=0,hi=c.length-1;
  while(hi-lo>1){const m=(lo+hi)>>1;if(c[m]<=s)lo=m;else hi=m}
  const p=e.pts[lo],q=e.pts[hi],L=c[hi]-c[lo]||1,t=(s-c[lo])/L;
  return{x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t,dx:(q.x-p.x)/L,dz:(q.z-p.z)/L,i:lo};
}
function edgeY(e,s){
  s=clamp(s,0,e.len);const c=e.cum;let lo=0,hi=c.length-1;
  while(hi-lo>1){const m=(lo+hi)>>1;if(c[m]<=s)lo=m;else hi=m}
  const L=c[hi]-c[lo]||1;return e.ys[lo]+(e.ys[hi]-e.ys[lo])*(s-c[lo])/L;
}

/* ---------- spatial grid of road segments ---------- */
const RC=40,RGRID=new Map(),rkey=(cx,cz)=>cx*100003+cz;
function buildRoadGrid(){
  for(const e of EDGES)for(let i=0;i<e.pts.length-1;i++){
    const p=e.pts[i],q=e.pts[i+1],ks=new Set();
    for(let cx=Math.floor(Math.min(p.x,q.x)/RC);cx<=Math.floor(Math.max(p.x,q.x)/RC);cx++)for(let cz=Math.floor(Math.min(p.z,q.z)/RC);cz<=Math.floor(Math.max(p.z,q.z)/RC);cz++)ks.add(rkey(cx,cz));
    for(const k of ks){let a=RGRID.get(k);if(!a)RGRID.set(k,a=[]);a.push({e,i})}
  }
}
// nearest road point within maxD; side > 0 means right of the edge direction
function nearestRoad(x,z,maxD){
  const cx=Math.floor(x/RC),cz=Math.floor(z/RC),rad=Math.ceil(maxD/RC);
  let best=null,bd=maxD;
  for(let i=-rad;i<=rad;i++)for(let j=-rad;j<=rad;j++){
    const arr=RGRID.get(rkey(cx+i,cz+j));if(!arr)continue;
    for(const it of arr){
      const e=it.e,p=e.pts[it.i],q=e.pts[it.i+1],sx=q.x-p.x,sz=q.z-p.z,L2=sx*sx+sz*sz;
      const t=L2>0?clamp(((x-p.x)*sx+(z-p.z)*sz)/L2,0,1):0;
      const px=p.x+sx*t,pz=p.z+sz*t,d=Math.hypot(x-px,z-pz);
      if(d-e.half*.02<bd){bd=d-e.half*.02;const l=Math.sqrt(L2)||1;best={e,i:it.i,d,x:px,z:pz,dx:sx/l,dz:sz/l,s:e.cum[it.i]+t*l,side:0}}
    }
  }
  if(best)best.side=(x-best.x)*(-best.dz)+(z-best.z)*best.dx;
  return best;
}
function nearestRoadGlobal(x,z,skipDrive){
  let best=null,bd=1e9;
  for(const e of EDGES){if(skipDrive&&e.type==="drive")continue;for(let i=0;i<e.pts.length-1;i++){
    const p=e.pts[i],q=e.pts[i+1],sx=q.x-p.x,sz=q.z-p.z,L2=sx*sx+sz*sz;
    const t=L2>0?clamp(((x-p.x)*sx+(z-p.z)*sz)/L2,0,1):0,px=p.x+sx*t,pz=p.z+sz*t,d=Math.hypot(x-px,z-pz);
    if(d<bd){bd=d;const l=Math.sqrt(L2)||1;best={e,i,d,x:px,z:pz,dx:sx/l,dz:sz/l,s:e.cum[i]+t*l,side:0}}
  }}
  if(best)best.side=(x-best.x)*(-best.dz)+(z-best.z)*best.dx;
  return best;
}

/* ---------- ground: natural terrain cut and filled around roads ----------
   A 4 m grid stores, for every point near a road, the road bed height and how
   strongly the ground is pulled to it: fully within 5 m of the road edge,
   fading out by 33 m. */
const GG={cell:4,org:-1400,n:0,w:null,rb:null};
function buildGroundGrid(){
  const c=GG.cell,N=Math.round(2800/c)+1;GG.n=N;
  const ex=new Float32Array(N*N).fill(1e9),rb=new Float32Array(N*N),w=new Float32Array(N*N),lo=new Float32Array(N*N).fill(1e9);
  for(const e of EDGES){
    const reach=e.half+33,near=new Map();   // cell -> [distance, bed height] at this road's closest point
    for(let i=0;i<e.pts.length-1;i++){
      const p=e.pts[i],q=e.pts[i+1],yp=e.ys[i],yq=e.ys[i+1],sx=q.x-p.x,sz=q.z-p.z,L2=sx*sx+sz*sz||1,sl=Math.abs(yq-yp)/Math.sqrt(L2)*3;
      const i0=Math.max(0,Math.floor((Math.min(p.x,q.x)-reach-GG.org)/c)),i1=Math.min(N-1,Math.ceil((Math.max(p.x,q.x)+reach-GG.org)/c));
      const j0=Math.max(0,Math.floor((Math.min(p.z,q.z)-reach-GG.org)/c)),j1=Math.min(N-1,Math.ceil((Math.max(p.z,q.z)+reach-GG.org)/c));
      for(let jj=j0;jj<=j1;jj++)for(let ii=i0;ii<=i1;ii++){
        const x=GG.org+ii*c,z=GG.org+jj*c,t=clamp(((x-p.x)*sx+(z-p.z)*sz)/L2,0,1);
        const d=Math.hypot(x-p.x-sx*t,z-p.z-sz*t)-e.half,k=jj*N+ii;
        const y=yp+(yq-yp)*t-.06;
        if(d<ex[k]){ex[k]=d;rb[k]=y}
        if(d<=6){const o=near.get(k);if(!o||d<o[0])near.set(k,[d,y-sl])}
      }
    }
    // under more than one road: stay below the lowest. Each road counts with its height beside the
    // cell, not the lowest point of it within reach (on a slope that left the road floating), less a
    // little on a slope so the coarser terrain mesh can't poke up through the asphalt
    for(const[k,o] of near)if(o[1]<lo[k])lo[k]=o[1];
  }
  for(let jj=0;jj<N;jj++)for(let ii=0;ii<N;ii++){
    const k=jj*N+ii,d=ex[k];
    if(lo[k]<1e8)rb[k]=lo[k];
    w[k]=d<=5?1:d>=33?0:1-smooth(5,33,d);
    if(w[k]<=0)rb[k]=Hf(GG.org+ii*c,GG.org+jj*c);
  }
  GG.w=w;GG.rb=rb;
}
function groundH(x,z){
  const N=GG.n;if(!N)return Hf(x,z);
  const fx=(x-GG.org)/GG.cell,fz=(z-GG.org)/GG.cell;
  if(fx<0||fz<0||fx>=N-1||fz>=N-1)return Hf(x,z);
  const i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j,k=j*N+i;
  const W=GG.w,R=GG.rb;
  const w=(W[k]*(1-u)+W[k+1]*u)*(1-v)+(W[k+N]*(1-u)+W[k+N+1]*u)*v;
  const h=Hf(x,z);if(w<=0)return h;
  const rb=(R[k]*(1-u)+R[k+1]*u)*(1-v)+(R[k+N]*(1-u)+R[k+N+1]*u)*v;
  return h+(rb-h)*w;
}
// junction whose paved area contains (x,z), if any
function junctionAt(x,z){for(const n of NODES)if(n.r&&Math.abs(n.x-x)<n.r*1.25&&Math.abs(n.z-z)<n.r*1.25&&Math.hypot(n.x-x,n.z-z)<n.r*1.15)return n;return null}
// drivable surface: road top on the asphalt, easing down to the ground just past the edge
function surfH(x,z,nr){
  if(nr===undefined)nr=nearestRoad(x,z,24);
  const jn=junctionAt(x,z);if(jn)return jn.y+YO;
  const g=meshH(x,z);if(!nr)return g;
  const ex=nr.d-nr.e.half,r=edgeY(nr.e,nr.s)+YO;
  if(ex<=0)return r;
  // town pavement: the kerb then the footway, both standing above the road
  if(nr.e.type==="town"&&ex<=WALK_W&&edgeFree(nr.e,nr.s,3))return r+(ex<.25?.13:.14);
  if(ex<1.2)return lerp(r,Math.max(g,r-YO-.06),ex/1.2);return g;
}

/* ---------- routing (Dijkstra over the node graph) ---------- */
function dijkstra(src){
  const n=NODES.length,dist=new Array(n).fill(Infinity),prev=new Array(n).fill(null),done=new Array(n).fill(false);
  dist[src.id]=0;
  for(;;){
    let u=-1,b=Infinity;for(let i=0;i<n;i++)if(!done[i]&&dist[i]<b){b=dist[i];u=i}
    if(u<0)break;done[u]=true;
    for(const a of NODES[u].adj){const v=a.end==="a"?a.e.b:a.e.a,alt=dist[u]+a.e.len;if(alt<dist[v.id]){dist[v.id]=alt;prev[v.id]={e:a.e,from:u}}}
  }
  return{dist,prev};
}
function edgeSlice(e,s0,s1){
  const out=[edgePos(e,s0)];
  if(s1>=s0){for(let i=0;i<e.pts.length;i++)if(e.cum[i]>s0&&e.cum[i]<s1)out.push(e.pts[i])}
  else{for(let i=e.pts.length-1;i>=0;i--)if(e.cum[i]<s0&&e.cum[i]>s1)out.push(e.pts[i])}
  out.push(edgePos(e,s1));
  return out.map(p=>({x:p.x,z:p.z}));
}
function routeBetween(ax,az,bx,bz){
  const A=nearestRoadGlobal(ax,az),B=nearestRoadGlobal(bx,bz);if(!A||!B)return null;
  let best=null;
  if(A.e===B.e)best={tot:Math.abs(A.s-B.s),same:true};
  for(const st of [{n:A.e.a,c:A.s,to:0},{n:A.e.b,c:A.e.len-A.s,to:A.e.len}]){
    const dj=dijkstra(st.n);
    for(const en of [{n:B.e.a,c:B.s,from:0},{n:B.e.b,c:B.e.len-B.s,from:B.e.len}]){
      const tot=st.c+dj.dist[en.n.id]+en.c;
      if(!best||tot<best.tot-.5)best={tot,st,en,dj};
    }
  }
  if(!best||!isFinite(best.tot))return null;
  let pts;
  if(best.same)pts=edgeSlice(A.e,A.s,B.s);
  else{
    pts=edgeSlice(A.e,A.s,best.st.to);
    const chain=[];let v=best.en.n.id;
    while(v!==best.st.n.id){const pr=best.dj.prev[v];if(!pr)break;chain.unshift({e:pr.e,from:pr.from});v=pr.from}
    for(const c of chain){const fwd=c.e.a.id===c.from;const ep=fwd?c.e.pts:c.e.pts.slice().reverse();pts.push(...ep.map(p=>({x:p.x,z:p.z})))}
    pts.push(...edgeSlice(B.e,best.en.from,B.s));
  }
  return makePath(pts);
}
function makePath(raw){
  const pts=[raw[0]];
  for(let i=1;i<raw.length;i++){const l=pts[pts.length-1];if(Math.hypot(raw[i].x-l.x,raw[i].z-l.z)>.5)pts.push(raw[i])}
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));
  return{pts,cum,len:cum[cum.length-1]};
}
function resample(path,step){
  const out=[];for(let s=0;s<=path.len;s+=step){const p=edgePos(path,s);out.push({x:p.x,z:p.z})}
  const l=edgePos(path,path.len);out.push({x:l.x,z:l.z});
  return makePath(out);
}

/* ---------- road meshes ---------- */
function asphaltTex(){
  const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");
  // One tile spans 3.75 m across the carriageway. Feather the two wheel paths
  // into the aggregate and keep the broad colour variation continuous across tile edges.
  const pixels=x.createImageData(256,256),wear=new Float32Array(256);
  for(let u=0;u<256;u++){
    const d=Math.min(Math.abs(u-70),Math.abs(u-186))/18;
    wear[u]=Math.exp(-d*d)*8;
  }
  let seed=7349;
  for(let v=0;v<256;v++){
    const drift=Math.round(2*Math.sin(TAU*v/256));
    for(let u=0;u<256;u++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const grain=(seed/4294967296-.5)*21;
      const stone=72+grain+2.5*Math.sin(TAU*(u+v)/256)+2*Math.cos(TAU*(2*u-v)/256)-wear[(u+drift+256)%256];
      const i=(v*256+u)*4;
      pixels.data[i]=stone;pixels.data[i+1]=stone+1;pixels.data[i+2]=stone+3;pixels.data[i+3]=255;
    }
  }
  x.putImageData(pixels,0,0);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}
const ROAD_PATHS={};
// distance kept clear of a junction at each end of an edge
const trimA=(e,extra)=>e.a.r?e.a.r+extra:0,trimB=(e,extra)=>e.b.r?e.b.r+extra:0;
function edgeFree(e,s,extra){return s>=trimA(e,extra)&&s<=e.len-trimB(e,extra)}
// road pieces are queued by 640 m area and material, then merged: a few hundred
// meshes instead of several thousand separate draw calls
const RQ=new Map();
function rq(g,m,recv){if(!g.attributes.normal)g.computeVertexNormals();g.computeBoundingBox();const b=g.boundingBox,k=Math.floor((b.min.x+b.max.x)/1280)+","+Math.floor((b.min.z+b.max.z)/1280)+"|"+m.uuid;
  let q=RQ.get(k);if(!q)RQ.set(k,q={m,recv,g:[]});q.g.push(g)}
function mergeGeos(list){
  let nv=0,ni=0;for(const g of list){nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count}
  const P=new Float32Array(nv*3),N=new Float32Array(nv*3),U=new Float32Array(nv*2),I=new Uint32Array(ni);let ov=0,oi=0;
  for(const g of list){const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;P.set(p.array,ov*3);if(n)N.set(n.array,ov*3);if(u)U.set(u.array,ov*2);
    if(g.index){const a=g.index.array;for(let i=0;i<a.length;i++)I[oi+i]=a[i]+ov;oi+=a.length}else{for(let i=0;i<p.count;i++)I[oi+i]=ov+i;oi+=p.count}
    ov+=p.count;g.dispose()}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(P,3));g.setAttribute("normal",new THREE.BufferAttribute(N,3));g.setAttribute("uv",new THREE.BufferAttribute(U,2));g.setIndex(new THREE.BufferAttribute(I,1));return g;
}
function flushRQ(){for(const q of RQ.values()){const m=new THREE.Mesh(mergeGeos(q.g),q.m);m.receiveShadow=q.recv;scene.add(m)}RQ.clear()}
function buildRoadMeshes(){
  const tex=asphaltTex();
  const asph={};for(const t in RT)asph[t]=new THREE.MeshLambertMaterial({map:tex,color:0xc4c2be,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2-RT[t].prio*2});
  const padM=new THREE.MeshLambertMaterial({map:tex,color:0xc4c2be,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-16});
  const lineM=new THREE.MeshBasicMaterial({color:0xf2f2ee,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-20});
  const walkM=new THREE.MeshLambertMaterial({color:0xd9d3c5});
  const curbM=new THREE.MeshLambertMaterial({color:0xb9b3a6});
  const zebraM=new THREE.MeshBasicMaterial({color:0xf2f2ee,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-24});
  // gravel verge: packed earth and stones, darker where tyres have worn it
  const gc=document.createElement("canvas");gc.width=gc.height=256;const gx=gc.getContext("2d");
  gx.fillStyle="#8a7d68";gx.fillRect(0,0,256,256);
  for(let i=0;i<9000;i++){const v=Math.random();gx.fillStyle=v<.4?"rgba(70,62,50,.5)":v<.8?"rgba(176,162,138,.55)":"rgba(210,200,182,.6)";gx.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2.4,1+Math.random()*2)}
  const gt=new THREE.CanvasTexture(gc);gt.wrapS=gt.wrapT=THREE.RepeatWrapping;gt.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const shoulderM=new THREE.MeshLambertMaterial({map:gt,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  for(const e of EDGES){
    const n=e.pts.length,R=[];
    for(let i=0;i<n;i++){const a=e.pts[Math.max(0,i-1)],b=e.pts[Math.min(n-1,i+1)],l=Math.hypot(b.x-a.x,b.z-a.z)||1;R.push({x:-(b.z-a.z)/l,z:(b.x-a.x)/l})}
    // flat strip from offset o0 to o1, at height (profile + yo); keep(i) filters segments
    const strip=(o0,o1,yo,uv,keep)=>{
      const P=[],U=[],I=[];let v=0;
      for(let i=0;i<n-1;i++){
        if(keep&&!keep(i))continue;
        for(const k of [i,i+1])for(const o of [o0,o1]){const p=e.pts[k],r=R[k];P.push(p.x+r.x*o,e.ys[k]+yo,p.z+r.z*o);U.push(uv?(o+e.half)/3.75:0,uv?e.cum[k]/6:0)}
        I.push(v,v+1,v+2,v+1,v+3,v+2);v+=4;
      }
      const g=new THREE.BufferGeometry();
      g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(U,2));
      g.setIndex(I);g.computeVertexNormals();return g;
    };
    // triangles of g wound so that their normals point along (fx,0,fz)
    const facing=(g,I,fx,fz)=>{g.setIndex(I);g.computeVertexNormals();const nm=g.attributes.normal;
      if(nm.getX(0)*fx+nm.getZ(0)*fz<0){for(let q=0;q<I.length;q+=3){const t=I[q+1];I[q+1]=I[q+2];I[q+2]=t}g.setIndex(I);g.computeVertexNormals()}return g};
    // vertical ribbon along the road at offset o, from profile+y0 up to profile+y1, facing side f (+1 = +R)
    const wall=(o,y0,y1,keep,f)=>{
      const P=[],I=[];let v=0,first=-1;
      for(let i=0;i<n-1;i++){
        if(keep&&!keep(i))continue;if(first<0)first=i;
        for(const k of [i,i+1]){const p=e.pts[k],r=R[k],x=p.x+r.x*o,z=p.z+r.z*o;P.push(x,e.ys[k]+y0,z,x,e.ys[k]+y1,z)}
        I.push(v,v+2,v+1,v+1,v+2,v+3);v+=4;
      }
      if(!I.length)return null;
      const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));
      return facing(g,I,R[first].x*f,R[first].z*f);
    };
    // end face across a pavement at point k on side s, facing along the road (d=+1 forwards)
    const cap=(k,s,d)=>{
      const p=e.pts[k],r=R[k],P=[],I=[0,1,2,1,3,2];
      for(const o of [e.half,e.half+WALK_W])for(const y of [-.4,YO+.14])P.push(p.x+r.x*o*s,e.ys[k]+y,p.z+r.z*o*s);
      const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));
      return facing(g,I,r.z*d,-r.x*d);
    };
    rq(strip(-e.half,e.half,YO,true),asph[e.type],true);
    const free=extra=>i=>edgeFree(e,e.cum[i],extra)&&edgeFree(e,e.cum[i+1],extra);
    const dash=extra=>i=>Math.floor(e.cum[i]/5)%2===0&&free(extra)(i);
    const lines=[],ly=YO+.02;
    if(e.type==="highway")lines.push(strip(-.3,-.12,ly,false,free(1)),strip(.12,.3,ly,false,free(1)),strip(-3.95,-3.75,ly,false,dash(1)),strip(3.75,3.95,ly,false,dash(1)));
    else if(e.type!=="drive")lines.push(strip(-.1,.1,ly,false,dash(1)));
    if(e.type==="coast"||e.type==="country"||e.type==="highway")lines.push(strip(-e.half+.35,-e.half+.55,ly,false,free(2.5)),strip(e.half-.55,e.half-.35,ly,false,free(2.5)));
    for(const g of lines)rq(g,lineM,false);
    // zebra crossings and stop lines just outside town junctions
    if(e.type==="town"){
      const Q=[];
      const quad=(s,len,o0,o1)=>{const p=edgePos(e,s),rx=-p.dz,rz=p.dx,y=edgeY(e,s)+ly;
        for(const[a,o] of [[0,o0],[0,o1],[len,o0],[len,o1]])Q.push(p.x+p.dx*a+rx*o,y,p.z+p.dz*a+rz*o)};
      for(const end of ["a","b"]){
        const nd=e[end];if(!nd.r)continue;
        const s0=end==="a"?nd.r+.8:e.len-nd.r-.8-3;if(s0<0||s0+3>e.len)continue;
        for(let o=-e.half+.6;o<e.half-.5;o+=1.1)quad(s0,3,o,o+.55);
        if(end==="a")quad(s0+3.6,.35,-e.half+.3,-.15);else quad(s0-.95,.35,.15,e.half-.3);
      }
      if(Q.length){const I=[];for(let k=0;k<Q.length/3;k+=4)I.push(k,k+1,k+2,k+1,k+3,k+2);
        const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(Q,3));g.setIndex(I);g.computeVertexNormals();
        rq(g,zebraM,false)}
    }
    if(e.type==="town"){
      const keep=free(3);
      for(const s of [-1,1]){
        rq(strip(s<0?-e.half-WALK_W:e.half+.25,s<0?-e.half-.25:e.half+WALK_W,YO+.14,false,keep),walkM,true);
        rq(strip(s<0?-e.half-.25:e.half,s<0?-e.half:e.half+.25,YO+.13,false,keep),curbM,true);
        // the pavement is a solid kerbed block, not a sheet: a kerb face towards the road, a side face
        // down into the ground on the outside, and an end face wherever it stops before a junction
        const kerb=wall(s*e.half,YO-.02,YO+.13,keep,-s),side=wall(s*(e.half+WALK_W),-.4,YO+.14,keep,s);
        if(kerb)rq(kerb,curbM,true);if(side)rq(side,curbM,true);
        for(let i=0;i<n-1;i++){if(!keep(i))continue;
          if(i===0||!keep(i-1))rq(cap(i,s,-1),curbM,true);
          if(i===n-2||!keep(i+1))rq(cap(i+1,s,1),curbM,true);
        }
      }
    }else if(e.type!=="drive"){
      // gravel verge that lies on the real surface: just under the asphalt at the edge, then
      // easing down to the ground over the same 1.2 m the car's wheels follow, out to 2 m
      for(const sg of [-1,1]){
        const P=[],U=[],I=[],keep=free(0),offs=[0,.6,1.2,2];let v=0;
        for(let i=0;i<n-1;i++){if(!keep(i))continue;
          for(const k of [i,i+1])for(const o of offs){const p=e.pts[k],r=R[k],x=p.x+r.x*sg*(e.half+o),z=p.z+r.z*sg*(e.half+o),bed=e.ys[k],g=meshH(x,z);
            const y=o===0?bed+YO-.012:o<=1.2?lerp(bed+YO-.012,Math.max(g,bed-.06)+.03,o/1.2):g+.03;
            P.push(x,y,z);U.push((e.half+o)/3.75,e.cum[k]/6)}
          for(let q=0;q<3;q++){const a=v+q,b=v+q+1,c=v+4+q,d=v+4+q+1;I.push(a,c,b,b,c,d)}v+=8}
        if(!I.length)continue;
        const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();
        // keep the faces pointing up whichever side of the road this is
        const nm=g.attributes.normal;let up=0;for(let q=0;q<nm.count;q++)up+=nm.getY(q);
        if(up<0){for(let q=0;q<I.length;q+=3){const t=I[q+1];I[q+1]=I[q+2];I[q+2]=t}g.setIndex(I);g.computeVertexNormals()}
        rq(g,shoulderM,true)}
    }
    const t=e.type;if(!ROAD_PATHS[t])ROAD_PATHS[t]=new Path2D();
    const P2=ROAD_PATHS[t];P2.moveTo(e.pts[0].x,e.pts[0].z);for(let i=1;i<n;i++)P2.lineTo(e.pts[i].x,e.pts[i].z);
  }
  // junction surfaces: the convex outline of the road ends meeting there, laid flat on the junction plateau
  const hull=pts=>{pts=pts.slice().sort((a,b)=>a.x-b.x||a.z-b.z);const cr=(o,a,b)=>(a.x-o.x)*(b.z-o.z)-(a.z-o.z)*(b.x-o.x);
    const lo=[],up=[];for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
    for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
    lo.pop();up.pop();return lo.concat(up)};
  for(const nd of NODES){
    if(!nd.r)continue;
    const pts=[];
    for(const a of nd.adj){const e=a.e;
      for(const s of a.end==="a"?[0,Math.min(nd.r,e.len)]:[e.len,Math.max(0,e.len-nd.r)]){const p=edgePos(e,s),rx=-p.dz,rz=p.dx;pts.push({x:p.x+rx*e.half,z:p.z+rz*e.half},{x:p.x-rx*e.half,z:p.z-rz*e.half})}}
    const H=hull(pts);if(H.length<3)continue;
    const P=[nd.x,nd.y+YO+.005,nd.z],U=[nd.x/3.75,nd.z/6],I=[];
    H.forEach(h=>{P.push(h.x,nd.y+YO+.005,h.z);U.push(h.x/3.75,h.z/6)});
    for(let i=0;i<H.length;i++)I.push(0,1+(i+1)%H.length,1+i);
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();
    rq(g,padM,true);
  }
  flushRQ();
}
/* ================================================================ OBSTACLES (spatial hash) */
const OC=24,OGRID=new Map();let ostamp=0;
function gridAdd(o,x0,z0,x1,z1){for(let cx=Math.floor(x0/OC);cx<=Math.floor(x1/OC);cx++)for(let cz=Math.floor(z0/OC);cz<=Math.floor(z1/OC);cz++){const k=rkey(cx,cz);let a=OGRID.get(k);if(!a)OGRID.set(k,a=[]);a.push(o)}}
function addCircle(x,z,r){gridAdd({c:1,x,z,r,st:0},x-r,z-r,x+r,z+r)}
function addBox(x,z,hx,hz,yaw){const R=Math.hypot(hx,hz);gridAdd({c:0,x,z,hx,hz,cs:Math.cos(yaw),sn:Math.sin(yaw),st:0},x-R,z-R,x+R,z+R)}
function obstaclesNear(x,z,r,cb){ostamp++;for(let cx=Math.floor((x-r)/OC);cx<=Math.floor((x+r)/OC);cx++)for(let cz=Math.floor((z-r)/OC);cz<=Math.floor((z+r)/OC);cz++){const a=OGRID.get(rkey(cx,cz));if(!a)continue;for(const o of a)if(o.st!==ostamp){o.st=ostamp;cb(o)}}}

/* ================================================================ SCENERY (merged per 320 m tile) */
const TILE=320,tiles=new Map();
function tileOf(x,z){const k=Math.floor(x/TILE)+","+Math.floor(z/TILE);let t=tiles.get(k);if(!t)tiles.set(k,t={solid:[],town:[],glow:[]});return t}
const GEO={box:new THREE.BoxGeometry(1,1,1),trunk:new THREE.CylinderGeometry(.5,.7,1,6),cone:new THREE.ConeGeometry(1,1,7),
  ico:new THREE.IcosahedronGeometry(1,0),palmSeg:new THREE.CylinderGeometry(.18,.24,1,6),pole:new THREE.CylinderGeometry(.09,.13,1,6),
  ball:new THREE.SphereGeometry(1,8,6),rock:new THREE.DodecahedronGeometry(1,0)};
// A closed, folded frond: the ridge catches the sun while the tip hangs below the crown.
const palmFrond=new THREE.BufferGeometry();
palmFrond.setAttribute("position",new THREE.Float32BufferAttribute([
  0,0,0, -.38,.17,1.35, 0,.38,1.42, .38,.17,1.35, 0,.10,1.38, 0,-.65,3.2
],3));
palmFrond.setIndex([0,1,2,0,2,3,0,3,4,0,4,1,5,2,1,5,3,2,5,4,3,5,1,4]);
palmFrond.computeVertexNormals();
const inTown=(x,z)=>x>548&&x<772&&z>-132&&z<202;
function pine(x,z,y,s){vegPine(x,z,y,s)}
function olive(x,z,y,s){vegOlive(x,z,y,s)}
function palm(x,z,y,s){const t=tileOf(x,z).solid,a=rnd(x,z)*TAU,dx=Math.sin(a),dz=Math.cos(a);
  let px=x,pz=z,py=y;
  for(let k=0;k<5;k++){const lean=.05+k*.06,L=1.9*s;const cx=px+dx*Math.sin(lean)*L/2,cz=pz+dz*Math.sin(lean)*L/2,cy=py+Math.cos(lean)*L/2;
    t.push({g:GEO.palmSeg,m:mat(cx,cy,cz,a,s,L,s,lean),c:0x8a6c4a});px+=dx*Math.sin(lean)*L;pz+=dz*Math.sin(lean)*L;py+=Math.cos(lean)*L}
  for(let f=0;f<8;f++){const fa=f/8*TAU+a;t.push({g:palmFrond,m:mat(px,py,pz,fa,s,s,s),c:f%2?0x3f6b2a:0x4f7d32})}
  addCircle(x,z,.45*s);}
// street lamps; their heads are kept for the light pools on the road and the lamp lights near the car
const LAMPS=[];
function lamp(x,z,y,ax,az,r){const t=tileOf(x,z);LAMPS.push({x:x+ax*2.1,z:z+az*2.1,y:y+6.95,r:r||10});
  t.solid.push({g:GEO.pole,m:mat(x,y+3.6,z,0,1,7.2,1),c:0x5d6268});
  t.solid.push({g:GEO.box,m:mat(x+ax*1.1,y+7.1,z+az*1.1,Math.atan2(ax,az),.14,.14,2.2),c:0x5d6268});
  t.glow.push({g:GEO.ball,m:mat(x+ax*2.1,y+6.95,z+az*2.1,0,.32,.14,.32),c:0xffffff});
  addCircle(x,z,.3);}

function ibizaHouse(x,z,h,yaw){
  const t=tileOf(x,z).solid,cs=Math.cos(yaw),sn=Math.sin(yaw),r=k=>rnd(x+k*7.3,z-k*3.1);
  const B=(lx,ly,lz,w,hh,dd,c,g)=>t.push({g:g||GEO.box,m:mat(x+lx*cs+lz*sn,h+ly,z-lx*sn+lz*cs,yaw,w,hh,dd),c});
  const WH=[0xf6f3ec,0xf2eee4,0xf8f6f1][Math.floor(r(1)*3)],WH2=0xeae5da,STONE=0xbfb29a,SH=[0x2f6b4f,0x2b5d87,0x7a5232,0x3d7f8a][Math.floor(r(2)*4)],GL=0x1b2228,WOOD=0x7d5c3e;
  const W=10+r(3)*6,D=8+r(4)*3,H1=3.6,W2=W*(.4+r(5)*.2),D2=D*(.55+r(6)*.2),x2=(r(7)<.5?-1:1)*(W-W2)/2,z2=-(D-D2)/2,H2=3;
  // volumes
  B(0,H1/2-.3,0,W,H1+.6,D,WH);B(0,H1+.12,0,W+.24,.3,D+.24,WH2);B(0,.12,0,W+.08,.85,D+.08,STONE);
  B(x2,H1+H2/2,z2,W2,H2,D2,WH);B(x2,H1+H2+.12,z2,W2+.2,.28,D2+.2,WH2);
  let x3=null;
  if(r(8)>.35){const W3=3.4,D3=3.8,H3=2.9;x3=-Math.sign(x2||1)*(W/2+W3/2-.15);B(x3,H3/2-.3,D/2-D3/2-.6,W3,H3+.6,D3,WH);B(x3,H3+.12,D/2-D3/2-.6,W3+.2,.26,D3+.2,WH2);B(x3,.12,D/2-D3/2-.6,W3+.06,.85,D3+.06,STONE)}
  // door and shuttered windows on the front
  const n=Math.max(2,Math.floor(W/2.9)),door=Math.floor(r(9)*n);
  for(let k=0;k<n;k++){const wx=-W/2+1.4+k*(W-2.8)/(n-1);
    if(k===door){B(wx,1.05,D/2+.04,1.05,2.15,.1,0x6b4a2e);B(wx,2.3,D/2+.06,1.4,.14,.16,WH2);continue}
    B(wx,1.8,D/2+.03,.85,1.05,.08,GL);B(wx-.68,1.8,D/2+.06,.46,1.12,.06,SH);B(wx+.68,1.8,D/2+.06,.46,1.12,.06,SH);B(wx,1.2,D/2+.08,1.05,.1,.16,WH2)}
  for(let k=0;k<Math.max(1,Math.floor(W2/3));k++){const wx=x2-W2/2+1.3+k*2.6;if(wx>x2+W2/2-1)break;
    B(wx,H1+1.5,z2+D2/2+.03,.8,1,.08,GL);B(wx-.64,H1+1.5,z2+D2/2+.06,.44,1.06,.06,SH);B(wx+.64,H1+1.5,z2+D2/2+.06,.44,1.06,.06,SH)}
  for(const sd of [-1,1]){if(x3!==null&&Math.sign(x3)===sd)continue;const zz=(r(10+sd)-.5)*D*.4;
    B(sd*(W/2+.03),1.8,zz,.08,1.05,.85,GL);B(sd*(W/2+.06),1.8,zz-.68,.06,1.12,.46,SH);B(sd*(W/2+.06),1.8,zz+.68,.06,1.12,.46,SH)}
  // terrace, pool and a pergola with bougainvillea
  B(0,.08,D/2+3.6,W*1.05,.16,7.2,0xe4dac6);
  const px=(r(12)<.5?-1:1)*(W/2-2.4),pw=4.4;
  B(-px*.55,.12,D/2+4.4,W*.42,.06,3.4,0x2fb3cc);B(-px*.55,.1,D/2+4.4,W*.42+.5,.05,3.9,0xf2efe8);
  for(const [ox,oz] of [[-pw/2,.3],[pw/2,.3],[-pw/2,3.2],[pw/2,3.2]])B(px+ox,1.45,D/2+oz,.2,2.9,.2,WOOD);
  for(let k=0;k<6;k++)B(px-pw/2+k*pw/5,2.95,D/2+1.75,.12,.12,3.4,WOOD);
  B(px,2.85,D/2+3.2,pw+.3,.16,.16,WOOD);
  const BG=[0xc2185b,0xd63384,0xb0205a];
  for(let k=0;k<3;k++)t.push({g:GEO.ico,m:mat(x+(px-pw/2+.3+k*.5)*cs+(D/2+.35+k*.1)*sn,h+1.6+k*.55,z-(px-pw/2+.3+k*.5)*sn+(D/2+.35+k*.1)*cs,r(13+k)*3,.75,.95,.55),c:BG[k]});
  t.push({g:GEO.ico,m:mat(x+(px+pw/2-.2)*cs+(D/2+1.2)*sn,h+3.05,z-(px+pw/2-.2)*sn+(D/2+1.2)*cs,r(17),1.2,.35,1.5),c:0xc81d63});
  for(const ox of [-1.1,1.1])B(ox*(r(18)<.5?1:-1)+ (door/(n-1||1)-.5)*(W-2.8),.35,D/2+.7,.5,.7,.5,0xb5562e,GEO.trunk);
  if(r(19)>.45)palm(x+(-W/2-2.2)*cs+(D/2+2.6)*sn,z-(-W/2-2.2)*sn+(D/2+2.6)*cs,h,1);
  addBox(x,z,W/2,D/2,yaw);if(x3!==null)addBox(x+x3*cs,z-x3*sn,1.8,2,yaw);
}
// Eivissa facades: whitewashed walls, shuttered windows with iron balconies on
// the upper floors, shopfronts under striped awnings at street level. The lit
// version is the night emissive map (warm windows, glowing shops).
const FACADE_SEED=Math.random()*1000;
function windowTex(lit){
  // drawn in 256 units on a 512 canvas: 32 texels per metre keeps walls sharp when you drive right alongside them
  const c=document.createElement("canvas");c.width=c.height=512;const x=c.getContext("2d");x.scale(2,2);
  let sd=FACADE_SEED;const R=()=>{sd=(sd*16807+11)%2147483647;return sd/2147483647};
  x.fillStyle=lit?"#000":"#f4f1ea";x.fillRect(0,0,256,256);
  if(!lit){for(let i=0;i<260;i++){const v=225+R()*25|0;x.fillStyle=`rgba(${v},${v-3},${v-10},.35)`;x.fillRect(R()*256,R()*256,6+R()*30,4+R()*20)}
    const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(.75,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(120,100,80,.18)");x.fillStyle=g;x.fillRect(0,0,256,256)}
  const SH=["#2f6b4f","#2b5d87","#7a5232","#3d7f8a","#2f6b4f"],AW=[["#b8312f","#f2efe8"],["#2b5d87","#f2efe8"],["#2f6b4f","#e9e2cf"],["#c47a2c","#f2efe8"]];
  // upper floors: rows 0-2
  for(let r=0;r<3;r++)for(let k=0;k<4;k++){
    const X=k*64+19,Y=r*64+14,sh=SH[(k+r*2)%SH.length],open=R()<.55,bal=R()<.45;
    if(lit){if(R()<.38){x.fillStyle=R()<.7?"#ffd49a":"#fff0d0";x.fillRect(X+2,Y+2,22,30)}continue}
    x.fillStyle="#2a3238";x.fillRect(X,Y,26,34);
    x.fillStyle="rgba(150,180,200,.25)";x.fillRect(X+3,Y+3,9,12);
    x.fillStyle=sh;
    if(open){x.fillRect(X-12,Y,11,34);x.fillRect(X+27,Y,11,34)}else{x.fillRect(X,Y,13,34);x.fillRect(X+13,Y,13,34);x.fillStyle="rgba(0,0,0,.25)";x.fillRect(X+12.5,Y,1,34)}
    x.fillStyle="rgba(0,0,0,.18)";for(let q=0;q<34;q+=4)x.fillRect(open?X-12:X,Y+q,open?50:26,1);
    x.fillStyle="#e6e1d6";x.fillRect(X-4,Y+34,34,4);
    if(bal){x.fillStyle="#3a3a3a";x.fillRect(X-8,Y+38,42,3);x.fillRect(X-8,Y+24,42,2);for(let q=X-8;q<=X+34;q+=5)x.fillRect(q,Y+24,1.4,15)}
  }
  // ground floor: row 3
  for(let k=0;k<2;k++){const X=k*128+10,Y=192+8;
    if(lit){x.fillStyle="#ffcf8a";x.fillRect(X+4,Y+22,100,30);x.fillStyle="#fff2d6";x.fillRect(X+10,Y+26,30,10);continue}
    const aw=AW[Math.floor(R()*AW.length)];
    x.fillStyle="#1f262b";x.fillRect(X+4,Y+20,100,34);x.fillStyle="rgba(170,200,215,.22)";x.fillRect(X+8,Y+24,40,14);
    x.fillStyle="#6b4a2e";x.fillRect(X+82,Y+22,18,32);
    for(let q=0;q<9;q++){x.fillStyle=aw[q%2];x.beginPath();x.moveTo(X+q*12.4,Y);x.lineTo(X+(q+1)*12.4,Y);x.lineTo(X+(q+1)*12.4+1,Y+16);x.lineTo(X+q*12.4+1,Y+16);x.fill()}
    x.fillStyle="rgba(0,0,0,.25)";x.fillRect(X,Y+15,112,3);
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}
function townBlockGeo(w,h,d){
  const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,n=g.attributes.normal;
  for(let i=0;i<uv.count;i++){
    if(Math.abs(n.getY(i))>.5)uv.setXY(i,.02,.02);
    else uv.setXY(i,uv.getX(i)*(Math.abs(n.getX(i))>.5?d:w)/16,uv.getY(i)*h/12.8);
  }
  return g;
}
/* ---------- OLD QUAY: the port town on the east side ----------
   Six blocks between the town's streets (the streets themselves are untouched): terraces with shops, a market
   courtyard round a clock tower, workshops in old warehouses, houses round a garden, a civic square with the
   Harbour Hall and a fountain, and the Auto Gallery's block. Everything built here has a collider, and nothing
   stands nearer a street's centre line than 9 m (road 5.2, pavement 2.8). The avenue through the middle curves
   (z 40 in the west, 34 in the east), so the blocks beside it are set back to suit, not to a straight line. */
// a pitched roof, one unit each way: the ridge runs along z, the underside is open (it sits on a wall)
const ROOF_GEO=(()=>{const a=[-.5,0,-.5],b=[.5,0,-.5],c=[0,1,-.5],d=[-.5,0,.5],e=[.5,0,.5],f=[0,1,.5],
  g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute([a,d,f,a,f,c,b,c,f,b,f,e,a,c,b,d,e,f].flat(),3));g.computeVertexNormals();return g})();
const DRUM_GEO=new THREE.CylinderGeometry(.5,.5,1,14);
// what was built, for the map, the tests and anything that later needs to know where the town's places are
const QUAY={floors:[],houses:0,tower:[655,-41],fountain:[655,135],hall:[655,70,20,12],market:[639,671,-101,18],plaza:[629,681,90,181],
  gaps:[["w",629,-41],["e",681,-41],["s",655,29]],sheds:[]};
function buildOldQuay(){
  const WARM=[0xf2d49a,0xeeb38c,0xf3e3c2,0xe9c7a0,0xf6efdd,0xe2a98f],MARKET=[0xf3e3c2,0xf0c987,0xd9dfc2,0xf6efdd,0xe8b89a],
    PASTEL=[0xcfdcc0,0xc4d9e2,0xf3e3c2,0xf0d2c4,0xf6efdd,0xe6d9a8],TILE_C=[0xb05a3c,0x9c4f38,0xc0714a,0xa8553a],TRIM=0xe9e2d2,STONE=0xd9cdb4,WOOD=0x7d5c3e;
  let sd=1;const R=k=>rnd(sd++,k);
  const box=(x,y,z,w,h,d,c,ry=0,g=GEO.box)=>tileOf(x,z).solid.push({g,m:mat(x,y,z,ry,w,h,d),c});
  // Use the dimensions of the rendered slab for foot contact, including overlapping paving inlays.
  const floor=(x,y,z,w,h,d,color)=>{
    box(x,y,z,w,h,d,color);
    QUAY.floors.push({x,z,hx:w/2,hz:d/2,top:y+h/2});
  };
  // a house: walls with windows and a shopfront (the town's facade picture, tinted) and a roof. Its collider comes
  // from the row it stands in.
  // roof 0 is flat behind a parapet; 1 has its ridge along x, 2 along z
  const house=(cx,cz,w,d,fl,col,roof)=>{
    const h=fl*3.2+.5,y=meshH(cx,cz),top=y+h-.5;
    tileOf(cx,cz).town.push({g:townBlockGeo(w,h,d),m:mat(cx,y+h/2-.5,cz),c:col});
    if(!roof)box(cx,top+.16,cz,w+.3,.34,d+.3,TRIM);
    else{const ax=roof===1,span=ax?d:w,len=ax?w:d;box(cx,top+.1,cz,w+.5,.22,d+.5,TRIM);box(cx,top+.2,cz,span+.7,span*.26,len+.7,TILE_C[Math.floor(R(5)*TILE_C.length)],ax?Math.PI/2:0,ROOF_GEO)}
    QUAY.houses++;
  };
  // houses wall to wall round the edge of a block, leaving the middle open. o.gaps are ways in: [side, from, to]
  const ring=(x0,x1,z0,z1,o)=>{
    const gap=(side,a,b)=>(o.gaps||[]).some(g=>g[0]===side&&a<g[2]&&b>g[1]),
      fl=()=>o.fl[0]+Math.floor(R(1)*(o.fl[1]-o.fl[0]+1)),col=()=>o.pal[Math.floor(R(2)*o.pal.length)],
      plot=left=>{let w=o.w[0]+R(3)*(o.w[1]-o.w[0]);if(left-w<o.w[0]*.7)w=left;return w};
    // one collider for each unbroken run of houses, not one a house: where two colliders met inside a wall, a car
    // pushed into the wall there was shoved along it and stopped dead, where anywhere else it slides
    for(const[side,zz]of[["n",z0+o.dep/2],["s",z1-o.dep/2]]){let x=x0,a=null;const end=b=>{if(a!==null)addBox((a+b)/2,zz,(b-a)/2,o.dep/2,0);a=null};
      while(x1-x>.5){const w=plot(x1-x);if(gap(side,x,x+w))end(x);else{if(a===null)a=x;house(x+w/2,zz,w,o.dep,fl(),col(),R(4)<o.pitch?1:0)}x+=w}end(x)}
    for(const[side,xx]of[["w",x0+o.dep/2],["e",x1-o.dep/2]]){let z=z0+o.dep,a=null;const end=b=>{if(a!==null)addBox(xx,(a+b)/2,o.dep/2,(b-a)/2,0);a=null};
      while(z1-o.dep-z>.5){const w=plot(z1-o.dep-z);if(gap(side,z,z+w))end(z);else{if(a===null)a=z;house(xx,z+w/2,o.dep,w,fl(),col(),R(4)<o.pitch?2:0)}z+=w}end(z)}
  };
  const gy=(x,z)=>meshH(x,z);
  // 1. terraces with shops, north-west: narrow plots, two to four floors, a line of olive trees behind
  ring(569,611,-111,29,{dep:11,w:[6,9],fl:[2,4],pal:WARM,pitch:.85});
  for(let z=-88;z<=8;z+=24)olive(590,z,gy(590,z),1);
  // 2. the market, north-middle: houses round a paved yard, ways in from both side streets and through an arch
  // gap on the avenue, stalls in two rows and a clock tower in the middle
  ring(629,681,-111,28,{dep:10,w:[8,12],fl:[2,3],pal:MARKET,pitch:.7,gaps:[["w",-48,-34],["e",-48,-34],["s",649,661]]});
  {const[mx0,mx1,mz0,mz1]=QUAY.market,cx=(mx0+mx1)/2,cz=(mz0+mz1)/2,y=gy(cx,cz);
    floor(cx,y+.03,cz,mx1-mx0,.08,mz1-mz0,0xb9ad94);
    for(const[x,z,w,d]of[[634,-41,10,14],[676,-41,10,14],[655,23,12,10]])floor(x,y+.035,z,w,.08,d,0xb9ad94);   // the ways in are paved too
    const[tx,tz]=QUAY.tower;
    box(tx,y+9,tz,4.4,18,4.4,STONE);box(tx,y+18.3,tz,5.2,.6,5.2,TRIM);box(tx,y+20.1,tz,3.6,3,3.6,STONE);
    box(tx,y+21.6,tz,3.4,4.2,3.4,TILE_C[0],Math.PI/7,GEO.cone);box(tx,y+.5,tz,5.4,1,5.4,0xbfb29a);
    for(const[ox,oz,ry]of[[0,2.25,0],[0,-2.25,0],[2.25,0,Math.PI/2],[-2.25,0,Math.PI/2]]){   // a clock face on each side
      box(tx+ox,y+14.6,tz+oz,2.5,2.5,.1,0xf7f3e8,ry);box(tx+ox*1.03,y+15,tz+oz*1.03,.14,.95,.1,0x2a2f33,ry);
      box(tx+ox*1.03+(ox?0:.32),y+14.6,tz+oz*1.03+(ox?.32:0),.75,.13,.1,0x2a2f33,ry)}
    addBox(tx,tz,2.7,2.7,0);
    const AWN=[[0xb8312f,0xf2efe8],[0x2b5d87,0xf2efe8],[0x2f6b4f,0xe9e2cf],[0xc47a2c,0xf2efe8]];let k=0;
    for(const x of[cx-8,cx+8])for(let z=mz0+8;z<=mz1-6;z+=8){if(Math.abs(z-tz)<9)continue;
      const aw=AWN[k++%AWN.length],f=x<cx?1:-1;
      box(x,y+.5,z,1.3,.95,3.2,WOOD);box(x,y+1.02,z,1.5,.08,3.4,0xd9c9a8);
      for(const[px,pz]of[[-.8,-1.6],[.8,-1.6],[-.8,1.6],[.8,1.6]])box(x+px,y+1.2,z+pz,.1,2.4,.1,0x5d6268);
      for(let q=0;q<4;q++)box(x+f*.25,y+2.45,z-1.35+q*.9,2.6,.07,.9,aw[q%2]);
      for(const[cxx,cc]of[[-.3,0xd9662e],[.25,0x7fa63a],[.0,0xd8b23a]])box(x+cxx,y+1.14,z+(cc===0xd8b23a?1:cc===0x7fa63a?0:-1),.5,.18,.7,cc);
      addBox(x,z,.8,1.7,0)}
  }
  // 3. the workshops, north-east: four old warehouses with wide doors, and lanes between them you can walk or drive
  {const BR=[0x9c5b45,0x8a6f5c,0x6f7f86,0xa8674a],RF=[0x4f565c,0x8c4a36,0x5a6065,0x7a4234],SG=[0xe0b23c,0x3d8f8a,0xd9662e,0xe9e2d2];
    for(let i=0;i<4;i++){const cx=725,cz=-97+i*36,w=48,d=28,h=7.5,y=gy(cx,cz);
      box(cx,y+h/2-.5,cz,w,h+1,d,BR[i]);box(cx,y+h+.05,cz,w+.5,.24,d+.5,0x3a3f44);box(cx,y+h+.15,cz,d+.8,4.4,w+.8,RF[i],Math.PI/2,ROOF_GEO);
      for(const sx of[-1,1]){const fx=cx+sx*(w/2+.06);
        box(fx,y+2.3,cz,.14,4.6,6,0x2e3438);box(fx+sx*.03,y+2.3,cz,.1,4.6,.16,0x555c62);box(fx,y+5.5,cz,.16,1,7.4,SG[i]);
        for(const oz of[-10,10])box(fx,y+4.6,cz+oz,.12,1.5,2.6,0x1f262b)}
      for(const sz of[-1,1])for(let q=-18;q<=18;q+=9)box(cx+q,y+5.2,cz+sz*(d/2+.05),2.8,1.3,.12,0x1f262b);
      if(i%2===0){box(cx+14,y+h+3.2,cz-6,1.5,7,1.5,0x7a4a3a);box(cx+14,y+h+6.8,cz-6,1.8,.3,1.8,0x3a3f44)}
      addBox(cx,cz,w/2,d/2,0);QUAY.sheds.push([cx,cz,w,d]);
      // crates and drums against the wall in the lane to the south
      if(i<3){const lz=cz+d/2+1.1;
        for(const[ox,s]of[[-16,1.2],[-14.6,1],[9,1.3]]){box(cx+ox,y+s/2,lz,s,s,s,0xb08a55,R(6));addBox(cx+ox,lz,s/2,s/2,0)}
        for(const ox of[-3,-1.9,17]){box(cx+ox,y+.55,lz-.1,.9,1.1,.9,[0x3d6f8a,0xb8452f,0x4b5a3a][Math.floor(R(7)*3)],0,DRUM_GEO);addCircle(cx+ox,lz-.1,.48)}}
    }
  }
  // 4. houses round a garden, south-west: lower and paler, a lawn with palms and olives, one way in from the south
  ring(569,611,49,181,{dep:11,w:[8,12],fl:[2,3],pal:PASTEL,pitch:.6,gaps:[["s",585,595]]});
  {const y=gy(590,114);floor(590,y+.03,114,16,.08,104,0x7da25c);floor(590,y+.04,114,2.2,.08,104,0xb9ad94);floor(590,y+.035,176,10,.08,11,0xb9ad94);
    palm(584,76,gy(584,76),1);palm(596,150,gy(596,150),1.1);for(const[x,z]of[[596,92],[584,118],[596,126],[584,158]])olive(x,z,gy(x,z),.9)}
  // 5. the civic square, south-middle: the Harbour Hall behind its columns, and an open paved square with a fountain
  {const[hx,hz,hw,hd]=QUAY.hall,y=gy(hx,hz),H=13.3;
    tileOf(hx,hz).town.push({g:townBlockGeo(hw*2,H,hd*2),m:mat(hx,y+H/2-.5,hz),c:0xf1e7cf});box(hx,y+H-.3,hz,hw*2+.6,.5,hd*2+.6,TRIM);
    // the front faces south onto the square: three steps, six columns, a beam and a gable over them
    for(let q=0;q<3;q++)box(hx,y+.12+q*.2,hz+hd+1.7-q*.5,32-q*1.2,.24+q*.4,3.4-q,STONE);
    for(let q=0;q<6;q++){const x=hx-13.5+q*5.4;box(x,y+4.6,hz+hd+1.9,.95,8.2,.95,0xf3ecdc,0,DRUM_GEO);box(x,y+.75,hz+hd+1.9,1.3,.3,1.3,STONE);box(x,y+8.8,hz+hd+1.9,1.3,.3,1.3,STONE)}
    box(hx,y+9.5,hz+hd+1.6,30,1.1,2.6,0xf3ecdc);box(hx,y+10.05,hz+hd+1.6,30.6,3.2,2.8,0xe6dcc6,0,ROOF_GEO);
    box(hx,y+2,hz+hd+.06,3.2,4,.14,0x4a3a2a);box(hx,y+H+3.4,hz,.14,7,.14,0x5d6268);box(hx+1.1,y+H+6.2,hz,2,1.2,.06,0x1d7d86);
    addBox(hx,hz,hw,hd,0);addBox(hx,hz+hd+1.7,16,1.8,0);
    const[px0,px1,pz0,pz1]=QUAY.plaza,pcx=(px0+px1)/2,pcz=(pz0+pz1)/2,py=gy(pcx,pcz);
    floor(pcx,py+.03,pcz,px1-px0,.08,pz1-pz0,0xbdb199);floor(pcx,py+.035,pcz,px1-px0-8,.08,pz1-pz0-8,0xa99d86);floor(pcx,py+.04,pcz,px1-px0-10,.08,pz1-pz0-10,0xbdb199);
    const[fx,fz]=QUAY.fountain;
    box(fx,py+.4,fz,9.6,.8,9.6,STONE,0,DRUM_GEO);box(fx,py+.72,fz,8.6,.2,8.6,0x4fb0c6,0,DRUM_GEO);box(fx,py+1.5,fz,1.1,2.4,1.1,STONE,0,DRUM_GEO);
    box(fx,py+2.75,fz,3.2,.3,3.2,STONE,0,DRUM_GEO);box(fx,py+2.92,fz,2.7,.1,2.7,0x4fb0c6,0,DRUM_GEO);box(fx,py+3.5,fz,.4,1,.4,STONE,0,DRUM_GEO);
    addCircle(fx,fz,4.85);
    // benches facing the fountain, palms at the corners, lamps, and planters along the two streets
    for(let q=0;q<6;q++){const a=q/6*TAU+TAU/12,bx=fx+Math.sin(a)*9.5,bz=fz+Math.cos(a)*9.5;
      box(bx,py+.5,bz,2.2,.1,.6,WOOD,a);box(bx,py+.25,bz,2,.42,.12,0x5d6268,a);addBox(bx,bz,1.1,.35,a)}
    for(const[x,z]of[[px0+7,pz0+9],[px1-7,pz0+9],[px0+7,pz1-9],[px1-7,pz1-9]])palm(x,z,gy(x,z),1.15);
    for(const[x,z,ax]of[[px0+6,fz,1],[px1-6,fz,-1]])lamp(x,z,py+.07,ax,0,9);
    for(const x of[px0+1.2,px1-1.2])for(let z=pz0+6;z<pz1-4;z+=13){
      box(x,py+.45,z,1.5,.9,1.5,0xc9bda6);
      const turn=R(8)*3,flowering=R(9)>=.5;
      box(x,py+1.08,z,.76,.48,.70,0x456439,turn,VGEO.shrub);
      for(let i=0;i<3;i++){
        const angle=turn+i*TAU/3,dx=Math.cos(angle),dz=Math.sin(angle);
        box(x+dx*.34,py+1.20,z+dz*.34,.42,.34,.43,i%2?0x526f3d:0x638749,angle,VGEO.shrub);
        if(flowering)box(x+dx*.44,py+1.44,z+dz*.44,.19,.12,.16,i%2?0xae4666:0xcc687c,angle,VGEO.shrub);
      }
      addBox(x,z,.75,.75,0);
    }
  }
  // 6. beside the Auto Gallery, south-east: a short ring of houses south of its forecourt
  ring(699,751,130,181,{dep:11,w:[8,12],fl:[2,3],pal:WARM,pitch:.7,gaps:[["n",720,730]]});
  palm(725,155,gy(725,155),1.1);
}
function buildScenery(){
  buildOldQuay();
  // street furniture along roads
  for(const e of EDGES){
    const step=e.type==="town"?22:e.type==="highway"?44:e.type==="coast"?70:0;if(!step)continue;
    for(let s=10,k=0;s<e.len-6;s+=step,k++){
      if(!edgeFree(e,s,6))continue;
      const p=edgePos(e,s),rx=-p.dz,rz=p.dx,sgn=k%2?1:-1,ry=edgeY(e,s);
      if(e.type==="town"){
        const o=e.half+2.0;const lx=p.x+rx*o*sgn,lz=p.z+rz*o*sgn;lamp(lx,lz,ry+YO+.14,-rx*sgn,-rz*sgn,8.5);
        const qx=p.x-rx*o*sgn,qz=p.z-rz*o*sgn;if(k%2===0)palm(qx,qz,ry+YO+.14,.9);
      }else if(e.type==="highway"){
        for(const sg of [-1,1]){const o=e.half+1.4,lx=p.x+rx*o*sg,lz=p.z+rz*o*sg;lamp(lx,lz,ry,-rx*sg,-rz*sg)}
      }else{const o=e.half+1.4,lx=p.x-rx*o,lz=p.z-rz*o;lamp(lx,lz,ry,rx,rz)}
    }
  }
  // vegetation scan
  const step=isTouch?19:15;
  for(let gx=-1350;gx<1350;gx+=step)for(let gz=-1350;gz<1350;gz+=step){
    const x=gx+(rnd(gx,gz)-.5)*step*.8,z=gz+(rnd(gz,gx)-.5)*step*.8;
    const h=meshH(x,z);if(h<1.3)continue;
    if(inTown(x,z))continue;
    if(Math.hypot(x-HOUSE.x-15,z-HOUSE.z)<42||Math.hypot(x-DEALER.x,z-DEALER.z)<40)continue;
    const nr=nearestRoad(x,z,16);if(nr&&nr.d<nr.e.half+3.5)continue;
    const r=rnd(x*.37,z*.53);
    if(h<3.4){if(r<.07)palm(x,z,h,1+rnd(x,1)*.3);continue}
    const n=vegN(x,z);
    if(n>.55){if(r<.62)pine(x,z,h,.9+rnd(x,2)*.6)}
    else if(n>.32){if(r<.2)pine(x,z,h,.8+rnd(x,2)*.5);else if(r<.3)olive(x,z,h,.8+rnd(x,3)*.6)}
    else if(n>.05){if(r<.16)olive(x,z,h,.8+rnd(x,3)*.6)}
    else if(r<.035)olive(x,z,h,.7+rnd(x,4)*.4);
    if(r>.985)vegRock(x,z,h,1+rnd(z,5)*2.2);
  }
  // whitewashed Ibiza houses on the hills: stacked cubic volumes with flat roofs,
  // small shuttered windows, a stone base, a timber pergola with bougainvillea,
  // and a terrace with a pool
  let villas=0;
  for(let gx=-1200;gx<1200&&villas<100;gx+=62)for(let gz=-1200;gz<1200&&villas<100;gz+=62){
    const x=gx+(rnd(gx,7)-.5)*40,z=gz+(rnd(gz,9)-.5)*40;
    if(rnd(x,z)>.58)continue;
    const h=meshH(x,z);if(h<8||coastR(x,z)-Math.hypot(x,z)<140||inTown(x,z)||Math.hypot(x-HOUSE.x,z-HOUSE.z)<110||Math.hypot(x-DEALER.x,z-DEALER.z)<90)continue;
    const nr=nearestRoad(x,z,120);if(!nr||nr.d<24)continue;
    if(Math.abs(Hf(x+10,z)-Hf(x-10,z))+Math.abs(Hf(x,z+10)-Hf(x,z-10))>5)continue;
    ibizaHouse(x,z,h,Math.atan2(nr.x-x,nr.z-z));villas++;
  }
  // merge each tile into a few meshes
  const solidM=new THREE.MeshLambertMaterial({vertexColors:true});
  townMat=new THREE.MeshLambertMaterial({vertexColors:true,map:windowTex(false),emissiveMap:windowTex(true),emissive:0xffffff,emissiveIntensity:0});
  lampMat=new THREE.MeshBasicMaterial({color:0x9e9e94});
  for(const t of tiles.values()){
    if(t.solid.length){const m=new THREE.Mesh(merge(t.solid),solidM);m.castShadow=true;m.receiveShadow=true;scene.add(m)}
    if(t.town.length){const m=new THREE.Mesh(merge(t.town),townMat);m.castShadow=true;m.receiveShadow=true;scene.add(m)}
    if(t.glow.length)scene.add(new THREE.Mesh(merge(t.glow),lampMat));
  }
}
// a pool of warm light on the ground under every lamp: a soft additive patch that follows the surface,
// faded in at dusk (applyDayNight sets its opacity)
function buildLampPools(){
  const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");
  const gr=x.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.3,"rgba(255,255,255,.62)");gr.addColorStop(.65,"rgba(255,255,255,.18)");gr.addColorStop(1,"rgba(255,255,255,0)");
  x.fillStyle=gr;x.fillRect(0,0,128,128);
  poolMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),color:0xffc68a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,
    depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-40,visible:false});
  const N=6,tiles=new Map();
  for(const L of LAMPS){
    const key=Math.floor(L.x/640)+","+Math.floor(L.z/640);let b=tiles.get(key);if(!b){b={P:[],U:[],I:[]};tiles.set(key,b)}
    const v0=b.P.length/3;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const px=L.x+(i/(N-1)*2-1)*L.r,pz=L.z+(j/(N-1)*2-1)*L.r;
      b.P.push(px,Math.max(surfH(px,pz),meshH(px,pz))+.05,pz);b.U.push(i/(N-1),j/(N-1))}
    for(let j=0;j<N-1;j++)for(let i=0;i<N-1;i++){const a=v0+j*N+i;b.I.push(a,a+N,a+1,a+1,a+N,a+N+1)}
  }
  for(const b of tiles.values()){
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(b.P,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(b.U,2));g.setIndex(b.I);
    const m=new THREE.Mesh(g,poolMat);m.renderOrder=2;scene.add(m);
  }
}

/* ================================================================ HOUSE: garage interior + white villa shell
   Local frame: z runs from the door (0) into the room (30), x runs across. */
const gOut=new V3(1,0,0),gDir=new V3(0,0,1),gYaw=Math.PI/2;
let gY=0;
const gW=(x,z,y=0)=>new V3(HOUSE.x-gDir.x*x+gOut.x*z,gY+y,HOUSE.z-gDir.z*x+gOut.z*z);
const HOUSE_MESHES=[];
const SPOTS=[[-16,12.5,.55],[-10,10,.42],[-3.6,8.6,.18],[3.6,8.6,-.18],[10,10,-.42],[16,12.5,-.55],[-17,21.5,.35],[-10.5,22,.2],[-4.8,22,.05],[4.8,22,-.05],[10.8,22,-.2],[17,21.5,-.35]];
let doorMesh,aquaLight,selRing,selSpot;const fishes=[],pickers=[];
function buildHouse(){
  gY=PADS[0].h+YO;
  const wallM=new THREE.MeshPhongMaterial({color:0x86a9c0,shininess:14});
  const darkM=new THREE.MeshPhongMaterial({color:0x22282f,shininess:20});
  const floorM=new THREE.MeshPhongMaterial({color:0x557d93,shininess:90,specular:0x33454f});
  const shellM=new THREE.MeshLambertMaterial({color:0xf4f2ec});
  const put=(g,m,x,y,z,cast,yaw)=>{const q=new THREE.Mesh(g,m);q.position.copy(gW(x,z,y));q.rotation.y=yaw===undefined?gYaw:yaw;q.castShadow=!!cast;q.receiveShadow=true;scene.add(q);HOUSE_MESHES.push(q);return q};
  const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  put(B(46,.4,30),floorM,0,-.2,15);
  put(B(46,.5,30),darkM,0,10.25,15,true);
  put(B(.5,10.5,30),wallM,23,5,15,true);put(B(.5,10.5,30),wallM,-23,5,15,true);
  put(B(46,10.5,.5),wallM,0,5,30,true);
  put(B(16,10.5,.5),wallM,15,5,0,true);put(B(16,10.5,.5),wallM,-15,5,0,true);put(B(14,4,.5),wallM,0,8.5,0,true);
  // exterior shell
  put(B(16.6,11,.3),shellM,15.3,5.2,-.4,true);put(B(16.6,11,.3),shellM,-15.3,5.2,-.4,true);put(B(14,4.4,.3),shellM,0,8.7,-.4,true);
  put(B(.3,11,31),shellM,23.4,5.2,15,true);put(B(.3,11,31),shellM,-23.4,5.2,15,true);put(B(47,11,.3),shellM,0,5.2,30.4,true);
  put(B(47.2,.6,31.2),shellM,0,10.8,15,true);
  put(B(18,.12,9),new THREE.MeshLambertMaterial({color:0xe9e4d6}),-34,.06,12);
  put(B(13,.08,6),new THREE.MeshPhongMaterial({color:0x3fc1d6,shininess:120}),-34,.12,12);
  doorMesh=put(B(13.6,6.4,.28),new THREE.MeshPhongMaterial({color:0x8e98a1,shininess:60}),0,3.3,-.1,true);
  for(let x=-16;x<=16;x+=8)put(B(1.1,.9,29),darkM,x,9.5,15,true);
  // mezzanine, railing, stairs, bookshelf, person, plant
  put(B(21,.5,11),darkM,11,5,24.5,true);
  for(let x=1;x<=21;x+=1.5)put(B(.09,1.5,.09),darkM,x,6,19.1);
  put(B(21,.12,.12),darkM,11,6.75,19.1);
  for(let s=0;s<10;s++)put(B(3.2,.28,.9),darkM,-1.6,.35+s*.5,19.4+s*.9,true);
  put(B(6,3,.9),new THREE.MeshPhongMaterial({color:0x8d7a5f}),6,7,29.3,true);
  for(let i=0;i<12;i++)put(B(.35,1.6,.6),new THREE.MeshPhongMaterial({color:new THREE.Color(`hsl(${i*29},30%,40%)`).getHex()}),3.6+i*.42,7.2,29);
  put(B(.7,1.9,.4),new THREE.MeshPhongMaterial({color:0xf2f2f2}),14,6.2,25.5,true);
  put(new THREE.SphereGeometry(.34,10,8),new THREE.MeshPhongMaterial({color:0xd2a77c}),14,7.5,25.5,true);
  put(new THREE.ConeGeometry(1,2.4,7),new THREE.MeshPhongMaterial({color:0x2c6b32}),19.5,6.5,27.5,true);
  // TVs
  const tvTex=draw=>{const c=document.createElement("canvas");c.width=256;c.height=144;draw(c.getContext("2d"));return new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)})};
  const tvRoad=tvTex(x=>{const g=x.createLinearGradient(0,0,0,144);g.addColorStop(0,"#16314f");g.addColorStop(1,"#79a6d4");x.fillStyle=g;x.fillRect(0,0,256,144);x.fillStyle="#2a2a2e";x.beginPath();x.moveTo(40,144);x.lineTo(118,80);x.lineTo(138,80);x.lineTo(216,144);x.fill();x.fillStyle="#e8821a";x.fillRect(104,112,48,18)});
  const tvHills=tvTex(x=>{const g=x.createLinearGradient(0,0,0,144);g.addColorStop(0,"#9cc3e0");g.addColorStop(1,"#e8dcc0");x.fillStyle=g;x.fillRect(0,0,256,144);x.fillStyle="#58708a";x.beginPath();x.moveTo(0,110);for(let i=0;i<=256;i+=16)x.lineTo(i,70+Math.sin(i*.05)*24+Math.sin(i*.13)*10);x.lineTo(256,144);x.lineTo(0,144);x.fill()});
  put(B(.3,4.4,7.6),darkM,-22.6,4.6,11);
  put(new THREE.PlaneGeometry(7,4),tvRoad,-22.4,4.6,11,false,Math.atan2(-gDir.x,-gDir.z));
  put(B(6.4,3.6,.3),darkM,-12,4.2,29.6);
  put(new THREE.PlaneGeometry(6,3.2),tvHills,-12,4.2,29.4,false,gYaw+Math.PI);
  // aquarium under the mezzanine
  put(B(18,4.4,.1),new THREE.MeshPhongMaterial({color:0x1270b0,emissive:0x0d5a94}),12,2.2,29.65);
  for(let k=0;k<7;k++)put(B(.5+rnd(k,40)*.6,4.2,.05),new THREE.MeshBasicMaterial({color:0x9fe4ff,transparent:true,opacity:.18,depthWrite:false}),4.5+k*2.4,2.3,29.2);
  put(B(18,.45,1.7),new THREE.MeshLambertMaterial({color:0xd9c48f}),12,.22,28.8);
  [[5,0xff6fa8],[8.5,0xa86bff],[15,0xff8c5a],[18.5,0xff6fa8]].forEach(([x,c])=>put(new THREE.ConeGeometry(.35,1.4,5),new THREE.MeshLambertMaterial({color:c,emissive:c,emissiveIntensity:.25}),x,1.1,29.2));
  put(B(18,4.5,1.9),new THREE.MeshPhongMaterial({color:0x2ab0f0,transparent:true,opacity:.5,emissive:0x1683c8,shininess:200,depthWrite:false}),12,2.25,28.75);
  aquaLight=new THREE.PointLight(0x45c4ff,1.3,30);aquaLight.position.copy(gW(12,26,2.6));scene.add(aquaLight);
  const fcol=[0xff8c00,0xffd700,0x00bfff,0xff69b4,0x7fff00,0xff4500,0x00fa9a,0xffd700,0xff8c00];
  const fishYaw=Math.atan2(gDir.z,-gDir.x);
  for(let i=0;i<9;i++){const g=new THREE.Group(),c=new THREE.Mesh(new THREE.ConeGeometry(.16,.5,5),new THREE.MeshBasicMaterial({color:fcol[i]}));c.rotation.z=-Math.PI/2;g.add(c);scene.add(g);fishes.push({g,ph:i*.9,yc:1+(i%3)*1.05,zc:28.4+(i%2)*.6,yaw:fishYaw})}
  // lights
  [[-12,9],[3,12],[15,9]].forEach(([x,z])=>{const l=new THREE.PointLight(0xffeec8,.6,44);l.position.copy(gW(x,z,8.6));scene.add(l);put(new THREE.CylinderGeometry(.5,.62,.22,10),new THREE.MeshBasicMaterial({color:0xfff6dd}),x,9.9,z)});
  [-16,-8,0,8,16].forEach((x,k)=>{const q=put(new THREE.CylinderGeometry(.2,.28,.6,10),darkM,x,8.75,4+k%2*14);q.rotation.order="YXZ";q.rotation.x=.7});
  selRing=new THREE.Mesh(new THREE.RingGeometry(2.7,3.0,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,side:THREE.DoubleSide}));
  selRing.rotation.x=-Math.PI/2;scene.add(selRing);
  selSpot=new THREE.SpotLight(0xfff1d6,1.1,22,.5,.6);scene.add(selSpot);scene.add(selSpot.target);
  SPOTS.forEach((s,i)=>{const hit=new THREE.Mesh(B(3.4,2.4,5.6),new THREE.MeshBasicMaterial({visible:false}));hit.position.copy(gW(s[0],s[1],1.1));hit.rotation.y=gYaw+Math.PI+s[2];hit.userData.slot=i;scene.add(hit);pickers.push(hit)});
  // palms around the house, collision for the whole building and the pool
  [[-28,-4],[-40,-4],[28,-6],[-30,26]].forEach(([x,z])=>{const p=gW(x,z);palm(p.x,p.z,gY,1.1)});
  const c=gW(0,15);addBox(c.x,c.z,23.6,15.6,gYaw);
  const pl=gW(-34,12);addBox(pl.x,pl.z,9,4.5,gYaw);
}

/* ================================================================ DEALERSHIP (outside) + SHOWROOM (hidden below the island) */
const DEALER_MARK={x:722,z:54};
const SHOW=new V3(0,-300,0);
let podium;
function buildDealer(){
  const y=meshH(DEALER.x,DEALER.z);
  // Bake recessed display bays into one facade map for the three street-facing blank walls.
  const facade=document.createElement("canvas");facade.width=512;facade.height=128;
  const ctx=facade.getContext("2d");
  ctx.fillStyle="#e4dfd4";ctx.fillRect(0,0,512,128);
  ctx.fillStyle="#b5afa4";ctx.fillRect(0,14,512,2);ctx.fillRect(0,110,512,18);
  const glazing=ctx.createLinearGradient(0,34,0,89);
  glazing.addColorStop(0,"#819698");glazing.addColorStop(.56,"#566d70");glazing.addColorStop(1,"#384f53");
  for(let bay=0;bay<6;bay++){
    const left=12+bay*82;
    ctx.fillStyle="#b5afa4";ctx.fillRect(left-2,32,72,61);
    ctx.fillStyle="#303e3f";ctx.fillRect(left,34,68,55);
    ctx.fillStyle=glazing;ctx.fillRect(left+3,37,30,49);ctx.fillRect(left+35,37,30,49);
    ctx.fillStyle="#c9c3b8";ctx.fillRect(left-3,89,74,3);
  }
  const facadeMap=new THREE.CanvasTexture(facade);facadeMap.encoding=THREE.sRGBEncoding;
  facadeMap.anisotropy=4;
  const wallM=new THREE.MeshLambertMaterial({map:facadeMap});
  const walls=new THREE.BoxGeometry(40,11,40),uv=walls.attributes.uv,normals=walls.attributes.normal;
  // The roof, underside and signed entrance sample a plain patch of plaster.
  for(let i=0;i<uv.count;i++)if(Math.abs(normals.getY(i))>.5||normals.getZ(i)<-.5)uv.setXY(i,.5,.95);
  const add=(g,m,x,yy,z)=>{const q=new THREE.Mesh(g,m);q.position.set(x,yy,z);q.castShadow=true;q.receiveShadow=true;scene.add(q);return q};
  add(walls,wallM,DEALER.x,y+5.5,DEALER.z);
  add(new THREE.BoxGeometry(34,7.5,.4),new THREE.MeshPhongMaterial({color:0x1b252d,shininess:160,specular:0xbfd3e0}),DEALER.x,y+4,DEALER.z-20.1);
  add(new THREE.BoxGeometry(46,.16,16),new THREE.MeshLambertMaterial({color:0xc9c5bb}),DEALER.x,y+.2,DEALER.z-28);
  const c=document.createElement("canvas");c.width=512;c.height=96;const x=c.getContext("2d");
  x.fillStyle="#111";x.fillRect(0,0,512,96);x.fillStyle="#fff";x.font="700 54px Arial";x.textAlign="center";x.textBaseline="middle";x.fillText("AUTO GALLERY",256,50);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(18,3.4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));
  sign.position.set(DEALER.x,y+9.3,DEALER.z-20.35);sign.rotation.y=Math.PI;scene.add(sign);
  addBox(DEALER.x,DEALER.z,20.2,20.2,0);
  // showroom
  const S=SHOW;
  const fl=new THREE.Mesh(new THREE.CircleGeometry(22,48).rotateX(-Math.PI/2),new THREE.MeshPhongMaterial({color:0x17191c,shininess:180,specular:0x666a70}));fl.position.copy(S);fl.receiveShadow=true;scene.add(fl);
  const wl=new THREE.Mesh(new THREE.CylinderGeometry(22,22,14,48,1,true),new THREE.MeshLambertMaterial({color:0x4d5156,side:THREE.BackSide}));wl.position.set(S.x,S.y+7,S.z);scene.add(wl);
  const cl=new THREE.Mesh(new THREE.CircleGeometry(22,48).rotateX(Math.PI/2),new THREE.MeshLambertMaterial({color:0x6c7075}));cl.position.set(S.x,S.y+14,S.z);scene.add(cl);
  podium=new THREE.Group();podium.position.copy(S);scene.add(podium);
  const pd=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.8,.3,48),new THREE.MeshPhongMaterial({color:0x2a2c30,shininess:120}));pd.position.y=.15;pd.receiveShadow=true;podium.add(pd);
  const rg=new THREE.Mesh(new THREE.TorusGeometry(4.7,.05,6,64),new THREE.MeshBasicMaterial({color:0xffffff}));rg.rotation.x=Math.PI/2;rg.position.y=.3;podium.add(rg);
  const l1=new THREE.PointLight(0xffffff,1.0,45);l1.position.set(S.x+5,S.y+9,S.z+6);scene.add(l1);
  const l2=new THREE.PointLight(0xdfe8ff,.6,45);l2.position.set(S.x-7,S.y+7,S.z-5);scene.add(l2);
}

/* ================================================================ MARKERS (rings on the ground, light beams for events) */
const beamGeo=new THREE.CylinderGeometry(2.2,2.2,70,16,1,true),ringGeo=new THREE.RingGeometry(3.6,4.3,40).rotateX(-Math.PI/2);
function marker(x,z,beam,color){
  const y=surfH(x,z)+.2,g=new THREE.Group();
  const r=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:color||0xffffff,transparent:true,opacity:.8,depthWrite:false}));r.position.set(x,y,z);g.add(r);
  if(beam){const m=new THREE.MeshBasicMaterial({color:color||0xffe2a0,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    const b=new THREE.Mesh(beamGeo,m);b.position.set(x,y+35,z);g.add(b)}
  scene.add(g);return g;
}

/* ================================================================ VEGETATION (instanced)
   Aleppo pines with leaning trunks and umbrella crowns, olive and almond
   trees, garrigue shrubs, limestone boulders and dry roadside grass. Each kind
   is one instanced mesh per 640 m tile, shown only within its useful range. */
const VTL=new Map(),GTL=new Map(),GT=128;
const VT=640;
function vtl(x,z){const i=Math.floor(x/VT),j=Math.floor(z/VT),k=i+","+j;let t=VTL.get(k);if(!t)VTL.set(k,t={cx:(i+.5)*VT,cz:(j+.5)*VT,L:{},M:[]});return t}
function gtl(x,z){const i=Math.floor(x/GT),j=Math.floor(z/GT),k=i+","+j;let t=GTL.get(k);if(!t)GTL.set(k,t={cx:(i+.5)*GT,cz:(j+.5)*GT,L:{},M:[]});return t}
const STL=new Map(),ST=160;
function stl(x,z){const i=Math.floor(x/ST),j=Math.floor(z/ST),k=i+","+j;let t=STL.get(k);if(!t)STL.set(k,t={cx:(i+.5)*ST,cz:(j+.5)*ST,L:{},M:[]});return t}
function vput(layer,x,y,z,ry,sx,sy,sz,col,rx=0,rz=0){const t=layer==="grass"?gtl(x,z):vtl(x,z);(t.L[layer]||(t.L[layer]=[])).push(x,y,z,ry,sx,sy,sz,col,rx,rz);
  if(layer!=="grass"&&!(isTouch&&layer==="shrub")){const u=stl(x,z);(u.L[layer]||(u.L[layer]=[])).push(x,y,z,ry,sx,sy,sz,col,rx,rz)}}

// a lumpy rock or foliage clump: displaced by a hash of each corner, so shared corners move together
function lumpGeo(base,seed,amt,squash,soft){
  const g=base,p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=Math.round(x*97)+Math.round(y*89)*7+Math.round(z*83)*13,f=1+(rnd(k,seed)-.5)*amt;p.setXYZ(i,x*f,y*f*(squash||1),z*f)}
  g.computeVertexNormals();
  // foliage: rounded normals (pointing out and a little up) read as soft leafy masses instead of facets
  if(soft){const n=g.attributes.normal,v=new V3();for(let i=0;i<p.count;i++){v.set(p.getX(i),p.getY(i)+.45,p.getZ(i)).normalize();n.setXYZ(i,v.x,v.y,v.z)}}
  return g;
}
const VGEO={
  trunk:new THREE.CylinderGeometry(.55,1,1,5,1,true).translate(0,.5,0),
  crown:lumpGeo(new THREE.OctahedronGeometry(1,1),3,.38,1,true),
  crownFar:lumpGeo(new THREE.IcosahedronGeometry(1,0),3,.3,1,true),
  shrub:lumpGeo(new THREE.IcosahedronGeometry(1,0),7,.5,1,true).translate(0,.25,0),
  rock:lumpGeo(new THREE.DodecahedronGeometry(1,0),11,.45,1),
  grass:(()=>{const a=new THREE.PlaneGeometry(1,1).translate(0,.5,0),b=a.clone().rotateY(Math.PI/2),c=a.clone().rotateY(Math.PI/4);
    const g=new THREE.BufferGeometry();const P=[],U=[],N=[],I=[];let o=0;
    for(const q of [a,b,c])for(const flip of [false,true]){P.push(...q.attributes.position.array);U.push(...q.attributes.uv.array);for(let i=0;i<q.attributes.position.count;i++)N.push(0,1,0);
      const ix=Array.from(q.index.array,v=>v+o);if(flip)for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t}I.push(...ix);o+=q.attributes.position.count}
    g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(U,2));g.setAttribute("normal",new THREE.Float32BufferAttribute(N,3));g.setIndex(I);return g})()
};
const PINE_C=[0x34472a,0x3d5230,0x2e4026,0x445a33],OLIVE_C=[0x7b8659,0x6c7a4d,0x8a9468],ALMOND_C=[0x6f8a45,0x7c9550,0x66803f];
const SHRUB_C=[0x4a5a30,0x56633a,0x5f6a44,0x6d7458,0x857e52,0x3f5030];

function vegPine(x,z,y,s){
  const H=(5.8+rnd(x,z+1)*3.8)*s,lean=.04+rnd(z,x)*.15,la=rnd(x+3,z)*TAU,lx=Math.sin(la)*lean,lz=Math.cos(la)*lean,tr=.26*s+.12;
  vput("trunk",x,y-.4,z,0,tr,H*.8,tr,0x5c4532,lz,-lx);
  // one rounded mass with smaller lobes around and above it: the irregular dome of an Aleppo pine
  const tx=x+lx*H*.8,tz=z+lz*H*.8,ty=y-.4+H*.8,R=(2.2+rnd(x,z+5)*1.4)*s;
  vput("crown",tx,ty,tz,rnd(x,9)*TAU,R*.85,R*.66,R*.85,PINE_C[Math.floor(rnd(x,z+2)*4)]);
  const n=2+Math.floor(rnd(z,x+7)*3);
  for(let k=0;k<n;k++){const a=k*2.4+rnd(k,x)*1.5,d=R*(.45+rnd(k,z)*.35),sc=R*(.5+rnd(k,1)*.18);
    vput("crown",tx+Math.sin(a)*d,ty+(rnd(k,x+z)-.25)*R*.5,tz+Math.cos(a)*d,rnd(k,9)*TAU,sc,sc*(.72+rnd(k,2)*.15),sc,PINE_C[(k+Math.floor(rnd(x,k)*4))%4])}
  addCircle(x,z,.5*s+.2);
}
function vegOlive(x,z,y,s){
  const H=(1.7+rnd(x,z)*.8)*s,la=rnd(x+1,z)*TAU,lean=.1+rnd(z,x)*.15,lx=Math.sin(la)*lean,lz=Math.cos(la)*lean;
  vput("trunk",x,y-.3,z,0,.3*s,H+.6,.3*s,0x5d5141,lz,-lx);
  const tx=x+lx*H,tz=z+lz*H,R=(1.8+rnd(x,z+3)*.9)*s;
  for(let k=0;k<3;k++){const a=k*2.1+la,d=R*.35;vput("crown",tx+Math.sin(a)*d,y+H+.4+rnd(k,x)*.5,tz+Math.cos(a)*d,a,R*(.62+rnd(k,z)*.15),R*(.46+rnd(k,1)*.1),R*(.62+rnd(k,2)*.15),OLIVE_C[(k+Math.floor(rnd(z,k)*3))%3])}
  addCircle(x,z,.45*s);
}
function vegAlmond(x,z,y,s){
  const H=1.5*s;vput("trunk",x,y-.3,z,rnd(x,z)*3,.2*s,H+.5,.2*s,0x4f3d30);
  const R=(1.5+rnd(x,z+2)*.5)*s;
  vput("crown",x,y+H+.6,z,rnd(z,x)*TAU,R,R*.62,R,ALMOND_C[Math.floor(rnd(x,z+9)*3)]);
  vput("crown",x+.4*s,y+H+1.0,z-.3*s,rnd(x,z)*TAU,R*.7,R*.5,R*.7,ALMOND_C[(Math.floor(rnd(x,z+9)*3)+1)%3]);
  addCircle(x,z,.38);
}
function vegShrub(x,z,y,s,c){vput("shrub",x,y-.1*s,z,rnd(x,z)*TAU,s*(.8+rnd(z,x)*.5),s*(.45+rnd(x,z+1)*.35),s*(.8+rnd(x+1,z)*.5),c)}
function vegRock(x,z,y,s){vput("rock",x,y+s*.15,z,rnd(x,z)*TAU,s*1.3,s*.75,s,rnd(z,x)>.5?0xa79f8d:0x958e80,rnd(x,1)*.4,rnd(z,1)*.4);addCircle(x,z,s*1.05)}

function grassTex(){
  const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");
  for(let i=0;i<46;i++){const bx=6+Math.random()*116,h=50+Math.random()*74,bend=(Math.random()-.5)*34,v=165+Math.random()*90|0;
    x.strokeStyle=`rgb(${v},${v},${Math.max(0,v-18)})`;x.lineWidth=1.3+Math.random()*2.2;x.lineCap="round";
    x.beginPath();x.moveTo(bx,128);x.quadraticCurveTo(bx+bend*.3,128-h*.6,bx+bend,128-h);x.stroke();
    if(Math.random()<.25){x.fillStyle=`rgb(${v+10},${v},${v-30})`;x.beginPath();x.ellipse(bx+bend,128-h,2,5,0,0,TAU);x.fill()}}
  const t=new THREE.CanvasTexture(c);return t;
}
const grassT={value:0};
// bushes and grass the car drives into are flattened (crushed), not driven through
const CRUSH=new Map(),CRC=4,crushM4=new THREE.Matrix4(),crushP=new V3(),crushQ=new THREE.Quaternion(),crushS=new V3();
function crushAdd(m,i,x,z,r,grass){const k=Math.floor(x/CRC)+","+Math.floor(z/CRC);let a=CRUSH.get(k);if(!a)CRUSH.set(k,a=[]);a.push({m,i,x,z,r,grass,done:false})}
let brushT=0;
function updateCrush(dt){
  brushT-=dt;const sp=Math.hypot(P.vx,P.vz);if(sp<1.5)return;
  const cx=Math.floor(P.x/CRC),cz=Math.floor(P.z/CRC),fx=Math.sin(P.h),fz=Math.cos(P.h),touched=new Map();let bushes=0;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=CRUSH.get((cx+i)+","+(cz+j));if(!a)continue;
    for(const c of a){if(c.done)continue;
      // distance to the car's footprint (a 4.6 m by 2 m box)
      const dx=c.x-P.x,dz=c.z-P.z,al=dx*fx+dz*fz,ac=dx*-fz+dz*fx;
      if(Math.abs(al)>2.3+c.r||Math.abs(ac)>1+c.r)continue;
      c.done=true;c.m.getMatrixAt(c.i,crushM4);crushM4.decompose(crushP,crushQ,crushS);
      crushS.set(crushS.x*1.15,crushS.y*(c.grass?.12:.16),crushS.z*1.15);crushP.y-=c.grass?.02:.08;crushM4.compose(crushP,crushQ,crushS);c.m.setMatrixAt(c.i,crushM4);
      const r=touched.get(c.m)||[1e9,-1];touched.set(c.m,[Math.min(r[0],c.i),Math.max(r[1],c.i)]);if(!c.grass)bushes++}}
  for(const [m,[lo,hi]] of touched){m.instanceMatrix.updateRange.offset=lo*16;m.instanceMatrix.updateRange.count=(hi-lo+1)*16;m.instanceMatrix.needsUpdate=true}
  if(bushes){P.vx*=Math.pow(.97,bushes);P.vz*=Math.pow(.97,bushes);if(brushT<=0){brushT=.18;playBrush(Math.min(1,sp/20))}}
}
function buildVegetation(){
  // garrigue shrubs, boulders and almond orchards on the red earth
  const st=isTouch?9:6;
  for(let gx=-1340;gx<1340;gx+=st)for(let gz=-1340;gz<1340;gz+=st){
    const x=gx+(rnd(gx,gz+.5)-.5)*st,z=gz+(rnd(gz,gx+.5)-.5)*st,h=meshH(x,z);if(h<2.6||inTown(x,z))continue;
    if(Math.hypot(x-HOUSE.x-15,z-HOUSE.z)<44||Math.hypot(x-DEALER.x,z-DEALER.z)<42)continue;
    const r=rnd(x*.71,z*.29),n=vegN(x,z),p=n>.55?.14:n>-.15?.34:.07;if(r>p)continue;if(junctionAt(x,z))continue;
    const nr=nearestRoad(x,z,12);if(nr&&nr.d<nr.e.half+2.4)continue;
    const sl=Math.abs(meshH(x+2,z)-meshH(x-2,z))+Math.abs(meshH(x,z+2)-meshH(x,z-2));
    if(sl>2.6&&r<.06){vegRock(x,z,h,.6+rnd(x,3)*1.4);continue}
    vegShrub(x,z,h,.55+rnd(x,z+4)*.9*(n>-.15?1.2:.8),SHRUB_C[Math.floor(rnd(z,x+6)*SHRUB_C.length)]);
  }
  const ost=isTouch?10:8;
  for(let gx=-1300;gx<1300;gx+=ost)for(let gz=-1300;gz<1300;gz+=ost){
    const f=fbm(gx*.011,gz*.011);if(f<.62||vegN(gx,gz)>-.05)continue;
    const x=gx+(rnd(gx,3)-.5)*.8,z=gz+(rnd(gz,3)-.5)*.8,h=meshH(x,z);if(h<4||inTown(x,z)||rnd(x,z)>.82)continue;
    const nr=nearestRoad(x,z,14);if(nr&&nr.d<nr.e.half+4)continue;
    if(Math.abs(meshH(x+3,z)-meshH(x-3,z))+Math.abs(meshH(x,z+3)-meshH(x,z-3))>2)continue;
    if(Math.hypot(x-HOUSE.x-15,z-HOUSE.z)<60||Math.hypot(x-DEALER.x,z-DEALER.z)<50)continue;
    vegAlmond(x,z,h,.85+rnd(x,z)*.3);
  }
  // dry grass along the verges and in clumps near the roads
  const gs=isTouch?2.6:1.5,GC=[0xc9b26c,0xb9a862,0xa3a05a,0xd6c690,0x8f9150];
  for(const e of EDGES){if(e.type==="drive"||e.type==="town")continue;
    for(let s=4,k=0;s<e.len-4;s+=gs,k++){if(!edgeFree(e,s,3))continue;const p=edgePos(e,s),rx=-p.dz,rz=p.dx;
      for(const sg of [-1,1]){const rr=rnd(s*3.1+sg,e.len);if(rr>.8)continue;
        const off=e.half+1.3+Math.pow(rnd(s,sg*7+e.len),1.6)*7,jx=(rnd(s,sg)-.5)*gs,x=p.x+rx*off*sg+p.dx*jx,z=p.z+rz*off*sg+p.dz*jx,h=meshH(x,z);
        if(h<2.4||junctionAt(x,z))continue;const nr=nearestRoad(x,z,10);if(nr&&nr.d<nr.e.half+1.2)continue;
        const sz=.55+rnd(x,z)*.6;vput("grass",x,h-.05,z,rnd(z,x)*TAU,sz*1.3,sz,sz*1.3,GC[Math.floor(rnd(x+1,z)*GC.length)])}
      if(k%5===0&&rnd(s,e.len+3)<.5){const sg=rnd(s,2)<.5?-1:1,off=e.half+6+rnd(s,4)*24,cx=p.x+rx*off*sg,cz=p.z+rz*off*sg;
        for(let q=0;q<7;q++){const x=cx+(rnd(q,s)-.5)*7,z=cz+(rnd(s,q)-.5)*7,h=meshH(x,z);if(h<2.6)continue;const nr=nearestRoad(x,z,10);if(nr&&nr.d<nr.e.half+1)continue;
          const sz=.5+rnd(x,z)*.55;vput("grass",x,h-.05,z,rnd(z,x)*TAU,sz*1.3,sz,sz*1.3,GC[Math.floor(rnd(x+1,z)*GC.length)])}}
    }
  }
  // materials and instanced meshes
  const lam=()=>new THREE.MeshLambertMaterial();
  const crownM=lam(),M={trunk:lam(),crown:crownM,crownFar:crownM,shrub:lam(),rock:lam(),
    grass:new THREE.MeshLambertMaterial({map:grassTex(),alphaTest:.5})};
  M.grass.onBeforeCompile=sh=>{sh.uniforms.gT=grassT;
    sh.vertexShader="uniform float gT;\n"+sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*.21+instanceMatrix[3].z*.17;transformed.x+=sin(gT*1.9+ph)*.09*position.y;transformed.z+=cos(gT*1.5+ph)*.06*position.y;\n#endif")};
  // the visible vegetation casts no shadow itself; small shadow-only copies near the car do
  const shadowOnly=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  shadowOnly.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace("#include <project_vertex>","#include <project_vertex>\ngl_Position=vec4(0.,0.,2.,1.);")};
  const col=new THREE.Color();
  const make=(t,layer,shadow)=>{
    const a=t.L[layer];if(!a||!a.length)return;const n=a.length/10,g=VGEO[layer].clone(),m=new THREE.InstancedMesh(g,shadow?shadowOnly:M[layer],n);
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
    const crush=layer==="shrub"||layer==="grass";
    for(let i=0;i<n;i++){const o=i*10;m.setMatrixAt(i,mat(a[o],a[o+1],a[o+2],a[o+3],a[o+4],a[o+5],a[o+6],a[o+8],a[o+9]));m.setColorAt(i,col.setHex(a[o+7]));
      if(crush)crushAdd(m,i,a[o],a[o+2],Math.max(a[o+4],a[o+6])*(layer==="grass"?.4:.75),layer==="grass");
      x0=Math.min(x0,a[o]);x1=Math.max(x1,a[o]);y0=Math.min(y0,a[o+1]);y1=Math.max(y1,a[o+1]+a[o+5]);z0=Math.min(z0,a[o+2]);z1=Math.max(z1,a[o+2])}
    // instanced meshes are culled by their geometry's sphere, so give each one the sphere of its own tile
    g.boundingSphere=new THREE.Sphere(new V3((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),Math.hypot(x1-x0,y1-y0,z1-z0)/2+8);
    m.castShadow=!!shadow;m.receiveShadow=!shadow;m.userData.layer=shadow?"shadow":layer;scene.add(m);t.M.push(m);if(layer!=="crown"||shadow)t.L[layer]=null;
  };
  for(const t of VTL.values()){const cr=t.L.crown;for(const l of ["trunk","crown","shrub","rock"])make(t,l);
    if(cr){t.L.crownFar=cr;make(t,"crownFar")}t.L.crown=t.L.crownFar=null}
  for(const t of GTL.values()){make(t,"grass");t.M.forEach(m=>m.visible=false)}
  for(const t of STL.values()){for(const l of ["trunk","crown","shrub","rock"])make(t,l,true);t.M.forEach(m=>m.visible=false)}
}
// show each layer only within its useful range of the camera
const VRANGE={trunk:1700,crown:260,crownFar:1700,rock:900,shrub:isTouch?420:650,grass:isTouch?120:200};
if(DIAG.near)Object.assign(VRANGE,{trunk:400,crownFar:400,rock:400});
let vegTick=0;
// near crowns are the rounder ones; beyond about 400 m the cheaper ones take over
function updateVegetation(dt){
  grassT.value+=dt;if(state==="DRIVE")updateCrush(dt);
  if((vegTick=(vegTick+1)%6)!==0)return;
  if(typeof cullParked==="function"&&state!=="GARAGE")cullParked();
  const cx=camera.position.x,cz=camera.position.z;
  for(const t of VTL.values()){const d=Math.hypot(t.cx-cx,t.cz-cz)-VT*.71;for(const m of t.M){const l=m.userData.layer;m.visible=l==="crownFar"?d>=VRANGE.crown&&d<VRANGE.crownFar:d<VRANGE[l]}}
  for(const t of GTL.values()){const d=Math.hypot(t.cx-cx,t.cz-cz)-GT*.71,v=d<VRANGE.grass;for(const m of t.M)m.visible=v}
  const px=P.x,pz=P.z;for(const t of STL.values()){const v=Math.hypot(t.cx-px,t.cz-pz)-ST*.71<120;for(const m of t.M)m.visible=v}
}

/* ================================================================ SEA
   Water coloured by depth (turquoise shallows to deep blue), two drifting
   wave layers for the sun's glitter, foam along the waterline, the Sentinel Rock
   rock off the south-west coast and boats in the bays. */
const seaU={wO1:{value:new THREE.Vector2()},wO2:{value:new THREE.Vector2()}};
let foam=null,seaT=0;const BOATS=[];
function waveNormalTex(){
  const N=256,img=new ImageData(N,N),W=[];
  for(let k=0;k<14;k++){const fx=Math.round((rnd(k,1)-.5)*14),fy=Math.round((rnd(k,2)-.5)*14)||1;const f=Math.hypot(fx,fy);W.push([fx,fy,1/Math.pow(f,1.2),rnd(k,3)*TAU])}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let dx=0,dy=0;
    for(const[fx,fy,a,ph]of W){const ang=TAU*(fx*x+fy*y)/N+ph,c=Math.cos(ang)*a*TAU/N;dx+=c*fx;dy+=c*fy}
    const s=22,nx=-dx*s,ny=-dy*s,l=Math.hypot(nx,ny,1),i=(y*N+x)*4;
    img.data[i]=(nx/l*.5+.5)*255;img.data[i+1]=(ny/l*.5+.5)*255;img.data[i+2]=(1/l*.5+.5)*255;img.data[i+3]=255}
  const c=document.createElement("canvas");c.width=c.height=N;c.getContext("2d").putImageData(img,0,0);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.LinearEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function buildSea(){
  const SZ=9000,SEG=180,g=new THREE.PlaneGeometry(SZ,SZ,SEG,SEG).rotateX(-Math.PI/2),p=g.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color();
  const sh=new THREE.Color(0x52c4bc),mid=new THREE.Color(0x1f97b0),dp=new THREE.Color(0x0e5f8c),deep=new THREE.Color(0x0a4473);
  for(let i=0;i<p.count;i++){const d=-Hf(p.getX(i),p.getZ(i));
    if(d<4)c.copy(sh).lerp(mid,smooth(.5,4,d));else if(d<9)c.copy(mid).lerp(dp,smooth(4,9,d));else c.copy(dp).lerp(deep,smooth(9,11,d)+smooth(1200,2600,Math.hypot(p.getX(i),p.getZ(i)))*.5);
    col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
  g.setAttribute("color",new THREE.BufferAttribute(col,3));
  const m=new THREE.MeshPhongMaterial({vertexColors:true,transparent:true,opacity:.86,shininess:240,specular:0xdfeef5,normalMap:waveNormalTex(),normalScale:new THREE.Vector2(.42,.42)});
  m.onBeforeCompile=s=>{Object.assign(s.uniforms,seaU);
    // Three r128 expands shader includes after onBeforeCompile. Edit the normal-map
    // chunk itself so both scrolling samples reach the compiled fragment shader.
    const waveChunk=THREE.ShaderChunk.normal_fragment_maps.replace(
      "vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;",
      `vec3 swell = texture2D(normalMap, vUv * ${(SZ/46).toFixed(1)} + wO1).xyz * 2.0 - 1.0;
       vec3 ripple = texture2D(normalMap, vUv * ${(SZ/17).toFixed(1)} + wO2).xyz * 2.0 - 1.0;
       vec3 mapN = normalize(swell + 0.55 * ripple);`);
    s.fragmentShader="uniform vec2 wO1,wO2;\n"+s.fragmentShader.replace("#include <normal_fragment_maps>",waveChunk);
  };
  water=new THREE.Mesh(g,m);water.receiveShadow=true;scene.add(water);
  buildFoam();buildVedra();buildBoats();
}
// a ribbon along the waterline, found by walking out from the coast on each bearing
function waterline(a){const cx=Math.cos(a),cz=Math.sin(a);let lo=Math.max(50,coastR(cx*1000,cz*1000)-220),hi=lo+420;
  if(Hf(cx*hi,cz*hi)>.15)return null;
  for(let k=0;k<30;k++){const md=(lo+hi)/2;if(Hf(cx*md,cz*md)>.15)lo=md;else hi=md}return(lo+hi)/2}
function foamTex(){
  const c=document.createElement("canvas");c.width=512;c.height=64;const x=c.getContext("2d");
  for(let i=0;i<700;i++){const px=Math.random()*512,py=Math.pow(Math.random(),1.6)*64,r=1+Math.random()*5*(1-py/64);
    x.fillStyle=`rgba(255,255,255,${.35+Math.random()*.5})`;for(const o of [-512,0,512]){x.beginPath();x.ellipse(px+o,py,r*2.2,r,0,0,TAU);x.fill()}}
  const g=x.createLinearGradient(0,0,0,64);g.addColorStop(0,"rgba(255,255,255,.55)");g.addColorStop(.25,"rgba(255,255,255,.15)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.fillRect(0,0,512,64);
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;return t;
}
function buildFoam(){
  const N=1500,P=[],U=[],I=[];let prev=null,cum=0;
  for(let k=0;k<=N;k++){const a=k/N*TAU,r=waterline(a);
    if(r===null){prev=null;continue}
    const cx=Math.cos(a),cz=Math.sin(a),x=cx*r,z=cz*r;
    if(prev)cum+=Math.hypot(x-prev[0],z-prev[1]);
    const base=P.length/3;
    P.push(cx*(r-2.5),.07,cz*(r-2.5),cx*(r+7),.07,cz*(r+7));U.push(cum/14,1,cum/14,0);
    if(prev)I.push(base-2,base,base-1,base-1,base,base+1);
    prev=[x,z];
  }
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(U,2));
  g.setAttribute("normal",new THREE.Float32BufferAttribute(new Array(P.length).fill(0).map((v,i)=>i%3===1?1:0),3));g.setIndex(I);
  foam=new THREE.Mesh(g,new THREE.MeshLambertMaterial({map:foamTex(),transparent:true,depthWrite:false,opacity:.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));
  foam.renderOrder=2;scene.add(foam);
}
// Es Vedrà: a sheer limestone islet off the south-west coast, with Es Vedranell beside it
const ISLETS=[];
function rockIslet(cx,cz,yaw,L,Wd,H,seed){
  ISLETS.push({cx,cz,yaw,L,Wd});
  const g=new THREE.PlaneGeometry(L*1.5,Wd*1.7,64,40).rotateX(-Math.PI/2),p=g.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color();
  const cs=Math.cos(yaw),sn=Math.sin(yaw);
  for(let i=0;i<p.count;i++){const lx=p.getX(i),lz=p.getZ(i),e=Math.hypot((lx-L*.08)/(L*.5),lz/(Wd*.5));
    const n=fbm(lx*.035+seed,lz*.035+seed*2);let h=e<1?H*Math.pow(1-e,.42)*(.72+.5*n):-9;
    if(e<1&&e>.82)h=Math.min(h,H*.25*(1-e)/.18+1);
    p.setXYZ(i,cx+lx*cs+lz*sn,h,cz-lx*sn+lz*cs)}
  g.computeVertexNormals();const nm=g.attributes.normal;
  for(let i=0;i<p.count;i++){const h=p.getY(i),up=nm.getY(i),n=fbm(p.getX(i)*.05,p.getZ(i)*.05);
    if(h<1.2)c.setRGB(.72,.66,.54);else if(up>.72&&h>8)c.setRGB(.36+n*.12,.40+n*.1,.22);else c.setRGB(.66+n*.12,.6+n*.1,.5+n*.08);
    c.convertSRGBToLinear();col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
  g.setAttribute("color",new THREE.BufferAttribute(col,3));
  const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true}));m.receiveShadow=true;m.castShadow=true;scene.add(m);
}
function buildVedra(){
  const a=2.45,r=waterline(a)||coastR(-700,600),cx=Math.cos(a),cz=Math.sin(a);
  rockIslet(cx*(r+360),cz*(r+360),a+Math.PI/2+.25,240,120,150,3);
  rockIslet(cx*(r+250)+Math.cos(a+1.6)*190,cz*(r+250)+Math.sin(a+1.6)*190,a+Math.PI/2-.4,130,60,52,8);
}
// boats: merged into one mesh each; anchored ones bob in the bays, a few cruise offshore with a wake
function hullGeo(L,Wd,D){
  const s=new THREE.Shape();s.moveTo(-Wd/2,-L/2);s.lineTo(Wd/2,-L/2);s.lineTo(Wd/2,L*.12);s.quadraticCurveTo(Wd*.48,L*.42,0,L/2);s.quadraticCurveTo(-Wd*.48,L*.42,-Wd/2,L*.12);s.lineTo(-Wd/2,-L/2);
  return new THREE.ExtrudeGeometry(s,{depth:D,bevelEnabled:false,curveSegments:6}).rotateX(-Math.PI/2);
}
function boatGeo(kind){
  const it=[];const B=(w,h,d,x,y,z,c)=>it.push({g:GEO.box,m:mat(x,y,z,0,w,h,d),c});
  if(kind==="sail"){
    it.push({g:hullGeo(11,3.4,1.5),m:mat(0,-.5,0),c:0xf4f4f0});
    it.push({g:hullGeo(10.4,2.9,.08),m:mat(0,1.0,0),c:0xb58e5e});
    B(2.2,.8,3.4,0,1.4,.6,0xf4f4f0);B(2.25,.22,3.0,0,1.5,.6,0x24313a);
    it.push({g:GEO.pole,m:mat(0,8,-.6,0,.9,14,.9),c:0xd8d8d8});
    const sail=new THREE.Shape();sail.moveTo(0,0);sail.lineTo(0,12.5);sail.lineTo(-4.6,0);sail.lineTo(0,0);
    const sg=new THREE.ShapeGeometry(sail);sg.rotateY(Math.PI/2);it.push({g:sg,m:mat(0,1.9,-.7),c:0xfbfbf7});
    const jib=new THREE.Shape();jib.moveTo(0,0);jib.lineTo(0,11.5);jib.lineTo(4.2,0);jib.lineTo(0,0);
    const jg=new THREE.ShapeGeometry(jib);jg.rotateY(Math.PI/2);it.push({g:jg,m:mat(0,1.9,-1.0),c:0xf1efe8});
  }else{
    it.push({g:hullGeo(17,4.6,2.2),m:mat(0,-.6,0),c:0xfafafa});
    B(4.2,.12,15,0,1.62,-.2,0x1d2c3a);
    B(3.9,1.7,8.5,0,2.4,1.4,0xf7f7f5);B(3.95,.6,8.2,0,2.6,1.4,0x1a232b);
    B(3.2,1.2,5,0,3.7,2.4,0xf4f4f2);B(3.25,.4,4.6,0,3.8,2.4,0x1a232b);
    B(3.6,.1,4.2,0,4.35,1.8,0xe8e8e6);B(.12,1.8,.12,0,5.1,3.2,0xd8d8d8);
  }
  return merge(it);
}
function buildBoats(){
  const bm=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),geos={sail:boatGeo("sail"),yacht:boatGeo("yacht")};
  const wakeG=(()=>{const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute([0,-.1,4, 7,-.1,48, -7,-.1,48, -1.6,-.1,4.5, 1.6,-.1,4.5, 0,-.1,12],3));
    g.setAttribute("uv",new THREE.Float32BufferAttribute([.5,0,0,1,1,1,.5,0,0,0,1,0],2));g.computeVertexNormals();return g})();
  const wakeM=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
  let placed=0;
  for(let k=0;k<70&&placed<16;k++){
    const a=rnd(k,41)*TAU,r=waterline(a);if(r===null)continue;
    const d=r+60+rnd(k,42)*170,x=Math.cos(a)*d,z=Math.sin(a)*d;if(Hf(x,z)>-3)continue;
    if(BOATS.some(b=>Math.hypot(b.x-x,b.z-z)<60))continue;
    const kind=rnd(k,43)<.6?"sail":"yacht",m=new THREE.Mesh(geos[kind],bm);m.castShadow=true;scene.add(m);
    BOATS.push({m,x,z,yaw:rnd(k,44)*TAU,ph:rnd(k,45)*TAU,move:false});placed++;
  }
  for(let k=0;k<5;k++){
    const kind=k%2?"sail":"yacht",m=new THREE.Mesh(geos[kind],bm);m.castShadow=true;scene.add(m);
    const w=new THREE.Mesh(wakeG,wakeM);m.add(w);
    BOATS.push({m,a:rnd(k,51)*TAU,off:300+rnd(k,52)*200,sp:(kind==="sail"?4:8)*(k%3?1:-1),ph:rnd(k,53)*TAU,move:true,x:0,z:0,yaw:0});
  }
}
// cruising route: a loop offshore that swings wide around Es Vedrà and Es Vedranell
const VEDRA_A=2.5;
function cruisePos(a,off){const k=smooth(.5,.22,Math.abs(wrapA(a-VEDRA_A))),r=coastR(Math.cos(a)*1000,Math.sin(a)*1000)+off+k*(680-off);return[Math.cos(a)*r,Math.sin(a)*r]}
function updateSea(dt){
  seaT+=dt;if(BOAT.m&&!BOAT.on)boatPlace(0);
  seaU.wO1.value.set(seaT*.011,seaT*.006);seaU.wO2.value.set(-seaT*.008,seaT*.013);
  if(foam){foam.material.opacity=.62+.22*Math.sin(seaT*1.1);foam.material.map.offset.x=seaT*.01;foam.material.map.offset.y=Math.sin(seaT*.55)*.08}
  const cx=camera.position.x,cz=camera.position.z;
  for(const b of BOATS){
    if(b.move){const p0=cruisePos(b.a,b.off);b.a+=b.sp/Math.hypot(p0[0],p0[1])*dt;const p1=cruisePos(b.a,b.off),p2=cruisePos(b.a+.002*Math.sign(b.sp),b.off);
      b.x=p1[0];b.z=p1[1];b.yaw=Math.atan2(p2[0]-p1[0],p2[1]-p1[1])}
    const far=Math.hypot(b.x-cx,b.z-cz)>1800;b.m.visible=!far;if(far)continue;
    b.m.position.set(b.x,.15+Math.sin(seaT*.8+b.ph)*.18,b.z);
    b.m.rotation.set(Math.sin(seaT*.7+b.ph)*.02,b.yaw+Math.PI,Math.sin(seaT*.6+b.ph*1.3)*.035);
  }
}

/* ================================================================ ROADSIDE
   Dry-stone walls (pared seca) along the country lanes, steel guardrails
   wherever the road runs above a drop, wooden utility poles with sagging
   wires, red-and-white chevron boards on sharp bends and speed-limit signs.
   Built per 640 m tile into a few merged meshes. */
const RTL=new Map();
function rtl(x,z){const i=Math.floor(x/VT),j=Math.floor(z/VT),k=i+","+j;let t=RTL.get(k);if(!t)RTL.set(k,t={wall:gcol(),rail:gcol(),sign:gcol(),solid:[],wire:[],glow:[]});return t}
function gcol(){return{P:[],N:[],U:[],I:[],n:0}}
// a quad a-b-c-d (any winding); turned so its face points along `out`
function gquad(c,a,b,cc,d,out,uv){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=d[0]-a[0],vy=d[1]-a[1],vz=d[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  let q=[a,b,cc,d],t=uv;
  if(nx*out[0]+ny*out[1]+nz*out[2]<0){q=[a,d,cc,b];t=[uv[0],uv[3],uv[2],uv[1]];nx=-nx;ny=-ny;nz=-nz}
  for(let k=0;k<4;k++){c.P.push(q[k][0],q[k][1],q[k][2]);c.N.push(nx,ny,nz);c.U.push(t[k][0],t[k][1])}
  c.I.push(c.n,c.n+1,c.n+2,c.n,c.n+2,c.n+3);c.n+=4;
}
function gbuild(c){const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(c.P,3));g.setAttribute("normal",new THREE.Float32BufferAttribute(c.N,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(c.U,2));g.setIndex(c.I);return g}

function stoneTex(){
  const W=256,H=128,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  x.fillStyle="#4f483f";x.fillRect(0,0,W,H);
  const cols=["#b9ae99","#a99f8a","#c6bdaa","#9b917e","#b3a58b","#d0c7b4","#8f8676"];
  let y=0;while(y<H){const rh=14+Math.random()*16;let px=-20;
    while(px<W){const w=18+Math.random()*30,h=rh*(.75+Math.random()*.3);
      for(const o of [0,W,-W]){x.fillStyle=cols[Math.floor(Math.random()*cols.length)];x.beginPath();
        const cx=px+w/2+o,cy=y+rh/2,pts=7;for(let k=0;k<pts;k++){const a=k/pts*TAU,rr=.82+Math.random()*.2;x.lineTo(cx+Math.cos(a)*w/2*rr,cy+Math.sin(a)*h/2*rr)}x.closePath();x.fill();
        x.fillStyle="rgba(255,255,255,.12)";x.fillRect(cx-w*.3,cy-h*.38,w*.5,h*.16)}
      px+=w+1.5}
    y+=rh}
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}
// sign faces: chevron, 60, 90, 120 limits, grey back
function signAtlas(){
  const c=document.createElement("canvas");c.width=1024;c.height=512;const x=c.getContext("2d");
  const slot=(i,f)=>{x.save();x.translate((i%4)*256,Math.floor(i/4)*256);f();x.restore()};
  slot(0,()=>{x.fillStyle="#c8102e";x.fillRect(8,8,240,240);x.fillStyle="#fff";
    for(const o of [-56,30]){x.beginPath();x.moveTo(70+o,40);x.lineTo(150+o,128);x.lineTo(70+o,216);x.lineTo(110+o,216);x.lineTo(190+o,128);x.lineTo(110+o,40);x.closePath();x.fill()}
    x.strokeStyle="#fff";x.lineWidth=8;x.strokeRect(12,12,232,232)});
  for(const [i,n] of /** @type {[number, string][]} */ ([[1,"60"],[2,"90"],[3,"120"]]))slot(i,()=>{x.fillStyle="#fff";x.beginPath();x.arc(128,128,118,0,TAU);x.fill();
    x.strokeStyle="#d0102c";x.lineWidth=30;x.beginPath();x.arc(128,128,100,0,TAU);x.stroke();
    x.fillStyle="#111";x.font="bold "+(n.length>2?86:104)+"px Arial,Helvetica,sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText(n,128,134)});
  slot(4,()=>{x.fillStyle="#8b9096";x.beginPath();x.arc(128,128,118,0,TAU);x.fill()});
  slot(5,()=>{x.fillStyle="#8b9096";x.fillRect(8,8,240,240)});
  const t=new THREE.CanvasTexture(c);t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}
const SLOT=i=>[(i%4)/4,1-Math.floor(i/4)/2];
function signBoard(x,y,z,yaw,w,h,slot,back,mirror,backMirror){
  const t=rtl(x,z),cs=Math.cos(yaw),sn=Math.sin(yaw),ax=cs*w/2,az=-sn*w/2,nx=sn,nz=cs;
  const a=[x-ax,y,z-az],b=[x+ax,y,z+az],cc=[x+ax,y+h,z+az],d=[x-ax,y+h,z-az];
  const [u0,v1]=SLOT(slot),u1=u0+.25,v0=v1-.5,uv=mirror?[[u1,v0],[u0,v0],[u0,v1],[u1,v1]]:[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
  gquad(t.sign,a,b,cc,d,[nx,0,nz],uv);
  const off=.03,[bu0,bv1]=SLOT(back),bu1=bu0+.25,bv0=bv1-.5;
  gquad(t.sign,[a[0]-nx*off,a[1],a[2]-nz*off],[b[0]-nx*off,b[1],b[2]-nz*off],[cc[0]-nx*off,cc[1],cc[2]-nz*off],[d[0]-nx*off,d[1],d[2]-nz*off],[-nx,0,-nz],backMirror?[[bu0,bv0],[bu1,bv0],[bu1,bv1],[bu0,bv1]]:[[bu1,bv0],[bu0,bv0],[bu0,bv1],[bu1,bv1]]);
  // thin sign posts give way, so they are not solid
  t.solid.push({g:GEO.pole,m:mat(x-nx*.08,y-1.1+h/2,z-nz*.08,0,.55,2.2+h,.55),c:0x9aa0a6});
}

function buildRoadside(){
  const nearOther=(x,z,e,lim)=>{const nr=nearestRoad(x,z,lim+8);return nr&&nr.e!==e&&nr.d<nr.e.half+lim};
  const clearOfPlaces=(x,z)=>!inTown(x,z)&&Math.hypot(x-HOUSE.x-15,z-HOUSE.z)>70&&Math.hypot(x-DEALER.x,z-DEALER.z)>60;
  for(const e of EDGES){
    if(e.type==="drive"||e.type==="town")continue;
    const country=e.type==="country"||e.type==="coast";
    // ---- guardrails where the road stands above a drop
    for(const sg of [-1,1]){
      const run=[];const flush=()=>{if(run.length>=3)railRun(e,sg,run.slice());run.length=0};
      for(let s=2;s<e.len-2;s+=4){
        if(!edgeFree(e,s,4)){flush();continue}
        const p=edgePos(e,s),rx=-p.dz*sg,rz=p.dx*sg,ry=edgeY(e,s)+YO,ox=p.x+rx*(e.half+30),oz=p.z+rz*(e.half+30);
        const drop=ry-meshH(ox,oz);
        if(drop>5&&!nearOther(ox,oz,e,2))run.push(s);else flush();
      }
      flush();
    }
    if(!country)continue;
    // ---- dry-stone walls in 40 m pieces, on stretches of open, fairly level country
    for(let s0=6;s0<e.len-40;s0+=40){
      if(!edgeFree(e,s0,14)||!edgeFree(e,s0+40,14))continue;
      for(const sg of [-1,1]){
        if(rnd(s0*.13+sg,e.len*.7)>.5)continue;
        const o=e.half+2.7+rnd(s0,sg+3)*1.2,pts=[];let ok=true;
        for(let s=s0;s<=s0+40;s+=4){const p=edgePos(e,s),rx=-p.dz*sg,rz=p.dx*sg,x=p.x+rx*o,z=p.z+rz*o,gy=meshH(x,z),ry=edgeY(e,s);
          if(Math.abs(gy-ry)>1.8||!clearOfPlaces(x,z)||nearOther(x,z,e,1.5)||gy<2.6){ok=false;break}pts.push({x,z,gy,rx,rz})}
        if(ok&&pts.length>2)wallRun(pts,.85+rnd(s0,sg)*.3);
      }
    }
    // ---- utility poles every 42 m on one side, with two sagging wires between them
    if(e.type==="country"&&e.len>120){let prev=null;
      for(let s=14;s<e.len-14;s+=42){
        if(!edgeFree(e,s,8)){prev=null;continue}
        const p=edgePos(e,s),rx=-p.dz,rz=p.dx,o=e.half+5.4,x=p.x+rx*o,z=p.z+rz*o,gy=meshH(x,z);
        if(!clearOfPlaces(x,z)||nearOther(x,z,e,2)||Math.abs(gy-edgeY(e,s))>3){prev=null;continue}
        const t=rtl(x,z),yaw=Math.atan2(p.dx,p.dz);
        t.solid.push({g:GEO.pole,m:mat(x,gy+3.8,z,0,1.6,8,1.6),c:0x6d5c4a});
        t.solid.push({g:GEO.box,m:mat(x,gy+7.4,z,yaw+Math.PI/2,1.8,.12,.12),c:0x5e4f40});
        addCircle(x,z,.28);
        // a street light on the pole, its arm reaching out over the verge towards the road
        const hx=x-rx*3.4,hz=z-rz*3.4;
        t.solid.push({g:GEO.box,m:mat(x-rx*1.7,gy+6.45,z-rz*1.7,Math.atan2(rx,rz),.12,.12,3.5),c:0x5d6268});
        t.glow.push({g:GEO.ball,m:mat(hx,gy+6.3,hz,0,.32,.14,.32),c:0xffffff});
        LAMPS.push({x:hx,z:hz,y:gy+6.3,r:10});
        const ends=[-.8,.8].map(k=>[x+rx*k,gy+7.5,z+rz*k]);
        if(prev&&Math.hypot(prev[0][0]-ends[0][0],prev[0][2]-ends[0][2])<60)
          for(let w=0;w<2;w++){const A=prev[w],B=ends[w];for(let q=0;q<8;q++){const f0=q/8,f1=(q+1)/8,sag=f=>Math.sin(f*Math.PI)*.9;
            t.wire.push(A[0]+(B[0]-A[0])*f0,A[1]+(B[1]-A[1])*f0-sag(f0),A[2]+(B[2]-A[2])*f0,A[0]+(B[0]-A[0])*f1,A[1]+(B[1]-A[1])*f1-sag(f1),A[2]+(B[2]-A[2])*f1)}}
        prev=ends;
      }
    }
  }
  // ---- chevrons on the outside of sharp bends, and speed limits
  for(const e of EDGES){
    if(e.type==="drive"||e.type==="town")continue;
    const hd=s=>{const p=edgePos(e,s);return Math.atan2(p.dx,p.dz)};
    let lastC=-1e9;
    for(let s=20;s<e.len-20;s+=6){
      const k=wrapA(hd(s+15)-hd(s-15))/30;
      if(Math.abs(k)<1/75||s-lastC<70||!edgeFree(e,s,10))continue;
      // apex of this bend: the sharpest point within the next 30 m
      let best=s,bk=Math.abs(k);for(let q=s;q<Math.min(e.len-20,s+30);q+=3){const kk=Math.abs(wrapA(hd(q+15)-hd(q-15))/30);if(kk>bk){bk=kk;best=q}}
      lastC=best;const sg=k<0?-1:1;
      for(let j=-2;j<=2;j++){const sq=best+j*9;if(sq<8||sq>e.len-8)continue;
        const p=edgePos(e,sq),rx=-p.dz*sg,rz=p.dx*sg,o=e.half+1.5,x=p.x+rx*o,z=p.z+rz*o;
        if(nearOther(x,z,e,1))continue;
        signBoard(x,edgeY(e,sq)+YO+1.05,z,Math.atan2(-p.dx,-p.dz),.8,.8,0,0,k>0,k<0)}
    }
    // speed limits every ~450 m, one for each direction of travel
    const lim=e.type==="highway"?3:e.type==="coast"?2:1;
    for(let s=60;s<e.len-60;s+=450)for(const dir of [1,-1]){
      const sq=s+(dir>0?0:30);if(!edgeFree(e,sq,15))continue;
      const p=edgePos(e,sq),rx=-p.dz*dir,rz=p.dx*dir,o=e.half+1.6,x=p.x+rx*o,z=p.z+rz*o;
      if(nearOther(x,z,e,1)||!clearOfPlaces(x,z))continue;
      signBoard(x,edgeY(e,sq)+YO+1.5,z,Math.atan2(-p.dx*dir,-p.dz*dir),.9,.9,lim,4,false);
    }
  }
  // ---- merge per tile
  const wallM=new THREE.MeshLambertMaterial({map:stoneTex()});
  const railM=new THREE.MeshPhongMaterial({color:0xc2c7cc,specular:0x6a6e72,shininess:38});
  const signM=new THREE.MeshLambertMaterial({map:signAtlas(),alphaTest:.5});
  const solidM=new THREE.MeshLambertMaterial({vertexColors:true}),wireM=new THREE.LineBasicMaterial({color:0x2b2b2b});
  for(const t of RTL.values()){
    for(const [k,m,cast] of [["wall",wallM,true],["rail",railM,true],["sign",signM,true]])if(t[k].n){const q=new THREE.Mesh(gbuild(t[k]),m);q.castShadow=cast;q.receiveShadow=true;scene.add(q)}
    if(t.solid.length){const q=new THREE.Mesh(merge(t.solid),solidM);q.castShadow=true;q.receiveShadow=true;scene.add(q)}
    if(t.wire.length){const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(t.wire,3));scene.add(new THREE.LineSegments(g,wireM))}
    if(t.glow.length)scene.add(new THREE.Mesh(merge(t.glow),lampMat));
  }
  buildLampPools();   // every street lamp is placed by now: town, highway and coast lamps, and the pole lights
}
function wallRun(pts,H){
  const t=rtl(pts[0].x,pts[0].z),th=.32;let cum=0;
  for(let i=0;i<pts.length-1;i++){
    const A=pts[i],B=pts[i+1],L=Math.hypot(B.x-A.x,B.z-A.z),u0=cum/1.9,u1=(cum+L)/1.9;cum+=L;
    const hA=H*(.92+.16*rnd(A.x,A.z)),hB=H*(.92+.16*rnd(B.x,B.z));
    const ai=[A.x-A.rx*th,A.gy-.3,A.z-A.rz*th],bi=[B.x-B.rx*th,B.gy-.3,B.z-B.rz*th],ao=[A.x+A.rx*th,A.gy-.3,A.z+A.rz*th],bo=[B.x+B.rx*th,B.gy-.3,B.z+B.rz*th];
    const ait=[ai[0],A.gy+hA,ai[2]],bit=[bi[0],B.gy+hB,bi[2]],aot=[ao[0],A.gy+hA,ao[2]],bot=[bo[0],B.gy+hB,bo[2]];
    gquad(t.wall,ai,bi,bit,ait,[-A.rx,0,-A.rz],[[u0,0],[u1,0],[u1,1],[u0,1]]);
    gquad(t.wall,ao,bo,bot,aot,[A.rx,0,A.rz],[[u0,0],[u1,0],[u1,1],[u0,1]]);
    gquad(t.wall,ait,bit,bot,aot,[0,1,0],[[u0,.8],[u1,.8],[u1,1],[u0,1]]);
    addBox((A.x+B.x)/2,(A.z+B.z)/2,th+.1,L/2,Math.atan2(B.x-A.x,B.z-A.z));
  }
  for(const [P,Q] of [[pts[0],pts[1]],[pts[pts.length-1],pts[pts.length-2]]]){
    const dx=P.x-Q.x,dz=P.z-Q.z,l=Math.hypot(dx,dz)||1,h=H*.95;
    gquad(t.wall,[P.x-P.rx*th,P.gy-.3,P.z-P.rz*th],[P.x+P.rx*th,P.gy-.3,P.z+P.rz*th],[P.x+P.rx*th,P.gy+h,P.z+P.rz*th],[P.x-P.rx*th,P.gy+h,P.z-P.rz*th],[dx/l,0,dz/l],[[0,0],[.3,0],[.3,1],[0,1]]);
  }
}
function railRun(e,sg,ss){
  const first=ss[0]-4,last=ss[ss.length-1]+4,list=[];for(let s=Math.max(1,first);s<=Math.min(e.len-1,last);s+=4)list.push(s);
  const o=e.half+1.15,P=list.map(s=>{const p=edgePos(e,s),rx=-p.dz*sg,rz=p.dx*sg;return{x:p.x+rx*o,z:p.z+rz*o,y:edgeY(e,s)+YO,rx,rz}});
  const t=rtl(P[0].x,P[0].z);
  for(let i=0;i<P.length;i++){const A=P[i];
    t.solid.push({g:GEO.box,m:mat(A.x+A.rx*.14,A.y+.38,A.z+A.rz*.14,Math.atan2(A.rx,A.rz),.12,.8,.1),c:0x7d8288});
    if(i===P.length-1)break;const B=P[i+1],L=Math.hypot(B.x-A.x,B.z-A.z);
    // W-beam: two faces folded along a crease, facing the road and the drop
    for(const [y0,y1,i0,i1] of [[.5,.66,0,.07],[.66,.82,.07,0]]){
      const a=[A.x-A.rx*i0,A.y+y0,A.z-A.rz*i0],b=[B.x-B.rx*i0,B.y+y0,B.z-B.rz*i0],c=[B.x-B.rx*i1,B.y+y1,B.z-B.rz*i1],d=[A.x-A.rx*i1,A.y+y1,A.z-A.rz*i1];
      gquad(t.rail,a,b,c,d,[-A.rx,0,-A.rz],[[0,0],[1,0],[1,1],[0,1]]);
      const bk=.05;gquad(t.rail,[a[0]+A.rx*bk,a[1],a[2]+A.rz*bk],[b[0]+B.rx*bk,b[1],b[2]+B.rz*bk],[c[0]+B.rx*bk,c[1],c[2]+B.rz*bk],[d[0]+A.rx*bk,d[1],d[2]+A.rz*bk],[A.rx,0,A.rz],[[0,0],[1,0],[1,1],[0,1]]);
    }
    addBox((A.x+B.x)/2,(A.z+B.z)/2,.2,L/2,Math.atan2(B.x-A.x,B.z-A.z));
  }
}
