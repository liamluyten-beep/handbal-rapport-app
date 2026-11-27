import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ploegVanPad, isTestPad, PLOEGEN, heeftFunctie } from '../js/lib/ploeg.js';

test('ploegVanPad: U16 bovenaan, Heren 1 onder /heren1/ (ook in de testversie)', () => {
  assert.equal(ploegVanPad('/'), 'u16');
  assert.equal(ploegVanPad('/index.html'), 'u16');
  assert.equal(ploegVanPad('/test/'), 'u16');
  assert.equal(ploegVanPad('/heren1/'), 'heren1');
  assert.equal(ploegVanPad('/heren1'), 'heren1');
  assert.equal(ploegVanPad('/test/heren1/index.html'), 'heren1');
});

test('isTestPad: enkel onder /test/', () => {
  assert.equal(isTestPad('/test/'), true);
  assert.equal(isTestPad('/test/heren1/'), true);
  assert.equal(isTestPad('/heren1/'), false);
  assert.equal(isTestPad('/'), false);
});

test('functies: Heren 1 enkel matchstats, U16 alles behalve ploegstats', () => {
  const h = PLOEGEN.heren1, u = PLOEGEN.u16;
  assert.equal(heeftFunctie(h, 'ploegstats'), true);
  for (const f of ['rapporten', 'xp', 'trainingen', 'schieten', 'playbook', 'opstelling']) {
    assert.equal(heeftFunctie(h, f), false, f);
    assert.equal(heeftFunctie(u, f), true, f);
  }
  assert.equal(heeftFunctie(u, 'ploegstats'), false);
});

test('profielen: aparte sessie en data voor Heren 1, U16 onveranderd', () => {
  assert.equal(PLOEGEN.u16.opslagSleutel, null);
  assert.equal(PLOEGEN.u16.dataBestand, 'clubee.json');
  assert.equal(PLOEGEN.heren1.opslagSleutel, 'sb-heren1');
  assert.equal(PLOEGEN.heren1.dataBestand, 'clubee-heren1.json');
  assert.notEqual(PLOEGEN.heren1.supabaseUrl, PLOEGEN.u16.supabaseUrl);
});
