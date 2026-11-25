// Gedeelde weergave van één speler: statistieken, grafieken en rapporten.
// Gebruikt door de trainer (met knoppen) en door de speler zelf (alleen lezen).
import { sb, q } from '../supabase.js';
import { esc, tekstBlok, lijnGrafiek, staafGrafiek } from '../ui.js';
import { scoreReeksen, goalsReeks, formatDatum } from '../lib/voortgang.js';

export async function laadSpelerData(playerId) {
  const [skills, rapporten, goals] = await Promise.all([
    q(sb.from('skills').select('*').order('volgorde')),
    q(sb.from('reports').select('*, report_scores(skill_id, score)').eq('player_id', playerId)
      .order('datum', { ascending: false }).order('created_at', { ascending: false })),
    q(sb.from('goals').select('*, matches(*)').eq('player_id', playerId)),
  ]);
  return { skills, rapporten, goals };
}

const som = (goals, k) => goals.reduce((t, g) => t + (g[k] || 0), 0);
const kaarten = goals => [['geel', '🟨'], ['rood', '🟥'], ['blauw', '🟦']]
  .filter(([k]) => som(goals, k)).map(([k, i]) => `${som(goals, k)}<small>${i}</small>`).join(' ');

function gemiddelde(rapport) {
  const s = rapport?.report_scores || [];
  if (!s.length) return null;
  return (s.reduce((t, x) => t + x.score, 0) / s.length).toFixed(1);
}

function scoresHtml(rapport, vorig, skills) {
  const rijen = skills.map(sk => {
    const sc = rapport.report_scores.find(x => x.skill_id === sk.id);
    if (!sc) return '';
    const v = vorig?.report_scores.find(x => x.skill_id === sk.id);
    const diff = v ? sc.score - v.score : 0;
    const pijl = diff > 0 ? `<span class="verschil op">▲ ${diff}</span>` :
      diff < 0 ? `<span class="verschil neer">▼ ${-diff}</span>` : '';
    return `<div class="score-rij"><span>${esc(sk.naam)} ${pijl}</span>
      <div class="balk"><span style="width:${sc.score * 20}%"></span></div><b>${sc.score}</b></div>`;
  }).join('');
  return rijen ? `<div class="scores">${rijen}</div>` : '';
}

function rapportHtml(r, vorig, skills, trainer) {
  return `<div class="rapport-kop">
      <h2>Rapport van ${formatDatum(r.datum)}</h2>
      ${trainer ? `<a class="knop tweede klein geen-print" href="#/rapport/${r.id}">Bewerken</a>` : ''}
    </div>
    <div class="blokken">
      <div class="blok goed"><h3>Dit gaat al goed</h3><p>${tekstBlok(r.goed_tekst) || '<span class="zacht">—</span>'}</p></div>
      <div class="blok beter"><h3>Hier kan het nog beter</h3><p>${tekstBlok(r.beter_tekst) || '<span class="zacht">—</span>'}</p></div>
    </div>
    ${scoresHtml(r, vorig, skills)}`;
}

export function renderOverzicht(speler, { skills, rapporten, goals }, { trainer = false } = {}) {
  const gr = goalsReeks(goals);
  const sr = scoreReeksen(rapporten, skills);
  const laatste = rapporten[0];
  const metPogingen = goals.filter(g => g.pogingen);
  const rendement = metPogingen.length
    ? Math.round(100 * metPogingen.reduce((t, g) => t + g.aantal, 0) / metPogingen.reduce((t, g) => t + g.pogingen, 0)) + '%'
    : null;

  const html = `
    <div class="paginakop">
      <div class="rij">
        <div class="nummer">${esc(speler.rugnummer ?? '–')}</div>
        <div><h1>${esc(speler.naam)}</h1><p class="zacht">${esc(speler.positie || '')}</p></div>
      </div>
      ${trainer ? `<div class="rij geen-print">
        <a class="knop" href="#/rapport/nieuw/${speler.id}">+ Nieuw rapport</a>
        <button class="knop tweede" id="bewerkSpeler">Gegevens</button></div>` : ''}
    </div>

    <div class="stats">
      <div class="stat"><div class="titel">Goals dit seizoen</div><div class="waarde">${gr.totaal}</div></div>
      <div class="stat"><div class="titel">Wedstrijden</div><div class="waarde">${gr.data.length}</div></div>
      <div class="stat"><div class="titel">Gem. per match</div><div class="waarde">${gr.data.length ? (gr.totaal / gr.data.length).toFixed(1) : '–'}</div></div>
      ${rendement ? `<div class="stat"><div class="titel">Rendement</div><div class="waarde">${rendement}</div></div>` : ''}
      ${som(goals, 'zeven_m') || som(goals, 'zeven_m_mis') ? `<div class="stat"><div class="titel">7 meters</div><div class="waarde">${som(goals, 'zeven_m')}<small class="zacht"> / ${som(goals, 'zeven_m') + som(goals, 'zeven_m_mis')}</small></div></div>` : ''}
      ${som(goals, 'twee_min') ? `<div class="stat"><div class="titel">2 minuten</div><div class="waarde">${som(goals, 'twee_min')}</div></div>` : ''}
      ${som(goals, 'geel') + som(goals, 'rood') + som(goals, 'blauw') ? `<div class="stat"><div class="titel">Kaarten</div><div class="waarde">${kaarten(goals)}</div></div>` : ''}
      <div class="stat"><div class="titel">Laatste rapport</div><div class="waarde">${gemiddelde(laatste) ?? '–'}<small class="zacht"> / 5</small></div></div>
    </div>

    ${laatste ? `<section class="kaart">${rapportHtml(laatste, rapporten[1], skills, trainer)}</section>`
      : `<section class="kaart leeg"><span class="bal"></span><p>${trainer
        ? 'Nog geen rapport voor deze speler. Maak het eerste aan met “Nieuw rapport”.'
        : 'Je trainer heeft nog geen rapport voor je gemaakt.'}</p></section>`}

    <div class="raster">
      <section class="kaart"><h3>Vooruitgang per vaardigheid</h3>
        ${rapporten.length >= 2 ? '<div class="grafiek"><canvas id="gScores"></canvas></div>'
          : '<p class="leeg">De grafiek verschijnt vanaf twee rapporten.</p>'}</section>
      <section class="kaart"><h3>Goals per wedstrijd</h3>
        ${gr.data.length ? '<div class="grafiek"><canvas id="gGoals"></canvas></div>'
          : '<p class="leeg">Nog geen goals ingevoerd.</p>'}</section>
    </div>

    ${rapporten.length > 1 ? `<section class="kaart"><h3>Eerdere rapporten</h3>
      ${rapporten.slice(1).map((r, i) => `<details class="ouder"><summary>${formatDatum(r.datum)}
        ${gemiddelde(r) ? `<span class="label">gem. ${gemiddelde(r)}</span>` : ''}</summary>
        ${rapportHtml(r, rapporten[i + 2], skills, trainer)}</details>`).join('')}
    </section>` : ''}`;

  const tekenGrafieken = () => {
    const a = document.getElementById('gScores');
    const b = document.getElementById('gGoals');
    if (a) lijnGrafiek(a, sr);
    if (b) staafGrafiek(b, gr);
  };
  return { html, tekenGrafieken };
}
