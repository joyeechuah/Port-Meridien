// When the recorded songs can't load: they're tried again, and on a phone the composed backup music isn't played
// (playing it live overloaded an Android phone's audio thread: over a thousand underruns a minute, heard as the
// whole sound breaking up). On a computer the backup still plays.
const { test, expect } = require("./support/game");

const countOscillators = () => {
  window.__osc = 0;
  const f = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function () {
    window.__osc++;
    return f.apply(this, arguments);
  };
};
const blockSongs = (game, page) => {
  game.allowErrors.push(/Failed to load resource/);
  return page.route("**/audio/*.mp3", (r) => r.fulfill({ status: 404, body: "" }));
};
// sound starts with the first tap or click; then count what plays over 8 s in the garage
const oscillatorsOver8s = async (game, page, touch) => {
  if (touch) await page.touchscreen.tap(195, 300);
  else await page.mouse.click(640, 200);
  await expect.poll(() => game.eval(() => __T.AC && __T.AC.state), { timeout: 30_000 }).toBe("running");
  await expect.poll(() => game.eval(() => __T.SONGS.lounge.st), { timeout: 15_000 }).toBe("failed");
  const before = await game.eval(() => window.__osc);
  await page.waitForTimeout(8000);
  return (await game.eval(() => window.__osc)) - before;
};

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("with the songs unable to load, no backup music is played; the music is silent", async ({ game, page }) => {
    await page.addInitScript(countOscillators);
    await blockSongs(game, page);
    await game.open();
    const n = await oscillatorsOver8s(game, page, true);
    expect(n, "oscillators started in 8 s").toBeLessThan(5);
  });
});

test("on a computer, the backup music still plays when the songs can't load", async ({ game, page }) => {
  await page.addInitScript(countOscillators);
  await blockSongs(game, page);
  await game.open();
  const n = await oscillatorsOver8s(game, page, false);
  // the composed tracks start dozens of notes a second (this is what the phone test would see without the change)
  expect(n, "oscillators started in 8 s").toBeGreaterThan(50);
});

test("a song that fails to load is tried again, and plays once it loads", async ({ game, page }) => {
  game.allowErrors.push(/Failed to load resource/);
  let asked = 0;
  await page.route("**/audio/showroom.mp3", (r) => (++asked === 1 ? r.fulfill({ status: 500, body: "" }) : r.continue()));
  // (the garage song is first fetched while the island loads, so the retry is due by the time sound starts)
  await game.open();
  await expect.poll(() => game.eval(() => __T.SONGS.lounge.err), { timeout: 15_000 }).toBe("HTTP 500");
  await page.mouse.click(640, 200);
  await expect.poll(() => game.eval(() => __T.SONGS.lounge.st), { timeout: 20_000 }).toBe("ready");
  await expect.poll(() => game.eval(() => !!__T.SONGS.lounge.p), { timeout: 10_000 }).toBe(true);
  expect(asked).toBe(2);
});

test("a song that keeps failing is tried three more times, then left", async ({ game, page }) => {
  await blockSongs(game, page);
  await game.open();
  await page.mouse.click(640, 200);
  await expect.poll(() => game.eval(() => __T.SONGS.lounge.st), { timeout: 15_000 }).toBe("failed");
  // skip the waits: each retry is due at once
  for (let i = 0; i < 5; i++) {
    await game.eval(() => {
      const S = __T.SONGS.lounge;
      if (S.retryAt != null) S.retryAt = 0;
    });
    await page.waitForTimeout(700);
  }
  const S = await game.eval(() => ({ st: __T.SONGS.lounge.st, tries: __T.SONGS.lounge.tries, retryAt: __T.SONGS.lounge.retryAt }));
  expect(S).toEqual({ st: "failed", tries: 4, retryAt: null });
});

test("the ?perf panel says why a song failed", async ({ game, page }) => {
  await blockSongs(game, page);
  await game.open({ path: "/index.html?perf" });
  await page.mouse.click(640, 200);
  await expect(page.locator("#perf")).toContainText(/lounge failed:HTTP 404( r\d\/3)?/, { timeout: 20_000 });
});

test("a request that never responds times out, reports why, and can recover on retry", async ({ game, page }) => {
  // A permanently pending fetch used to leave S.st=loading forever, so mobile players got no music
  // and none of the 3/10/30-second retries would ever run.
  await page.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.__songFetchAttempts = 0;
    window.fetch = (input, options) => {
      if (!String(input).includes("audio/showroom.mp3")) return realFetch(input, options);
      window.__songFetchAttempts++;
      if (window.__songFetchAttempts !== 1) return realFetch(input, options);
      return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    };
  });
  await game.open();
  await expect.poll(() => game.eval(() => __T.SONGS.lounge.err), { timeout: 20_000 }).toBe("timeout");
  expect(await game.eval(() => __T.SONGS.lounge.st)).toBe("failed");
  await page.mouse.click(640, 200);
  await game.eval(() => { __T.SONGS.lounge.retryAt = 0; });
  await expect.poll(() => game.eval(() => __T.SONGS.lounge.st), { timeout: 20_000 }).toBe("ready");
  expect(await page.evaluate(() => window.__songFetchAttempts)).toBe(2);
});

test("a song on a slow but steady connection still loads (the time limit is for stalls, not slowness)", async ({ game, page }) => {
  test.setTimeout(120_000);
  // about 100 KB/s, a weak phone signal: a 2 MB song takes about 20 s, longer than the 12 s stall limit
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 100 * 1024, uploadThroughput: 50 * 1024 });
  await game.open();
  await page.mouse.click(640, 200);
  await expect.poll(() => game.eval(() => __T.SONGS.lounge.st), { timeout: 80_000, intervals: [2000] }).toBe("ready");
  expect(await game.eval(() => __T.SONGS.lounge.tries || 0), "failed attempts").toBe(0);
});

test("a download that stops halfway is given up after 12 s without new data, and tried again", async ({ game, page }) => {
  await page.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.__songFetchAttempts = 0;
    window.fetch = (input, options) => {
      if (!String(input).includes("audio/showroom.mp3")) return realFetch(input, options);
      if (++window.__songFetchAttempts !== 1) return realFetch(input, options);
      // the answer comes, one piece of the song arrives, then nothing more
      const body = new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(4096));
          options.signal.addEventListener("abort", () => c.error(new DOMException("Aborted", "AbortError")), { once: true });
        },
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    };
  });
  await game.open();
  await expect.poll(() => game.eval(() => __T.SONGS.lounge.err), { timeout: 25_000 }).toBe("timeout");
  await page.mouse.click(640, 200);
  await game.eval(() => {
    __T.SONGS.lounge.retryAt = 0;
  });
  await expect.poll(() => game.eval(() => __T.SONGS.lounge.st), { timeout: 20_000 }).toBe("ready");
  expect(await page.evaluate(() => window.__songFetchAttempts)).toBe(2);
});
