// XP: balk voor de speler (privé) en ranglijst voor de trainer. XP wordt berekend uit de gegevens, per seizoen.
import { sb, q } from '../supabase.js';
import { toon, esc, laden } from '../ui.js';
import { berekenXP, levelVan, XP } from '../lib/xp.js';
import { opSeizoen, gekozenSeizoen } from '../seizoen-keuze.js';
import { berekenBadges, BADGES } from '../lib/badges.js';
import { melding } from '../ui.js';

// Schoten met de gevraagde plek (kolom bestaat pas na update-19; anders zonder)
async function schotenQuery(filter) {
  const met = await q(filter(sb.from('training_schoten').select('player_id, doelman_id, datum, resultaat, doelzone, positie, sessie_id, uitdaging_zone'))).catch(() => null);
  return met ?? q(filter(sb.from('training_schoten').select('player_id, doelman_id, datum, resultaat, doelzone, positie, sessie_id'))).catch(() => []);
}

// filterKeeper: schoten op deze speler als doelman (null = al in de schoten zitten, zoals bij de trainer)
// alle = true: over alle seizoenen samen (voor de avatar-spullen), anders enkel het gekozen seizoen
async function gegevens(filterSpeler, filterKeeper = null, alle = false) {
  const f = alle ? (lijst => lijst || []) : opSeizoen;
  const [schoten, aanwezig, zelf, sessies, goals, rapporten, tegenApart] = await Promise.all([
    schotenQuery(filterSpeler),
    q(filterSpeler(sb.from('aanwezigheden').select('player_id, status, trainingen(datum)'))).catch(() => []),
    q(filterSpeler(sb.from('self_reports').select('player_id, datum'))).catch(() => []),
    q(filterSpeler(sb.from('schiet_sessies').select('id, player_id, datum, gestopt_op'))).catch(() => []),
    q(filterSpeler(sb.from('goals').select('player_id, aantal, zeven_m, matches(datum)'))).catch(() => []),
    q(filterSpeler(sb.from('reports').select('player_id, datum, report_scores(skill_id, score)'))).catch(() => []),
    filterKeeper ? schotenQuery(filterKeeper) : null,
  ]);
  return {
    schoten: f(schoten, s => s.datum),
    aanwezig: f(aanwezig, a => a.trainingen?.datum),
    zelf: f(zelf, z => z.datum),
    sessies: f(sessies, s => s.datum),
    goals: f(goals, g => g.matches?.datum),
    rapporten: f(rapporten, r => r.datum),
    tegen: f(tegenApart ?? schoten, s => s.datum),
  };
}

export async function xpVanSpeler(playerId, { alleSeizoenen = false } = {}) {
  const d = await gegevens(qb => qb.eq('player_id', playerId), qb => qb.eq('doelman_id', playerId), alleSeizoenen);
  return { ...berekenXP(d), badges: berekenBadges(d) };
}

// Rij met badges: behaalde in kleur, de rest grijs met hoe ver je staat
export function badgesHtml(badges) {
  const behaald = badges.filter(b => b.behaald).length;
  return `<section class="kaart compact badges-kaart"><h3>Badges <span class="zacht">${behaald}/${badges.length}</span></h3>
    <div class="badges">${badges.map(b => `<div class="badge ${b.behaald ? 'behaald' : ''}" title="${esc(b.uitleg)}">
      <span class="badge-icoon">${b.icoon}</span><b>${esc(b.naam)}</b><small>${esc(b.uitleg)}</small>
      ${b.behaald ? '' : `<span class="badge-balk"><span style="width:${Math.round(100 * b.voortgang.huidig / b.voortgang.doel)}%"></span></span>
        <small class="badge-stand">${b.voortgang.huidig}/${b.voortgang.doel}</small>`}</div>`).join('')}</div></section>`;
}

// Eén keer een melding bij een nieuwe badge (per toestel, per seizoen)
export function meldNieuweBadges(playerId, badges) {
  const sleutel = `badges:${playerId}:${gekozenSeizoen()}`;
  const gezien = new Set(JSON.parse(localStorage.getItem(sleutel) || 'null') ?? badges.filter(b => b.behaald).map(b => b.id));
  const nieuw = badges.filter(b => b.behaald && !gezien.has(b.id));
  nieuw.forEach((b, i) => setTimeout(() => melding(`Nieuwe badge: ${b.icoon} ${b.naam}!`), 600 + i * 3800));
  localStorage.setItem(sleutel, JSON.stringify(badges.filter(b => b.behaald).map(b => b.id)));
}

