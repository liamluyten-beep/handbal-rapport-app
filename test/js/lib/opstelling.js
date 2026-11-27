// Opstelling: 7 posities op het veld + bank (zonder DOM, testbaar)

// positie = naam zoals bij de speler (Gegevens / Mijn posities); x/y in procent op een half veld (doel van de tegenstander bovenaan, onze doelman onderaan)
export const VELD7 = [
  { code: 'DM', naam: 'Doelman', kort: 'Doelman', positie: 'Doelman', x: 50, y: 90 },
  { code: 'LH', naam: 'Linkerhoek', kort: 'Hoek L', positie: 'Linkerhoek', x: 9, y: 14 },
  { code: 'LO', naam: 'Linkeropbouw', kort: 'Opbouw L', positie: 'Linkeropbouw', x: 22, y: 47 },
  { code: 'MO', naam: 'Spelverdeler', kort: 'Midden', positie: 'Spelverdeler', x: 50, y: 66 },
  { code: 'RO', naam: 'Rechteropbouw', kort: 'Opbouw R', positie: 'Rechteropbouw', x: 78, y: 47 },
  { code: 'RH', naam: 'Rechterhoek', kort: 'Hoek R', positie: 'Rechterhoek', x: 91, y: 14 },
  { code: 'CIR', naam: 'Cirkel', kort: 'Cirkel', positie: 'Cirkelloper', x: 50, y: 25 },
];

export const legeOpstelling = () => ({ posities: Object.fromEntries(VELD7.map(p => [p.code, null])), bank: [] });

const aangevuld = o => ({ posities: { ...legeOpstelling().posities, ...(o?.posities || {}) }, bank: [...(o?.bank || [])] });

export function haalWeg(opstelling, speler) {
  const o = aangevuld(opstelling);
  for (const k of Object.keys(o.posities)) if (o.posities[k] === speler) o.posities[k] = null;
  o.bank = o.bank.filter(s => s !== speler);
  return o;
}

// doel: een positiecode of 'bank'. Wie al op die positie stond, schuift naar de bank.
export function plaats(opstelling, speler, doel) {
  const o = haalWeg(opstelling, speler);
  if (doel === 'bank') { o.bank.push(speler); return o; }
  const vorige = o.posities[doel];
  if (vorige && vorige !== speler) o.bank.push(vorige);
  o.posities[doel] = speler;
  return o;
}

export function waarStaat(opstelling, speler) {
  const o = aangevuld(opstelling);
  const pos = Object.keys(o.posities).find(k => o.posities[k] === speler);
  return pos ?? (o.bank.includes(speler) ? 'bank' : null);
}

export const ingedeeld = opstelling => {
  const o = aangevuld(opstelling);
  return new Set([...Object.values(o.posities).filter(Boolean), ...o.bank]);
};

export function telling(opstelling) {
  const o = aangevuld(opstelling);
  const basis = Object.values(o.posities).filter(Boolean).length;
  return { basis, bank: o.bank.length, totaal: basis + o.bank.length };
}
