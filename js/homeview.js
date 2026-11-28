// Port Meridien: Your home, drawn: the mezzanine furnished from js/home.js's catalogue and rules, and DESIGN HOME, an
// overhead view of it with a grid, a preview of each piece where it would go, and a panel to buy, move, turn and sell
// pieces and to choose the walls and the floor.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope (see docs/CODE_LAYOUT.md).
"use strict";
if(window.__gameOff)throw window.__gameOff;

// on: designing. sel: the catalogue piece being placed, pick: the index of the placed piece picked, r: the turn for a
// new piece, at: the cell the preview stands on, tap: the cell a touch first previewed (a second touch there places)
const HV={on:false,sel:null,pick:-1,r:0,at:null,pin:null,tap:null,down:null,stickAt:0,ptrs:new Set(),multi:false,group:"beds",root:null,meshes:[],ghost:null,mark:null,grid:null,floor:null,wall:null,geo:new Map(),roofs:[]};
const HV_GROUPS=[["beds","BEDS"],["seating","SEATING"],["tables","TABLES"],["kitchen","KITCHEN"],["fun","FUN"],["decor","DECOR"],["room","ROOM"]];
const HV_WALL={plaster:0xe9e2d4,sage:0xb4c3a7,sand:0xe2cca0,slate:0x8b98a2},HV_FLOOR={oak:0xb48a5a,tile:0xd9d4c8,concrete:0x9b9d9b,walnut:0x6a4730};
const HV_MAT=new THREE.MeshLambertMaterial({vertexColors:true});
const HV_GHOST=new THREE.MeshBasicMaterial({color:0x6fd08a,transparent:true,opacity:.5,depthWrite:false});
const HV_CYL=new THREE.CylinderGeometry(.5,.5,1,12);
// garage-local metres to world and back (js/world.js: gW), and a cell's footprint centre for a piece
const hvLocal=p=>({x:HOUSE.z-p.z,z:p.x-HOUSE.x});
function hvSpot(id,x,z,r){const q=homeRect(id,x,z,r);return gW(HOME_ORIGIN.x+(x+q.w/2)*HOME_CELL,HOME_ORIGIN.z+(z+q.d/2)*HOME_CELL,HOME_ORIGIN.y+.02)}

