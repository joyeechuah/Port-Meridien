// Renaming visible places must not sever the name-based joins used to build activities.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Port Meridien screens and descriptions distinguish the early build from planned features', () => {
  const markup = html.slice(0, html.indexOf('<script src='));
  expect(markup).not.toMatch(/IBIZA|EIVISSA|ISLAND PASSPORT|ISLAND OF/);
  expect(markup).toContain('<div class="t">EARLY BUILD</div>');
  expect(markup).toContain('Walking, boats and a new city are planned.');
  expect(html).toContain('Explore Port Meridien. Tap MAP to plan a route.');
  expect(html).toContain('Explore Port Meridien. Press M for the map.');
  expect(html).not.toContain('ISLAND PASSPORT COMPLETE');
});

test('renamed zones still match all contract and landmark lookups, with stable saved IDs', () => {
  const zones = vm.runInNewContext(html.match(/const ZONES=(\[[\s\S]*?\]);/)[1]);
  const towns = vm.runInNewContext(html.match(/const JOB_TOWNS=(\[[\s\S]*?\]);/)[1]);
  const landmarks = vm.runInNewContext(html.match(/for\(const\[id,zn,name\] of (\[[\s\S]*?\])\)\{/)[1]);
  const names = zones.map(z => z.n);
  expect(names).toHaveLength(10);
  expect(new Set(names).size).toBe(10);
  expect(names).toContain('OLD QUAY');
  expect(towns).toHaveLength(8);
  expect(landmarks).toHaveLength(10);
  for (const [, zone, display] of [...towns, ...landmarks]) {
    expect(names).toContain(zone);
    expect(display).not.toMatch(/Eivissa|Sant |Santa |Talaia|Portinatx|Cubells|Llonga/);
  }
  expect(towns.map(t => t[0])).toEqual(['eivissa', 'santa_eularia', 'sant_antoni', 'sant_josep', 'sant_joan', 'sant_llorenc', 'portinatx', 'es_cubells']);
  expect(landmarks.map(l => l[0])).toEqual(['eivissa_town', 'santa_eularia', 'sant_antoni', 'sant_josep', 'sant_joan', 'sant_llorenc', 'cala_llonga', 'portinatx', 'es_cubells', 'sa_talaia_pass']);
});
