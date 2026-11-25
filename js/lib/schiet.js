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

// Doelmanrapport: rijen per (datum, schutter) uit de database -> per dag opgeteld over alle schutters.
// Reddingspercentage = gestopt / schoten op doel (goal + redding); missers tellen niet mee.
export function groepeerDoelmanRapport(rijen) {
  const per = new Map();
  for (const r of rijen) {
    const d = per.get(r.datum) || { datum: r.datum, schoten: 0, goals: 0, reddingen: 0, mis: 0, schutters: [] };
    d.schoten += r.schoten; d.goals += r.goals; d.reddingen += r.reddingen; d.mis += r.mis;
    d.schutters.push({ schutter: r.schutter, schoten: r.schoten, goals: r.goals, reddingen: r.reddingen, mis: r.mis });
    per.set(r.datum, d);
  }
  return [...per.values()]
    .map(d => {
      const opDoel = d.goals + d.reddingen;
      return { datum: d.datum, schoten: d.schoten, goals: d.goals, reddingen: d.reddingen, mis: d.mis, opDoel,
        pct: opDoel ? Math.round((100 * d.reddingen) / opDoel) : null, schutters: d.schutters };
    })
    .sort((a, b) => b.datum.localeCompare(a.datum));
}
