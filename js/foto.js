// Profielfoto's: verkleinen in de browser, uploaden naar Supabase Storage, tijdelijke links ophalen.
import { sb } from './supabase.js';
import { esc, melding } from './ui.js';
import { FOTO_ZIJDE, fotoPad, vierkantUitsnede } from './lib/foto.js';

const BUCKET = 'profielfotos';

// { playerId: url } voor de spelers die een foto hebben. Stil leeg als de opslag nog niet bestaat.
export async function fotoUrls(ids) {
  if (!ids.length) return {};
  try {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(ids.map(fotoPad), 3600);
    if (error || !data) return {};
    const urls = {};
    data.forEach((d, i) => { if (!d.error && d.signedUrl) urls[ids[i]] = d.signedUrl; });
    return urls;
  } catch { return {}; }
}

async function naarVierkantJpg(file) {
  const bron = await createImageBitmap(file).catch(() => null);
  if (!bron) throw new Error('Deze foto kan niet gelezen worden. Probeer een JPG of PNG.');
  const { sx, sy, zijde } = vierkantUitsnede(bron.width, bron.height);
  const doek = document.createElement('canvas');
  doek.width = doek.height = FOTO_ZIJDE;
  doek.getContext('2d').drawImage(bron, sx, sy, zijde, zijde, 0, 0, FOTO_ZIJDE, FOTO_ZIJDE);
  return new Promise((ok, nok) => doek.toBlob(b => b ? ok(b) : nok(new Error('Foto verkleinen mislukt.')), 'image/jpeg', 0.85));
}

export async function uploadFoto(playerId, file) {
  const blob = await naarVierkantJpg(file);
  const { error } = await sb.storage.from(BUCKET).upload(fotoPad(playerId), blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw new Error(/bucket not found|not found/i.test(error.message)
    ? 'De fotomap bestaat nog niet. De trainer moet eerst update-4-fotos.sql uitvoeren in Supabase.' : error.message);
}

export async function verwijderFoto(playerId) {
  const { error } = await sb.storage.from(BUCKET).remove([fotoPad(playerId)]);
  if (error) throw new Error(error.message);
}

// Foto (of rugnummer als er geen foto is)
export function avatarHtml(url, rugnummer, extraKlasse = '') {
  return url
    ? `<div class="nummer avatar ${extraKlasse}"><img src="${esc(url)}" alt="">${rugnummer != null ? `<span class="avatar-nr">${esc(rugnummer)}</span>` : ''}</div>`
    : `<div class="nummer ${extraKlasse}">${esc(rugnummer ?? '?')}</div>`;
}

// Knoppen "Foto kiezen" / "Foto verwijderen" koppelen (ids: fotoKies, fotoBestand, fotoWeg)
export function koppelFotoKnoppen(playerId, heeftFoto, herlaad) {
  const kies = document.getElementById('fotoKies');
  const bestand = document.getElementById('fotoBestand');
  const weg = document.getElementById('fotoWeg');
  if (!kies || !bestand) return;
  kies.onclick = () => bestand.click();
  bestand.onchange = async () => {
    const file = bestand.files[0];
    if (!file) return;
    kies.disabled = true; kies.textContent = 'Uploaden…';
    try { await uploadFoto(playerId, file); melding('Foto opgeslagen'); herlaad(); }
    catch (err) { melding(err.message, 'fout'); kies.disabled = false; kies.textContent = heeftFoto ? 'Foto wijzigen' : 'Foto toevoegen'; }
  };
  if (weg) weg.onclick = async () => {
    if (!confirm('Profielfoto verwijderen?')) return;
    try { await verwijderFoto(playerId); melding('Foto verwijderd'); herlaad(); }
    catch (err) { melding(err.message, 'fout'); }
  };
}

export function fotoKnoppenHtml(heeftFoto) {
  return `<button type="button" class="knop tweede" id="fotoKies">${heeftFoto ? 'Foto wijzigen' : 'Foto toevoegen'}</button>
    ${heeftFoto ? '<button type="button" class="knop-link zacht" id="fotoWeg">Foto verwijderen</button>' : ''}
    <input type="file" id="fotoBestand" accept="image/*" hidden>`;
}
