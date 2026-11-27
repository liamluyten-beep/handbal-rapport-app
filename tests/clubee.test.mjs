import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCompetitie, parseLineup, initialenVan, koppelClubeeSpeler, korteNaam } from '../js/lib/clubee.js';

const competitie = readFileSync(new URL('./fixtures/clubee-competitie.html', import.meta.url), 'utf8');
const lineup = readFileSync(new URL('./fixtures/clubee-lineup.html', import.meta.url), 'utf8');

test('parseCompetitie: enkel gespeelde wedstrijden van de ploeg, met score', () => {
  const w = parseCompetitie(competitie, 'Uilenspiegel');
  assert.equal(w.length, 8);
  assert.deepEqual(w.find(x => x.clubee_id === 2850917), {
    clubee_id: 2850917, datum: '2026-10-10',
    thuis: 'Uilenspiegel U16 VHV R (U16 M)', uit: 'Merksplas U16 VHV R (U16 M)',
    score_thuis: 34, score_uit: 24,
  });
  // uitwedstrijd
  const sasja = w.find(x => x.clubee_id === 2850928);
  assert.equal(sasja.thuis, 'Biobest Sasja U16 VHV R (U16 M/F)');
  assert.equal(sasja.score_thuis, 34);
  // geannuleerde en toekomstige wedstrijden niet
  assert.equal(w.find(x => x.clubee_id === 2850919), undefined);
  assert.equal(w.find(x => x.clubee_id === 3054135), undefined);
});

test('parseLineup: statistieken van de juiste ploeg', () => {
  const s = parseLineup(lineup, 'Uilenspiegel');
  assert.equal(s.length, 15);
  assert.deepEqual(s.find(x => x.nr === 11), {
    nr: 11, initialen: 'N L', gespeeld: 1, goals: 6, zeven_m: 0, zeven_m_mis: 0, geel: 0, twee_min: 0, blauw: 0, rood: 0,
  });
  assert.equal(s.find(x => x.nr === 7).geel, 1);
  assert.equal(s.find(x => x.nr === 17).twee_min, 1);
  assert.equal(s.reduce((t, x) => t + x.goals, 0), 34);
});

test('parseLineup: tegenstander apart', () => {
  const s = parseLineup(lineup, 'Merksplas');
  assert.equal(s.length, 8);
  assert.equal(s.reduce((t, x) => t + x.goals, 0), 24);
});

test('parseLineup: ploeg niet gevonden geeft lege lijst', () => {
  assert.deepEqual(parseLineup(lineup, 'Bestaat niet'), []);
});

test('initialenVan', () => {
  assert.equal(initialenVan('Nyo Luyten'), 'N L');
  assert.equal(initialenVan('Emma De Smet'), 'E D');
  assert.equal(initialenVan('  élise   van Dam '), 'E V');
  assert.equal(initialenVan('Madonna'), 'M');
});

test('korteNaam haalt reeks en categorie weg', () => {
  assert.equal(korteNaam('Biobest Sasja U16 VHV R (U16 M/F)'), 'Biobest Sasja');
  assert.equal(korteNaam('Welta U16 VHV-B R (U16 M)'), 'Welta');
  assert.equal(korteNaam('Heist o/d Berg U16 VHV R (U16 M)'), 'Heist o/d Berg');
});

const spelers = [
  { id: 'nyo', naam: 'Nyo Luyten', rugnummer: 11 },
  { id: 'lars', naam: 'Lars Luyten', rugnummer: 9 },
  { id: 'lien', naam: 'Lien Lemmens', rugnummer: null },
  { id: 'sam', naam: 'Sam Vos', rugnummer: 7 },
];

test('koppelClubeeSpeler: initialen + rugnummer', () => {
  assert.equal(koppelClubeeSpeler({ nr: 11, initialen: 'N L' }, spelers).id, 'nyo');
  assert.equal(koppelClubeeSpeler({ nr: 7, initialen: 'S V' }, spelers).id, 'sam');
});

test('koppelClubeeSpeler: unieke initialen ook bij ander rugnummer', () => {
  assert.equal(koppelClubeeSpeler({ nr: 23, initialen: 'N L' }, spelers).id, 'nyo');
});

test('koppelClubeeSpeler: twijfel geeft null', () => {
  // L L past op Lars Luyten (#9) en Lien Lemmens (geen nummer); #4 helpt niet
  assert.equal(koppelClubeeSpeler({ nr: 4, initialen: 'L L' }, spelers), null);
  // met juist rugnummer wel zeker
  assert.equal(koppelClubeeSpeler({ nr: 9, initialen: 'L L' }, spelers).id, 'lars');
  // rugnummer klopt maar initialen niet: niet koppelen
  assert.equal(koppelClubeeSpeler({ nr: 11, initialen: 'X Y' }, spelers), null);
});

import { bouwClubeeImport } from '../js/lib/clubee.js';

