// Avatar: zelf samen te stellen uit onderdelen, getekend als SVG (zonder DOM, testbaar).
// Spullen speel je vrij met je XP-level (over alle seizoenen samen) of met badges. Hoe hoger, hoe gekker.

const kleur = (id, naam, hex, extra = {}) => ({ id, naam, hex, ...extra });

export const ONDERDELEN = [
  { id: 'huid', naam: 'Huid', opties: [
    kleur('h1', 'Licht', '#f6d3b3'), kleur('h2', 'Licht getint', '#e9b98f'), kleur('h3', 'Getint', '#c98e5f'),
    kleur('h4', 'Bruin', '#9c6640'), kleur('h5', 'Donker', '#6b4426'), kleur('h6', 'Zeer donker', '#4a2e1a')] },
  { id: 'haar', naam: 'Kapsel', opties: [
    { id: 'kort', naam: 'Kort' }, { id: 'stekels', naam: 'Stekels' }, { id: 'krullen', naam: 'Krullen' },
    { id: 'lang', naam: 'Lang' }, { id: 'knot', naam: 'Knotje' }, { id: 'kaal', naam: 'Kaal' },
    { id: 'hanenkam', naam: 'Hanenkam', level: 9 }, { id: 'vuurhaar', naam: 'Vuurhaar', level: 20 }] },
  { id: 'haarkleur', naam: 'Haarkleur', opties: [
    kleur('zwart', 'Zwart', '#1f1a17'), kleur('bruin', 'Bruin', '#5a3a22'), kleur('blond', 'Blond', '#d9b25c'),
    kleur('rood', 'Rood', '#b3502a'), kleur('blauw', 'Geverfd blauw', '#2f6fd6', { level: 4 }),
    kleur('roze', 'Roze', '#e0457b', { level: 7 }), kleur('groen', 'Groen', '#2fbf86', { level: 11 }),
    kleur('zilver', 'Zilver', '#c9ced6', { level: 14 }), kleur('goud', 'Goud', '#e8b04a', { level: 24 }),
    kleur('regenboog', 'Regenboog', 'url(#av-regenboog)', { level: 40 })] },
  { id: 'ogen', naam: 'Ogen', opties: [
    { id: 'normaal', naam: 'Normaal' }, { id: 'groot', naam: 'Groot' }, { id: 'blij', naam: 'Blij' }, { id: 'knipoog', naam: 'Knipoog' }] },
  { id: 'mond', naam: 'Mond', opties: [
    { id: 'lach', naam: 'Lach' }, { id: 'grijns', naam: 'Grijns' }, { id: 'tong', naam: 'Tong' }, { id: 'neutraal', naam: 'Neutraal' }] },
  { id: 'hoofd', naam: 'Op je hoofd', opties: [
    { id: 'geen', naam: 'Niets' }, { id: 'petje', naam: 'Petje', level: 2 }, { id: 'zweetband', naam: 'Zweetband', level: 2 },
    { id: 'achterstevoren', naam: 'Petje achterstevoren', level: 3 }, { id: 'koptelefoon', naam: 'Koptelefoon', level: 4 },
    { id: 'kroon', naam: 'Gouden kroon', level: 6 }, { id: 'bandana', naam: 'Bandana', level: 7 },
    { id: 'viking', naam: 'Vikinghelm', level: 10 }, { id: 'kampioenspet', naam: 'Kampioenspet', level: 12 },
    { id: 'hoorntjes', naam: 'Duivelshoorntjes', level: 15 }, { id: 'aureool', naam: 'Aureool', level: 25 },
    { id: 'keizerskroon', naam: 'Keizerskroon', level: 30 }] },
  { id: 'gezicht', naam: 'Gezicht', opties: [
    { id: 'geen', naam: 'Niets' }, { id: 'zonnebril', naam: 'Zonnebril', level: 3 },
    { id: 'strepen', naam: 'Oogstrepen', badge: 'scherpschutter' }, { id: 'snor', naam: 'Snor', level: 8 },
    { id: 'skibril', naam: 'Skibril', level: 13 }, { id: 'laser', naam: 'Laserogen', level: 20 },
    { id: 'goudbril', naam: 'Gouden bril', level: 25 }] },
  { id: 'shirt', naam: 'Shirt', opties: [
    kleur('thuis', 'Thuisshirt', '#d2142c'), kleur('uit', 'Uitshirt', '#f4f5f7', { nr: '#191b21' }),
    kleur('keeper', 'Keepershirt', '#13865b'), kleur('zwart', 'Zwart shirt', '#191b21', { level: 5 }),
    kleur('goud', 'Gouden shirt', '#e8b04a', { nr: '#191b21', level: 10 }),
    kleur('diamant', 'Diamanten shirt', '#9fe7f5', { nr: '#191b21', level: 20 }),
    kleur('legende', 'Legendeshirt', '#191b21', { nr: '#e8b04a', level: 30, rand: '#e8b04a' })] },
  { id: 'extra', naam: 'Extra', opties: [
    { id: 'geen', naam: 'Niets' }, { id: 'handbal', naam: 'Handbal', level: 5 }, { id: 'medaille', naam: 'Medaille', level: 9 },
    { id: 'beker', naam: 'Beker', level: 16 }, { id: 'vleugels', naam: 'Vleugels', level: 22 },
    { id: 'goudenbal', naam: 'Gouden bal', level: 28 }] },
  { id: 'achtergrond', naam: 'Achtergrond', opties: [
    kleur('grijs', 'Grijs', '#dfe2e8'), kleur('rood', 'Rood', '#f6c9cf'), kleur('blauw', 'Blauw', '#c9dcf6'),
    kleur('groen', 'Groen', '#c9eedd'), kleur('goud', 'Goud', '#e8b04a', { badge: 'honderd' }),
    kleur('vuur', 'Vuur', '#ff6a1a', { badge: 'hattrick' }), kleur('sporthal', 'Sporthal', '#d9a35a', { level: 8 }),
    kleur('nacht', 'Sterrennacht', '#1b2a4a', { level: 12 }), kleur('regenboog', 'Regenboog', '#d2142c', { level: 18 }),
    kleur('ruimte', 'Ruimte', '#0b0b1e', { level: 25 }), kleur('vuurwerk', 'Vuurwerk', '#14143a', { level: 30 })] },
];

