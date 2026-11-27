// Iets in het logboek van de trainer zetten. Mag nooit de app hinderen: fouten hierbij worden genegeerd.
import { sb } from './supabase.js';

export function log(actie, details = null) {
  if (!sb) return;
  sb.rpc('log_actie', { actie, details }).then(() => {}, () => {});
}

// Fouten die een gebruiker te zien krijgt of die onverwacht optreden: maximaal 10 per bezoek, geen dubbels.
let aantal = 0;
const gezien = new Set();
export function logFout(bericht) {
  const tekst = `${String(bericht).slice(0, 300)} (op ${location.hash || '#/'}, ${navigator.userAgent.match(/iPhone|Android|Windows|Mac/)?.[0] ?? 'onbekend toestel'})`;
  if (aantal >= 10 || gezien.has(tekst)) return;
  aantal++; gezien.add(tekst);
  log('fout', tekst);
}

window.addEventListener('error', e => logFout(e.message || 'Onbekende fout'));
window.addEventListener('unhandledrejection', e => logFout(e.reason?.message || String(e.reason)));
