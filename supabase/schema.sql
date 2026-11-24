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

-- =========================================================
-- NA JE EIGEN REGISTRATIE in de app: maak jezelf trainer.
-- Vervang het e-mailadres en voer enkel deze regel uit:
--
--   update public.profiles set role = 'trainer' where email = 'jouw@email.be';
-- =========================================================
