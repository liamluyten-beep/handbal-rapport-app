// Trainer: ranglijsten van de schiettraining. Tabblad Spelers (filter op positie) en tabblad Doelmannen.
import { sb, q } from '../supabase.js';
import { toon, esc, laden } from '../ui.js';
import { VELDPOSITIES } from '../lib/live.js';
import { rangschikSchutters, rangschikDoelmannen } from '../lib/schiet.js';
import { opSeizoen, gekozenSeizoen } from '../seizoen-keuze.js';

export async function schietStatsView() {
  laden();
  const [rijen, spelers] = await Promise.all([
    q(sb.from('training_schoten').select('player_id, doelman_id, positie, resultaat, datum')).then(r => opSeizoen(r, x => x.datum)).catch(err => {
      throw new Error(/training_schoten|schema cache/i.test(err.message) ? 'Voer eerst supabase/update-10-schiettraining.sql uit in Supabase.' : err.message);
    }),
    q(sb.from('players').select('id, naam, rugnummer')),
  ]);
  let tab = 'spelers';
  let positie = null;

  toon(`<a class="terug" href="#/">← Home</a>
    <div class="paginakop"><div><h1>Schiettraining-stats</h1>
      <p class="zacht">${rijen.length} schoten genoteerd (${gekozenSeizoen() === 'alle' ? 'alle seizoenen' : 'seizoen ' + gekozenSeizoen()}). Van beste naar slechtste.</p></div></div>
    <div class="tabs" id="tabs" style="margin-bottom:1rem">
      <button data-tab="spelers" class="actief">👟 Spelers</button><button data-tab="doelmannen">🧤 Doelmannen</button>
    </div>
    <div id="inhoud"></div>`);

  const medaille = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
  const nummer = id => spelers.find(s => s.id === id)?.rugnummer;

  function balkRij(i, href, naam, waarde, pct, sub, kleur = 'var(--accent)') {
    return `<div class="rang-rij">
      <span class="rang-nr">${medaille(i)}</span>
      <span class="rang-naam"><a href="${href}">${esc(naam)}</a></span>
      <div class="pos-balk"><span style="width:${pct ?? 0}%;background:${kleur}"></span></div>
      <b>${pct == null ? '–' : pct + '%'}</b><small class="zacht">${waarde}${sub ? ` · ${sub}` : ''}</small></div>`;
  }

  function teken() {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('actief', b.dataset.tab === tab));
    const el = document.getElementById('inhoud');
    if (tab === 'spelers') {
      const lijst = rangschikSchutters(rijen, spelers, positie);
      el.innerHTML = `<section class="kaart">
        <div class="keuze-titel">Geschoten vanaf</div>
        <div class="chips">
          <button data-pos="" class="${positie ? '' : 'actief'}">Alle posities</button>
          ${VELDPOSITIES.map(p => `<button data-pos="${p.code}" class="${positie === p.code ? 'actief' : ''}">${esc(p.naam)}</button>`).join('')}
        </div>
        ${lijst.length ? lijst.map((r, i) => balkRij(i, `#/speler/${r.player_id}`,
            `${nummer(r.player_id) != null ? `#${nummer(r.player_id)} ` : ''}${r.naam}`, `${r.goals}/${r.schoten} raak`, r.pct)).join('')
          : '<p class="leeg">Nog geen schoten vanaf deze positie.</p>'}
        <p class="zacht" style="font-size:.85rem">Trefzekerheid = goals / alle schoten (ook naast). Bij een gelijk percentage staat wie meer schoot hoger.</p>
      </section>`;
      el.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => { positie = b.dataset.pos || null; teken(); });
    } else {
      const lijst = rangschikDoelmannen(rijen, spelers);
      el.innerHTML = `<section class="kaart">
        ${lijst.length ? lijst.map((d, i) => balkRij(i, `#/speler/${d.doelman_id}`, d.naam,
            `${d.gestopt}/${d.opDoel} gestopt`, d.pct, d.mis ? `${d.mis} naast` : '', 'var(--goed)')).join('')
          : '<p class="leeg">Nog geen schoten op een doelman genoteerd.</p>'}
        <p class="zacht" style="font-size:.85rem">Reddingspercentage = gestopt / schoten op doel. Schoten naast tellen niet mee.
          Klik op een doelman voor zijn doelkaart en de cijfers per schutter.</p>
      </section>`;
    }
  }

  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { tab = b.dataset.tab; teken(); });
  teken();
}
