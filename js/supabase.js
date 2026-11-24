import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const isGeconfigureerd =
  !SUPABASE_URL.includes('JOUW-PROJECT') && !SUPABASE_ANON_KEY.includes('JOUW-ANON-KEY');

export const sb = isGeconfigureerd ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Gooit een leesbare fout als Supabase een fout teruggeeft
export async function q(belofte) {
  const { data, error } = await belofte;
  if (error) throw new Error(error.message);
  return data;
}
