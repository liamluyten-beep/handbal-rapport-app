import { sb, q } from '../supabase.js';
import { toon, laden, melding, esc } from '../ui.js';
import { laadSpelerData, renderOverzicht } from './overzicht.js';
import { spelerFormulier, leesSpeler } from './spelers.js';
import { koppelPositieVakjes } from '../lib/posities.js';
import { koppelFotoKnoppen, verwijderFoto } from '../foto.js';
import { verwijderAccountVenster } from '../verwijder.js';
import { xpVanSpeler, xpKaartHtml, badgesHtml } from './xp.js';
import { PLOEG } from '../config.js';
import { heeftFunctie } from '../lib/ploeg.js';

export async function spelerView(id) {
  laden();
  const speler = await q(sb.from('players').select('*').eq('id', id).maybeSingle());
  if (!speler) throw new Error('Deze speler bestaat niet (meer).');
  const metXp = heeftFunctie(PLOEG, 'xp');
  const [data, xp] = await Promise.all([laadSpelerData(id), metXp ? xpVanSpeler(id) : null]);
  const { html, tekenGrafieken } = renderOverzicht(speler, data, { trainer: true, extra: xp ? xpKaartHtml(xp) + badgesHtml(xp.badges) : '' });

  toon(`<a class="terug" href="#/spelers">← Alle spelers</a>
    <section class="kaart" id="gegevensKaart" hidden>
      <h2>Gegevens van ${esc(speler.naam)}</h2>
      <form id="spelerForm" class="formulier">${spelerFormulier(speler)}
        ${speler.user_id ? `<p class="zacht">Er is een account aan deze speler gekoppeld${speler.email ? ` (${esc(speler.email)})` : ''}.
          Koos iemand de verkeerde speler? Ontkoppel het account; die persoon kiest dan opnieuw bij het inloggen.</p>` : ''}
        <div class="rij tussen"><div class="rij"><button class="knop">Opslaan</button>
          ${speler.user_id ? '<button type="button" class="knop tweede" id="ontkoppel">Account ontkoppelen</button>' : ''}</div>
          <button type="button" class="knop gevaar" id="verwijder">Speler verwijderen</button></div>
      </form>
    </section>
    ${html}`);
  tekenGrafieken();
  koppelPositieVakjes(document);
  koppelFotoKnoppen(id, !!data.fotoUrl, () => spelerView(id));

  const ontkoppel = document.getElementById('ontkoppel');
  if (ontkoppel) ontkoppel.onclick = async () => {
    if (!confirm(`Het account loskoppelen van ${speler.naam}? Die persoon ziet dit rapport dan niet meer.`)) return;
    try {
      await q(sb.from('players').update({ user_id: null, email: null }).eq('id', id));
      melding('Account ontkoppeld');
      spelerView(id);
    } catch (err) { melding(err.message, 'fout'); }
  };

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
    // Gekoppeld account? Dan via het venster, zodat ook de login verdwijnt.
    if (speler.user_id) {
      const weg = await verwijderAccountVenster({ userId: speler.user_id, email: speler.email, spelerId: id, spelerNaam: speler.naam, standaard: 'alles' });
      if (weg) location.hash = '#/spelers';
      return;
    }
    if (!confirm(`${speler.naam} en al zijn/haar rapporten en goals definitief verwijderen?`)) return;
    try {
      await verwijderFoto(id).catch(() => {});
      await q(sb.from('players').delete().eq('id', id));
      melding('Speler verwijderd');
      location.hash = '#/spelers';
    } catch (err) { melding(err.message, 'fout'); }
  };
}
