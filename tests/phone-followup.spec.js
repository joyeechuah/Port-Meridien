// Traffic: cars on the island's roads keep their distance from each other (at junctions, in queues and where new
// ones appear), take turns where roads meet, and never wait for good, even behind a parked car.
const { test, expect } = require("./support/game");

test.describe("traffic", () => {
  test("traffic cars never drive into each other, and none waits for good", async ({ game }) => {
    test.setTimeout(600_000);
    await game.open();
    await game.driveOut();
    // parked in a lane, so cars also queue behind the car and pull round it
    await game.park(553, 53);
    const r = await game.eval(() => {
      const T = __T,
        dur = new Map(),
        stop = new Map(),
        out = { overlaps: 0, brushes: 0, longestOverlap: 0, longestStop: 0, seen: [] };
      // everything about one car at the moment two are found inside each other, so a rare failure says what happened
      // (one was seen in a full run on 16 Nov 2026 and not again in 8 repeats; Codex's review asked for this)
      const who = (t) => {
        const jn = t.dir > 0 ? t.e.b : t.e.a,
          f = (n) => +n.toFixed(1);
        return {
          car: T.TRAFFIC.indexOf(t),
          police: !!t.cop,
          chasing: !!t.chase,
          at: [Math.round(t.wx), Math.round(t.wz)],
          road: t.e.type + " " + T.EDGES.indexOf(t.e),
          s: f(t.s),
          dir: t.dir,
          lane: t.lane,
          off: f(t.offCur),
          v: f(t.v),
          passT: f(t.passT),
          stopT: f(t.stopT),
          toJunction: Math.round(t.dir > 0 ? t.e.len - t.s : t.s),
          junction: [Math.round(jn.x), Math.round(jn.z)],
          heldBy: jn.res ? T.TRAFFIC.indexOf(jn.res) : null,
        };
      };
      const frames=[], seenAtStopLine=new Set();
      const canvas=document.createElement("canvas");canvas.width=4*260;canvas.height=3*156;
      const ctx=canvas.getContext("2d");
      for (let i = 0; i < 21600; i++) {
        T.driveUpdate(1 / 60);
        for(const car of T.TRAFFIC)if(car.e&&Math.hypot(car.wx-560,car.wz-40)<12)seenAtStopLine.add(car);
        if(i%1800===900){
          const x=560,z=40,y=T.footGround(x,z),cam=T.camera.clone();
          cam.position.set(x,y+45,z+3);cam.lookAt(x,y,z);
          T.renderer.__draw(T.scene,cam);
          const frame=frames.length,col=(frame%4)*260,row=Math.floor(frame/4)*156;
          ctx.drawImage(T.renderer.domElement,col,row,260,146);
          ctx.fillStyle="#172027";ctx.fillRect(col,row+137,260,19);
          ctx.fillStyle="white";ctx.font="14px sans-serif";ctx.fillText((i/60)+" s",col+6,row+151);
          frames.push(i/60);
        }
        for (const t of T.TRAFFIC) {
          if (!t.e || Math.hypot(t.wx-560,t.wz-40)>35) {stop.delete(t);continue}
          const s = t.v < 0.5 ? (stop.get(t) || 0) + 1 / 60 : 0;
          stop.set(t, s);
          // where the car that has waited longest is, and what it's waiting at: if this test ever fails, the message says
          // (a wait of over five minutes was seen once in 78 runs and never again, with nothing to go on)
          if (s > out.longestStop && s > 30) {
            const jn = t.dir > 0 ? t.e.b : t.e.a;
            out.stuck = `car ${T.TRAFFIC.indexOf(t)} at (${Math.round(t.wx)}, ${Math.round(t.wz)}) on a ${t.e.type} road, ${Math.round(t.dir > 0 ? t.e.len - t.s : t.s)} m from the junction at (${Math.round(jn.x)}, ${Math.round(jn.z)}) with arms ${jn.adj.map((q) => q.e.type).join("/")}; junction held by ${jn.res ? "car " + T.TRAFFIC.indexOf(jn.res) + (jn.res.e ? " at (" + Math.round(jn.res.wx) + ", " + Math.round(jn.res.wz) + ") doing " + jn.res.v.toFixed(1) + " m/s" : " (off the road)") : "nobody"}; stopT ${Math.round(t.stopT)}, passT ${t.passT.toFixed(1)}; you at (${Math.round(T.P.x)}, ${Math.round(T.P.z)})`;
          }
          out.longestStop = Math.max(out.longestStop, s);
        }
        if (i % 6) continue;
        const L = T.TRAFFIC.filter((t) => t.e && t.c.G.visible && Math.hypot(t.wx-560,t.wz-40)<35),
          now = new Set();
        for (let a = 0; a < L.length; a++)
          for (let b = a + 1; b < L.length; b++) {
            // closer than 2.4 m between centres: the bodies (about 4.4 m by 1.9 m) are inside each other
            if (Math.hypot(L[a].wx - L[b].wx, L[a].wz - L[b].wz) >= 2.4) continue;
            const k = T.TRAFFIC.indexOf(L[a]) + "-" + T.TRAFFIC.indexOf(L[b]),
              d = (dur.get(k) || 0) + 0.1;
            now.add(k);
            dur.set(k, d);
            // half a second or more counts; two cars in opposite lanes brushing for a moment at a sharp corner
            // (their lanes meet at an angle there) is only recorded
            if (Math.abs(d - 0.5) < 1e-6) {
              out.overlaps++;
              if (out.seen.length < 3) out.seen.push({ second: +(i / 60).toFixed(1), apart: +Math.hypot(L[a].wx - L[b].wx, L[a].wz - L[b].wz).toFixed(2), a: who(L[a]), b: who(L[b]), you: [Math.round(T.P.x), Math.round(T.P.z)] });
            }
            out.longestOverlap = Math.max(out.longestOverlap, +d.toFixed(1));
          }
        for (const [k, d] of dur)
          if (!now.has(k)) {
            if (d < 0.5) out.brushes++;
            dur.delete(k);
          }
      }
      out.longestStop = Math.round(out.longestStop);
      return {...out,frames,nearby:seenAtStopLine.size,sheet:canvas.toDataURL("image/png").split(",")[1]};
    });
    await test.info().attach("junction-six-minutes.png",{body:Buffer.from(r.sheet,"base64"),contentType:"image/png"}); delete r.sheet;
    console.log("JUNCTION_RESULT", JSON.stringify(r));
    expect(r.nearby).toBeGreaterThan(0);
    test.info().annotations.push({ type: "6 minutes of traffic", description: JSON.stringify(r) });
    expect(r.overlaps, "times two traffic cars stayed inside each other for half a second or more" + (r.seen.length ? ": " + JSON.stringify(r.seen) : "")).toBe(0);
    // turn-taking at junctions must not leave cars stuck, and the queue behind a parked car clears
    expect(r.longestStop, "seconds the longest-stopped traffic car waited" + (r.stuck ? ": " + r.stuck : "")).toBeLessThan(60);
  });

});

