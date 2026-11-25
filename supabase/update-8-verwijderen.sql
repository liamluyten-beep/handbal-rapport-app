-- =========================================================
-- Update 8: trainer kan een account volledig verwijderen (ook de login)
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

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

notify pgrst, 'reload schema';
