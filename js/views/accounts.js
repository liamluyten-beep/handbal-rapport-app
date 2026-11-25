// Trainer: overzicht van accounts en wie matchwatcher is (een speler kan ook watcher zijn).
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding } from '../ui.js';
import { sessie } from '../app.js';

export async function accountsView() {
  laden();
  const [profielen, spelers] = await Promise.all([
    q(sb.from('profiles').select('id, email, role, kan_watchen').order('email'))
      .catch(() => q(sb.from('profiles').select('id, email, role').order('email'))),
    q(sb.from('players').select('naam, user_id').not('user_id', 'is', null)),
  ]);
  const spelerVan = Object.fromEntries(spelers.map(s => [s.user_id, s.naam]));
  const isWatcher = p => p.role === 'watcher' || !!p.kan_watchen;

  toon(`<div class="paginakop"><div><h1>Accounts</h1>
      <p class="zacht">Iedereen die een account aanmaakte. Zet het vinkje <b>Matchwatcher</b> aan voor wie live matchen mag ingeven.
      Een speler kan ook matchwatcher zijn; een watcher zonder speler ziet geen rapporten.</p></div></div>
    <section class="kaart">
      <table class="tabel"><thead><tr><th>E-mail</th><th>Speler</th><th>Rol</th><th>Matchwatcher</th></tr></thead><tbody>
      ${profielen.map(p => `<tr>
        <td>${esc(p.email)}</td>
        <td>${spelerVan[p.id] ? esc(spelerVan[p.id]) : '<span class="zacht">—</span>'}</td>
        <td>${p.role === 'trainer' ? 'Trainer' : spelerVan[p.id] ? 'Speler' : '<span class="zacht">geen speler gekozen</span>'}</td>
        <td>${p.role === 'trainer' || p.id === sessie.user.id ? '<span class="zacht">alles</span>' : `
          <label class="schakelaar"><input type="checkbox" data-id="${p.id}" ${isWatcher(p) ? 'checked' : ''}>
          <span>${isWatcher(p) ? 'ja' : 'nee'}</span></label>`}</td></tr>`).join('')}
      </tbody></table>
    </section>`);

  document.querySelectorAll('.schakelaar input').forEach(v => v.onchange = async () => {
    v.disabled = true;
    try {
      await q(sb.rpc('zet_watcher', { gebruiker: v.dataset.id, aan: v.checked }));
      melding(v.checked ? 'Is nu matchwatcher' : 'Is geen matchwatcher meer');
      accountsView();
    } catch (err) {
      melding(/zet_watcher|schema cache|function/i.test(err.message) ? 'Voer eerst supabase/update-7-home.sql uit in Supabase.' : err.message, 'fout');
      v.checked = !v.checked; v.disabled = false;
    }
  });
}
