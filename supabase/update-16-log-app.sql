-- =========================================================
-- Update 16: logboek ook "app geïnstalleerd" laten noteren
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

create or replace function public.log_actie(actie text, details text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  pid uuid := public.my_player_id();
begin
  if auth.uid() is null then return; end if;
  if actie not in ('ingelogd', 'uitgelogd', 'account_aangemaakt', 'speler_gekozen', 'speler_aangemaakt',
                   'schiettraining', 'zelfevaluatie', 'fout', 'app_geinstalleerd') then
    raise exception 'Onbekende actie';
  end if;
  insert into public.logboek (user_id, email, player_id, speler_naam, actie, details)
  values (auth.uid(), public.mijn_email(), pid, (select naam from public.players where id = pid),
          log_actie.actie, left(log_actie.details, 500));
end;
$$;

notify pgrst, 'reload schema';
