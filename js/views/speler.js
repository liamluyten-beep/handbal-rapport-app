import { sb, q } from '../supabase.js';
import { toon, laden, melding, esc } from '../ui.js';
import { laadSpelerData, renderOverzicht } from './overzicht.js';
import { spelerFormulier, leesSpeler } from './spelers.js';

export async function spelerView(id) {
  laden();
  const speler = await q(sb.from('players').select('*').eq('id', id).maybeSingle());
  if (!speler) throw new Error('Deze speler bestaat niet (meer).');
  const data = await laadSpelerData(id);
  const { html, tekenGrafieken } = renderOverzicht(speler, data, { trainer: true });

  toon(`<a class="terug" href="#/spelers">← Alle spelers</a>
    <section class="kaart" id="gegevensKaart" hidden>
      <h2>Gegevens van ${esc(speler.naam)}</h2>
      <form id="spelerForm" class="formulier">${spelerFormulier(speler)}
        <div class="rij tussen"><button class="knop">Opslaan</button>
          <button type="button" class="knop gevaar" id="verwijder">Speler verwijderen</button></div>
      </form>
    </section>
    ${html}`);
  tekenGrafieken();

  document.getElementById('bewerkSpeler').onclick = () => {
    const k = document.getElementById('gegevensKaart'); k.hidden = !k.hidden;
  };
  document.getElementById('spelerForm').onsubmit = async e => {
    e.preventDefault();
    try {
      await q(sb.from('players').update(leesSpeler(e.target)).eq('id', id));
      melding('Gegevens opgeslagen');
      spelerView(id);
    } catch (err) { melding(err.message, 'fout'); }
  };
  document.getElementById('verwijder').onclick = async () => {
    if (!confirm(`${speler.naam} en al zijn/haar rapporten en goals definitief verwijderen?`)) return;
    try {
      await q(sb.from('players').delete().eq('id', id));
      melding('Speler verwijderd');
      location.hash = '#/spelers';
    } catch (err) { melding(err.message, 'fout'); }
  };
}
