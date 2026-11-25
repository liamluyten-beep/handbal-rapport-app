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

import { rangschikSchutters, rangschikDoelmannen } from '../js/lib/schiet.js';

const spelers = [{ id: 'a', naam: 'Alex' }, { id: 'w', naam: 'Warre' }, { id: 'n', naam: 'Nyo' }, { id: 'k', naam: 'Kinai' }];
const sch = (player_id, positie, resultaat, doelman_id = 'k') => ({ player_id, positie, resultaat, doelman_id });

test('rangschikSchutters: beste eerst, bij gelijk % wie meer schoot', () => {
  const rijen = [sch('a', 'LO', 'goal'), sch('a', 'LO', 'mis'), sch('w', 'LO', 'goal'), sch('w', 'RH', 'goal'),
    sch('w', 'RH', 'redding'), sch('w', 'RH', 'goal'), sch('n', 'CIR', 'goal'), sch('n', 'CIR', 'goal'), sch('n', 'CIR', 'redding')];
  assert.deepEqual(rangschikSchutters(rijen, spelers).map(r => [r.naam, r.goals, r.schoten, r.pct]),
    [['Warre', 3, 4, 75], ['Nyo', 2, 3, 67], ['Alex', 1, 2, 50]]);
});

test('rangschikSchutters met positiefilter', () => {
  const rijen = [sch('a', 'LO', 'goal'), sch('a', 'LO', 'mis'), sch('w', 'LO', 'mis'), sch('w', 'RH', 'goal')];
  assert.deepEqual(rangschikSchutters(rijen, spelers, 'LO').map(r => [r.naam, r.pct]), [['Alex', 50], ['Warre', 0]]);
  assert.deepEqual(rangschikSchutters(rijen, spelers, 'CIR'), []);
});

test('rangschikDoelmannen: hoogste reddingspercentage eerst, "andere doelman" niet', () => {
  const rijen = [sch('a', 'LO', 'goal', 'k'), sch('a', 'LO', 'redding', 'k'), sch('a', 'LO', 'redding', 'w'),
    sch('a', 'LO', 'mis', 'w'), sch('a', 'LO', 'redding', null)];
  assert.deepEqual(rangschikDoelmannen(rijen, spelers).map(r => [r.naam, r.gestopt, r.opDoel, r.pct, r.mis]),
    [['Warre', 1, 1, 100, 1], ['Kinai', 1, 2, 50, 0]]);
});
