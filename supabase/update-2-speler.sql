-- =========================================================
-- Update 2: spelers kiezen zelf hun posities + zelfevaluatie
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

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

notify pgrst, 'reload schema';
