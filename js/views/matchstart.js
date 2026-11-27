// Blok "Match van vandaag" (trainer en watcher): matchen uit de kalender staan al klaar; één tik om te volgen.
import { sb, q } from '../supabase.js';
import { esc, melding, vandaag } from '../ui.js';
import { formatDatum } from '../lib/voortgang.js';
import { laadKalender, maakMatchVoor } from '../kalender-data.js';

let vanVandaag = [];

export async function laadMatchenVanVandaag() {
  const kalender = await laadKalender({ vers: true });
  vanVandaag = kalender.filter(k => k.datum === vandaag() && k.status !== 'afgelast');
  return vanVandaag;
}

export function matchStartHtml(matchen, { trainer = false } = {}) {
  return `<section class="kaart match-start">
    <h2>🤾 Match van vandaag <span class="zacht" style="font-size:1rem">${formatDatum(vandaag())}</span></h2>
    ${matchen.length ? matchen.map((m, i) => `<div class="match-vandaag">
        <div><b>${m.thuis ? 'Thuis' : 'Uit'} tegen ${esc(m.tegenstander)}</b>${m.uur ? ` <span class="zacht">om ${esc(m.uur)}</span>` : ''}</div>
        <div class="rij">
          ${trainer ? `<button class="knop" data-i="${i}" data-naar="stats">📊 Live statistieken</button>` : ''}
          <button class="knop ${trainer ? 'tweede' : ''}" data-i="${i}" data-naar="live">▶ Match volgen${trainer ? ' (zelf ingeven)' : ''}</button>
        </div></div>`).join('')
      : '<p class="zacht" style="margin:.4rem 0">Er staat vandaag geen match in de kalender.</p>'}
    <details class="ouder">
      <summary>Andere match aanmaken (bv. een oefenmatch)</summary>
      <form id="matchStartForm" class="formulier" style="margin-top:.6rem">
        <div class="velden">
          <label>Tegenstander<input name="tegenstander" required placeholder="Bv. HC Visé"></label>
          <label>Thuis/uit<select name="thuis"><option value="1">Thuis</option><option value="0">Uit</option></select></label>
          <label>Datum<input type="date" name="datum" required value="${vandaag()}"></label>
        </div>
        <div><button class="knop">${trainer ? 'Match aanmaken' : 'Aanmaken en volgen'}</button></div>
      </form>
    </details>
  </section>`;
}

export function koppelMatchStart({ trainer = false, herlaad }) {
  document.querySelectorAll('.match-start [data-naar]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try {
      const id = await maakMatchVoor(vanVandaag[Number(b.dataset.i)]);
      location.hash = `#/${b.dataset.naar}/${id}`;
    } catch (err) { melding(err.message, 'fout'); b.disabled = false; }
  });
  const form = document.getElementById('matchStartForm');
  if (!form) return;
  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(form);
    try {
      const m = await q(sb.from('matches').insert({
        datum: f.get('datum'), tegenstander: f.get('tegenstander').trim(), thuis: f.get('thuis') === '1',
      }).select('id').single());
      melding('Match aangemaakt');
      if (trainer) herlaad(); else location.hash = `#/live/${m.id}`;
    } catch (err) {
      melding(err.message.includes('duplicate') ? 'Die match bestaat al.' : err.message, 'fout');
    }
  };
}
