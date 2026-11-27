import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, vandaag, bijVerlaten } from '../ui.js';
import { parseSpelersTekst, normaliseer } from '../lib/importeer.js';
import { leesPosities, positieVakjesHtml, koppelPositieVakjes } from '../lib/posities.js';
import { fotoUrls, avatarHtml } from '../foto.js';
import { opSeizoen, gekozenSeizoen } from '../seizoen-keuze.js';

export function spelerFormulier(s = {}) {
  return `<div class="velden">
      <label>Naam<input name="naam" required value="${esc(s.naam)}"></label>
      <label>Rugnummer<input name="rugnummer" type="number" min="0" max="99" value="${esc(s.rugnummer)}"></label>
      <label>E-mail (om in te loggen)<input name="email" type="email" value="${esc(s.email)}"></label>
    </div>
    <div><b>Positie(s)</b> <span class="zacht">(maximum 2)</span>${positieVakjesHtml(leesPosities(s.positie))}</div>`;
}

export function leesSpeler(form) {
  const f = new FormData(form);
  return {
    naam: f.get('naam').trim(),
    rugnummer: f.get('rugnummer') === '' ? null : Number(f.get('rugnummer')),
    positie: f.getAll('posities').slice(0, 2).join(', ') || null,
    email: f.get('email').trim().toLowerCase() || null,
  };
}

