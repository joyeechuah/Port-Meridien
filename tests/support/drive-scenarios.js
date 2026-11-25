// Each function also runs in page.evaluate, so it must be self-contained.
function measureBends(T = globalThis.__T) {
  const P = T.P,
    out = {};
  for (const t of T.TRAFFIC || []) {
    t.e = null;
    t.lost = false; // else spawnTraffic brings it back mid-test
    t.c.G.visible = false;
    t.wx = t.wz = 1e6;
  }
  T.save.assist = true;
  T.save.auto = false;
  const S = T.save.side === "R" ? 1 : -1;
  for (const id of ["golf", "gtr"]) {
    T.attachCar(id);
    let peak = 0,
      drops = 0,
      runs = 0;
    for (const e of T.EDGES.filter((e) => e.type !== "drive" && e.len > 500))
      for (const dirS of [1, -1]) {
        const lane = T.RT[e.type].lanes[0],
          q = T.edgePos(e, dirS > 0 ? 35 : e.len - 35),
          ux = q.dx * dirS,
          uz = q.dz * dirS;
        P.x = q.x - uz * lane * S;
        P.z = q.z + ux * lane * S;
        P.h = Math.atan2(ux, uz);
        P.vx = P.vz = P.vy = 0;
        P.r = P.steer = P.steerS = P.thr = P.brkT = P.holdT = P.holdDir = 0;
        P.laneT = null;
        P.air = false;
        for (const k in T.keys) T.keys[k] = false;
        const sp = [];
        for (let i = 0; i < 1200; i++) {
          T.keys.w = true;
          T.driveUpdate(1 / 60);
          const nr = T.nearestRoad(P.x, P.z, 20);
          if (!nr || nr.e !== e) break;
          sp.push(Math.hypot(P.vx, P.vz));
        }
        runs++;
        for (let i = 60; i < sp.length; i++) peak = Math.max(peak, sp[i - 60] - sp[i]);
        // 50 km/h or more gone within 4 s
        for (let i = 0; i + 240 < sp.length; i += 30)
          if (sp[i] - Math.min(...sp.slice(i, i + 240)) > 50 / 3.6) {
            drops++;
            i += 210;
          }
      }
    out[id] = { peak: +peak.toFixed(2), drops, runs };
  }
  T.keys.w = false;
  return out;
}

function measureJunctions(T = globalThis.__T) {
  const P = T.P,
    out = [],
    ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  for (const t of T.TRAFFIC || []) {
    t.e = null;
    t.lost = false; // else spawnTraffic brings it back mid-test
    t.c.G.visible = false;
    t.wx = t.wz = 1e6;
  }
  T.save.assist = true;
  T.save.auto = false;
  T.attachCar("gtr");
  const S = T.save.side === "R" ? 1 : -1;
  // every T-junction in town met head on: a straight street of 130 m or more into it, roads both ways out
  for (const n of T.NODES) {
    if (n.adj.length !== 3) continue;
    for (const a of n.adj) {
      const e = a.e;
      if (e.type !== "town" || e.len < 140) continue;
      const toB = n === e.b,
        dirS = toB ? 1 : -1,
        sAt = (d) => (toB ? e.len - d : d),
        h = (d) => {
          const q = T.edgePos(e, sAt(d));
          return Math.atan2(q.dx * dirS, q.dz * dirS);
        };
      let straight = true;
      for (let d = 10; d <= 130; d += 10) if (Math.abs(ang(h(d) - h(10))) > 0.15) straight = false;
      const h0 = h(10),
        exits = n.adj
          .filter((b) => b !== a)
          .map((b) => {
            const q2 = T.edgePos(b.e, b.end === "a" ? 12 : b.e.len - 12);
            return { e: b.e, turn: ang(Math.atan2(q2.x - n.x, q2.z - n.z) - h0) };
          });
      if (!straight || exits.some((x) => Math.abs(x.turn) < 1.2)) continue;
      // the turn begun about a turning circle out, and late, at the zebra crossing
      for (const ex of exits)
        for (const lead of [1, 0.6]) {
          const lane = T.RT[e.type].lanes[0],
            q = T.edgePos(e, sAt(130)),
            ux = q.dx * dirS,
            uz = q.dz * dirS,
            hx = h0 + ex.turn;
          P.x = q.x - uz * lane * S;
          P.z = q.z + ux * lane * S;
          P.h = Math.atan2(ux, uz);
          P.vx = ux * 36;
          P.vz = uz * 36;
          P.vy = 0;
          P.r = P.steer = P.steerS = P.brkT = P.holdT = P.holdDir = 0;
          P.thr = 1;
          P.laneT = P.turnRoom = null;
          P.air = false;
          for (const k in T.keys) T.keys[k] = false;
          let key = null,
            done = false,
            vMin = 999,
            slow = 0,
            made = false;
          for (let i = 0; i < 900 && !made; i++) {
            const v = Math.hypot(P.vx, P.vz),
              fwd = (n.x - P.x) * Math.sin(h0) + (n.z - P.z) * Math.cos(h0);
            if (!key && !done && fwd < lead * (5 + 0.7 * v))
              key = Math.sin(hx) * -Math.cos(P.h) + Math.cos(hx) * Math.sin(P.h) > 0 ? "d" : "a";
            if (key && Math.abs(ang(P.h - hx)) < 0.2) {
              T.keys[key] = false;
              key = null;
              done = true;
            }
            T.keys.w = true;
            if (key) T.keys[key] = true;
            T.driveUpdate(1 / 60);
            const kmh = Math.hypot(P.vx, P.vz) * 3.6;
            if (fwd < 60) vMin = Math.min(vMin, kmh);
            if (kmh < 60) slow += 1 / 60;
            const nr = T.nearestRoad(P.x, P.z, 12);
            made = !!nr && nr.e === ex.e && Math.hypot(P.x - n.x, P.z - n.z) > 30;
          }
          out.push({ n: T.NODES.indexOf(n), turn: Math.round((ex.turn * 180) / Math.PI), lead, made, vMin: Math.round(vMin), slow: +slow.toFixed(1) });
        }
    }
  }
  for (const k in T.keys) T.keys[k] = false;
  return out;
}

module.exports = { measureBends, measureJunctions };
