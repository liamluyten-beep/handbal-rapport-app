import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doelmanStats, alsSchoten } from '../js/lib/schiet.js';

const s = (doelman_id, resultaat, player_id = 'x') => ({ doelman_id, resultaat, player_id, positie: 'LO', doelzone: 1 });

test('alsSchoten maakt trainingsschoten bruikbaar voor schotStats', () => {
  assert.deepEqual(alsSchoten([{ resultaat: 'goal', positie: 'LO' }]), [{ resultaat: 'goal', positie: 'LO', soort: 'schot' }]);
});

test('doelmanStats: reddingspercentage op schoten op doel (missers tellen niet mee)', () => {
  const rijen = [s('k1', 'goal'), s('k1', 'redding'), s('k1', 'redding'), s('k1', 'mis'), s('k2', 'goal'), s(null, 'goal')];
  assert.deepEqual(doelmanStats(rijen), [
    { doelman_id: 'k1', opDoel: 3, gestopt: 2, tegen: 1, pct: 67 },
    { doelman_id: 'k2', opDoel: 1, gestopt: 0, tegen: 1, pct: 0 },
    { doelman_id: null, opDoel: 1, gestopt: 0, tegen: 1, pct: 0 },
  ]);
  assert.deepEqual(doelmanStats([s('k1', 'mis')]), [{ doelman_id: 'k1', opDoel: 0, gestopt: 0, tegen: 0, pct: null }]);
});
