-- =========================================================
-- TESTGEGEVENS: 4 fictieve spelers met rapporten, matchen, trainingen en schiettraining.
-- Plak dit in Supabase > SQL Editor en klik "Run".
-- Vereist: schema.sql en alle updates (1 t.e.m. 11) zijn uitgevoerd.
-- Alles weer weg? Voer testdata-verwijderen.sql uit.
-- =========================================================

do $$
declare
  sk record;
  pid uuid; keeper uuid; m uuid; r uuid; t uuid; s uuid;
  i int; j int; k int; n int;
  res text; pos text; posities_lijst text[];
  goals_voor int; goals_tegen int;
  ids uuid[] := '{}';
  namen text[]        := array['Test Tom', 'Test Jonas', 'Test Mats'];
  nummers int[]       := array[91, 92, 93];
  posities text[]     := array['Linkeropbouw, Spelverdeler', 'Rechterhoek', 'Cirkelloper'];
  schotposities text[] := array['LO,MO,7M', 'RH,RH,TA', 'CIR,CIR,7M'];
  kansen numeric[]    := array[0.55, 0.62, 0.70];
  tegenstanders text[] := array['TEST Merksem', 'TEST Schoten', 'TEST Welta'];
  goed text[] := array[
    'Goede inzet op training. Durft de bal te vragen.',
    'Sprongworp is sterk verbeterd. Communiceert goed in verdediging.',
    'Neemt verantwoordelijkheid in moeilijke momenten. Sterke 1-tegen-1.'];
  beter text[] := array[
    'Sneller terugkeren na balverlies. Meer variëren in het werpen.',
    'Passing onder druk kan nauwkeuriger. Blijven praten in verdediging.',
    'Rust bewaren na een fout. Nog meer naar de cirkel kijken.'];
