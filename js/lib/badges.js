// Badges: berekend uit gegevens die al in de app staan (zonder DOM, testbaar).
// data: { schoten, sessies, aanwezig, goals, zelf, rapporten } van één speler (al gefilterd op seizoen).

export const BADGES = [
  { id: 'eerste-schot', icoon: '🎯', naam: 'Eerste schot', uitleg: 'Je eerste schiettraining afgesloten', soort: 'Schiettraining' },
  { id: 'scherpschutter', icoon: '🔥', naam: 'Scherpschutter', uitleg: 'Een sessie met minstens 10 schoten en 80% raak', soort: 'Schiettraining' },
  { id: 'precisie', icoon: '📍', naam: 'Precisie', uitleg: '25 keer gescoord op de plek die de app vroeg', soort: 'Schiettraining' },
  { id: 'allround', icoon: '🌍', naam: 'Allround', uitleg: 'Gescoord vanaf alle 6 veldposities', soort: 'Schiettraining' },
  { id: 'honderd', icoon: '💯', naam: 'Honderd', uitleg: '100 goals in de schiettraining', soort: 'Schiettraining' },
  { id: 'paraat', icoon: '✅', naam: 'Altijd paraat', uitleg: '10 trainingen op rij aanwezig', soort: 'Training' },
  { id: 'volhouder', icoon: '🏋️', naam: 'Volhouder', uitleg: '90% aanwezig (vanaf 10 trainingen)', soort: 'Training' },
  { id: 'eerste-goal', icoon: '⚽', naam: 'Eerste goal', uitleg: 'Je eerste goal in een officiële match', soort: 'Match' },
  { id: 'hattrick', icoon: '🎩', naam: 'Hattrick', uitleg: '3 of meer goals in één match', soort: 'Match' },
  { id: 'zevenmeter', icoon: '🥅', naam: '7m-killer', uitleg: '5 strafworpen (7 m) gescoord', soort: 'Match' },
  { id: 'eerlijk', icoon: '🪞', naam: 'Eerlijk naar jezelf', uitleg: '3 maanden op rij een zelfevaluatie', soort: 'Groei' },
  { id: 'groeier', icoon: '📈', naam: 'Groeier', uitleg: 'Een vaardigheid ging 2 punten omhoog tussen twee rapporten', soort: 'Groei' },
];

const VELD6 = ['LH', 'LO', 'MO', 'RO', 'RH', 'CIR'];

// Langste reeks opeenvolgende maanden ("2026-09", "2026-10", …)
function langsteMaandReeks(maanden) {
  const nrs = [...new Set(maanden)].map(m => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7))).sort((a, b) => a - b);
  let best = 0, nu = 0;
  nrs.forEach((n, i) => { nu = i && n === nrs[i - 1] + 1 ? nu + 1 : 1; best = Math.max(best, nu); });
  return best;
}

export function berekenBadges({ schoten = [], sessies = [], aanwezig = [], goals = [], zelf = [], rapporten = [] }) {
  const v = (huidig, doel) => ({ behaald: huidig >= doel, voortgang: { huidig: Math.min(huidig, doel), doel } });

  // Schiettraining
  const afgesloten = sessies.filter(s => s.gestopt_op);
  const treffers = schoten.filter(s => s.resultaat === 'goal');
  const opPlek = treffers.filter(s => s.uitdaging_zone && s.doelzone === s.uitdaging_zone).length;
  const posities = new Set(treffers.map(s => s.positie).filter(p => VELD6.includes(p)));
  const besteSessie = afgesloten.some(s => {
    const eigen = schoten.filter(x => x.sessie_id === s.id);
    return eigen.length >= 10 && eigen.filter(x => x.resultaat === 'goal').length / eigen.length >= 0.8;
  });

  // Training: aanwezigheden in volgorde van de trainingsdatum
  const opDatum = [...aanwezig].sort((a, b) => String(a.trainingen?.datum).localeCompare(String(b.trainingen?.datum)));
  let reeks = 0, langste = 0;
  for (const a of opDatum) { reeks = a.status === 'aanwezig' ? reeks + 1 : 0; langste = Math.max(langste, reeks); }
  const aanwezigTotaal = aanwezig.filter(a => a.status === 'aanwezig').length;
  const volhouder = aanwezig.length >= 10 && aanwezigTotaal / aanwezig.length >= 0.9;

  // Match
  const matchGoals = goals.reduce((t, g) => t + (g.aantal || 0), 0);
  const besteMatch = Math.max(0, ...goals.map(g => g.aantal || 0));
  const zevenM = goals.reduce((t, g) => t + (g.zeven_m || 0), 0);

  // Groei
  const maandReeks = langsteMaandReeks(zelf.map(z => String(z.datum).slice(0, 7)));
  const opVolgorde = [...rapporten].sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
  let groei = 0;
  for (let i = 1; i < opVolgorde.length; i++) {
    for (const s of opVolgorde[i].report_scores || []) {
      const vorig = (opVolgorde[i - 1].report_scores || []).find(x => x.skill_id === s.skill_id);
      if (vorig) groei = Math.max(groei, s.score - vorig.score);
    }
  }

  const stand = {
    'eerste-schot': v(afgesloten.length, 1),
    scherpschutter: v(besteSessie ? 1 : 0, 1),
    precisie: v(opPlek, 25),
    allround: v(posities.size, 6),
    honderd: v(treffers.length, 100),
    paraat: v(langste, 10),
    volhouder: { behaald: volhouder, voortgang: { huidig: Math.min(aanwezig.length, 10), doel: 10 } },
    'eerste-goal': v(matchGoals, 1),
    hattrick: v(besteMatch, 3),
    zevenmeter: v(zevenM, 5),
    eerlijk: v(maandReeks, 3),
    groeier: v(groei, 2),
  };
  return BADGES.map(b => ({ ...b, ...stand[b.id] }));
}
