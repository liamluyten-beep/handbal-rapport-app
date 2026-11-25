-- =========================================================
-- Update 7: startpagina per persoon + watcher als extra vinkje
-- (een speler kan nu ook matchwatcher zijn)
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

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

notify pgrst, 'reload schema';
