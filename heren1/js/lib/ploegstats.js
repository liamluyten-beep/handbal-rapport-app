// Ploegstats (Heren 1): topschuttersranglijst uit Clubee-goals en live gevolgde schoten (zonder DOM, testbaar).

const som = (lijst, veld) => lijst.reduce((t, x) => t + (Number(x[veld]) || 0), 0);

// spelers: {id, naam, rugnummer}; goals: rijen uit "goals" (1 per speler per match); events: match_events
export function topschutters(spelers, goals, events = []) {
  return spelers.map(speler => {
    const eigen = goals.filter(g => g.player_id === speler.id);
    const schoten = events.filter(e => e.player_id === speler.id && e.soort === 'schot');
    const raak = schoten.filter(e => e.resultaat === 'goal').length;
    const totaal = som(eigen, 'aantal');
    return {
      speler,
      goals: totaal,
      matchen: eigen.length,
      zevenM: som(eigen, 'zeven_m'),
      tweeMin: som(eigen, 'twee_min'),
      gemiddelde: eigen.length ? Math.round((10 * totaal) / eigen.length) / 10 : null,
      schoten: schoten.length,
      rendement: schoten.length ? Math.round((100 * raak) / schoten.length) : null,
    };
  }).sort((a, b) => b.goals - a.goals || (b.gemiddelde ?? -1) - (a.gemiddelde ?? -1) || a.speler.naam.localeCompare(b.speler.naam));
}
