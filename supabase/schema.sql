-- =========================================================
-- Handbal Progressie-app — databaseschema voor Supabase
-- Plak dit volledig in Supabase > SQL Editor en klik "Run".
-- =========================================================

-- ---------- Tabellen ----------
create table if not exists public.profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text,
  role  text not null default 'speler' check (role in ('trainer','speler'))
);

create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  naam       text not null,
  rugnummer  int,
  positie    text,
  email      text unique,
  user_id    uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id       serial primary key,
  naam     text not null unique,
  volgorde int not null default 0
);

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id) on delete cascade,
  datum       date not null default current_date,
  goed_tekst  text,
  beter_tekst text,
  created_at  timestamptz not null default now()
);

create table if not exists public.report_scores (
  report_id uuid not null references public.reports(id) on delete cascade,
  skill_id  int  not null references public.skills(id) on delete cascade,
  score     int  not null check (score between 1 and 5),
  primary key (report_id, skill_id)
);

create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  datum        date not null,
  tegenstander text not null,
  thuis        boolean not null default true,
  unique (datum, tegenstander)
);

create table if not exists public.goals (
  match_id  uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  aantal    int  not null default 0 check (aantal >= 0),
  pogingen  int  check (pogingen is null or pogingen >= 0),
  primary key (match_id, player_id)
);

-- Clubee-import (zie ook update-1-clubee.sql)
alter table public.matches add column if not exists clubee_id   bigint unique;
alter table public.matches add column if not exists score_voor  int;
alter table public.matches add column if not exists score_tegen int;
alter table public.goals add column if not exists zeven_m     int;
alter table public.goals add column if not exists zeven_m_mis int;
alter table public.goals add column if not exists geel        int;
alter table public.goals add column if not exists twee_min    int;
alter table public.goals add column if not exists blauw       int;
alter table public.goals add column if not exists rood        int;

-- ---------- Hulpfuncties ----------
create or replace function public.is_trainer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'trainer');
$$;

create or replace function public.my_player_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.players where user_id = auth.uid();
$$;

-- Bij registratie: profiel aanmaken. Koppelen aan de speler met hetzelfde e-mailadres
-- gebeurt pas zodra het e-mailadres BEVESTIGD is (anders kan iemand die een adres kent zich als die speler voordoen).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email))
  on conflict (id) do nothing;
  if new.email_confirmed_at is not null then
    update public.players set user_id = new.id
     where lower(email) = lower(new.email) and user_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_new_user();

-- Als de trainer een speler toevoegt die al geregistreerd is: meteen koppelen
create or replace function public.link_player_to_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    new.email := lower(trim(new.email));
    if tg_op = 'UPDATE' and new.email is distinct from old.email then
      new.user_id := null;  -- ander e-mailadres = oude koppeling vervalt
    end if;
    if new.user_id is null then
      select u.id into new.user_id from auth.users u
       where lower(u.email) = new.email and u.email_confirmed_at is not null
         and not exists (select 1 from public.players p where p.user_id = u.id and p.id <> new.id)
       limit 1;
    end if;
  else
    new.user_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists players_link_user on public.players;
create trigger players_link_user
  before insert or update of email on public.players
  for each row execute function public.link_player_to_user();

-- ---------- Rechten (Row Level Security) ----------
alter table public.profiles      enable row level security;
alter table public.players       enable row level security;
alter table public.skills        enable row level security;
alter table public.reports       enable row level security;
alter table public.report_scores enable row level security;
alter table public.matches       enable row level security;
alter table public.goals         enable row level security;

-- profiles: iedereen ziet enkel zichzelf, trainer ziet alles. Niemand kan zijn eigen rol wijzigen.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_trainer());

-- players
drop policy if exists players_trainer on public.players;
create policy players_trainer on public.players for all
  using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists players_self on public.players;
create policy players_self on public.players for select
  using (user_id = auth.uid());

-- skills: leesbaar voor ingelogden, beheer door trainer
drop policy if exists skills_read on public.skills;
create policy skills_read on public.skills for select
  using (auth.uid() is not null);
