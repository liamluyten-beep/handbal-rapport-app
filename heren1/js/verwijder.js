// Account (en eventueel speler) verwijderen, met een duidelijk bevestigingsvenster.
import { sb, q } from './supabase.js';
import { esc, melding } from './ui.js';
import { verwijderFoto } from './foto.js';

// Toont het venster. Geeft true terug als er iets verwijderd werd.
export function verwijderAccountVenster({ userId, email, spelerId = null, spelerNaam = null, standaard = 'account' }) {
  return new Promise(klaar => {
    const venster = document.createElement('dialog');
    venster.className = 'venster';
    venster.innerHTML = `<form method="dialog" class="formulier">
      <h2>Account verwijderen</h2>
      <p>Het account <b>${esc(email || 'zonder e-mail')}</b> wordt definitief verwijderd. Deze persoon kan daarna
        <b>niet meer inloggen</b>.</p>
      ${spelerId ? `<fieldset class="keuze">
          <label><input type="radio" name="wat" value="account" ${standaard === 'account' ? 'checked' : ''}>
            <span><b>Enkel het account</b><br><small class="zacht">Speler ${esc(spelerNaam)} blijft bestaan met rapporten en goals,
            maar zonder login.</small></span></label>
          <label><input type="radio" name="wat" value="alles" ${standaard === 'alles' ? 'checked' : ''}>
            <span><b>Account én speler ${esc(spelerNaam)}</b><br><small class="zacht">Ook rapporten, zelfevaluaties, goals
            en profielfoto worden gewist.</small></span></label>
        </fieldset>` : ''}
      <label class="bevestig"><span>Typ <b>VERWIJDER</b> om te bevestigen</span><input name="code" autocomplete="off"></label>
      <div class="rij tussen">
        <button value="annuleer" class="knop tweede" formnovalidate>Annuleren</button>
        <button value="ok" class="knop gevaar-vol" id="vwOk" disabled>Definitief verwijderen</button>
      </div>
    </form>`;
    document.body.appendChild(venster);
    const form = venster.querySelector('form');
    const ok = venster.querySelector('#vwOk');
    form.code.oninput = () => { ok.disabled = form.code.value.trim().toUpperCase() !== 'VERWIJDER'; };
    venster.addEventListener('close', async () => {
      const bevestigd = venster.returnValue === 'ok';
      const alles = spelerId && new FormData(form).get('wat') === 'alles';
      venster.remove();
      if (!bevestigd) return klaar(false);
      try {
        if (alles) await verwijderFoto(spelerId).catch(() => {});
        await q(sb.rpc('verwijder_account', { gebruiker: userId, ook_speler: !!alles }));
        melding(alles ? 'Account en speler verwijderd' : 'Account verwijderd');
        klaar(true);
      } catch (err) {
        melding(/verwijder_account|schema cache|function/i.test(err.message)
          ? 'Voer eerst supabase/update-8-verwijderen.sql uit in Supabase.' : err.message, 'fout');
        klaar(false);
      }
    });
    venster.showModal();
    form.code.focus();
  });
}
