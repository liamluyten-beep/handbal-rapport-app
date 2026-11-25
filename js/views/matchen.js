// Speler: zijn cijfers per wedstrijd (Clubee + live schoten).
import { sb, q } from '../supabase.js';
import { toon, esc, laden } from '../ui.js';
import { sessie } from '../app.js';
import { formatDatum } from '../lib/voortgang.js';
import { perMatchOverzicht } from '../lib/live.js';

export async function mijnMatchenView() {
  laden();
  const speler = await q(sb.from('players').select('id, naam').eq('user_id', sessie.user.id).maybeSingle());
  if (!speler) { location.hash = '#/'; return; }
  const [goals, events] = await Promise.all([
    q(sb.from('goals').select('*, matches(*)').eq('player_id', speler.id)),
    q(sb.from('match_events').select('*').eq('player_id', speler.id)).catch(() => []),
  ]);
  const extraIds = [...new Set(events.map(e => e.match_id))].filter(id => !goals.some(g => g.matches?.id === id));
  const extra = extraIds.length ? await q(sb.from('matches').select('*').in('id', extraIds)) : [];
  const rijen = perMatchOverzicht(goals, events, extra);
  const uitslagLabel = { W: '<span class="label ok">W</span>', V: '<span class="label">V</span>', G: '<span class="label">G</span>' };

  toon(`<a class="terug" href="#/">← Home</a>
    <div class="paginakop"><div><h1>Mijn matchen</h1><p class="zacht">${rijen.length} wedstrijden</p></div></div>
    ${rijen.length ? `<div class="match-lijst">${rijen.map(r => `<section class="kaart match-kaart">
        <div class="rij tussen">
          <div><b>${r.match.thuis ? 'Thuis' : 'Uit'} tegen ${esc(r.match.tegenstander)}</b><br>
            <small class="zacht">${formatDatum(r.match.datum)}${r.match.score_voor != null ? ` · ${r.match.score_voor} – ${r.match.score_tegen}` : ''}</small>
            ${r.uitslag ? uitslagLabel[r.uitslag] : ''}</div>
          <div class="match-goals"><b>${r.goals ?? (r.live ? r.live.goal : '–')}</b><small class="zacht">goals</small></div>
        </div>
        <div class="match-details">
          ${r.zeven_m ? `<span>7m: <b>${r.zeven_m}</b></span>` : ''}
          ${r.twee_min ? `<span>2 min: <b>${r.twee_min}</b></span>` : ''}
          ${r.live ? `<span>Schoten: <b>${r.live.goal}/${r.live.schoten}</b> (${Math.round(100 * r.live.goal / r.live.schoten)}%)</span>
            <span>Gestopt: <b>${r.live.redding}</b></span><span>Mis: <b>${r.live.mis}</b></span>` : ''}
        </div>
      </section>`).join('')}</div>`
      : '<section class="kaart leeg"><p>Nog geen wedstrijden met jouw cijfers.</p></section>'}`);
}
