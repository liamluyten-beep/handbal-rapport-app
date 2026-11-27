import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VELD7, legeOpstelling, plaats, haalWeg, waarStaat, ingedeeld, telling } from '../js/lib/opstelling.js';

test('7 posities', () => {
  assert.deepEqual(VELD7.map(p => p.code), ['DM', 'LH', 'LO', 'MO', 'RO', 'RH', 'CIR']);
});

test('plaats op een positie; speler verdwijnt van zijn vorige plek', () => {
  let o = legeOpstelling();
  o = plaats(o, 'a', 'LO');
  assert.equal(o.posities.LO, 'a');
  o = plaats(o, 'a', 'RO');
  assert.equal(o.posities.LO, null);
  assert.equal(o.posities.RO, 'a');
  assert.equal(waarStaat(o, 'a'), 'RO');
});

test('plaats op een bezette positie: de vorige speler gaat naar de bank', () => {
  let o = plaats(legeOpstelling(), 'a', 'MO');
  o = plaats(o, 'b', 'MO');
  assert.equal(o.posities.MO, 'b');
  assert.deepEqual(o.bank, ['a']);
});

test('naar de bank en weer weg', () => {
  let o = plaats(legeOpstelling(), 'a', 'CIR');
  o = plaats(o, 'a', 'bank');
  assert.equal(o.posities.CIR, null);
  assert.deepEqual(o.bank, ['a']);
  o = plaats(o, 'a', 'bank');                // niet dubbel
  assert.deepEqual(o.bank, ['a']);
  o = haalWeg(o, 'a');
  assert.deepEqual(o.bank, []);
  assert.equal(waarStaat(o, 'a'), null);
});

test('ingedeeld en telling', () => {
  let o = legeOpstelling();
  o = plaats(o, 'a', 'DM'); o = plaats(o, 'b', 'LH'); o = plaats(o, 'c', 'bank');
  assert.deepEqual([...ingedeeld(o)].sort(), ['a', 'b', 'c']);
  assert.deepEqual(telling(o), { basis: 2, bank: 1, totaal: 3 });
});

test('oude of onvolledige opstelling uit de database wordt aangevuld', () => {
  const o = plaats({ posities: { LO: 'x' } }, 'y', 'RH');
  assert.equal(o.posities.LO, 'x');
  assert.equal(o.posities.DM, null);
  assert.deepEqual(o.bank, []);
});
