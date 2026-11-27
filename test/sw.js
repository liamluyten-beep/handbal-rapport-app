// Service worker: maakt de site installeerbaar als app en laat ze openen bij een slechte verbinding.
// Altijd eerst het netwerk (zodat updates meteen zichtbaar zijn); enkel zonder verbinding de bewaarde kopie.
// Gegevens van Supabase gaan hier niet door (ander domein).
const CACHE = 'handbal-v2';

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
      if (antwoord.ok) (await caches.open(CACHE)).put(e.request, antwoord.clone());
      return antwoord;
    } catch {
      return (await caches.match(e.request, { ignoreSearch: true })) || (await caches.match('./')) || Response.error();
    }
  })());
});
