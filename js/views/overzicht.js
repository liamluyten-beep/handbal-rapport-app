// Gedeelde weergave van één speler: statistieken, grafieken en rapporten.
// Gebruikt door de trainer (met knoppen) en door de speler zelf (alleen lezen).
import { sb, q } from '../supabase.js';
import { esc, tekstBlok, lijnGrafiek, staafGrafiek } from '../ui.js';
import { scoreReeksen, goalsReeks, formatDatum } from '../lib/voortgang.js';
import { fotoUrls, avatarHtml, fotoKnoppenHtml } from '../foto.js';
import { schotStats, telSoort } from '../lib/live.js';
import { aanwezigheidStats } from '../lib/aanwezig.js';
import { alsSchoten, doelmanStats, groepeerDoelmanRapport, keeperStats, perSchutterTotaal } from '../lib/schiet.js';

export async function laadSpelerData(playerId) {
  const [skills, rapporten, goals, zelf, fotos, events, aanwezig, schiet, alsDoelman, doelmannen, sessies, dmRapport] = await Promise.all([
    q(sb.from('skills').select('*').order('volgorde')),
    q(sb.from('reports').select('*, report_scores(skill_id, score)').eq('player_id', playerId)
      .order('datum', { ascending: false }).order('created_at', { ascending: false })),
    q(sb.from('goals').select('*, matches(*)').eq('player_id', playerId)),
    // Zelfevaluaties (bestaat pas na update-2-speler.sql; zonder die tabel gewoon leeg)
    q(sb.from('self_reports').select('*, self_report_scores(skill_id, score)').eq('player_id', playerId)
      .order('datum', { ascending: false }).order('created_at', { ascending: false })).catch(() => []),
    fotoUrls([playerId]),
    q(sb.from('match_events').select('*').eq('player_id', playerId).in('soort', ['schot', 'balverlies'])).catch(() => []),
    // Aanwezigheden (bestaat pas na update-9)
    q(sb.from('aanwezigheden').select('status, trainingen(datum)').eq('player_id', playerId)).catch(() => []),
    // Schiettraining (bestaat pas na update-10)
    q(sb.from('training_schoten').select('*').eq('player_id', playerId)).catch(() => []),
    q(sb.from('training_schoten').select('*').eq('doelman_id', playerId)).catch(() => []),
    q(sb.rpc('doelmannen')).catch(() => []),
    // Schietsessies en doelmanrapport (bestaan pas na update-11)
    q(sb.from('schiet_sessies').select('*').eq('player_id', playerId).not('gestopt_op', 'is', null).order('gestart_op', { ascending: false })).catch(() => []),
    q(sb.rpc('doelman_rapport', { doelman: playerId })).catch(() => null),
  ]);
  return { skills, rapporten, goals, zelf, fotoUrl: fotos[playerId] || null, events, aanwezig, schiet, alsDoelman, doelmannen, sessies, dmRapport };
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

function zelfHtml(z, rapport, skills, eigen) {
  const t = Object.fromEntries((rapport?.report_scores || []).map(s => [s.skill_id, s.score]));
  const rijen = skills.map(sk => {
    const zs = z.self_report_scores.find(x => x.skill_id === sk.id)?.score;
    if (zs == null && t[sk.id] == null) return '';
    const verschil = zs != null && t[sk.id] != null ? zs - t[sk.id] : 0;
    return `<tr><td>${esc(sk.naam)}</td><td>${t[sk.id] ?? '–'}</td><td><b>${zs ?? '–'}</b></td>
      <td>${verschil >= 2 ? '<span class="label">schat zichzelf hoger in</span>' : verschil <= -2 ? '<span class="label">schat zichzelf lager in</span>' : ''}</td></tr>`;
  }).join('');
  return `<div class="rapport-kop"><h2>Zelfevaluatie van ${formatDatum(z.datum)}</h2>
      ${eigen ? `<a class="knop tweede klein geen-print" href="#/zelfevaluatie/${z.id}">Bewerken</a>` : ''}</div>
    <div class="blokken">
      <div class="blok goed"><h3>Dit doe ik al goed</h3><p>${tekstBlok(z.goed_tekst) || '<span class="zacht">—</span>'}</p></div>
      <div class="blok beter"><h3>Hier wil ik beter in worden</h3><p>${tekstBlok(z.beter_tekst) || '<span class="zacht">—</span>'}</p></div>
    </div>
    ${rijen ? `<table class="tabel" style="margin-top:1rem"><thead><tr><th>Vaardigheid</th><th>Trainer</th><th>Zelf</th><th></th></tr></thead>
      <tbody>${rijen}</tbody></table>` : ''}`;
}

function schotenHtml(events, titel = 'Schoten <span class="zacht">(live genoteerd)</span>', extra = '') {
  const s = schotStats(events);
  if (!s.schoten) return '';
  const max = Math.max(1, ...s.perZone.map(z => z.goals + z.gestopt));
  return `<section class="kaart"><h3>${titel}</h3>
    <p><b>${s.goals}</b> goals op <b>${s.schoten}</b> schoten · <b>${s.pct}%</b></p>
    <div class="raster">
      <div><table class="tabel"><thead><tr><th>Positie</th><th>Goals/schoten</th><th>%</th></tr></thead><tbody>
        ${s.perPositie.map(p => `<tr><td>${esc(p.naam)}</td><td>${p.goals}/${p.schoten}</td><td>${p.pct}%</td></tr>`).join('')}
      </tbody></table></div>
      <div><p class="zacht" style="text-align:center;margin-top:0">Doelkaart (gezien vanuit de schutter)</p>
        <div class="doel-raster doelkaart">${s.perZone.map(z => {
          const sterkte = Math.round(((z.goals + z.gestopt) / max) * 60);
          return `<div class="vak" style="background:color-mix(in srgb, var(--goed) ${z.goals + z.gestopt ? Math.max(12, Math.round(sterkte * (z.goals / Math.max(1, z.goals + z.gestopt)))) : 0}%, var(--kaart))">
            ${z.goals + z.gestopt ? `<span><b>${z.goals}</b>${z.gestopt ? `${z.gestopt} gestopt` : 'goal' + (z.goals === 1 ? '' : 's')}</span>` : ''}</div>`;
        }).join('')}</div></div>
    </div>${extra}</section>`;
}

// Doelman: van waar wordt er op hem geschoten, waar redt hij, per schutter en per training
function keeperHtml(alsDoelman, dmRapport) {
  const k = keeperStats(alsDoelman);
  if (!k.opDoel && !k.mis) return '';
  const dagen = dmRapport ? groepeerDoelmanRapport(dmRapport) : [];
  const schutters = dmRapport ? perSchutterTotaal(dmRapport) : [];
  const max = Math.max(1, ...k.perZone.map(z => z.goals + z.gestopt));
  return `<section class="kaart"><h3>Als doelman <span class="zacht">(schiettraining)</span></h3>
    <div class="schiet-teller"><b>${k.pct ?? '–'}${k.pct != null ? '%' : ''}</b><span>gestopt · ${k.gestopt} van ${k.opDoel} schoten op doel${k.mis ? ` · ${k.mis} naast` : ''}</span></div>
    <div class="raster">
      <div><table class="tabel"><thead><tr><th>Geschoten vanaf</th><th>Gestopt</th><th>%</th></tr></thead><tbody>
        ${k.perPositie.map(p => `<tr><td>${esc(p.naam)}</td><td>${p.gestopt}/${p.opDoel}${p.mis ? ` <small class="zacht">+${p.mis} naast</small>` : ''}</td><td>${p.pct ?? '–'}${p.pct != null ? '%' : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <div><p class="zacht" style="text-align:center;margin-top:0">Doelkaart (gezien vanuit de schutter)</p>
        <div class="doel-raster doelkaart">${k.perZone.map(z => {
          const t = z.goals + z.gestopt;
          return `<div class="vak" style="background:color-mix(in srgb, var(--goed) ${t ? Math.max(12, Math.round((z.gestopt / t) * 60)) : 0}%, var(--kaart))">
            ${t ? `<span><b>${z.gestopt}/${t}</b>gestopt</span>` : ''}</div>`;
        }).join('')}</div>
        <p class="zacht" style="text-align:center;font-size:.85rem">Groener = vaker gestopt in die hoek.</p></div>
    </div>
    ${schutters.length ? `<h3 style="margin-top:1rem">Per schutter</h3><table class="tabel"><thead><tr><th>Schutter</th><th>Goals / schoten</th><th>Gestopt</th><th>%</th></tr></thead><tbody>
      ${schutters.map(s => `<tr><td>${esc(s.schutter)}</td><td>${s.goals}/${s.schoten}</td><td>${s.reddingen}</td><td>${s.pct ?? '–'}${s.pct != null ? '%' : ''}</td></tr>`).join('')}
      </tbody></table><p class="zacht" style="font-size:.85rem">Wie het moeilijkst te stoppen is, staat bovenaan.</p>` : ''}
    ${dagen.length ? `<h3 style="margin-top:1rem">Per training</h3>${dagen.map((d, i) => `<details class="ouder" ${i === 0 ? 'open' : ''}><summary>${formatDatum(d.datum)} ·
        <b>${d.pct ?? '–'}${d.pct != null ? '%' : ''} gestopt</b> <span class="zacht">(${d.reddingen} van ${d.opDoel} op doel${d.mis ? `, ${d.mis} naast` : ''})</span></summary>
        <table class="tabel"><thead><tr><th>Schutter</th><th>Goals / schoten</th><th>Gestopt</th><th>Naast</th></tr></thead><tbody>
        ${d.schutters.map(s => `<tr><td>${esc(s.schutter)}</td><td>${s.goals}/${s.schoten}</td><td>${s.reddingen}</td><td>${s.mis || ''}</td></tr>`).join('')}
        <tr><td><b>Samen</b></td><td><b>${d.goals}/${d.schoten}</b></td><td><b>${d.reddingen}</b></td><td>${d.mis || ''}</td></tr>
        </tbody></table></details>`).join('')}` : ''}
  </section>`;
}

function schietHtml(schiet, alsDoelman, doelmannen, sessies = [], dmRapport = null) {
  const naam = id => (id ? doelmannen.find(d => d.id === id)?.naam ?? 'doelman' : 'andere doelman');
  const perDoelman = doelmanStats(schiet).filter(d => d.opDoel);
  const tegen = perDoelman.length ? `<h3 style="margin-top:1rem">Tegen welke doelman?</h3><table class="tabel"><thead><tr><th>Doelman</th><th>Goals</th><th>Gestopt</th><th>Raak</th></tr></thead><tbody>
    ${perDoelman.map(d => `<tr><td>${esc(naam(d.doelman_id))}</td><td>${d.tegen}</td><td>${d.gestopt}</td><td>${100 - d.pct}%</td></tr>`).join('')}</tbody></table>` : '';
  const doelmanKaart = keeperHtml(alsDoelman, dmRapport);

  // Trainingsrapporten: elke afgesloten sessie apart
  const sessieKaart = sessies.length ? `<section class="kaart"><h3>Trainingsrapporten <span class="zacht">(schiettraining)</span></h3>
      ${sessies.map(s => {
        const st = schotStats(alsSchoten(schiet.filter(r => r.sessie_id === s.id)));
        return `<details class="ouder"><summary>${formatDatum(s.datum)} · <b>${st.goals}/${st.schoten}</b> ${st.pct != null ? `(${st.pct}%)` : ''}</summary>
          ${st.perPositie.map(p => `<span class="label">${esc(p.naam)} ${p.goals}/${p.schoten}</span>`).join(' ')}</details>`;
      }).join('')}</section>` : '';

  return schotenHtml(alsSchoten(schiet), 'Schiettraining <span class="zacht">(alle sessies)</span>', tegen) + sessieKaart + doelmanKaart;
}

export function renderOverzicht(speler, { skills, rapporten, goals, zelf = [], fotoUrl = null, events = [], aanwezig = [], schiet = [], alsDoelman = [], doelmannen = [], sessies = [], dmRapport = null }, { trainer = false, eigen = false } = {}) {
  const aw = aanwezigheidStats(aanwezig);
  const verlies = telSoort(events, 'balverlies');
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
        ${avatarHtml(fotoUrl, speler.rugnummer, 'groot')}
        <div><h1>${esc(speler.naam)}</h1><p class="zacht">${esc(speler.positie || '')}</p>
          ${trainer || eigen ? `<div class="rij geen-print" style="gap:.4rem;margin-top:.4rem">${fotoKnoppenHtml(!!fotoUrl)}</div>` : ''}</div>
      </div>
      ${trainer ? `<div class="rij geen-print">
        <a class="knop" href="#/rapport/nieuw/${speler.id}">+ Nieuw rapport</a>
        <button class="knop tweede" id="bewerkSpeler">Gegevens</button></div>` : ''}
      ${eigen ? `<div class="rij geen-print">
        <a class="knop" href="#/zelfevaluatie/nieuw">+ Zelfevaluatie</a>
        <button class="knop tweede" id="mijnPosities">Mijn posities</button></div>` : ''}
    </div>

    <div class="stats">
      <div class="stat"><div class="titel">Goals dit seizoen</div><div class="waarde">${gr.totaal}</div></div>
      <div class="stat"><div class="titel">Wedstrijden</div><div class="waarde">${gr.data.length}</div></div>
      <div class="stat"><div class="titel">Gem. per match</div><div class="waarde">${gr.data.length ? (gr.totaal / gr.data.length).toFixed(1) : '–'}</div></div>
      ${rendement ? `<div class="stat"><div class="titel">Rendement</div><div class="waarde">${rendement}</div></div>` : ''}
      ${som(goals, 'zeven_m') || som(goals, 'zeven_m_mis') ? `<div class="stat"><div class="titel">7 meters</div><div class="waarde">${som(goals, 'zeven_m')}<small class="zacht"> / ${som(goals, 'zeven_m') + som(goals, 'zeven_m_mis')}</small></div></div>` : ''}
      ${som(goals, 'twee_min') ? `<div class="stat"><div class="titel">2 minuten</div><div class="waarde">${som(goals, 'twee_min')}</div></div>` : ''}
      ${som(goals, 'geel') + som(goals, 'rood') + som(goals, 'blauw') ? `<div class="stat"><div class="titel">Kaarten</div><div class="waarde">${kaarten(goals)}</div></div>` : ''}
      ${verlies ? `<div class="stat"><div class="titel">Balverlies</div><div class="waarde">${verlies}</div><small class="zacht">live genoteerd</small></div>` : ''}
      ${aw.totaal ? `<div class="stat"><div class="titel">Op training</div><div class="waarde">${aw.pct}%</div><small class="zacht">${aw.aanwezig}/${aw.totaal} aanwezig${aw.verwittigd ? ` · ${aw.verwittigd} verwittigd` : ''}</small></div>` : ''}
      <div class="stat"><div class="titel">Laatste rapport</div><div class="waarde">${gemiddelde(laatste) ?? '–'}<small class="zacht"> / 5</small></div></div>
    </div>

    ${laatste ? `<section class="kaart">${rapportHtml(laatste, rapporten[1], skills, trainer)}</section>`
      : `<section class="kaart leeg"><span class="bal"></span><p>${trainer
        ? 'Nog geen rapport voor deze speler. Maak het eerste aan met “Nieuw rapport”.'
        : 'Je trainer heeft nog geen rapport voor je gemaakt.'}</p></section>`}

    ${zelf.length ? `<section class="kaart">${zelfHtml(zelf[0], laatste, skills, eigen)}
      ${zelf.length > 1 ? `<h3 style="margin-top:1.2rem">Eerdere zelfevaluaties</h3>${zelf.slice(1).map(z => `<details class="ouder">
        <summary>${formatDatum(z.datum)}</summary>${zelfHtml(z, null, skills, eigen)}</details>`).join('')}` : ''}</section>`
      : eigen ? `<section class="kaart leeg"><p>Je hebt nog geen zelfevaluatie ingevuld.
          <a href="#/zelfevaluatie/nieuw">Vul er nu een in</a>: hoe vind jij zelf dat het gaat?</p></section>` : ''}

    <div class="raster">
      <section class="kaart"><h3>Vooruitgang per vaardigheid</h3>
        ${rapporten.length >= 2 ? '<div class="grafiek"><canvas id="gScores"></canvas></div>'
          : '<p class="leeg">De grafiek verschijnt vanaf twee rapporten.</p>'}</section>
      <section class="kaart"><h3>Goals per wedstrijd</h3>
        ${gr.data.length ? '<div class="grafiek"><canvas id="gGoals"></canvas></div>'
          : '<p class="leeg">Nog geen goals ingevoerd.</p>'}</section>
    </div>

    ${schotenHtml(events)}
    ${schietHtml(schiet, alsDoelman, doelmannen, sessies, dmRapport)}

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