drop policy if exists skills_trainer on public.skills;
create policy skills_trainer on public.skills for all
  using (public.is_trainer()) with check (public.is_trainer());

-- reports
drop policy if exists reports_trainer on public.reports;
create policy reports_trainer on public.reports for all
  using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists reports_self on public.reports;
create policy reports_self on public.reports for select
  using (player_id = public.my_player_id());

-- report_scores
drop policy if exists scores_trainer on public.report_scores;
create policy scores_trainer on public.report_scores for all
  using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists scores_self on public.report_scores;
create policy scores_self on public.report_scores for select
  using (exists (select 1 from public.reports r
                 where r.id = report_id and r.player_id = public.my_player_id()));

-- matches: leesbaar voor ingelogden (geen persoonsgegevens), beheer door trainer
drop policy if exists matches_read on public.matches;
create policy matches_read on public.matches for select
  using (auth.uid() is not null);
drop policy if exists matches_trainer on public.matches;
create policy matches_trainer on public.matches for all
  using (public.is_trainer()) with check (public.is_trainer());

-- goals
drop policy if exists goals_trainer on public.goals;
create policy goals_trainer on public.goals for all
  using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists goals_self on public.goals;
create policy goals_self on public.goals for select
  using (player_id = public.my_player_id());

-- ---------- Standaard vaardigheden ----------
insert into public.skills (naam, volgorde) values
  ('Werpen', 1), ('Passen & vangen', 2), ('Verdedigen', 3),
  ('Spelinzicht', 4), ('Conditie', 5), ('Inzet & houding', 6)
on conflict (naam) do nothing;

-- ---------- Zelfevaluaties en posities (zie ook update-2-speler.sql) ----------
-- ---------- Zelfevaluaties ----------
create table if not exists public.self_reports (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id) on delete cascade,
  datum       date not null default current_date,
  goed_tekst  text,
  beter_tekst text,
  created_at  timestamptz not null default now()
);

create table if not exists public.self_report_scores (
  self_report_id uuid not null references public.self_reports(id) on delete cascade,
  skill_id       int  not null references public.skills(id) on delete cascade,
  score          int  not null check (score between 1 and 5),
  primary key (self_report_id, skill_id)
);

alter table public.self_reports       enable row level security;
alter table public.self_report_scores enable row level security;

-- Trainer mag alles lezen en verwijderen (maar niet in naam van de speler schrijven)
drop policy if exists self_trainer_read on public.self_reports;
create policy self_trainer_read on public.self_reports for select using (public.is_trainer());
drop policy if exists self_trainer_delete on public.self_reports;
create policy self_trainer_delete on public.self_reports for delete using (public.is_trainer());

-- Speler: enkel zijn eigen zelfevaluaties
drop policy if exists self_eigen on public.self_reports;
create policy self_eigen on public.self_reports for all
  using (player_id = public.my_player_id())
  with check (player_id = public.my_player_id());

drop policy if exists selfscores_trainer_read on public.self_report_scores;
create policy selfscores_trainer_read on public.self_report_scores for select using (public.is_trainer());
drop policy if exists selfscores_eigen on public.self_report_scores;
create policy selfscores_eigen on public.self_report_scores for all
  using (exists (select 1 from public.self_reports r where r.id = self_report_id and r.player_id = public.my_player_id()))
  with check (exists (select 1 from public.self_reports r where r.id = self_report_id and r.player_id = public.my_player_id()));

-- ---------- Posities: speler mag enkel dit veld van zichzelf aanpassen ----------
create or replace function public.zet_mijn_posities(posities text[])
returns text language plpgsql security definer set search_path = public as $$
declare
  toegelaten text[] := array['Doelman','Linkerhoek','Linkeropbouw','Spelverdeler','Rechteropbouw','Rechterhoek','Cirkelloper'];
  p text;
  resultaat text;