export const STANDAARD = { huid: 'h2', haar: 'kort', haarkleur: 'bruin', ogen: 'normaal', mond: 'lach',
  hoofd: 'geen', gezicht: 'geen', shirt: 'thuis', extra: 'geen', achtergrond: 'grijs' };

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

// De eerstvolgende spullen die je met een hoger level vrijspeelt (laagste level eerst)
export function volgendeOpLevel(level, aantal = 3) {
  return ONDERDELEN.flatMap(d => d.opties.filter(o => o.level > level).map(o => ({ ...o, deel: d.id })))
    .sort((a, b) => a.level - b.level).slice(0, aantal);
}

const HAAR = {
  kort: 'M28 40 Q28 18 50 18 Q72 18 72 40 Q66 28 50 28 Q34 28 28 40 Z',
  stekels: 'M28 38 L30 22 L37 28 L42 15 L48 26 L54 14 L59 26 L65 17 L68 28 L72 38 Q62 30 50 30 Q38 30 28 38 Z',
  lang: 'M27 44 Q26 16 50 16 Q74 16 73 44 L73 64 Q70 66 67 62 L67 36 Q60 28 50 28 Q40 28 33 36 L33 62 Q30 66 27 64 Z',
  knot: 'M28 40 Q28 18 50 18 Q72 18 72 40 Q66 28 50 28 Q34 28 28 40 Z',
  hanenkam: 'M43 29 L44 8 L48 15 L50 3 L53 15 L57 8 L57 29 Q50 26 43 29 Z',
};

