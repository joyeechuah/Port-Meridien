// Fixed viewpoint on a real verge. Software GPU numbers are diagnostics for CI;
// the physical Android AUTO comparison is described in docs/COUNTRY_WALKERS.md.
const { test, expect } = require("./support/game");
test.use({ hasTouch: true, isMobile: true, viewport: {width: 393,height: 852} });
test("four country figures on a phone viewport: paired drawn frame times @webgl", async ({game}) => {
  await game.open({render:true});
  await game.driveOut();
  const report=await game.eval(()=>{
    const T=__T, e=T.vergeSites[0], cam=T.camera.clone(), figures=T.VERGE.map(p=>p.m.G);
    const x=e.a.x,z=e.a.z,y=T.footGround(x,z);
    cam.position.set(x,y+2,z-12);cam.lookAt(x,y+1,z);cam.updateMatrixWorld();
    figures.forEach((g,i)=>g.position.set(x+(i-1.5)*1.4,y,z));
    const renderer=T.renderer,gl=renderer.getContext(),ms=[[],[]],calls=[0,0];
    // Warm both paths. The camera, render scale and world are fixed during these samples.
    for(let i=0;i<14;i++)for(const on of i%2?[1,0]:[0,1]){
      for(const g of figures)g.visible=!!on;
      gl.finish();
      const start=performance.now();
      renderer.render(T.scene,cam);gl.finish();
      if(i>=2)ms[on].push(performance.now()-start);
      calls[on]=renderer.info.render.calls;
    }
    return {figures:figures.length,ms:ms.map(a=>a.sort((a,b)=>a-b)),calls};
  });
  expect(report.figures).toBe(4);
  expect(report.calls[1]).toBeGreaterThan(report.calls[0]);
  test.info().annotations.push({type:"touch render, bare/with walkers",description:JSON.stringify({
    medianMs:report.ms.map(a=>a[6]),p95Ms:report.ms.map(a=>a[11]),drawCalls:report.calls
  })});
});
