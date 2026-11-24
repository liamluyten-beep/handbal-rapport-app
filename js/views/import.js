import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding } from '../ui.js';
import { parseGoalsTekst, koppelSpeler } from '../lib/importeer.js';
import { formatDatum } from '../lib/voortgang.js';

export async function importView() {
  laden();
  const spelers = await q(sb.from('players').select('id, naam, rugnummer'));
  toon(`
    <div class="paginakop"><div><h1>Goals importeren</h1>
      <p class="zacht">Plak een lijst uit Excel, Clubee of een ander programma, of kies een CSV-bestand.</p></div></div>
    <section class="kaart">
      <p>Per regel: <code>datum ; tegenstander ; speler ; goals</code>. De speler mag een naam of rugnummer zijn.
        Kolommen mogen gescheiden zijn door puntkomma, komma of tab.</p>
      <pre class="zacht"><code>Datum;Tegenstander;Speler;Goals
12/10/2026;HC Visé;Lars Peeters;4
12/10/2026;HC Visé;12;2</code></pre>
      <div class="formulier">
        <label>CSV-bestand<input type="file" id="bestand" accept=".csv,.txt,text/csv"></label>
        <label>Of plak hier<textarea id="tekst" rows="8"></textarea></label>
        <div><button class="knop tweede" id="controleer">Controleren</button></div>
      </div>
    </section>
    <section id="voorbeeld"></section>`);

  const tekstEl = document.getElementById('tekst');
  document.getElementById('bestand').onchange = async e => {
    const file = e.target.files[0];
    if (file) { tekstEl.value = await file.text(); controleer(); }
  };
  document.getElementById('controleer').onclick = controleer;

  function controleer() {
    const { rijen, fouten } = parseGoalsTekst(tekstEl.value);
    const gekoppeld = rijen.map(r => ({ ...r, speler_obj: koppelSpeler(r.speler, spelers) }));
    const onbekend = gekoppeld.filter(r => !r.speler_obj);
    const ok = gekoppeld.filter(r => r.speler_obj);
    const vb = document.getElementById('voorbeeld');
    if (!rijen.length && !fouten.length) { vb.innerHTML = ''; return melding('Er is niets om te importeren.', 'fout'); }
    vb.innerHTML = `<div class="kaart">
      <h2>Voorbeeld</h2>
      <p>${ok.length} regel(s) klaar om op te slaan.
        ${onbekend.length ? `<b style="color:var(--fout)">${onbekend.length} speler(s) niet herkend</b>. Die worden overgeslagen.` : ''}
        ${fouten.length ? `<b style="color:var(--fout)">${fouten.length} regel(s) met fouten</b>.` : ''}</p>
      ${fouten.length ? `<ul>${fouten.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      <table class="tabel"><thead><tr><th>Datum</th><th>Tegenstander</th><th>Speler</th><th>Goals</th></tr></thead>
      <tbody>${gekoppeld.map(r => `<tr class="${r.speler_obj ? '' : 'fout'}">
        <td>${formatDatum(r.datum)}</td><td>${esc(r.tegenstander)}</td>
        <td>${r.speler_obj ? esc(r.speler_obj.naam) : `${esc(r.speler)} (onbekend)`}</td><td>${r.goals}</td></tr>`).join('')}</tbody></table>
      <p class="zacht">Bestaande goals van dezelfde speler in dezelfde wedstrijd worden overschreven.</p>
      ${ok.length ? '<button class="knop" id="opslaan">Opslaan</button>' : ''}
    </div>`;
    const knop = document.getElementById('opslaan');
    if (knop) knop.onclick = () => opslaan(ok, knop);
  }

  async function opslaan(rijen, knop) {
    knop.disabled = true;
    try {
      // 1. Wedstrijden aanmaken die nog niet bestaan
      const sleutel = r => `${r.datum}|${r.tegenstander.toLowerCase()}`;
      const bestaand = await q(sb.from('matches').select('id, datum, tegenstander'));
      const ids = Object.fromEntries(bestaand.map(m => [sleutel(m), m.id]));
      const nieuw = [...new Map(rijen.filter(r => !ids[sleutel(r)])
        .map(r => [sleutel(r), { datum: r.datum, tegenstander: r.tegenstander }])).values()];
      if (nieuw.length) {
        const aangemaakt = await q(sb.from('matches').insert(nieuw).select('id, datum, tegenstander'));
        aangemaakt.forEach(m => { ids[sleutel(m)] = m.id; });
      }
      // 2. Goals opslaan (dubbele regels voor dezelfde speler/wedstrijd worden opgeteld)
      const per = new Map();
      for (const r of rijen) {
        const k = `${ids[sleutel(r)]}|${r.speler_obj.id}`;
        const g = per.get(k) || { match_id: ids[sleutel(r)], player_id: r.speler_obj.id, aantal: 0 };
        g.aantal += r.goals; per.set(k, g);
      }
      await q(sb.from('goals').upsert([...per.values()], { onConflict: 'match_id,player_id' }));
      melding(`${per.size} goal-regel(s) opgeslagen${nieuw.length ? `, ${nieuw.length} nieuwe wedstrijd(en)` : ''}.`);
      location.hash = '#/wedstrijden';
    } catch (err) { melding(err.message, 'fout'); knop.disabled = false; }
  }
}
