const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const player = html.slice(html.indexOf('const SONGS='), html.indexOf('// nothing plays while the tab is hidden'));

// Run the shipping player with a controlled clock and transport. No audio hardware or live network is needed.
function setup(music, fetch) {
  const frames = [];
  const timers = new Map();
  const ctx = vm.createContext({
    save: { music }, fetch, performance: { now: () => 0 }, location: { protocol: 'https:' },
    matchMedia: () => ({ matches: false }), addEventListener() {}, setInterval() {},
    setTimeout(fn, ms) { timers.set(fn, ms); return fn; }, clearTimeout(fn) { timers.delete(fn); },
    AbortController, isTouch: true, tabIdle: false, state: 'LOAD', WANTED: { lvl: 0 }, ev: null,
    AC: { state: 'running', currentTime: 0, createGain: () => ({ gain: {}, connect() {} }),
      decodeAudioData() { frames.push('decode'); } }, night: 0, lerp: () => 18000
  });
  vm.runInContext(player, ctx);
  return { run: code => vm.runInContext(code, ctx), timers, frames };
}

test('saved Music Off defers downloads and race predecode until enabled', () => {
  const urls = [];
  const { run, frames } = setup(false, url => { urls.push(url); return new Promise(() => {}); });
  run('musicInit(); musicTick()');
  expect(urls).toEqual([]);
  run('state="INTRO"; SONGS.race.st="fetched"; SONGS.race.bytes=new ArrayBuffer(4); musicTick()');
  expect(frames).toEqual([]);
  run('save.music=true; state="WARDROBE"; musicTick()');
  expect(urls).toContain('audio/showroom.mp3');
});

test('a stalled whole-response audio download times out and enters retry', async () => {
  const { run, timers } = setup(false, (url, { signal }) => Promise.resolve({
    ok: true, body: null, arrayBuffer: () => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    })
  }));
  run('songFetch("chase")');
  await new Promise(resolve => setImmediate(resolve));
  expect(timers.size).toBe(1);
  const [[expire, delay]] = timers;
  expect(delay).toBeGreaterThan(12000);
  expire();
  await new Promise(resolve => setImmediate(resolve));
  expect(run('[SONGS.chase.st,SONGS.chase.err,SONGS.chase.retryAt]')).toEqual(['failed','timeout',3000]);
});

test('intro skips and changes of wanted or race state select the right recording', () => {
  const { run } = setup(false, () => new Promise(() => {}));
  run('save.music=true; state="ARRIVAL"; let arrivalSince=0');
  expect(run('musicWant()[0]')).toBe('reveal');
  run('matchMedia=()=>({matches:true})');
  expect(run('musicWant()[0]')).toBeNull();
  expect(run('state="WARDROBE"; musicWant()[0]')).toBe('lounge');
  expect(run('state="DRIVE"; musicWant()[0]')).toBe('coast');
  expect(run('WANTED.lvl=2; musicWant()[0]')).toBe('chase');
  expect(run('state="PAUSE"; musicWant()')).toEqual(['chase', 0.5]);
  expect(run('state="DRIVE"; WANTED.lvl=0; musicWant()[0]')).toBe('coast');
  expect(run('ev={}; musicWant()[0]')).toBe('race');
  expect(run('ev=null; musicWant()[0]')).toBe('coast');
});
