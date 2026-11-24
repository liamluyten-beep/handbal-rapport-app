# Handbal Progressie-app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statische website + Supabase waarin de trainer spelersrapporten en goals beheert en spelers alleen hun eigen gegevens zien.

**Architecture:** Eén `index.html` met hash-routing (`#/spelers`, `#/speler/<id>`, ...), ES-modules zonder build. Pure logica (CSV-import, grafiekdata) in `js/lib/` met Node-tests. Rechten afgedwongen via Supabase RLS in `supabase/schema.sql`.

**Tech Stack:** HTML/CSS/vanilla JS (ES modules), Supabase JS v2 via esm.sh CDN, Chart.js v4 via CDN, `node --test`.

**Spec:** `docs/ontwerp.md`

## Global Constraints
- Alles gratis: Supabase free tier, GitHub Pages/Netlify.
- UI volledig Nederlands.
- Geen build-stap, geen npm-dependencies voor de site.
- Scores 1–5; standaard vaardigheden: Werpen, Passen & vangen, Verdedigen, Spelinzicht, Conditie, Inzet & houding.

## Review Focus
1. Speler probeert andere `player_id` op te vragen → RLS geeft lege resultaten.
2. CSV met puntkomma als scheidingsteken (Belgische Excel) → wordt correct geparsed.
3. Spelernaam in CSV met andere hoofdletters/spaties of als rugnummer → koppelt aan juiste speler; onbekende naam wordt gemeld, niet stil overgeslagen.
4. Datum in CSV als `dd/mm/jjjj` of `jjjj-mm-dd` → beide geaccepteerd.
5. Speler zonder rapporten of goals → lege staat met uitleg, geen crash.

---

### Task 1: Database-schema + RLS
**Files:** Create `supabase/schema.sql`
- Tabellen uit spec, `profiles(id uuid → auth.users, role)`, trigger die bij registratie een profiel maakt en `players.user_id` koppelt op e-mail (case-insensitive).
- Functie `is_trainer()` (security definer). Policies: trainer alles; speler `select` waar `player_id in (select id from players where user_id = auth.uid())`; matches leesbaar voor ingelogden; skills leesbaar voor ingelogden.
- Seed de 6 vaardigheden.

### Task 2: Pure logica + tests
**Files:** Create `js/lib/importeer.js`, `js/lib/voortgang.js`, `tests/importeer.test.mjs`, `tests/voortgang.test.mjs`
- `parseGoalsTekst(tekst: string) -> {rijen: {datum, tegenstander, speler, goals}[], fouten: string[]}` — detecteert `;`, `,` of tab; header optioneel; datum `dd/mm/jjjj` of `jjjj-mm-dd` → ISO.
- `koppelSpeler(spelerTekst, spelers[]) -> player|null` — op rugnummer of genormaliseerde naam.
- `scoreReeksen(rapporten, skills) -> {labels: string[], datasets: {label, data: number[]}[]}` gesorteerd op datum.
- `goalsReeks(goals, matches) -> {labels, data}` gesorteerd op datum.
- Tests dekken Review Focus 2–5.

### Task 3: Website-schil, login, routing
**Files:** Create `index.html`, `css/stijl.css`, `js/config.js`, `js/supabase.js`, `js/app.js`
- Login/registreer-scherm, rol ophalen uit `profiles`, router stuurt trainer naar `#/spelers`, speler naar `#/mijn`. Melding als `config.js` niet ingevuld is.

### Task 4: Trainerschermen
**Files:** Create `js/views/spelers.js`, `js/views/speler.js`, `js/views/rapport.js`, `js/views/wedstrijden.js`, `js/views/import.js`
- Spelers toevoegen/bewerken; spelerdetail met grafieken + rapporten; rapportformulier met 1–5 per vaardigheid; wedstrijden met goals per speler; import met voorbeeld vóór opslaan.

### Task 5: Spelersscherm + README
**Files:** Create `js/views/mijn.js`, `README.md`
- Hergebruikt de spelerdetailweergave read-only. README: Supabase-setup stap voor stap, trainer worden, gratis publiceren via Netlify Drop/GitHub Pages.
