-- =========================================================
-- Update 4: profielfoto's
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- Foto's staan in een AFGESCHERMDE map: enkel de speler zelf en de trainer kunnen ze zien.
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profielfotos', 'profielfotos', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

-- Trainer: alle foto's bekijken, plaatsen en verwijderen
drop policy if exists "foto trainer" on storage.objects;
create policy "foto trainer" on storage.objects for all to authenticated
  using (bucket_id = 'profielfotos' and public.is_trainer())
  with check (bucket_id = 'profielfotos' and public.is_trainer());

-- Speler: enkel zijn eigen foto (bestandsnaam = <speler-id>.jpg)
drop policy if exists "foto eigen lezen" on storage.objects;
create policy "foto eigen lezen" on storage.objects for select to authenticated
  using (bucket_id = 'profielfotos' and name = public.my_player_id()::text || '.jpg');

drop policy if exists "foto eigen plaatsen" on storage.objects;
create policy "foto eigen plaatsen" on storage.objects for insert to authenticated
  with check (bucket_id = 'profielfotos' and name = public.my_player_id()::text || '.jpg');

drop policy if exists "foto eigen vervangen" on storage.objects;
create policy "foto eigen vervangen" on storage.objects for update to authenticated
  using (bucket_id = 'profielfotos' and name = public.my_player_id()::text || '.jpg')
  with check (bucket_id = 'profielfotos' and name = public.my_player_id()::text || '.jpg');

drop policy if exists "foto eigen verwijderen" on storage.objects;
create policy "foto eigen verwijderen" on storage.objects for delete to authenticated
  using (bucket_id = 'profielfotos' and name = public.my_player_id()::text || '.jpg');
