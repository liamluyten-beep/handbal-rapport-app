// Matchvoorbereiding: opstelling op een handbalveld. Slepen (muis én vinger) of tikken: speler -> positie.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, vandaag, bijVerlaten } from '../ui.js';
import { sessie } from '../app.js';
import { formatDatum } from '../lib/voortgang.js';
import { VELD7, legeOpstelling, plaats, haalWeg, ingedeeld, telling } from '../lib/opstelling.js';
import { leesPosities } from '../lib/posities.js';
import { laadKalender, maakMatchVoor } from '../kalender-data.js';
import { compTag } from '../comp-tag.js';

const VELD_SVG = `<svg class="veld-tekening" viewBox="0 0 200 220" preserveAspectRatio="none" aria-hidden="true">
  <rect x="1" y="1" width="198" height="218" rx="4"/>
  <path d="M85 1 h30" class="doel"/>
  <path d="M30 1 A40 40 0 0 0 70 41 L130 41 A40 40 0 0 0 170 1"/>
  <path d="M5 1 A65 65 0 0 0 70 66 L130 66 A65 65 0 0 0 195 1" class="stippel"/>
  <path d="M96 52 h8"/>
  <path d="M1 219 h198" class="middenlijn"/>
</svg>`;

const kortNaam = n => esc(n.split(' ')[0]);
const chip = (s, extra = '') => `<span class="sp-chip ${extra}" data-speler="${s.id}">
  <b>${esc(s.rugnummer ?? '?')}</b><span>${kortNaam(s.naam)}</span></span>`;

// ---------- Overzicht: komende matchen om voor te bereiden ----------
export async function voorbereidingView() {
  laden();
  const [items, opst] = await Promise.all([
    laadKalender({ vers: true }),
    q(sb.from('opstellingen').select('match_id, gedeeld, posities, bank')).catch(() => []),
  ]);
  const komend = items.filter(k => k.datum >= vandaag() && k.status !== 'afgelast').slice(0, 12);
  const status = id => { const o = opst.find(x => x.match_id === id); if (!o) return '<span class="label">nog leeg</span>';
    const t = telling(o); return o.gedeeld ? `<span class="label ok">gedeeld · ${t.basis}/7</span>` : `<span class="label">concept · ${t.basis}/7</span>`; };

  toon(`<div class="paginakop"><div><h1>Matchvoorbereiding</h1><p class="zacht">Kies een match en sleep je spelers op het veld.</p></div></div>
    <section class="kaart">${komend.length ? komend.map((k, i) => `<div class="kal-lijn">
        <span class="kl-datum"><b>${Number(k.datum.slice(8))}</b><small>${formatDatum(k.datum).slice(3, 5)}</small></span>
        <span class="kl-tekst"><b>${k.thuis ? 'Thuis tegen' : 'Uit bij'} ${esc(k.tegenstander)} ${compTag(k.competitie)}</b>
          <small class="zacht">${k.uur ? `om ${esc(k.uur)}` : ''} ${k.match_id ? status(k.match_id) : '<span class="label">nog leeg</span>'}</small></span>
        <button class="knop klein" data-i="${i}">Opstelling</button></div>`).join('')
      : '<p class="leeg">Geen komende matchen in de kalender.</p>'}</section>`);

  document.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { location.hash = `#/opstelling/${await maakMatchVoor(komend[Number(b.dataset.i)])}`; }
    catch (err) { melding(err.message, 'fout'); b.disabled = false; }
  });
}

