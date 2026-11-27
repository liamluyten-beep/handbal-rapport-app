// Trainer: logboek van wie inlogde (op welke speler), wat er gebeurde en welke fouten spelers kregen.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding } from '../ui.js';
import { formatDatum } from '../lib/voortgang.js';
import { logTekst, SOORTEN } from '../lib/logboek.js';

const ICOON = { ingelogd: '🔓', uitgelogd: '🔒', account_aangemaakt: '🆕', speler_gekozen: '🙋', speler_aangemaakt: '🙋',
  schiettraining: '🎯', zelfevaluatie: '🪞', fout: '⚠️', app_geinstalleerd: '📲' };
const FILTERNAAM = { alles: 'Alles', inloggen: 'Inloggen', activiteit: 'Activiteit', app: 'App', fouten: 'Fouten' };

export async function logboekView() {
  laden();
  const rijen = await q(sb.from('logboek').select('*').order('created_at', { ascending: false }).limit(300)).catch(err => {
    throw new Error(/logboek|schema cache/i.test(err.message) ? 'Voer eerst supabase/update-13-logboek.sql uit in Supabase.' : err.message);
  });
  let filter = 'alles';

  toon(`<a class="terug" href="#/accounts">← Accounts</a>
    <div class="paginakop"><div><h1>Logboek</h1>
      <p class="zacht">Wie logde in, op welke speler, en wat liep er mis. De laatste 300 regels, nieuwste eerst.</p></div>
      <div class="rij"><button class="knop tweede" id="vernieuw">Vernieuwen</button>
        <button class="knop gevaar" id="leeg">Logboek leegmaken</button></div></div>
    <div class="chips" id="filters">${Object.keys(SOORTEN).map(k => `<button data-f="${k}">${FILTERNAAM[k]}</button>`).join('')}</div>
    <section class="kaart" id="lijst"></section>`);

  function teken() {
    document.querySelectorAll('[data-f]').forEach(b => b.classList.toggle('actief', b.dataset.f === filter));
    const lijst = SOORTEN[filter] ? rijen.filter(r => SOORTEN[filter].includes(r.actie)) : rijen;
    const el = document.getElementById('lijst');
    if (!lijst.length) { el.innerHTML = '<p class="leeg">Nog niets in het logboek.</p>'; return; }
    let dag = '';
    el.innerHTML = lijst.map(r => {
      const d = r.created_at.slice(0, 10);
      const kop = d !== dag ? `<h3 class="log-dag">${formatDatum(d)}</h3>` : '';
      dag = d;
      const uur = new Date(r.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
      return `${kop}<div class="log-rij ${r.actie === 'fout' ? 'log-fout' : ''}">
        <span class="zacht">${uur}</span><span>${ICOON[r.actie] || '•'}</span><span>${esc(logTekst(r))}</span></div>`;
    }).join('');
  }

  document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; teken(); });
  document.getElementById('vernieuw').onclick = logboekView;
  document.getElementById('leeg').onclick = async () => {
    if (!confirm('Alle regels uit het logboek verwijderen?')) return;
    try { await q(sb.from('logboek').delete().gt('id', 0)); melding('Logboek leeggemaakt'); logboekView(); }
    catch (err) { melding(err.message, 'fout'); }
  };
  teken();
}
