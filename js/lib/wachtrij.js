// Wachtrij voor acties die nog naar de server moeten (slechte wifi in de sporthal)

export function zetInWachtrij(wachtrij, actie) {
  if (actie.op === 'delete' && wachtrij.some(o => o.op === 'insert' && o.rij.id === actie.id)) {
    return wachtrij.filter(o => !(o.op === 'insert' && o.rij.id === actie.id));
  }
  return [...wachtrij, actie];
}

// Wat de gebruiker moet zien: de server-rijen met de wachtende acties erop toegepast
export function pasToeOpLijst(server, wachtrij) {
  let lijst = [...server];
  for (const o of wachtrij) {
    if (o.op === 'insert') lijst = [...lijst.filter(r => r.id !== o.rij.id), o.rij];   // nieuw of bijgewerkt
    if (o.op === 'delete') lijst = lijst.filter(r => r.id !== o.id);
  }
  return lijst;
}
