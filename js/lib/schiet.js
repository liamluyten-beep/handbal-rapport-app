// Schiettraining: rekenregels (zonder DOM, testbaar)
import { VELDPOSITIES } from './live.js';

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


const pctVan = (deel, geheel) => (geheel ? Math.round((100 * deel) / geheel) : null);

// Vanuit de doelman: schoten op hem (rijen uit training_schoten met doelman_id = hij)
export function keeperStats(rijen) {
  const tel = (lijst, r) => lijst.filter(x => x.resultaat === r).length;
  const goals = tel(rijen, 'goal'), gestopt = tel(rijen, 'redding'), mis = tel(rijen, 'mis');
  const perPositie = VELDPOSITIES.map(p => {
    const l = rijen.filter(x => x.positie === p.code);
    const g = tel(l, 'goal'), s = tel(l, 'redding');
    return { code: p.code, naam: p.naam, opDoel: g + s, gestopt: s, tegen: g, mis: tel(l, 'mis'), pct: pctVan(s, g + s) };
  }).filter(p => p.opDoel + p.mis);
  const perZone = Array.from({ length: 9 }, (_, i) => ({
    zone: i + 1,
    goals: rijen.filter(x => x.doelzone === i + 1 && x.resultaat === 'goal').length,
    gestopt: rijen.filter(x => x.doelzone === i + 1 && x.resultaat === 'redding').length,
  }));
  return { opDoel: goals + gestopt, gestopt, tegen: goals, mis, pct: pctVan(gestopt, goals + gestopt), perPositie, perZone };
}

// Doelmanrapport-rijen (per dag en schutter) opgeteld per schutter; wie het vaakst scoort eerst
export function perSchutterTotaal(rijen) {
  const per = new Map();
  for (const r of rijen) {
    const s = per.get(r.schutter) || { schutter: r.schutter, schoten: 0, goals: 0, reddingen: 0, mis: 0 };
    s.schoten += r.schoten; s.goals += r.goals; s.reddingen += r.reddingen; s.mis += r.mis;
    per.set(r.schutter, s);
  }
  return [...per.values()]
    .map(s => ({ ...s, pct: pctVan(s.reddingen, s.goals + s.reddingen) }))
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
}

// Ranglijst schutters (beste trefzekerheid eerst; bij gelijk: wie meer schoot). Optioneel enkel schoten vanaf één positie.
export function rangschikSchutters(rijen, spelers, positie = null) {
  const gefilterd = positie ? rijen.filter(r => r.positie === positie) : rijen;
  return spelers.map(s => {
    const eigen = gefilterd.filter(r => r.player_id === s.id);
    const goals = eigen.filter(r => r.resultaat === 'goal').length;
    return { player_id: s.id, naam: s.naam, schoten: eigen.length, goals, pct: pctVan(goals, eigen.length) };
  }).filter(r => r.schoten)
    .sort((a, b) => b.pct - a.pct || b.schoten - a.schoten);
}

// Ranglijst doelmannen (hoogste reddingspercentage eerst). Schoten op "andere doelman" tellen niet mee.
export function rangschikDoelmannen(rijen, spelers) {
  const naam = id => spelers.find(s => s.id === id)?.naam ?? 'Onbekend';
  return doelmanStats(rijen).filter(d => d.doelman_id)
    .map(d => ({ ...d, naam: naam(d.doelman_id), mis: rijen.filter(r => r.doelman_id === d.doelman_id && r.resultaat === 'mis').length }))
    .filter(d => d.opDoel + d.mis)
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.opDoel - a.opDoel);
}
