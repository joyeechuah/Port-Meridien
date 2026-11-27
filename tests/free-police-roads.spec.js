const { test, expect } = require("./support/game");

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.driveOut();
  await game.eval(() => {
    window.__DTMAX = 1e-9;
    for (const t of TRAFFIC) { t.e = null; t.lost = false; }
  });
});

test("traffic can enter the road a free police car has left, then yields when it returns", async ({ game }) => {
  const open = await game.eval(() => {
    const node = NODES.find(n => n.adj.filter(a => a.e.type !== "drive").length >= 3);
    const [incoming,arm] = node.adj.filter(a => a.e.type !== "drive");
    const car = TRAFFIC.find(t => !t.cop), cop = TRAFFIC.find(t => t.cop);
    car.e = incoming.e;
    const forwards = arm.end === "a";
    Object.assign(cop, {e:arm.e, dir:forwards?1:-1, s:forwards?3:arm.e.len-3,
      free:true, wx:node.x+70, wz:node.z+50});
    const canTurn = () => exitsAt(car,node).free.includes(arm);
    const offRoad = canTurn();
    cop.free = false; const q = edgePos(cop.e,cop.s); cop.wx=q.x; cop.wz=q.z;
    return [offRoad,canTurn()];
  });
  expect(open).toEqual([true,false]);
});

test("resetting near a stood-down free patrol puts it back into road traffic", async ({ game }) => {
  const result = await game.eval(() => {
    resetToRoad(false);
    const cop = TRAFFIC.find(t => t.cop && t.patrol);
    Object.assign(cop,{ e:EDGES[0], s:3, free:true, chase:false, damage:100,
      wx:P.x+2, wz:P.z, v:0, offDuty:true });
    resetToRoad(false);
    // The first placement can fail. Exercise the same retry used by the traffic bubble.
    for (let i=0; cop.lost && i<20; i++) updateTraffic(.51);
    const before=cop.s;
    updateTraffic(1/60);
    return { placed:!!cop.e, repaired:cop.damage===0, free:cop.free, moved:cop.s!==before };
  });
  expect(result).toEqual({placed:true,repaired:true,free:false,moved:true});
});

test("a wreck off the road stays where it is when a race clears oncoming traffic", async ({ game }) => {
  const kept = await game.eval(() => {
    const cop = TRAFFIC.find(t=>t.cop);
    Object.assign(cop,{ e:EDGES[0], s:5, dir:1, free:true, chase:false, damage:100, wx:P.x+50, wz:P.z+50 });
    const before=[cop.wx,cop.wz];
    evDirs=new Map([[cop.e,-1]]);
    clearOncoming();
    return cop.free && cop.wx===before[0] && cop.wz===before[1];
  });
  expect(kept).toBe(true);
});

test("the town traffic cap excludes a free patrol with a stale town road", async ({ game }) => {
  const counts = await game.eval(() => {
    const cop = TRAFFIC.find(t=>t.cop), e=EDGES.find(e=>e.type==="town");
    Object.assign(cop,{ e, free:true, wx:P.x+35, wz:P.z+40 });
    const away=nearTown(cop); cop.free=false;
    return [away,nearTown(cop)];
  });
  expect(counts).toEqual([false,true]);
});