begin
  posities := coalesce(posities, array[]::text[]);
  if cardinality(posities) > 2 then raise exception 'Kies maximum 2 posities.'; end if;
  foreach p in array posities loop
    if not p = any(toegelaten) then raise exception 'Onbekende positie: %', p; end if;
  end loop;
  if cardinality(posities) = 2 and posities[1] = posities[2] then raise exception 'Een positie staat er dubbel in.'; end if;
  resultaat := nullif(array_to_string(posities, ', '), '');
  update public.players set positie = resultaat where user_id = auth.uid();
  if not found then raise exception 'Je account is nog niet gekoppeld aan een speler.'; end if;
  return resultaat;
end;
$$;

revoke all on function public.zet_mijn_posities(text[]) from public, anon;
grant execute on function public.zet_mijn_posities(text[]) to authenticated;



-- ---------- Speler kiest zelf wie hij is (zie ook update-3-zelf-koppelen.sql) ----------
-- E-mail van een gekoppelde speler wijzigen naar het adres van zijn eigen account
-- mag de koppeling niet verbreken.
create or replace function public.link_player_to_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    new.email := lower(trim(new.email));
    if tg_op = 'UPDATE' and new.email is distinct from old.email and new.user_id is not null
       and not exists (select 1 from auth.users u where u.id = new.user_id and lower(u.email) = new.email) then
      new.user_id := null;  -- ander e-mailadres = oude koppeling vervalt
    end if;
    if new.user_id is null then
      select u.id into new.user_id from auth.users u
       where lower(u.email) = new.email and u.email_confirmed_at is not null
         and not exists (select 1 from public.players p where p.user_id = u.id and p.id <> new.id)
       limit 1;
    end if;
  elsif tg_op = 'UPDATE' and old.email is not null then
    new.user_id := null;  -- e-mail gewist = koppeling vervalt
  end if;
  return new;
end;
$$;

-- Hulp: e-mailadres van de ingelogde gebruiker
create or replace function public.mijn_email()
returns text language sql stable security definer set search_path = public as $$
  select lower(email) from auth.users where id = auth.uid();
$$;

-- Lijst van spelers die nog niemand gekozen heeft (enkel naam en nummer)
create or replace function public.vrije_spelers()
returns table (id uuid, naam text, rugnummer int)
language sql stable security definer set search_path = public as $$
  select p.id, p.naam, p.rugnummer from public.players p
   where p.user_id is null
     and auth.uid() is not null
     and (p.email is null or p.email = public.mijn_email())
     and public.my_player_id() is null
   order by p.naam;
$$;

