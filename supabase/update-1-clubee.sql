-- =========================================================
-- Update 1: Clubee-import (score, 7m, kaarten, 2 minuten)
-- Plak dit in Supabase > SQL Editor en klik "Run". Eén keer uitvoeren volstaat;
-- nog eens uitvoeren kan geen kwaad.
-- =========================================================

alter table public.matches add column if not exists clubee_id   bigint unique;
alter table public.matches add column if not exists score_voor  int;
alter table public.matches add column if not exists score_tegen int;

alter table public.goals add column if not exists zeven_m     int;
alter table public.goals add column if not exists zeven_m_mis int;
alter table public.goals add column if not exists geel        int;
alter table public.goals add column if not exists twee_min    int;
alter table public.goals add column if not exists blauw       int;
alter table public.goals add column if not exists rood        int;

-- Supabase de nieuwe kolommen meteen laten zien
notify pgrst, 'reload schema';
