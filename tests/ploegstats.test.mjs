import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topschutters } from '../js/lib/ploegstats.js';

const spelers = [
  { id: 'a', naam: 'Bram', rugnummer: 7 },
  { id: 'b', naam: 'Arne', rugnummer: 9 },
  { id: 'c', naam: 'Cas', rugnummer: 3 },
  { id: 'd', naam: 'Dries', rugnummer: null },
];
const goals = [
  { player_id: 'a', match_id: 'm1', aantal: 5, zeven_m: 2, twee_min: 1 },
  { player_id: 'a', match_id: 'm2', aantal: 3, zeven_m: null },
  { player_id: 'b', match_id: 'm1', aantal: 8, zeven_m: 1 },
  { player_id: 'c', match_id: 'm1', aantal: 0 },
];
const events = [
  { player_id: 'a', soort: 'schot', resultaat: 'goal' },
  { player_id: 'a', soort: 'schot', resultaat: 'redding' },
  { player_id: 'a', soort: 'schot', resultaat: 'mis' },
  { player_id: 'a', soort: 'schot', resultaat: 'goal' },
  { player_id: 'a', soort: 'twee_min' },
  { player_id: 'b', soort: 'balverlies' },
];

test('topschutters: goals, matchen, 7m, gemiddelde en live rendement', () => {
  const r = topschutters(spelers, goals, events);
  const a = r.find(x => x.speler.id === 'a');
  assert.equal(a.goals, 8);
  assert.equal(a.matchen, 2);
  assert.equal(a.zevenM, 2);
  assert.equal(a.gemiddelde, 4);
  assert.equal(a.schoten, 4);
  assert.equal(a.rendement, 50);
  assert.equal(a.tweeMin, 1);
  const b = r.find(x => x.speler.id === 'b');
  assert.equal(b.schoten, 0);
  assert.equal(b.rendement, null);
});

test('topschutters: volgorde goals, dan gemiddelde, dan naam; iedereen staat erin', () => {
  const r = topschutters(spelers, goals, events);
  assert.equal(r.length, 4);
  // b (8 in 1 match, gem 8) voor a (8 in 2, gem 4)
  assert.equal(r[0].speler.id, 'b');
  assert.equal(r[1].speler.id, 'a');
  // c en d: 0 goals -> op naam (Cas voor Dries)
  assert.deepEqual(r.slice(2).map(x => x.speler.naam), ['Cas', 'Dries']);
  const d = r.find(x => x.speler.id === 'd');
  assert.equal(d.matchen, 0);
  assert.equal(d.gemiddelde, null);
});

test('topschutters: gemiddelde op 1 decimaal, goals van onbekende spelers genegeerd', () => {
  const r = topschutters([{ id: 'x', naam: 'X' }],
    [{ player_id: 'x', match_id: 1, aantal: 1 }, { player_id: 'x', match_id: 2, aantal: 1 }, { player_id: 'x', match_id: 3, aantal: 2 }, { player_id: 'zz', match_id: 1, aantal: 9 }], []);
  assert.equal(r.length, 1);
  assert.equal(r[0].gemiddelde, 1.3);
});
