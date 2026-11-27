import { sb, q } from '../supabase.js';
import { toon, laden, esc, melding } from '../ui.js';
import { sessie } from '../app.js';
import { laadSpelerData, renderOverzicht } from './overzicht.js';
import { leesPosities, controleerPosities, positieVakjesHtml, koppelPositieVakjes } from '../lib/posities.js';
import { zoekSpelers } from '../lib/importeer.js';
import { koppelFotoKnoppen } from '../foto.js';
import { log } from '../logboek.js';

export async function mijnView() {
  laden();
  const speler = await q(sb.from('players').select('*').eq('user_id', sessie.user.id).maybeSingle());
  if (!speler) return wieBenJij();
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
  koppelFotoKnoppen(speler.id, !!data.fotoUrl, mijnView);

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

const NOG_NIET_GEINSTALLEERD = /vrije_spelers|kies_mijn_speler|maak_mijn_speler|schema cache|function/i;

// Account is nog niet gekoppeld: speler kiest zichzelf of maakt zichzelf aan
async function wieBenJij() {
  let vrij = [];
  let ontbreekt = false;
  try { vrij = await q(sb.rpc('vrije_spelers')); } catch (err) {
    if (NOG_NIET_GEINSTALLEERD.test(err.message)) ontbreekt = true; else throw err;
  }
  if (ontbreekt) {
    return toon(`<section class="kaart smal leeg"><span class="bal"></span><h2>Bijna klaar</h2>
      <p>Je account is nog niet gekoppeld aan een speler. Vraag je trainer om je toe te voegen met
      dit e-mailadres: <b>${esc(sessie.user.email)}</b>.</p></section>`);
  }

  toon(`<section class="kaart smal" style="max-width:560px">
      <h1>Wie ben jij?</h1>
      <p class="zacht">Kies jezelf in de lijst. Daarna zie je je eigen rapporten en goals.</p>
      <p class="zacht" style="font-size:.9rem">Ben je geen speler maar <b>matchwatcher</b>? Kies hier niets en vraag de trainer om je matchwatcher te maken.</p>
      ${vrij.length ? `<label>Zoek je naam<input id="zoek" placeholder="Naam of rugnummer" autocomplete="off"></label>
        <div id="lijst" class="kies-lijst"></div>` : '<p>Er staan nog geen spelers klaar om te kiezen.</p>'}
    </section>
    <section class="kaart smal" style="max-width:560px">
      <h2>Ik sta er niet tussen</h2>
      <p class="zacht">Maak jezelf aan als speler. Je trainer ziet je dan meteen in de ploeg.</p>
      <form id="nieuwForm" class="formulier">
        <div class="velden">
          <label>Voor- en achternaam<input name="naam" required minlength="2" maxlength="60" autocomplete="name"></label>
          <label>Rugnummer<input name="rugnummer" type="number" min="0" max="99" placeholder="Als je er een hebt"></label>
        </div>
        <div><button class="knop">Dit ben ik, maak mij aan</button></div>
      </form>
    </section>`);

  const lijstEl = document.getElementById('lijst');
  const teken = (tekst = '') => {
    if (!lijstEl) return;
    const gevonden = zoekSpelers(vrij, tekst);
    lijstEl.innerHTML = gevonden.length ? gevonden.map(s => `
      <button class="kies-speler" data-id="${s.id}" data-naam="${esc(s.naam)}">
        <span class="nummer klein-nummer">${esc(s.rugnummer ?? '?')}</span><span>${esc(s.naam)}</span></button>`).join('')
      : '<p class="zacht">Niemand gevonden. Sta je er niet tussen? Maak jezelf hieronder aan.</p>';
    lijstEl.querySelectorAll('.kies-speler').forEach(b => b.onclick = async () => {
      if (!confirm(`Ben jij ${b.dataset.naam}? Je kunt dit daarna niet zelf meer wijzigen.`)) return;
      b.disabled = true;
      try {
        await q(sb.rpc('kies_mijn_speler', { speler: b.dataset.id }));
        log('speler_gekozen', b.dataset.naam);
        melding(`Welkom, ${b.dataset.naam}!`);
        mijnView();
      } catch (err) { melding(err.message, 'fout'); b.disabled = false; }
    });
  };
  teken();
  const zoek = document.getElementById('zoek');
  if (zoek) zoek.oninput = () => teken(zoek.value);

  document.getElementById('nieuwForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const naam = f.get('naam').trim();
    const rugnummer = f.get('rugnummer') === '' ? null : Number(f.get('rugnummer'));
    const lijkt = zoekSpelers(vrij, naam);
    if (lijkt.length && !confirm(`Er staat al een speler "${lijkt[0].naam}" in de lijst. Ben je zeker dat je een nieuwe speler wilt aanmaken?`)) return;
    const knop = e.target.querySelector('button'); knop.disabled = true;
    try {
      await q(sb.rpc('maak_mijn_speler', { naam, rugnummer }));
      log('speler_aangemaakt', naam);
      melding(`Welkom, ${naam}!`);
      mijnView();
    } catch (err) { melding(err.message, 'fout'); knop.disabled = false; }
  };
}
