const { test, expect } = require("./support/game");

for (const [width, height] of [[392, 731], [844, 390]]) {
  test.describe(`on-foot framing at ${width} × ${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true });
    test("the get-in button clears the rendered character @webgl", async ({ game, page }, info) => {
      await game.open({ autostart: false, render: true });
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
