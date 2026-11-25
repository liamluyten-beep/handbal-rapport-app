// Blok op de importpagina: wedstrijden + statistieken uit Clubee (data/clubee.json) inladen.
import { sb, q } from '../supabase.js';
import { esc, melding } from '../ui.js';
import { bouwClubeeImport } from '../lib/clubee.js';
import { formatDatum } from '../lib/voortgang.js';

const KEUZES = 'clubeeKeuzes';
const leesKeuzes = () => { try { return JSON.parse(localStorage.getItem(KEUZES)) || {}; } catch { return {}; } };

export function clubeeHtml() {
  return `<section class="kaart" id="clubeeKaart">
    <h2>Van Clubee</h2>
    <p class="zacht" id="clubeeStatus">Gegevens laden…</p>
    <div id="clubeeInhoud"></div>
  </section>`;
}

export async function clubeeStart(spelers) {
  const status = document.getElementById('clubeeStatus');
  const inhoud = document.getElementById('clubeeInhoud');
  let data;
  try {
    const res = await fetch(`data/clubee.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error();
    data = await res.json();
  } catch {
    status.textContent = 'Er zijn nog geen Clubee-gegevens opgehaald.';
    return;
  }
  const bestaand = await q(sb.from('matches').select('*')).catch(() => []);
  const metClubee = new Set(bestaand.map(m => m.clubee_id).filter(Boolean).map(Number));
  const nieuw = data.wedstrijden.filter(w => !metClubee.has(w.clubee_id)).length;
  status.innerHTML = `${esc(data.ploeg)} · ${data.wedstrijden.length} gespeelde wedstrijden
    ${nieuw ? `· <b>${nieuw} nog niet geïmporteerd</b>` : '· alles is al geïmporteerd'}
    ${data.bijgewerkt ? `· opgehaald op ${formatDatum(data.bijgewerkt)}` : ''}`;

  const opties = [...spelers].sort((a, b) => a.naam.localeCompare(b.naam));
  let keuzes = leesKeuzes();

  function teken() {
    const r = bouwClubeeImport(data, spelers, keuzes);
    const open = r.spelers.filter(s => !s.gekozen).length;
    inhoud.innerHTML = `
      <p>Clubee toont alleen initialen. Controleer of elke regel bij de juiste speler hoort.
        Regels zonder speler worden overgeslagen.</p>
      <table class="tabel"><thead><tr><th>#</th><th>Clubee</th><th>Wedstr.</th><th>Goals</th><th>Speler in de app</th></tr></thead>
      <tbody>${r.spelers.map(s => `<tr class="${s.gekozen ? '' : 'fout'}">
        <td>${s.nr}</td><td>${esc(s.initialen.split(' ').map(x => x + '…').join(' '))}</td>
        <td>${s.wedstrijden}</td><td>${s.goals}</td>
        <td><select data-sleutel="${esc(s.sleutel)}" style="max-width:260px">
          <option value="">— overslaan —</option>
          ${opties.map(p => `<option value="${p.id}" ${p.id === s.gekozen ? 'selected' : ''}>${esc(p.naam)}${p.rugnummer != null ? ` (#${p.rugnummer})` : ''}</option>`).join('')}
        </select>${s.gekozen && s.gekozen === s.auto ? ' <span class="label ok">automatisch</span>' : ''}</td></tr>`).join('')}
      </tbody></table>
      <p>${open ? `<span class="rood">${open} regel(s) zonder speler.</span> ` : ''}
        Bestaande Clubee-statistieken van deze wedstrijden worden vervangen.</p>
      <button class="knop" id="clubeeImport">${data.wedstrijden.length} wedstrijden importeren</button>`;

    inhoud.querySelectorAll('select[data-sleutel]').forEach(sel => sel.onchange = () => {
      keuzes = { ...keuzes, [sel.dataset.sleutel]: sel.value };
      localStorage.setItem(KEUZES, JSON.stringify(keuzes));
      teken();
    });
    document.getElementById('clubeeImport').onclick = e => importeer(r, e.target);
  }

  async function importeer(r, knop) {
    knop.disabled = true;
    try {
      // 1. Handmatig aangemaakte wedstrijd op dezelfde dag tegen dezelfde ploeg overnemen
      const huidig = await q(sb.from('matches').select('*'));
      for (const w of r.wedstrijden) {
        if (huidig.some(m => Number(m.clubee_id) === w.clubee_id)) continue;
        const zelfde = huidig.find(m => !m.clubee_id && m.datum === w.datum &&
          m.tegenstander.toLowerCase() === w.tegenstander.toLowerCase());
        if (zelfde) await q(sb.from('matches').update({ clubee_id: w.clubee_id }).eq('id', zelfde.id));
      }
      // 2. Wedstrijden opslaan/bijwerken
      const matches = await q(sb.from('matches').upsert(r.wedstrijden, { onConflict: 'clubee_id' }).select('id, clubee_id'));
      const naarMatch = Object.fromEntries(matches.map(m => [Number(m.clubee_id), m.id]));
      // 3. Statistieken vervangen
      const ids = Object.values(naarMatch);
      await q(sb.from('goals').delete().in('match_id', ids));
      const rijen = r.goals.map(({ clubee_id, ...g }) => ({ ...g, match_id: naarMatch[clubee_id] }));
      if (rijen.length) await q(sb.from('goals').insert(rijen));
      melding(`${matches.length} wedstrijden en ${rijen.length} spelersstatistieken geïmporteerd.`);
      location.hash = '#/wedstrijden';
    } catch (err) {
      melding(/clubee_id|score_voor|zeven_m|schema cache/i.test(err.message)
        ? 'De database mist nog de Clubee-kolommen. Voer eerst supabase/update-1-clubee.sql uit in Supabase.'
        : err.message, 'fout');
      knop.disabled = false;
    }
  }

  teken();
}
