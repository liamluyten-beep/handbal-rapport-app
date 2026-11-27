// Speler: schiettraining in sessies. Start -> schoten noteren -> Stop -> resultaten (komt bij zijn trainingsrapporten).
// Doelman en positie blijven staan; per schot: plek in het doel -> goal/gestopt (2 tikken), of "naast/over" (1 tik).
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, vandaag, bijVerlaten } from '../ui.js';
import { sessie as login } from '../app.js';
import { maakOpslag } from '../opslag.js';
import { VELDPOSITIES, positieNaam, schotStats } from '../lib/live.js';
import { alsSchoten, doelmanStats } from '../lib/schiet.js';
import { log } from '../logboek.js';
import { kiesUitdaging, xpVoorSchot, ZONE_NAMEN } from '../lib/xp.js';

const ZONE_PIJL = ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'];
const perDag = (query, scope) => { const [pid, datum] = scope.split('|'); return query.eq('player_id', pid).eq('datum', datum); };
const schotOpslag = maakOpslag({ tabel: 'training_schoten', voorvoegsel: 'schiet', filter: perDag, optioneel: ['uitdaging_zone'] });
const sessieOpslag = maakOpslag({ tabel: 'schiet_sessies', voorvoegsel: 'sessie', filter: perDag });
const keuzeSleutel = 'schietKeuze';