// Each piece in its own frame: centred on its footprint, its base at 0, its front towards -z (towards the railing
// when it isn't turned). Boxes and cylinders, merged into one mesh a piece (js/world.js: merge), so a furnished room
// is a draw a piece
function hvParts(id,W,D,H){
  const P=[],b=(w,h,d,x,y,z,c,ry=0,rz=0)=>P.push({g:GEO.box,m:mat(x,y+h/2,z,ry,w,h,d,0,rz),c}),
    cy=(r,h,x,y,z,c)=>P.push({g:HV_CYL,m:mat(x,y+h/2,z,0,r*2,h,r*2),c});
  const WOOD=0xa47a4c,DARK=0x5e4029,WHITE=0xf1efe9,LINEN=0xe7ddcb,METAL=0x8b9196,BLACK=0x26292c;
  const bed=(blanket,pillows)=>{b(W,.28,D,0,0,0,WOOD);b(W-.08,.2,D-.12,0,.28,.02,WHITE);b(W,.95,.08,0,0,D/2-.04,DARK);
    b(W-.04,.07,D*.55,0,.46,-D/2+D*.3,blanket);
    for(let i=0;i<pillows;i++)b((W-.3)/pillows-.06,.1,.3,-W/2+.15+(i+.5)*(W-.3)/pillows,.48,D/2-.3,LINEN)};
  const legs=(h,c,inset=.08)=>{for(const sx of[-1,1])for(const sz of[-1,1])b(.05,h,.05,sx*(W/2-inset),0,sz*(D/2-inset),c)};
  switch(id){
    case"single":bed(0x4f7a9a,1);break;
    case"double":bed(0xa8553f,2);break;
    case"daybed":b(W,.3,D,0,0,0,WOOD);b(W-.06,.2,D-.06,0,.3,0,LINEN);b(.1,.5,D,W/2-.05,.5,0,WOOD);
      for(const z of[-.6,0,.6])b(.18,.26,.5,W/2-.2,.5,z,0xc9a46a);break;
    case"canopy":b(W-.3,.3,D-.3,0,0,0,WOOD);b(W-.4,.22,D-.4,0,.3,0,WHITE);b(W-.36,.06,(D-.4)*.6,0,.52,-(D-.4)*.2,0x7d5a8c);
      for(const x of[-.35,.35])b(.55,.1,.3,x,.52,D/2-.45,LINEN);
      for(const sx of[-1,1])for(const sz of[-1,1])b(.08,H,.08,sx*(W/2-.06),0,sz*(D/2-.06),DARK);
      for(const sz of[-1,1])b(W,.06,.06,0,H-.06,sz*(D/2-.06),DARK);for(const sx of[-1,1])b(.06,.06,D,sx*(W/2-.06),H-.06,0,DARK);
      b(W-.1,.03,D-.1,0,H-.03,0,LINEN);break;
    case"stool":cy(.21,.44,0,0,0,0xc7a26a);cy(.22,.06,0,.44,0,0xa8844f);break;
    case"armchair":b(W-.1,.42,D-.1,0,0,0,0x5c7d6b);b(W-.36,.12,D-.32,0,.42,-.06,0x6f927d);b(W-.1,.55,.18,0,.42,D/2-.14,0x5c7d6b);
      for(const sx of[-1,1])b(.16,.25,D-.2,sx*(W/2-.13),.42,0,0x5c7d6b);break;
    case"sofa":b(W-.06,.4,D-.1,0,0,0,0x3f5a78);for(const sx of[-1,1])b(W/2-.22,.13,D-.36,sx*(W/4-.04),.4,-.08,0x55729a);
      b(W-.06,.5,.2,0,.4,D/2-.15,0x3f5a78);for(const sx of[-1,1])b(.18,.28,D-.16,sx*(W/2-.12),.4,0,0x3f5a78);break;
    case"bench":b(W-.04,.08,D-.08,0,.4,0,WOOD);b(W-.12,.06,D-.16,0,.48,0,0xb8312f);for(const sx of[-1,1])b(.08,.4,D-.12,sx*(W/2-.1),0,0,DARK);break;
    case"side":cy(.15,.03,0,0,0,DARK);cy(.035,.5,0,.03,0,DARK);cy(.23,.04,0,.51,0,WOOD);break;
    case"coffee":b(W-.04,.05,D-.04,0,.4,0,WOOD);legs(.4,DARK);b(.26,.04,.18,.2,.45,0,0xb8312f);break;
    case"dining":b(W-.04,.05,D-.04,0,.7,0,WOOD);legs(.7,DARK,.1);cy(.13,.07,0,.75,0,WHITE);break;
    case"desk":b(W-.04,.05,D-.2,0,.7,.08,WOOD);b(.45,.7,D-.24,W/2-.26,0,.08,0x8a6440);
      for(const sz of[-1,1])b(.06,.7,.06,-(W/2-.07),0,.08+sz*(D/2-.2),DARK);b(.3,.02,.22,-.2,.75,.05,WHITE);break;
    case"fridge":b(W-.1,H,D-.12,0,0,.04,WHITE);b(W-.12,.015,.015,0,1.18,-D/2+.1,0xb9b7b1);
      for(const[y,h]of[[1.35,.36],[.55,.5]])b(.04,h,.04,W/2-.17,y,-D/2+.08,METAL);break;
    case"icebox":b(W-.06,H,D-.1,0,0,0,0xd6e4e8);b(.03,.3,.03,W/2-.1,.42,-D/2+.04,METAL);break;
    case"counter":b(W-.04,.86,D-.06,0,0,.01,0x7f9aa8);b(W,.05,D,0,.86,0,0xe6e1d6);b(.012,.6,.012,0,.16,-D/2+.02,0x5c7480);
      cy(.07,.16,.25,.91,0,METAL);break;
    case"pantry":b(W-.04,H,D-.06,0,0,.01,0x8a6a48);b(.012,H-.2,.012,0,.1,-D/2+.02,DARK);for(const sx of[-1,1])b(.03,.06,.03,sx*.06,1,-D/2+.01,METAL);break;
    case"tv":b(W-.04,.45,D-.06,0,0,0,DARK);b(1.3,.75,.05,0,.5,.06,BLACK);b(1.22,.67,.012,0,.54,.03,0x2c5674);b(.8,.06,.08,0,.45,-.1,BLACK);break;
    case"computer":b(W-.04,.05,.6,0,.72,D/2-.32,WHITE);for(const sx of[-1,1])for(const z of[D/2-.06,D/2-.58])b(.05,.72,.05,sx*(W/2-.07),0,z,METAL);
      b(.62,.38,.04,0,.92,D/2-.2,BLACK);b(.58,.34,.01,0,.94,D/2-.223,0x2f6a96);b(.06,.15,.06,0,.77,D/2-.17,BLACK);
      b(.42,.02,.14,0,.77,D/2-.45,0x3a3f44);
      cy(.25,.04,0,0,-D/2+.32,BLACK);cy(.03,.42,0,.04,-D/2+.32,METAL);cy(.24,.07,0,.46,-D/2+.32,BLACK);b(.4,.45,.06,0,.53,-D/2+.08,BLACK);break;
    case"records":b(W-.04,.7,D-.06,0,0,0,WOOD);b(.42,.08,.36,-.12,.7,0,BLACK);cy(.15,.02,-.12,.78,0,0x161616);b(.32,.12,.32,.22,.7,0,0xc47a2c);break;
    case"books":{for(const sx of[-1,1])b(.04,H,D-.04,sx*(W/2-.02),0,0,WOOD);b(W,.04,D-.04,0,H-.04,0,WOOD);
      const C=[0xb8312f,0x2b5d87,0x2f6b4f,0xc47a2c,0x7d5a8c,0xe6e1d6];
      for(let s=0;s<4;s++){const y=.02+s*.42;b(W-.08,.03,D-.08,0,y,0,WOOD);for(let k=0;k<6;k++)b(.12,.28+((k*7+s*3)%4)*.02,D-.16,-W/2+.14+k*.14,y+.03,0,C[(k+s)%C.length])}
      break}
    case"palm":cy(.24,.4,0,0,0,0xb5653f);cy(.22,.03,0,.38,0,0x4a3424);cy(.045,.75,0,.4,0,0x6e5236);
      for(let k=0;k<6;k++){const a=k/6*TAU;b(.8,.03,.17,Math.cos(a)*.34,1.1,-Math.sin(a)*.34,k%2?0x3f7a3a:0x4f8a44,a,-.5)}break;
    case"lamp":cy(.15,.03,0,0,0,BLACK);cy(.018,1.28,0,.03,0,METAL);cy(.2,.3,0,1.28,0,0xf3e6c4);break;
    case"vase":cy(.12,.36,0,0,0,0x5d8aa8);cy(.07,.08,0,.36,0,0x5d8aa8);
      for(const[x,z,c]of[[-.05,0,0xae4666],[.05,.03,0xd8b23a],[0,-.05,0xcc687c]]){b(.012,.22,.012,x,.42,z,0x4f7a3a);b(.06,.06,.06,x,.62,z,c)}break;
    case"screen":for(const[x,z,ry]of[[-.48,.06,.35],[0,-.04,-.35],[.48,.06,.35]]){b(.5,H-.04,.03,x,.02,z,LINEN,ry);b(.52,.04,.05,x,H-.04,z,DARK,ry)}break;
    // a cork board on two posts, with the postcards found pinned on its front, four to a row in the album's order
    case"postcard-board":{for(const sx of[-1,1])b(.06,H,.06,sx*(W/2-.05),0,.04,DARK);
      b(W-.04,.74,.06,0,H-.84,.04,DARK);b(W-.12,.66,.03,0,H-.8,.02,0x8a5c34);
      const found=typeof postcardBoardCards==="function"?postcardBoardCards():[],ids=POSTCARDS.map(c=>c.id);
      const PIC=[0xe98a5a,0x5d8aa8,0x7a9a5a,0xd8b23a,0xb8452f,0x7a5a8a,0x3d6b78,0xcc687c,0x8a6440,0x4f8a44,0x2f6f8f,0xa8553f];
      for(const id of found){const k=found.indexOf(id),col=k%4,row=Math.floor(k/4),x=-.33+col*.22,y=H-.28-row*.2;
        b(.18,.13,.012,x,y,.002,0xf4ecd8,(k%3-1)*.04);b(.16,.07,.006,x,y+.045,-.006,PIC[ids.indexOf(id)%PIC.length],(k%3-1)*.04)}
      break}
    default:b(W,H,D,0,0,0,WOOD);
  }
  return P;
}
function hvGeo(id){
  // (the board looks different with each card found: one shape for each album)
  const key=id==="postcard-board"&&typeof postcardBoardCards==="function"?id+":"+postcardBoardCards().join(","):id;
  if(!HV.geo.has(key)){const it=homeById.get(id);HV.geo.set(key,merge(hvParts(id,it.w*HOME_CELL,it.d*HOME_CELL,it.height)))}
  return HV.geo.get(key);
}
// the room's own finishes: a floor laid over the mezzanine's slab, and the back wall's paint behind it
function hvRoom(){
  if(HV.root)return;
  HV.root=new THREE.Group();scene.add(HV.root);
  const L=HOME_COLS*HOME_CELL,Dp=HOME_ROWS*HOME_CELL,cx=HOME_ORIGIN.x+L/2,cz=HOME_ORIGIN.z+Dp/2;
  HV.floor=new THREE.Mesh(GEO.box,new THREE.MeshLambertMaterial({color:HV_FLOOR.oak}));HV.floor.scale.set(L,.02,Dp);
  HV.floor.position.copy(gW(cx,cz,HOME_ORIGIN.y+.01));HV.floor.rotation.y=gYaw;HV.floor.receiveShadow=true;HV.root.add(HV.floor);
  HV.wall=new THREE.Mesh(GEO.box,new THREE.MeshLambertMaterial({color:HV_WALL.plaster}));HV.wall.scale.set(L,4.95,.04);
  HV.wall.position.copy(gW(cx,29.72,HOME_ORIGIN.y+2.5));HV.wall.rotation.y=gYaw;HV.root.add(HV.wall);
  // the design grid, half a metre a square, and the places kept clear shaded red
  const pts=[],at=(x,z)=>{const p=gW(HOME_ORIGIN.x+x*HOME_CELL,HOME_ORIGIN.z+z*HOME_CELL,HOME_ORIGIN.y+.035);pts.push(p.x,p.y,p.z)};
  for(let x=0;x<=HOME_COLS;x++){at(x,0);at(x,HOME_ROWS)}for(let z=0;z<=HOME_ROWS;z++){at(0,z);at(HOME_COLS,z)}
  const lg=new THREE.BufferGeometry();lg.setAttribute("position",new THREE.Float32BufferAttribute(pts,3));
  HV.grid=new THREE.Group();HV.grid.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.28})));
  const keep=new THREE.MeshBasicMaterial({color:0xd0503f,transparent:true,opacity:.28,depthWrite:false});
  for(const a of HOME_CLEAR){const m=new THREE.Mesh(GEO.box,keep);m.scale.set(a.w*HOME_CELL,.01,a.d*HOME_CELL);
    m.position.copy(gW(HOME_ORIGIN.x+(a.x+a.w/2)*HOME_CELL,HOME_ORIGIN.z+(a.z+a.d/2)*HOME_CELL,HOME_ORIGIN.y+.03));m.rotation.y=gYaw;HV.grid.add(m)}
  HV.grid.visible=false;HV.root.add(HV.grid);
  HV.ghost=new THREE.Mesh(hvGeo("stool"),HV_GHOST);HV.ghost.visible=false;HV.root.add(HV.ghost);
  HV.mark=new THREE.Mesh(GEO.box,new THREE.MeshBasicMaterial({color:0xe6b84a,transparent:true,opacity:.55,depthWrite:false}));HV.mark.visible=false;HV.root.add(HV.mark);
}
// the room as the save has it: called at the start, and after every change
function homeBuild(){
  hvRoom();
  for(const m of HV.meshes)HV.root.remove(m);HV.meshes.length=0;
  save.home.items.forEach((p,i)=>{const m=new THREE.Mesh(hvGeo(p.id),HV_MAT);m.position.copy(hvSpot(p.id,p.x,p.z,p.r));m.rotation.y=gYaw-p.r*Math.PI/2;
    m.castShadow=m.receiveShadow=true;m.userData.index=i;HV.root.add(m);m.updateMatrixWorld(true);HV.meshes.push(m)});
  HV.floor.material.color.setHex(HV_FLOOR[save.home.floor]||HV_FLOOR.oak);HV.wall.material.color.setHex(HV_WALL[save.home.wall]||HV_WALL.plaster);
  if(HV.pick>=save.home.items.length)HV.pick=-1;
  hvMarks();
  // a guest waiting at home sits on (or stands by) what's there now
  if(typeof guestSync==="function"&&(GUEST.who||typeof PARTY!=="undefined"&&PARTY.active))guestSync();
}
// only inside the house (and on the way out of it): from the road the room would be a dozen draws for nothing
function hvShow(s){if(HV.root)HV.root.visible=s==="GARAGE"||s==="EXIT"||s==="LOAD"}

