// Follow-up coverage for #18's GPU warm-up. All tests render WebGL: this is
// SwiftShader/Chromium CI, NOT a physical phone performance benchmark.
// Record GPU deltas as annotations; only assert supported functional invariants
// and bounded growth. Some new-car paint programs remain an acknowledged gap.
const { test, expect } = require("./support/game");

const note = (type, data) => test.info().annotations.push({
  type,
  description: JSON.stringify(data),
});

const sample = (game) => game.eval(() => {
  const T = __T, M = T.renderer.info.memory;
  return {
    state: T.state, gfx: T.save.gfx, id: T.curId,
    modelQuality: T.carMeshes[T.curId]?.q ?? null,
    programs: T.renderer.info.programs?.length ?? 0,
    textures: M.textures, geometries: M.geometries,
    ratio: T.renderer.getPixelRatio(), warm: { ...T.WARM },
  };
});

test.describe("GPU warm-up follow-ups", () => {
  test("graphics SHARP / SMOOTH / AUTO switches retain the driven car and bound GPU resources @webgl", async ({ game, page }) => {
    test.setTimeout(600_000);
    await game.open({ render: true });
    await game.driveOut();
    await game.park();
    await game.frames(3);
    await game.eval(() => __T.pauseOn());
    const first = await sample(game);
    expect(first.warm.failed).toBe(0);
    const seen = [];
    for (let i = 0; i < 6; i++) {
      await page.locator("#pGfx").click();
      await game.frames(3);
      const s = await sample(game);
      seen.push(s);
      expect(s.state).toBe("PAUSE");
      expect(s.id).toBe(first.id);
      expect(s.gfx).toBe((first.gfx + i + 1) % 3);
      // The WebGL test project uses desktop inputs; only SMOOTH has simple car paint.
      expect(s.modelQuality).toBe(s.gfx === 2 ? 0 : 1);
      expect(s.programs).toBeGreaterThan(0);
      expect(s.textures).toBeGreaterThan(0);
    }
    note("graphics switch GPU snapshots", { first, seen });
    // Switching twice through three quality levels must not leak unbounded
    // shader programs or textures. This deliberately allows a few new variants
    // when first encountering SHARP/SMOOTH; zero new programs is a future target.
    const highPrograms = Math.max(first.programs, ...seen.map(s => s.programs));
    expect(highPrograms - first.programs).toBeLessThanOrEqual(20);
    const highTextures = Math.max(first.textures, ...seen.map(s => s.textures));
    expect(highTextures - first.textures).toBeLessThanOrEqual(24);
    await game.eval(() => __T.pauseOff());
    await game.frames(2);
    expect((await sample(game)).state).toBe("DRIVE");
  });

  test("WebGL context loss and restoration resume drawing without reloading @webgl", async ({ game, page }) => {
    test.setTimeout(600_000);
    await game.open({ render: true });
    await game.frames(3);
    const before = await sample(game);
    const support = await game.eval(() => {
      const T = __T, gl = T.renderer.getContext(), ext = gl.getExtension("WEBGL_lose_context");
      if (!ext) return false;
      window.__warmContextTest = { lost: 0, restored: 0, ext };
      const canvas = T.renderer.domElement;
      canvas.addEventListener("webglcontextlost", () => window.__warmContextTest.lost++);
      canvas.addEventListener("webglcontextrestored", () => window.__warmContextTest.restored++);
      ext.loseContext();
      return true;
    });
    test.skip(!support, "The WebGL driver does not expose WEBGL_lose_context");
    await page.waitForFunction(() => window.__warmContextTest?.lost === 1, null, { timeout: 30_000 });
    await game.eval(() => window.__warmContextTest.ext.restoreContext());
    await page.waitForFunction(() => window.__warmContextTest?.restored === 1, null, { timeout: 30_000 });
    await game.frames(8);
    const after = await game.eval(() => {
      const T = __T, w = window.__warmContextTest;
      return {
        lost: w.lost, restored: w.restored,
        contextLost: T.renderer.getContext().isContextLost(),
        programs: T.renderer.info.programs?.length ?? 0,
        textures: T.renderer.info.memory.textures,
        calls: T.renderer.info.render.calls,
      };
    });
    note("WebGL context-loss recovery", { before, after });
    expect([after.lost, after.restored, after.contextLost]).toEqual([1, 1, false]);
    expect(after.programs).toBeGreaterThan(0);
    expect(after.calls).toBeGreaterThan(0);
    // WebGL resources were invalidated; rebuilding them is expected on restore.
    // Compare recovery cost in annotations; no zero-recompilation assertion here.
  });

  test("first later-seen unowned car exposes shader and texture upload delta @webgl", async ({ game }) => {
    test.setTimeout(600_000);
    await game.open({ render: true });
    await game.driveOut();
    await game.park();
    await game.frames(4);
    const result = await game.eval(() => {
      const T = __T, R = T.renderer;
      const chosen = T.CARS.find(c => !T.save.owned.includes(c.id) && !T.carMeshes[c.id]);
      if (!chosen) return null;
      const counts = () => ({
        programs: R.info.programs?.length ?? 0,
        textures: R.info.memory.textures, geometries: R.info.memory.geometries,
      });
      const before = counts(), t0 = performance.now();
      const model = T.getCar(chosen.id);
      // Force the model into the visible scene so this is not merely a constructor test.
      model.G.position.copy(T.pc.G.position).add(new THREE.Vector3(0, 0, 5));
      model.G.visible = true;
      R.compile(T.scene, T.camera);
      R.render(T.scene, T.camera);
      const elapsedMs = performance.now() - t0, after = counts();
      return {
        id: chosen.id, existedBefore: false,
        elapsedMs: +elapsedMs.toFixed(2),
        before, after,
        delta: {
          programs: after.programs - before.programs,
          textures: after.textures - before.textures,
          geometries: after.geometries - before.geometries,
        },
      };
    });
    expect(result, "an unowned model not compiled during loading").not.toBeNull();
    note("first newly seen car after warm-up", result);
    expect(result.delta.programs).toBeGreaterThanOrEqual(0);
    expect(result.delta.programs, "unexpected shader-program explosion").toBeLessThanOrEqual(4);
    expect(result.delta.textures, "unexpected texture upload explosion").toBeLessThanOrEqual(16);
    // A one-program increase is currently known and tracked here. To enforce
    // a hitch-free late car in a later implementation, tighten programs to 0
    // after an explicit background/idle shader precompile strategy is added.
  });
});
