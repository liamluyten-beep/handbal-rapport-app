-- =========================================================
-- Heren 1: extra regels, ENKEL in het Supabase-project van Heren 1 uitvoeren
-- (eerst schema.sql, daarna dit bestand). Opnieuw uitvoeren kan geen kwaad.
-- In Heren 1 ziet elke speler de stats van de hele ploeg.
-- =========================================================

-- Goals en live-acties van de hele ploeg: leesbaar voor elke ingelogde gebruiker
drop policy if exists goals_ploeg on public.goals;
create policy goals_ploeg on public.goals for select using (auth.uid() is not null);

drop policy if exists events_ploeg on public.match_events;
create policy events_ploeg on public.match_events for select using (auth.uid() is not null);

-- Namen en rugnummers van de ploeg (zonder e-mailadressen) voor de ploegstats
create or replace function public.ploeg_spelers()
returns table (id uuid, naam text, rugnummer int, positie text)
language sql stable security definer set search_path = public as $$
  select p.id, p.naam, p.rugnummer, p.positie
    from public.players p
   where auth.uid() is not null
   order by p.naam;
$$;

revoke all on function public.ploeg_spelers() from public, anon;
grant execute on function public.ploeg_spelers() to authenticated;

notify pgrst, 'reload schema';
