// Service worker: maakt de site installeerbaar als app en laat ze openen bij een slechte verbinding.
// Altijd eerst het netwerk (zodat updates meteen zichtbaar zijn); enkel zonder verbinding de bewaarde kopie.
// Gegevens van Supabase gaan hier niet door (ander domein).
const CACHE = 'handbal-v4';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      // cache: no-cache = altijd bij GitHub nagaan of er een nieuwere versie is (anders tot 10 min een oude kopie)
      const antwoord = await fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' });
      // Eén kopie per bestand: het deel na ? (bv. ?t=tijdstip) niet meebewaren, anders groeit de opslag eindeloos
      if (antwoord.ok) (await caches.open(CACHE)).put(url.origin + url.pathname, antwoord.clone());
      return antwoord;
    } catch {
      // Enkel bij het openen van een pagina terugvallen op de startpagina, nooit voor een codebestand
      return (await caches.match(url.origin + url.pathname)) ||
        (e.request.mode === 'navigate' ? await caches.match(new URL('./', self.registration.scope).href) : null) || Response.error();
    }
  })());
});
