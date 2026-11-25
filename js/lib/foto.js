// Berekeningen voor profielfoto's (zonder DOM, testbaar)

export const FOTO_ZIJDE = 400;           // opgeslagen als 400x400 jpg
export const fotoPad = playerId => `${playerId}.jpg`;

// Vierkante uitsnede: breed = midden, hoog = iets boven het midden (daar zit meestal het gezicht)
export function vierkantUitsnede(breedte, hoogte) {
  const zijde = Math.min(breedte, hoogte);
  return {
    sx: Math.round((breedte - zijde) / 2),
    sy: Math.round((hoogte - zijde) * 0.2),
    zijde,
  };
}

// Uitsnede in een vaste verhouding (breedte/hoogte). Te hoog: iets boven het midden (gezichten); te breed: midden.
export function uitsnede(breedte, hoogte, verhouding) {
  if (breedte / hoogte > verhouding) {
    const b = Math.round(hoogte * verhouding);
    return { sx: Math.round((breedte - b) / 2), sy: 0, b, h: hoogte };
  }
  const h = Math.round(breedte / verhouding);
  return { sx: 0, sy: Math.round((hoogte - h) * 0.25), b: breedte, h };
}

// Effen lichte rand (bv. een witte kader rond een foto) opsporen.
// px: helderheid per pixel (0-255), rij per rij. Geeft het deel zonder rand terug.
// Een rij/kolom telt als rand als 97% van de pixels lichter is dan 235; we zoeken maximaal 15% diep.
export function effenRand(px, b, h) {
  const licht = v => v > 235;
  const rijLicht = y => { let n = 0; for (let x = 0; x < b; x++) if (licht(px[y * b + x])) n++; return n / b >= 0.97; };
  const kolLicht = x => { let n = 0; for (let y = 0; y < h; y++) if (licht(px[y * b + x])) n++; return n / h >= 0.97; };
  let boven = 0, onder = 0, links = 0, rechts = 0;
  while (boven < h * 0.15 && rijLicht(boven)) boven++;
  while (onder < h * 0.15 && rijLicht(h - 1 - onder)) onder++;
  while (links < b * 0.15 && kolLicht(links)) links++;
  while (rechts < b * 0.15 && kolLicht(b - 1 - rechts)) rechts++;
  // Alles licht (lege/witte foto)? Dan niets wegknippen.
  if (boven >= h * 0.15 && links >= b * 0.15) return { x: 0, y: 0, b, h };
  return { x: links, y: boven, b: b - links - rechts, h: h - boven - onder };
}