// ---------- Eén opstelling ----------
export async function opstellingView(matchId) {
  if (sessie.rol !== 'trainer') return opstellingLezen(matchId);
  laden();
  const [match, spelers, bestaand] = await Promise.all([
    q(sb.from('matches').select('*').eq('id', matchId).maybeSingle()),
    q(sb.from('players').select('id, naam, rugnummer, positie').order('rugnummer', { nullsFirst: false }).order('naam')),
    q(sb.from('opstellingen').select('*').eq('match_id', matchId).maybeSingle()).catch(err => {
      throw new Error(/opstellingen|schema cache/i.test(err.message) ? 'Voer eerst supabase/update-15-opstelling.sql uit in Supabase.' : err.message);
    }),
  ]);
  if (!match) throw new Error('Deze match bestaat niet (meer).');
  let opst = bestaand ? { posities: bestaand.posities, bank: bestaand.bank } : legeOpstelling();
  let gedeeld = bestaand?.gedeeld ?? false;
  let gekozen = null;                 // speler-id die met tikken verplaatst wordt
  const speler = id => spelers.find(s => s.id === id);

  toon(`<a class="terug" href="#/voorbereiding">← Matchvoorbereiding</a>
    <div class="paginakop"><div><h1>Opstelling</h1>
      <p class="zacht">${match.thuis ? 'Thuis tegen' : 'Uit bij'} <b>${esc(match.tegenstander)}</b> ${compTag(match.competitie)} · ${formatDatum(match.datum)}</p></div>
      <div class="rij">
        <button class="knop tweede klein" id="vorige">Vorige overnemen</button>
        <button class="knop tweede klein" id="wis">Leegmaken</button>
        <label class="schakelaar"><input type="checkbox" id="deel" ${gedeeld ? 'checked' : ''}><span>Gedeeld met spelers</span></label>
      </div></div>
    <p class="zacht" id="uitleg">Sleep een speler naar een positie of naar de bank. Of tik op een speler en dan op een plek.</p>
    <div class="opst-raster">
      <section class="veld-kaart"><div class="veld7" id="veld">${VELD_SVG}
        ${VELD7.map(p => `<div class="slot" data-doel="${p.code}" style="left:${p.x}%;top:${p.y}%"></div>`).join('')}</div></section>
      <div>
        <section class="kaart compact"><h3>Bank <span class="zacht" id="bankTel"></span></h3><div class="zone" data-doel="bank" id="bank"></div></section>
        <section class="kaart compact"><h3>Ploeg</h3><div class="zone" data-doel="pool" id="pool"></div></section>
        <p class="zacht" id="bewaard"></p>
      </div>
    </div>`);

  // ---------- Tekenen ----------
  function teken() {
    const t = telling(opst);
    for (const p of VELD7) {
      const el = document.querySelector(`.slot[data-doel="${p.code}"]`);
      const s = speler(opst.posities[p.code]);
      const past = gekozen && leesPosities(speler(gekozen)?.positie).includes(p.positie);
      el.className = `slot ${s ? 'vol' : ''} ${past ? 'past' : ''} ${gekozen && s?.id === gekozen ? 'gekozen' : ''}`;
      el.innerHTML = s ? `<span class="sp-chip op-veld" data-speler="${s.id}"><b>${esc(s.rugnummer ?? '?')}</b><span>${kortNaam(s.naam)}</span></span>
        <small>${esc(p.code === 'MO' ? 'Midden' : p.naam)}</small>` : `<span class="slot-leeg">${esc(p.kort)}</span>`;
    }
    document.getElementById('bank').innerHTML = opst.bank.map(id => speler(id)).filter(Boolean)
      .map(s => chip(s, gekozen === s.id ? 'gekozen' : '')).join('') || '<span class="zacht zone-leeg">Sleep hier je wisselspelers</span>';
    const ing = ingedeeld(opst);
    document.getElementById('pool').innerHTML = spelers.filter(s => !ing.has(s.id))
      .map(s => chip(s, gekozen === s.id ? 'gekozen' : '')).join('') || '<span class="zacht zone-leeg">Iedereen is ingedeeld</span>';
    document.getElementById('bankTel').textContent = `(${t.bank}) · ${t.basis}/7 op het veld · ${t.totaal} in de selectie`;
  }

  // ---------- Bewaren (even wachten zodat snel na elkaar slepen maar één keer opslaat) ----------
  let timer = null;
  const bewaar = () => {
    clearTimeout(timer);
    document.getElementById('bewaard').textContent = 'Opslaan…';
    timer = setTimeout(async () => {
      try {
        await q(sb.from('opstellingen').upsert({ match_id: matchId, posities: opst.posities, bank: opst.bank, gedeeld, bijgewerkt: new Date().toISOString() }));
        document.getElementById('bewaard').textContent = `✓ Opgeslagen${gedeeld ? ' · de spelers zien deze opstelling' : ' · enkel jij ziet deze opstelling'}`;
      } catch (err) { document.getElementById('bewaard').textContent = ''; melding(err.message, 'fout'); }
    }, 500);
  };
  const zet = (id, doel) => {
    opst = doel === 'pool' ? haalWeg(opst, id) : plaats(opst, id, doel);
    gekozen = null; teken(); bewaar();
  };

  // ---------- Slepen met muis of vinger (pointer events) + tikken ----------
  let sleep = null;
  const doelOnder = (x, y) => document.elementsFromPoint(x, y).map(e => e.closest('[data-doel]')).find(Boolean);
  document.addEventListener('pointerdown', start);
  function start(e) {
    const c = e.target.closest('.sp-chip');
    if (!c || !document.getElementById('veld')) return;
    sleep = { id: c.dataset.speler, x: e.clientX, y: e.clientY, bezig: false, spook: null };
    c.setPointerCapture?.(e.pointerId);
  }
  function beweeg(e) {
    if (!sleep) return;
    if (!sleep.bezig && Math.hypot(e.clientX - sleep.x, e.clientY - sleep.y) < 8) return;
    if (!sleep.bezig) {
      sleep.bezig = true;
      const s = speler(sleep.id);
      sleep.spook = Object.assign(document.createElement('div'), { className: 'sp-chip spook', innerHTML: `<b>${esc(s.rugnummer ?? '?')}</b><span>${kortNaam(s.naam)}</span>` });
      document.body.appendChild(sleep.spook);
      gekozen = sleep.id; teken();
    }
    e.preventDefault();
    sleep.spook.style.left = `${e.clientX}px`; sleep.spook.style.top = `${e.clientY}px`;
    document.querySelectorAll('.hover').forEach(x => x.classList.remove('hover'));
    doelOnder(e.clientX, e.clientY)?.classList.add('hover');
  }
  function stop(e) {
    if (!sleep) return;
    const s = sleep; sleep = null;
    document.querySelectorAll('.hover').forEach(x => x.classList.remove('hover'));
    if (s.bezig) { s.spook.remove(); const d = doelOnder(e.clientX, e.clientY); if (d) zet(s.id, d.dataset.doel); else { gekozen = null; teken(); } return; }
    // Tik: is er al iemand gekozen, dan gaat die naar de plek van de aangetikte speler; anders deze speler kiezen
    const plek = document.querySelector(`.sp-chip[data-speler="${s.id}"]`)?.closest('[data-doel]');
    if (gekozen && gekozen !== s.id && plek) return zet(gekozen, plek.dataset.doel);
    gekozen = gekozen === s.id ? null : s.id;
    teken();
  }
  document.addEventListener('pointermove', beweeg, { passive: false });
  document.addEventListener('pointerup', stop);
  // Tik op een plek terwijl een speler gekozen is
  const tikPlek = e => {
    if (!gekozen || e.target.closest('.sp-chip')) return;
    const d = e.target.closest('[data-doel]');
    if (d) zet(gekozen, d.dataset.doel);
  };
  document.addEventListener('click', tikPlek);
  bijVerlaten(() => {
    document.removeEventListener('pointerdown', start); document.removeEventListener('pointermove', beweeg);
    document.removeEventListener('pointerup', stop); document.removeEventListener('click', tikPlek); clearTimeout(timer);
  });

  // ---------- Knoppen ----------
  document.getElementById('deel').onchange = e => { gedeeld = e.target.checked; bewaar(); };
  document.getElementById('wis').onclick = () => { if (confirm('Opstelling leegmaken?')) { opst = legeOpstelling(); teken(); bewaar(); } };
  document.getElementById('vorige').onclick = async () => {
    const vorig = await q(sb.from('opstellingen').select('posities, bank, matches!inner(datum)').neq('match_id', matchId)
      .lt('matches.datum', match.datum).order('bijgewerkt', { ascending: false }).limit(1)).catch(() => []);
    if (!vorig[0]) return melding('Er is nog geen vorige opstelling.', 'fout');
    const bestaatNog = new Set(spelers.map(s => s.id));
    opst = legeOpstelling();
    for (const [k, id] of Object.entries(vorig[0].posities)) if (id && bestaatNog.has(id)) opst = plaats(opst, id, k);
    for (const id of vorig[0].bank) if (bestaatNog.has(id)) opst = plaats(opst, id, 'bank');
    teken(); bewaar(); melding('Vorige opstelling overgenomen');
  };
  teken();
}

