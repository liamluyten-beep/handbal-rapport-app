-- =========================================================
-- Update 14: competitie bij elke wedstrijd (bv. "Regionaal" of "VHV")
-- Plak dit in Supabase > SQL Editor en klik "Run". Opnieuw uitvoeren kan geen kwaad.
-- =========================================================

alter table public.matches add column if not exists competitie text;

notify pgrst, 'reload schema';
