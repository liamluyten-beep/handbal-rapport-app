// Kalender: Clubee-wedstrijden en eigen wedstrijden samenvoegen, maandrooster (zonder DOM, testbaar)
import { korteNaam } from './clubee.js';

export const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

const iso = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const gelijk = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

// clubee: rijen uit data/clubee.json (kalender), db: rijen uit de tabel matches
export function kalenderItems(clubee, db, ploeg) {
  const p = ploeg.toLowerCase();
  const gebruikt = new Set();
  const items = clubee.map(k => {
    const thuis = k.thuis.toLowerCase().includes(p);
    const tegenstander = korteNaam(thuis ? k.uit : k.thuis);
    const eigen = db.find(m => m.clubee_id === k.clubee_id) ||
      db.find(m => !m.clubee_id && m.datum === k.datum && gelijk(m.tegenstander, tegenstander));
    if (eigen) gebruikt.add(eigen.id);
    return {
      datum: k.datum, uur: k.uur, tegenstander, thuis, status: k.status,
      score_voor: k.score_thuis == null ? null : thuis ? k.score_thuis : k.score_uit,
      score_tegen: k.score_thuis == null ? null : thuis ? k.score_uit : k.score_thuis,
      clubee_id: k.clubee_id, match_id: eigen?.id ?? null,
    };
  });
  for (const m of db) {
    if (gebruikt.has(m.id)) continue;
    items.push({ datum: m.datum, uur: null, tegenstander: m.tegenstander, thuis: !!m.thuis,
      status: m.score_voor != null ? 'gespeeld' : 'gepland', score_voor: m.score_voor ?? null, score_tegen: m.score_tegen ?? null,
      clubee_id: m.clubee_id ?? null, match_id: m.id });
  }
  return items.sort((a, b) => a.datum.localeCompare(b.datum) || String(a.uur ?? '').localeCompare(String(b.uur ?? '')));
}

// Weken (maandag-zondag) die de maand bedekken; maand is 0-gebaseerd (0 = januari)
export function maandRaster(jaar, maand) {
  const eerste = new Date(Date.UTC(jaar, maand, 1));
  const start = new Date(eerste);
  start.setUTCDate(1 - ((eerste.getUTCDay() + 6) % 7));
  const weken = [];
  const d = new Date(start);
  do {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push({ datum: iso(d), dag: d.getUTCDate(), inMaand: d.getUTCMonth() === maand });
      d.setUTCDate(d.getUTCDate() + 1);
    }
    weken.push(week);
  } while (d.getUTCMonth() === maand);
  return weken;
}

export function volgendeMatch(items, vandaag) {
  return items.find(k => k.datum >= vandaag && k.status === 'gepland') ?? null;
}