/* ---------- designing ---------- */
const hvCam=()=>{
  // steeply down over the room (66°), far enough back for it to fit the part of the screen above the panel, and aimed
  // so it sits there. On a wide screen from the railing side, the room's 21 m across; held upright, from its end, the
  // 21 m up the screen (from the railing side a phone saw it a third the size). camera.zoom widens the view when upright
  const asp=W/H,t=Math.tan(25*Math.PI/180)/camera.zoom,ph=Math.min(.6,($("hd").offsetHeight+28)/H),tall=asp<.9,
    across=tall?6.8:12.5,up=tall?10.8:6.5,L=Math.max(across/(t*asp),up/(t*(1-ph))),s=ph*L*t*1.1;
  const look=tall?gW(HOME_ORIGIN.x+10.5+s,HOME_ORIGIN.z+5.5,HOME_ORIGIN.y):gW(HOME_ORIGIN.x+10.5,HOME_ORIGIN.z+5.5-s,HOME_ORIGIN.y),
    dir=(tall?gW(Math.cos(1.15),0,Math.sin(1.15)):gW(0,-Math.cos(1.15),Math.sin(1.15))).sub(gW(0,0,0));
  return{pos:look.clone().addScaledVector(dir,L),look};
};
function hvOpen(){
  // (not under the party's panel: Codex's review of #127)
  if(state!=="GARAGE"||HV.on||cuOpen()||tabIdle||typeof partyOpen==="function"&&partyOpen())return;
  HV.on=true;HV.sel=null;HV.pick=-1;HV.r=0;HV.at=HV.pin=HV.tap=HV.down=null;HV.ptrs.clear();HV.multi=false;GO.stick[0]=GO.stick[1]=0;
  // the ceiling and the roof lift off, as in a dolls' house
  // (everything wholly above 8.3 m: the ceiling, its beams, lamps and light bars, and the roof)
  HV.roofs=HOUSE_MESHES.filter(m=>{if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();return m.visible&&m.position.y+m.geometry.boundingBox.min.y>gY+8.3});
  for(const m of HV.roofs)m.visible=false;
  HV.grid.visible=true;$("gui").classList.add("designing");show("hd",true);hvPanel();hvMarks();
  try{$("hdg_"+HV.group).focus({preventScroll:true})}catch(e){}
}
function hvClose(){
  if(!HV.on)return;HV.on=false;HV.sel=null;HV.pick=-1;HV.at=HV.pin=HV.tap=null;
  for(const m of HV.roofs)m.visible=true;HV.roofs=[];
  if(HV.grid)HV.grid.visible=false;$("gui").classList.remove("designing");show("hd",false);hvMarks();
  try{$("gDesign").focus({preventScroll:true})}catch(e){}
}
const hvMsg=t=>{$("hdMsg").textContent=t};
// the preview over the cell it stands on (green where the piece fits, red where it doesn't), and the picked piece's
// outline on the floor
function hvMarks(){
  if(!HV.ghost)return;
  const id=HV.sel||(HV.pick>=0?save.home.items[HV.pick].id:null),r=HV.sel?HV.r:HV.pick>=0?save.home.items[HV.pick].r:0;
  HV.ghost.visible=HV.on&&!!id&&!!HV.at;
  if(HV.ghost.visible){HV.ghost.geometry=hvGeo(id);HV.ghost.position.copy(hvSpot(id,HV.at.x,HV.at.z,r));HV.ghost.rotation.y=gYaw-r*Math.PI/2;
    HV_GHOST.color.setHex(homeFits(save.home,id,HV.at.x,HV.at.z,r,HV.sel?-1:HV.pick)?0x6fd08a:0xe0614f)}
  const p=HV.pick>=0?save.home.items[HV.pick]:null;HV.mark.visible=HV.on&&!!p;
  if(p){const q=homeRect(p.id,p.x,p.z,p.r);HV.mark.scale.set(q.w*HOME_CELL+.12,.012,q.d*HOME_CELL+.12);HV.mark.position.copy(hvSpot(p.id,p.x,p.z,p.r)).setY(gY+HOME_ORIGIN.y+.04);HV.mark.rotation.y=gYaw}
  if(HV.on){$("hdTurn").disabled=!HV.sel&&HV.pick<0;$("hdSell").disabled=HV.pick<0;hvBuyBtn()}
}
// BUY places the chosen piece where its preview stands (MOVE HERE, for a placed piece picked): there was no button,
// only a click on the floor, so the room couldn't be furnished at all with the keyboard or a controller
function hvBuyBtn(){
  const b=$("hdBuy"),it=HV.sel?homeById.get(HV.sel):null;
  b.textContent=it?"BUY · "+fmtCr(it.price)+" CR":HV.pick>=0?"MOVE HERE":"BUY";
  b.disabled=!HV.at||!it&&HV.pick<0;
}
// a first place for the preview when a piece is chosen: the free spot nearest the middle of the room, else the middle
function hvStart(id,r){
  const q=homeRect(id,0,0,r),cx=Math.round((HOME_COLS-q.w)/2),cz=Math.round((HOME_ROWS-q.d)/2);
  let best=null,far=Infinity;
  for(let z=0;z+q.d<=HOME_ROWS;z++)for(let x=0;x+q.w<=HOME_COLS;x++){const d=Math.hypot(x-cx,z-cz);
    if(d<far&&homeFits(save.home,id,x,z,r,HV.sel?-1:HV.pick)){far=d;best={x,z}}}
  return best||{x:cx,z:cz};
}
// the left stick: a square at a time, about six a second while it's held over
function hvStick(g){
  const x=g.axes[0]||0,y=g.axes[1]||0,now=performance.now();
  if(Math.hypot(x,y)<.5){HV.stickAt=0;return}
  if(HV.stickAt&&now-HV.stickAt<160)return;HV.stickAt=now;
  Math.abs(x)>Math.abs(y)?hvNudge(Math.sign(x),0):hvNudge(0,Math.sign(y));
}
// the arrow keys and the left stick move the preview a square at a time, in the direction they point on screen
function hvNudge(sx,sy){
  const id=HV.sel||(HV.pick>=0?save.home.items[HV.pick].id:null);if(!id)return;
  const r=HV.sel?HV.r:save.home.items[HV.pick].r,q=homeRect(id,0,0,r);
  if(!HV.at){const p=HV.pick>=0&&!HV.sel?save.home.items[HV.pick]:null;HV.at=p?{x:p.x,z:p.z}:hvStart(id,r)}
  camera.updateMatrixWorld();
  const scr=(x,z)=>{const v=hvSpot(id,x,z,r).project(camera);return[v.x,-v.y]},o=scr(HV.at.x,HV.at.z);
  let best=null,dot=0;
  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const s=scr(HV.at.x+dx,HV.at.z+dz),vx=s[0]-o[0],vy=s[1]-o[1],L=Math.hypot(vx,vy)||1,k=(vx*sx+vy*sy)/L;
    if(k>dot){dot=k;best=[dx,dz]}}
  if(!best)return;
  HV.at={x:clamp(HV.at.x+best[0],0,HOME_COLS-q.w),z:clamp(HV.at.z+best[1],0,HOME_ROWS-q.d)};HV.pin={...HV.at};HV.tap=null;hvMarks();
}
// where a pointer meets the room's floor: the cell a piece would stand on, centred there (null off the floor)
const hvRay=new THREE.Raycaster(),hvNdc=new THREE.Vector2(),hvPlane=new THREE.Plane(new V3(0,1,0),0);
function hvAim(cx,cy){
  // (picking goes by where the pieces stand now, even before a frame has drawn them there)
  camera.updateMatrixWorld();hvNdc.set(cx/W*2-1,-(cy/H)*2+1);hvRay.setFromCamera(hvNdc,camera);
  const hit=hvRay.intersectObjects(HV.meshes,false)[0];
  hvPlane.constant=-(gY+HOME_ORIGIN.y);const p=hvRay.ray.intersectPlane(hvPlane,new V3());
  if(!p)return{hit};const l=hvLocal(p),fx=(l.x-HOME_ORIGIN.x)/HOME_CELL,fz=(l.z-HOME_ORIGIN.z)/HOME_CELL;
  if(fx<0||fz<0||fx>HOME_COLS||fz>HOME_ROWS)return{hit};
  const id=HV.sel||(HV.pick>=0?save.home.items[HV.pick].id:"stool"),r=HV.sel?HV.r:HV.pick>=0?save.home.items[HV.pick].r:0,q=homeRect(id,0,0,r);
  return{hit,raw:{x:fx,z:fz},cell:{x:clamp(Math.round(fx-q.w/2),0,HOME_COLS-q.w),z:clamp(Math.round(fz-q.d/2),0,HOME_ROWS-q.d)}};
}
// a tap or a click in the room. With a piece from the catalogue, a click or a touch puts it there to look at; a second on
// the same spot, or BUY, buys it (a click used to buy at once, while the help said to press BUY; Codex's audit). With
// a placed piece picked: the same, to move it. Otherwise a tap on a piece picks it
function hvTap(cx,cy,touch){
  const a=hvAim(cx,cy);
  if(!HV.sel&&a.hit&&a.hit.object.userData.index!==HV.pick){HV.pick=a.hit.object.userData.index;HV.at=HV.pin=null;HV.tap=null;
    const p=save.home.items[HV.pick];hvMsg(homeById.get(p.id).name+" · TURN, SELL, or tap the floor to move it");hvMarks();return}
  // off the floor: a touch waiting for its second tap is cancelled too, or a later single tap on that cell would buy
  if(!a.cell){HV.tap=null;if(!a.hit){HV.pick=-1;HV.at=HV.pin=null;hvMsg("");hvMarks()}return}
  if(!HV.sel&&HV.pick<0){hvMsg("Choose a piece below, or tap one in the room");return}
  // the second click or tap anywhere on the piece shown confirms it there (the same cell exactly was asked for, and a
  // few pixels on, or the camera still settling, gave the next one along)
  const id=HV.sel||save.home.items[HV.pick].id,r=HV.sel?HV.r:save.home.items[HV.pick].r,q=homeRect(id,0,0,r),T=HV.tap;
  if(T&&a.raw.x>=T.x&&a.raw.x<T.x+q.w&&a.raw.z>=T.z&&a.raw.z<T.z+q.d){HV.at={...T};HV.tap=null;hvCommit();return}
  HV.at=a.cell;HV.pin={...a.cell};HV.tap=a.cell;
  hvMsg((touch?"Tap":"Click")+" again or press "+(HV.sel?"BUY to buy it":"MOVE HERE to move it")+" here");hvMarks();
}
function hvCommit(){
  const c=HV.at;if(!c)return;
  if(HV.sel){const it=homeById.get(HV.sel);
    if(save.cr<it.price){hvMsg("You need "+fmtCr(it.price-save.cr)+" more CR");return}
    if(save.home.items.length>=HOME_CAP){hvMsg("The room holds "+HOME_CAP+" pieces at most");return}
    if(!homeFits(save.home,HV.sel,c.x,c.z,HV.r)){hvMsg("It doesn't fit there");beep(220);return}
    if(homePlace(HV.sel,c.x,c.z,HV.r)){HV.at=hvStart(HV.sel,HV.r);HV.pin={...HV.at};homeBuild();hvPanel();hvMsg(it.name+" · −"+fmtCr(it.price)+" CR");beep(760)}
  }else if(HV.pick>=0){
    if(homeMove(HV.pick,c.x,c.z)){HV.at=HV.pin=null;homeBuild();hvMsg("Moved")}else{hvMsg("It doesn't fit there");beep(220)}
  }
  hvMarks();
}
function hvTurn(){
  // (turned, a piece waits for a new confirmation: a click from before paid for it facing the other way; Codex's audit)
  HV.tap=null;
  if(HV.sel){HV.r=(HV.r+1)%4;hvMarks();return}
  if(HV.pick>=0){if(homeTurn(HV.pick)){homeBuild();hvMsg("Turned")}else hvMsg("No room to turn it here")}
  hvMarks();
}
function hvSell(){
  if(HV.pick<0)return;const it=homeById.get(save.home.items[HV.pick].id);
  if(homeSell(HV.pick)){HV.pick=-1;HV.at=HV.pin=null;homeBuild();hvPanel();hvMsg("Sold · +"+fmtCr(Math.floor(it.price*.75))+" CR")}
}
// the panel: the groups, then the pieces in the chosen one (or the room's walls and floor)
function hvPanel(){
  // drawn afresh each time: a button of the panel that had the focus gives it to its new self, so keyboard use carries on
  // from where it was (choosing a card used to drop the focus, and Tab started again from the top)
  const fo=/** @type {HTMLElement} */ (document.activeElement),key=fo&&$("hd").contains(fo)?fo.dataset.k:"";
  hvPanelDraw();
  if(key){const n=/** @type {HTMLElement} */ ($("hd").querySelector('[data-k="'+key+'"]'));if(n)n.focus({preventScroll:true})}
}
function hvPanelDraw(){
  const g=$("hdGroups");g.textContent="";
  for(const[k,label]of HV_GROUPS){const t=document.createElement("button");t.className="hdt"+(k===HV.group?" on":"");t.id="hdg_"+k;t.dataset.k="g:"+k;t.textContent=label;
    t.setAttribute("aria-pressed",String(k===HV.group));t.onclick=()=>{HV.group=k;HV.sel=null;HV.at=HV.pin=null;hvPanel();hvMarks();hvMsg("")};g.appendChild(t)}
  const l=$("hdList");l.textContent="";
  if(HV.group==="room"){
    const FIN=/** @type {[string,string[],Object<string,number>][]} */([["Walls",HOME_WALLS,HV_WALL],["Floor",HOME_FLOORS,HV_FLOOR]]);
    for(const[kind,list,cols]of FIN){
      const lab=document.createElement("span");lab.className="hdk";lab.textContent=kind;l.appendChild(lab);
      for(const f of list){const b=document.createElement("button"),now=kind==="Walls"?save.home.wall===f:save.home.floor===f;
        b.className="hdc hdf"+(now?" on":"");b.dataset.k="f:"+kind+":"+f;b.setAttribute("aria-pressed",String(now));b.innerHTML='<i style="background:#'+cols[f].toString(16).padStart(6,"0")+'"></i>'+f.toUpperCase();
        b.onclick=()=>{if(kind==="Walls"?homeFinish(f,save.home.floor):homeFinish(save.home.wall,f)){homeBuild();hvPanel()}};l.appendChild(b)}}
    return;
  }
  for(const it of HOME_ITEMS){if(it.group!==HV.group)continue;
    const b=document.createElement("button"),fx=it.effect==="rest"?"Better rest":it.effect==="snack"?"SNACK at home":it.effect==="play"?"PLAY at home":"";
    // the postcard board: only once you've found a card, and its comfort grows with the album (js/home.js)
    const locked=typeof homeItemUnlocked==="function"&&!homeItemUnlocked(it.id),cards=it.id==="postcard-board"?postcardBoardCards().length:0;
    b.className="hdc"+(HV.sel===it.id?" on":"")+(save.cr<it.price||locked?" dim":"");b.dataset.k="i:"+it.id;b.setAttribute("aria-pressed",String(HV.sel===it.id));b.disabled=locked;
    b.innerHTML="<b></b><span></span><em></em>";b.children[0].textContent=it.name;b.children[1].textContent=fmtCr(it.price)+" CR";
    b.children[2].textContent=locked?"Find a postcard first":it.id==="postcard-board"?"Comfort +"+(it.comfort+Math.min(8,cards))+" with your "+cards+" card"+(cards===1?"":"s"):fx||"Comfort +"+it.comfort;
    b.onclick=()=>{HV.sel=HV.sel===it.id?null:it.id;HV.pick=-1;HV.r=0;HV.tap=null;HV.at=HV.sel?hvStart(HV.sel,0):null;HV.pin=HV.at&&{...HV.at};hvPanel();hvMarks();
      hvMsg(HV.sel?(isTouch?"Tap the floor to put it there, then BUY · TURN to turn it":"Click the floor or move it with the arrow keys, then BUY (or click again) · TURN or R to turn"):"")};l.appendChild(b)}
}
function hvInit(){
  $("gDesign").onclick=hvOpen;$("hdDone").onclick=hvClose;$("hdBuy").onclick=()=>{HV.tap=null;hvCommit()};$("hdTurn").onclick=hvTurn;$("hdSell").onclick=hvSell;
  const cv=$("c");
  // in front of the garage's own handlers (which turn the view round the car): while designing, the room has the pointer
  // A tap is one pointer going down and up in about the same place. A second finger on the glass cancels the tap in
  // progress and any touch waiting for its second, until every finger is off (a two-finger drag used to count: one
  // finger's release was measured from where the other went down, which could confirm a waiting touch and buy)
  // (the main button only, with a mouse: two middle clicks bought a bed; Codex's audit)
  cv.addEventListener("pointerdown",e=>{if(!HV.on)return;e.stopImmediatePropagation();if(e.pointerType==="mouse"&&e.button!==0)return;HV.ptrs.add(e.pointerId);
    try{cv.setPointerCapture(e.pointerId)}catch(err){}
    if(HV.ptrs.size>1){HV.down=null;HV.multi=true;if(HV.tap){HV.tap=null;hvMsg("");hvMarks()}return}
    HV.down={id:e.pointerId,x:e.clientX,y:e.clientY,touch:e.pointerType!=="mouse"}},true);
  // the mouse's preview follows it over the floor, and goes when it leaves the floor, where a click places nothing
  cv.addEventListener("pointermove",e=>{if(!HV.on)return;e.stopImmediatePropagation();
    if(e.pointerType==="mouse"&&(HV.sel||HV.pick>=0)){const c=hvAim(e.clientX,e.clientY).cell||HV.pin;
      if(c?!HV.at||HV.at.x!==c.x||HV.at.z!==c.z:HV.at){HV.at=c;hvMarks()}}},true);
  // (off the floor, or on the way to BUY, it goes back to the spot clicked, or where it was put; it used to go
  // altogether, and BUY went grey as the mouse reached it)
  cv.addEventListener("pointerleave",e=>{if(HV.on&&e.pointerType==="mouse"&&(HV.sel||HV.pick>=0)){HV.at=HV.pin;hvMarks()}});
  const up=e=>{HV.ptrs.delete(e.pointerId);if(!HV.on)return;e.stopImmediatePropagation();
    const d=HV.down,multi=HV.multi;if(!HV.ptrs.size)HV.multi=false;
    if(!d||d.id!==e.pointerId)return;HV.down=null;
    if(e.type==="pointerup"&&!multi&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<12)hvTap(e.clientX,e.clientY,d.touch)};
  cv.addEventListener("pointerup",up,true);cv.addEventListener("pointercancel",up,true);
  cv.addEventListener("wheel",e=>{if(HV.on){e.stopImmediatePropagation();e.preventDefault()}},{capture:true,passive:false});
  // the keys: R turns, Delete sells the picked piece, Escape lets go of a piece or ends designing. No other handler
  // hears a key meanwhile (the garage's Enter drives off, even on a focused button of the panel), though Tab, Space and
  // Enter still work the panel's buttons, that being their default. The cloud dialog, and typing, keep their own keys
  addEventListener("keydown",e=>{const t=/** @type {HTMLElement} */ (e.target);
    if(!HV.on||tabIdle||clOverlayOpen()||t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
    const k=e.key.toLowerCase();e.stopImmediatePropagation();
    // (an arrow held down moves on, square by square)
    const arrow={arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]}[k];
    if(arrow){e.preventDefault();hvNudge(arrow[0],arrow[1]);return}
    if(k==="tab"||k===" "||k==="enter"||e.repeat)return;
    if(k==="r"){e.preventDefault();hvTurn()}else if(k==="delete"||k==="backspace"){e.preventDefault();hvSell()}
    else if(k==="escape"){e.preventDefault();if(HV.sel||HV.pick>=0){HV.sel=null;HV.pick=-1;HV.at=HV.pin=null;hvPanel();hvMarks();hvMsg("")}else hvClose()}},true);
}
hvInit();
