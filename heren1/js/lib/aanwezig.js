// Aanwezigheden op training

export const STATUSSEN = {
  aanwezig: { naam: 'Aanwezig', kort: '✓' },
  verwittigd: { naam: 'Verwittigd', kort: 'V' },
  afwezig: { naam: 'Afwezig', kort: '✗' },
};

export function aanwezigheidStats(rijen) {
  const tel = s => rijen.filter(r => r.status === s).length;
  const totaal = rijen.length;
  const aanwezig = tel('aanwezig');
  return { totaal, aanwezig, verwittigd: tel('verwittigd'), afwezig: tel('afwezig'),
    pct: totaal ? Math.round((100 * aanwezig) / totaal) : null };
}

// Tikken op een speler: aanwezig -> verwittigd -> afwezig -> niets
const VOLGORDE = [null, 'aanwezig', 'verwittigd', 'afwezig'];
export const volgendeStatus = huidig => VOLGORDE[(VOLGORDE.indexOf(huidig ?? null) + 1) % VOLGORDE.length];