export async function schietenView() {
  laden();
  const speler = await q(sb.from('players').select('id, naam').eq('user_id', login.user.id).maybeSingle());
  if (!speler) { location.hash = '#/'; return; }
  let doelmannen = [];
  try { doelmannen = await q(sb.rpc('doelmannen')); } catch (err) {
    if (/doelmannen|schema cache|function/i.test(err.message)) throw new Error('De schiettraining is nog niet ingesteld. Vraag je trainer om update-10 en update-11 uit te voeren.');
  }
  doelmannen = doelmannen.filter(d => d.id !== speler.id);
  const datum = vandaag();
  const scope = `${speler.id}|${datum}`;
  try { await Promise.all([sessieOpslag.haalVanServer(scope), schotOpslag.haalVanServer(scope)]); } catch (err) {
    if (/schiet_sessies|sessie_id|schema cache/i.test(err.message)) throw new Error('Vraag je trainer om update-11-schietsessies.sql uit te voeren in Supabase.');
    // anders: offline, verder met de lokale kopie
  }

  const doelmanNaam = id => (!id || id === 'andere' ? 'andere doelman' : doelmannen.find(d => d.id === id)?.naam.split(' ')[0] ?? 'doelman');
  const openSessie = () => sessieOpslag.lokaal(scope).find(s => !s.gestopt_op);
  const schotenVan = sid => schotOpslag.lokaal(scope).filter(r => r.sessie_id === sid);

  // Eerst sessies, dan schoten versturen (een schot verwijst naar zijn sessie)
  async function stuur() {
    try { await sessieOpslag.synchroniseer(scope); await schotOpslag.synchroniseer(scope); } catch { /* later opnieuw */ }
    const w = sessieOpslag.wachtend(scope) + schotOpslag.wachtend(scope);
    const el = document.getElementById('sync');
    if (el) el.textContent = w ? `⏳ ${w} actie(s) wachten op verbinding…` : '✓ Alles opgeslagen';
    // Heeft de trainer deze sessie gestopt? Dan hier ook afsluiten (enkel als alles verstuurd is).
    const open = openSessie();
    if (open && !w && document.getElementById('stop')) {
      const { data } = await sb.from('schiet_sessies').select('gestopt_op').eq('id', open.id).maybeSingle();
      if (data?.gestopt_op && document.getElementById('stop')) {
        await sessieOpslag.haalVanServer(scope).catch(() => {});
        melding('Je trainer heeft je schiettraining gestopt. Je schoten zijn bewaard.');
        resultaatScherm({ ...open, gestopt_op: data.gestopt_op });
      }
    }
  }
  const herhaal = setInterval(stuur, 15000);
  window.addEventListener('online', stuur);
  bijVerlaten(() => { clearInterval(herhaal); window.removeEventListener('online', stuur); });

  const open = openSessie();
  if (open) return sessieScherm(open);
  return startScherm();

  // ---------- Start ----------
  function startScherm() {
    const vandaagKlaar = sessieOpslag.lokaal(scope).filter(s => s.gestopt_op)
      .sort((a, b) => String(b.gestopt_op).localeCompare(String(a.gestopt_op)));
    toon(`<div class="live">
      <a class="terug" href="#/">← Home</a>
      <h1>Schiettraining</h1>
      <section class="kaart leeg">
        <p>Start een sessie bij het begin van de oefening. Na elk schot tik je waar het ging.
          Op het einde klik je <b>Stop training</b> en krijg je je resultaten.</p>
        <button class="live-knop schot breed" id="start" style="width:100%">▶ Start schiettraining</button>
      </section>
      ${vandaagKlaar.length ? `<section class="kaart"><h3>Vandaag al gedaan</h3>${vandaagKlaar.map(s => {
        const st = schotStats(alsSchoten(schotenVan(s.id)));
        return `<div class="logrij"><span class="zacht">${new Date(s.gestart_op).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</span>
          <span><b>${st.goals}/${st.schoten}</b> ${st.pct != null ? `(${st.pct}%)` : ''}</span>
          <button class="knop-link" data-toon="${s.id}">Bekijk</button></div>`;
      }).join('')}</section>` : ''}
      <p class="sync zacht" id="sync"></p>
    </div>`);
    document.getElementById('start').onclick = () => {
      const nieuw = sessieOpslag.voegToe(scope, { player_id: speler.id, datum, gestart_op: new Date().toISOString(), gestopt_op: null });
      log('schiettraining_gestart');
      stuur();
      sessieScherm(nieuw);
    };
    document.querySelectorAll('[data-toon]').forEach(b => b.onclick = () =>
      resultaatScherm(sessieOpslag.lokaal(scope).find(s => s.id === b.dataset.toon)));
    stuur();
  }

  // ---------- Bezig ----------
  function sessieScherm(sessie) {
    let keuze = { doelman: null, positie: 'LO', ...JSON.parse(localStorage.getItem(keuzeSleutel) || '{}') };
    if (keuze.doelman && keuze.doelman !== 'andere' && !doelmannen.some(d => d.id === keuze.doelman)) keuze.doelman = null;
    let gekozenZone = null;
    let uitdaging = kiesUitdaging();   // plek in het doel die de app vraagt

    toon(`<div class="live">
      <div class="rij tussen"><h1 style="margin:0">Schiettraining</h1>
        <button class="knop gevaar-vol" id="stop">■ Stop training</button></div>
      <section class="kaart compact" style="margin-top:1rem">
        <div class="keuze-titel">Doelman</div>
        <div class="chips">
          ${doelmannen.map(d => `<button data-dm="${d.id}">${esc(d.naam.split(' ')[0])}${d.rugnummer != null ? ` #${esc(d.rugnummer)}` : ''}</button>`).join('')}
          <button data-dm="andere">Andere</button>
        </div>
        <div class="keuze-titel">Ik schiet vanaf</div>
        <div class="chips">${VELDPOSITIES.map(p => `<button data-pos="${p.code}">${esc(p.naam)}</button>`).join('')}</div>
      </section>
      <section class="kaart compact" id="invoer"></section>
      <p class="sync zacht" id="sync"></p>
      <section class="kaart compact"><div id="samenvatting"></div></section>
      <section class="kaart compact"><h3>Schoten in deze sessie</h3><div id="lijst"></div></section>
    </div>`);

    function tekenKeuzes() {
      document.querySelectorAll('[data-dm]').forEach(b => b.classList.toggle('actief', b.dataset.dm === keuze.doelman));
      document.querySelectorAll('[data-pos]').forEach(b => b.classList.toggle('actief', b.dataset.pos === keuze.positie));
      localStorage.setItem(keuzeSleutel, JSON.stringify(keuze));
    }

    function tekenInvoer() {
      const el = document.getElementById('invoer');
      if (!keuze.doelman) { el.innerHTML = '<p class="leeg">Kies eerst de doelman hierboven.</p>'; return; }
      if (gekozenZone == null) {
        el.innerHTML = `<div class="uitdaging">🎯 Uitdaging: scoor <b>${ZONE_PIJL[uitdaging - 1]} ${ZONE_NAMEN[uitdaging - 1]}</b>
            <small>goal +5 XP · op die plek +10 XP</small></div>
          <p class="zacht" style="margin-top:.6rem">Tik waar je schot ging (gezien vanuit jou):</p>
          <div class="doel-raster">${ZONE_PIJL.map((p, i) => `<button data-zone="${i + 1}" class="${i + 1 === uitdaging ? 'doelwit' : ''}">${p}</button>`).join('')}</div>
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
      const rijen = schotenVan(sessie.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const st = schotStats(alsSchoten(rijen));
      document.getElementById('samenvatting').innerHTML = st.schoten
        ? `<div class="schiet-teller"><b>${st.goals}/${st.schoten}</b><span>${st.pct}% raak · <b class="xp-klein">+${rijen.reduce((t, r) => t + xpVoorSchot(r), 0)} XP</b></span></div>
           ${st.perPositie.map(p => `<span class="label">${esc(p.naam)} ${p.goals}/${p.schoten}</span>`).join(' ')}`
        : '<p class="zacht" style="margin:0">Nog geen schoten. Kies doelman en positie, en tik na elk schot.</p>';
      document.getElementById('lijst').innerHTML = rijen.length ? rijen.map(r => `<div class="logrij">
          <span class="zacht">${new Date(r.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</span>
          <span>${esc(positieNaam(r.positie))} → ${r.resultaat === 'goal' ? '<span class="ok">GOAL</span>' : r.resultaat === 'redding' ? 'gestopt' : 'mis'}
            ${r.doelzone ? ZONE_PIJL[r.doelzone - 1] : ''} <small class="zacht">${esc(doelmanNaam(r.doelman_id))}</small></span>
          <button class="knop-link zacht" data-weg="${r.id}" aria-label="Verwijderen">✕</button></div>`).join('')
        : '<p class="zacht">—</p>';
      document.querySelectorAll('[data-weg]').forEach(b => b.onclick = () => { schotOpslag.verwijder(scope, b.dataset.weg); tekenLijst(); stuur(); });
    }

    function bewaar(resultaat, zone) {
      const rij = {
        player_id: speler.id, sessie_id: sessie.id, doelman_id: keuze.doelman === 'andere' ? null : keuze.doelman,
        positie: keuze.positie, resultaat, doelzone: zone, datum, uitdaging_zone: uitdaging,
      };
      schotOpslag.voegToe(scope, rij);
      const xp = xpVoorSchot(rij);
      if (xp) melding(xp > 5 ? `+${xp} XP · op de plek! 🔥` : `+${xp} XP`);
      uitdaging = kiesUitdaging();
      gekozenZone = null;
      if (navigator.vibrate) navigator.vibrate(30);
      tekenInvoer(); tekenLijst(); stuur();
    }

    document.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => { keuze.doelman = b.dataset.dm; tekenKeuzes(); tekenInvoer(); });
    document.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => { keuze.positie = b.dataset.pos; tekenKeuzes(); });
    document.getElementById('stop').onclick = () => {
      const aantal = schotenVan(sessie.id).length;
      if (!confirm(aantal ? `Training stoppen? Je ${aantal} schoten worden je trainingsrapport.` : 'Nog geen schoten genoteerd. Sessie toch afsluiten?')) return;
      const klaar = { ...sessie, gestopt_op: new Date().toISOString() };
      sessieOpslag.voegToe(scope, klaar);     // zelfde id = bijwerken
      { const st = schotStats(alsSchoten(schotenVan(sessie.id))); log('schiettraining', `${st.goals}/${st.schoten}`); }
      stuur();
      resultaatScherm(klaar);
    };

    tekenKeuzes(); tekenInvoer(); tekenLijst(); stuur();
    if (!doelmannen.length) melding('Er staat nog geen speler met positie "Doelman" in de app. Kies "Andere".');
  }

  // ---------- Resultaten ----------
  function resultaatScherm(s) {
    const rijen = schotenVan(s.id);
    const st = schotStats(alsSchoten(rijen));
    const keepers = doelmanStats(rijen).filter(d => d.opDoel + rijen.filter(r => r.doelman_id === d.doelman_id && r.resultaat === 'mis').length);
    toon(`<div class="live">
      <h1>Resultaten 🎯</h1>
      <p class="zacht">${new Date(s.gestart_op).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })} –
        ${new Date(s.gestopt_op).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })} · staat nu bij je trainingsrapporten</p>
      <section class="kaart">
        <div class="schiet-teller"><b>${st.goals}/${st.schoten}</b><span>${st.pct ?? 0}% raak · <b class="xp-klein">+${rijen.reduce((t, r) => t + xpVoorSchot(r), 0)} XP</b></span></div>
        ${st.schoten ? `<table class="tabel"><thead><tr><th>Positie</th><th>Raak</th><th>%</th></tr></thead><tbody>
          ${st.perPositie.map(p => `<tr><td>${esc(p.naam)}</td><td>${p.goals}/${p.schoten}</td><td>${p.pct}%</td></tr>`).join('')}</tbody></table>` : ''}
      </section>
      ${keepers.length ? `<section class="kaart"><h3>Tegen welke doelman</h3><table class="tabel"><thead><tr><th>Doelman</th><th>Goals</th><th>Gestopt</th><th>Naast</th></tr></thead><tbody>
        ${keepers.map(d => `<tr><td>${esc(doelmanNaam(d.doelman_id))}</td><td>${d.tegen}</td><td>${d.gestopt}</td>
          <td>${rijen.filter(r => (r.doelman_id ?? null) === d.doelman_id && r.resultaat === 'mis').length}</td></tr>`).join('')}</tbody></table></section>` : ''}
      ${st.schoten ? `<section class="kaart"><h3>Waar ging je schot?</h3><div class="doel-raster doelkaart">${st.perZone.map(z => {
        const t = z.goals + z.gestopt;
        return `<div class="vak" style="background:color-mix(in srgb, var(--goed) ${t ? Math.round(15 + (z.goals / t) * 50) : 0}%, var(--kaart))">
          ${t ? `<span><b>${z.goals}/${t}</b>raak</span>` : ''}</div>`;
      }).join('')}</div></section>` : ''}
      <div class="rij"><button class="knop" id="opnieuw">▶ Nieuwe sessie</button><a class="knop tweede" href="#/">Naar home</a></div>
      <p class="sync zacht" id="sync"></p>
    </div>`);
    document.getElementById('opnieuw').onclick = () => {
      const nieuw = sessieOpslag.voegToe(scope, { player_id: speler.id, datum, gestart_op: new Date().toISOString(), gestopt_op: null });
      log('schiettraining_gestart');
      stuur(); sessieScherm(nieuw);
    };
    stuur();
  }
}
