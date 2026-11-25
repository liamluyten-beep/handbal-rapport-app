// Opslag voor de live matchwatcher: eerst lokaal (localStorage), dan naar Supabase.
import { sb } from './supabase.js';
import { zetInWachtrij, pasToeOpLijst } from './lib/wachtrij.js';
import { nieuweKlok } from './lib/live.js';

const sleutel = (matchId, wat) => `live:${matchId}:${wat}`;
const lees = (k, standaard) => { try { return JSON.parse(localStorage.getItem(k)) ?? standaard; } catch { return standaard; } };
const schrijf = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const leesKlok = (matchId, helftMinuten) => lees(sleutel(matchId, 'klok'), null) || nieuweKlok(helftMinuten);
export const bewaarKlok = (matchId, klok) => schrijf(sleutel(matchId, 'klok'), klok);
export const wachtend = matchId => lees(sleutel(matchId, 'wachtrij'), []).length;

// Gebeurtenissen zoals de gebruiker ze moet zien (server + nog niet verstuurde acties)
export function lokaleEvents(matchId) {
  const server = lees(sleutel(matchId, 'server'), []);
  return pasToeOpLijst(server, lees(sleutel(matchId, 'wachtrij'), []))
    .sort((a, b) => (a.helft - b.helft) || (a.seconde - b.seconde) || String(a.created_at).localeCompare(String(b.created_at)));
}

export async function haalVanServer(matchId) {
  const { data, error } = await sb.from('match_events').select('*').eq('match_id', matchId);
  if (error) throw new Error(error.message);
  schrijf(sleutel(matchId, 'server'), data);
  return data;
}

function zetActie(matchId, actie) {
  schrijf(sleutel(matchId, 'wachtrij'), zetInWachtrij(lees(sleutel(matchId, 'wachtrij'), []), actie));
}

export function voegToe(matchId, rij) {
  const volledig = { id: crypto.randomUUID(), match_id: matchId, player_id: null, positie: null, resultaat: null,
    doelzone: null, created_at: new Date().toISOString(), ...rij };
  zetActie(matchId, { op: 'insert', rij: volledig });
  return volledig;
}

let bezig = false;

export function verwijder(matchId, id) {
  const rij = lees(sleutel(matchId, 'wachtrij'), []);
  // Wordt deze rij op dit moment verstuurd? Dan niet "wegstrepen" maar achteraf ook op de server wissen.
  if (bezig && rij[0]?.op === 'insert' && rij[0].rij.id === id) schrijf(sleutel(matchId, 'wachtrij'), [...rij, { op: 'delete', id }]);
  else zetActie(matchId, { op: 'delete', id });
}

const actieId = a => a.op + ':' + (a.rij?.id ?? a.id);

// Stuurt de wachtrij door. Stopt bij de eerste fout (bv. geen verbinding) en probeert later opnieuw.
export async function synchroniseer(matchId) {
  if (bezig) return wachtend(matchId);
  bezig = true;
  try {
    for (;;) {
      const rij = lees(sleutel(matchId, 'wachtrij'), []);
      if (!rij.length) break;
      const actie = rij[0];
      const { error } = actie.op === 'insert'
        ? await sb.from('match_events').upsert(actie.rij, { onConflict: 'id' })
        : await sb.from('match_events').delete().eq('id', actie.id);
      if (error) throw new Error(error.message);
      // Server-kopie bijwerken en actie van de wachtrij halen
      let server = lees(sleutel(matchId, 'server'), []);
      server = actie.op === 'insert' ? [...server.filter(r => r.id !== actie.rij.id), actie.rij] : server.filter(r => r.id !== actie.id);
      schrijf(sleutel(matchId, 'server'), server);
      const klaar = actieId(actie);
      const nu = lees(sleutel(matchId, 'wachtrij'), []);
      const i = nu.findIndex(o => actieId(o) === klaar);
      if (i >= 0) nu.splice(i, 1);
      schrijf(sleutel(matchId, 'wachtrij'), nu);
    }
  } finally { bezig = false; }
  return 0;
}
