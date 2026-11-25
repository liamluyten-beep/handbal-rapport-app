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
