# Ontwerp: Live matchwatcher (versie 1)

Datum: 2026-11-25

## Beslist door de trainer
- Alleen de trainer vult live in.
- Live meekijken kunnen alleen de trainer en de watcher (dezelfde persoon). Spelers zien achteraf hun eigen schoten.
- Schoten worden geregistreerd met speler, positie en resultaat (goal, redding of mis), plus de plek in het doel (3×3).
- Clubee blijft officieel voor goals en 2 minuten. Live data voegt details toe. Wijkt het aantal goals per speler af, dan krijgt de trainer een waarschuwing.

## Gebeurtenissen (`match_events`)
| soort | velden |
|---|---|
| `schot` | player_id, positie (LH, LO, MO, RO, RH, CIR, 7M, TA), resultaat (goal, redding, mis), doelzone 1–9 (optioneel) |
| `tegengoal` | – |
| `twee_min` | player_id |
| `twee_min_tegen` | – |

Elke gebeurtenis heeft ook `helft` (1 of 2) en `seconde` (wedstrijdklok binnen de helft). De id wordt op de gsm aangemaakt.

## Keuzes van Claude
- Elke tik wordt eerst lokaal bewaard (localStorage) en daarna naar Supabase gestuurd, zodat er niets verloren gaat bij slechte wifi.
- De klokstatus staat per wedstrijd in localStorage. Een helft duurt standaard 25 minuten (U16) en is per match aanpasbaar.
- Doelzones zijn genummerd 1–9, van linksboven naar rechtsonder, gezien vanuit de schutter.
- Geen Supabase Realtime-abonnement, want er is maar één invuller. Dat kan later bij een upgrade.

## Niet in versie 1
Live meekijken door anderen, statistieken van tegenstanders per speler, assists, timeouts en wissels.
