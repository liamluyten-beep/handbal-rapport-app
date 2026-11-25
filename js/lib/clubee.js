// Inlezen van Clubee-pagina's (competitie-overzicht en "Line up statistics").
// Werkt zonder DOM, zodat het zowel in Node (ophaalscript) als in de browser draait.

function decodeer(t) {
  return t.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

// HTML -> "|cel|cel|cel|" (tekstknopen gescheiden door |)
export function naarCellen(html) {
  const zonder = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  return decodeer(zonder.replace(/<[^>]+>/g, '|')).replace(/\|[\s|]*/g, '|');
}

const naarIso = d => { const [dd, mm, jj] = d.split('/'); return `${jj}-${mm}-${dd}`; };

// Alle GESPEELDE wedstrijden waarin een ploeg met `ploegFilter` in de naam speelt
export function parseCompetitie(html, ploegFilter) {
  const res = new Map();
  const filter = ploegFilter.toLowerCase();
  const linkRe = /href="\/[^"]*\/games\/(\d+)"/g;
  let m, vorige = 0;
  while ((m = linkRe.exec(html))) {
    const start = html.lastIndexOf('_date', m.index);
    if (start < vorige) { vorige = m.index; continue; }
    vorige = m.index;
    const cellen = naarCellen('<x ' + html.slice(start, m.index)).split('|').map(s => s.trim()).filter(Boolean);
    const di = cellen.findIndex(c => /^\d{2}\/\d{2}\/\d{4}$/.test(c));
    const si = cellen.indexOf(':');
    if (di < 0 || si < 2) continue;
    const [thuis, a, , b, uit] = cellen.slice(si - 2, si + 3);
    if (!/^\d+$/.test(a) || !/^\d+$/.test(b) || !thuis || !uit) continue; // niet gespeeld
    if (!thuis.toLowerCase().includes(filter) && !uit.toLowerCase().includes(filter)) continue;
    const id = Number(m[1]);
    res.set(id, { clubee_id: id, datum: naarIso(cellen[di]), thuis, uit, score_thuis: Number(a), score_uit: Number(b) });
  }
  return [...res.values()].sort((x, y) => x.datum.localeCompare(y.datum));
}

const KOLOMMEN = { MP: 'gespeeld', G: 'goals', '7MS': 'zeven_m', '7MM': 'zeven_m_mis', YC: 'geel', '2MIN': 'twee_min', BC: 'blauw', RC: 'rood' };

// Statistieken van één ploeg uit de "Line up statistics"-pagina
export function parseLineup(html, ploegFilter) {
  const c = naarCellen(html).split('|');
  const filter = ploegFilter.toLowerCase();
  for (let i = 0; i < c.length - 2; i++) {
    if (c[i + 1] !== '#' || c[i + 2] !== 'Player' || !c[i].toLowerCase().includes(filter)) continue;
    let j = i + 3;
    const kop = [];
    while (j < c.length && KOLOMMEN[c[j]]) kop.push(KOLOMMEN[c[j++]]);
    const spelers = [];
    while (j + 1 + kop.length < c.length && /^\d+$/.test(c[j])) {
      const sp = { nr: Number(c[j]), initialen: initialenVanClubee(c[j + 1]) };
      kop.forEach((k, n) => { sp[k] = Number(c[j + 2 + n]) || 0; });
      spelers.push(sp);
      j += 2 + kop.length;
    }
    return spelers;
  }
  return [];
}

// "N... L..." -> "N L"
function initialenVanClubee(t) {
  return t.split(/\s+/).map(w => w.replace(/\.+$/, '')).filter(Boolean).map(w => w[0].toUpperCase()).join(' ');
}

const zonderAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// "Nyo Luyten" -> "N L", "Emma De Smet" -> "E D"
export function initialenVan(naam) {
  const w = zonderAccent(naam || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '';
  return w.length === 1 ? w[0][0].toUpperCase() : `${w[0][0]} ${w[1][0]}`.toUpperCase();
}

// "Biobest Sasja U16 VHV R (U16 M/F)" -> "Biobest Sasja"
export function korteNaam(ploeg) {
  return ploeg.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+U\d+\b.*$/, '').trim();
}

// Zoek de speler bij een Clubee-regel. Enkel bij zekerheid, anders null.
export function koppelClubeeSpeler({ nr, initialen }, spelers) {
  const kandidaten = spelers.filter(s => initialenVan(s.naam) === initialen);
  const metNummer = kandidaten.filter(s => s.rugnummer != null && Number(s.rugnummer) === nr);
  if (metNummer.length === 1) return metNummer[0];
  if (kandidaten.length === 1) return kandidaten[0];
  return null;
}

const STATS = ['zeven_m', 'zeven_m_mis', 'geel', 'twee_min', 'blauw', 'rood'];

// Zet data/clubee.json om naar rijen voor de database.
// keuzes: { "nr|initialen": player_id of "" (= overslaan) } — overschrijft de automatische koppeling.
export function bouwClubeeImport(data, spelers, keuzes = {}) {
  const ploeg = data.ploeg.toLowerCase();
  const wedstrijden = data.wedstrijden.map(w => {
    const thuis = w.thuis.toLowerCase().includes(ploeg);
    return {
      clubee_id: w.clubee_id, datum: w.datum, tegenstander: korteNaam(thuis ? w.uit : w.thuis), thuis,
      score_voor: thuis ? w.score_thuis : w.score_uit, score_tegen: thuis ? w.score_uit : w.score_thuis,
    };
  });

  const lijst = new Map();
  for (const w of data.wedstrijden) for (const s of w.spelers || []) {
    const sleutel = `${s.nr}|${s.initialen}`;
    const r = lijst.get(sleutel) || { sleutel, nr: s.nr, initialen: s.initialen, wedstrijden: 0, goals: 0 };
    r.wedstrijden += 1; r.goals += s.goals || 0;
    lijst.set(sleutel, r);
  }
  const spelersLijst = [...lijst.values()].sort((a, b) => a.nr - b.nr).map(r => {
    const auto = koppelClubeeSpeler(r, spelers)?.id ?? null;
    const gekozen = sleutelIn(keuzes, r.sleutel) ? (keuzes[r.sleutel] || null) : auto;
    return { ...r, auto, gekozen };
  });
  const naarSpeler = Object.fromEntries(spelersLijst.map(r => [r.sleutel, r.gekozen]));

  const goals = new Map();
  for (const w of data.wedstrijden) for (const s of w.spelers || []) {
    const player_id = naarSpeler[`${s.nr}|${s.initialen}`];
    if (!player_id) continue;
    const k = `${w.clubee_id}|${player_id}`;
    const g = goals.get(k) || { clubee_id: w.clubee_id, player_id, aantal: 0, ...Object.fromEntries(STATS.map(x => [x, 0])) };
    g.aantal += s.goals || 0;
    STATS.forEach(x => { g[x] += s[x] || 0; });
    goals.set(k, g);
  }
  return { wedstrijden, spelers: spelersLijst, goals: [...goals.values()] };
}

const sleutelIn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
