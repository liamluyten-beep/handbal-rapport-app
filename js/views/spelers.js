import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding } from '../ui.js';

export function spelerFormulier(s = {}) {
  return `<div class="velden">
      <label>Naam<input name="naam" required value="${esc(s.naam)}"></label>
      <label>Rugnummer<input name="rugnummer" type="number" min="0" max="99" value="${esc(s.rugnummer)}"></label>
      <label>Positie<select name="positie">
        ${['', 'Doelman', 'Linkerhoek', 'Linkeropbouw', 'Spelverdeler', 'Rechteropbouw', 'Rechterhoek', 'Cirkelloper']
          .map(p => `<option ${p === (s.positie || '') ? 'selected' : ''}>${p}</option>`).join('')}
      </select></label>
      <label>E-mail (om in te loggen)<input name="email" type="email" value="${esc(s.email)}"></label>
    </div>`;
}

export function leesSpeler(form) {
  const f = new FormData(form);
  return {
    naam: f.get('naam').trim(),
    rugnummer: f.get('rugnummer') === '' ? null : Number(f.get('rugnummer')),
    positie: f.get('positie') || null,
    email: f.get('email').trim().toLowerCase() || null,
  };
}

export async function spelersView() {
  laden();
  const spelers = await q(sb.from('players').select('*, reports(datum)').order('rugnummer', { nullsFirst: false }).order('naam'));
  toon(`
    <div class="paginakop"><div><h1>Spelers</h1><p class="zacht">${spelers.length} spelers in de ploeg</p></div>
      <button class="knop" id="toonNieuw">+ Speler toevoegen</button></div>

    <section class="kaart" id="nieuwKaart" hidden>
      <h2>Nieuwe speler</h2>
      <form id="nieuwForm" class="formulier">${spelerFormulier()}
        <p class="zacht">Met het e-mailadres maakt de speler zelf een account aan en ziet hij enkel zijn eigen rapport.</p>
        <div class="rij"><button class="knop">Opslaan</button></div></form>
    </section>

    ${spelers.length ? `<div class="spelers">${spelers.map(s => {
      return `<a class="speler-kaart" href="#/speler/${s.id}">
        <div class="nummer">${esc(s.rugnummer ?? '–')}</div>
        <div><div class="naam">${esc(s.naam)}</div>
          <div class="info">${esc(s.positie || 'Geen positie')} · ${s.reports.length} rapport${s.reports.length === 1 ? '' : 'en'}</div>
          <div class="info">${s.user_id ? '<span class="label ok">kan inloggen</span>' : s.email ? '<span class="label">nog niet geregistreerd</span>' : '<span class="label">geen e-mail</span>'}</div></div></a>`;
    }).join('')}</div>`
      : `<section class="kaart leeg"><span class="bal"></span><p>Nog geen spelers. Voeg je eerste speler toe.</p></section>`}
  `);

  document.getElementById('toonNieuw').onclick = () => {
    const k = document.getElementById('nieuwKaart'); k.hidden = !k.hidden;
    if (!k.hidden) k.querySelector('input').focus();
  };
  document.getElementById('nieuwForm').onsubmit = async e => {
    e.preventDefault();
    try {
      await q(sb.from('players').insert(leesSpeler(e.target)));
      melding('Speler toegevoegd');
      spelersView();
    } catch (err) {
      melding(err.message.includes('duplicate') ? 'Dit e-mailadres wordt al gebruikt door een andere speler.' : err.message, 'fout');
    }
  };
}
