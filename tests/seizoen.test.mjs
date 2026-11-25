import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seizoenVan, seizoenGrenzen, inSeizoen, seizoenenLijst, ALLE } from '../js/lib/seizoen.js';

test('seizoenVan: vanaf 1 augustus begint een nieuw seizoen', () => {
  assert.equal(seizoenVan('2026-08-01'), '2026-27');
  assert.equal(seizoenVan('2026-11-25'), '2026-27');
  assert.equal(seizoenVan('2027-07-31'), '2026-27');
  assert.equal(seizoenVan('2026-07-31'), '2025-26');
  assert.equal(seizoenVan('2029-12-31T10:00:00Z'), '2029-30');
});

test('seizoenGrenzen', () => {
  assert.deepEqual(seizoenGrenzen('2026-27'), { van: '2026-08-01', tot: '2027-07-31' });
});

test('inSeizoen', () => {
  assert.equal(inSeizoen('2026-09-05', '2026-27'), true);
  assert.equal(inSeizoen('2026-07-05', '2026-27'), false);
  assert.equal(inSeizoen('2020-01-01', ALLE), true);
  assert.equal(inSeizoen(null, '2026-27'), false);
});

test('seizoenenLijst: huidig seizoen altijd erbij, nieuwste eerst, zonder dubbels', () => {
  assert.deepEqual(seizoenenLijst(['2025-09-01', '2026-10-01', '2025-12-01'], '2026-11-25'), ['2026-27', '2025-26']);
  assert.deepEqual(seizoenenLijst([], '2027-09-01'), ['2027-28']);
});