begin
  perform setseed(0.42);
  if exists (select 1 from public.players where naam like 'Test %') then
    raise exception 'Er staan al testspelers in. Voer eerst testdata-verwijderen.sql uit.';
  end if;

  -- ---------- Spelers ----------
  insert into public.players (naam, rugnummer, positie) values ('Test Kobe', 90, 'Doelman') returning id into keeper;
  for i in 1..3 loop
    insert into public.players (naam, rugnummer, positie) values (namen[i], nummers[i], posities[i]) returning id into pid;
    ids := ids || pid;
  end loop;

  -- ---------- Rapporten (3 per speler, scores stijgen) + zelfevaluatie ----------
  for i in 1..4 loop
    pid := case when i = 4 then keeper else ids[i] end;
    for j in 1..3 loop
      insert into public.reports (player_id, datum, goed_tekst, beter_tekst)
      values (pid, current_date - (100 - 30 * j), goed[j], beter[j]) returning id into r;
      for sk in select id from public.skills loop
        insert into public.report_scores (report_id, skill_id, score)
        values (r, sk.id, least(5, greatest(1, 1 + j + floor(random() * 2)::int - (case when random() < 0.2 then 1 else 0 end))));
      end loop;
    end loop;
    insert into public.self_reports (player_id, datum, goed_tekst, beter_tekst)
    values (pid, current_date - 8, 'Ik durf meer te schieten en help mijn ploegmaats.', 'Mijn conditie en sneller terug in verdediging.')
    returning id into r;
    for sk in select id from public.skills loop
      insert into public.self_report_scores (self_report_id, skill_id, score) values (r, sk.id, least(5, 3 + floor(random() * 3)::int));
    end loop;
  end loop;

  -- ---------- 3 testmatchen met live gebeurtenissen ----------
  for j in 1..3 loop
    insert into public.matches (datum, tegenstander, thuis) values (current_date - (28 - 7 * j), tegenstanders[j], j <> 2) returning id into m;

    for i in 1..3 loop
      posities_lijst := string_to_array(schotposities[i], ',');
      n := 6 + floor(random() * 5)::int;
      for k in 1..n loop
        pos := posities_lijst[1 + floor(random() * cardinality(posities_lijst))::int];
        res := case when random() < kansen[i] then 'goal' when random() < 0.6 then 'redding' else 'mis' end;
        insert into public.match_events (id, match_id, player_id, soort, positie, resultaat, doelzone, helft, seconde)
        values (gen_random_uuid(), m, ids[i], 'schot', pos, res,
                case when res = 'mis' then null else 1 + floor(random() * 9)::int end,
                case when k <= n / 2 then 1 else 2 end, floor(random() * 1500)::int);
      end loop;
      for k in 1..(1 + floor(random() * 3)::int) loop
        insert into public.match_events (id, match_id, player_id, soort, helft, seconde)
        values (gen_random_uuid(), m, ids[i], 'balverlies', 1 + floor(random() * 2)::int, floor(random() * 1500)::int);
      end loop;
    end loop;

    insert into public.match_events (id, match_id, player_id, soort, helft, seconde)
    values (gen_random_uuid(), m, ids[1 + floor(random() * 3)::int], 'twee_min', 1, 600 + floor(random() * 600)::int);
    insert into public.match_events (id, match_id, soort, helft, seconde)
    values (gen_random_uuid(), m, 'twee_min_tegen', 2, floor(random() * 1200)::int);

    goals_tegen := 8 + floor(random() * 6)::int;
    for k in 1..goals_tegen loop
      insert into public.match_events (id, match_id, soort, helft, seconde)
      values (gen_random_uuid(), m, 'tegengoal', 1 + floor(random() * 2)::int, floor(random() * 1500)::int);
    end loop;

    -- "Officiële" cijfers (zoals Clubee) = wat live genoteerd werd
    insert into public.goals (match_id, player_id, aantal, pogingen, zeven_m, zeven_m_mis, geel, twee_min, blauw, rood)
    select m, e.player_id,
           count(*) filter (where e.soort = 'schot' and e.resultaat = 'goal'),
           count(*) filter (where e.soort = 'schot'),
           count(*) filter (where e.soort = 'schot' and e.positie = '7M' and e.resultaat = 'goal'),
           count(*) filter (where e.soort = 'schot' and e.positie = '7M' and e.resultaat <> 'goal'),
           0, count(*) filter (where e.soort = 'twee_min'), 0, 0
      from public.match_events e
     where e.match_id = m and e.player_id is not null
     group by e.player_id;

    select count(*) into goals_voor from public.match_events where match_id = m and soort = 'schot' and resultaat = 'goal';
    update public.matches set score_voor = goals_voor, score_tegen = goals_tegen where id = m;
  end loop;

  -- ---------- 6 trainingen met aanwezigheden ----------
  for j in 1..6 loop
    insert into public.trainingen (datum, notitie) values (current_date - 3 * j, 'TEST') on conflict (datum) do nothing;
    select id into t from public.trainingen where datum = current_date - 3 * j;
    for i in 1..4 loop
      pid := case when i = 4 then keeper else ids[i] end;
      insert into public.aanwezigheden (training_id, player_id, status)
      values (t, pid, case when random() < 0.78 then 'aanwezig' when random() < 0.5 then 'verwittigd' else 'afwezig' end);
    end loop;
  end loop;

  -- ---------- Schiettraining: 2 afgesloten sessies per veldspeler op doelman Kobe ----------
  for i in 1..3 loop
    posities_lijst := string_to_array(schotposities[i], ',');
    for j in 1..2 loop
      s := gen_random_uuid();
      insert into public.schiet_sessies (id, player_id, datum, gestart_op, gestopt_op)
      values (s, ids[i], current_date - 3 * j,
              now() - make_interval(days => 3 * j, mins => 30), now() - make_interval(days => 3 * j));
      n := 10 + floor(random() * 6)::int;
      for k in 1..n loop
        pos := posities_lijst[1 + floor(random() * cardinality(posities_lijst))::int];
        res := case when random() < kansen[i] - 0.05 then 'goal' when random() < 0.7 then 'redding' else 'mis' end;
        insert into public.training_schoten (id, player_id, doelman_id, positie, resultaat, doelzone, datum, sessie_id)
        values (gen_random_uuid(), ids[i], keeper, pos, res,
                case when res = 'mis' then null else 1 + floor(random() * 9)::int end, current_date - 3 * j, s);
      end loop;
    end loop;
  end loop;

  raise notice 'Testgegevens aangemaakt: Test Kobe (#90, doelman), Test Tom (#91), Test Jonas (#92), Test Mats (#93).';
end $$;
