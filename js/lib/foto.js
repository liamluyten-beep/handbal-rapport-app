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
