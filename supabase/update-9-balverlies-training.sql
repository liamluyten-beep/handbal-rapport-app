-- =========================================================
-- Update 9: balverlies (live), aanwezigheden op training, trainer zet wachtwoord
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

-- ---------- Balverlies als nieuwe live gebeurtenis ----------
alter table public.match_events drop constraint if exists match_events_soort_check;
alter table public.match_events add constraint match_events_soort_check
  check (soort in ('schot', 'tegengoal', 'twee_min', 'twee_min_tegen', 'balverlies'));

-- ---------- Trainingen en aanwezigheden ----------
create table if not exists public.trainingen (
  id         uuid primary key default gen_random_uuid(),
  datum      date not null unique,
  notitie    text,
  created_at timestamptz not null default now()
);

create table if not exists public.aanwezigheden (
  training_id uuid not null references public.trainingen(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  status      text not null check (status in ('aanwezig', 'verwittigd', 'afwezig')),
  primary key (training_id, player_id)
);

alter table public.trainingen    enable row level security;
alter table public.aanwezigheden enable row level security;

drop policy if exists trainingen_trainer on public.trainingen;
create policy trainingen_trainer on public.trainingen for all using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists trainingen_lezen on public.trainingen;
create policy trainingen_lezen on public.trainingen for select using (auth.uid() is not null);

drop policy if exists aanwezig_trainer on public.aanwezigheden;
create policy aanwezig_trainer on public.aanwezigheden for all using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists aanwezig_eigen on public.aanwezigheden;
create policy aanwezig_eigen on public.aanwezigheden for select using (player_id = public.my_player_id());

-- ---------- Trainer stelt een nieuw wachtwoord in voor iemand ----------
-- (handig omdat de gratis mailservice van Supabase maar enkele mails per uur verstuurt)
create extension if not exists pgcrypto with schema extensions;

create or replace function public.zet_wachtwoord(gebruiker uuid, wachtwoord text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.is_trainer() then raise exception 'Enkel de trainer kan dit.'; end if;
  if gebruiker = auth.uid() then raise exception 'Wijzig je eigen wachtwoord via "Wachtwoord vergeten".'; end if;
  if exists (select 1 from public.profiles where id = gebruiker and role = 'trainer') then
    raise exception 'Het wachtwoord van een trainer kan hier niet gewijzigd worden.';
  end if;
  if length(coalesce(wachtwoord, '')) < 6 then raise exception 'Het wachtwoord moet minstens 6 tekens lang zijn.'; end if;
  update auth.users set encrypted_password = extensions.crypt(wachtwoord, extensions.gen_salt('bf')), updated_at = now()
   where id = gebruiker;
  if not found then raise exception 'Account niet gevonden.'; end if;
end;
$$;
revoke all on function public.zet_wachtwoord(uuid, text) from public, anon;
grant execute on function public.zet_wachtwoord(uuid, text) to authenticated;

notify pgrst, 'reload schema';
