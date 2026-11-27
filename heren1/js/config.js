// Instellingen van de actieve ploeg (gekozen via het pad van de pagina). Zie js/lib/ploeg.js.
import { PLOEGEN, ploegVanPad } from './lib/ploeg.js';

export const PLOEG = PLOEGEN[ploegVanPad(location.pathname)];
export const PLOEGNAAM = PLOEG.naam;
export const SUPABASE_URL = PLOEG.supabaseUrl;
export const SUPABASE_ANON_KEY = PLOEG.anonKey;
