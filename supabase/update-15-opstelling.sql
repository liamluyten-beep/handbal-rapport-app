-- =========================================================
-- Update 15: matchvoorbereiding (opstelling per wedstrijd: 7 posities + bank)
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

create table if not exists public.opstellingen (
  match_id    uuid primary key references public.matches(id) on delete cascade,
  posities    jsonb not null default '{}'::jsonb,   -- { "DM": speler-id, "LH": …, "LO": …, "MO": …, "RO": …, "RH": …, "CIR": … }
  bank        jsonb not null default '[]'::jsonb,   -- [speler-id, …]
  gedeeld     boolean not null default false,       -- pas zichtbaar voor spelers als de trainer deelt
  bijgewerkt  timestamptz not null default now()
);

alter table public.opstellingen enable row level security;
drop policy if exists opstelling_trainer on public.opstellingen;
create policy opstelling_trainer on public.opstellingen for all using (public.is_trainer()) with check (public.is_trainer());

-- Spelers zien een gedeelde opstelling met naam en rugnummer (spelers kunnen elkaars gegevens anders niet lezen)
create or replace function public.gedeelde_opstelling(wedstrijd uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'posities', o.posities,
    'bank', o.bank,
    'spelers', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'naam', p.naam, 'rugnummer', p.rugnummer))
        from public.players p
       where p.id::text in (select jsonb_array_elements_text(o.bank)
                            union select value from jsonb_each_text(o.posities) where value is not null)
    ), '[]'::jsonb))
  from public.opstellingen o
  where o.match_id = wedstrijd and o.gedeeld and auth.uid() is not null;
$$;
revoke all on function public.gedeelde_opstelling(uuid) from public, anon;
grant execute on function public.gedeelde_opstelling(uuid) to authenticated;

notify pgrst, 'reload schema';
