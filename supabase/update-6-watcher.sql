-- =========================================================
-- Update 6: matchwatcher-rol + live statistieken voor de trainer
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

-- ---------- Nieuwe rol: watcher ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('trainer', 'speler', 'watcher'));

create or replace function public.is_watcher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'watcher');
$$;

-- Trainer geeft (of neemt) iemand de watcher-rol. Trainer-rol kan zo niet uitgedeeld worden.
create or replace function public.zet_rol(gebruiker uuid, rol text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trainer() then raise exception 'Enkel de trainer kan rollen wijzigen.'; end if;
  if rol not in ('speler', 'watcher') then raise exception 'Ongeldige rol.'; end if;
  if gebruiker = auth.uid() then raise exception 'Je kunt je eigen rol niet wijzigen.'; end if;
  if exists (select 1 from public.profiles where id = gebruiker and role = 'trainer') then
    raise exception 'De rol van een trainer kan hier niet gewijzigd worden.';
  end if;
  update public.profiles set role = rol where id = gebruiker;
  if not found then raise exception 'Account niet gevonden.'; end if;
end;
$$;
revoke all on function public.zet_rol(uuid, text) from public, anon;
grant execute on function public.zet_rol(uuid, text) to authenticated;

-- ---------- Wat mag de watcher? ----------
-- Spelerslijst lezen (naam + nummer om te kunnen kiezen)
drop policy if exists players_watcher on public.players;
create policy players_watcher on public.players for select using (public.is_watcher());

-- Wedstrijd aanmaken (lezen kon al)
drop policy if exists matches_watcher_insert on public.matches;
create policy matches_watcher_insert on public.matches for insert with check (public.is_watcher());

-- Live gebeurtenissen ingeven, aanpassen en wissen
drop policy if exists events_watcher on public.match_events;
create policy events_watcher on public.match_events for all
  using (public.is_watcher()) with check (public.is_watcher());

-- ---------- Gedeelde wedstrijdklok ----------
alter table public.matches add column if not exists klok jsonb;

create or replace function public.zet_klok(wedstrijd uuid, klok jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_trainer() or public.is_watcher()) then raise exception 'Geen toegang.'; end if;
  update public.matches set klok = zet_klok.klok where id = wedstrijd;
end;
$$;
revoke all on function public.zet_klok(uuid, jsonb) from public, anon;
grant execute on function public.zet_klok(uuid, jsonb) to authenticated;

-- ---------- Live updates (Supabase Realtime) ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'match_events') then
    alter publication supabase_realtime add table public.match_events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'matches') then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;

notify pgrst, 'reload schema';
