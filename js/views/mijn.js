import { sb, q } from '../supabase.js';
import { toon, laden, esc, melding } from '../ui.js';
import { sessie } from '../app.js';
import { laadSpelerData, renderOverzicht } from './overzicht.js';
import { leesPosities, controleerPosities, positieVakjesHtml, koppelPositieVakjes } from '../lib/posities.js';

export async function mijnView() {
  laden();
  const speler = await q(sb.from('players').select('*').eq('user_id', sessie.user.id).maybeSingle());
  if (!speler) {
    return toon(`<section class="kaart smal leeg"><span class="bal"></span>
      <h2>Bijna klaar</h2>
      <p>Je account is nog niet gekoppeld aan een speler. Vraag je trainer om je toe te voegen met
      dit e-mailadres: <b>${esc(sessie.user.email)}</b>.</p></section>`);
  }
  const data = await laadSpelerData(speler.id);
  const { html, tekenGrafieken } = renderOverzicht(speler, data, { eigen: true });
  const gekozen = leesPosities(speler.positie);

  toon(`<section class="kaart" id="positieKaart" ${gekozen.length ? 'hidden' : ''}>
      <h2>Mijn posities</h2>
      <p class="zacht">Op welke positie(s) speel je? Kies er maximum 2.</p>
      <form id="positieForm" class="formulier">
        ${positieVakjesHtml(gekozen)}
        <div><button class="knop">Opslaan</button></div>
      </form>
    </section>
    ${html}`);
  tekenGrafieken();
  koppelPositieVakjes(document);

  document.getElementById('mijnPosities').onclick = () => {
    const k = document.getElementById('positieKaart'); k.hidden = !k.hidden;
    if (!k.hidden) k.scrollIntoView({ behavior: 'smooth' });
  };
  document.getElementById('positieForm').onsubmit = async e => {
    e.preventDefault();
    const lijst = new FormData(e.target).getAll('posities');
    const probleem = controleerPosities(lijst);
    if (probleem) return melding(probleem, 'fout');
    try {
      await q(sb.rpc('zet_mijn_posities', { posities: lijst }));
      melding('Posities opgeslagen');
      mijnView();
    } catch (err) {
      melding(/zet_mijn_posities|schema cache|function/i.test(err.message)
        ? 'Dit werkt pas nadat de trainer update-2-speler.sql heeft uitgevoerd in Supabase.' : err.message, 'fout');
    }
  };
}
