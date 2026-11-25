// Trainer: overzicht van accounts en wie matchwatcher is.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding } from '../ui.js';
import { sessie } from '../app.js';

export async function accountsView() {
  laden();
  const [profielen, spelers] = await Promise.all([
    q(sb.from('profiles').select('id, email, role').order('email')),
    q(sb.from('players').select('naam, user_id').not('user_id', 'is', null)),
  ]);
  const spelerVan = Object.fromEntries(spelers.map(s => [s.user_id, s.naam]));
  const rolNaam = { trainer: 'Trainer', watcher: 'Matchwatcher', speler: 'Speler' };

  toon(`<div class="paginakop"><div><h1>Accounts</h1>
      <p class="zacht">Iedereen die een account aanmaakte. Maak hier iemand matchwatcher: die kan dan live wedstrijden ingeven,
      maar ziet geen rapporten.</p></div></div>
    <section class="kaart">
      <table class="tabel"><thead><tr><th>E-mail</th><th>Gekoppelde speler</th><th>Rol</th><th></th></tr></thead><tbody>
      ${profielen.map(p => `<tr>
        <td>${esc(p.email)}</td>
        <td>${spelerVan[p.id] ? esc(spelerVan[p.id]) : '<span class="zacht">—</span>'}</td>
        <td>${p.role === 'watcher' ? '<span class="label ok">Matchwatcher</span>' : esc(rolNaam[p.role] || p.role)}</td>
        <td>${p.role === 'trainer' || p.id === sessie.user.id ? ''
          : p.role === 'watcher'
            ? `<button class="knop tweede klein" data-rol="speler" data-id="${p.id}">Geen watcher meer</button>`
            : spelerVan[p.id] ? '<span class="zacht">is speler</span>'
            : `<button class="knop klein" data-rol="watcher" data-id="${p.id}">Maak matchwatcher</button>`}</td></tr>`).join('')}
      </tbody></table>
      <p class="zacht">Iemand matchwatcher maken? Laat die persoon eerst een account aanmaken op de site (zonder speler te kiezen),
        en klik dan hier op "Maak matchwatcher".</p>
    </section>`);

  document.querySelectorAll('[data-rol]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try {
      await q(sb.rpc('zet_rol', { gebruiker: b.dataset.id, rol: b.dataset.rol }));
      melding(b.dataset.rol === 'watcher' ? 'Is nu matchwatcher' : 'Is geen matchwatcher meer');
      accountsView();
    } catch (err) {
      melding(/zet_rol|schema cache|function/i.test(err.message) ? 'Voer eerst supabase/update-6-watcher.sql uit in Supabase.' : err.message, 'fout');
      b.disabled = false;
    }
  });
}
