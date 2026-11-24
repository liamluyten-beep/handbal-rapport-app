import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreReeksen, goalsReeks, formatDatum } from '../js/lib/voortgang.js';

const skills = [{ id: 1, naam: 'Werpen', volgorde: 1 }, { id: 2, naam: 'Verdedigen', volgorde: 2 }];

test('scoreReeksen sorteert op datum en vult ontbrekende scores met null', () => {
  const rapporten = [
    { datum: '2026-11-01', report_scores: [{ skill_id: 1, score: 4 }] },
    { datum: '2026-09-01', report_scores: [{ skill_id: 1, score: 2 }, { skill_id: 2, score: 3 }] },
  ];
  assert.deepEqual(scoreReeksen(rapporten, skills), {
    labels: ['01/09/2026', '01/11/2026'],
    datasets: [
      { label: 'Werpen', data: [2, 4] },
      { label: 'Verdedigen', data: [3, null] },
    ],
  });
});

test('scoreReeksen zonder rapporten', () => {
  assert.deepEqual(scoreReeksen([], skills), { labels: [], datasets: [] });
});

test('goalsReeks sorteert op wedstrijddatum met tegenstander in label', () => {
  const goals = [
    { aantal: 3, matches: { datum: '2026-10-20', tegenstander: 'Sasja' } },
    { aantal: 1, matches: { datum: '2026-10-05', tegenstander: 'Visé' } },
  ];
  assert.deepEqual(goalsReeks(goals), {
    labels: ['05/10 Visé', '20/10 Sasja'], data: [1, 3], totaal: 4,
  });
});

test('goalsReeks leeg', () => {
  assert.deepEqual(goalsReeks([]), { labels: [], data: [], totaal: 0 });
});

test('formatDatum', () => {
  assert.equal(formatDatum('2026-03-07'), '07/03/2026');
});
