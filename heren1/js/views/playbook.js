// Playbook: aanvalssystemen op een tekenbord in stappen. Trainer tekent (slepen + bal geven), spelers bekijken en spelen af.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, bijVerlaten } from '../ui.js';
import { sessie } from '../app.js';
import { AANVALLERS, NAMEN, startStap, volgendeStap, pijlenTussen, tussenStand } from '../lib/playbook.js';

const NIET_KLAAR = err => new Error(/systemen|schema cache/i.test(err.message) ? 'Voer eerst supabase/update-18-playbook.sql uit in Supabase.' : err.message);

// ---------- Tekenen van het veld (SVG, 200 × 200, doel bovenaan) ----------
const VELD = `<defs>
    <marker id="pijlLoop" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#fff"/></marker>
    <marker id="pijlPas" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#e8b04a"/></marker>
  </defs>
  <rect x="0" y="0" width="200" height="200" class="pb-vloer"/>
  <path d="M85 0 h30" class="pb-doel"/>
  <path d="M25 0 A60 60 0 0 0 85 60 L115 60 A60 60 0 0 0 175 0" class="pb-lijn"/>
  <path d="M-5 0 A90 90 0 0 0 85 90 L115 90 A90 90 0 0 0 205 0" class="pb-lijn stippel"/>
  <path d="M95 70 h10" class="pb-lijn"/>`;

// Pijl die net voor de speler stopt (zodat de punt zichtbaar blijft)
function pijl(p, q, soort) {
  const d = Math.hypot(q.x - p.x, q.y - p.y) || 1, kort = 11;
  const x2 = q.x - ((q.x - p.x) / d) * kort, y2 = q.y - ((q.y - p.y) / d) * kort;
  const x1 = p.x + ((q.x - p.x) / d) * (soort === 'pas' ? 9 : 0), y1 = p.y + ((q.y - p.y) / d) * (soort === 'pas' ? 9 : 0);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="pb-${soort}" marker-end="url(#${soort === 'pas' ? 'pijlPas' : 'pijlLoop'})"/>`;
}

function bordSvg(stap, volgende, { posities = null, gekozen = null, klein = false } = {}) {
  const pos = posities ?? stap.spelers;
  const pijlen = volgende && !posities ? pijlenTussen(stap, volgende) : [];
  return `<svg viewBox="0 0 200 200" class="pb-bord ${klein ? 'klein' : ''}" aria-label="Tekenbord">
    ${VELD}
    ${pijlen.map(p => pijl(p.van, p.naar, p.soort)).join('')}
    ${AANVALLERS.map(s => `<g class="pb-speler ${gekozen === s ? 'gekozen' : ''}" data-speler="${s}" transform="translate(${pos[s].x} ${pos[s].y})">
        <circle r="10"/><text y="3.5">${s}</text>
        ${stap.bal === s ? '<circle class="pb-bal" cx="8" cy="-8" r="4"/>' : ''}</g>`).join('')}
  </svg>`;
}

// ---------- Overzicht ----------
export async function playbookView() {
  laden();
  const systemen = await q(sb.from('systemen').select('*').order('volgorde').order('naam')).catch(e => { throw NIET_KLAAR(e); });
  const trainer = sessie.rol === 'trainer';
  toon(`<div class="paginakop"><div><h1>Playbook</h1><p class="zacht">Onze aanvalssystemen. Tik op een systeem en speel het stap voor stap af.</p></div>
      ${trainer ? '<button class="knop" id="nieuw">+ Nieuw systeem</button>' : ''}</div>
    ${systemen.length ? `<div class="pb-lijst">${systemen.map(s => `<a class="pb-kaart" href="#/systeem/${s.id}">
        ${s.stappen[0] ? bordSvg(s.stappen[0], s.stappen[1], { klein: true }) : ''}
        <div><b>${esc(s.naam)}</b><small class="zacht">${s.stappen.length} stap${s.stappen.length === 1 ? '' : 'pen'}</small>
          ${s.beschrijving ? `<p class="zacht">${esc(s.beschrijving.slice(0, 90))}${s.beschrijving.length > 90 ? '…' : ''}</p>` : ''}</div></a>`).join('')}</div>`
      : `<section class="kaart leeg"><p>${trainer ? 'Nog geen systemen. Maak je eerste aanvalssysteem.' : 'De trainer heeft nog geen systemen in het playbook gezet.'}</p></section>`}`);
  const nieuw = document.getElementById('nieuw');
  if (nieuw) nieuw.onclick = async () => {
    const naam = prompt('Naam van het systeem (bv. "Kruisen links")');
    if (!naam?.trim()) return;
    try {
      const s = await q(sb.from('systemen').insert({ naam: naam.trim(), stappen: [startStap()], volgorde: systemen.length }).select('id').single());
      location.hash = `#/systeem/${s.id}`;
    } catch (err) { melding(err.message, 'fout'); }
  };
}

