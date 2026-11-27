// XP: balk voor de speler (privé) en ranglijst voor de trainer. XP wordt berekend uit de gegevens, per seizoen.
import { sb, q } from '../supabase.js';
import { toon, esc, laden } from '../ui.js';
import { berekenXP, levelVan, XP } from '../lib/xp.js';
import { opSeizoen, gekozenSeizoen } from '../seizoen-keuze.js';

// Schoten met de gevraagde plek (kolom bestaat pas na update-19; anders zonder)
async function schotenQuery(filter) {
  const met = await q(filter(sb.from('training_schoten').select('player_id, datum, resultaat, doelzone, uitdaging_zone'))).catch(() => null);
  return met ?? q(filter(sb.from('training_schoten').select('player_id, datum, resultaat, doelzone'))).catch(() => []);
}

async function gegevens(filterSpeler) {
  const [schoten, aanwezig, zelf] = await Promise.all([
    schotenQuery(filterSpeler),
    q(filterSpeler(sb.from('aanwezigheden').select('player_id, status, trainingen(datum)'))).catch(() => []),
    q(filterSpeler(sb.from('self_reports').select('player_id, datum'))).catch(() => []),
  ]);
  return {
    schoten: opSeizoen(schoten, s => s.datum),
    aanwezig: opSeizoen(aanwezig, a => a.trainingen?.datum),
    zelf: opSeizoen(zelf, z => z.datum),
  };
}

export async function xpVanSpeler(playerId) {
  return berekenXP(await gegevens(qb => qb.eq('player_id', playerId)));
}

export function xpKaartHtml(r, { link = null } = {}) {
  const l = levelVan(r.totaal);
  const binnen = `<div class="xp-kop"><span class="xp-level">Level <span>${l.level}</span></span>
      <span class="zacht"><b style="color:var(--tekst)">${l.inLevel}</b> / ${l.nodig} XP tot level ${l.level + 1}</span></div>
    <div class="xp-balk"><span style="width:${l.pct}%"></span></div>
    <div class="xp-bronnen"><span>🎯 schieten <b>${r.bronnen.schieten}</b></span><span>✅ training <b>${r.bronnen.training}</b></span>
      <span>🪞 zelfevaluatie <b>${r.bronnen.zelfevaluatie}</b></span><span>totaal <b>${r.totaal} XP</b></span></div>`;
  return link ? `<a class="xp-kaart" href="${link}">${binnen}</a>` : `<div class="xp-kaart">${binnen}</div>`;
}

// ---------- Ranglijst (enkel trainer) ----------
export async function xpRanglijstView() {
  laden();
  const [spelers, d] = await Promise.all([
    q(sb.from('players').select('id, naam, rugnummer')),
    gegevens(qb => qb),
  ]);
  const lijst = spelers.map(s => {
    const r = berekenXP({
      schoten: d.schoten.filter(x => x.player_id === s.id),
      aanwezig: d.aanwezig.filter(x => x.player_id === s.id),
      zelf: d.zelf.filter(x => x.player_id === s.id),
    });
    return { s, r, l: levelVan(r.totaal) };
  }).sort((a, b) => b.r.totaal - a.r.totaal);
  const medaille = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;

  toon(`<a class="terug" href="#/">← Home</a>
    <div class="paginakop"><div><h1>XP-ranglijst</h1>
      <p class="zacht">Enkel jij ziet deze ranglijst. Spelers zien enkel hun eigen level.
        ${gekozenSeizoen() === 'alle' ? 'Alle seizoenen.' : `Seizoen ${gekozenSeizoen()}.`}</p></div></div>
    <section class="kaart">
      ${lijst.map(({ s, r, l }, i) => `<div class="rang-rij xp-rij">
        <span class="rang-nr">${medaille(i)}</span>
        <span class="rang-naam"><a href="#/speler/${s.id}">${s.rugnummer != null ? `#${esc(s.rugnummer)} ` : ''}${esc(s.naam)}</a></span>
        <div class="xp-balk"><span style="width:${l.pct}%"></span></div>
        <b>Lv ${l.level}</b><small class="zacht">${r.totaal} XP</small></div>`).join('')}
      <p class="zacht" style="font-size:.85rem;margin-top:1rem">XP: goal in de schiettraining +${XP.goal}, op de gevraagde plek +${XP.opPlek} extra
        (max ${XP.maxSchietenPerDag} XP schieten per dag) · aanwezig op training +${XP.training} · zelfevaluatie +${XP.zelfevaluatie} (1 keer per maand).</p>
    </section>`);
}
