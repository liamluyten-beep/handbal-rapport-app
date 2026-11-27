-- =========================================================
-- Update 19: XP en uitdagingen in de schiettraining
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

-- Bij elk schot: welke plek in het doel de app vroeg (1-9, gezien vanuit de schutter)
alter table public.training_schoten add column if not exists uitdaging_zone int check (uitdaging_zone between 1 and 9);

notify pgrst, 'reload schema';
