// Live matchwatcher: tijdens de wedstrijd schoten, tegengoals en 2 minuten ingeven.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, bijVerlaten } from '../ui.js';
import { PLOEGNAAM } from '../config.js';
import {
  VELDPOSITIES, RESULTATEN, positieNaam, scoreUitEvents, actieveStraffen, formatKlok,
  klokSeconden, startKlok, pauzeerKlok, volgendeHelft,
} from '../lib/live.js';
import { leesKlok, bewaarKlok, lokaleEvents, haalVanServer, voegToe, verwijder, synchroniseer, wachtend } from '../live-opslag.js';

const ZONE_PIJL = ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'];

export async function liveView(matchId) {
  laden();
  const [match, spelers] = await Promise.all([
    q(sb.from('matches').select('*').eq('id', matchId).maybeSingle()),
    q(sb.from('players').select('id, naam, rugnummer').order('rugnummer', { nullsFirst: false }).order('naam')),
  ]);
  if (!match) throw new Error('Deze wedstrijd bestaat niet (meer).');
  try { await haalVanServer(matchId); } catch (err) {
    if (/match_events|schema cache/i.test(err.message)) throw new Error('Voer eerst supabase/update-5-live.sql uit in Supabase.');
    // geen verbinding: verder met de lokale kopie
  }

  const spelerVan = id => spelers.find(s => s.id === id);
  const kort = s => s ? `#${s.rugnummer ?? '?'} ${s.naam.split(' ')[0]}` : 'Onbekend';
  let klok = leesKlok(matchId, match.helft_minuten || 25);
  let events = lokaleEvents(matchId);

  toon(`<div class="live">
    <a class="terug" href="#/wedstrijd/${match.id}">← Wedstrijd</a>
    <section class="scorebord">
      <div class="ploegen"><span>${esc(PLOEGNAAM)}</span><b id="score">0 – 0</b><span>${esc(match.tegenstander)}</span></div>
      <div class="klokrij">
        <span id="helft"></span><b id="klok">0:00</b>
        <button class="knop klein" id="klokKnop">▶ Start</button>
        <button class="knop tweede klein" id="helftKnop">2e helft</button>
      </div>
      <div id="straffen" class="straffen"></div>
    </section>
    <div class="live-knoppen">
      <button class="live-knop schot" id="kSchot">Schot</button>
      <button class="live-knop tegen" id="kTegen">Tegengoal</button>
      <button class="live-knop straf" id="kStraf">2 min</button>
      <button class="live-knop terugdraai" id="kOngedaan">↶ Ongedaan</button>
    </div>
    <p class="sync zacht" id="sync"></p>
    <section class="kaart"><h3>Verloop</h3><div id="log"></div></section>
  </div>
  <div class="paneel" id="paneel" hidden></div>`);

  // ---------- Tekenen ----------
  const nuKlok = () => ({ helft: klok.helft, seconde: klokSeconden(klok, Date.now()) });

  function tekenKlok() {
    const sec = klokSeconden(klok, Date.now());
    document.getElementById('klok').textContent = formatKlok(sec);
    document.getElementById('klok').classList.toggle('over', sec >= klok.helftDuur);
    document.getElementById('helft').textContent = `${klok.helft}e helft`;
    document.getElementById('klokKnop').textContent = klok.sinds != null ? '⏸ Pauze' : '▶ Start';
    document.getElementById('helftKnop').textContent = `${klok.helft + 1}e helft`;
    const straffen = actieveStraffen(events, nuKlok(), klok.helftDuur);
    document.getElementById('straffen').innerHTML = straffen.map(s =>
      `<span class="strafje ${s.tegen ? 'tegen' : ''}">⏱ ${s.tegen ? esc(match.tegenstander) : esc(kort(spelerVan(s.player_id)))} ${formatKlok(s.resterend)}</span>`).join('');
  }

  function beschrijf(e) {
    if (e.soort === 'tegengoal') return `<span class="rood">Tegengoal</span>`;
    if (e.soort === 'twee_min_tegen') return `2 min ${esc(match.tegenstander)}`;
    if (e.soort === 'twee_min') return `2 min <b>${esc(kort(spelerVan(e.player_id)))}</b>`;
    const res = e.resultaat === 'goal' ? '<span class="ok">GOAL</span>' : esc(RESULTATEN[e.resultaat] || '');
    return `<b>${esc(kort(spelerVan(e.player_id)))}</b> · ${esc(positieNaam(e.positie))} → ${res} ${e.doelzone ? ZONE_PIJL[e.doelzone - 1] : ''}`;
  }

  function tekenAlles() {
    events = lokaleEvents(matchId);
    const s = scoreUitEvents(events);
    document.getElementById('score').textContent = `${s.voor} – ${s.tegen}`;
    document.getElementById('log').innerHTML = events.length ? [...events].reverse().map(e => `
      <div class="logrij"><span class="zacht">${e.helft}e ${formatKlok(e.seconde)}</span><span>${beschrijf(e)}</span>
        <button class="knop-link zacht" data-weg="${e.id}" aria-label="Verwijderen">✕</button></div>`).join('')
      : '<p class="zacht">Nog niets ingegeven. Start de klok en tik op een knop.</p>';
    document.querySelectorAll('[data-weg]').forEach(b => b.onclick = () => {
      if (!confirm('Deze actie verwijderen?')) return;
      verwijder(matchId, b.dataset.weg); tekenAlles(); stuur();
    });
    const w = wachtend(matchId);
    document.getElementById('sync').textContent = w ? `⏳ ${w} actie(s) wachten op verbinding…` : '✓ Alles opgeslagen';
    tekenKlok();
  }

  async function stuur() {
    try { await synchroniseer(matchId); } catch { /* geen verbinding: later opnieuw */ }
    const w = wachtend(matchId);
    document.getElementById('sync').textContent = w ? `⏳ ${w} actie(s) wachten op verbinding…` : '✓ Alles opgeslagen';
  }

  function bewaar(rij) {
    voegToe(matchId, rij);
    tekenAlles();
    stuur();
  }

  // ---------- Paneel met stappen ----------
  const paneel = document.getElementById('paneel');
  const sluit = () => { paneel.hidden = true; paneel.innerHTML = ''; };

  function toonPaneel(titel, inhoud, koppel) {
    paneel.innerHTML = `<div class="paneel-binnen"><div class="paneel-kop"><h2>${titel}</h2>
      <button class="knop-link" id="sluit" aria-label="Sluiten">✕</button></div>${inhoud}</div>`;
    paneel.hidden = false;
    document.getElementById('sluit').onclick = sluit;
    koppel();
  }

  function kiesSpeler(titel, extraKnop, klaar) {
    toonPaneel(titel, `<div class="speler-tegels">${spelers.map(s => `
        <button class="speler-tegel" data-id="${s.id}"><b>${esc(s.rugnummer ?? '?')}</b><span>${esc(s.naam.split(' ')[0])}</span></button>`).join('')}
      ${extraKnop || ''}</div>`, () => {
      paneel.querySelectorAll('[data-id]').forEach(b => b.onclick = () => klaar(b.dataset.id));
    });
  }

  function schotFlow() {
    const moment = nuKlok();
    const schot = { soort: 'schot', helft: moment.helft, seconde: moment.seconde };
    kiesSpeler('Wie schoot?', '', id => {
      schot.player_id = id;
      const knop = code => `<button class="veld-zone z-${code}" data-pos="${code}">${esc(positieNaam(code))}</button>`;
      toonPaneel(`${esc(kort(spelerVan(id)))} · vanaf waar?`, `<div class="veld">
          <div class="veld-doel"></div><div class="veld-6m"></div>
          ${VELDPOSITIES.map(p => knop(p.code)).join('')}</div>`, () => {
        paneel.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => {
          schot.positie = b.dataset.pos;
          toonPaneel(`${esc(kort(spelerVan(id)))} · ${esc(positieNaam(schot.positie))}`, `<div class="resultaten">
              <button class="live-knop goal" data-res="goal">GOAL</button>
              <button class="live-knop redding" data-res="redding">Redding</button>
              <button class="live-knop mis" data-res="mis">Mis (naast/over/paal)</button></div>`, () => {
            paneel.querySelectorAll('[data-res]').forEach(r => r.onclick = () => {
              schot.resultaat = r.dataset.res;
              if (schot.resultaat === 'mis') { bewaar(schot); sluit(); return; }
              toonPaneel(`Waar in het doel? <span class="zacht">(gezien vanuit de schutter)</span>`, `<div class="doel-raster">
                  ${ZONE_PIJL.map((p, i) => `<button data-zone="${i + 1}">${p}</button>`).join('')}</div>
                <button class="knop tweede" id="overslaan" style="margin-top:1rem">Overslaan</button>`, () => {
                paneel.querySelectorAll('[data-zone]').forEach(z => z.onclick = () => { schot.doelzone = Number(z.dataset.zone); bewaar(schot); sluit(); });
                document.getElementById('overslaan').onclick = () => { bewaar(schot); sluit(); };
              });
            });
          });
        });
      });
    });
  }

  // ---------- Knoppen ----------
  document.getElementById('kSchot').onclick = schotFlow;
  document.getElementById('kTegen').onclick = () => {
    const m = nuKlok();
    bewaar({ soort: 'tegengoal', helft: m.helft, seconde: m.seconde });
    melding('Tegengoal genoteerd');
  };
  document.getElementById('kStraf').onclick = () => {
    const m = nuKlok();
    kiesSpeler('2 minuten voor…', `<button class="speler-tegel tegen" data-tegen="1"><b>✕</b><span>${esc(match.tegenstander)}</span></button>`, id => {
      bewaar({ soort: 'twee_min', player_id: id, helft: m.helft, seconde: m.seconde }); sluit();
    });
    const t = paneel.querySelector('[data-tegen]');
    if (t) t.onclick = () => { bewaar({ soort: 'twee_min_tegen', helft: m.helft, seconde: m.seconde }); sluit(); };
  };
  document.getElementById('kOngedaan').onclick = () => {
    const laatste = [...events].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).pop();
    if (!laatste) return melding('Niets om ongedaan te maken.', 'fout');
    verwijder(matchId, laatste.id); tekenAlles(); stuur();
    melding('Laatste actie ongedaan gemaakt');
  };
  document.getElementById('klokKnop').onclick = () => {
    klok = klok.sinds != null ? pauzeerKlok(klok, Date.now()) : startKlok(klok, Date.now());
    bewaarKlok(matchId, klok); tekenKlok();
  };
  document.getElementById('helftKnop').onclick = () => {
    if (!confirm(`Naar de ${klok.helft + 1}e helft? De klok begint dan opnieuw op 0:00.`)) return;
    klok = volgendeHelft(pauzeerKlok(klok, Date.now()));
    bewaarKlok(matchId, klok); tekenKlok();
  };

  // ---------- Timers, verbinding en scherm wakker houden ----------
  const tik = setInterval(tekenKlok, 1000);
  const herhaal = setInterval(stuur, 15000);
  window.addEventListener('online', stuur);
  let wakker = null;
  try { wakker = await navigator.wakeLock?.request('screen'); } catch { /* niet ondersteund */ }
  bijVerlaten(() => {
    clearInterval(tik); clearInterval(herhaal);
    window.removeEventListener('online', stuur);
    wakker?.release?.();
  });

  tekenAlles();
  stuur();
}
