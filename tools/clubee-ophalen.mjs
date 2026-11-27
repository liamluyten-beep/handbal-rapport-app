// Haalt de gespeelde wedstrijden + line-up-statistieken van de ploeg op bij Clubee
// en schrijft ze naar data/clubee.json. Draait dagelijks via GitHub Actions,
// of lokaal met:  node tools/clubee-ophalen.mjs          (U16 -> data/clubee.json)
//                  node tools/clubee-ophalen.mjs heren1   (Heren 1 -> data/clubee-heren1.json)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseCompetitie, parseLineup, parseKalender } from '../js/lib/clubee.js';

const root = new URL('../', import.meta.url);
const alles = JSON.parse(await readFile(new URL('clubee.config.json', root), 'utf8'));
// Zonder argument: de U16-instellingen bovenaan. Met een ploeg (bv. heren1): het blok met die naam.
const ploegId = process.argv[2] || null;
const config = ploegId ? alles[ploegId] : alles;
const bestand = ploegId ? `data/clubee-${ploegId}.json` : 'data/clubee.json';
if (!config?.competities?.length) {
  console.log(`${ploegId || 'U16'}: nog geen competitie ingesteld in clubee.config.json.`);
  process.exit(0);
}
const pauze = ms => new Promise(r => setTimeout(r, ms));

async function haal(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (handbal-rapport-app)' } });
  if (!res.ok) throw new Error(`${url} gaf status ${res.status}`);
  return res.text();
}

// Elke competitie: { url, ploeg, label }. (Een gewone url-tekst kan ook: dan geldt de algemene ploeg.)
const competities = config.competities.map(c => (typeof c === 'string' ? { url: c, ploeg: config.ploeg, label: null } : c));
const basis = new URL(competities[0].url).origin + '/' + new URL(competities[0].url).pathname.split('/')[1];
const wedstrijden = new Map();
const kalender = new Map();
for (const c of competities) {
  const html = await haal(c.url);
  const extra = { ploeg: c.ploeg, ...(c.label ? { competitie: c.label } : {}) };
  for (const w of parseCompetitie(html, c.ploeg)) wedstrijden.set(w.clubee_id, { ...w, ...extra });
  for (const k of parseKalender(html, c.ploeg)) kalender.set(k.clubee_id, { ...k, ...extra });
  await pauze(1000);
}

// Bestaande data hergebruiken: line-ups van oude wedstrijden niet opnieuw ophalen
const pad = new URL(bestand, root);
let vorige = { wedstrijden: [] };
try { vorige = JSON.parse(await readFile(pad, 'utf8')); } catch { /* eerste keer */ }
const bekend = new Map(vorige.wedstrijden.filter(w => w.spelers?.length).map(w => [w.clubee_id, w]));

const resultaat = [];
for (const w of [...wedstrijden.values()].sort((a, b) => a.datum.localeCompare(b.datum))) {
  const oud = bekend.get(w.clubee_id);
  if (oud && oud.score_thuis === w.score_thuis && oud.score_uit === w.score_uit) { resultaat.push({ ...oud, ploeg: w.ploeg, ...(w.competitie ? { competitie: w.competitie } : {}) }); continue; }
  const html = await haal(`${basis}/games/${w.clubee_id}/lineup`);
  const spelers = parseLineup(html, w.ploeg);
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
  console.log(`${bestand} bijgewerkt: ${resultaat.length} gespeeld, ${nieuw.kalender.length} in de kalender.`);
}