export async function spelersView() {
  laden();
  const spelers = await q(sb.from('players').select('*, reports(datum)').order('rugnummer', { nullsFirst: false }).order('naam'));
  const zonderNummer = spelers.filter(s => s.rugnummer == null).length;
  const fotos = await fotoUrls(spelers.map(s => s.id));
  toon(`
    <div class="paginakop"><div><h1>Spelers</h1><p class="zacht">${spelers.length} spelers in de ploeg
      ${zonderNummer ? ` · <span class="rood">${zonderNummer} zonder rugnummer</span>` : ''}</p></div>
      <div class="rij"><button class="knop tweede" id="toonImport">Lijst importeren</button>
        <button class="knop" id="toonNieuw">+ Speler toevoegen</button></div></div>

    <section class="kaart" id="nieuwKaart" hidden>
      <h2>Nieuwe speler</h2>
      <form id="nieuwForm" class="formulier">${spelerFormulier()}
        <p class="zacht">Met het e-mailadres maakt de speler zelf een account aan en ziet hij enkel zijn eigen rapport.</p>
        <div class="rij"><button class="knop">Opslaan</button></div></form>
    </section>

    <section class="kaart" id="importKaart" hidden>
      <h2>Meerdere spelers tegelijk toevoegen</h2>
      <p>Eén speler per regel: <code>naam;rugnummer</code>. Het rugnummer mag je weglaten. Plakken uit Excel kan ook
        (kolom A naam, kolom B rugnummer).</p>
      <pre class="zacht"><code>Naam;Rugnummer
Lars Peeters;7
Emma De Smet;12
Noah Janssens</code></pre>
      <div class="formulier">
        <label>CSV-bestand<input type="file" id="spelersBestand" accept=".csv,.txt,text/csv"></label>
        <label>Of plak hier<textarea id="spelersTekst" rows="8"></textarea></label>
        <div><button class="knop tweede" id="controleerSpelers">Controleren</button></div>
      </div>
      <div id="spelersVoorbeeld"></div>
    </section>

    ${spelers.length ? `<div class="spelers">${spelers.map(s => `
      <a class="speler-kaart ${s.rugnummer == null ? 'zonder-nummer' : ''}" href="#/speler/${s.id}">
        ${avatarHtml(fotos[s.id], s.rugnummer, '', s)}
        <div><div class="naam">${esc(s.naam)}</div>
          <div class="info">${s.rugnummer == null ? '<span class="rood">Nog geen rugnummer</span> · ' : ''}${esc(s.positie || 'Geen positie')} · ${opSeizoen(s.reports, r => r.datum).length} rapport${opSeizoen(s.reports, r => r.datum).length === 1 ? '' : 'en'}</div>
          <div class="info">${s.user_id ? '<span class="label ok">kan inloggen</span>' : s.email ? '<span class="label">nog niet geregistreerd</span>' : '<span class="label">geen e-mail</span>'}</div></div></a>`).join('')}</div>`
      : `<section class="kaart leeg"><span class="bal"></span><p>Nog geen spelers. Voeg je eerste speler toe of importeer een lijst.</p></section>`}
  `);

  toonWieSchiet();
  koppelPositieVakjes(document);
  const wissel = (id, ander) => () => {
    const k = document.getElementById(id); k.hidden = !k.hidden;
    document.getElementById(ander).hidden = true;
    if (!k.hidden) k.querySelector('input, textarea').focus();
  };
  document.getElementById('toonNieuw').onclick = wissel('nieuwKaart', 'importKaart');
  document.getElementById('toonImport').onclick = wissel('importKaart', 'nieuwKaart');

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

  // ---------- Lijst importeren ----------
  const tekstEl = document.getElementById('spelersTekst');
  document.getElementById('spelersBestand').onchange = async e => {
    const file = e.target.files[0];
    if (file) { tekstEl.value = await file.text(); controleer(); }
  };
  document.getElementById('controleerSpelers').onclick = controleer;

  function controleer() {
    const { rijen, fouten } = parseSpelersTekst(tekstEl.value);
    const bestaand = new Set(spelers.map(s => normaliseer(s.naam)));
    const nummers = new Map(spelers.filter(s => s.rugnummer != null).map(s => [s.rugnummer, s.naam]));
    const nieuw = rijen.filter(r => !bestaand.has(normaliseer(r.naam)));
    const alAanwezig = rijen.length - nieuw.length;
    const vb = document.getElementById('spelersVoorbeeld');
    if (!rijen.length && !fouten.length) { vb.innerHTML = ''; return melding('Er is niets om te importeren.', 'fout'); }

    // Dubbele rugnummers (binnen de lijst of met bestaande spelers) melden
    const gebruikt = new Map(nummers);
    const waarschuwing = r => {
      if (r.rugnummer == null) return '<span class="rood">geen rugnummer</span>';
      const ander = gebruikt.get(r.rugnummer);
      gebruikt.set(r.rugnummer, r.naam);
      return ander ? `<span class="rood">nummer ook van ${esc(ander)}</span>` : '';
    };

    vb.innerHTML = `<h3 style="margin-top:1rem">Voorbeeld</h3>
      <p>${nieuw.length} nieuwe speler(s).
        ${alAanwezig ? `${alAanwezig} staan er al in en worden overgeslagen.` : ''}
        ${fouten.length ? `<b class="rood">${fouten.length} regel(s) met fouten</b>.` : ''}</p>
      ${fouten.length ? `<ul>${fouten.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      ${nieuw.length ? `<table class="tabel"><thead><tr><th>#</th><th>Naam</th><th></th></tr></thead><tbody>
        ${nieuw.map(r => `<tr class="${r.rugnummer == null ? 'fout' : ''}"><td>${r.rugnummer ?? '?'}</td>
          <td>${esc(r.naam)}</td><td>${waarschuwing(r)}</td></tr>`).join('')}</tbody></table>
        <div style="margin-top:1rem"><button class="knop" id="spelersOpslaan">${nieuw.length} speler(s) toevoegen</button></div>` : ''}`;

    const knop = document.getElementById('spelersOpslaan');
    if (knop) knop.onclick = async () => {
      knop.disabled = true;
      try {
        await q(sb.from('players').insert(nieuw.map(r => ({ naam: r.naam, rugnummer: r.rugnummer }))));
        melding(`${nieuw.length} speler(s) toegevoegd`);
        spelersView();
      } catch (err) { melding(err.message, 'fout'); knop.disabled = false; }
    };
  }
}

// ---------- Wie is nu een schiettraining bezig? Blauwe kaart met de tussenstand, ververst live ----------
function toonWieSchiet() {
  async function teken() {
    let sessies = [];
    try {
      sessies = await q(sb.from('schiet_sessies').select('id, player_id').eq('datum', vandaag()).is('gestopt_op', null));
    } catch { return; }   // tabel bestaat nog niet (update-11): niets tonen
    const schoten = sessies.length
      ? await q(sb.from('training_schoten').select('sessie_id, resultaat').in('sessie_id', sessies.map(x => x.id))).catch(() => [])
      : [];
    document.querySelectorAll('.speler-kaart').forEach(k => {
      const id = k.getAttribute('href').split('/').pop();
      const sessie = sessies.find(x => x.player_id === id);
      k.classList.toggle('bezig', !!sessie);
      k.querySelector('.bezig-label')?.remove();
      if (sessie) {
        const eigen = schoten.filter(x => x.sessie_id === sessie.id);
        const goals = eigen.filter(x => x.resultaat === 'goal').length;
        k.querySelector('.info')?.insertAdjacentHTML('beforebegin', `<div class="bezig-label">🎯 schiettraining bezig · ${goals}/${eigen.length}</div>`);
      }
    });
  }
  let wacht = null;
  const binnenkort = () => { clearTimeout(wacht); wacht = setTimeout(teken, 400); };
  const kanaal = sb.channel(`spelers-schieten-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schiet_sessies' }, binnenkort)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'training_schoten' }, binnenkort)
    .subscribe();
  const vangnet = setInterval(teken, 30000);   // als live updates niet werken: elke 30 s
  bijVerlaten(() => { clearInterval(vangnet); clearTimeout(wacht); sb.removeChannel(kanaal); });
  teken();
}
