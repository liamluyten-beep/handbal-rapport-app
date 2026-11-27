// Avatar: zelf samen te stellen uit onderdelen, getekend als SVG (zonder DOM, testbaar).
// Accessoires speel je vrij met je XP-level of met badges.

const kleur = (id, naam, hex, extra = {}) => ({ id, naam, hex, ...extra });

export const ONDERDELEN = [
  { id: 'huid', naam: 'Huid', opties: [
    kleur('h1', 'Licht', '#f6d3b3'), kleur('h2', 'Licht getint', '#e9b98f'), kleur('h3', 'Getint', '#c98e5f'),
    kleur('h4', 'Bruin', '#9c6640'), kleur('h5', 'Donker', '#6b4426'), kleur('h6', 'Zeer donker', '#4a2e1a')] },
  { id: 'haar', naam: 'Kapsel', opties: [
    { id: 'kort', naam: 'Kort' }, { id: 'stekels', naam: 'Stekels' }, { id: 'krullen', naam: 'Krullen' },
    { id: 'lang', naam: 'Lang' }, { id: 'knot', naam: 'Knotje' }, { id: 'kaal', naam: 'Kaal' }] },
  { id: 'haarkleur', naam: 'Haarkleur', opties: [
    kleur('zwart', 'Zwart', '#1f1a17'), kleur('bruin', 'Bruin', '#5a3a22'), kleur('blond', 'Blond', '#d9b25c'),
    kleur('rood', 'Rood', '#b3502a'), kleur('blauw', 'Geverfd blauw', '#2f6fd6', { level: 4 })] },
  { id: 'ogen', naam: 'Ogen', opties: [
    { id: 'normaal', naam: 'Normaal' }, { id: 'groot', naam: 'Groot' }, { id: 'blij', naam: 'Blij' }, { id: 'knipoog', naam: 'Knipoog' }] },
  { id: 'mond', naam: 'Mond', opties: [
    { id: 'lach', naam: 'Lach' }, { id: 'grijns', naam: 'Grijns' }, { id: 'tong', naam: 'Tong' }, { id: 'neutraal', naam: 'Neutraal' }] },
  { id: 'hoofd', naam: 'Op je hoofd', opties: [
    { id: 'geen', naam: 'Niets' }, { id: 'petje', naam: 'Petje', level: 2 }, { id: 'zweetband', naam: 'Zweetband', level: 2 },
    { id: 'achterstevoren', naam: 'Petje achterstevoren', level: 3 }, { id: 'koptelefoon', naam: 'Koptelefoon', level: 4 },
    { id: 'kroon', naam: 'Gouden kroon', level: 6 }] },
  { id: 'gezicht', naam: 'Gezicht', opties: [
    { id: 'geen', naam: 'Niets' }, { id: 'zonnebril', naam: 'Zonnebril', level: 3 },
    { id: 'strepen', naam: 'Oogstrepen', badge: 'scherpschutter' }] },
  { id: 'shirt', naam: 'Shirt', opties: [
    kleur('thuis', 'Thuisshirt', '#d2142c'), kleur('uit', 'Uitshirt', '#f4f5f7', { nr: '#191b21' }),
    kleur('keeper', 'Keepershirt', '#13865b'), kleur('zwart', 'Zwart shirt', '#191b21', { level: 5 })] },
  { id: 'achtergrond', naam: 'Achtergrond', opties: [
    kleur('grijs', 'Grijs', '#dfe2e8'), kleur('rood', 'Rood', '#f6c9cf'), kleur('blauw', 'Blauw', '#c9dcf6'),
    kleur('groen', 'Groen', '#c9eedd'), kleur('goud', 'Goud', '#e8b04a', { badge: 'honderd' }),
    kleur('vuur', 'Vuur', '#ff6a1a', { badge: 'hattrick' })] },
];

