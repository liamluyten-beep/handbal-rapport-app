// Trainer: trainingen en aanwezigheden per speler.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, vandaag } from '../ui.js';
import { formatDatum } from '../lib/voortgang.js';
import { STATUSSEN, volgendeStatus, aanwezigheidStats } from '../lib/aanwezig.js';
import { doelmanStats } from '../lib/schiet.js';

const NIET_KLAAR = /trainingen|aanwezigheden|schema cache/i;
const nietKlaar = err => (NIET_KLAAR.test(err.message) ? new Error('Voer eerst supabase/update-9-balverlies-training.sql uit in Supabase.') : err);

// Maakt de training van een datum aan (als ze nog niet bestaat) en opent ze
export async function openTraining(datum = vandaag()) {
  const bestaand = await q(sb.from('trainingen').select('id').eq('datum', datum).maybeSingle()).catch(e => { throw nietKlaar(e); });
  const id = bestaand?.id ?? (await q(sb.from('trainingen').insert({ datum }).select('id').single())).id;
  location.hash = `#/training/${id}`;
}

export async function trainingenView() {
  laden();
  const [trainingen, spelers, schoten] = await Promise.all([
    q(sb.from('trainingen').select('*, aanwezigheden(player_id, status)').order('datum', { ascending: false })).catch(e => { throw nietKlaar(e); }),
    q(sb.from('players').select('id, naam, rugnummer').order('naam')),
    q(sb.from('training_schoten').select('player_id, doelman_id, resultaat')).catch(() => []),
  ]);
  const alle = trainingen.flatMap(t => t.aanwezigheden);
  const perSpeler = spelers.map(s => ({ s, st: aanwezigheidStats(alle.filter(a => a.player_id === s.id)) }))
    .sort((a, b) => (a.st.pct ?? 101) - (b.st.pct ?? 101));

  toon(`<div class="paginakop"><div><h1>Trainingen</h1><p class="zacht">${trainingen.length} trainingen genoteerd</p></div>
      <div class="rij"><input type="date" id="andereDatum" value="${vandaag()}" style="width:auto">
        <button class="knop tweede" id="openDatum">Openen</button>
        <button class="knop" id="vandaag">+ Training van vandaag</button></div></div>
    <div class="raster">
      <section class="kaart"><h3>Trainingen</h3>
        ${trainingen.length ? `<table class="tabel"><thead><tr><th>Datum</th><th>Aanwezig</th><th>Verwittigd</th><th>Afwezig</th></tr></thead><tbody>
          ${trainingen.map(t => { const st = aanwezigheidStats(t.aanwezigheden); return `<tr>
            <td><a href="#/training/${t.id}">${formatDatum(t.datum)}</a>${t.notitie ? ` <small class="zacht">${esc(t.notitie)}</small>` : ''}</td>
            <td>${st.aanwezig}</td><td>${st.verwittigd || ''}</td><td>${st.afwezig || ''}</td></tr>`; }).join('')}
        </tbody></table>` : '<p class="leeg">Nog geen trainingen. Klik op "Training van vandaag".</p>'}
      </section>
      <section class="kaart"><h3>Per speler</h3>
        ${perSpeler.map(({ s, st }) => `<div class="pos-rij">
          <span><a href="#/speler/${s.id}">${esc(s.naam)}</a></span>
          <div class="pos-balk"><span class="pb-goal" style="width:${st.pct ?? 0}%"></span></div>
          <b>${st.pct == null ? '–' : st.pct + '%'}</b><small class="zacht">${st.aanwezig}/${st.totaal}</small></div>`).join('')}
        <p class="zacht" style="font-size:.85rem">Wie het minst aanwezig was, staat bovenaan.</p>
      </section>
    </div>
    ${schietOverzicht(schoten, spelers)}`);

  document.getElementById('vandaag').onclick = () => openTraining().catch(e => melding(e.message, 'fout'));
  document.getElementById('openDatum').onclick = () =>
    openTraining(document.getElementById('andereDatum').value || vandaag()).catch(e => melding(e.message, 'fout'));
}

