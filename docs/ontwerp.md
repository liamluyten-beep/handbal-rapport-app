# Ontwerp: Handbal Progressie-app

Datum: 2026-11-24

## Waarom
De trainer wil per speler een rapport maken: wat gaat al goed, wat kan nog beter. Spelers moeten thuis hun eigen rapport en hun vooruitgang kunnen bekijken via een link. Daarnaast komen de doelpunten per wedstrijd erin, op termijn uit Clubee.

## Doelen
- De trainer logt in en beheert spelers, rapporten en doelpunten.
- Een speler logt in en ziet **alleen zijn eigen** rapporten, goals en vooruitgang.
- Een rapport bevat: datum, "Dit gaat al goed", "Hier kan het nog beter" en een score van 1 tot 5 per vaardigheid.
- Vooruitgang wordt zichtbaar: de scores van alle rapporten op een tijdlijn en de goals per wedstrijd in een grafiek.
- Goals per wedstrijd invoeren, zowel met de hand als door een lijst te plakken of een CSV-bestand te importeren.

## Niet-doelen (voor nu)
- Een rechtstreekse koppeling met Clubee. Er is geen publieke API gevonden. Een CSV-import dekt een Clubee-export af als die bestaat.
- Meerdere trainers of ploegen, berichten of een agenda.

## Anti-doelen
- Een speler die rapporten van een ploeggenoot kan zien. Dat mag nooit, ook niet door aan de URL te prutsen. Daarom wordt het afgedwongen in de database (Row Level Security) en niet alleen in de website.

## Aanpak
| Optie | Afweging |
|---|---|
| A. Lokaal, zonder server | Snel, maar spelers kunnen er thuis niet bij. **Afgewezen door de trainer.** |
| **B. Statische website + Supabase (gekozen)** | Gratis hosting, login en database met rechten per rij. Er is geen eigen server nodig. |
| C. Eigen backend (Node/PHP) | Meer onderhoud en hosting, en het voegt niets toe aan B. |

## Hoe
- **Frontend:** HTML, CSS en JavaScript zonder build-stap. De Supabase JS-client komt via een CDN en grafieken worden gemaakt met Chart.js. De site draait op GitHub Pages of Netlify (gratis).
- **Login:** Supabase Auth met e-mail en wachtwoord. De trainer maakt een speler aan met zijn e-mailadres. De speler registreert zich met dat adres en wordt zo automatisch aan zijn spelersprofiel gekoppeld.
- **Rollen:** in de tabel `profiles` krijgt de trainer `role = 'trainer'` en de spelers `role = 'speler'`.
- **Tabellen:**
  - `players` (id, naam, rugnummer, positie, email, user_id)
  - `skills` (id, naam, volgorde). Standaard: Werpen, Passen & vangen, Verdedigen, Spelinzicht, Conditie, Inzet & houding. De trainer kan dit aanpassen.
  - `reports` (id, player_id, datum, goed_tekst, beter_tekst)
  - `report_scores` (report_id, skill_id, score 1–5)
  - `matches` (id, datum, tegenstander, thuis/uit)
  - `goals` (match_id, player_id, aantal, eventueel pogingen)
- **Rechten (RLS):** de trainer mag alles lezen en schrijven. Een speler mag alleen rijen lezen waarvan `player_id` bij zijn eigen `user_id` hoort, en mag zelf niets schrijven.
- **Schermen:**
  - Login
  - Trainer: spelerslijst, spelerdetail (rapporten, grafiek, goals), nieuw/bewerk rapport, wedstrijden met goals-invoer, importeren
  - Speler: mijn overzicht (laatste rapport bovenaan, scoregrafiek, goals-grafiek, eerdere rapporten)
- **Import:** een CSV of geplakte tabel met de kolommen `datum, tegenstander, speler (naam of rugnummer), goals`. De app toont eerst een voorbeeld en slaat pas daarna op.
- **Taal:** de hele interface is in het Nederlands.

## Wat de trainer zelf moet doen
- Een gratis Supabase-project aanmaken, het meegeleverde SQL-script uitvoeren en de project-URL en anon key in `config.js` zetten. Er komt een stap-voor-stap uitleg in `README.md`.
- Zich eenmalig zelf registreren en in de database tot trainer maken. Ook dat staat in de uitleg.

## Keuzes die ik (Claude) gemaakt heb
- Scores van 1 tot 5 per vaardigheid, met de vaardigheden hierboven.
- Inloggen met e-mail en wachtwoord in plaats van een magische link, omdat dat voor jongeren eenvoudiger is.
- Geen build-tools, zodat de trainer bestanden makkelijk zelf kan aanpassen.
- Ouders kunnen meekijken door in te loggen met het account van de speler. Een apart ouderaccount komt er niet.
