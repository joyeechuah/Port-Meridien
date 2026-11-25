// Port Meridien: paid shifts at the Market Kitchen.
// One of the game's scripts in js/, loaded in order by index.html; they share one global scope.
"use strict";
if(window.__gameOff)throw window.__gameOff;

const WORK_ITEMS=["Bread","Bowl","Stew"];
const WORK={active:false,panel:false,served:0,wait:0,cool:save.work.cool,hp:0,label:""};
function workNear(){
  const k=QUAY.kitchen;
  return FOOT.on&&!BOAT.on&&k&&Math.hypot(FOOT.x-k.x,FOOT.z-k.z)<=FOOT_V.reach;
}
function workAvailable(){
  return state==="DRIVE"&&!document.hidden&&workNear()&&!WANTED.lvl&&!ev&&!job&&!testDrive&&!TALK.p&&!SIT.on;
}
function workClose(){
  if(!WORK.panel)return;
  WORK.panel=false;show("work",false);
  if(state==="DRIVE"&&workNear())$("prompt").focus({preventScroll:true});
}
function workCancel(){
  WORK.active=false;WORK.served=WORK.wait=0;workClose();
}
function workStart(){
  if(!WORK.panel||WORK.active||WORK.cool>0||!workAvailable())return false;
  WORK.active=true;WORK.served=WORK.wait=0;WORK.hp=HEALTH.hp;
  workRender();$("wk0").focus();return true;
}
function workServe(i){
  if(!WORK.panel||!WORK.active)return false;
  if(!workAvailable()||HEALTH.hp<WORK.hp){workCancel();return false}
  if(WORK.wait>0)return false;
  if(i!==WORK.served){$("wkStatus").textContent="Still waiting for "+WORK_ITEMS[WORK.served].toLowerCase()+".";return false}
  if(++WORK.served===WORK_ITEMS.length){
    WORK.cool=120;save.work.cool=120;save.work.completed=Math.min(9999,save.work.completed+1);
    const pay=Math.round(300*skillFactor("cooking"));skillAward("cooking",25);
    workCancel();earn(pay);toast("SHIFT COMPLETE","+"+pay+" CR","gold");
  }else{WORK.wait=10;workRender()}
  return true;
}
// Only called for active simulation time. Integers go into the save while the live remainder keeps its fraction.
function workTick(dt){
  if(state!=="DRIVE"||document.hidden||!(dt>0))return;
  const reduce=v=>v-dt<1e-8?0:v-dt;
  WORK.cool=reduce(WORK.cool);save.work.cool=Math.ceil(WORK.cool);
  if(!WORK.active&&!WORK.panel)return;
  if(!workNear()||WANTED.lvl||WORK.active&&HEALTH.hp<WORK.hp){workCancel();return}
  if(WORK.active)WORK.wait=reduce(WORK.wait);
  if(WORK.panel)workRender();
}
function workOpen(){
  if(state!=="DRIVE"||!workNear()||WANTED.lvl)return false;
  clearInput();FOOT.v=0;TALK.fireHold=true;WORK.panel=true;WORK.label="";
  show("work",true);workRender();$(WORK.active?"wk0":"wkEat").focus();return true;
}
function workRender(){
  const a=WORK.active,w=Math.ceil(WORK.wait),c=Math.ceil(WORK.cool);
  const text=a?(w?"Next order in "+w+" s":"Order "+(WORK.served+1)+" of 3: "+WORK_ITEMS[WORK.served]):"Eat here or take a short shift.";
  const available=workAvailable(),key=[a,text,c,available].join("|");
  if(key===WORK.label)return;
  WORK.label=key;$("wkStatus").textContent=text;
  show("wkEat",!a);show("wkStart",!a);show("wkOrders",a);show("wkLeave",a);
  const b=$("wkStart");b.disabled=c>0||!available;b.textContent=c?"Next shift in "+c+" s":"Work a shift · "+Math.round(300*skillFactor("cooking"))+" CR";
}
function workButtons(){return Array.from($("work").querySelectorAll("button")).filter(b=>b.offsetParent&&!b.disabled)}
function workKey(e,k){
  if(!WORK.panel)return false;
  if(k==="tab"||k==="enter"||k===" "){
    if(k==="tab"){
      const bs=workButtons();if(bs.length)bs[(bs.indexOf(document.activeElement)+(e.shiftKey?-1:1)+bs.length)%bs.length].focus();
    }else if(!e.repeat&&workButtons().includes(document.activeElement))document.activeElement.click();
  }else if(!e.repeat){
    if(k==="escape"||k==="e")workClose();
    else if(/^[1-3]$/.test(k))workServe(Number(k)-1);
    else if(k==="p"){workClose();pauseOn()}
    else if(k==="m"){workClose();openMap()}
    else if(k==="v"){workClose();photoEnter()}
  }
  e.preventDefault();return true;
}
function workPad(hit){
  if(hit(1)){workClose();return}
  if(hit(9)){workClose();pauseOn();return}
  if(hit(8)){workClose();openMap();return}
  const bs=workButtons(),i=bs.indexOf(document.activeElement);
  const d=hit(12)||hit(14)?-1:hit(13)||hit(15)?1:0;
  if(bs.length&&d)bs[(i+d+bs.length)%bs.length].focus();
  else if(hit(0)&&i>=0)bs[i].click();
}
$("wkEat").onclick=()=>{if(WORK.panel&&!WORK.active&&workNear()){workClose();kitchenMeal()}};
$("wkStart").onclick=workStart;$("wkLeave").onclick=workCancel;$("wkClose").onclick=workClose;
WORK_ITEMS.forEach((_,i)=>{$("wk"+i).onclick=()=>workServe(i)});
