# Handbal Progressie

Een website waarop je als trainer per speler een rapport maakt (wat gaat al goed, wat kan beter, en een score per vaardigheid) en de goals per wedstrijd bijhoudt. Elke speler logt in en ziet **alleen zijn eigen** rapporten, grafieken en goals.

Alles is gratis: de database draait op **Supabase** (gratis plan) en de website op **Netlify** of **GitHub Pages**.

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

**Laat "Confirm email" aan staan** (Authentication → Sign In / Providers → Email). Een speler wordt pas aan zijn rapport gekoppeld nadat hij op de link in de bevestigingsmail heeft geklikt. Zo kan niemand die toevallig het e-mailadres van een ploeggenoot kent, diens rapport bekijken.

## Stap 2: Website online zetten

**Makkelijkst: Netlify Drop**
1. Ga naar [app.netlify.com/drop](https://app.netlify.com/drop) en maak een gratis account aan.
2. Sleep deze **hele map** naar het vak op die pagina.
3. Je krijgt een link zoals `https://iets-willekeurigs.netlify.app`. Die kun je onder **Site configuration → Change site name** aanpassen, bv. naar `mijnploeg-handbal`.

Heb je later iets aangepast (bv. in `config.js`)? Ga in Netlify naar **Deploys** en sleep de map opnieuw.

**Alternatief: GitHub Pages.** Zet de map in een GitHub-repository en zet onder **Settings → Pages** de bron op de `main`-branch.

Zet daarna in Supabase onder **Authentication → URL Configuration** de **Site URL** op het adres van je website.

## Stap 3: Jezelf trainer maken

1. Open je website, klik **Account aanmaken** en registreer je met je eigen e-mailadres.
2. Ga in Supabase naar de **SQL Editor** en voer dit uit, met je eigen e-mailadres:
   ```sql
   update public.profiles set role = 'trainer' where email = 'jouw@email.be';
   ```
3. Herlaad de website. Je ziet nu bovenaan **Spelers, Wedstrijden, Importeren, Vaardigheden**.

## Stap 4: Spelers uitnodigen

1. Ga naar **Spelers → + Speler toevoegen** en vul naam, rugnummer, positie en het **e-mailadres** van de speler (of een ouder) in.
2. Stuur de speler de link naar de website. Hij klikt **Account aanmaken** met **datzelfde e-mailadres** en ziet daarna meteen zijn eigen pagina.
3. Op de spelerskaart zie je "kan inloggen" zodra de speler zich geregistreerd heeft.

---

## Gebruik

- **Rapport maken:** open een speler en kies **+ Nieuw rapport**. De scores van het vorige rapport staan al ingevuld, zodat je alleen aanpast wat veranderd is. Pijltjes (▲/▼) tonen de vooruitgang tegenover het vorige rapport.
- **Goals invoeren:** ga naar **Wedstrijden**, maak een wedstrijd aan en vul de goals (en eventueel het aantal pogingen) per speler in.
- **Goals importeren (bv. uit Clubee of Excel):** ga naar **Importeren** en plak een lijst of kies een CSV-bestand met de kolommen `datum;tegenstander;speler;goals`. Je ziet eerst een voorbeeld en slaat pas daarna op. Wedstrijden die nog niet bestaan worden automatisch aangemaakt.
- **Vaardigheden aanpassen:** via **Vaardigheden** kun je ze hernoemen, toevoegen of verwijderen.
- **Afdrukken / PDF:** op een spelerspagina kies je in de browser **Afdrukken → Opslaan als PDF**. Knoppen en menu worden dan automatisch weggelaten.

### Over Clubee
Er is geen publieke koppeling met Clubee gevonden. Kun je in Clubee de wedstrijdstatistieken exporteren of kopiëren? Zet ze dan in de vorm `datum;tegenstander;speler;goals` (in Excel: kolommen in die volgorde, **Opslaan als → CSV**) en gebruik **Importeren**.

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
