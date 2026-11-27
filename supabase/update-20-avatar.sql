-- =========================================================
-- Update 20: zelfgemaakte avatar per speler
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

alter table public.players add column if not exists avatar jsonb;
alter table public.players add column if not exists toon_avatar boolean not null default false;

-- Speler bewaart enkel zijn eigen avatar (en of hij die toont in plaats van zijn foto)
create or replace function public.zet_mijn_avatar(instelling jsonb, tonen boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_player_id() is null then
    raise exception 'Je account is nog niet gekoppeld aan een speler.';
  end if;
  if instelling is not null and (jsonb_typeof(instelling) <> 'object' or pg_column_size(instelling) > 1000) then
    raise exception 'Ongeldige avatar.';
  end if;
  update public.players set avatar = instelling, toon_avatar = coalesce(tonen, false)
   where id = public.my_player_id();
end $$;

revoke all on function public.zet_mijn_avatar(jsonb, boolean) from public, anon;
grant execute on function public.zet_mijn_avatar(jsonb, boolean) to authenticated;

notify pgrst, 'reload schema';
