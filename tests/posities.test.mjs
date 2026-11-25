import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POSITIES, leesPosities, controleerPosities } from '../js/lib/posities.js';

test('lijst met posities', () => {
  assert.deepEqual(POSITIES, ['Doelman', 'Linkerhoek', 'Linkeropbouw', 'Spelverdeler', 'Rechteropbouw', 'Rechterhoek', 'Cirkelloper']);
});

test('leesPosities uit opgeslagen tekst', () => {
  assert.deepEqual(leesPosities('Linkeropbouw, Spelverdeler'), ['Linkeropbouw', 'Spelverdeler']);
  assert.deepEqual(leesPosities('Doelman'), ['Doelman']);
  assert.deepEqual(leesPosities(null), []);
  assert.deepEqual(leesPosities(''), []);
});

test('controleerPosities: maximum 2, enkel bekende, geen dubbels', () => {
  assert.equal(controleerPosities(['Doelman']), null);
  assert.equal(controleerPosities([]), null);
  assert.equal(controleerPosities(['Doelman', 'Linkerhoek']), null);
  assert.match(controleerPosities(['Doelman', 'Linkerhoek', 'Cirkelloper']), /maximum 2/i);
  assert.match(controleerPosities(['Keeper']), /onbekend/i);
  assert.match(controleerPosities(['Doelman', 'Doelman']), /dubbel/i);
});
