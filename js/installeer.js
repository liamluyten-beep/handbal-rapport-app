// De site als app op je gsm zetten: blokje op de startpagina + uitlegpagina (#/app, ook via "Meer").
import { toon } from './ui.js';

const WEG = 'installeerWeg';
const ZEVEN_DAGEN = 7 * 24 * 3600 * 1000;

export const alsApp = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ua = navigator.userAgent;
const browser = () => (/iphone|ipad|ipod/i.test(ua) ? 'ios' : /SamsungBrowser/i.test(ua) ? 'samsung' : /android/i.test(ua) ? 'android' : 'computer');

function uitlegHtml() {
  if (window.__installeer) return '<button class="knop" id="installeer">📲 Installeer de app</button>';
  return {
    ios: '<p style="margin:0">Tik onderaan in Safari op <b>Deel</b> ⬆️ en kies <b>Zet op beginscherm</b>. (Werkt enkel in Safari, niet in Chrome op iPhone.)</p>',
    samsung: '<p style="margin:0">Tik onderaan op <b>☰</b> en kies <b>Pagina toevoegen aan</b> → <b>Startscherm</b>.</p>',
    android: '<p style="margin:0">Tik rechtsboven op <b>⋮</b> en kies <b>App installeren</b> of <b>Toevoegen aan startscherm</b>.</p>',
    computer: '<p style="margin:0">Open deze site op je gsm. In Chrome op de computer kan het ook: klik in de adresbalk op het installatie-icoon.</p>',
  }[browser()];
}

function koppelKnop(naInstallatie) {
  const knop = document.getElementById('installeer');
  if (!knop) return;
  knop.onclick = async () => {
    const p = window.__installeer;
    if (!p) return;
    window.__installeer = null;
    await p.prompt();
    const { outcome } = await p.userChoice;
    if (outcome === 'accepted') naInstallatie();
  };
}

// ---------- Blokje op de startpagina (✕ verbergt het 7 dagen) ----------
export function installeerHtml() {
  const weg = Number(localStorage.getItem(WEG)) || 0;
  if (alsApp() || Date.now() - weg < ZEVEN_DAGEN) return '';
  return `<section class="kaart installeer" id="installeerKaart">
    <div class="rij tussen"><b>📲 Zet de app op je gsm</b><button class="knop-link zacht" id="installeerWeg" aria-label="Verbergen">✕</button></div>
    <p class="zacht" style="margin:.3rem 0 .7rem">Dan open je ze met één tik, schermvullend, met het clublogo als icoon.
      Weggeklikt? Je vindt dit altijd terug via <b>Meer → App installeren</b>.</p>
    ${uitlegHtml()}
  </section>`;
}

export function koppelInstalleer() {
  const kaart = document.getElementById('installeerKaart');
  if (!kaart) return;
  document.getElementById('installeerWeg').onclick = () => { localStorage.setItem(WEG, String(Date.now())); kaart.remove(); };
  koppelKnop(() => kaart.remove());
}

// ---------- Uitlegpagina ----------
export function installeerView() {
  const naam = { ios: 'iPhone (Safari)', samsung: 'Samsung Internet', android: 'Android (Chrome)', computer: 'computer' }[browser()];
  toon(`<section class="kaart smal">
    <h1>App installeren</h1>
    ${alsApp() ? '<p>✅ Je gebruikt de app al. Je vindt het icoon <b>Uilenspiegel</b> bij je apps.</p>' : `
      <p class="zacht">Eerst even kijken: staat het icoon <b>Uilenspiegel</b> al bij je apps? Veeg op je startscherm naar boven en zoek "Uilenspiegel".</p>
      <h3>Zo zet je ze erop <span class="zacht">(${naam})</span></h3>
      ${uitlegHtml()}
      <details class="ouder" style="margin-top:1rem"><summary>Ander toestel of andere browser?</summary>
        <p><b>Android, Chrome:</b> ⋮ rechtsboven → App installeren / Toevoegen aan startscherm.</p>
        <p><b>Samsung Internet:</b> ☰ onderaan → Pagina toevoegen aan → Startscherm.</p>
        <p><b>iPhone:</b> open de site in <b>Safari</b> → Deel ⬆️ → Zet op beginscherm.</p>
      </details>`}
    <p style="margin-top:1rem"><a href="#/">← Terug naar home</a></p>
  </section>`);
  koppelKnop(() => installeerView());
}
