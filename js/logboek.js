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

// "Script error." = de browser verbergt de details (fout in een script van een andere site); bestand en regel helpen dan toch
window.addEventListener('error', e => logFout(/^script error.?$/i.test(e.message || '')
  ? `Onbekende fout in een extern script (de browser gaf geen details)${e.filename ? ` in ${e.filename.split('/').pop()}` : ''}`
  : `${e.message || 'Onbekende fout'}${e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''}`));
window.addEventListener('unhandledrejection', e => logFout(e.reason?.message || String(e.reason)));
