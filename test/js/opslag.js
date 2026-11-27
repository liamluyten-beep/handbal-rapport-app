// Algemene "eerst lokaal, dan naar Supabase"-opslag met wachtrij (voor slechte wifi in de sporthal).
// Gebruikt door de live matchwatcher (match_events) en de schiettraining (training_schoten).
import { sb } from './supabase.js';
import { zetInWachtrij, pasToeOpLijst } from './lib/wachtrij.js';

const lees = (k, standaard) => { try { return JSON.parse(localStorage.getItem(k)) ?? standaard; } catch { return standaard; } };
const schrijf = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const actieId = a => a.op + ':' + (a.rij?.id ?? a.id);

// tabel: Supabase-tabel; voorvoegsel: sleutel in localStorage; filter: (query, scope) => query
// optioneel: kolommen die nog niet in de database kunnen bestaan (update nog niet uitgevoerd) -> dan zonder bewaren
export function maakOpslag({ tabel, voorvoegsel, filter, optioneel = [] }) {
  const sleutel = (scope, wat) => `${voorvoegsel}:${scope}:${wat}`;
  let bezig = false;

  const wachtend = scope => lees(sleutel(scope, 'wachtrij'), []).length;

  function lokaal(scope) {
    return pasToeOpLijst(lees(sleutel(scope, 'server'), []), lees(sleutel(scope, 'wachtrij'), []));
  }

  async function haalVanServer(scope) {
    const { data, error } = await filter(sb.from(tabel).select('*'), scope);
    if (error) throw new Error(error.message);
    schrijf(sleutel(scope, 'server'), data);
    return data;
  }

  function voegToe(scope, rij) {
    const volledig = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...rij };
    schrijf(sleutel(scope, 'wachtrij'), zetInWachtrij(lees(sleutel(scope, 'wachtrij'), []), { op: 'insert', rij: volledig }));
    return volledig;
  }

  function verwijder(scope, id) {
    const rij = lees(sleutel(scope, 'wachtrij'), []);
    // Wordt deze rij net verstuurd? Dan niet wegstrepen maar achteraf ook op de server wissen.
    if (bezig && rij[0]?.op === 'insert' && rij[0].rij.id === id) schrijf(sleutel(scope, 'wachtrij'), [...rij, { op: 'delete', id }]);
    else schrijf(sleutel(scope, 'wachtrij'), zetInWachtrij(rij, { op: 'delete', id }));
  }

  // Stuurt de wachtrij door; stopt bij de eerste fout (bv. geen verbinding) en probeert later opnieuw.
  async function synchroniseer(scope) {
    if (bezig) return wachtend(scope);
    bezig = true;
    try {
      for (;;) {
        const rij = lees(sleutel(scope, 'wachtrij'), []);
        if (!rij.length) break;
        const actie = rij[0];
        let { error } = actie.op === 'insert'
          ? await sb.from(tabel).upsert(actie.rij, { onConflict: 'id' })
          : await sb.from(tabel).delete().eq('id', actie.id);
        const ontbreekt = error && actie.op === 'insert' && optioneel.filter(k => error.message.includes(k));
        if (ontbreekt?.length) {
          const zonder = { ...actie.rij };
          ontbreekt.forEach(k => delete zonder[k]);
          ({ error } = await sb.from(tabel).upsert(zonder, { onConflict: 'id' }));
        }
        if (error) throw new Error(error.message);
        let server = lees(sleutel(scope, 'server'), []);
        server = actie.op === 'insert' ? [...server.filter(r => r.id !== actie.rij.id), actie.rij] : server.filter(r => r.id !== actie.id);
        schrijf(sleutel(scope, 'server'), server);
        const nu = lees(sleutel(scope, 'wachtrij'), []);
        const i = nu.findIndex(o => actieId(o) === actieId(actie));
        if (i >= 0) nu.splice(i, 1);
        schrijf(sleutel(scope, 'wachtrij'), nu);
      }
    } finally { bezig = false; }
    return 0;
  }

  return { wachtend, lokaal, haalVanServer, voegToe, verwijder, synchroniseer };
}
