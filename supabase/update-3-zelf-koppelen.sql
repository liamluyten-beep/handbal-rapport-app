-- =========================================================
-- Update 3: speler kiest zelf wie hij is, of maakt zichzelf aan
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

-- E-mail van een gekoppelde speler wijzigen naar het adres van zijn eigen account
-- mag de koppeling niet verbreken.
create or replace function public.link_player_to_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    new.email := lower(trim(new.email));
    if tg_op = 'UPDATE' and new.email is distinct from old.email and new.user_id is not null
       and not exists (select 1 from auth.users u where u.id = new.user_id and lower(u.email) = new.email) then
      new.user_id := null;  -- ander e-mailadres = oude koppeling vervalt
    end if;
    if new.user_id is null then
      select u.id into new.user_id from auth.users u
       where lower(u.email) = new.email and u.email_confirmed_at is not null
         and not exists (select 1 from public.players p where p.user_id = u.id and p.id <> new.id)
       limit 1;
    end if;
  elsif tg_op = 'UPDATE' and old.email is not null then
    new.user_id := null;  -- e-mail gewist = koppeling vervalt
  end if;
  return new;
end;
$$;

-- Hulp: e-mailadres van de ingelogde gebruiker
create or replace function public.mijn_email()
returns text language sql stable security definer set search_path = public as $$
  select lower(email) from auth.users where id = auth.uid();
$$;

-- Lijst van spelers die nog niemand gekozen heeft (enkel naam en nummer)
create or replace function public.vrije_spelers()
returns table (id uuid, naam text, rugnummer int)
language sql stable security definer set search_path = public as $$
  select p.id, p.naam, p.rugnummer from public.players p
   where p.user_id is null
     and auth.uid() is not null
     and (p.email is null or p.email = public.mijn_email())
     and public.my_player_id() is null
   order by p.naam;
$$;

-- "Dit ben ik": koppel het account aan een bestaande, vrije speler
create or replace function public.kies_mijn_speler(speler uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  mail text := public.mijn_email();
begin
  if auth.uid() is null then raise exception 'Je bent niet ingelogd.'; end if;
  if public.is_trainer() then raise exception 'Een trainer kan geen speler kiezen.'; end if;
  if public.my_player_id() is not null then raise exception 'Je account is al gekoppeld aan een speler.'; end if;
  update public.players
     set user_id = auth.uid(),
         email = case when email is null and not exists (select 1 from public.players where email = mail) then mail else email end
   where id = speler and user_id is null and (email is null or email = mail);
  if not found then raise exception 'Deze speler is niet (meer) beschikbaar.'; end if;
end;
$$;

-- "Ik sta er niet tussen": maak een nieuwe speler aan voor dit account
create or replace function public.maak_mijn_speler(naam text, rugnummer int default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  mail text := public.mijn_email();
  schoon text := regexp_replace(trim(coalesce(naam, '')), '\s+', ' ', 'g');
  nieuw uuid;
begin
  if auth.uid() is null then raise exception 'Je bent niet ingelogd.'; end if;
  if public.is_trainer() then raise exception 'Een trainer kan zichzelf niet als speler toevoegen.'; end if;
  if public.my_player_id() is not null then raise exception 'Je account is al gekoppeld aan een speler.'; end if;
  if length(schoon) < 2 or length(schoon) > 60 then raise exception 'Vul je voor- en achternaam in.'; end if;
  if rugnummer is not null and (rugnummer < 0 or rugnummer > 99) then raise exception 'Rugnummer moet tussen 0 en 99 liggen.'; end if;
  if exists (select 1 from public.players p where lower(p.naam) = lower(schoon)) then
    raise exception 'Er bestaat al een speler met deze naam. Kies jezelf in de lijst, of vraag je trainer.';
  end if;
  insert into public.players (naam, rugnummer, email, user_id)
  values (schoon, rugnummer,
          case when exists (select 1 from public.players where email = mail) then null else mail end,
          auth.uid())
  returning id into nieuw;
  return nieuw;
end;
$$;

revoke all on function public.vrije_spelers() from public, anon;
revoke all on function public.kies_mijn_speler(uuid) from public, anon;
revoke all on function public.maak_mijn_speler(text, int) from public, anon;
grant execute on function public.vrije_spelers() to authenticated;
grant execute on function public.kies_mijn_speler(uuid) to authenticated;
grant execute on function public.maak_mijn_speler(text, int) to authenticated;

notify pgrst, 'reload schema';
