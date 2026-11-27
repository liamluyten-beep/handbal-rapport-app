// Ploegstats (Heren 1): topschutters en uitslagen van de hele ploeg, voor trainer en spelers.
import { sb, q } from '../supabase.js';
import { toon, esc, laden } from '../ui.js';
import { sessie } from '../app.js';
import { formatDatum } from '../lib/voortgang.js';
import { topschutters } from '../lib/ploegstats.js';
import { opSeizoen, gekozenSeizoen } from '../seizoen-keuze.js';

export async function ploegstatsView() {
  laden();
  const trainer = sessie.rol === 'trainer';
  const [spelers, goals, events, matches, ik] = await Promise.all([
    // Spelers zien enkel naam en rugnummer van ploegmaten (geen e-mailadressen)
    trainer ? q(sb.from('players').select('id, naam, rugnummer')) : q(sb.rpc('ploeg_spelers')).then(r => r ?? []),
    q(sb.from('goals').select('player_id, match_id, aantal, zeven_m, twee_min, matches(datum)')),
    q(sb.from('match_events').select('player_id, soort, resultaat, matches(datum)')).catch(() => []),
    q(sb.from('matches').select('*').order('datum', { ascending: false })),
    trainer ? null : q(sb.from('players').select('id').eq('user_id', sessie.user.id).maybeSingle()),
  ]);
  const lijst = topschutters(spelers, opSeizoen(goals, g => g.matches?.datum), opSeizoen(events, e => e.matches?.datum));
  const gespeeld = opSeizoen(matches, m => m.datum).filter(m => m.score_voor != null && m.score_tegen != null);
  const tel = u => gespeeld.filter(m => Math.sign(m.score_voor - m.score_tegen) === u).length;
  const voor = gespeeld.reduce((t, m) => t + m.score_voor, 0), tegen = gespeeld.reduce((t, m) => t + m.score_tegen, 0);
  const metLive = lijst.some(r => r.schoten);
  const medaille = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
  const seizoen = gekozenSeizoen() === 'alle' ? 'Alle seizoenen' : `Seizoen ${gekozenSeizoen()}`;

  toon(`<a class="terug" href="#/">← Home</a>
    <div class="paginakop"><div><h1>Ploegstats</h1><p class="zacht">${seizoen}</p></div></div>
    <div class="stats">
      <div class="stat"><div class="titel">Gespeeld</div><div class="waarde">${gespeeld.length}</div></div>
      <div class="stat"><div class="titel">Gewonnen</div><div class="waarde">${tel(1)}</div><small class="zacht">${tel(0)} gelijk · ${tel(-1)} verloren</small></div>
      <div class="stat"><div class="titel">Goals voor</div><div class="waarde">${voor}</div>${gespeeld.length ? `<small class="zacht">${(voor / gespeeld.length).toFixed(1)} per match</small>` : ''}</div>
      <div class="stat"><div class="titel">Goals tegen</div><div class="waarde">${tegen}</div>${gespeeld.length ? `<small class="zacht">${(tegen / gespeeld.length).toFixed(1)} per match</small>` : ''}</div>
    </div>
    <section class="kaart">
      <h2>Topschutters</h2>
      ${lijst.length ? `<div class="tabel-scroll"><table class="tabel">
        <thead><tr><th></th><th>Speler</th><th>Goals</th><th>Matchen</th><th>Gem.</th><th>7 m</th><th>2 min</th>${metLive ? '<th>Live raak</th>' : ''}</tr></thead>
        <tbody>${lijst.map((r, i) => `<tr${ik && r.speler.id === ik.id ? ' class="eigen-rij"' : ''}>
          <td>${r.goals ? medaille(i) : ''}</td>
          <td>${trainer ? `<a href="#/speler/${esc(r.speler.id)}">` : ''}${r.speler.rugnummer != null ? `#${esc(r.speler.rugnummer)} ` : ''}${esc(r.speler.naam)}${trainer ? '</a>' : ''}</td>
          <td><b>${r.goals}</b></td><td>${r.matchen}</td><td>${r.gemiddelde ?? '–'}</td><td>${r.zevenM || ''}</td><td>${r.tweeMin || ''}</td>
          ${metLive ? `<td>${r.schoten ? `${r.rendement}% <small class="zacht">(${r.schoten})</small>` : ''}</td>` : ''}</tr>`).join('')}</tbody>
      </table></div>` : '<p class="leeg">Nog geen spelers.</p>'}
      ${metLive ? '<p class="zacht" style="font-size:.85rem">Live raak: % schoten raak in de matchen die live gevolgd werden (aantal schoten tussen haakjes).</p>' : ''}
    </section>
    <section class="kaart">
      <h2>Uitslagen</h2>
      ${gespeeld.length ? gespeeld.map(m => {
        const u = Math.sign(m.score_voor - m.score_tegen);
        const label = u > 0 ? '<span class="label ok">W</span>' : u < 0 ? '<span class="label">V</span>' : '<span class="label">G</span>';
        const binnen = `<span><b>${esc(m.tegenstander)}</b><br><small class="zacht">${formatDatum(m.datum)} · ${m.thuis ? 'thuis' : 'uit'}</small></span>
          <span class="uitslag-score">${m.score_voor} – ${m.score_tegen} ${label}</span>`;
        return trainer ? `<a class="uitslag-rij" href="#/wedstrijd/${esc(m.id)}">${binnen}</a>` : `<div class="uitslag-rij">${binnen}</div>`;
      }).join('') : '<p class="leeg">Nog geen gespeelde matchen.</p>'}
    </section>`);
}
