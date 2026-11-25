import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groepeerDoelmanRapport } from '../js/lib/schiet.js';

test('doelmanrapport per dag: alle schutters samen (voorbeeld Alex 3/4 + Warre 5/6)', () => {
  const rijen = [
    { datum: '2026-11-25', schutter: 'Alex', schoten: 4, goals: 3, reddingen: 1, mis: 0 },
    { datum: '2026-11-25', schutter: 'Warre', schoten: 6, goals: 5, reddingen: 1, mis: 0 },
    { datum: '2026-11-18', schutter: 'Alex', schoten: 5, goals: 2, reddingen: 2, mis: 1 },
  ];
  assert.deepEqual(groepeerDoelmanRapport(rijen), [
    { datum: '2026-11-25', schoten: 10, goals: 8, reddingen: 2, mis: 0, opDoel: 10, pct: 20,
      schutters: [{ schutter: 'Alex', schoten: 4, goals: 3, reddingen: 1, mis: 0 }, { schutter: 'Warre', schoten: 6, goals: 5, reddingen: 1, mis: 0 }] },
    { datum: '2026-11-18', schoten: 5, goals: 2, reddingen: 2, mis: 1, opDoel: 4, pct: 50,
      schutters: [{ schutter: 'Alex', schoten: 5, goals: 2, reddingen: 2, mis: 1 }] },
  ]);
  assert.deepEqual(groepeerDoelmanRapport([]), []);
});

import { keeperStats, perSchutterTotaal } from '../js/lib/schiet.js';

test('keeperStats: reddingen per positie en per zone (missers apart)', () => {
  const r = (positie, resultaat, doelzone = null) => ({ positie, resultaat, doelzone });
  const s = keeperStats([r('LO', 'goal', 3), r('LO', 'redding', 3), r('LO', 'redding', 1), r('LO', 'mis'), r('RH', 'goal', 9)]);
  assert.deepEqual({ opDoel: s.opDoel, gestopt: s.gestopt, mis: s.mis, pct: s.pct }, { opDoel: 4, gestopt: 2, mis: 1, pct: 50 });
  assert.deepEqual(s.perPositie, [
    { code: 'LO', naam: 'Linkeropbouw', opDoel: 3, gestopt: 2, tegen: 1, mis: 1, pct: 67 },
    { code: 'RH', naam: 'Rechterhoek', opDoel: 1, gestopt: 0, tegen: 1, mis: 0, pct: 0 },
  ]);
  assert.deepEqual(s.perZone[2], { zone: 3, goals: 1, gestopt: 1 });
  assert.deepEqual(s.perZone[0], { zone: 1, goals: 0, gestopt: 1 });
});

test('perSchutterTotaal: doelmanrapport-rijen over alle dagen per schutter, moeilijkste eerst', () => {
  const rijen = [
    { datum: 'a', schutter: 'Alex', schoten: 4, goals: 3, reddingen: 1, mis: 0 },
    { datum: 'b', schutter: 'Alex', schoten: 5, goals: 2, reddingen: 2, mis: 1 },
    { datum: 'a', schutter: 'Warre', schoten: 6, goals: 1, reddingen: 5, mis: 0 },
  ];
  assert.deepEqual(perSchutterTotaal(rijen), [
    { schutter: 'Alex', schoten: 9, goals: 5, reddingen: 3, mis: 1, pct: 38 },
    { schutter: 'Warre', schoten: 6, goals: 1, reddingen: 5, mis: 0, pct: 83 },
  ]);
});