export async function trainingView(id) {
  laden();
  const [training, spelers, rijen] = await Promise.all([
    q(sb.from('trainingen').select('*').eq('id', id).maybeSingle()).catch(e => { throw nietKlaar(e); }),
    q(sb.from('players').select('id, naam, rugnummer').order('rugnummer', { nullsFirst: false }).order('naam')),
    q(sb.from('aanwezigheden').select('player_id, status').eq('training_id', id)),
  ]);
  if (!training) throw new Error('Deze training bestaat niet (meer).');
  const status = Object.fromEntries(rijen.map(r => [r.player_id, r.status]));

  toon(`<a class="terug" href="#/trainingen">← Trainingen</a>
    <div class="paginakop"><div><h1>Training ${formatDatum(training.datum)}</h1>
      <p class="zacht">Tik op een speler: <b>✓ aanwezig</b> → <b>V verwittigd</b> → <b>✗ afwezig</b> → leeg.</p></div>
      <div class="rij"><button class="knop" id="iedereen">Iedereen aanwezig</button></div></div>
    <section class="kaart">
      <div id="telling" class="zacht" style="margin-bottom:.8rem"></div>
      <div class="aanwezig-tegels">${spelers.map(s => `
        <button class="aanwezig-tegel" data-id="${s.id}"><span class="aw-nr">${esc(s.rugnummer ?? '?')}</span>
          <span class="aw-naam">${esc(s.naam)}</span><span class="aw-status"></span></button>`).join('')}</div>
    </section>
    <section class="kaart">
      <label>Notitie (optioneel)<input id="notitie" value="${esc(training.notitie)}" placeholder="Bv. focus op tegenaanval"></label>
      <div class="rij tussen" style="margin-top:1rem"><span class="zacht" id="opgeslagen"></span>
        <button class="knop gevaar" id="verwijder">Training verwijderen</button></div>
    </section>`);

  function teken() {
    document.querySelectorAll('.aanwezig-tegel').forEach(b => {
      const st = status[b.dataset.id] || null;
      b.dataset.status = st || '';
      b.querySelector('.aw-status').textContent = st ? `${STATUSSEN[st].kort} ${STATUSSEN[st].naam}` : '';
    });
    const st = aanwezigheidStats(Object.values(status).map(s => ({ status: s })));
    document.getElementById('telling').textContent =
      `${st.aanwezig} aanwezig · ${st.verwittigd} verwittigd · ${st.afwezig} afwezig · ${spelers.length - st.totaal} nog niet aangeduid`;
  }

  async function zet(playerId, nieuw) {
    const oud = status[playerId] || null;
    if (nieuw) status[playerId] = nieuw; else delete status[playerId];
    teken();
    try {
      if (nieuw) await q(sb.from('aanwezigheden').upsert({ training_id: id, player_id: playerId, status: nieuw }, { onConflict: 'training_id,player_id' }));
      else await q(sb.from('aanwezigheden').delete().eq('training_id', id).eq('player_id', playerId));
      document.getElementById('opgeslagen').textContent = '✓ Opgeslagen';
    } catch (err) {
      if (oud) status[playerId] = oud; else delete status[playerId];
      teken(); melding(err.message, 'fout');
    }
  }

  document.querySelectorAll('.aanwezig-tegel').forEach(b => b.onclick = () => zet(b.dataset.id, volgendeStatus(status[b.dataset.id])));
  document.getElementById('iedereen').onclick = async () => {
    const leeg = spelers.filter(s => !status[s.id]);
    if (!leeg.length) return melding('Iedereen is al aangeduid.');
    leeg.forEach(s => { status[s.id] = 'aanwezig'; });
    teken();
    try {
      await q(sb.from('aanwezigheden').upsert(leeg.map(s => ({ training_id: id, player_id: s.id, status: 'aanwezig' })), { onConflict: 'training_id,player_id' }));
      melding(`${leeg.length} spelers op aanwezig gezet. Tik nu wie er niet was.`);
    } catch (err) { melding(err.message, 'fout'); trainingView(id); }
  };
  document.getElementById('notitie').onchange = async e => {
    try { await q(sb.from('trainingen').update({ notitie: e.target.value.trim() || null }).eq('id', id)); document.getElementById('opgeslagen').textContent = '✓ Notitie opgeslagen'; }
    catch (err) { melding(err.message, 'fout'); }
  };
  document.getElementById('verwijder').onclick = async () => {
    if (!confirm('Deze training en de aanwezigheden verwijderen?')) return;
    try { await q(sb.from('trainingen').delete().eq('id', id)); location.hash = '#/trainingen'; }
    catch (err) { melding(err.message, 'fout'); }
  };
  teken();
}

// Ploegoverzicht van de schiettraining: trefzekerheid per speler en reddingen per doelman
function schietOverzicht(schoten, spelers) {
  if (!schoten.length) return '';
  const naam = id => spelers.find(s => s.id === id)?.naam ?? 'andere doelman';
  const perSpeler = spelers.map(s => {
    const eigen = schoten.filter(r => r.player_id === s.id);
    const goals = eigen.filter(r => r.resultaat === 'goal').length;
    return { s, n: eigen.length, goals, pct: eigen.length ? Math.round(100 * goals / eigen.length) : null };
  }).filter(x => x.n).sort((a, b) => b.pct - a.pct);
  const keepers = doelmanStats(schoten).filter(d => d.opDoel);
  return `<div class="raster">
    <section class="kaart"><h3>Schiettraining: trefzekerheid</h3>
      ${perSpeler.map(x => `<div class="pos-rij"><span><a href="#/speler/${x.s.id}">${esc(x.s.naam)}</a></span>
        <div class="pos-balk"><span class="pb-goal" style="width:${x.pct}%"></span></div>
        <b>${x.pct}%</b><small class="zacht">${x.goals}/${x.n}</small></div>`).join('')}
    </section>
    <section class="kaart"><h3>Schiettraining: doelmannen</h3>
      ${keepers.length ? keepers.map(d => `<div class="pos-rij"><span>${esc(naam(d.doelman_id))}</span>
        <div class="pos-balk"><span class="pb-goal" style="width:${d.pct}%;background:var(--goed)"></span></div>
        <b>${d.pct}%</b><small class="zacht">${d.gestopt}/${d.opDoel}</small></div>`).join('') : '<p class="zacht">Nog geen schoten op een doelman.</p>'}
      <p class="zacht" style="font-size:.85rem">Percentage gestopt van de schoten op doel.</p>
    </section>
  </div>`;
}
