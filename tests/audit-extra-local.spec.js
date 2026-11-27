const {test,expect}=require("./support/game");

test("parking recovery clears a pursuer if no safe placement can be found",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(()=>{
    const t=TRAFFIC.find(t=>t.cop),e={...EDGES[0],len:20};
    const q=edgePos(e,e.len/2);
    Object.assign(P,{x:q.x,z:q.z});
    Object.assign(t,{e,s:e.len/2,offCur:0,dir:1,wx:q.x,wz:q.z,chase:true});
    const place=copPlace;
    try {
      copPlace=()=>false;
      const dropped=copDrop(t);
      return {dropped,clear:!t.e||Math.hypot(t.wx-P.x,t.wz-P.z)>4,length:e.len};
    }finally{copPlace=place}
  });
  expect(r.clear).toBe(true);
});

test("the desktop floor click only previews when the designer says to confirm with BUY",async({game})=>{
  await game.open();
  const r=await game.eval(()=>{
    hvOpen();$("hdList").querySelector('[data-k="i:single"]').click();
    const message=$("hdMsg").textContent,at={...HV.at},count=save.home.items.length;
    const aim=hvAim;
    try{hvAim=()=>({cell:at,hit:null});hvTap(0,0,false);}
    finally{hvAim=aim}
    return {message,purchases:save.home.items.length-count};
  });
  expect(r.message).toContain("then BUY");
  expect(r.purchases).toBe(0);
});