export function xpKaartHtml(r, { link = null } = {}) {
  const l = levelVan(r.totaal);
  const binnen = `<div class="xp-kop"><span class="xp-level">Level <span>${l.level}</span></span>
      <span class="zacht"><b style="color:var(--tekst)">${l.inLevel}</b> / ${l.nodig} XP tot level ${l.level + 1}</span></div>
    <div class="xp-balk"><span style="width:${l.pct}%"></span></div>
    <div class="xp-bronnen"><span>🎯 schieten <b>${r.bronnen.schieten}</b></span><span>✅ training <b>${r.bronnen.training}</b></span>
      <span>🪞 zelfevaluatie <b>${r.bronnen.zelfevaluatie}</b></span>${r.bronnen.keepen ? `<span>🧤 keepen <b>${r.bronnen.keepen}</b></span>` : ''}<span>totaal <b>${r.totaal} XP</b></span></div>`;
  // Doelmannen zien (niet op home) hoe hun keeper-XP is opgebouwd
  const k = r.keeper;
  const keeper = !link && k?.reddingen ? `<p class="zacht" style="font-size:.85rem;margin:.6rem 0 0">🧤 ${k.reddingen} reddingen (+${XP.redding} XP)
    · midden dicht ${k.middenDicht}× (+${XP.middenDicht}) · 30% gestopt ${k.dertigProcent}× (+${XP.dertigProcent})</p>` : '';
  return link ? `<a class="xp-kaart" href="${link}">${binnen}</a>` : `<div class="xp-kaart">${binnen}${keeper}</div>`;
}

// ---------- Ranglijst (enkel trainer) ----------
export async function xpRanglijstView() {
  laden();
  const [spelers, d] = await Promise.all([
    q(sb.from('players').select('id, naam, rugnummer')),
    gegevens(qb => qb),
  ]);
  const lijst = spelers.map(s => {
    const eigen = Object.fromEntries(Object.entries(d).map(([k, lijst]) => [k, lijst.filter(x => (k === 'tegen' ? x.doelman_id : x.player_id) === s.id)]));
    const r = berekenXP(eigen);
    const badges = berekenBadges(eigen).filter(b => b.behaald);
    return { s, r, l: levelVan(r.totaal), badges };
  }).sort((a, b) => b.r.totaal - a.r.totaal);
  const medaille = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;

  toon(`<a class="terug" href="#/">← Home</a>
    <div class="paginakop"><div><h1>XP-ranglijst</h1>
      <p class="zacht">Enkel jij ziet deze ranglijst. Spelers zien enkel hun eigen level.
        ${gekozenSeizoen() === 'alle' ? 'Alle seizoenen.' : `Seizoen ${gekozenSeizoen()}.`}</p></div></div>
    <section class="kaart">
      ${lijst.map(({ s, r, l, badges }, i) => `<div class="rang-rij xp-rij">
        <span class="rang-nr">${medaille(i)}</span>
        <span class="rang-naam"><a href="#/speler/${s.id}">${s.rugnummer != null ? `#${esc(s.rugnummer)} ` : ''}${esc(s.naam)}</a></span>
        <div class="xp-balk"><span style="width:${l.pct}%"></span></div>
        <b>Lv ${l.level}</b><small class="zacht">${r.totaal} XP · ${badges.length} ${badges.length === 1 ? 'badge' : 'badges'} ${badges.map(b => b.icoon).join('')}</small></div>`).join('')}
      <p class="zacht" style="font-size:.85rem;margin-top:1rem">XP: goal in de schiettraining +${XP.goal}, op de gevraagde plek +${XP.opPlek} extra
        (max ${XP.maxSchietenPerDag} XP schieten per dag) · aanwezig op training +${XP.training} · zelfevaluatie +${XP.zelfevaluatie} (1 keer per maand).
        Doelmannen: redding +${XP.redding}, alles in het midden gestopt +${XP.middenDicht} (min. 3 schoten),
        30% gestopt op een dag +${XP.dertigProcent} (min. 10 schoten op doel), max ${XP.maxKeepenPerDag} XP keepen per dag.</p>
    </section>`);
}