const data = {
  ploeg: 'Uilenspiegel U16 VHV R',
  wedstrijden: [
    { clubee_id: 1, datum: '2026-10-10', thuis: 'Uilenspiegel U16 VHV R (U16 M)', uit: 'Merksplas U16 VHV R (U16 M)', score_thuis: 34, score_uit: 24,
      spelers: [{ nr: 11, initialen: 'N L', gespeeld: 1, goals: 6, zeven_m: 1, zeven_m_mis: 0, geel: 0, twee_min: 1, blauw: 0, rood: 0 },
                { nr: 4, initialen: 'L L', gespeeld: 1, goals: 2, zeven_m: 0, zeven_m_mis: 0, geel: 0, twee_min: 0, blauw: 0, rood: 0 }] },
    { clubee_id: 2, datum: '2026-10-17', thuis: 'Biobest Sasja U16 VHV R (U16 M/F)', uit: 'Uilenspiegel U16 VHV R (U16 M)', score_thuis: 34, score_uit: 13,
      spelers: [{ nr: 11, initialen: 'N L', gespeeld: 1, goals: 3, zeven_m: 0, zeven_m_mis: 1, geel: 1, twee_min: 0, blauw: 0, rood: 0 }] },
  ],
};

test('bouwClubeeImport: wedstrijden vanuit eigen ploeg bekeken', () => {
  const r = bouwClubeeImport(data, spelers, {});
  assert.deepEqual(r.wedstrijden, [
    { clubee_id: 1, datum: '2026-10-10', tegenstander: 'Merksplas', thuis: true, score_voor: 34, score_tegen: 24 },
    { clubee_id: 2, datum: '2026-10-17', tegenstander: 'Biobest Sasja', thuis: false, score_voor: 13, score_tegen: 34 },
  ]);
});

test('bouwClubeeImport: spelerslijst met automatische koppeling en totalen', () => {
  const r = bouwClubeeImport(data, spelers, {});
  assert.deepEqual(r.spelers, [
    { sleutel: '4|L L', nr: 4, initialen: 'L L', wedstrijden: 1, goals: 2, auto: null, gekozen: null },
    { sleutel: '11|N L', nr: 11, initialen: 'N L', wedstrijden: 2, goals: 9, auto: 'nyo', gekozen: 'nyo' },
  ]);
  assert.equal(r.goals.length, 2); // L L niet gekoppeld -> overgeslagen
  assert.deepEqual(r.goals[1], { clubee_id: 2, player_id: 'nyo', aantal: 3, zeven_m: 0, zeven_m_mis: 1, geel: 1, twee_min: 0, blauw: 0, rood: 0 });
});

test('bouwClubeeImport: eigen keuze wint, lege keuze = overslaan', () => {
  const r = bouwClubeeImport(data, spelers, { '4|L L': 'lars', '11|N L': '' });
  assert.equal(r.spelers.find(s => s.nr === 4).gekozen, 'lars');
  assert.equal(r.spelers.find(s => s.nr === 11).gekozen, null);
  assert.deepEqual(r.goals.map(g => g.player_id), ['lars']);
});

test('bouwClubeeImport: twee Clubee-regels op dezelfde speler worden opgeteld', () => {
  const d = { ...data, wedstrijden: [{ ...data.wedstrijden[0] }] };
  const r = bouwClubeeImport(d, spelers, { '4|L L': 'nyo' });
  assert.equal(r.goals.length, 1);
  assert.equal(r.goals[0].aantal, 8);
});

import { parseKalender } from '../js/lib/clubee.js';

test('parseKalender: alle matchen van de ploeg, ook komende en afgelaste', () => {
  const k = parseKalender(competitie, 'Uilenspiegel');
  assert.equal(k.length, 20);
  assert.deepEqual(k.find(x => x.clubee_id === 2850917), {
    clubee_id: 2850917, datum: '2026-10-10', uur: '14:30', status: 'gespeeld',
    thuis: 'Uilenspiegel U16 VHV R (U16 M)', uit: 'Merksplas U16 VHV R (U16 M)', score_thuis: 34, score_uit: 24,
  });
  assert.deepEqual(k.find(x => x.clubee_id === 2850934), {
    clubee_id: 2850934, datum: '2026-11-28', uur: '17:30', status: 'gepland',
    thuis: 'Olse Merksem U16 VHV R (U16 M)', uit: 'Uilenspiegel U16 VHV R (U16 M)', score_thuis: null, score_uit: null,
  });
  const afgelast = k.find(x => x.clubee_id === 2850919);
  assert.equal(afgelast.status, 'afgelast');
  assert.equal(afgelast.thuis, 'Uilenspiegel U16 VHV R (U16 M)');
  assert.equal(afgelast.uit, 'Welta U16 VHV-B R (U16 M)');
  // gesorteerd op datum
  assert.deepEqual(k.map(x => x.datum), [...k.map(x => x.datum)].sort());
});
