// Kalender laden: komende en gespeelde matchen uit Clubee (data/clubee.json) + eigen matchen uit de database.
import { sb, q } from './supabase.js';
import { kalenderItems } from './lib/kalender.js';

let cache = null;

export async function laadKalender({ vers = false } = {}) {
  if (cache && !vers) return cache;
  const [clubee, db] = await Promise.all([
    fetch(`data/clubee.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
    // competitie bestaat pas na update-14: anders zonder die kolom
    q(sb.from('matches').select('id, clubee_id, datum, tegenstander, thuis, score_voor, score_tegen, competitie'))
      .catch(() => q(sb.from('matches').select('id, clubee_id, datum, tegenstander, thuis, score_voor, score_tegen')))
      .catch(() => []),
  ]);
  cache = kalenderItems(clubee?.kalender ?? [], db, clubee?.ploeg ?? '');
  return cache;
}

// Een match uit de kalender als wedstrijd in de database zetten (als ze er nog niet in staat) en het id teruggeven
export async function maakMatchVoor(item) {
  if (item.match_id) return item.match_id;
  const rij = { datum: item.datum, tegenstander: item.tegenstander, thuis: item.thuis, clubee_id: item.clubee_id };
  let { data, error } = await sb.from('matches').insert(item.competitie ? { ...rij, competitie: item.competitie } : rij).select('id').single();
  if (error && /competitie/i.test(error.message)) ({ data, error } = await sb.from('matches').insert(rij).select('id').single());
  if (error) {
    // Bestaat al (bv. iemand anders was sneller): opzoeken
    const bestaand = await q(sb.from('matches').select('id').eq('clubee_id', item.clubee_id).maybeSingle()).catch(() => null);
    if (bestaand) return bestaand.id;
    throw new Error(error.message);
  }
  cache = null;
  return data.id;
}
