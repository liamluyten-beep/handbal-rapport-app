# Heren 1 als tweede deel van de website — ontwerp

Goedgekeurd door Liam op 2026-11-28.

## Doel
Eén website met twee delen: **U16** (bestaat) en **Heren 1** (nieuw). Heren 1 draait enkel om matchstats.

## Wat Heren 1 krijgt
- Matchstats uit Clubee (uitslagen, kalender, goals per speler), dagelijks automatisch opgehaald.
- De live matchwatcher (schoten, goals, 2 minuten, balverlies) met live stats.
- **Geen** rapporten, zelfevaluatie, XP/badges/avatars, trainingen, schiettraining, playbook of opstelling.

## Wie ziet wat
- Liam beheert Heren 1 (trainer) en ziet beide delen.
- Elke Heren 1-speler logt in en ziet de **stats van de hele ploeg** (topschutters, matchen).
- Volledig gescheiden: U16-spelers zien enkel U16, Heren 1-spelers enkel Heren 1. Mark blijft enkel U16-trainer.

## Aanpak (gekozen)
Eén code, één site, **aparte Supabase-database per ploeg**.
- Heren 1 op `/heren1/` (test: `/test/heren1/`), U16 blijft op `/` (test: `/test/`).
- De code herkent de ploeg aan het pad en kiest daarmee naam, database, Clubee-bestand en welke onderdelen aan staan.
- Aparte inlogsessie per ploeg (eigen opslagsleutel), zodat Liam in beide tegelijk ingelogd blijft. Knop "U16 ⇄ Heren 1" voor wie in beide zit.
- Heren 1-database = kopie van schema.sql + een kleine extra (`heren1-extra.sql`): spelers mogen goals, matchen en live-events van de hele ploeg lezen; namen/rugnummers via een functie (geen e-mailadressen van ploegmaten).

Verworpen: één database met een ploegkolom overal (grote ombouw van de live U16-beveiliging, risico op lekken tussen ploegen) en een losse kopie van de site (verbeteringen moeten dan dubbel).

## Wat Liam moet doen
1. Clubee-link en exacte ploegnaam van Heren 1 geven.
2. Een tweede gratis Supabase-project maken, schema.sql + heren1-extra.sql uitvoeren, URL + anon key doorgeven, zichzelf trainer maken.
3. Back-up: twee extra GitHub-secrets voor de tweede database.

## Aan de bouwer
Indeling van de ploegstats-pagina, welke cijfers in de topschuttersranglijst staan (goals, matchen, gemiddelde, 7 m, en waar live gevolgd: schoten en rendement).
