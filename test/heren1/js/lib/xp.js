// XP en levels (zonder DOM, testbaar). XP wordt telkens berekend uit schoten, aanwezigheden en zelfevaluaties.

export const XP = { goal: 5, opPlek: 5, training: 5, zelfevaluatie: 10, maxSchietenPerDag: 100,
  redding: 5, middenDicht: 15, dertigProcent: 20, maxKeepenPerDag: 100 };

// Middelste kolom van het doel (midden boven, midden, midden onder)
export const MIDDEN_ZONES = [2, 5, 8];

// Doelzones 1-9 gezien vanuit de schutter (zelfde nummering als het doelraster)
export const ZONE_NAMEN = ['linksboven', 'midden boven', 'rechtsboven', 'links halfhoog', 'midden', 'rechts halfhoog', 'linksonder', 'midden onder', 'rechtsonder'];
export const ZONE_PIJL = ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'];

// Uitdaging: willekeurige zone, de hoeken 3 keer zo vaak
const GEWICHT = [3, 1, 3, 1, 1, 1, 3, 1, 3];
export function kiesUitdaging(rnd = Math.random) {
  let r = rnd() * GEWICHT.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 9; i++) { r -= GEWICHT[i]; if (r < 0) return i + 1; }
  return 9;
}

export function xpVoorSchot(s) {
  if (s.resultaat !== 'goal') return 0;
  return XP.goal + (s.uitdaging_zone && s.doelzone === s.uitdaging_zone ? XP.opPlek : 0);
}

// Keeper-XP per trainingsdag, uit de schoten op deze doelman (tegen)
export function berekenKeeperXP(tegen = []) {
  const perDag = new Map();
  for (const s of tegen) { if (!perDag.has(s.datum)) perDag.set(s.datum, []); perDag.get(s.datum).push(s); }
  let keepen = 0, reddingen = 0, middenDicht = 0, dertigProcent = 0;
  for (const dag of perDag.values()) {
    const gestopt = dag.filter(s => s.resultaat === 'redding').length;
    const opDoel = gestopt + dag.filter(s => s.resultaat === 'goal').length;
    const midden = dag.filter(s => s.resultaat !== 'mis' && MIDDEN_ZONES.includes(s.doelzone));
    const dicht = midden.length >= 3 && midden.every(s => s.resultaat === 'redding');
    const dertig = opDoel >= 10 && gestopt / opDoel >= 0.3;
    reddingen += gestopt; middenDicht += dicht ? 1 : 0; dertigProcent += dertig ? 1 : 0;
    keepen += Math.min(XP.maxKeepenPerDag, gestopt * XP.redding + (dicht ? XP.middenDicht : 0) + (dertig ? XP.dertigProcent : 0));
  }
  return { keepen, reddingen, middenDicht, dertigProcent };
}

// schoten: training_schoten (datum, resultaat, doelzone, uitdaging_zone), aanwezig: {status}, zelf: {datum}
// tegen: schoten op deze speler als doelman
export function berekenXP({ schoten = [], aanwezig = [], zelf = [], tegen = [] }) {
  const perDag = new Map();
  for (const s of schoten) perDag.set(s.datum, (perDag.get(s.datum) || 0) + xpVoorSchot(s));
  const schieten = [...perDag.values()].reduce((t, x) => t + Math.min(XP.maxSchietenPerDag, x), 0);
  const training = aanwezig.filter(a => a.status === 'aanwezig').length * XP.training;
  const maanden = new Set(zelf.map(z => String(z.datum).slice(0, 7)));
  const zelfevaluatie = maanden.size * XP.zelfevaluatie;
  const goals = schoten.filter(s => s.resultaat === 'goal').length;
  const opPlek = schoten.filter(s => s.resultaat === 'goal' && s.uitdaging_zone && s.doelzone === s.uitdaging_zone).length;
  const k = berekenKeeperXP(tegen);
  return { totaal: schieten + training + zelfevaluatie + k.keepen, bronnen: { schieten, training, zelfevaluatie, keepen: k.keepen }, goals, opPlek, keeper: k };
}

// Level 2 bij 100 XP; elk volgend level vraagt 50 XP meer (100, 150, 200, …)
export function levelVan(xp) {
  let level = 1, drempel = 0, stap = 100;
  while (xp >= drempel + stap) { drempel += stap; level++; stap += 50; }
  const inLevel = xp - drempel;
  return { level, inLevel, nodig: stap, pct: Math.round((100 * inLevel) / stap) };
}
