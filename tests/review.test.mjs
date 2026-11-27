import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lokaleDatum } from '../js/lib/datum.js';
import { isBlijvendeFout } from '../js/lib/wachtrij.js';
import { isTechnischeFout } from '../js/lib/logboek.js';

test('lokaleDatum: Belgische datum, ook net na middernacht', () => {
  // 27/11 00:30 in België (UTC+1) = 26/11 23:30 UTC
  assert.equal(lokaleDatum(new Date('2026-11-26T23:30:00Z'), -60), '2026-11-27');
  // zomertijd (UTC+2): 1:30 lokaal = 23:30 UTC vorige dag
  assert.equal(lokaleDatum(new Date('2027-06-14T23:30:00Z'), -120), '2027-06-15');
  assert.equal(lokaleDatum(new Date('2026-11-27T12:00:00Z'), -60), '2026-11-27');
});

test('isBlijvendeFout: databasefouten blijvend, verbindingsfouten niet', () => {
  assert.equal(isBlijvendeFout({ code: '23503', message: 'violates foreign key constraint' }), true);
  assert.equal(isBlijvendeFout({ code: '42501', message: 'new row violates row-level security policy' }), true);
  assert.equal(isBlijvendeFout({ code: '23514', message: 'violates check constraint' }), true);
  assert.equal(isBlijvendeFout({ message: 'TypeError: Failed to fetch' }), false);
  assert.equal(isBlijvendeFout({ message: 'NetworkError when attempting to fetch resource.' }), false);
  assert.equal(isBlijvendeFout({ code: '', message: 'Load failed' }), false);
  assert.equal(isBlijvendeFout(null), false);
});

test('isTechnischeFout: echte fouten loggen, gewone tips niet', () => {
  assert.equal(isTechnischeFout('insert or update on table "players" violates foreign key constraint'), true);
  assert.equal(isTechnischeFout('Failed to fetch'), true);
  assert.equal(isTechnischeFout('JWT expired'), true);
  assert.equal(isTechnischeFout('Te veel pogingen. Wacht even en probeer opnieuw.'), true);
  assert.equal(isTechnischeFout('Tik eerst een speler aan op het veld.'), false);
  assert.equal(isTechnischeFout('Kies eerst de doelman hierboven.'), false);
  assert.equal(isTechnischeFout('Dit e-mailadres wordt al gebruikt door een andere speler.'), false);
});
