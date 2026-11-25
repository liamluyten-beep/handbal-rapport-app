// Blokje op de startpagina: de site als app op je gsm zetten.
const WEG = 'installeerWeg';

const alsApp = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function installeerHtml() {
  if (alsApp() || localStorage.getItem(WEG)) return '';
  const uitleg = window.__installeer
    ? '<button class="knop" id="installeer">📲 Installeer de app</button>'
    : isIos()
      ? '<p style="margin:0">Tik onderaan in Safari op <b>Deel</b> <span aria-hidden="true">⬆️</span> en kies <b>Zet op beginscherm</b>.</p>'
      : '<p style="margin:0">Open het menu <b>⋮</b> van je browser en kies <b>App installeren</b> of <b>Toevoegen aan startscherm</b>.</p>';
  return `<section class="kaart installeer" id="installeerKaart">
    <div class="rij tussen"><b>📲 Zet de app op je gsm</b><button class="knop-link zacht" id="installeerWeg" aria-label="Verbergen">✕</button></div>
    <p class="zacht" style="margin:.3rem 0 .7rem">Dan open je ze met één tik, schermvullend, met het clublogo als icoon.</p>
    ${uitleg}
  </section>`;
}

export function koppelInstalleer() {
  const kaart = document.getElementById('installeerKaart');
  if (!kaart) return;
  document.getElementById('installeerWeg').onclick = () => { localStorage.setItem(WEG, '1'); kaart.remove(); };
  const knop = document.getElementById('installeer');
  if (knop) knop.onclick = async () => {
    const p = window.__installeer;
    window.__installeer = null;
    await p.prompt();
    const { outcome } = await p.userChoice;
    if (outcome === 'accepted') kaart.remove();
  };
}
