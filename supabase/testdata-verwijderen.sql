-- =========================================================
-- TESTGEGEVENS VERWIJDEREN (alles wat testdata.sql aanmaakte)
-- Plak dit in Supabase > SQL Editor en klik "Run".
-- Echte spelers, matchen en trainingen blijven staan.
-- =========================================================

-- Testmatchen (met hun live gebeurtenissen en goals)
delete from public.matches where tegenstander like 'TEST %';

-- Testspelers (met rapporten, zelfevaluaties, goals, aanwezigheden, schietsessies en schoten)
delete from public.players where naam like 'Test %';

-- Trainingen die enkel voor de test aangemaakt werden en nu leeg zijn
delete from public.trainingen t
 where t.notitie = 'TEST'
   and not exists (select 1 from public.aanwezigheden a where a.training_id = t.id);

select 'Testgegevens verwijderd' as resultaat;