-- "Dit ben ik": koppel het account aan een bestaande, vrije speler
create or replace function public.kies_mijn_speler(speler uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  mail text := public.mijn_email();
begin
  if auth.uid() is null then raise exception 'Je bent niet ingelogd.'; end if;
  if public.is_trainer() then raise exception 'Een trainer kan geen speler kiezen.'; end if;
  if public.my_player_id() is not null then raise exception 'Je account is al gekoppeld aan een speler.'; end if;
  update public.players
     set user_id = auth.uid(),
         email = case when email is null and not exists (select 1 from public.players where email = mail) then mail else email end
   where id = speler and user_id is null and (email is null or email = mail);
  if not found then raise exception 'Deze speler is niet (meer) beschikbaar.'; end if;
end;
$$;

-- "Ik sta er niet tussen": maak een nieuwe speler aan voor dit account
create or replace function public.maak_mijn_speler(naam text, rugnummer int default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  mail text := public.mijn_email();
  schoon text := regexp_replace(trim(coalesce(naam, '')), '\s+', ' ', 'g');
  nieuw uuid;
begin
  if auth.uid() is null then raise exception 'Je bent niet ingelogd.'; end if;
  if public.is_trainer() then raise exception 'Een trainer kan zichzelf niet als speler toevoegen.'; end if;
  if public.my_player_id() is not null then raise exception 'Je account is al gekoppeld aan een speler.'; end if;
  if length(schoon) < 2 or length(schoon) > 60 then raise exception 'Vul je voor- en achternaam in.'; end if;
  if rugnummer is not null and (rugnummer < 0 or rugnummer > 99) then raise exception 'Rugnummer moet tussen 0 en 99 liggen.'; end if;
  if exists (select 1 from public.players p where lower(p.naam) = lower(schoon)) then
    raise exception 'Er bestaat al een speler met deze naam. Kies jezelf in de lijst, of vraag je trainer.';
  end if;
  insert into public.players (naam, rugnummer, email, user_id)
  values (schoon, rugnummer,
          case when exists (select 1 from public.players where email = mail) then null else mail end,
          auth.uid())
  returning id into nieuw;
  return nieuw;
end;
$$;

revoke all on function public.vrije_spelers() from public, anon;
revoke all on function public.kies_mijn_speler(uuid) from public, anon;
revoke all on function public.maak_mijn_speler(text, int) from public, anon;
grant execute on function public.vrije_spelers() to authenticated;
grant execute on function public.kies_mijn_speler(uuid) to authenticated;
grant execute on function public.maak_mijn_speler(text, int) to authenticated;



-- ---------- Profielfoto's (zie ook update-4-fotos.sql) ------------ Foto's staan in een AFGESCHERMDE map: enkel de speler zelf en de trainer kunnen ze zien.

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

-- ---------- Live matchwatcher (zie ook update-5-live.sql) ----------
create table if not exists public.match_events (
  id         uuid primary key,                 -- aangemaakt op de gsm (werkt ook offline)
  match_id   uuid not null references public.matches(id) on delete cascade,
  player_id  uuid references public.players(id) on delete set null,
  soort      text not null check (soort in ('schot', 'tegengoal', 'twee_min', 'twee_min_tegen')),
  positie    text check (positie in ('LH', 'LO', 'MO', 'RO', 'RH', 'CIR', '7M', 'TA')),
  resultaat  text check (resultaat in ('goal', 'redding', 'mis')),
  doelzone   int  check (doelzone between 1 and 9),
  helft      int  not null default 1 check (helft between 1 and 4),
  seconde    int  not null default 0 check (seconde >= 0),
  created_at timestamptz not null default now()
);
create index if not exists match_events_match on public.match_events (match_id);
create index if not exists match_events_player on public.match_events (player_id);

-- Lengte van een helft (minuten) per wedstrijd, voor de klok
alter table public.matches add column if not exists helft_minuten int not null default 25;

alter table public.match_events enable row level security;

drop policy if exists events_trainer on public.match_events;
create policy events_trainer on public.match_events for all
  using (public.is_trainer()) with check (public.is_trainer());

-- Speler: achteraf enkel zijn eigen schoten en 2 minuten
drop policy if exists events_eigen on public.match_events;
create policy events_eigen on public.match_events for select
  using (player_id is not null and player_id = public.my_player_id());



-- ---------- Matchwatcher-rol (zie ook update-6-watcher.sql) ----------
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



-- ---------- Watcher als vinkje (zie ook update-7-home.sql) ----------
alter table public.profiles add column if not exists kan_watchen boolean not null default false;

-- Bestaande watchers omzetten naar het vinkje
update public.profiles set kan_watchen = true, role = 'speler' where role = 'watcher';

create or replace function public.is_watcher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (kan_watchen or role = 'watcher'));
$$;

-- Trainer zet het watcher-vinkje aan of uit
create or replace function public.zet_watcher(gebruiker uuid, aan boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trainer() then raise exception 'Enkel de trainer kan dit wijzigen.'; end if;
  update public.profiles set kan_watchen = coalesce(aan, false) where id = gebruiker;
  if not found then raise exception 'Account niet gevonden.'; end if;
end;
$$;
revoke all on function public.zet_watcher(uuid, boolean) from public, anon;
grant execute on function public.zet_watcher(uuid, boolean) to authenticated;



-- ---------- Account verwijderen (zie ook update-8-verwijderen.sql) ----------
-- ook_speler = true: ook de gekoppelde speler met rapporten, zelfevaluaties en goals wissen.
-- ook_speler = false: de speler blijft bestaan, maar los van elk account (e-mail gewist, zodat
--                     die persoon zich niet automatisch opnieuw kan koppelen).
-- Live schoten in wedstrijden blijven bestaan, zonder speler (ploegstatistieken blijven kloppen).
create or replace function public.verwijder_account(gebruiker uuid, ook_speler boolean default false)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_trainer() then raise exception 'Enkel de trainer kan accounts verwijderen.'; end if;
  if gebruiker = auth.uid() then raise exception 'Je kunt je eigen account hier niet verwijderen.'; end if;
  if exists (select 1 from public.profiles where id = gebruiker and role = 'trainer') then
    raise exception 'Een trainer-account kan hier niet verwijderd worden.';
  end if;

  if ook_speler then
    delete from public.players where user_id = gebruiker;              -- rapporten, goals, zelfevaluaties gaan mee (cascade)
  else
    update public.players set user_id = null, email = null where user_id = gebruiker;
  end if;

  delete from public.profiles where id = gebruiker;
  delete from auth.users where id = gebruiker;                          -- login, sessies en identiteiten gaan mee
  if not found then raise exception 'Account niet gevonden.'; end if;
end;
$$;
revoke all on function public.verwijder_account(uuid, boolean) from public, anon;
grant execute on function public.verwijder_account(uuid, boolean) to authenticated;



-- ---------- Balverlies, trainingen, wachtwoord (zie ook update-9-balverlies-training.sql) ----------
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



-- ---------- Schiettraining (zie ook update-10-schiettraining.sql) ----------
create table if not exists public.training_schoten (
  id          uuid primary key,                -- aangemaakt op de gsm (werkt ook offline)
  player_id   uuid not null references public.players(id) on delete cascade,   -- de schutter
  doelman_id  uuid references public.players(id) on delete set null,          -- null = andere doelman
  positie     text not null check (positie in ('LH', 'LO', 'MO', 'RO', 'RH', 'CIR', '7M', 'TA')),
  resultaat   text not null check (resultaat in ('goal', 'redding', 'mis')),
  doelzone    int  check (doelzone between 1 and 9),
  datum       date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists training_schoten_speler on public.training_schoten (player_id, datum);
create index if not exists training_schoten_doelman on public.training_schoten (doelman_id);

alter table public.training_schoten enable row level security;

-- Trainer: alles
drop policy if exists ts_trainer on public.training_schoten;
create policy ts_trainer on public.training_schoten for all using (public.is_trainer()) with check (public.is_trainer());

-- Schutter: eigen schoten noteren, bekijken en wissen
drop policy if exists ts_eigen on public.training_schoten;
create policy ts_eigen on public.training_schoten for all
  using (player_id = public.my_player_id())
  with check (player_id = public.my_player_id());

-- Doelman: ziet de schoten die op hem genomen werden (voor zijn reddingspercentage)
drop policy if exists ts_doelman on public.training_schoten;
create policy ts_doelman on public.training_schoten for select
  using (doelman_id is not null and doelman_id = public.my_player_id());

-- Lijst van doelmannen om uit te kiezen (enkel naam en nummer, voor elke ingelogde speler)
create or replace function public.doelmannen()
returns table (id uuid, naam text, rugnummer int)
language sql stable security definer set search_path = public as $$
  select p.id, p.naam, p.rugnummer from public.players p
   where auth.uid() is not null and p.positie ilike '%doelman%'
   order by p.naam;
$$;
revoke all on function public.doelmannen() from public, anon;
grant execute on function public.doelmannen() to authenticated;



-- ---------- Schietsessies (zie ook update-11-schietsessies.sql) ----------
create table if not exists public.schiet_sessies (
  id         uuid primary key,                      -- aangemaakt op de gsm (werkt ook offline)
  player_id  uuid not null references public.players(id) on delete cascade,
  datum      date not null default current_date,
  gestart_op timestamptz not null default now(),
  gestopt_op timestamptz,                            -- null = nog bezig
  created_at timestamptz not null default now()
);
create index if not exists schiet_sessies_speler on public.schiet_sessies (player_id, datum);

alter table public.training_schoten add column if not exists sessie_id uuid references public.schiet_sessies(id) on delete cascade;
create index if not exists training_schoten_sessie on public.training_schoten (sessie_id);

alter table public.schiet_sessies enable row level security;
drop policy if exists sessies_trainer on public.schiet_sessies;
create policy sessies_trainer on public.schiet_sessies for all using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists sessies_eigen on public.schiet_sessies;
create policy sessies_eigen on public.schiet_sessies for all
  using (player_id = public.my_player_id()) with check (player_id = public.my_player_id());

-- Doelmanrapport: per dag en per schutter, enkel uit AFGESLOTEN sessies.
-- Mag opgevraagd worden door de trainer of door de doelman zelf.
create or replace function public.doelman_rapport(doelman uuid)
returns table (datum date, schutter text, schoten int, goals int, reddingen int, mis int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_trainer() or doelman = public.my_player_id()) then
    raise exception 'Geen toegang tot dit doelmanrapport.';
  end if;
  return query
    select t.datum, p.naam,
           count(*)::int,
           count(*) filter (where t.resultaat = 'goal')::int,
           count(*) filter (where t.resultaat = 'redding')::int,
           count(*) filter (where t.resultaat = 'mis')::int
      from public.training_schoten t
      join public.schiet_sessies s on s.id = t.sessie_id and s.gestopt_op is not null
      join public.players p on p.id = t.player_id
     where t.doelman_id = doelman
     group by t.datum, p.naam
     order by t.datum desc, p.naam;
end;
$$;
revoke all on function public.doelman_rapport(uuid) from public, anon;
grant execute on function public.doelman_rapport(uuid) to authenticated;



-- ---------- Ploegfoto (zie ook update-12-ploegfoto.sql) ------------ De ploegfoto (ploeg.jpg) staat in dezelfde afgeschermde map als de profielfoto's:
-- iedereen die ingelogd is mag ze zien, enkel de trainer mag ze wijzigen (dat kon al).

drop policy if exists "ploegfoto lezen" on storage.objects;
create policy "ploegfoto lezen" on storage.objects for select to authenticated
  using (bucket_id = 'profielfotos' and name = 'ploeg.jpg');

-- ---------- Logboek (zie ook update-13-logboek.sql) ----------
create table if not exists public.logboek (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid,
  email       text,
  player_id   uuid references public.players(id) on delete set null,
  speler_naam text,                 -- naam op het moment van de actie
  actie       text not null,
  details     text
);
create index if not exists logboek_tijd on public.logboek (created_at desc);

alter table public.logboek enable row level security;

-- Enkel de trainer leest het logboek en mag het leegmaken. Schrijven kan alleen via log_actie().
drop policy if exists logboek_lezen on public.logboek;
create policy logboek_lezen on public.logboek for select using (public.is_trainer());
drop policy if exists logboek_wissen on public.logboek;
create policy logboek_wissen on public.logboek for delete using (public.is_trainer());

-- Wie, welk e-mailadres en welke speler worden door de database zelf ingevuld (niet te vervalsen).
create or replace function public.log_actie(actie text, details text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  pid uuid := public.my_player_id();
begin
  if auth.uid() is null then return; end if;
  if actie not in ('ingelogd', 'uitgelogd', 'account_aangemaakt', 'speler_gekozen', 'speler_aangemaakt',
                   'schiettraining_gestart', 'schiettraining', 'zelfevaluatie', 'fout', 'app_geinstalleerd') then
    raise exception 'Onbekende actie';
  end if;
  insert into public.logboek (user_id, email, player_id, speler_naam, actie, details)
  values (auth.uid(), public.mijn_email(), pid, (select naam from public.players where id = pid),
          log_actie.actie, left(log_actie.details, 500));
end;
$$;
revoke all on function public.log_actie(text, text) from public, anon;
grant execute on function public.log_actie(text, text) to authenticated;



-- ---------- Competitie bij elke wedstrijd (zie ook update-14-competitie.sql) ----------
alter table public.matches add column if not exists competitie text;

-- ---------- Opstelling (zie ook update-15-opstelling.sql) ----------
create table if not exists public.opstellingen (
  match_id    uuid primary key references public.matches(id) on delete cascade,
  posities    jsonb not null default '{}'::jsonb,   -- { "DM": speler-id, "LH": …, "LO": …, "MO": …, "RO": …, "RH": …, "CIR": … }
  bank        jsonb not null default '[]'::jsonb,   -- [speler-id, …]
  gedeeld     boolean not null default false,       -- pas zichtbaar voor spelers als de trainer deelt
  bijgewerkt  timestamptz not null default now()
);

alter table public.opstellingen enable row level security;
drop policy if exists opstelling_trainer on public.opstellingen;
create policy opstelling_trainer on public.opstellingen for all using (public.is_trainer()) with check (public.is_trainer());

-- Spelers zien een gedeelde opstelling met naam en rugnummer (spelers kunnen elkaars gegevens anders niet lezen)
create or replace function public.gedeelde_opstelling(wedstrijd uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'posities', o.posities,
    'bank', o.bank,
    'spelers', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'naam', p.naam, 'rugnummer', p.rugnummer))
        from public.players p
       where p.id::text in (select jsonb_array_elements_text(o.bank)
                            union select value from jsonb_each_text(o.posities) where value is not null)
    ), '[]'::jsonb))
  from public.opstellingen o
  where o.match_id = wedstrijd and o.gedeeld and auth.uid() is not null;
