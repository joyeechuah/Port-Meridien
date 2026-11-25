// Port Meridien: home furniture, placement and comfort rules.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope.
"use strict";
if(window.__gameOff)throw window.__gameOff;

// Garage-local metres. Cell (0,0) starts at the slab's front-left corner.
const HOME_ORIGIN={x:.5,y:5.25,z:19}, HOME_CELL=.5, HOME_COLS=42, HOME_ROWS=22, HOME_CAP=60;
// Half-open rectangles in cells: the front railing, and the landing beside the top stair.
const HOME_CLEAR=[{x:0,z:0,w:42,d:2},{x:0,z:15,w:4,d:4}];
const HOME_WALLS=["plaster","sage","sand","slate"], HOME_FLOORS=["oak","tile","concrete","walnut"];
const homeItem=(id,name,group,price,w,d,height,comfort,effect=null)=>({id,name,group,price,w,d,height,comfort,effect});
const HOME_ITEMS=[
  homeItem("single","Single bed","beds",800,2,4,.65,4,"rest"),
  homeItem("double","Double bed","beds",1600,3,4,.7,8,"rest"),
  homeItem("daybed","Linen daybed","beds",1200,2,4,.8,6,"rest"),
  homeItem("canopy","Canopy bed","beds",3000,4,4,2.3,12,"rest"),
  homeItem("stool","Woven stool","seating",160,1,1,.5,2),
  homeItem("armchair","Reading chair","seating",640,2,2,.95,6),
  homeItem("sofa","Harbour sofa","seating",1200,4,2,.9,10),
  homeItem("bench","Window bench","seating",400,3,1,.55,4),
  homeItem("side","Side table","tables",200,1,1,.55,1),
  homeItem("coffee","Coffee table","tables",360,2,1,.45,2),
  homeItem("dining","Dining table","tables",800,3,2,.75,4),
  homeItem("desk","Writing desk","tables",600,3,2,.75,3),
  homeItem("fridge","Kitchen fridge","kitchen",1400,2,2,1.8,0,"snack"),
  homeItem("icebox","Compact fridge","kitchen",800,1,2,.85,0,"snack"),
  homeItem("counter","Prep counter","kitchen",520,2,1,.9,2),
  homeItem("pantry","Pantry cabinet","kitchen",720,2,1,1.9,3),
  homeItem("tv","Television stand","fun",1600,3,1,1.2,0,"play"),
  homeItem("computer","Computer workstation","fun",2000,3,2,1.4,0,"play"),
  homeItem("records","Record cabinet","fun",640,2,1,.95,5),
  homeItem("books","Library shelf","fun",560,2,1,1.7,5),
  homeItem("palm","Potted palm","decor",320,2,2,1.5,5),
  homeItem("lamp","Floor lamp","decor",200,1,1,1.6,3),
  homeItem("vase","Stoneware vase","decor",120,1,1,.6,2),
  homeItem("screen","Folding screen","decor",480,3,1,1.7,4)
];
const homeById=new Map(HOME_ITEMS.map(item=>[item.id,item]));
function homeRect(id,x,z,r){
  const item=homeById.get(id);
  return {x,z,w:r%2?item.d:item.w,d:r%2?item.w:item.d};
}
const homeOverlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.z<b.z+b.d&&b.z<a.z+a.d;
// r counts clockwise quarter turns. x,z always locate the minimum corner after rotation.
function homeFits(plan,id,x,z,r,skip=-1){
  if(!homeById.has(id)||![x,z,r].every(Number.isInteger)||r<0||r>3)return false;
  const rect=homeRect(id,x,z,r);
  return x>=0&&z>=0&&x+rect.w<=HOME_COLS&&z+rect.d<=HOME_ROWS&&
    !HOME_CLEAR.some(area=>homeOverlap(rect,area))&&
    !plan.items.some((p,i)=>i!==skip&&homeOverlap(rect,homeRect(p.id,p.x,p.z,p.r)));
}
function homeClean(raw){
  const plan={v:1,wall:HOME_WALLS[0],floor:HOME_FLOORS[0],items:[]};
  if(!raw||Array.isArray(raw)||raw.v!==1)return plan;
  if(HOME_WALLS.includes(raw.wall))plan.wall=raw.wall;
  if(HOME_FLOORS.includes(raw.floor))plan.floor=raw.floor;
  if(Array.isArray(raw.items))for(const key of Object.keys(raw.items)){
    // Sparse imported arrays may have an enormous length but only a few actual entries.
    if(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=raw.items.length)continue;
    const p=raw.items[key];
    if(p&&homeFits(plan,p.id,p.x,p.z,p.r))plan.items.push({id:p.id,x:p.x,z:p.z,r:p.r});
    if(plan.items.length===HOME_CAP)break;
  }
  return plan;
}
save.home=homeClean(save.home);
function homeHas(plan,effect){return plan.items.some(p=>homeById.get(p.id).effect===effect)}
function homeComfort(plan){return Math.min(100,plan.items.reduce((sum,p)=>sum+homeById.get(p.id).comfort,0))}
function homeProgress(raw){
  const plan=homeClean(raw);
  if(!plan.items.length&&plan.wall===HOME_WALLS[0]&&plan.floor===HOME_FLOORS[0])return null;
  // Selection indices are local to the editor. Placement order has no bearing on the layout.
  plan.items.sort((a,b)=>a.z-b.z||a.x-b.x);
  return plan;
}
const homeEditable=()=>state==="GARAGE"&&!tabIdle&&!(CL&&CL.applying);
function homePlace(id,x,z,r=0){
  const p=save.home,item=homeById.get(id);
  if(!homeEditable()||!item||save.cr<item.price||p.items.length>=HOME_CAP||!homeFits(p,id,x,z,r))return false;
  p.items.push({id,x,z,r});save.cr-=item.price;wantEvent("place");homeChanged();return true;
}
function homeMove(index,x,z,r=undefined){
  const plan=save.home,p=plan.items[index];
  if(!homeEditable()||!Number.isInteger(index)||!p)return false;
  if(r===undefined)r=p.r;
  if(!homeFits(plan,p.id,x,z,r,index))return false;
  Object.assign(p,{x,z,r});homeChanged();return true;
}
function homeTurn(index){
  const p=save.home.items[index];
  return Number.isInteger(index)&&!!p&&homeMove(index,p.x,p.z,(p.r+1)%4);
}
function homeSell(index){
  const p=save.home.items[index];
  if(!homeEditable()||!Number.isInteger(index)||!p)return false;
  save.cr+=Math.floor(homeById.get(p.id).price*.75);save.home.items.splice(index,1);homeChanged();return true;
}
// Finishes are free, but count as progress even in an unfurnished room.
function homeFinish(wall,floor){
  if(!homeEditable()||!HOME_WALLS.includes(wall)||!HOME_FLOORS.includes(floor))return false;
  save.home.wall=wall;save.home.floor=floor;homeChanged();return true;
}
