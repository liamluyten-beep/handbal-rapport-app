// Kalender met alle matchen: maandoverzicht, bladeren tot een jaar vooruit, lijst van de maand eronder.
import { toon, esc, laden, vandaag } from '../ui.js';
import { sessie } from '../app.js';
import { laadKalender } from '../kalender-data.js';
import { maandRaster, MAANDEN, DAGEN } from '../lib/kalender.js';
import { compTag } from '../comp-tag.js';

const LANGE_DAG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const maandIndex = (j, m) => j * 12 + m;

export async function kalenderView() {
  laden();
  const items = await laadKalender({ vers: true });
  const nu = new Date(vandaag() + 'T12:00:00Z');
  let jaar = nu.getUTCFullYear(), maand = nu.getUTCMonth();
  const max = maandIndex(jaar, maand) + 12;                                   // tot een jaar vooruit
  const eerste = items[0] ? new Date(items[0].datum + 'T12:00:00Z') : nu;
  const min = Math.min(maandIndex(eerste.getUTCFullYear(), eerste.getUTCMonth()), maandIndex(jaar, maand) - 12);
  const trainer = sessie.rol === 'trainer';

  toon(`<div class="kalender">
    <div class="paginakop"><div><h1>Kalender</h1><p class="zacht">Alle matchen uit Clubee en de matchen die jullie zelf aanmaakten.</p></div></div>
    <section class="kaart">
      <div class="kal-kop">
        <button class="knop tweede klein" id="vorige" aria-label="Vorige maand">‹</button>
        <h2 id="maandTitel"></h2>
        <button class="knop tweede klein" id="volgende" aria-label="Volgende maand">›</button>
        <button class="knop-link" id="vandaagKnop">Vandaag</button>
      </div>
      <div class="kal-raster" id="raster"></div>
    </section>
    <section class="kaart"><h3 id="lijstTitel"></h3><div id="lijst"></div></section>
  </div>`);

  const label = k => (k.thuis ? `Thuis tegen ${k.tegenstander}` : `Uit bij ${k.tegenstander}`);
  const uitslag = k => (k.status === 'gespeeld' && k.score_voor != null
    ? `<b class="uitslag ${k.score_voor > k.score_tegen ? 'w' : k.score_voor < k.score_tegen ? 'v' : 'g'}">${k.score_voor}–${k.score_tegen}</b>` : '');
  const link = k => (trainer && k.match_id ? `#/wedstrijd/${k.match_id}` : null);

  function teken() {
    const idx = maandIndex(jaar, maand);
    document.getElementById('vorige').disabled = idx <= min;
    document.getElementById('volgende').disabled = idx >= max;
    document.getElementById('maandTitel').textContent = `${MAANDEN[maand]} ${jaar}`;
    const vandaagIso = vandaag();
    const raster = maandRaster(jaar, maand);
    document.getElementById('raster').innerHTML =
      DAGEN.map(d => `<div class="kal-dagnaam">${d}</div>`).join('') +
      raster.flat().map(c => {
        const dag = items.filter(k => k.datum === c.datum);
        return `<div class="kal-cel ${c.inMaand ? '' : 'buiten'} ${c.datum === vandaagIso ? 'vandaag' : ''} ${dag.length ? 'heeft' : ''}">
          <span class="kal-nr">${c.dag}</span>
          ${dag.map(k => `<span class="kal-match ${k.status} ${k.thuis ? 'thuis' : 'uit'}" title="${esc(label(k))}">
            <span class="km-uur">${k.status === 'gespeeld' && k.score_voor != null ? `${k.score_voor}–${k.score_tegen}` : esc(k.uur ?? '')}</span>
            <span class="km-naam">${k.competitie === 'VHV' ? '<b class="km-vhv">VHV</b> ' : ''}${esc(k.tegenstander)}</span></span>`).join('')}
        </div>`;
      }).join('');

    const vanMaand = items.filter(k => k.datum.startsWith(`${jaar}-${String(maand + 1).padStart(2, '0')}`));
    document.getElementById('lijstTitel').textContent = vanMaand.length ? `Matchen in ${MAANDEN[maand]}` : `Geen matchen in ${MAANDEN[maand]}`;
    document.getElementById('lijst').innerHTML = vanMaand.map(k => {
      const d = new Date(k.datum + 'T12:00:00Z');
      const inhoud = `<span class="kl-datum"><b>${d.getUTCDate()}</b><small>${LANGE_DAG[d.getUTCDay()].slice(0, 2)}</small></span>
        <span class="kl-tekst"><b>${esc(label(k))} ${compTag(k.competitie)}</b>
          <small class="zacht">${k.status === 'afgelast' ? 'Afgelast' : k.uur ? `om ${esc(k.uur)}` : ''}${k.status === 'gepland' && k.datum === vandaagIso ? ' · vandaag' : ''}</small></span>
        ${uitslag(k)}`;
      return link(k) ? `<a class="kal-lijn ${k.status}" href="${link(k)}">${inhoud}</a>` : `<div class="kal-lijn ${k.status}">${inhoud}</div>`;
    }).join('');
  }

  const verschuif = n => { const i = Math.max(min, Math.min(max, maandIndex(jaar, maand) + n)); jaar = Math.floor(i / 12); maand = i % 12; teken(); };
  document.getElementById('vorige').onclick = () => verschuif(-1);
  document.getElementById('volgende').onclick = () => verschuif(1);
  document.getElementById('vandaagKnop').onclick = () => { jaar = nu.getUTCFullYear(); maand = nu.getUTCMonth(); teken(); };
  teken();
}
