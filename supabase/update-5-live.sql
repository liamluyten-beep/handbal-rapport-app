-- =========================================================
-- Update 5: live matchwatcher
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

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

notify pgrst, 'reload schema';
