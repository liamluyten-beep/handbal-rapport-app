import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VELDPOSITIES, scoreUitEvents, schotStats, actieveStraffen, formatKlok, klokSeconden,
  absoluteSeconde, verschilMetClubee, nieuweKlok, startKlok, pauzeerKlok, volgendeHelft,
} from '../js/lib/live.js';

const schot = (player_id, positie, resultaat, doelzone = null, helft = 1, seconde = 0) =>
  ({ soort: 'schot', player_id, positie, resultaat, doelzone, helft, seconde });

test('veldposities', () => {
  assert.deepEqual(VELDPOSITIES.map(p => p.code), ['LH', 'LO', 'MO', 'RO', 'RH', 'CIR', '7M', 'TA']);
});

test('scoreUitEvents telt eigen goals en tegengoals', () => {
  const ev = [schot('a', 'LO', 'goal'), schot('a', 'LO', 'mis'), { soort: 'tegengoal' }, schot('b', '7M', 'goal'), { soort: 'twee_min', player_id: 'a' }];
  assert.deepEqual(scoreUitEvents(ev), { voor: 2, tegen: 1 });
  assert.deepEqual(scoreUitEvents([]), { voor: 0, tegen: 0 });
});

test('schotStats per positie en per doelzone', () => {
  const ev = [
    schot('a', 'LO', 'goal', 7), schot('a', 'LO', 'redding', 7), schot('a', 'LO', 'mis'),
    schot('a', '7M', 'goal', 3), { soort: 'tegengoal' },
  ];
  const s = schotStats(ev);
  assert.equal(s.schoten, 4);
  assert.equal(s.goals, 2);
  assert.equal(s.pct, 50);
  assert.deepEqual(s.perPositie, [
    { code: 'LO', naam: 'Linkeropbouw', schoten: 3, goals: 1, pct: 33 },
    { code: '7M', naam: '7 meter', schoten: 1, goals: 1, pct: 100 },
  ]);
  assert.deepEqual(s.perZone[6], { zone: 7, goals: 1, gestopt: 1 });
  assert.deepEqual(s.perZone[2], { zone: 3, goals: 1, gestopt: 0 });
  assert.equal(s.perZone.length, 9);
});

test('schotStats zonder schoten', () => {
  const s = schotStats([]);
  assert.equal(s.schoten, 0);
  assert.equal(s.pct, null);
  assert.deepEqual(s.perPositie, []);
});

test('formatKlok', () => {
  assert.equal(formatKlok(0), '0:00');
  assert.equal(formatKlok(65), '1:05');
  assert.equal(formatKlok(1500), '25:00');
});

test('klok: starten, pauzeren, volgende helft', () => {
  let k = nieuweKlok(25);
  assert.deepEqual(k, { helft: 1, basis: 0, sinds: null, helftDuur: 1500 });
  k = startKlok(k, 1000);
  assert.equal(klokSeconden(k, 1000 + 90_000), 90);
  k = pauzeerKlok(k, 1000 + 90_000);
  assert.equal(klokSeconden(k, 1000 + 500_000), 90);
  k = startKlok(k, 2_000_000);
  assert.equal(klokSeconden(k, 2_010_000), 100);
  k = volgendeHelft(k);
  assert.deepEqual(k, { helft: 2, basis: 0, sinds: null, helftDuur: 1500 });
});

test('absoluteSeconde telt helften op', () => {
  assert.equal(absoluteSeconde({ helft: 1, seconde: 30 }, 1500), 30);
  assert.equal(absoluteSeconde({ helft: 2, seconde: 30 }, 1500), 1530);
});

test('actieveStraffen: 2 minuten aftellen op de wedstrijdklok', () => {
  const ev = [
    { soort: 'twee_min', player_id: 'a', helft: 1, seconde: 100 },
    { soort: 'twee_min_tegen', helft: 1, seconde: 150 },
    { soort: 'twee_min', player_id: 'b', helft: 1, seconde: 10 },
  ];
  const nu = { helft: 1, seconde: 160 };
  assert.deepEqual(actieveStraffen(ev, nu, 1500), [
    { player_id: 'a', tegen: false, resterend: 60 },
    { player_id: null, tegen: true, resterend: 110 },
  ]);
  // over de rust heen
  assert.deepEqual(actieveStraffen([{ soort: 'twee_min', player_id: 'a', helft: 1, seconde: 1450 }], { helft: 2, seconde: 20 }, 1500),
    [{ player_id: 'a', tegen: false, resterend: 50 }]);
});

test('verschilMetClubee: enkel spelers waar het aantal goals afwijkt', () => {
  const ev = [schot('a', 'LO', 'goal'), schot('a', 'LO', 'goal'), schot('b', 'RH', 'goal'), schot('c', 'RH', 'mis')];
  const clubee = [{ player_id: 'a', aantal: 2 }, { player_id: 'b', aantal: 3 }, { player_id: 'd', aantal: 1 }];
  assert.deepEqual(verschilMetClubee(ev, clubee), [
    { player_id: 'b', live: 1, clubee: 3 },
    { player_id: 'd', live: 0, clubee: 1 },
  ]);
});

import { resultaatVerdeling, filterHelft } from '../js/lib/live.js';

test('resultaatVerdeling: aantallen en percentages van goals, reddingen, missers', () => {
  const ev = [schot('a', 'LO', 'goal'), schot('a', 'LO', 'goal'), schot('b', 'RH', 'redding'), schot('b', 'RH', 'mis'), { soort: 'tegengoal' }];
  assert.deepEqual(resultaatVerdeling(ev), {
    schoten: 4,
    goal: { aantal: 2, pct: 50 }, redding: { aantal: 1, pct: 25 }, mis: { aantal: 1, pct: 25 },
  });
  assert.deepEqual(resultaatVerdeling([]), {
    schoten: 0, goal: { aantal: 0, pct: null }, redding: { aantal: 0, pct: null }, mis: { aantal: 0, pct: null },
  });
});

test('filterHelft', () => {
  const ev = [schot('a', 'LO', 'goal', null, 1), schot('a', 'LO', 'mis', null, 2), { soort: 'tegengoal', helft: 2 }];
  assert.equal(filterHelft(ev, 0).length, 3);
  assert.equal(filterHelft(ev, 1).length, 1);
  assert.equal(filterHelft(ev, 2).length, 2);
});
