-- =========================================================
-- Update 10: schiettraining (spelers noteren zelf hun schoten)
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

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

notify pgrst, 'reload schema';
