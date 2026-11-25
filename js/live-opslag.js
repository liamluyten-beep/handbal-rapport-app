// Opslag voor de live matchwatcher: eerst lokaal (localStorage), dan naar Supabase.
import { maakOpslag } from './opslag.js';
import { nieuweKlok } from './lib/live.js';

const opslag = maakOpslag({ tabel: 'match_events', voorvoegsel: 'live', filter: (query, matchId) => query.eq('match_id', matchId) });

const lees = (k, standaard) => { try { return JSON.parse(localStorage.getItem(k)) ?? standaard; } catch { return standaard; } };
export const leesKlok = (matchId, helftMinuten) => lees(`live:${matchId}:klok`, null) || nieuweKlok(helftMinuten);
export const bewaarKlok = (matchId, klok) => localStorage.setItem(`live:${matchId}:klok`, JSON.stringify(klok));

export const wachtend = opslag.wachtend;
export const haalVanServer = opslag.haalVanServer;
export const verwijder = opslag.verwijder;
export const synchroniseer = opslag.synchroniseer;

// Gebeurtenissen zoals de gebruiker ze moet zien (server + nog niet verstuurde acties), op wedstrijdklok
export function lokaleEvents(matchId) {
  return opslag.lokaal(matchId)
    .sort((a, b) => (a.helft - b.helft) || (a.seconde - b.seconde) || String(a.created_at).localeCompare(String(b.created_at)));
}

export function voegToe(matchId, rij) {
  return opslag.voegToe(matchId, { match_id: matchId, player_id: null, positie: null, resultaat: null, doelzone: null, ...rij });
}
