-- =========================================================
-- Update 13: logboek voor de trainer (wie logde in op welke speler, wat deden ze, welke fouten)
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

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
                   'schiettraining', 'zelfevaluatie', 'fout') then
    raise exception 'Onbekende actie';
  end if;
  insert into public.logboek (user_id, email, player_id, speler_naam, actie, details)
  values (auth.uid(), public.mijn_email(), pid, (select naam from public.players where id = pid),
          log_actie.actie, left(log_actie.details, 500));
end;
$$;
revoke all on function public.log_actie(text, text) from public, anon;
grant execute on function public.log_actie(text, text) to authenticated;

notify pgrst, 'reload schema';
