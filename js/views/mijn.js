import { sb, q } from '../supabase.js';
import { toon, laden, esc } from '../ui.js';
import { sessie } from '../app.js';
import { laadSpelerData, renderOverzicht } from './overzicht.js';

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
  const { html, tekenGrafieken } = renderOverzicht(speler, data);
  toon(html);
  tekenGrafieken();
}
