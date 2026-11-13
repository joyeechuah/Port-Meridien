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

test('every car has a made-up make and model, and keeps its id, class and figures', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const cars = vm.runInNewContext(html.match(/const CARS=(\[[\s\S]*?\n\]);/)[1]);
  expect(cars).toHaveLength(24);
  // the names approved on 13 Nov 2026 (docs/CAR_NAME_PROPOSAL.md); ids are what saves, records and ghosts refer to
  expect(cars.map(c => `${c.id}: ${c.mk} ${c.md}`)).toEqual([
    'golf: Veltren Kest 25', 'mini: Brindle Pip S', 'mx5: Aokira Sora 2', 'mustang: Rookwell Outrider', 'challenger: Darrow Brawler 8', 'tt: Veltren Arc 6',
    'm3: Veltren Vektor 4', 'rrsport: Brindle Moorland', 'gtr: Aokira Kazan 6', 'amggt: Veltren Strahl R', 'cayenne: Kessler Vale Cairn X', 'viper: Darrow Fang 10',
    'vantage: Wychford Vesper R', 'dbs: Wychford Regent', 'r8: Veltren Arc 10', 'urus: Orsini Vale Torra', 'gt3: Kessler Vale Ridge RS', 'f488: Bellora Ventra S',
    'huracan: Orsini Vale Saetta', 'mclaren: Wychford Needle LT', 'apollo: Kessler Vale Anvil S', 'ccx: Norrvik Skeld', 'sf90: Bellora Fulmine H', 'chiron: Montreval Sovereign',
  ]);
  const real = /Volkswagen|Golf|Mini|Cooper|Mazda|MX-5|Ford|Mustang|Dodge|Challenger|Audi|BMW|Range Rover|Nissan|GT-R|Mercedes|AMG|Porsche|Cayenne|Viper|Aston|Vantage|Lamborghini|Urus|Ferrari|Hurac|McLaren|Gumpert|Apollo|Koenigsegg|Bugatti|Chiron/i;
  for (const c of cars) expect(`${c.mk} ${c.md}`).not.toMatch(real);
  // what the names don't touch
  const golf = cars[0], chiron = cars[23];
  expect([golf.cls, golf.price, golf.top, chiron.cls, chiron.price, chiron.top]).toEqual(['A1', 25000, 238, 'A7', 750000, 440]);
});
