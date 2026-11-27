import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kalenderItems, maandRaster, volgendeMatch, MAANDEN } from '../js/lib/kalender.js';

const ploeg = 'Uilenspiegel U16 VHV R';
const clubee = [
  { clubee_id: 1, datum: '2026-10-10', uur: '14:30', status: 'gespeeld', thuis: 'Uilenspiegel U16 VHV R (U16 M)', uit: 'Merksplas U16 VHV R (U16 M)', score_thuis: 34, score_uit: 24 },
  { clubee_id: 2, datum: '2026-11-28', uur: '17:30', status: 'gepland', thuis: 'Olse Merksem U16 VHV R (U16 M)', uit: 'Uilenspiegel U16 VHV R (U16 M)', score_thuis: null, score_uit: null },
  { clubee_id: 3, datum: '2026-11-22', uur: '12:40', status: 'afgelast', thuis: 'Uilenspiegel U16 VHV R (U16 M)', uit: 'Welta U16 VHV-B R (U16 M)', score_thuis: null, score_uit: null },
];
const db = [
  { id: 'a', clubee_id: 1, datum: '2026-10-10', tegenstander: 'Merksplas', thuis: true, score_voor: 34, score_tegen: 24 },
  { id: 'b', clubee_id: null, datum: '2026-11-28', tegenstander: 'olse merksem', thuis: false, score_voor: null, score_tegen: null },
  { id: 'c', clubee_id: null, datum: '2026-12-05', tegenstander: 'Oefenmatch HC Visé', thuis: true, score_voor: null, score_tegen: null },
];

test('kalenderItems: Clubee en eigen matchen samengevoegd, vanuit onze ploeg bekeken', () => {
  const k = kalenderItems(clubee, db, ploeg);
  assert.equal(k.length, 4);
  assert.deepEqual(k[0], { datum: '2026-10-10', uur: '14:30', tegenstander: 'Merksplas', thuis: true, status: 'gespeeld',
    score_voor: 34, score_tegen: 24, clubee_id: 1, match_id: 'a' });
  // zelf aangemaakte match op dezelfde dag tegen dezelfde ploeg wordt herkend
  assert.equal(k.find(x => x.clubee_id === 2).match_id, 'b');
  assert.equal(k.find(x => x.clubee_id === 2).thuis, false);
  assert.equal(k.find(x => x.clubee_id === 3).status, 'afgelast');
  // oefenmatch die niet in Clubee staat
  assert.deepEqual(k.at(-1), { datum: '2026-12-05', uur: null, tegenstander: 'Oefenmatch HC Visé', thuis: true, status: 'gepland',
    score_voor: null, score_tegen: null, clubee_id: null, match_id: 'c' });
});

test('maandRaster: weken van maandag tot zondag', () => {
  const r = maandRaster(2026, 10); // november 2026 (maand 0-gebaseerd)
  assert.equal(r[0][0].datum, '2026-10-26');      // maandag voor 1 november
  assert.equal(r[0][6].datum, '2026-11-01');      // zondag 1 november
  assert.equal(r[0][0].inMaand, false);
  assert.equal(r.at(-1)[6].datum, '2026-12-06');
  assert.ok(r.every(w => w.length === 7));
  assert.equal(MAANDEN[10], 'november');
});

test('volgendeMatch: eerstvolgende geplande, afgelaste niet', () => {
  const k = kalenderItems(clubee, db, ploeg);
  assert.equal(volgendeMatch(k, '2026-11-20').datum, '2026-11-28');
  assert.equal(volgendeMatch(k, '2026-11-28').datum, '2026-11-28');   // vandaag telt mee
  assert.equal(volgendeMatch(k, '2027-01-01'), null);
});
