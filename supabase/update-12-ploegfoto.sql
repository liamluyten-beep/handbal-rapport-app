-- =========================================================
-- Update 12: ploegfoto op de startpagina
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- De ploegfoto (ploeg.jpg) staat in dezelfde afgeschermde map als de profielfoto's:
-- iedereen die ingelogd is mag ze zien, enkel de trainer mag ze wijzigen (dat kon al).
-- =========================================================

drop policy if exists "ploegfoto lezen" on storage.objects;
create policy "ploegfoto lezen" on storage.objects for select to authenticated
  using (bucket_id = 'profielfotos' and name = 'ploeg.jpg');
