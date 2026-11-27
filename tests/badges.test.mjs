import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berekenBadges, BADGES } from '../js/lib/badges.js';

const schot = (o = {}) => ({ datum: '2026-11-20', resultaat: 'goal', positie: 'LO', doelzone: 1, uitdaging_zone: 1, sessie_id: 's1', ...o });
const leeg = { schoten: [], sessies: [], aanwezig: [], goals: [], zelf: [], rapporten: [] };
const badge = (lijst, id) => lijst.find(b => b.id === id);

test('12 badges, niets behaald zonder gegevens, met voortgang', () => {
  assert.equal(BADGES.length, 12);
  const b = berekenBadges(leeg);
  assert.equal(b.filter(x => x.behaald).length, 0);
  assert.deepEqual(badge(b, 'honderd').voortgang, { huidig: 0, doel: 100 });
});

test('schiettraining-badges', () => {
  const sessies = [{ id: 's1', gestopt_op: 'x' }, { id: 's2', gestopt_op: null }];
  const schoten = [
    ...Array.from({ length: 8 }, () => schot()), schot({ resultaat: 'redding' }), schot({ resultaat: 'mis', doelzone: null }),  // s1: 8/10 = 80%
    ...['LH', 'MO', 'RO', 'RH', 'CIR'].map(p => schot({ positie: p, sessie_id: 's2', uitdaging_zone: 9 })),
  ];
  const b = berekenBadges({ ...leeg, schoten, sessies });
  assert.equal(badge(b, 'eerste-schot').behaald, true);
  assert.equal(badge(b, 'scherpschutter').behaald, true);
  assert.equal(badge(b, 'allround').behaald, true);
  assert.equal(badge(b, 'precisie').behaald, false);
  assert.deepEqual(badge(b, 'precisie').voortgang, { huidig: 8, doel: 25 });
  assert.deepEqual(badge(b, 'honderd').voortgang, { huidig: 13, doel: 100 });
});

test('scherpschutter enkel in een afgesloten sessie met minstens 10 schoten', () => {
  const b = berekenBadges({ ...leeg, sessies: [{ id: 's1', gestopt_op: null }], schoten: Array.from({ length: 12 }, () => schot()) });
  assert.equal(badge(b, 'scherpschutter').behaald, false);
});

test('training: 10 op rij aanwezig en 90% over minstens 10 trainingen', () => {
  const rij = (status, d) => ({ status, trainingen: { datum: `2026-10-${String(d).padStart(2, '0')}` } });
  const aanwezig = [rij('afwezig', 1), ...Array.from({ length: 10 }, (_, i) => rij('aanwezig', i + 2))];
  const b = berekenBadges({ ...leeg, aanwezig });
  assert.equal(badge(b, 'paraat').behaald, true);
  assert.equal(badge(b, 'volhouder').behaald, true);        // 10/11 = 91%
  const b2 = berekenBadges({ ...leeg, aanwezig: [rij('aanwezig', 1), rij('verwittigd', 2), ...Array.from({ length: 9 }, (_, i) => rij('aanwezig', i + 3))] });
  assert.equal(badge(b2, 'paraat').behaald, false);          // reeks onderbroken
  assert.deepEqual(badge(b2, 'paraat').voortgang, { huidig: 9, doel: 10 });
});

test('match-badges uit de goals', () => {
  const goals = [{ aantal: 1, zeven_m: 2 }, { aantal: 3, zeven_m: 3 }, { aantal: 0, zeven_m: 0 }];
  const b = berekenBadges({ ...leeg, goals });
  assert.equal(badge(b, 'eerste-goal').behaald, true);
  assert.equal(badge(b, 'hattrick').behaald, true);
  assert.equal(badge(b, 'zevenmeter').behaald, true);
});

test('groei: 3 maanden op rij zelfevaluatie, +2 op een vaardigheid', () => {
  const zelf = [{ datum: '2026-09-10' }, { datum: '2026-10-02' }, { datum: '2026-11-20' }];
  const rapporten = [
    { datum: '2026-09-01', report_scores: [{ skill_id: 1, score: 2 }, { skill_id: 2, score: 3 }] },
    { datum: '2026-11-01', report_scores: [{ skill_id: 1, score: 4 }, { skill_id: 2, score: 3 }] },
  ];
  const b = berekenBadges({ ...leeg, zelf, rapporten });
  assert.equal(badge(b, 'eerlijk').behaald, true);
  assert.equal(badge(b, 'groeier').behaald, true);
  const b2 = berekenBadges({ ...leeg, zelf: [{ datum: '2026-09-10' }, { datum: '2026-11-02' }] });
  assert.equal(badge(b2, 'eerlijk').behaald, false);         // oktober ontbreekt
});
