// Startscherm van de matchwatcher: wedstrijd kiezen of aanmaken, dan live ingeven.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, vandaag } from '../ui.js';
import { formatDatum } from '../lib/voortgang.js';

export async function watcherView() {
  laden();
  const van = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const matches = await q(sb.from('matches').select('id, datum, tegenstander, thuis').gte('datum', van).order('datum'));
  const vandaagStr = vandaag();

  toon(`<div class="live">
    <h1>Matchwatcher</h1>
    <p class="zacht">Kies de wedstrijd die je gaat volgen.</p>
    ${matches.length ? `<div class="kies-lijst">${matches.map(m => `
      <a class="kies-speler" href="#/live/${m.id}" style="text-decoration:none">
        <span class="nummer klein-nummer">${m.datum === vandaagStr ? '▶' : formatDatum(m.datum).slice(0, 2)}</span>
        <span>${esc(m.tegenstander)}<br><small class="zacht">${formatDatum(m.datum)} · ${m.thuis ? 'thuis' : 'uit'}
          ${m.datum === vandaagStr ? ' · <b>vandaag</b>' : ''}</small></span></a>`).join('')}</div>`
      : '<p>Er staan geen wedstrijden klaar voor deze week.</p>'}
    <section class="kaart" style="margin-top:1.2rem">
      <h2>Wedstrijd staat er niet bij?</h2>
      <form id="nieuwForm" class="formulier">
        <div class="velden">
          <label>Datum<input type="date" name="datum" required value="${vandaagStr}"></label>
          <label>Tegenstander<input name="tegenstander" required placeholder="Bv. Merksplas"></label>
          <label>Thuis/uit<select name="thuis"><option value="1">Thuis</option><option value="0">Uit</option></select></label>
        </div>
        <div><button class="knop">Aanmaken en starten</button></div>
      </form>
    </section>
  </div>`);

  document.getElementById('nieuwForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const m = await q(sb.from('matches').insert({
        datum: f.get('datum'), tegenstander: f.get('tegenstander').trim(), thuis: f.get('thuis') === '1',
      }).select('id').single());
      location.hash = `#/live/${m.id}`;
    } catch (err) {
      melding(err.message.includes('duplicate') ? 'Die wedstrijd bestaat al: kies ze in de lijst.' : err.message, 'fout');
    }
  };
}
