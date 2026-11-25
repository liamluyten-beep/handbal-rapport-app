import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aanwezigheidStats, volgendeStatus, STATUSSEN } from '../js/lib/aanwezig.js';

test('statussen', () => {
  assert.deepEqual(Object.keys(STATUSSEN), ['aanwezig', 'verwittigd', 'afwezig']);
});

test('aanwezigheidStats: percentage op alle trainingen waar de speler genoteerd is', () => {
  const r = [{ status: 'aanwezig' }, { status: 'aanwezig' }, { status: 'verwittigd' }, { status: 'afwezig' }];
  assert.deepEqual(aanwezigheidStats(r), { totaal: 4, aanwezig: 2, verwittigd: 1, afwezig: 1, pct: 50 });
  assert.deepEqual(aanwezigheidStats([]), { totaal: 0, aanwezig: 0, verwittigd: 0, afwezig: 0, pct: null });
});

test('volgendeStatus: tikken wisselt aanwezig -> verwittigd -> afwezig -> (leeg) -> aanwezig', () => {
  assert.equal(volgendeStatus(null), 'aanwezig');
  assert.equal(volgendeStatus('aanwezig'), 'verwittigd');
  assert.equal(volgendeStatus('verwittigd'), 'afwezig');
  assert.equal(volgendeStatus('afwezig'), null);
});
