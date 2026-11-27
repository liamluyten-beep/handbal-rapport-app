// Supabase wordt met de site zelf meegeleverd (js/vendor/supabase.min.js, geladen in index.html),
// zodat de app niet afhangt van een externe server die kan haperen.
const { createClient } = window.supabase;
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const isGeconfigureerd =
  !SUPABASE_URL.includes('JOUW-PROJECT') && !SUPABASE_ANON_KEY.includes('JOUW-ANON-KEY');

// Enkel het basisadres gebruiken, ook als er per ongeluk /rest/v1/ achter staat
const basisUrl = SUPABASE_URL.trim().replace(/\/(rest|auth)\/v1\/?$/, '').replace(/\/+$/, '');

export const sb = isGeconfigureerd ? createClient(basisUrl, SUPABASE_ANON_KEY.trim()) : null;

// Gooit een leesbare fout als Supabase een fout teruggeeft
export async function q(belofte) {
  const { data, error } = await belofte;
  if (error) throw new Error(error.message);
  return data;
}
