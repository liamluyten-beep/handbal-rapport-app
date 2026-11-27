// Seizoenen: een handbalseizoen loopt van 1 augustus tot 31 juli (bv. "2026-27").

export const ALLE = 'alle';
const START_MAAND = 8; // augustus

export function seizoenVan(datum) {
  const [j, m] = String(datum).slice(0, 10).split('-').map(Number);
  const start = m >= START_MAAND ? j : j - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function seizoenGrenzen(seizoen) {
  const start = Number(seizoen.slice(0, 4));
  return { van: `${start}-08-01`, tot: `${start + 1}-07-31` };
}

export function inSeizoen(datum, seizoen) {
  if (seizoen === ALLE) return true;
  if (!datum) return false;
  return seizoenVan(datum) === seizoen;
}

// Alle seizoenen waarin iets gebeurde, plus het huidige; nieuwste eerst
export function seizoenenLijst(datums, vandaag) {
  return [...new Set([seizoenVan(vandaag), ...datums.filter(Boolean).map(seizoenVan)])].sort().reverse();
}
