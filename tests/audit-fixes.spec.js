// Fixes from Codex's audit of main at 3da4726: the cloud save's keys over repairs, a friend's walker freeing what it
// owns, the room list noticing a friend gone quiet, and the repair sum agreeing with its price
const { test, expect } = require("./support/game");
const fs = require("node:fs"),
  vm = require("node:vm");

test("an invitation from a room on the local relay keeps ?mp=local in its link", () => {
  const src = fs.readFileSync(require.resolve("../js/net.js"), "utf8"),
    line = (a) => { const i = src.indexOf(a); return src.slice(i, src.indexOf("\n", i)); };
  const run = (search) => vm.runInNewContext(line("const netLocal=") + "\n" + line("const netInvite=") + "\nnetInvite()",
    { NET: { room: "QX7P" }, location: { origin: "https://joyeechuah.github.io", pathname: "/Port-Meridien/", search } });
  expect(run("?mp=local")).toBe("Play Port Meridien with me: room QX7P. https://joyeechuah.github.io/Port-Meridien/?mp=local");
  expect(run("")).toBe("Play Port Meridien with me: room QX7P. https://joyeechuah.github.io/Port-Meridien/");
});

test("Escape over repairs with the cloud's choice open closes the choice; repairs stay open and the game stays paused", async ({ game, page }) => {
  await game.open();
  await game.driveOut();
  await game.eval(() => { __T.openRepair(); __T.show("cloudPick", true); });
  const read = () => game.eval(() => ({ pick: __T.clOverlayOpen(), repair: !document.getElementById("repair").classList.contains("hide"), state: __T.state }));
  expect(await read()).toEqual({ pick: true, repair: true, state: "PAUSE" });
  await page.keyboard.press("Escape");
  expect(await read()).toEqual({ pick: false, repair: true, state: "PAUSE" });
  await page.keyboard.press("Escape");
  expect(await read()).toEqual({ pick: false, repair: false, state: "DRIVE" });
});

test("the repair sum shows the rule, what it comes to and the Handiness discount, and ends on the button's price", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    const T = __T;
    T.P.damage = 50;
    T.save.skills.handiness = T.skillThreshold(10);
    T.openRepair();
    return { hint: document.getElementById("repairHint").textContent, button: document.getElementById("repairNow").textContent };
  });
  expect(r.hint).toBe("Garage repairs are FREE. Roadside repairs cost 1,000 + 20 credits per damage percentage point: 2,000 CR, less 30% for your Handiness: 1,400 CR.");
  expect(r.button).toBe("ROADSIDE REPAIR · 1,400 CR");
});

test("a friend getting out of a car twenty times is one set of shapes for their outfit, and each walker's face material is freed", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const T = __T, p = { uid: "t", buf: [], model: null, key: "", tag: null, name: "", phase: 0, seen: 0, shown: false, lost: false };
    const shapes = new Set();
    let freed = 0;
    for (let i = 0; i < 20; i++) {
      T.netModel(p, { m: 1, o: T.OUTFITS[i % 2].id });
      for (const c of p.model.G.children) if (c.material !== p.model.face.m) shapes.add(c.geometry);
      const m = p.model.face.m, free = m.dispose.bind(m);
      m.dispose = () => { freed++; free(); };
      T.netModel(p, { m: 3 });
    }
    return { shapes: shapes.size, freed, model: p.model };
  });
  // body, leg and arm for each of the two outfits
  expect(r).toEqual({ shapes: 6, freed: 20, model: null });
});

test("the open room list says a friend is not responding as soon as they go quiet", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const status = () => game.eval(() => [...document.querySelectorAll("#plList .plRow:not(.me) span")].map((s) => s.textContent));
  await game.eval(() => {
    const T = __T, now = performance.now() / 1000;
    T.NET.room = "TEST";
    T.NET.peers.set("f", { uid: "f", buf: [{ t: now, d: { m: 3, x: 0, y: 0, z: 0, h: 0, v: 0 } }], model: null, key: "", tag: null, name: "Friend", phase: 0, seen: now, shown: false, lost: false });
    T.pauseOn();
    T.netOpen();
  });
  expect(await status()).toEqual(["in a menu"]);
  await game.eval(() => { __T.NET.peers.get("f").seen -= 10; });
  await expect.poll(status, { timeout: 5000 }).toEqual(["not responding"]);
  await game.eval(() => { const T = __T; T.NET.peers.clear(); T.NET.room = null; });
});
