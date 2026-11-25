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
