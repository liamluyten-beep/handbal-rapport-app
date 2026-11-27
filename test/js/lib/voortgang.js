// Omzetten van rapporten en goals naar grafiekdata.

export function formatDatum(iso) {
  const [j, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${j}`;
}

const opDatum = (a, b) => String(a).localeCompare(String(b));

export function scoreReeksen(rapporten, skills) {
  if (!rapporten.length) return { labels: [], datasets: [] };
  const gesorteerd = [...rapporten].sort((a, b) => opDatum(a.datum, b.datum));
  const sk = [...skills].sort((a, b) => a.volgorde - b.volgorde);
  return {
    labels: gesorteerd.map(r => formatDatum(r.datum)),
    datasets: sk.map(s => ({
      label: s.naam,
      data: gesorteerd.map(r => {
        const sc = (r.report_scores || []).find(x => x.skill_id === s.id);
        return sc ? sc.score : null;
      }),
    })),
  };
}

export function goalsReeks(goals) {
  const g = goals.filter(x => x.matches).sort((a, b) => opDatum(a.matches.datum, b.matches.datum));
  return {
    labels: g.map(x => `${formatDatum(x.matches.datum).slice(0, 5)} ${x.matches.tegenstander}`),
    data: g.map(x => x.aantal),
    totaal: g.reduce((t, x) => t + x.aantal, 0),
  };
}
