// Playbook: aanvalssystemen in stappen. Per stap: plaats van de 6 aanvallers + wie de bal heeft.
// Looplijnen en passen worden afgeleid uit het verschil tussen twee stappen (zonder DOM, testbaar).

export const AANVALLERS = ['LH', 'LO', 'MO', 'RO', 'RH', 'CIR'];
export const NAMEN = { LH: 'Linkerhoek', LO: 'Linkeropbouw', MO: 'Midden', RO: 'Rechteropbouw', RH: 'Rechterhoek', CIR: 'Cirkel' };

// Coördinaten in een vlak van 200 × 200: doel bovenaan in het midden (x 100, y 0)
const BEGIN = { LH: { x: 14, y: 22 }, LO: { x: 50, y: 92 }, MO: { x: 100, y: 112 }, RO: { x: 150, y: 92 }, RH: { x: 186, y: 22 }, CIR: { x: 100, y: 50 } };

export function startStap() {
  return { spelers: structuredClone(BEGIN), bal: 'MO', tekst: '' };
}

export function volgendeStap(vorige) {
  return { spelers: structuredClone(vorige.spelers), bal: vorige.bal, tekst: '' };
}

const afstand = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

export function pijlenTussen(a, b) {
  const pijlen = [];
  for (const s of AANVALLERS) {
    if (a.spelers[s] && b.spelers[s] && afstand(a.spelers[s], b.spelers[s]) >= 2) {
      pijlen.push({ soort: 'loop', speler: s, van: a.spelers[s], naar: b.spelers[s] });
    }
  }
  if (a.bal && b.bal && a.bal !== b.bal) pijlen.push({ soort: 'pas', van: a.spelers[a.bal], naar: b.spelers[b.bal] });
  return pijlen;
}

// Posities op tijdstip t (0 = stap a, 1 = stap b), voor het afspelen
export function tussenStand(a, b, t) {
  return Object.fromEntries(AANVALLERS.map(s => {
    const p = a.spelers[s], q = b.spelers[s] ?? p;
    return [s, { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }];
  }));
}
