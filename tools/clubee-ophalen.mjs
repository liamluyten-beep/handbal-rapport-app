// Haalt de gespeelde wedstrijden + line-up-statistieken van de ploeg op bij Clubee
// en schrijft ze naar data/clubee.json. Draait dagelijks via GitHub Actions,
// of lokaal met:  node tools/clubee-ophalen.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseCompetitie, parseLineup, parseKalender } from '../js/lib/clubee.js';

const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('clubee.config.json', root), 'utf8'));
const pauze = ms => new Promise(r => setTimeout(r, ms));

async function haal(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (handbal-rapport-app)' } });
  if (!res.ok) throw new Error(`${url} gaf status ${res.status}`);
  return res.text();
}

const basis = new URL(config.competities[0]).origin + '/' + new URL(config.competities[0]).pathname.split('/')[1];
const wedstrijden = new Map();
const kalender = new Map();
for (const url of config.competities) {
  const html = await haal(url);
  for (const w of parseCompetitie(html, config.ploeg)) wedstrijden.set(w.clubee_id, w);
  for (const k of parseKalender(html, config.ploeg)) kalender.set(k.clubee_id, k);
  await pauze(1000);
}

// Bestaande data hergebruiken: line-ups van oude wedstrijden niet opnieuw ophalen
const pad = new URL('data/clubee.json', root);
let vorige = { wedstrijden: [] };
try { vorige = JSON.parse(await readFile(pad, 'utf8')); } catch { /* eerste keer */ }
const bekend = new Map(vorige.wedstrijden.filter(w => w.spelers?.length).map(w => [w.clubee_id, w]));

const resultaat = [];
for (const w of [...wedstrijden.values()].sort((a, b) => a.datum.localeCompare(b.datum))) {
  const oud = bekend.get(w.clubee_id);
  if (oud && oud.score_thuis === w.score_thuis && oud.score_uit === w.score_uit) { resultaat.push(oud); continue; }
  const html = await haal(`${basis}/games/${w.clubee_id}/lineup`);
  const spelers = parseLineup(html, config.ploeg);
  console.log(`${w.datum} ${w.thuis} ${w.score_thuis}-${w.score_uit} ${w.uit}: ${spelers.length} spelers`);
  resultaat.push({ ...w, spelers });
  await pauze(1000);
}

const nieuw = { ploeg: config.ploeg, wedstrijden: resultaat,
  kalender: [...kalender.values()].sort((a, b) => a.datum.localeCompare(b.datum)) };
if (JSON.stringify([nieuw.wedstrijden, nieuw.kalender]) === JSON.stringify([vorige.wedstrijden, vorige.kalender])) {
  console.log('Geen nieuwe wedstrijden.');
} else {
  await mkdir(new URL('data/', root), { recursive: true });
  await writeFile(pad, JSON.stringify({ ...nieuw, bijgewerkt: new Date().toISOString() }, null, 1) + '\n');
  console.log(`data/clubee.json bijgewerkt: ${resultaat.length} gespeeld, ${nieuw.kalender.length} in de kalender.`);
}
