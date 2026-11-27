// Kleine hulpfuncties voor de weergave
import { logFout } from './logboek.js';
import { lokaleDatum } from './lib/datum.js';
import { isTechnischeFout } from './lib/logboek.js';

export const app = () => document.getElementById('app');

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Tekst met witregels behouden
export const tekstBlok = v => esc(v).replace(/\n/g, '<br>');

// Opruimen bij het verlaten van een scherm (timers, wake lock, …)
let opruimers = [];
export const bijVerlaten = fn => { opruimers.push(fn); };

export function toon(html) {
  opruimers.forEach(fn => { try { fn(); } catch { /* negeren */ } });
  opruimers = [];
  vernietigGrafieken();
  app().innerHTML = html;
}

export function melding(tekst, soort = 'ok') {
  if (soort === 'fout' && isTechnischeFout(tekst)) logFout(tekst);
  const el = document.createElement('div');
  el.className = `toast toast-${soort}`;
  el.textContent = tekst;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function laden() {
  toon('<div class="laden"><span class="bal"></span> Laden…</div>');
}

export function fout(e) {
  console.error(e);
  logFout(e.message || e);
  toon(`<section class="kaart fout"><h2>Er ging iets mis</h2><p>${esc(e.message || e)}</p>
    <a class="knop" href="#/">Terug</a></section>`);
}

// Datum volgens de klok van het toestel (België), niet in wereldtijd
export const vandaag = () => lokaleDatum();

// ---------- Grafieken (Chart.js wordt via index.html geladen) ----------
let grafieken = [];
export function vernietigGrafieken() {
  grafieken.forEach(g => g.destroy());
  grafieken = [];
}

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reeksKleuren = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];

function basisOpties() {
  const tekst = css('--tekst-zacht'), lijn = css('--lijn');
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: tekst, boxWidth: 12, usePointStyle: true } } },
    scales: {
      x: { ticks: { color: tekst }, grid: { color: lijn } },
      y: { ticks: { color: tekst }, grid: { color: lijn } },
    },
  };
}

export function lijnGrafiek(canvas, { labels, datasets }) {
  const opties = basisOpties();
  opties.scales.y.min = 1; opties.scales.y.max = 5;
  opties.scales.y.ticks.stepSize = 1;
  grafieken.push(new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d, i) => {
        const k = css(reeksKleuren[i % reeksKleuren.length]);
        return { ...d, borderColor: k, backgroundColor: k, tension: 0.3, spanGaps: true, pointRadius: 4, borderWidth: 2 };
      }),
    },
    options: opties,
  }));
}

export function staafGrafiek(canvas, { labels, data }) {
  const opties = basisOpties();
  opties.plugins.legend.display = false;
  opties.scales.y.beginAtZero = true;
  opties.scales.y.ticks.precision = 0;
  opties.scales.x.grid.display = false;
  grafieken.push(new window.Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Goals', data, backgroundColor: css('--accent'), borderRadius: 6 }] },
    options: opties,
  }));
}
