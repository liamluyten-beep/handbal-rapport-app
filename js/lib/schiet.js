// Schiettraining: rekenregels (zonder DOM, testbaar)

// Trainingsschoten hebben geen "soort"; zo kunnen ze door schotStats (live.js)
export const alsSchoten = rijen => rijen.map(r => ({ ...r, soort: 'schot' }));

// Per doelman: hoeveel schoten op doel (goal + redding) en hoeveel gestopt. Missers tellen niet mee.
export function doelmanStats(rijen) {
  const per = new Map();
  for (const r of rijen) {
    const k = r.doelman_id ?? null;
    const d = per.get(k) || { doelman_id: k, opDoel: 0, gestopt: 0, tegen: 0, pct: null };
    if (r.resultaat === 'goal') { d.opDoel++; d.tegen++; }
    if (r.resultaat === 'redding') { d.opDoel++; d.gestopt++; }
    per.set(k, d);
  }
  return [...per.values()]
    .map(d => ({ ...d, pct: d.opDoel ? Math.round((100 * d.gestopt) / d.opDoel) : null }))
    .sort((a, b) => (a.doelman_id === null) - (b.doelman_id === null) || b.opDoel - a.opDoel);
}
