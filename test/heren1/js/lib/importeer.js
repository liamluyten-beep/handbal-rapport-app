// Inlezen van goals uit geplakte tekst of CSV (bv. een export uit Clubee of Excel).
// Verwachte kolommen: datum, tegenstander, speler (naam of rugnummer), goals.

function detecteerScheiding(regel) {
  if (regel.includes('\t')) return '\t';
  if (regel.includes(';')) return ';';
  return ',';
}

function splitsRegel(regel, sep) {
  // Eenvoudige CSV met ondersteuning voor "aanhalingstekens"
  const velden = [];
  let huidig = '', inQuotes = false;
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i];
    if (c === '"') {
      if (inQuotes && regel[i + 1] === '"') { huidig += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === sep && !inQuotes) {
      velden.push(huidig); huidig = '';
    } else huidig += c;
  }
  velden.push(huidig);
  return velden.map(v => v.trim());
}

export function naarIsoDatum(tekst) {
  const t = tekst.trim();
  let j, m, d;
  let r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (r) [, j, m, d] = r;
  else if ((r = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [, d, m, j] = r;
  else return null;
  const dt = new Date(Date.UTC(+j, +m - 1, +d));
  if (dt.getUTCFullYear() !== +j || dt.getUTCMonth() !== +m - 1 || dt.getUTCDate() !== +d) return null;
  return `${j}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function isHeader(velden) {
  return /datum|date/i.test(velden[0] || '');
}

export function parseGoalsTekst(tekst) {
  const rijen = [], fouten = [];
  const regels = (tekst || '').split(/\r?\n/);
  if (!regels.some(r => r.trim())) return { rijen, fouten };
  const sep = detecteerScheiding(regels.find(r => r.trim()));

  regels.forEach((regel, i) => {
    if (!regel.trim()) return;
    const nr = i + 1;
    const velden = splitsRegel(regel, sep);
    if (isHeader(velden)) return;
    if (velden.length < 4) {
      fouten.push(`Regel ${nr}: verwacht 4 kolommen (datum, tegenstander, speler, goals), gevonden ${velden.length}.`);
      return;
    }
    const [datumTxt, tegenstander, speler, goalsTxt] = velden;
    const datum = naarIsoDatum(datumTxt);
    if (!datum) { fouten.push(`Regel ${nr}: ongeldige datum "${datumTxt}".`); return; }
    if (!/^\d+$/.test(goalsTxt)) { fouten.push(`Regel ${nr}: aantal goals "${goalsTxt}" is geen getal.`); return; }
    if (!tegenstander) { fouten.push(`Regel ${nr}: tegenstander ontbreekt.`); return; }
    if (!speler) { fouten.push(`Regel ${nr}: speler ontbreekt.`); return; }
    rijen.push({ datum, tegenstander, speler, goals: Number(goalsTxt) });
  });
  return { rijen, fouten };
}

export function normaliseer(naam) {
  return (naam || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

export function koppelSpeler(spelerTekst, spelers) {
  const t = (spelerTekst || '').trim().replace(/^#/, '');
  if (/^\d+$/.test(t)) {
    return spelers.find(s => s.rugnummer != null && Number(s.rugnummer) === Number(t)) || null;
  }
  const n = normaliseer(t);
  return spelers.find(s => normaliseer(s.naam) === n) || null;
}

// Spelerslijst inlezen: per regel "naam;rugnummer" (rugnummer mag ontbreken of eerst staan).
export function parseSpelersTekst(tekst) {
  const rijen = [], fouten = [], gezien = new Set();
  const regels = (tekst || '').split(/\r?\n/);
  if (!regels.some(r => r.trim())) return { rijen, fouten };
  regels.forEach((regel, i) => {
    if (!regel.trim()) return;
    const nr = i + 1;
    let velden = splitsRegel(regel, detecteerScheiding(regel)).filter((v, j) => j < 2);
    if (/^(naam|name|speler)$/i.test(velden[0] || '')) return; // header
    if (velden.length === 2 && /^#?\d+$/.test(velden[0]) && !/^#?\d*$/.test(velden[1])) velden = [velden[1], velden[0]];
    const [naam, nummerTxt = ''] = velden.map(v => v.trim());
    if (!naam) { fouten.push(`Regel ${nr}: naam ontbreekt.`); return; }
    let rugnummer = null;
    if (nummerTxt !== '') {
      const n = nummerTxt.replace(/^#/, '');
      if (!/^\d+$/.test(n) || Number(n) > 99) {
        fouten.push(`Regel ${nr}: rugnummer "${nummerTxt}" is ongeldig (0 tot 99).`); return;
      }
      rugnummer = Number(n);
    }
    const sleutel = normaliseer(naam);
    if (gezien.has(sleutel)) { fouten.push(`Regel ${nr}: "${naam}" staat dubbel in de lijst.`); return; }
    gezien.add(sleutel);
    rijen.push({ naam: naam.replace(/\s+/g, ' '), rugnummer });
  });
  return { rijen, fouten };
}

// Filter een spelerslijst op (deel van) naam of op rugnummer
export function zoekSpelers(spelers, tekst) {
  const t = normaliseer(tekst);
  if (!t) return spelers;
  return spelers.filter(s => normaliseer(s.naam).includes(t) || (s.rugnummer != null && String(s.rugnummer) === t));
}