function haarSvg(stijl, k) {
  if (stijl === 'kaal') return '';
  if (stijl === 'krullen') return [[31, 33], [36, 25], [44, 20], [52, 19], [60, 21], [66, 27], [70, 34]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${k}"/>`).join('');
  if (stijl === 'vuurhaar') return '<path d="M28 40 Q22 22 33 9 Q34 21 40 20 Q37 6 50 -1 Q48 13 56 16 Q60 3 69 9 Q64 21 72 23 Q78 32 72 40 Q66 28 50 28 Q34 28 28 40 Z" fill="#ff6a1a"/>'
    + '<path d="M34 33 Q32 22 39 15 Q40 24 46 23 Q45 13 52 8 Q52 19 58 21 Q62 14 66 16 Q63 24 67 30 Q60 27 50 27 Q40 27 34 33 Z" fill="#ffd23f"/>';
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

const pet = (kroon, klep) => `<path d="M27 35 Q28 13 50 13 Q72 13 73 35 Z" fill="${kroon}"/><path d="M50 13 L50 35" stroke="${klep}" stroke-width="1.2"/><path d="M27 35 Q52 30 84 37 Q80 42 52 39 Q35 39 27 39 Z" fill="${klep}"/><circle cx="50" cy="13.5" r="2" fill="${klep}"/>`;

const HOOFD = {
  geen: '',
  petje: pet('#d2142c', '#a80f22'),
  achterstevoren: '<path d="M27 35 Q28 13 50 13 Q72 13 73 35 Z" fill="#d2142c"/><path d="M27 33 L13 37 Q14 31 28 28 Z" fill="#a80f22"/><rect x="58" y="28" width="9" height="5" rx="2" fill="#f4f5f7"/>',
  zweetband: '<rect x="27" y="29" width="46" height="7" rx="3" fill="#f4f5f7"/><rect x="27" y="31.5" width="46" height="2" fill="#d2142c"/>',
  koptelefoon: '<path d="M25 46 Q24 12 50 12 Q76 12 75 46" stroke="#2b2f38" stroke-width="4.5" fill="none"/><rect x="19" y="38" width="10" height="16" rx="4" fill="#2b2f38"/><rect x="71" y="38" width="10" height="16" rx="4" fill="#2b2f38"/><rect x="21" y="41" width="3" height="10" rx="1.5" fill="#d2142c"/><rect x="76" y="41" width="3" height="10" rx="1.5" fill="#d2142c"/>',
  kroon: '<path d="M31 25 L33 7 L41 17 L50 3 L59 17 L67 7 L69 25 Z" fill="#e8b04a" stroke="#b9801a" stroke-width="1.2"/><circle cx="50" cy="18" r="2.6" fill="#d2142c"/><circle cx="39" cy="21" r="1.8" fill="#2f6fd6"/><circle cx="61" cy="21" r="1.8" fill="#13865b"/>',
  bandana: '<path d="M27 34 Q28 15 50 15 Q72 15 73 34 Q50 28 27 34 Z" fill="#2f6fd6"/><circle cx="40" cy="24" r="1.6" fill="#fff"/><circle cx="50" cy="20" r="1.6" fill="#fff"/><circle cx="60" cy="24" r="1.6" fill="#fff"/><circle cx="45" cy="29" r="1.3" fill="#fff"/><circle cx="56" cy="29" r="1.3" fill="#fff"/><path d="M72 31 L82 27 L79 35 Z M72 33 L81 39 L74 40 Z" fill="#2f6fd6"/>',
  viking: '<path d="M28 28 Q13 22 15 5 Q21 17 33 22 Z" fill="#f4ead0" stroke="#c9b98f" stroke-width="1"/><path d="M72 28 Q87 22 85 5 Q79 17 67 22 Z" fill="#f4ead0" stroke="#c9b98f" stroke-width="1"/><path d="M27 34 Q28 12 50 12 Q72 12 73 34 Z" fill="#8a8f99"/><path d="M50 12 L50 34" stroke="#6b7280" stroke-width="2"/><rect x="26" y="30" width="48" height="6" rx="2" fill="#6b4426"/><circle cx="34" cy="33" r="1.3" fill="#e8b04a"/><circle cx="50" cy="33" r="1.3" fill="#e8b04a"/><circle cx="66" cy="33" r="1.3" fill="#e8b04a"/>',
  kampioenspet: pet('#e8b04a', '#b9801a') + '<path d="M50 19 L52 24 L57 24 L53 27 L55 32 L50 29 L45 32 L47 27 L43 24 L48 24 Z" fill="#fff"/>',
  hoorntjes: '<path d="M34 25 Q27 15 30 4 Q36 14 42 20 Z" fill="#d2142c" stroke="#a80f22" stroke-width="1"/><path d="M66 25 Q73 15 70 4 Q64 14 58 20 Z" fill="#d2142c" stroke="#a80f22" stroke-width="1"/>',
  aureool: '<ellipse cx="50" cy="9" rx="20" ry="5.5" fill="none" stroke="#ffe9a8" stroke-width="6" opacity=".55"/><ellipse cx="50" cy="9" rx="20" ry="5.5" fill="none" stroke="#e8b04a" stroke-width="3"/>',
  keizerskroon: '<path d="M30 27 Q50 20 70 27 L70 16 Q50 8 30 16 Z" fill="#7a2a8f"/><path d="M27 29 L29 5 L39 17 L50 -1 L61 17 L71 5 L73 29 Z" fill="#e8b04a" stroke="#b9801a" stroke-width="1.3"/><rect x="26" y="25" width="48" height="6" rx="2" fill="#f4f5f7"/><circle cx="31" cy="28" r="1" fill="#191b21"/><circle cx="39" cy="28" r="1" fill="#191b21"/><circle cx="47" cy="28" r="1" fill="#191b21"/><circle cx="55" cy="28" r="1" fill="#191b21"/><circle cx="63" cy="28" r="1" fill="#191b21"/><circle cx="69" cy="28" r="1" fill="#191b21"/><circle cx="50" cy="15" r="3.4" fill="#d2142c"/><circle cx="39" cy="20" r="2.2" fill="#2f6fd6"/><circle cx="61" cy="20" r="2.2" fill="#13865b"/><circle cx="29" cy="5" r="2" fill="#fff"/><circle cx="50" cy="-1" r="2.2" fill="#fff"/><circle cx="71" cy="5" r="2" fill="#fff"/>',
};

const GEZICHT = {
  geen: '',
  zonnebril: '<rect x="33" y="40" width="15" height="9" rx="3.5" fill="#191b21"/><rect x="52" y="40" width="15" height="9" rx="3.5" fill="#191b21"/><path d="M48 43 L52 43" stroke="#191b21" stroke-width="2"/><path d="M35 42 L40 42" stroke="#fff" stroke-width="1.2" opacity=".6"/>',
  strepen: '<rect x="35" y="50" width="11" height="3" rx="1.5" fill="#191b21"/><rect x="54" y="50" width="11" height="3" rx="1.5" fill="#191b21"/>',
  snor: '<path d="M39 54 Q44 48 50 52 Q56 48 61 54 Q56 56 50 54.5 Q44 56 39 54 Z" fill="#3b2a1e"/>',
  skibril: '<rect x="25" y="41" width="50" height="4" fill="#191b21"/><rect x="33" y="37" width="34" height="14" rx="7" fill="#12a1b8" stroke="#191b21" stroke-width="2"/><path d="M37 41 Q45 38 52 41" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7"/>',
  laser: '<path d="M41 45 L100 28 M59 45 L100 38" stroke="#ff2a2a" stroke-width="3" opacity=".35"/><path d="M41 45 L100 28 M59 45 L100 38" stroke="#ff7a7a" stroke-width="1.2"/><circle cx="41" cy="45" r="4" fill="#ff2a2a"/><circle cx="59" cy="45" r="4" fill="#ff2a2a"/><circle cx="41" cy="45" r="1.6" fill="#fff"/><circle cx="59" cy="45" r="1.6" fill="#fff"/>',
  goudbril: '<rect x="33" y="40" width="15" height="9" rx="3.5" fill="#e8b04a" stroke="#b9801a" stroke-width="1.2"/><rect x="52" y="40" width="15" height="9" rx="3.5" fill="#e8b04a" stroke="#b9801a" stroke-width="1.2"/><path d="M48 43 L52 43" stroke="#b9801a" stroke-width="2"/><path d="M35 42 L41 42 M54 42 L60 42" stroke="#fff" stroke-width="1.3" opacity=".8"/>',
};

const bal = (vul, lijn) => `<circle cx="85" cy="86" r="9" fill="${vul}" stroke="${lijn}" stroke-width="1.4"/><path d="M76.5 83 Q85 88 93.5 83 M80 78.5 Q85 86 81 94 M90 78.5 Q85 86 89 94" stroke="${lijn}" stroke-width="1.2" fill="none"/>`;

// Extra: "achter" wordt achter het lichaam getekend, de rest ervoor
const EXTRA = {
  geen: { voor: '' },
  handbal: { voor: bal('#f4f5f7', '#2f6fd6') },
  medaille: { voor: '<path d="M42 74 L50 86 L58 74" stroke="#2f6fd6" stroke-width="3.2" fill="none"/><circle cx="50" cy="88" r="5.5" fill="#e8b04a" stroke="#b9801a" stroke-width="1.2"/><path d="M50 85 L51 87.5 L53.5 87.5 L51.5 89 L52.3 91.5 L50 90 L47.7 91.5 L48.5 89 L46.5 87.5 L49 87.5 Z" fill="#fff"/>' },
  beker: { voor: '<path d="M75 70 L93 70 Q93 85 84 87 Q75 85 75 70 Z" fill="#e8b04a" stroke="#b9801a" stroke-width="1.2"/><path d="M75 73 Q70 73 71 78 Q72 81 76 80 M93 73 Q98 73 97 78 Q96 81 92 80" stroke="#b9801a" stroke-width="1.6" fill="none"/><rect x="82" y="87" width="4" height="5" fill="#b9801a"/><rect x="78" y="92" width="12" height="5" rx="1" fill="#6b4426"/><path d="M80 74 L82 74" stroke="#fff" stroke-width="1.5" opacity=".8"/>' },
  vleugels: { achter: '<path d="M30 82 Q2 74 1 38 Q12 52 20 52 Q14 60 32 64 Z" fill="#fff" stroke="#c9d3e0" stroke-width="1.2"/><path d="M70 82 Q98 74 99 38 Q88 52 80 52 Q86 60 68 64 Z" fill="#fff" stroke="#c9d3e0" stroke-width="1.2"/><path d="M10 50 Q18 64 30 70 M90 50 Q82 64 70 70" stroke="#c9d3e0" stroke-width="1" fill="none"/>', voor: '' },
  goudenbal: { achter: '<circle cx="85" cy="86" r="15" fill="#ffe9a8" opacity=".55"/>', voor: bal('#e8b04a', '#8a5a10') },
};

const sterren = (lijst, k = '#fff') => lijst.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${k}"/>`).join('');
const knal = (cx, cy, k) => [0, 45, 90, 135, 180, 225, 270, 315].map(h => {
  const r = h * Math.PI / 180;
  return `<path d="M${cx + 3 * Math.cos(r)} ${cy + 3 * Math.sin(r)} L${cx + 10 * Math.cos(r)} ${cy + 10 * Math.sin(r)}" stroke="${k}" stroke-width="1.8" stroke-linecap="round"/>`;
}).join('');

const ACHTERGROND = {
  sporthal: '<rect width="100" height="100" fill="#d9a35a"/>' + [12, 30, 48, 66, 84].map(y => `<rect y="${y}" width="100" height="1.5" fill="#c48a43"/>`).join('')
    + '<path d="M-10 100 Q50 40 110 100" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>',
  nacht: '<rect width="100" height="100" fill="#1b2a4a"/>' + sterren([[8, 10, 1.2], [20, 30, .8], [84, 12, 1.4], [92, 34, .9], [12, 58, 1], [88, 60, 1.1], [70, 6, .8], [30, 6, 1]])
    + '<circle cx="86" cy="22" r="7" fill="#f4ead0"/><circle cx="89" cy="20" r="6" fill="#1b2a4a"/>',
  regenboog: ['#d2142c', '#ff6a1a', '#e8b04a', '#13865b', '#2f6fd6', '#8a5cd6'].map((k, i) => `<rect y="${i * 16.67}" width="100" height="17" fill="${k}"/>`).join(''),
  ruimte: '<rect width="100" height="100" fill="#0b0b1e"/>' + sterren([[6, 8, 1], [18, 26, .7], [90, 50, 1], [12, 62, .8], [64, 4, .9], [30, 12, .6], [94, 8, .7], [8, 88, .9]])
    + '<circle cx="84" cy="20" r="9" fill="#8a5cd6"/><ellipse cx="84" cy="20" rx="15" ry="3.5" fill="none" stroke="#e0457b" stroke-width="2"/><circle cx="14" cy="40" r="4" fill="#12a1b8"/>',
  vuurwerk: '<rect width="100" height="100" fill="#14143a"/>' + knal(16, 18, '#e0457b') + knal(84, 14, '#e8b04a') + knal(88, 52, '#12a1b8') + knal(12, 56, '#2fbf86')
    + sterren([[50, 4, .8], [30, 34, .7], [70, 32, .7]]),
};

// SVG-tekst van een avatar. rugnummer komt op het shirt (enkel cijfers worden getoond).
export function avatarSvg(cfg, rugnummer = null) {
  const a = normaliseerAvatar(cfg);
  const huid = zoek('huid', a.huid).hex, haar = zoek('haarkleur', a.haarkleur).hex;
  const shirt = zoek('shirt', a.shirt), extra = EXTRA[a.extra];
  const bg = ACHTERGROND[a.achtergrond] || `<rect width="100" height="100" fill="${zoek('achtergrond', a.achtergrond).hex}"/>`;
  const nr = String(rugnummer ?? '').replace(/\D/g, '').slice(0, 2);
  const glans = a.shirt === 'diamant' ? '<path d="M30 86 L33 83 L36 86 L33 89 Z M64 82 L66 80 L68 82 L66 84 Z M70 92 L72 90 L74 92 L72 94 Z" fill="#fff"/>' : '';
  // Regenbooghaar: kleurverloop (zelfde id in elke avatar op de pagina, de inhoud is ook altijd dezelfde)
  const verloop = a.haarkleur === 'regenboog' ? `<defs><linearGradient id="av-regenboog" x1="0" y1="0" x2="1" y2="0">${
    ['#d2142c', '#ff6a1a', '#e8b04a', '#13865b', '#2f6fd6', '#8a5cd6'].map((k, i) => `<stop offset="${i * 20}%" stop-color="${k}"/>`).join('')
  }</linearGradient></defs>` : '';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar">
${verloop}${bg}${extra.achter || ''}
<path d="M16 100 Q18 76 50 73 Q82 76 84 100 Z" fill="${shirt.hex}"${shirt.rand ? ` stroke="${shirt.rand}" stroke-width="2"` : ''}/>${glans}
<rect x="43" y="62" width="14" height="13" fill="${huid}"/>
<path d="M43 73 Q50 80 57 73" fill="none" stroke="${shirt.nr || '#fff'}" stroke-width="1.6" opacity=".7"/>
${nr ? `<text x="50" y="95" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="15" fill="${shirt.nr || '#fff'}">${nr}</text>` : ''}
<circle cx="28" cy="47" r="5" fill="${huid}"/><circle cx="72" cy="47" r="5" fill="${huid}"/>
<ellipse cx="50" cy="44" rx="22" ry="24" fill="${huid}"/>
${haarSvg(a.haar, haar)}${OGEN[a.ogen]}${MOND[a.mond]}${GEZICHT[a.gezicht]}${HOOFD[a.hoofd]}${extra.voor}
</svg>`;
}
