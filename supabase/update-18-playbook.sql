-- =========================================================
-- Update 18: playbook met aanvalssystemen (tekenbord in stappen)
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

create table if not exists public.systemen (
  id           uuid primary key default gen_random_uuid(),
  naam         text not null,
  beschrijving text,
  stappen      jsonb not null default '[]'::jsonb,   -- [{ spelers: {LH:{x,y},…}, bal: 'MO', tekst: '…' }, …]
  volgorde     int not null default 0,
  bijgewerkt   timestamptz not null default now()
);

alter table public.systemen enable row level security;
drop policy if exists systemen_trainer on public.systemen;
create policy systemen_trainer on public.systemen for all using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists systemen_lezen on public.systemen;
create policy systemen_lezen on public.systemen for select using (auth.uid() is not null);

notify pgrst, 'reload schema';
