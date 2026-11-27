// Gekozen seizoen (bewaard op dit toestel) + de keuzelijst bovenaan.
import { sb } from './supabase.js';
import { vandaag } from './ui.js';
import { ALLE, seizoenVan, inSeizoen } from './lib/seizoen.js';

const SLEUTEL = 'seizoen';

export const gekozenSeizoen = () => localStorage.getItem(SLEUTEL) || seizoenVan(vandaag());
export const kiesSeizoen = s => localStorage.setItem(SLEUTEL, s);

// Lijst filteren op het gekozen seizoen; datumVan haalt de datum uit een rij
export const opSeizoen = (lijst, datumVan) => {
  const s = gekozenSeizoen();
  return s === ALLE ? lijst : (lijst || []).filter(r => inSeizoen(datumVan(r), s));
};

// Alle seizoenen vanaf de oudste wedstrijd of het oudste rapport tot nu
export async function beschikbareSeizoenen() {
  const oudste = async tabel => (await sb.from(tabel).select('datum').order('datum').limit(1)).data?.[0]?.datum;
  const datums = (await Promise.all(['matches', 'reports'].map(t => oudste(t).catch(() => null)))).filter(Boolean);
  const nu = Number(seizoenVan(vandaag()).slice(0, 4));
  const van = Math.min(nu, ...datums.map(d => Number(seizoenVan(d).slice(0, 4))));
  const lijst = [];
  for (let j = nu; j >= van; j--) lijst.push(`${j}-${String((j + 1) % 100).padStart(2, '0')}`);
  return lijst;
}

export async function seizoenKeuzeHtml() {
  const lijst = await beschikbareSeizoenen().catch(() => [seizoenVan(vandaag())]);
  const huidig = gekozenSeizoen();
  if (huidig !== ALLE && !lijst.includes(huidig)) lijst.unshift(huidig);
  return `<select id="seizoenKeuze" class="seizoen-keuze" aria-label="Seizoen">
    ${lijst.map(s => `<option value="${s}" ${s === huidig ? 'selected' : ''}>Seizoen ${s}</option>`).join('')}
    <option value="${ALLE}" ${huidig === ALLE ? 'selected' : ''}>Alle seizoenen</option>
  </select>`;
}
