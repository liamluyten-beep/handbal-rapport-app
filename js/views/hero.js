// Banner bovenaan de startpagina: ploegfoto met de lijnen van het handbalveld, ploegnaam en balans van het seizoen.
import { sb, q } from '../supabase.js';
import { esc, melding } from '../ui.js';
import { PLOEGNAAM } from '../config.js';
import { ploegFotoUrl, uploadPloegFoto } from '../foto.js';
import { gekozenSeizoen, opSeizoen } from '../seizoen-keuze.js';

// 6-meterlijn (volle lijn) en 9-meterlijn (stippellijn) rond het doel, zoals op de vloer van de sporthal
const VELDLIJNEN = `<svg class="veldlijnen" viewBox="0 0 400 150" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
  <path d="M150 0 h100" class="doel"/>
  <path d="M80 0 A70 70 0 0 0 150 70 L250 70 A70 70 0 0 0 320 0"/>
  <path d="M35 0 A115 115 0 0 0 150 112 L250 112 A115 115 0 0 0 365 0" class="stippel"/>
  <path d="M196 92 h8" class="zeven"/>
</svg>`;

export async function heroHtml({ groet, trainer = false }) {
  const [foto, matchen] = await Promise.all([
    ploegFotoUrl(),
    q(sb.from('matches').select('datum, score_voor, score_tegen').not('score_voor', 'is', null)).catch(() => []),
  ]);
  const gespeeld = opSeizoen(matchen, m => m.datum);
  const w = gespeeld.filter(m => m.score_voor > m.score_tegen).length;
  const g = gespeeld.filter(m => m.score_voor === m.score_tegen).length;
  const v = gespeeld.filter(m => m.score_voor < m.score_tegen).length;
  const seizoen = gekozenSeizoen() === 'alle' ? 'Alle seizoenen' : `Seizoen ${gekozenSeizoen()}`;

  return `<section class="held ${foto ? 'met-foto' : ''}" ${foto ? `style="--ploegfoto:url('${esc(foto)}')"` : ''}>
    ${VELDLIJNEN}
    <p class="held-groet">${groet}</p>
    <div class="held-tekst">
      <h1>${esc(PLOEGNAAM)}</h1>
      <p class="held-seizoen">${seizoen}</p>
      ${gespeeld.length ? `<p class="balans"><span><b>${w}</b> gewonnen</span><span><b>${g}</b> gelijk</span><span><b>${v}</b> verloren</span></p>` : ''}
    </div>
    ${trainer ? `<button class="held-foto-knop" id="ploegFotoKies">${foto ? 'Ploegfoto wijzigen' : 'Ploegfoto toevoegen'}</button>
      <input type="file" id="ploegFotoBestand" accept="image/*" hidden>` : ''}
  </section>`;
}

export function koppelHero(herlaad) {
  const knop = document.getElementById('ploegFotoKies');
  const bestand = document.getElementById('ploegFotoBestand');
  if (!knop || !bestand) return;
  knop.onclick = () => bestand.click();
  bestand.onchange = async () => {
    const file = bestand.files[0];
    if (!file) return;
    knop.disabled = true; knop.textContent = 'Uploaden…';
    try { await uploadPloegFoto(file); melding('Ploegfoto opgeslagen'); herlaad(); }
    catch (err) { melding(err.message, 'fout'); knop.disabled = false; knop.textContent = 'Ploegfoto toevoegen'; }
  };
}
