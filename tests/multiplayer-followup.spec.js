const {test,expect}=require("@playwright/test");
const fs=require("node:fs"),vm=require("node:vm");
function part(file,start,end){
  const source=fs.readFileSync(require.resolve("../js/"+file+".js"),"utf8");
  const a=source.indexOf(start),b=source.indexOf(end,a);
  if(a<0||b<0)throw Error(start);
  return source.slice(a,b);
}
// In-memory transport with the local server's broadcast-to-all behavior.
// Hold the 400 ms handshake callbacks so the two join windows really overlap.
function room(){
  const sockets=new Set(),timers=[];
  let next=0;
  class Socket{
    constructor(){sockets.add(this);queueMicrotask(()=>this.onopen())}
    close(){sockets.delete(this)}
  }
  const g=vm.createContext({EventSource:Socket,NET:{MAX:4},netNewCode:()=>String(++next),
    fetch:async(url,req)=>{for(const socket of sockets)socket.onmessage?.({data:req.body})},
    setTimeout:fn=>timers.push(fn)});
  vm.runInContext(part("net","function netRelay(","/* ---------- joining"),g);
  const transport=()=>vm.runInContext("netRelay()",g);
  const flush=async()=>{await new Promise(setImmediate);timers.splice(0).forEach(f=>f());await new Promise(setImmediate)};
  async function member(create=false){
    const tx=transport(),joined=tx.open("ABCD",create,{state(){},leave(){}});
    await flush();await joined;tx.put({m:0});return tx;
  }
  return {transport,flush,member};
}
test("concurrent local joins cannot both take the fourth place",async()=>{
  const r=room();await r.member(true);await r.member();await r.member();
  const join=()=>r.transport().open("ABCD",false,{state(){},leave(){}});
  const results=Promise.allSettled([join(),join()]);await r.flush();
  expect((await results).filter(x=>x.status==="fulfilled")).toHaveLength(1);
});
test("a local room whose last host leaves during discovery is no longer joinable",async()=>{
  const r=room(),host=await r.member(true);
  const result=Promise.allSettled([r.transport().open("ABCD",false,{state(){},leave(){}})]);
  await new Promise(setImmediate);host.close();await r.flush();
  expect((await result)[0].status).toBe("rejected");
});
test("a stopped tab releases its occupied multiplayer seat",()=>{
  let closed=0;
  const g={NET:{room:"ABCD",tx:{close(){closed++}},peers:new Map()},tabIdle:false,state:"GARAGE",AC:null,
    clearInput(){},audioOn(){},show(){},$:()=>({focus(){}}),netNote(){}};
  vm.runInNewContext(part("net","function netLeave()",'addEventListener("pagehide"')+
    part("screens","function tabStop()","// by BroadcastChannel")+"tabStop()",g);
  expect(closed).toBe(1);
});
test("equivalent Unicode spellings produce the same multiplayer name",()=>{
  const normalize=vm.runInNewContext(part("net","const netName=","const netMyName")+"netName");
  expect(normalize("Inês".normalize("NFD"))).toBe(normalize("Inês"));
});
test("the green navigation light is on the motorboat's starboard side",()=>{
  const lamps={};
  vm.runInNewContext(part("people","// port and starboard lights at the bow","const wk="),{
    THREE:{BoxGeometry:class{}},red:"red",green:"green",bp:(geometry,color,x)=>{lamps[color]=x}
  });
  // With the bow at +Z and world up at +Y, bow cross up is -X (right).
  expect(lamps.green).toBeLessThan(lamps.red);
});
