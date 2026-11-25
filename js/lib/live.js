// Rekenregels voor de live matchwatcher (zonder DOM, testbaar)

export const VELDPOSITIES = [
  { code: 'LH', naam: 'Linkerhoek' },
  { code: 'LO', naam: 'Linkeropbouw' },
  { code: 'MO', naam: 'Midden' },
  { code: 'RO', naam: 'Rechteropbouw' },
  { code: 'RH', naam: 'Rechterhoek' },
  { code: 'CIR', naam: 'Cirkel' },
  { code: '7M', naam: '7 meter' },
  { code: 'TA', naam: 'Tegenaanval' },
];
const positieNaam = code => VELDPOSITIES.find(p => p.code === code)?.naam ?? code;

export const RESULTATEN = { goal: 'Goal', redding: 'Redding', mis: 'Mis' };
export const STRAF_SECONDEN = 120;

const pct = (goals, schoten) => (schoten ? Math.round((100 * goals) / schoten) : null);

export function scoreUitEvents(events) {
  return {
    voor: events.filter(e => e.soort === 'schot' && e.resultaat === 'goal').length,
    tegen: events.filter(e => e.soort === 'tegengoal').length,
  };
}

export function schotStats(events) {
  const schoten = events.filter(e => e.soort === 'schot');
  const goals = schoten.filter(e => e.resultaat === 'goal').length;
  const perPositie = VELDPOSITIES.map(p => {
    const s = schoten.filter(e => e.positie === p.code);
    const g = s.filter(e => e.resultaat === 'goal').length;
    return { code: p.code, naam: p.naam, schoten: s.length, goals: g, pct: pct(g, s.length) };
  }).filter(p => p.schoten);
  const perZone = Array.from({ length: 9 }, (_, i) => ({
    zone: i + 1,
    goals: schoten.filter(e => e.doelzone === i + 1 && e.resultaat === 'goal').length,
    gestopt: schoten.filter(e => e.doelzone === i + 1 && e.resultaat === 'redding').length,
  }));
  return { schoten: schoten.length, goals, pct: pct(goals, schoten.length), perPositie, perZone };
}

export function formatKlok(seconden) {
  const s = Math.max(0, Math.floor(seconden));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------- Wedstrijdklok (puur: elke functie geeft een nieuwe toestand) ----------
export const nieuweKlok = (helftMinuten = 25) => ({ helft: 1, basis: 0, sinds: null, helftDuur: helftMinuten * 60 });
export const klokSeconden = (k, nuMs) => k.basis + (k.sinds != null ? Math.floor((nuMs - k.sinds) / 1000) : 0);
export const startKlok = (k, nuMs) => (k.sinds != null ? k : { ...k, sinds: nuMs });
export const pauzeerKlok = (k, nuMs) => (k.sinds == null ? k : { ...k, basis: klokSeconden(k, nuMs), sinds: null });
export const volgendeHelft = k => ({ ...k, helft: k.helft + 1, basis: 0, sinds: null });

export const absoluteSeconde = (e, helftDuur) => (e.helft - 1) * helftDuur + e.seconde;

// Lopende 2 minuten op dit moment van de wedstrijdklok
export function actieveStraffen(events, nu, helftDuur) {
  const nuAbs = absoluteSeconde(nu, helftDuur);
  return events
    .filter(e => e.soort === 'twee_min' || e.soort === 'twee_min_tegen')
    .map(e => ({
      player_id: e.soort === 'twee_min' ? e.player_id : null,
      tegen: e.soort === 'twee_min_tegen',
      resterend: STRAF_SECONDEN - (nuAbs - absoluteSeconde(e, helftDuur)),
    }))
    .filter(s => s.resterend > 0 && s.resterend <= STRAF_SECONDEN);
}

// Spelers waar het aantal live goals verschilt van Clubee (goals-rijen: {player_id, aantal})
export function verschilMetClubee(events, clubeeGoals) {
  const live = {};
  events.filter(e => e.soort === 'schot' && e.resultaat === 'goal')
    .forEach(e => { live[e.player_id] = (live[e.player_id] || 0) + 1; });
  const ids = new Set([...Object.keys(live), ...clubeeGoals.map(g => g.player_id)]);
  const clubee = Object.fromEntries(clubeeGoals.map(g => [g.player_id, g.aantal]));
  return [...ids]
    .map(id => ({ player_id: id, live: live[id] || 0, clubee: clubee[id] || 0 }))
    .filter(r => r.live !== r.clubee);
}

export { positieNaam };
