// Profielfoto's: verkleinen in de browser, uploaden naar Supabase Storage, tijdelijke links ophalen.
import { sb } from './supabase.js';
import { esc, melding } from './ui.js';
import { FOTO_ZIJDE, fotoPad, uitsnede, effenRand } from './lib/foto.js';
import { avatarSvg } from './lib/avatar.js';

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

// Foto bijsnijden in een verhouding en verkleinen tot doelbreedte (jpg)
// Witte kader rond een foto opsporen op een verkleinde kopie, en terugrekenen naar de echte foto
function regioZonderRand(bron) {
  const kb = 300, kh = Math.max(1, Math.round((300 * bron.height) / bron.width));
  const klein = document.createElement('canvas');
  klein.width = kb; klein.height = kh;
  const ctx = klein.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bron, 0, 0, kb, kh);
  const data = ctx.getImageData(0, 0, kb, kh).data;
  const px = new Uint8Array(kb * kh);
  for (let i = 0; i < px.length; i++) px[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
  const r = effenRand(px, kb, kh);
  const s = bron.width / kb, marge = r.x || r.y ? 2 : 0;   // net iets ruimer wegknippen tegen een lichte zoom
  const x = Math.min(bron.width - 1, Math.ceil(r.x * s) + marge), y = Math.min(bron.height - 1, Math.ceil(r.y * s) + marge);
  return { x, y, b: Math.max(1, Math.floor(r.b * s) - 2 * marge), h: Math.max(1, Math.floor(r.h * s) - 2 * marge) };
}

async function naarJpg(file, verhouding, doelBreedte, { randWeg = false } = {}) {
  const bron = await createImageBitmap(file).catch(() => null);
  if (!bron) throw new Error('Deze foto kan niet gelezen worden. Probeer een JPG of PNG.');
  const regio = randWeg ? regioZonderRand(bron) : { x: 0, y: 0, b: bron.width, h: bron.height };
  const u = uitsnede(regio.b, regio.h, verhouding);
  const sx = regio.x + u.sx, sy = regio.y + u.sy, b = u.b, h = u.h;
  const doek = document.createElement('canvas');
  doek.width = Math.min(doelBreedte, b);
  doek.height = Math.round(doek.width / verhouding);
  doek.getContext('2d').drawImage(bron, sx, sy, b, h, 0, 0, doek.width, doek.height);
  return new Promise((ok, nok) => doek.toBlob(b => b ? ok(b) : nok(new Error('Foto verkleinen mislukt.')), 'image/jpeg', 0.85));
}

export async function uploadFoto(playerId, file) {
  const blob = await naarJpg(file, 1, FOTO_ZIJDE);
  const { error } = await sb.storage.from(BUCKET).upload(fotoPad(playerId), blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw new Error(/bucket not found|not found/i.test(error.message)
    ? 'De fotomap bestaat nog niet. De trainer moet eerst update-4-fotos.sql uitvoeren in Supabase.' : error.message);
}

export async function verwijderFoto(playerId) {
  const { error } = await sb.storage.from(BUCKET).remove([fotoPad(playerId)]);
  if (error) throw new Error(error.message);
}

// Avatar (als de speler die kiest, of geen foto heeft), anders foto, anders rugnummer
export function avatarHtml(url, rugnummer, extraKlasse = '', speler = null) {
  if (speler?.avatar && (speler.toon_avatar || !url)) {
    return `<div class="nummer avatar getekend ${extraKlasse}">${avatarSvg(speler.avatar, rugnummer)}</div>`;
  }
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

// ---------- Ploegfoto (breedbeeld, voor de startpagina) ----------
const PLOEG = 'ploeg.jpg';

export async function ploegFotoUrl() {
  try {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(PLOEG, 3600);
    return error ? null : data?.signedUrl ?? null;
  } catch { return null; }
}

export async function uploadPloegFoto(file) {
  const blob = await verwerkPloegFoto(file);
  const { error } = await sb.storage.from(BUCKET).upload(PLOEG, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw new Error(/bucket not found/i.test(error.message)
    ? 'De fotomap bestaat nog niet. Voer eerst update-4-fotos.sql uit in Supabase.' : error.message);
}

// Ploegfoto: witte kader weg, breedbeeld 16:9, max 1600 px breed
export const verwerkPloegFoto = file => naarJpg(file, 16 / 9, 1600, { randWeg: true });
