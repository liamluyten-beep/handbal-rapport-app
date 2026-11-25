// Posities op het veld. Een speler heeft er maximum 2, opgeslagen als "A, B".
export const POSITIES = ['Doelman', 'Linkerhoek', 'Linkeropbouw', 'Spelverdeler', 'Rechteropbouw', 'Rechterhoek', 'Cirkelloper'];
export const MAX_POSITIES = 2;

export function leesPosities(tekst) {
  return (tekst || '').split(',').map(s => s.trim()).filter(Boolean);
}

// Geeft een foutboodschap terug, of null als alles in orde is
export function controleerPosities(lijst) {
  if (lijst.length > MAX_POSITIES) return `Kies maximum ${MAX_POSITIES} posities.`;
  const onbekend = lijst.find(p => !POSITIES.includes(p));
  if (onbekend) return `Onbekende positie: ${onbekend}.`;
  if (new Set(lijst).size !== lijst.length) return 'Een positie staat er dubbel in.';
  return null;
}

// Aanvinkvakjes; na 2 vinkjes worden de andere uitgeschakeld (zie koppelPositieVakjes)
export function positieVakjesHtml(gekozen, naam = 'posities') {
  return `<div class="posities" data-max="${MAX_POSITIES}">${POSITIES.map(p => `
    <label class="positie"><input type="checkbox" name="${naam}" value="${p}" ${gekozen.includes(p) ? 'checked' : ''}>
      <span>${p}</span></label>`).join('')}</div>`;
}

export function koppelPositieVakjes(root) {
  root.querySelectorAll('.posities').forEach(groep => {
    const vakjes = [...groep.querySelectorAll('input[type=checkbox]')];
    const bijwerken = () => {
      const vol = vakjes.filter(v => v.checked).length >= MAX_POSITIES;
      vakjes.forEach(v => { v.disabled = vol && !v.checked; });
    };
    vakjes.forEach(v => v.addEventListener('change', bijwerken));
    bijwerken();
  });
}
