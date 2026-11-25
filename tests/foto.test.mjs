import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vierkantUitsnede, fotoPad } from '../js/lib/foto.js';

test('vierkantUitsnede: liggende foto wordt in het midden bijgesneden', () => {
  assert.deepEqual(vierkantUitsnede(1200, 800), { sx: 200, sy: 0, zijde: 800 });
});

test('vierkantUitsnede: staande foto houdt het bovenste deel (gezicht)', () => {
  assert.deepEqual(vierkantUitsnede(800, 1200), { sx: 0, sy: 80, zijde: 800 });
});

test('vierkantUitsnede: vierkant blijft gelijk', () => {
  assert.deepEqual(vierkantUitsnede(500, 500), { sx: 0, sy: 0, zijde: 500 });
});

test('fotoPad per speler', () => {
  assert.equal(fotoPad('abc-123'), 'abc-123.jpg');
});

import { uitsnede } from '../js/lib/foto.js';

test('uitsnede 16:9: te hoge foto wordt boven het midden bijgesneden', () => {
  assert.deepEqual(uitsnede(1600, 1200, 16 / 9), { sx: 0, sy: 75, b: 1600, h: 900 });
});

test('uitsnede 16:9: te brede foto wordt in het midden bijgesneden', () => {
  assert.deepEqual(uitsnede(4000, 1000, 16 / 9), { sx: 1111, sy: 0, b: 1778, h: 1000 });
});

import { effenRand } from '../js/lib/foto.js';

// Maak een "foto" (helderheid per pixel) met een witte rand van r pixels rond een donkere inhoud
function metRand(b, h, r) {
  const px = new Uint8Array(b * h).fill(250);
  for (let y = r; y < h - r; y++) for (let x = r; x < b - r; x++) px[y * b + x] = (x * 7 + y * 3) % 200;
  return px;
}

test('effenRand: witte rand rond de foto wordt gevonden', () => {
  assert.deepEqual(effenRand(metRand(100, 60, 4), 100, 60), { x: 4, y: 4, b: 92, h: 52 });
});

test('effenRand: foto zonder rand blijft heel', () => {
  assert.deepEqual(effenRand(metRand(100, 60, 0), 100, 60), { x: 0, y: 0, b: 100, h: 60 });
});

test('effenRand: een volledig witte foto wordt niet weggeknipt', () => {
  assert.deepEqual(effenRand(new Uint8Array(50 * 40).fill(255), 50, 40), { x: 0, y: 0, b: 50, h: 40 });
});
