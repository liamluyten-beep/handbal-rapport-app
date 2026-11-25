# Handbal Progressie

Een website waarop je als trainer per speler een rapport maakt (wat gaat al goed, wat kan beter, en een score per vaardigheid) en de goals per wedstrijd bijhoudt. Elke speler logt in en ziet **alleen zijn eigen** rapporten, grafieken en goals.

Alles is gratis: de database draait op **Supabase** (gratis plan) en de website op **GitHub Pages**.

---

## Stap 1: Database aanmaken (± 5 minuten)

1. Ga naar [supabase.com](https://supabase.com), klik **Start your project** en maak een gratis account aan.
2. Klik **New project**. Kies een naam (bv. `handbal`), een wachtwoord (bewaar het goed) en als regio **West EU (Ireland)** of **Central EU (Frankfurt)**.
3. Wacht tot het project klaar is. Open daarna links **SQL Editor** en klik **New query**.
4. Open het bestand [`supabase/schema.sql`](supabase/schema.sql) uit deze map, kopieer **alles** en plak het in de editor. Klik **Run**. Je zou "Success" moeten zien.
5. Ga naar **Project Settings → API** (of **Data API**) en kopieer:
   - de **Project URL** (bv. `https://abcd1234.supabase.co`)
   - de **anon public** key (een lange tekst die begint met `eyJ…`)
6. Open [`js/config.js`](js/config.js) en plak beide waarden op de juiste plek. Pas daar ook de `PLOEGNAAM` aan als je wil.

> De anon key mag gewoon in de website staan. De database is beveiligd met regels (Row Level Security): wie geen trainer is, kan alleen zijn eigen gegevens lezen.

**Bevestigingsmail (Confirm email):** te vinden onder Authentication → Sign In / Providers → Email. Staat ze **uit**, dan kunnen spelers meteen inloggen na het aanmaken van een account. Het nadeel is dat iemand die het e-mailadres van een ploeggenoot kent, met dat adres een account kan aanmaken. Staat ze **aan**, dan wordt een speler pas gekoppeld nadat hij op de link in de mail klikte. Wie ingelogd is, blijft ingelogd op dat toestel tot hij uitlogt.

## Stap 2: Website online zetten met GitHub Pages (gratis)

1. Maak een gratis account op [github.com](https://github.com) als je er nog geen hebt.
2. Klik rechtsboven op **+ → New repository**. Geef een naam (bv. `handbal`), kies **Public** en klik **Create repository**. Vink niets aan (geen README).
3. Zet de bestanden erin. Dat kan Claude voor je doen met `git push`, of je doet het zelf via **uploading an existing file** en sleept de inhoud van deze map erin (niet de map zelf).
4. Ga in de repository naar **Settings → Pages**. Kies bij **Source** de optie **Deploy from a branch**, kies de branch **main** en de map **/ (root)**, en klik **Save**.
5. Na 1 à 2 minuten staat je site op `https://JOUWNAAM.github.io/handbal/`. Die link staat ook bovenaan de Pages-instellingen.

Heb je later iets aangepast? Push opnieuw (of upload het gewijzigde bestand). GitHub zet de site na een minuutje automatisch bij.

Zet daarna in Supabase onder **Authentication → URL Configuration** de **Site URL** op het adres van je website, bv. `https://JOUWNAAM.github.io/handbal/`. Dan wijst de link in de bevestigingsmail naar je site.

## Stap 3: Jezelf trainer maken

1. Open je website, klik **Account aanmaken** en registreer je met je eigen e-mailadres.
2. Ga in Supabase naar de **SQL Editor** en voer dit uit, met je eigen e-mailadres (hoofdletters maken niet uit):
   ```sql
   insert into public.profiles (id, email, role)
   select id, lower(email), 'trainer' from auth.users
   where lower(email) = lower('jouw@email.be')
   on conflict (id) do update set role = 'trainer'
   returning email, role;
   ```
   Je ziet nu één rij met `trainer`. Zie je 0 rijen, registreer je dan eerst op de site.
3. Herlaad de website. Je ziet nu bovenaan **Spelers, Wedstrijden, Importeren, Vaardigheden**.

## Stap 4: Spelers laten inloggen

1. Voer eenmalig [`supabase/update-2-speler.sql`](supabase/update-2-speler.sql), [`supabase/update-3-zelf-koppelen.sql`](supabase/update-3-zelf-koppelen.sql) en [`supabase/update-4-fotos.sql`](supabase/update-4-fotos.sql) uit in de SQL Editor (bij een nieuwe installatie zitten ze al in `schema.sql`).
2. Stuur je spelers de link naar de website. Ze klikken **Account aanmaken**, en kiezen daarna bij **Wie ben jij?** zichzelf uit de lijst, of maken zichzelf aan als ze er nog niet tussen staan.
3. In de lijst staan alleen spelers die nog niemand gekozen heeft. Vul je bij een speler zelf een e-mailadres in, dan kan alleen iemand met dat adres hem kiezen.
4. Koos iemand de verkeerde speler? Open die speler, klik **Gegevens → Account ontkoppelen**.
5. **Iemand verwijderen** (eenmalig eerst [`supabase/update-8-verwijderen.sql`](supabase/update-8-verwijderen.sql) uitvoeren): ga naar **Accounts → Verwijderen**. Kies *enkel het account* (login weg, speler en rapporten blijven) of *account én speler* (ook rapporten, zelfevaluaties, goals en foto weg). Typ VERWIJDER om te bevestigen. Live schoten in oude wedstrijden blijven bestaan zonder naam.

---

## Gebruik

- **Rapport maken:** open een speler en kies **+ Nieuw rapport**. De scores van het vorige rapport staan al ingevuld, zodat je alleen aanpast wat veranderd is. Pijltjes (▲/▼) tonen de vooruitgang tegenover het vorige rapport.
- **Goals invoeren:** ga naar **Wedstrijden**, maak een wedstrijd aan en vul de goals (en eventueel het aantal pogingen) per speler in.
- **Goals importeren (bv. uit Clubee of Excel):** ga naar **Importeren** en plak een lijst of kies een CSV-bestand met de kolommen `datum;tegenstander;speler;goals`. Je ziet eerst een voorbeeld en slaat pas daarna op. Wedstrijden die nog niet bestaan worden automatisch aangemaakt.
- **Vaardigheden aanpassen:** via **Vaardigheden** kun je ze hernoemen, toevoegen of verwijderen.
- **Afdrukken / PDF:** op een spelerspagina kies je in de browser **Afdrukken → Opslaan als PDF**. Knoppen en menu worden dan automatisch weggelaten.

### Wachtwoord vergeten, balverlies en trainingen
Eenmalig: voer [`supabase/update-9-balverlies-training.sql`](supabase/update-9-balverlies-training.sql) uit in de SQL Editor.
Zet in Supabase onder **Authentication → URL Configuration → Redirect URLs** het adres van je site erbij
(bv. `https://liamluyten-beep.github.io/handbal-rapport-app/`), anders werkt de link in de wachtwoord-mail niet.

- **Wachtwoord vergeten**: link op het inlogscherm; de speler krijgt een mail en kiest een nieuw wachtwoord.
  De gratis mailservice van Supabase verstuurt maar enkele mails per uur. Lukt het niet, dan stelt de trainer via
  **Accounts → Nieuw wachtwoord** zelf een wachtwoord in en geeft het door.
- **Balverlies**: extra knop voor de matchwatcher; zichtbaar in de live statistieken, bij de wedstrijd en bij de speler.
- **Trainingen**: via **Home → Training vandaag** tik je per speler aanwezig → verwittigd → afwezig (of eerst
  "Iedereen aanwezig" en dan wie er niet was). Elke speler ziet zijn aanwezigheidspercentage op zijn pagina.

### Schiettraining
Eenmalig: voer [`supabase/update-10-schiettraining.sql`](supabase/update-10-schiettraining.sql) en [`supabase/update-11-schietsessies.sql`](supabase/update-11-schietsessies.sql) uit in de SQL Editor.
Geef je doelmannen de positie **Doelman** (bij Gegevens of door de speler zelf), dan kunnen spelers ze kiezen.

- De speler opent **Home → Schiettraining** en klikt **▶ Start**. Hij kiest de **doelman** en zijn **positie** (die blijven staan), en tikt na elk schot
  waar het ging in het doel → **Goal** of **Gestopt**. Een misser is één tik: **Naast / over / paal**. Werkt ook met slechte wifi.
- Op het einde: **■ Stop training** → hij ziet meteen zijn resultaten; de sessie komt bij zijn **trainingsrapporten**.
- De **doelman** krijgt per training een doelmanrapport: alle schutters samen (bv. Alex 3/4 + Warre 5/6 = 8/10 → 20% gestopt), telkens zodra een schutter zijn sessie afsluit. Schoten naast tellen niet mee in het percentage.
- Op de spelerspagina: trefzekerheid per positie, per doelman en een doelkaart. Een doelman ziet ook zijn reddingspercentage.
- Bij **Trainingen** ziet de trainer de trefzekerheid per speler en het reddingspercentage per doelman.
- **Home → Schiettraining-stats** (trainer): ranglijst van beste naar slechtste, tabblad **Spelers** (met filter op positie) en tabblad **Doelmannen**.

### Live matchwatcher en live statistieken
Eenmalig: voer [`supabase/update-5-live.sql`](supabase/update-5-live.sql), [`supabase/update-6-watcher.sql`](supabase/update-6-watcher.sql) en [`supabase/update-7-home.sql`](supabase/update-7-home.sql) uit in de SQL Editor.

**Startpagina:** na het inloggen ziet iedereen zijn eigen taken. Spelers: mijn rapport, mijn matchen, zelfevaluatie. Watchers: daarbovenop **Match van vandaag** (volgen of aanmaken). Trainer: alles, met bovenaan de match van vandaag (live statistieken of zelf ingeven).

**Een matchwatcher aanduiden:** ga naar **Accounts** en zet het vinkje **Matchwatcher** aan. Dat kan bij een speler (bv. een geblesseerde speler) of bij iemand zonder speler (bv. een ouder). Een watcher zonder speler ziet geen rapporten.

**De watcher, tijdens de match:**
1. Kiest de wedstrijd (of maakt ze aan: zelfde datum en tegenstandersnaam als in Clubee, bv. `Merksplas`).
2. Start de klok bij het begin. **Schot**: speler → positie → goal/redding/mis → plek in het doel. **Tegengoal**: één tik. **2 min**: speler of tegenstander.
3. Elke tik wordt eerst op de gsm bewaard en verstuurd zodra er verbinding is. Het scherm blijft aan.

**De trainer, tijdens de match:** open de wedstrijd en klik **📊 Live statistieken**. Je ziet de score en klok, het percentage goals / reddingen / missers, van waar er geschoten wordt, waar in het doel, en de cijfers per speler. Kies **1e helft**, **2e helft** of **Hele match**. Het scherm ververst vanzelf.

Achteraf zie je bij elke speler zijn schoten per positie en een doelkaart. Spelers zien enkel hun eigen schoten. Goals en 2 minuten van Clubee blijven officieel; bij een verschil zie je een waarschuwing bij de wedstrijd.

### Wedstrijden uit Clubee
De gespeelde wedstrijden en line-up-statistieken (goals, 7 meters, kaarten, 2 minuten) van de ploeg in `clubee.config.json` worden opgehaald in `data/clubee.json`.

1. **Eén keer:** voer [`supabase/update-1-clubee.sql`](supabase/update-1-clubee.sql) uit in de SQL Editor van Supabase.
2. Ga naar **Importeren → Van Clubee**. Clubee toont alleen initialen (bv. `#11 N... L...`). De app koppelt die automatisch aan je spelers via initialen en rugnummer. Kies bij twijfel zelf de juiste speler. Je keuze wordt onthouden.
3. Klik **Importeren**. Je kunt dit gerust opnieuw doen: wedstrijden worden bijgewerkt, niet verdubbeld.

**Nieuwe wedstrijden ophalen:** dat gebeurt elke ochtend automatisch via GitHub Actions (`.github/workflows/clubee.yml`). Meteen ophalen? Ga op GitHub naar **Actions → Clubee-wedstrijden ophalen → Run workflow**. Lokaal kan ook: `node tools/clubee-ophalen.mjs`.
Een andere competitie of ploeg? Pas `clubee.config.json` aan.

---

## Voor ontwikkelaars

- Gewone HTML/CSS/JavaScript (ES-modules), zonder build-stap. Supabase JS en Chart.js worden via een CDN geladen.
- Tests voor de import- en grafieklogica: `npm test` (Node 20+).
- Structuur:
  - `index.html`, `css/stijl.css`
  - `js/app.js`: login en navigatie
  - `js/views/*`: de schermen
  - `js/lib/*`: pure logica (getest)
  - `supabase/schema.sql`: tabellen en rechten