// ---------- Eén systeem: bekijken, afspelen en (trainer) tekenen ----------
export async function systeemView(id) {
  laden();
  const systeem = await q(sb.from('systemen').select('*').eq('id', id).maybeSingle()).catch(e => { throw NIET_KLAAR(e); });
  if (!systeem) throw new Error('Dit systeem bestaat niet (meer).');
  const trainer = sessie.rol === 'trainer';
  let stappen = systeem.stappen.length ? systeem.stappen : [startStap()];
  let i = 0, gekozen = null, speelt = null;

  toon(`<a class="terug" href="#/playbook">← Playbook</a>
    <div class="pb-kop">
      ${trainer ? `<input id="naam" class="pb-naam" value="${esc(systeem.naam)}" aria-label="Naam van het systeem">`
        : `<h1>${esc(systeem.naam)}</h1>`}
    </div>
    <div class="opst-raster">
      <section class="pb-veld-kaart"><div id="bord"></div>
        <div class="pb-bediening">
          <button class="knop tweede klein" id="terug" aria-label="Vorige stap">◀</button>
          <span id="stapNr"></span>
          <button class="knop tweede klein" id="verder" aria-label="Volgende stap">▶</button>
          <button class="knop klein" id="speel">▶ Afspelen</button>
        </div>
        <p class="pb-legende zacht"><span class="lg-loop"></span> looplijn <span class="lg-pas"></span> pas <span class="lg-bal"></span> bal</p>
      </section>
      <div>
        <section class="kaart compact"><h3 id="stapTitel"></h3>
          ${trainer ? '<textarea id="stapTekst" rows="3" placeholder="Wat gebeurt er in deze stap? Bv. LO kruist achter MO, CIR zet een blok."></textarea>'
            : '<p id="stapTekstLees"></p>'}
        </section>
        ${trainer ? `<section class="kaart compact">
          <h3>Tekenen</h3>
          <p class="zacht" style="margin-top:0">Sleep spelers naar hun plaats voor deze stap. Tik een speler aan en kies <b>Bal geven</b>.
            Looplijnen en passen naar de volgende stap tekent de app zelf.</p>
          <div class="rij" style="gap:.4rem">
            <button class="knop tweede klein" id="bal">🏐 Bal geven</button>
            <button class="knop tweede klein" id="plus">+ Stap erna</button>
            <button class="knop tweede klein" id="weg">Stap verwijderen</button>
          </div>
        </section>
        <section class="kaart compact"><h3>Uitleg bij het systeem</h3>
          <textarea id="beschrijving" rows="3" placeholder="Wanneer spelen we dit? Waar let je op?">${esc(systeem.beschrijving)}</textarea>
          <div class="rij tussen" style="margin-top:.6rem"><span class="zacht" id="bewaard"></span>
            <button class="knop gevaar klein" id="verwijder">Systeem verwijderen</button></div>
        </section>` : systeem.beschrijving ? `<section class="kaart compact"><h3>Uitleg</h3><p>${esc(systeem.beschrijving).replace(/\n/g, '<br>')}</p></section>` : ''}
      </div>
    </div>`);

  // ---------- Tekenen ----------
  function teken(posities = null) {
    document.getElementById('bord').innerHTML = bordSvg(stappen[i], stappen[i + 1], { posities, gekozen });
    document.getElementById('stapNr').textContent = `Stap ${i + 1} / ${stappen.length}`;
    document.getElementById('stapTitel').textContent = `Stap ${i + 1}`;
    document.getElementById('terug').disabled = i === 0;
    document.getElementById('verder').disabled = i >= stappen.length - 1;
    if (trainer) {
      document.getElementById('stapTekst').value = stappen[i].tekst || '';
      document.getElementById('weg').disabled = stappen.length <= 1;
      document.getElementById('bal').textContent = gekozen ? `🏐 Bal naar ${gekozen}` : '🏐 Bal geven';
    } else document.getElementById('stapTekstLees').textContent = stappen[i].tekst || '—';
  }

  // ---------- Afspelen: vloeiend van stap naar stap ----------
  function stopSpelen() { if (speelt) { cancelAnimationFrame(speelt); speelt = null; document.getElementById('speel').textContent = '▶ Afspelen'; } }
  function speel() {
    if (speelt) return stopSpelen();
    if (i >= stappen.length - 1) i = 0;
    document.getElementById('speel').textContent = '⏸ Stop';
    gekozen = null;
    let begin = null;
    const duur = 1100, rust = 700;
    const frame = ts => {
      begin ??= ts;
      const t = (ts - begin - rust) / duur;
      if (t < 0) { teken(); speelt = requestAnimationFrame(frame); return; }
      if (t >= 1) {
        i++; begin = ts; teken();
        if (i >= stappen.length - 1) { stopSpelen(); return; }
        speelt = requestAnimationFrame(frame); return;
      }
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;     // zacht versnellen en vertragen
      teken(tussenStand(stappen[i], stappen[i + 1], e));
      speelt = requestAnimationFrame(frame);
    };
    speelt = requestAnimationFrame(frame);
  }
  document.getElementById('speel').onclick = speel;
  document.getElementById('terug').onclick = () => { stopSpelen(); i = Math.max(0, i - 1); teken(); };
  document.getElementById('verder').onclick = () => { stopSpelen(); i = Math.min(stappen.length - 1, i + 1); teken(); };
  bijVerlaten(() => { stopSpelen(); });

  if (!trainer) { teken(); return; }

  // ---------- Bewaren ----------
  let timer = null;
  const bewaar = () => {
    clearTimeout(timer);
    document.getElementById('bewaard').textContent = 'Opslaan…';
    timer = setTimeout(async () => {
      try {
        await q(sb.from('systemen').update({
          naam: document.getElementById('naam').value.trim() || 'Naamloos systeem',
          beschrijving: document.getElementById('beschrijving').value.trim() || null,
          stappen, bijgewerkt: new Date().toISOString(),
        }).eq('id', id));
        document.getElementById('bewaard').textContent = '✓ Opgeslagen';
      } catch (err) { document.getElementById('bewaard').textContent = ''; melding(err.message, 'fout'); }
    }, 600);
  };
  bijVerlaten(() => clearTimeout(timer));

  // ---------- Slepen van spelers (muis en vinger) ----------
  let sleep = null;
  const svgPunt = e => {
    const svg = document.querySelector('#bord svg');
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return { x: Math.round(Math.max(6, Math.min(194, p.x))), y: Math.round(Math.max(6, Math.min(194, p.y))) };
  };
  const bord = document.getElementById('bord');
  bord.addEventListener('pointerdown', e => {
    const g = e.target.closest('.pb-speler');
    if (!g) { gekozen = null; teken(); return; }
    stopSpelen();
    sleep = { speler: g.dataset.speler, x: e.clientX, y: e.clientY, bewogen: false };
    bord.setPointerCapture(e.pointerId);
  });
  bord.addEventListener('pointermove', e => {
    if (!sleep) return;
    if (!sleep.bewogen && Math.hypot(e.clientX - sleep.x, e.clientY - sleep.y) < 5) return;
    sleep.bewogen = true;
    e.preventDefault();
    stappen[i].spelers[sleep.speler] = svgPunt(e);
    gekozen = sleep.speler;
    teken();
  });
  bord.addEventListener('pointerup', () => {
    if (!sleep) return;
    const s = sleep; sleep = null;
    if (s.bewogen) bewaar();
    else { gekozen = gekozen === s.speler ? null : s.speler; teken(); }
  });

  // ---------- Knoppen ----------
  document.getElementById('bal').onclick = () => {
    if (!gekozen) return melding('Tik eerst een speler aan op het veld.', 'fout');
    stappen[i].bal = gekozen; teken(); bewaar();
  };
  document.getElementById('plus').onclick = () => {
    stappen.splice(i + 1, 0, volgendeStap(stappen[i])); i++; gekozen = null; teken(); bewaar();
  };
  document.getElementById('weg').onclick = () => {
    if (stappen.length <= 1 || !confirm(`Stap ${i + 1} verwijderen?`)) return;
    stappen.splice(i, 1); i = Math.max(0, i - 1); teken(); bewaar();
  };
  document.getElementById('stapTekst').oninput = e => { stappen[i].tekst = e.target.value; bewaar(); };
  document.getElementById('naam').oninput = bewaar;
  document.getElementById('beschrijving').oninput = bewaar;
  document.getElementById('verwijder').onclick = async () => {
    if (!confirm(`Systeem "${systeem.naam}" verwijderen?`)) return;
    try { await q(sb.from('systemen').delete().eq('id', id)); location.hash = '#/playbook'; }
    catch (err) { melding(err.message, 'fout'); }
  };
  teken();
}

export { NAMEN };