$$;
revoke all on function public.gedeelde_opstelling(uuid) from public, anon;
grant execute on function public.gedeelde_opstelling(uuid) to authenticated;



-- Live updates voor het spelersoverzicht van de trainer
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'schiet_sessies') then
    alter publication supabase_realtime add table public.schiet_sessies;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'training_schoten') then
    alter publication supabase_realtime add table public.training_schoten;
  end if;
end $$;


-- ---------- Playbook (zie ook update-18-playbook.sql) ----------
create table if not exists public.systemen (
  id           uuid primary key default gen_random_uuid(),
  naam         text not null,
  beschrijving text,
  stappen      jsonb not null default '[]'::jsonb,   -- [{ spelers: {LH:{x,y},…}, bal: 'MO', tekst: '…' }, …]
  volgorde     int not null default 0,
  bijgewerkt   timestamptz not null default now()
);

alter table public.systemen enable row level security;
drop policy if exists systemen_trainer on public.systemen;
create policy systemen_trainer on public.systemen for all using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists systemen_lezen on public.systemen;
create policy systemen_lezen on public.systemen for select using (auth.uid() is not null);



-- ---------- XP: gevraagde plek bij elk schot (zie ook update-19-xp.sql) ----------
alter table public.training_schoten add column if not exists uitdaging_zone int check (uitdaging_zone between 1 and 9);

-- ---------- Avatar per speler (zie ook update-20-avatar.sql) ----------
alter table public.players add column if not exists avatar jsonb;
alter table public.players add column if not exists toon_avatar boolean not null default false;

-- Speler bewaart enkel zijn eigen avatar (en of hij die toont in plaats van zijn foto)
create or replace function public.zet_mijn_avatar(instelling jsonb, tonen boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_player_id() is null then
    raise exception 'Je account is nog niet gekoppeld aan een speler.';
  end if;
  if instelling is not null and (jsonb_typeof(instelling) <> 'object' or pg_column_size(instelling) > 1000) then
    raise exception 'Ongeldige avatar.';
  end if;
  update public.players set avatar = instelling, toon_avatar = coalesce(tonen, false)
   where id = public.my_player_id();
end $$;

revoke all on function public.zet_mijn_avatar(jsonb, boolean) from public, anon;
grant execute on function public.zet_mijn_avatar(jsonb, boolean) to authenticated;

-- =========================================================
-- NA JE EIGEN REGISTRATIE in de app: maak jezelf trainer.
-- Vervang het e-mailadres en voer enkel deze regel uit:
--
--   update public.profiles set role = 'trainer' where email = lower('jouw@email.be') returning email, role;
-- =========================================================
