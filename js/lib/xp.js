// XP en levels (zonder DOM, testbaar). XP wordt telkens berekend uit schoten, aanwezigheden en zelfevaluaties.

export const XP = { goal: 5, opPlek: 5, training: 5, zelfevaluatie: 10, maxSchietenPerDag: 100 };

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

// schoten: training_schoten (datum, resultaat, doelzone, uitdaging_zone), aanwezig: {status}, zelf: {datum}
export function berekenXP({ schoten = [], aanwezig = [], zelf = [] }) {
  const perDag = new Map();
  for (const s of schoten) perDag.set(s.datum, (perDag.get(s.datum) || 0) + xpVoorSchot(s));
  const schieten = [...perDag.values()].reduce((t, x) => t + Math.min(XP.maxSchietenPerDag, x), 0);
  const training = aanwezig.filter(a => a.status === 'aanwezig').length * XP.training;
  const maanden = new Set(zelf.map(z => String(z.datum).slice(0, 7)));
  const zelfevaluatie = maanden.size * XP.zelfevaluatie;
  const goals = schoten.filter(s => s.resultaat === 'goal').length;
  const opPlek = schoten.filter(s => s.resultaat === 'goal' && s.uitdaging_zone && s.doelzone === s.uitdaging_zone).length;
  return { totaal: schieten + training + zelfevaluatie, bronnen: { schieten, training, zelfevaluatie }, goals, opPlek };
}

// Level 2 bij 100 XP; elk volgend level vraagt 50 XP meer (100, 150, 200, …)
export function levelVan(xp) {
  let level = 1, drempel = 0, stap = 100;
  while (xp >= drempel + stap) { drempel += stap; level++; stap += 50; }
  const inLevel = xp - drempel;
  return { level, inLevel, nodig: stap, pct: Math.round((100 * inLevel) / stap) };
}
