// Four minutes of random play across every mode: driving, getting out and in, walking, firing, boarding and
// sailing, crimes and chases, being hurt, pausing. Nothing may break: no page errors, nothing NaN, never on foot and
// on the boat at once, no car shot off at absurd speed, counts within their limits. The same sequence every run.
const { test, expect } = require("./support/game");

test("four minutes of random play in every mode break nothing", async ({ game }) => {
  const seed = 2;
  test.setTimeout(900000);
  await game.open({ police: true });
  await game.waitState("GARAGE");
  await game.eval(() => document.getElementById("gGun").click());
  await game.driveOut();
  await game.eval((seed) => { window.__r = seed * 9301 + 49297; window.__out = []; window.__states = {}; }, seed);
  for (let sec = 0; sec < 240; sec++) {
    const st = await game.eval(() => __T.state);
    if (st === "FADE" || st === "EXIT" || st === "LOAD") { await game.waitState("DRIVE", 30000).catch(() => {}); }
    if ((await game.eval(() => __T.state)) === "GARAGE") { await game.eval(() => __T.goDrive()); await game.waitState("DRIVE", 30000).catch(() => {}); }
    const stop = await game.eval((sec) => {
    const T = __T, P = T.P, F = T.FOOT, B = T.BOAT;
    const rnd = () => (window.__r = (window.__r * 16807) % 2147483647) / 2147483647;
    const KEYS = ["w", "s", "a", "d", " ", "g", "shift"];
    const fin = (...v) => v.every(Number.isFinite);
    const out = window.__out, states = window.__states;
    const towns = [[600, 0], [690, 100], [0, 0], [T.PIER.x0 - 14, 0], [-300, 400]];
    {
      // every 4 s something happens: teleport near somewhere, get out or in, board, crime, pause and back
      if (sec % 4 === 0) {
        const a = Math.floor(rnd() * 8);
        try {
          if (a === 0 && !F.on && !B.on && T.state === "DRIVE") { const [x, z] = towns[Math.floor(rnd() * towns.length)]; const nr = T.nearestRoadGlobal(x, z, true); P.x = nr.x; P.z = nr.z; P.vx = P.vz = 0; }
          else if (a === 1 && T.state === "DRIVE" && !B.on) { P.vx = P.vz = 0; if (F.on) { F.x = P.x + 1.5; F.z = P.z; } T.keys.f = false; }
          else if (a === 2 && T.state === "DRIVE") { if (F.on) T.footEnter(); else if (!B.on) { P.vx = P.vz = 0; T.footExit(); } }
          else if (a === 3 && F.on) { F.x = B.x; F.z = T.PIER.z0 + 0.8; F.y = T.PIER.y; T.driveUpdate(1 / 60); T.boatBoard(); }
          else if (a === 4 && B.on) { B.v = 0; B.x = T.PIER.x0 + 30; B.z = T.PIER.z0 - 2.2; T.driveUpdate(1 / 60); }
          else if (a === 5) { T.WANTED.crimeAt = -99; const me = B.on ? B : F.on ? F : P; T.crime("crash", me.x, me.z); }
          else if (a === 6) { T.hurt(15); }
          else if (a === 7 && T.state === "DRIVE") { T.pauseOn(); T.driveUpdate(1 / 60); T.pauseOff(); }
        } catch (e) { out.push("action " + a + ": " + e.message); }
      }
      for (let f = 0; f < 60; f++) {
        if (f % 20 === 0) for (const k of KEYS) T.keys[k] = rnd() < 0.3;
        T.keys.w = T.keys.w || rnd() < 0.5;
        if (T.state === "DRIVE") { try { T.driveUpdate(1 / 60); } catch (e) { out.push("frame: " + e.stack.split("\n").slice(0, 3).join(" / ")); break; } }
        else if (T.state === "PAUSE") T.pauseOff();
        else break;
      }
      states[T.state] = (states[T.state] || 0) + 1;
      const W = T.WANTED, H = T.HEALTH;
      if (F.on && B.on) out.push(sec + ": on foot and on the boat");
      if (!fin(P.x, P.z, P.vx, P.vz, P.h)) out.push(sec + ": car not finite");
      if (F.on && !fin(F.x, F.z, F.h, F.y)) out.push(sec + ": walker not finite");
      if (B.on && !fin(B.x, B.z, B.h)) out.push(sec + ": boat not finite");
      if (Math.hypot(P.vx, P.vz) > 110) out.push(sec + ": car at " + Math.round(Math.hypot(P.vx, P.vz) * 3.6) + " km/h");
      for (const t of T.TRAFFIC) if (t.e && !fin(t.wx, t.wz, t.s, t.v)) { out.push(sec + ": traffic not finite " + T.TRAFFIC.indexOf(t)); break; }
      for (const p of T.PEDS) if (!fin(p.x, p.z)) { out.push(sec + ": pedestrian not finite"); break; }
      if (T.OFFICER.on && !fin(T.OFFICER.x, T.OFFICER.z)) out.push(sec + ": officer not finite");
      if (!(W.lvl >= 0 && W.lvl <= 5)) out.push(sec + ": wanted " + W.lvl);
      if (!(H.hp >= 0 && H.hp <= 100)) out.push(sec + ": health " + H.hp);
      if (!(T.GUN.ammo >= 0 && T.GUN.ammo <= 48)) out.push(sec + ": ammo " + T.GUN.ammo);
      if (!fin(T.save.cr) || T.save.cr < 0) out.push(sec + ": credits " + T.save.cr);
    }
    return out.length > 20;
    }, sec);
    if (stop) break;
  }
  const res = await game.eval(() => ({ out: [...new Set(window.__out)].slice(0, 20), states: window.__states, cr: __T.save.cr, lvl: __T.WANTED.lvl, hp: __T.HEALTH.hp }));
  test.info().annotations.push({ type: "soak", description: JSON.stringify(res) });
  expect(res.out).toEqual([]);
  expect(game.errors).toEqual([]);
  expect(res.states.DRIVE).toBeGreaterThan(200);
});