export const STANDAARD = { huid: 'h2', haar: 'kort', haarkleur: 'bruin', ogen: 'normaal', mond: 'lach',
  hoofd: 'geen', gezicht: 'geen', shirt: 'thuis', achtergrond: 'grijs' };

const zoek = (deel, id) => ONDERDELEN.find(o => o.id === deel)?.opties.find(o => o.id === id);

// Enkel bekende waarden overhouden (wat in de database staat, wordt nooit rechtstreeks in de SVG gezet)
export function normaliseerAvatar(cfg) {
  const uit = {};
  for (const o of ONDERDELEN) uit[o.id] = zoek(o.id, cfg?.[o.id]) ? cfg[o.id] : STANDAARD[o.id];
  return uit;
}

// Is deze optie vrij voor iemand met dit level en deze behaalde badges (ids)?
export function isVrij(optie, { level = 1, badges = [] } = {}) {
  if (optie.level && level < optie.level) return false;
  if (optie.badge && !badges.includes(optie.badge)) return false;
  return true;
}

// Korte uitleg voor een optie die nog op slot zit
export function slotTekst(optie, badgeNamen = {}) {
  if (optie.level) return `Level ${optie.level}`;
  if (optie.badge) return `Badge ${badgeNamen[optie.badge] || optie.badge}`;
  return '';
}

const HAAR = {
  kort: 'M28 40 Q28 18 50 18 Q72 18 72 40 Q66 28 50 28 Q34 28 28 40 Z',
  stekels: 'M28 38 L30 22 L37 28 L42 15 L48 26 L54 14 L59 26 L65 17 L68 28 L72 38 Q62 30 50 30 Q38 30 28 38 Z',
  lang: 'M27 44 Q26 16 50 16 Q74 16 73 44 L73 64 Q70 66 67 62 L67 36 Q60 28 50 28 Q40 28 33 36 L33 62 Q30 66 27 64 Z',
  knot: 'M28 40 Q28 18 50 18 Q72 18 72 40 Q66 28 50 28 Q34 28 28 40 Z',
};

