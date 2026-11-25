-- =========================================================
-- Update 11: schietsessies (start/stop) + trainingsrapport + doelmanrapport
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

create table if not exists public.schiet_sessies (
  id         uuid primary key,                      -- aangemaakt op de gsm (werkt ook offline)
  player_id  uuid not null references public.players(id) on delete cascade,
  datum      date not null default current_date,
  gestart_op timestamptz not null default now(),
  gestopt_op timestamptz,                            -- null = nog bezig
  created_at timestamptz not null default now()
);
create index if not exists schiet_sessies_speler on public.schiet_sessies (player_id, datum);

alter table public.schiet_sessies add column if not exists created_at timestamptz not null default now();
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

notify pgrst, 'reload schema';
