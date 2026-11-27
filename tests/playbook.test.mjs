import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AANVALLERS, startStap, volgendeStap, pijlenTussen, tussenStand } from '../js/lib/playbook.js';

test('6 aanvallers in de beginopstelling, spelverdeler aan de bal', () => {
  assert.deepEqual(AANVALLERS, ['LH', 'LO', 'MO', 'RO', 'RH', 'CIR']);
  const s = startStap();
  assert.deepEqual(Object.keys(s.spelers), AANVALLERS);
  assert.equal(s.bal, 'MO');
  assert.equal(s.tekst, '');
});

test('volgendeStap kopieert de posities (niet dezelfde objecten) en wist de tekst', () => {
  const a = { ...startStap(), tekst: 'Start' };
  const b = volgendeStap(a);
  assert.deepEqual(b.spelers, a.spelers);
  b.spelers.LO.x = 99;
  assert.notEqual(a.spelers.LO.x, 99);
  assert.equal(b.tekst, '');
  assert.equal(b.bal, a.bal);
});

test('pijlenTussen: looplijn voor wie verplaatst, pas als de bal wisselt', () => {
  const a = startStap();
  const b = volgendeStap(a);
  b.spelers.LO = { x: 40, y: 30 };       // LO loopt in
  b.bal = 'LO';                            // MO past naar LO
  const p = pijlenTussen(a, b);
  assert.deepEqual(p, [
    { soort: 'loop', speler: 'LO', van: a.spelers.LO, naar: { x: 40, y: 30 } },
    { soort: 'pas', van: a.spelers.MO, naar: { x: 40, y: 30 } },
  ]);
});

test('pijlenTussen: kleine verschuivingen (< 2) tellen niet als looplijn', () => {
  const a = startStap();
  const b = volgendeStap(a);
  b.spelers.RH = { x: a.spelers.RH.x + 1, y: a.spelers.RH.y };
  assert.deepEqual(pijlenTussen(a, b), []);
});

test('tussenStand: halverwege tussen twee stappen', () => {
  const a = startStap();
  const b = volgendeStap(a);
  b.spelers.CIR = { x: a.spelers.CIR.x + 20, y: a.spelers.CIR.y };
  assert.deepEqual(tussenStand(a, b, 0.5).CIR, { x: a.spelers.CIR.x + 10, y: a.spelers.CIR.y });
  assert.deepEqual(tussenStand(a, b, 0).LO, a.spelers.LO);
  assert.deepEqual(tussenStand(a, b, 1).CIR, b.spelers.CIR);
});