const {execFileSync}=require("node:child_process");
const pin="864c90770c6f765c52eb8016121b9b0c417b1528";
const variants={G1:"scale=2",G2:"scale=1",G3:"scale=2&shadows=off",G4:"scale=2&far=near"};
test.describe("pinned graphics replay",()=>{
  test.use({viewport:{width:720,height:360},deviceScaleFactor:2,hasTouch:true});
  for(const [label,query] of Object.entries(variants)){
    test.skip(label+" same Old Quay drive @webgl",async({game,page},info)=>{
      execFileSync("git",["fetch","--depth=1","origin",pin]);
      let html=execFileSync("git",["show",pin+":index.html"],{encoding:"utf8",maxBuffer:4e6});
      const marker="  syncRenderView();";
      expect(html.split(marker)).toHaveLength(2);
      html=html.replace(marker,`  if(window.__replay && state==="DRIVE"){
        const elapsed=(performance.now()-window.__replay)/1000;
        const x=570+220*Math.min(1,elapsed/44);
        const nr=nearestRoadGlobal(x,avenueZ(x),true);placeOnRoad(nr,nr.dx>=0?1:-1);
        placeCarMesh(0);snapCam();updateCam(1);
      }
`+marker);
      html=html.replace("\nboot();\n})();","\nboot(); window.qaState=()=>state; window.qaStart=()=>{save.music=false;save.todMode=1;save.tod=16;goDrive()}; window.qaResult=()=>({x:P.x,z:P.z,music:save.music,scale:prNow,buffer:[renderer.domElement.width,renderer.domElement.height],panel:PERF.el?.textContent});\n})();");
      await game.open({path:"/404.html",instrument:false,autostart:false,render:true});
      await page.addInitScript(()=>{let s=12345;Math.random=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);window.__autostart=1});
      await page.route("**/index.html?*",r=>r.fulfill({body:html,contentType:"text/html"}));
      await page.goto("/index.html?perf&"+query);
      await page.waitForFunction(()=>window.qaState?.()==="GARAGE",null,{timeout:180000});
      await page.evaluate(()=>qaStart());
      await page.waitForFunction(()=>qaState()==="DRIVE",null,{timeout:180000});
      await page.evaluate(()=>window.__replay=performance.now());
      for(const elapsed of [22,33,44]){
        await page.waitForFunction(t=>performance.now()-window.__replay>=t*1000,elapsed);
        const r=await page.evaluate(()=>qaResult());
        console.log("GRAPHICS_RESULT",label,elapsed,JSON.stringify(r));
        expect(r.music).toBe(false); expect(r.scale).toBe(label==="G2"?1:2);
      }
      await info.attach(label+"-end",{body:await page.screenshot(),contentType:"image/png"});
    });
  }
});
for (const [width, height] of [[392, 731], [844, 390]]) {
  test.describe(`on-foot framing at ${width} × ${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true });
    test("the get-in button clears the rendered character @webgl", async ({ game, page }, info) => {
      const revision="07927266b67bf4bc53d71146f8ab16d59acb5c8f";
      execFileSync("git",["fetch","--depth=1","origin",revision]);
      const html=execFileSync("git",["show",revision+":index.html"],{encoding:"utf8",maxBuffer:4e6})
        .replace("\nboot();\n})();","\nboot();window.__T={FOOT,camera,get state(){return state}};\n})();");
      await game.open({path:"/404.html",instrument:false,autostart:false,render:true});
      await page.route("**/index.html",r=>r.fulfill({body:html,contentType:"text/html"}));
      await page.goto("/index.html");
      await page.locator("#lstart").click({ timeout: 180000 });
      await page.locator("#arrivalSkip").click();
      await page.getByRole("button", {name: /Night shift/}).click();
      await page.locator("#wardTurn").click();
      await game.frames(2);
      await info.attach("jacket-back.png", {body: await page.screenshot(), contentType:"image/png"});
      await page.locator("#wardWear").click();
      await game.waitState("DRIVE");
      await page.locator("#chFoot").click();
      const prompt=page.locator("#prompt");
      await expect(prompt).toContainText("Get in");
      await game.frames(2);
      const separate=await game.eval(()=>{
        const {FOOT,camera}=__T,box=new THREE.Box3().setFromObject(FOOT.m.G);
        const xs=[],ys=[];
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          const p=new THREE.Vector3(x,y,z).project(camera);
          xs.push((1+p.x)*innerWidth/2);ys.push((1-p.y)*innerHeight/2);
        }
        const b=document.getElementById("prompt").getBoundingClientRect();
        return Math.max(b.left-Math.max(...xs),Math.min(...xs)-b.right,b.top-Math.max(...ys),Math.min(...ys)-b.bottom);
      });
      expect(separate).toBeGreaterThan(4);
      await info.attach("on-foot.png",{body: await page.screenshot(),contentType:"image/png"});
      await prompt.click();
      expect(await game.eval(()=>__T.FOOT.on)).toBe(false);
    });
  });
}
