// Ploegen op dezelfde site: de ploeg volgt uit het pad (U16 bovenaan, Heren 1 onder /heren1/).
// Elke ploeg heeft een eigen Supabase-project. De "anon" keys mogen publiek staan: de database beschermt zichzelf (RLS).

const ALLES = { rapporten: true, xp: true, trainingen: true, schieten: true, playbook: true, opstelling: true, ploegstats: false };

export const PLOEGEN = {
  u16: {
    id: 'u16', naam: 'U16 Uilenspiegel', kort: 'U16',
    supabaseUrl: 'https://iuustgpdfohywxyyfmys.supabase.co',
    anonKey: 'sb_publishable_fBhqEW10hCXuCQ5JFWjlrw_Ht6N7v7j',
    opslagSleutel: null,                // standaard: bestaande inlogsessies blijven werken
    dataBestand: 'clubee.json',
    functies: ALLES,
  },
  heren1: {
    id: 'heren1', naam: 'Heren 1 Uilenspiegel', kort: 'Heren 1',
    supabaseUrl: 'https://zraaxfpqjnugfvvrtsuu.supabase.co',
    anonKey: 'sb_publishable_BiEfnFRE20TYUxUf3FB6Ww_Ana8NT1P',
    opslagSleutel: 'sb-heren1',       // eigen inlogsessie, los van U16
    dataBestand: 'clubee-heren1.json',
    functies: { rapporten: false, xp: false, trainingen: false, schieten: false, playbook: false, opstelling: false, ploegstats: true },
  },
};

export const ploegVanPad = pad => (/\/heren1(\/|$)/.test(pad) ? 'heren1' : 'u16');
export const isTestPad = pad => /\/test\//.test(pad);
export const heeftFunctie = (profiel, naam) => !!profiel?.functies?.[naam];

// Pagina's die bij een onderdeel horen dat niet elke ploeg heeft (Heren 1: enkel matchstats)
export const ROUTE_FUNCTIE = { mijn: 'rapporten', zelfevaluatie: 'rapporten', rapport: 'rapporten', vaardigheden: 'rapporten',
  avatar: 'xp', xp: 'xp', trainingen: 'trainingen', training: 'trainingen', schieten: 'schieten', schietstats: 'schieten',
  playbook: 'playbook', systeem: 'playbook', opstelling: 'opstelling', voorbereiding: 'opstelling', ploegstats: 'ploegstats' };

// Mag deze ploeg deze pagina openen? pad: "#/mijn", "#/rapport/nieuw/x" of gewoon "mijn"
export function routeMag(profiel, pad) {
  const naam = String(pad).replace(/^#?\/?/, '').split('/')[0];
  return !ROUTE_FUNCTIE[naam] || heeftFunctie(profiel, ROUTE_FUNCTIE[naam]);
}