// ---------- Alleen lezen (spelers, na delen) ----------
async function opstellingLezen(matchId) {
  laden();
  const [match, data] = await Promise.all([
    q(sb.from('matches').select('*').eq('id', matchId).maybeSingle()),
    q(sb.rpc('gedeelde_opstelling', { wedstrijd: matchId })).catch(() => null),
  ]);
  if (!match || !data) {
    return toon(`<a class="terug" href="#/">← Home</a><section class="kaart leeg"><p>De trainer heeft de opstelling voor deze match nog niet gedeeld.</p></section>`);
  }
  const spelers = data.spelers || [];
  const speler = id => spelers.find(s => s.id === id);
  const mij = sessie.user ? (await q(sb.from('players').select('id').eq('user_id', sessie.user.id).maybeSingle()).catch(() => null))?.id : null;
  toon(`<a class="terug" href="#/">← Home</a>
    <div class="paginakop"><div><h1>Opstelling</h1>
      <p class="zacht">${match.thuis ? 'Thuis tegen' : 'Uit bij'} <b>${esc(match.tegenstander)}</b> ${compTag(match.competitie)} · ${formatDatum(match.datum)}</p></div></div>
    <div class="opst-raster">
      <section class="veld-kaart"><div class="veld7">${VELD_SVG}
        ${VELD7.map(p => { const s = speler(data.posities?.[p.code]); return `<div class="slot ${s ? 'vol' : ''} ${s?.id === mij ? 'ik' : ''}" style="left:${p.x}%;top:${p.y}%">
          ${s ? `<span class="sp-chip op-veld"><b>${esc(s.rugnummer ?? '?')}</b><span>${kortNaam(s.naam)}</span></span><small>${esc(p.code === 'MO' ? 'Midden' : p.naam)}</small>` : `<span class="slot-leeg">${esc(p.kort)}</span>`}</div>`; }).join('')}</div></section>
      <section class="kaart compact"><h3>Bank</h3><div class="zone">${(data.bank || []).map(id => speler(id)).filter(Boolean)
        .map(s => chip(s, s.id === mij ? 'ik' : '')).join('') || '<span class="zacht">—</span>'}</div></section>
    </div>`);
}
