import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding } from '../ui.js';

export async function vaardighedenView() {
  laden();
  const skills = await q(sb.from('skills').select('*').order('volgorde'));
  toon(`
    <div class="paginakop"><div><h1>Vaardigheden</h1>
      <p class="zacht">Op deze punten geef je een score van 1 tot 5 in elk rapport.</p></div></div>
    <section class="kaart">
      <form id="skillsForm" class="formulier">
        <table class="tabel"><thead><tr><th>Volgorde</th><th>Naam</th><th></th></tr></thead><tbody>
        ${skills.map(s => `<tr>
          <td><input type="number" name="v_${s.id}" value="${s.volgorde}" style="max-width:80px"></td>
          <td><input name="n_${s.id}" value="${esc(s.naam)}" required style="max-width:none"></td>
          <td><button type="button" class="knop gevaar klein" data-weg="${s.id}">Verwijderen</button></td></tr>`).join('')}
        </tbody></table>
        <div><button class="knop">Wijzigingen opslaan</button></div>
      </form>
    </section>
    <section class="kaart">
      <h2>Vaardigheid toevoegen</h2>
      <form id="nieuwForm" class="rij"><input name="naam" required placeholder="Bv. Snelheid" style="max-width:320px">
        <button class="knop">Toevoegen</button></form>
    </section>`);

  document.getElementById('skillsForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await q(sb.from('skills').upsert(skills.map(s => ({
        id: s.id, naam: f.get(`n_${s.id}`).trim(), volgorde: Number(f.get(`v_${s.id}`)) || 0,
      }))));
      melding('Opgeslagen'); vaardighedenView();
    } catch (err) { melding(err.message, 'fout'); }
  };
  document.querySelectorAll('[data-weg]').forEach(b => b.onclick = async () => {
    if (!confirm('Deze vaardigheid verwijderen? Alle scores hiervoor in oude rapporten verdwijnen ook.')) return;
    try { await q(sb.from('skills').delete().eq('id', b.dataset.weg)); vaardighedenView(); }
    catch (err) { melding(err.message, 'fout'); }
  });
  document.getElementById('nieuwForm').onsubmit = async e => {
    e.preventDefault();
    const naam = new FormData(e.target).get('naam').trim();
    try {
      await q(sb.from('skills').insert({ naam, volgorde: Math.max(0, ...skills.map(s => s.volgorde)) + 1 }));
      vaardighedenView();
    } catch (err) { melding(err.message.includes('duplicate') ? 'Die vaardigheid bestaat al.' : err.message, 'fout'); }
  };
}