function haarSvg(stijl, k) {
  if (stijl === 'kaal') return '';
  if (stijl === 'krullen') return [[31, 33], [36, 25], [44, 20], [52, 19], [60, 21], [66, 27], [70, 34]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${k}"/>`).join('');
  return `<path d="${HAAR[stijl]}" fill="${k}"/>${stijl === 'knot' ? `<circle cx="50" cy="14" r="7" fill="${k}"/>` : ''}`;
}

const OGEN = {
  normaal: '<circle cx="41" cy="45" r="3" fill="#191b21"/><circle cx="59" cy="45" r="3" fill="#191b21"/>',
  groot: '<circle cx="41" cy="45" r="5" fill="#fff"/><circle cx="59" cy="45" r="5" fill="#fff"/><circle cx="42" cy="46" r="2.6" fill="#191b21"/><circle cx="60" cy="46" r="2.6" fill="#191b21"/>',
  blij: '<path d="M37 46 Q41 41 45 46 M55 46 Q59 41 63 46" stroke="#191b21" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  knipoog: '<circle cx="41" cy="45" r="3" fill="#191b21"/><path d="M55 46 Q59 42 63 46" stroke="#191b21" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
};

const MOND = {
  lach: '<path d="M42 55 Q50 62 58 55" stroke="#191b21" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  grijns: '<path d="M41 54 Q50 66 59 54 Z" fill="#7a2630"/><path d="M43 55 L57 55 L56 57 L44 57 Z" fill="#fff"/>',
  tong: '<path d="M42 55 Q50 62 58 55" stroke="#191b21" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="52" cy="60" rx="3.4" ry="3" fill="#e0457b"/>',
  neutraal: '<path d="M44 57 L56 57" stroke="#191b21" stroke-width="2.4" stroke-linecap="round"/>',
};

const HOOFD = {
  geen: '',
  petje: '<path d="M27 35 Q28 13 50 13 Q72 13 73 35 Z" fill="#d2142c"/><path d="M50 13 L50 35" stroke="#a80f22" stroke-width="1.2"/><path d="M27 35 Q52 30 84 37 Q80 42 52 39 Q35 39 27 39 Z" fill="#a80f22"/><circle cx="50" cy="13.5" r="2" fill="#a80f22"/>',
  achterstevoren: '<path d="M27 35 Q28 13 50 13 Q72 13 73 35 Z" fill="#d2142c"/><path d="M27 33 L13 37 Q14 31 28 28 Z" fill="#a80f22"/><rect x="58" y="28" width="9" height="5" rx="2" fill="#f4f5f7"/>',
  zweetband: '<rect x="27" y="29" width="46" height="7" rx="3" fill="#f4f5f7"/><rect x="27" y="31.5" width="46" height="2" fill="#d2142c"/>',
  koptelefoon: '<path d="M25 46 Q24 12 50 12 Q76 12 75 46" stroke="#2b2f38" stroke-width="4.5" fill="none"/><rect x="19" y="38" width="10" height="16" rx="4" fill="#2b2f38"/><rect x="71" y="38" width="10" height="16" rx="4" fill="#2b2f38"/><rect x="21" y="41" width="3" height="10" rx="1.5" fill="#d2142c"/><rect x="76" y="41" width="3" height="10" rx="1.5" fill="#d2142c"/>',
  kroon: '<path d="M31 25 L33 7 L41 17 L50 3 L59 17 L67 7 L69 25 Z" fill="#e8b04a" stroke="#b9801a" stroke-width="1.2"/><circle cx="50" cy="18" r="2.6" fill="#d2142c"/><circle cx="39" cy="21" r="1.8" fill="#2f6fd6"/><circle cx="61" cy="21" r="1.8" fill="#13865b"/>',
};

const GEZICHT = {
  geen: '',
  zonnebril: '<rect x="33" y="40" width="15" height="9" rx="3.5" fill="#191b21"/><rect x="52" y="40" width="15" height="9" rx="3.5" fill="#191b21"/><path d="M48 43 L52 43" stroke="#191b21" stroke-width="2"/><path d="M35 42 L40 42" stroke="#fff" stroke-width="1.2" opacity=".6"/>',
  strepen: '<rect x="35" y="50" width="11" height="3" rx="1.5" fill="#191b21"/><rect x="54" y="50" width="11" height="3" rx="1.5" fill="#191b21"/>',
};

// SVG-tekst van een avatar. rugnummer komt op het shirt (enkel cijfers worden getoond).
export function avatarSvg(cfg, rugnummer = null) {
  const a = normaliseerAvatar(cfg);
  const huid = zoek('huid', a.huid).hex, haar = zoek('haarkleur', a.haarkleur).hex;
  const shirt = zoek('shirt', a.shirt), bg = zoek('achtergrond', a.achtergrond).hex;
  const nr = String(rugnummer ?? '').replace(/\D/g, '').slice(0, 2);
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar">
<rect width="100" height="100" fill="${bg}"/>
<path d="M16 100 Q18 76 50 73 Q82 76 84 100 Z" fill="${shirt.hex}"/>
<rect x="43" y="62" width="14" height="13" fill="${huid}"/>
<path d="M43 73 Q50 80 57 73" fill="none" stroke="${shirt.nr || '#fff'}" stroke-width="1.6" opacity=".7"/>
${nr ? `<text x="50" y="95" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="15" fill="${shirt.nr || '#fff'}">${nr}</text>` : ''}
<circle cx="28" cy="47" r="5" fill="${huid}"/><circle cx="72" cy="47" r="5" fill="${huid}"/>
<ellipse cx="50" cy="44" rx="22" ry="24" fill="${huid}"/>
${haarSvg(a.haar, haar)}${OGEN[a.ogen]}${MOND[a.mond]}${GEZICHT[a.gezicht]}${HOOFD[a.hoofd]}
</svg>`;
}
