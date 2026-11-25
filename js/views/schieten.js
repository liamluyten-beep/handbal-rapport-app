// Speler: schoten noteren tijdens de schiettraining. Doelman en positie blijven staan;
// per schot: plek in het doel -> goal/redding (2 tikken), of "naast/over" (1 tik).
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, vandaag, bijVerlaten } from '../ui.js';
import { sessie } from '../app.js';
import { maakOpslag } from '../opslag.js';
import { VELDPOSITIES, positieNaam, schotStats } from '../lib/live.js';
import { alsSchoten } from '../lib/schiet.js';

const ZONE_PIJL = ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'];
const opslag = maakOpslag({
  tabel: 'training_schoten', voorvoegsel: 'schiet',
  filter: (query, scope) => { const [pid, datum] = scope.split('|'); return query.eq('player_id', pid).eq('datum', datum); },
});
const keuzeSleutel = 'schietKeuze';

export async function schietenView() {
  laden();
  const speler = await q(sb.from('players').select('id, naam').eq('user_id', sessie.user.id).maybeSingle());
  if (!speler) { location.hash = '#/'; return; }
  let doelmannen = [];
  try { doelmannen = await q(sb.rpc('doelmannen')); } catch (err) {
    if (/doelmannen|schema cache|function/i.test(err.message)) throw new Error('De schiettraining is nog niet ingesteld. Vraag je trainer om update-10-schiettraining.sql uit te voeren.');
  }
  doelmannen = doelmannen.filter(d => d.id !== speler.id);
  const datum = vandaag();
  const scope = `${speler.id}|${datum}`;
  try { await opslag.haalVanServer(scope); } catch { /* offline: lokale kopie */ }

  let keuze = { doelman: null, positie: 'LO', ...JSON.parse(localStorage.getItem(keuzeSleutel) || '{}') };
  if (keuze.doelman && keuze.doelman !== 'andere' && !doelmannen.some(d => d.id === keuze.doelman)) keuze.doelman = null;
  let gekozenZone = null;

  toon(`<div class="live">
    <a class="terug" href="#/">← Home</a>
    <h1>Schiettraining</h1>
    <section class="kaart compact">
      <div class="keuze-titel">Doelman</div>
      <div class="chips" id="doelmannen">
        ${doelmannen.map(d => `<button data-dm="${d.id}">${esc(d.naam.split(' ')[0])}${d.rugnummer != null ? ` #${esc(d.rugnummer)}` : ''}</button>`).join('')}
        <button data-dm="andere">Andere</button>
      </div>
      <div class="keuze-titel">Ik schiet vanaf</div>
      <div class="chips" id="posities">${VELDPOSITIES.map(p => `<button data-pos="${p.code}">${esc(p.naam)}</button>`).join('')}</div>
    </section>
    <section class="kaart compact" id="invoer"></section>
    <p class="sync zacht" id="sync"></p>
    <section class="kaart compact"><div id="samenvatting"></div></section>
    <section class="kaart compact"><h3>Mijn schoten vandaag</h3><div id="lijst"></div></section>
  </div>`);

  const doelmanNaam = id => id === 'andere' || !id ? 'andere doelman' : (doelmannen.find(d => d.id === id)?.naam.split(' ')[0] ?? 'doelman');

  function tekenKeuzes() {
    document.querySelectorAll('[data-dm]').forEach(b => b.classList.toggle('actief', b.dataset.dm === keuze.doelman));
    document.querySelectorAll('[data-pos]').forEach(b => b.classList.toggle('actief', b.dataset.pos === keuze.positie));
    localStorage.setItem(keuzeSleutel, JSON.stringify(keuze));
  }

  function tekenInvoer() {
    const el = document.getElementById('invoer');
    if (!keuze.doelman) { el.innerHTML = '<p class="leeg">Kies eerst de doelman hierboven.</p>'; return; }
    if (gekozenZone == null) {
      el.innerHTML = `<p class="zacht" style="margin-top:0">Tik waar je schot ging (gezien vanuit jou):</p>
        <div class="doel-raster">${ZONE_PIJL.map((p, i) => `<button data-zone="${i + 1}">${p}</button>`).join('')}</div>
        <button class="live-knop mis breed" id="naast" style="margin-top:.7rem;width:100%">Naast / over / paal</button>`;
      el.querySelectorAll('[data-zone]').forEach(b => b.onclick = () => { gekozenZone = Number(b.dataset.zone); tekenInvoer(); });
      document.getElementById('naast').onclick = () => bewaar('mis', null);
    } else {
      el.innerHTML = `<p class="zacht" style="margin-top:0">Schot ${ZONE_PIJL[gekozenZone - 1]} vanaf ${esc(positieNaam(keuze.positie))}:</p>
        <div class="resultaten">
          <button class="live-knop goal" id="rGoal">GOAL</button>
          <button class="live-knop redding" id="rRedding">Gestopt door ${esc(doelmanNaam(keuze.doelman))}</button>
          <button class="knop tweede" id="rTerug">← Andere plek</button>
        </div>`;
      document.getElementById('rGoal').onclick = () => bewaar('goal', gekozenZone);
      document.getElementById('rRedding').onclick = () => bewaar('redding', gekozenZone);
      document.getElementById('rTerug').onclick = () => { gekozenZone = null; tekenInvoer(); };
    }
  }

  function tekenLijst() {
    const rijen = opslag.lokaal(scope).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const st = schotStats(alsSchoten(rijen));
    document.getElementById('samenvatting').innerHTML = st.schoten
      ? `<div class="schiet-teller"><b>${st.goals}/${st.schoten}</b><span>${st.pct}% raak vandaag</span></div>
         ${st.perPositie.map(p => `<span class="label">${esc(p.naam)} ${p.goals}/${p.schoten}</span>`).join(' ')}`
      : '<p class="zacht" style="margin:0">Nog geen schoten vandaag. Kies doelman en positie, en tik na elk schot.</p>';
    document.getElementById('lijst').innerHTML = rijen.length ? rijen.slice(0, 30).map(r => `<div class="logrij">
        <span class="zacht">${new Date(r.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>${esc(positieNaam(r.positie))} → ${r.resultaat === 'goal' ? '<span class="ok">GOAL</span>' : r.resultaat === 'redding' ? 'gestopt' : 'mis'}
          ${r.doelzone ? ZONE_PIJL[r.doelzone - 1] : ''} <small class="zacht">${esc(doelmanNaam(r.doelman_id))}</small></span>
        <button class="knop-link zacht" data-weg="${r.id}" aria-label="Verwijderen">✕</button></div>`).join('')
      : '<p class="zacht">—</p>';
    document.querySelectorAll('[data-weg]').forEach(b => b.onclick = () => { opslag.verwijder(scope, b.dataset.weg); tekenLijst(); stuur(); });
    const w = opslag.wachtend(scope);
    document.getElementById('sync').textContent = w ? `⏳ ${w} schot(en) wachten op verbinding…` : (rijen.length ? '✓ Alles opgeslagen' : '');
  }

  async function stuur() {
    try { await opslag.synchroniseer(scope); } catch { /* later opnieuw */ }
    const w = opslag.wachtend(scope);
    document.getElementById('sync').textContent = w ? `⏳ ${w} schot(en) wachten op verbinding…` : '✓ Alles opgeslagen';
  }

  function bewaar(resultaat, zone) {
    opslag.voegToe(scope, {
      player_id: speler.id, doelman_id: keuze.doelman === 'andere' ? null : keuze.doelman,
      positie: keuze.positie, resultaat, doelzone: zone, datum,
    });
    gekozenZone = null;
    if (navigator.vibrate) navigator.vibrate(30);
    tekenInvoer(); tekenLijst(); stuur();
  }

  document.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => { keuze.doelman = b.dataset.dm; tekenKeuzes(); tekenInvoer(); });
  document.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => { keuze.positie = b.dataset.pos; tekenKeuzes(); });

  const herhaal = setInterval(stuur, 15000);
  window.addEventListener('online', stuur);
  bijVerlaten(() => { clearInterval(herhaal); window.removeEventListener('online', stuur); });

  tekenKeuzes(); tekenInvoer(); tekenLijst(); stuur();
  if (!doelmannen.length) melding('Er staat nog geen speler met positie "Doelman" in de app. Kies "Andere".');
}
