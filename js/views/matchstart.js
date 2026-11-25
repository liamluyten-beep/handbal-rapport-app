// Blok "Match van vandaag": snel een match starten of openen (trainer en watcher).
import { sb, q } from '../supabase.js';
import { esc, melding, vandaag } from '../ui.js';
import { formatDatum } from '../lib/voortgang.js';

export async function laadMatchenVanVandaag() {
  return q(sb.from('matches').select('id, datum, tegenstander, thuis').eq('datum', vandaag()).order('tegenstander'));
}

export function matchStartHtml(matchen, { trainer = false } = {}) {
  return `<section class="kaart match-start">
    <h2>🤾 Match van vandaag <span class="zacht" style="font-size:1rem">${formatDatum(vandaag())}</span></h2>
    ${matchen.map(m => `<div class="match-vandaag">
        <div><b>${m.thuis ? 'Thuis' : 'Uit'} tegen ${esc(m.tegenstander)}</b></div>
        <div class="rij">
          ${trainer ? `<a class="knop" href="#/stats/${m.id}">📊 Live statistieken</a>` : ''}
          <a class="knop ${trainer ? 'tweede' : ''}" href="#/live/${m.id}">▶ Match volgen${trainer ? ' (zelf ingeven)' : ''}</a>
        </div></div>`).join('')}
    <details ${matchen.length ? '' : 'open'} class="ouder">
      <summary>${matchen.length ? 'Nog een match aanmaken' : 'Match aanmaken'}</summary>
      <form id="matchStartForm" class="formulier" style="margin-top:.6rem">
        <div class="velden">
          <label>Tegenstander<input name="tegenstander" required placeholder="Bv. Merksplas (zoals in Clubee)"></label>
          <label>Thuis/uit<select name="thuis"><option value="1">Thuis</option><option value="0">Uit</option></select></label>
          <label>Datum<input type="date" name="datum" required value="${vandaag()}"></label>
        </div>
        <div><button class="knop">${trainer ? 'Match aanmaken' : 'Aanmaken en volgen'}</button></div>
      </form>
    </details>
  </section>`;
}

export function koppelMatchStart({ trainer = false, herlaad }) {
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
