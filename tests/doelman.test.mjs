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
