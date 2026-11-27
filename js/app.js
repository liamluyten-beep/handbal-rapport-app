import { sb, q, isGeconfigureerd } from './supabase.js';
import { PLOEGNAAM } from './config.js';
import { toon, esc, laden, fout, melding } from './ui.js';
import { spelersView } from './views/spelers.js';
import { spelerView } from './views/speler.js';
import { rapportView } from './views/rapport.js';
import { wedstrijdenView, wedstrijdView } from './views/wedstrijden.js';
import { importView } from './views/import.js';
import { liveView } from './views/live.js';
import { vaardighedenView } from './views/vaardigheden.js';
import { mijnView } from './views/mijn.js';
import { avatarView } from './views/avatar.js';
import { zelfevaluatieView } from './views/zelfevaluatie.js';
import { watcherView } from './views/watcher.js';
import { statsView } from './views/stats.js';
import { accountsView } from './views/accounts.js';
import { homeView } from './views/home.js';
import { mijnMatchenView } from './views/matchen.js';
import { trainingenView, trainingView } from './views/trainingen.js';
import { schietenView } from './views/schieten.js';
import { schietStatsView } from './views/schietstats.js';
import { seizoenKeuzeHtml, kiesSeizoen } from './seizoen-keuze.js';
import { log } from './logboek.js';
import { logboekView } from './views/logboek.js';
import { kalenderView } from './views/kalender.js';
import { opstellingView, voorbereidingView } from './views/opstelling.js';
import { installeerView, alsApp, meldAppGebruik } from './installeer.js';
import { playbookView, systeemView } from './views/playbook.js';
import { xpRanglijstView } from './views/xp.js';
import { IS_TEST } from './omgeving.js';

export const sessie = { user: null, rol: null, watcher: false };

// Versie van de site (zichtbaar onderaan in "Meer"), handig om te zien of een gsm de nieuwste versie heeft
export const VERSIE = '2026-11-28.5';

document.title = (IS_TEST ? 'TEST · ' : '') + PLOEGNAAM;
if (IS_TEST) document.body.classList.add('testversie');
document.getElementById('ploegnaam').textContent = PLOEGNAAM;

const ICOON = { '#/': '🏠', '#/spelers': '👥', '#/wedstrijden': '🤾', '#/trainingen': '📅', '#/import': '⬇️',
  '#/accounts': '🔑', '#/kalender': '📆', '#/app': '📲', '#/playbook': '📖', '#/mijn': '📋', '#/matchen': '🤾', '#/watcher': '📝' };

// Menubalk onderaan op de gsm: de eerste 4 links + "Meer" (de rest en uitloggen)
function zetOnderbalk(links) {
  let balk = document.getElementById('onderbalk');
  if (!balk) { balk = document.createElement('nav'); balk.id = 'onderbalk'; balk.setAttribute('aria-label', 'Hoofdmenu'); document.body.appendChild(balk); }
  if (!sessie.user) { balk.innerHTML = ''; document.body.classList.remove('met-onderbalk'); return; }
  document.body.classList.add('met-onderbalk');
  const kort = t => { const k = t.replace('Mijn ', '').replace('Wedstrijden', 'Matchen'); return k[0].toUpperCase() + k.slice(1); };
  const hoofd = links.slice(0, 4), rest = [...links.slice(4), ...(alsApp() ? [] : [['#/app', 'App installeren']])];
  balk.innerHTML = hoofd.map(([h, t]) => `<a href="${h}"><span class="ob-icoon">${ICOON[h] || '•'}</span>${kort(t)}</a>`).join('') +
    `<button id="obMeer" aria-expanded="false"><span class="ob-icoon">☰</span>Meer</button>
     <div class="ob-meer" id="obMenu" hidden>
       ${rest.map(([h, t]) => `<a href="${h}">${ICOON[h] || ''} ${t}</a>`).join('')}
       <button class="knop-link" id="obUit">Uitloggen</button>
       <small class="zacht ob-versie">Versie ${VERSIE}</small>
     </div>`;
  const menu = document.getElementById('obMenu'), meer = document.getElementById('obMeer');
  meer.onclick = () => { menu.hidden = !menu.hidden; meer.setAttribute('aria-expanded', String(!menu.hidden)); };
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.hidden = true; }));
  document.getElementById('obUit').onclick = async () => { log('uitgelogd'); await sb.auth.signOut(); location.hash = '#/'; };
}

function zetNavigatie() {
  const nav = document.getElementById('nav');
  if (!sessie.user) { nav.innerHTML = ''; zetOnderbalk([]); return; }
  const links = sessie.rol === 'trainer'
    ? [['#/', 'Home'], ['#/spelers', 'Spelers'], ['#/wedstrijden', 'Wedstrijden'], ['#/kalender', 'Kalender'], ['#/trainingen', 'Trainingen'], ['#/playbook', 'Playbook'], ['#/import', 'Importeren'],
       ['#/accounts', 'Accounts']]
    : [['#/', 'Home'], ['#/mijn', 'Mijn rapport'], ['#/matchen', 'Mijn matchen'], ['#/kalender', 'Kalender'], ['#/playbook', 'Playbook'],
       ...(sessie.watcher ? [['#/watcher', 'Match volgen']] : [])];
  nav.innerHTML = links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('') +
    `<span id="seizoenPlek"></span><button class="knop-link" id="uitloggen">Uitloggen</button>`;
  seizoenKeuzeHtml().then(html => {
    const plek = document.getElementById('seizoenPlek');
    if (!plek) return;
    plek.innerHTML = html;
    document.getElementById('seizoenKeuze').onchange = e => { kiesSeizoen(e.target.value); route(); };
  });
  document.getElementById('uitloggen').onclick = async () => { log('uitgelogd'); await sb.auth.signOut(); location.hash = '#/'; };
  zetOnderbalk(links);
  markeerActief();
}

function markeerActief() {
  const hoofd = location.hash.split('/')[1] || '';   // '' = home
  document.querySelectorAll('#nav a, #onderbalk a').forEach(a => {
    const doel = a.getAttribute('href').split('/')[1] || '';
    const actief = doel === hoofd || (doel === 'spelers' && ['speler', 'rapport'].includes(hoofd)) ||
      (doel === 'wedstrijden' && ['wedstrijd', 'live', 'stats'].includes(hoofd)) ||
      (doel === 'watcher' && hoofd === 'live') ||
      (doel === 'spelers' && hoofd === 'vaardigheden') ||
      (doel === 'trainingen' && hoofd === 'training') ||
      (doel === 'accounts' && hoofd === 'logboek') ||
      (doel === 'playbook' && hoofd === 'systeem') ||
      (doel === 'wedstrijden' && ['voorbereiding', 'opstelling'].includes(hoofd)) ||
      (doel === 'mijn' && hoofd === 'zelfevaluatie');
    a.classList.toggle('actief', actief);
  });
}

function nietGeconfigureerd() {
  toon(`<section class="kaart smal">
    <h2>Nog even instellen</h2>
    <p>De app is nog niet verbonden met een database. Open <code>js/config.js</code> en vul je
    Supabase-gegevens in. In <code>README.md</code> staat stap voor stap hoe dat gaat.</p>
  </section>`);
}

function loginView(modus = 'login') {
  const reg = modus === 'registreer';
  toon(`<section class="kaart smal login"><img class="login-logo" src="img/logo.png" alt="Logo">
    <h2>${reg ? 'Account aanmaken' : 'Inloggen'}</h2>
    <p class="zacht">${reg
      ? 'Maak een account aan met je e-mailadres. Daarna kies je wie je bent.'
      : 'Log in om je rapporten en goals te bekijken.'}</p>
    <form id="loginForm" class="formulier">
      <label>E-mailadres<input type="email" name="email" required autocomplete="email"></label>
      <label>Wachtwoord<input type="password" name="wachtwoord" required minlength="6"
        autocomplete="${reg ? 'new-password' : 'current-password'}"></label>
      <button class="knop" type="submit">${reg ? 'Account aanmaken' : 'Inloggen'}</button>
    </form>
    <p class="wissel">${reg
      ? 'Heb je al een account? <a href="#" id="wissel">Inloggen</a>'
      : 'Nog geen account? <a href="#" id="wissel">Account aanmaken</a>'}</p>
    ${reg ? '' : '<p class="wissel"><a href="#" id="vergeten">Wachtwoord vergeten?</a></p>'}
  </section>`);
  const vergeten = document.getElementById('vergeten');
  if (vergeten) vergeten.onclick = e => { e.preventDefault(); vergetenView(); };
  document.getElementById('wissel').onclick = e => { e.preventDefault(); loginView(reg ? 'login' : 'registreer'); };
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const email = f.get('email').trim(), password = f.get('wachtwoord');
    const knop = e.target.querySelector('button'); knop.disabled = true;
    try {
      if (reg) {
        const { data, error } = await sb.auth.signUp({
          email, password, options: { emailRedirectTo: location.origin + location.pathname },
        });
        if (error) throw error;
        if (data.session) log('account_aangemaakt');
        if (!data.session) {
          melding('Account aangemaakt. Bevestig je e-mailadres via de mail die je kreeg, en log daarna in.');
          loginView('login');
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          if (/not confirmed/i.test(error.message)) return nietBevestigd(email);
          throw new Error(vertaalFout(error.message));
        }
        log('ingelogd');
      }
    } catch (err) {
      melding(vertaalFout(err.message), 'fout');
    } finally { knop.disabled = false; }
  };
}

// Stap 1: e-mailadres invullen, Supabase stuurt een link
function vergetenView() {
  toon(`<section class="kaart smal login"><img class="login-logo" src="img/logo.png" alt="Logo">
    <h2>Wachtwoord vergeten</h2>
    <p class="zacht">Vul je e-mailadres in. Je krijgt een mail met een link om een nieuw wachtwoord te kiezen.</p>
    <form id="vergetenForm" class="formulier">
      <label>E-mailadres<input type="email" name="email" required autocomplete="email"></label>
      <button class="knop">Stuur mij een link</button>
    </form>
    <p class="zacht" style="font-size:.9rem">Geen mail gekregen na een paar minuten (kijk ook in je spam)?
      Vraag je trainer om een nieuw wachtwoord voor je in te stellen.</p>
    <p class="wissel"><a href="#" id="terugLogin">Terug naar inloggen</a></p>
  </section>`);
  document.getElementById('terugLogin').onclick = e => { e.preventDefault(); loginView(); };
  document.getElementById('vergetenForm').onsubmit = async e => {
    e.preventDefault();
    const knop = e.target.querySelector('button'); knop.disabled = true;
    const email = new FormData(e.target).get('email').trim();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) { melding(/rate limit|too many|security purposes/i.test(error.message)
      ? 'Er werden net te veel mails verstuurd. Probeer later opnieuw, of vraag je trainer om een nieuw wachtwoord.'
      : vertaalFout(error.message), 'fout'); knop.disabled = false; return; }
    toon(`<section class="kaart smal login leeg"><img class="login-logo" src="img/logo.png" alt="Logo">
      <h2>Kijk in je mailbox</h2><p>Als er een account bestaat voor <b>${esc(email)}</b>, kreeg je een mail met een link.
      Klik erop om een nieuw wachtwoord te kiezen. Kijk ook in je spam.</p>
      <p class="wissel"><a href="#" id="terugLogin">Terug naar inloggen</a></p></section>`);
    document.getElementById('terugLogin').onclick = ev => { ev.preventDefault(); loginView(); };
  };
}

// Stap 2: via de link uit de mail terug op de site: nieuw wachtwoord kiezen
function nieuwWachtwoordView() {
  toon(`<section class="kaart smal login"><img class="login-logo" src="img/logo.png" alt="Logo">
    <h2>Nieuw wachtwoord</h2>
    <form id="nieuwWwForm" class="formulier">
      <label>Nieuw wachtwoord<input type="password" name="ww" required minlength="6" autocomplete="new-password"></label>
      <label>Nog eens<input type="password" name="ww2" required minlength="6" autocomplete="new-password"></label>
      <button class="knop">Opslaan</button>
    </form>
  </section>`);
  document.getElementById('nieuwWwForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (f.get('ww') !== f.get('ww2')) return melding('De twee wachtwoorden zijn niet gelijk.', 'fout');
    const knop = e.target.querySelector('button'); knop.disabled = true;
    const { error } = await sb.auth.updateUser({ password: f.get('ww') });
    if (error) { melding(vertaalFout(error.message), 'fout'); knop.disabled = false; return; }
    window.__herstel = false;
    melding('Je wachtwoord is gewijzigd.');
    history.replaceState(null, '', location.pathname + '#/');
    route();
  };
}

function vertaalFout(m) {
  if (/invalid login credentials/i.test(m)) return 'E-mailadres of wachtwoord klopt niet.';
  if (/already registered/i.test(m)) return 'Er bestaat al een account met dit e-mailadres. Log in.';
  if (/password should be at least/i.test(m)) return 'Je wachtwoord moet minstens 6 tekens lang zijn.';
  // Mailgrens van Supabase (bevestigingsmail): geen schuld van de speler, de trainer moet "Confirm email" uitzetten
  if (/email rate limit|sending.*email|error sending/i.test(m))
    return 'Er kan nu geen bevestigingsmail verstuurd worden. Vraag je trainer om in Supabase "Confirm email" uit te zetten, en probeer het daarna opnieuw.';
  if (/rate limit|too many/i.test(m)) return 'Te veel pogingen. Wacht even en probeer opnieuw.';
  if (/not confirmed/i.test(m)) return 'Je e-mailadres is nog niet bevestigd.';
  if (/different from the old/i.test(m)) return 'Kies een ander wachtwoord dan je vorige.';
  return m;
}

function nietBevestigd(email) {
  toon(`<section class="kaart smal">
    <h2>Bevestig je e-mailadres</h2>
    <p>Je e-mailadres <b>${esc(email)}</b> is nog niet bevestigd. Klik op de link in de mail die je kreeg
      (kijk ook in je spam) en log daarna opnieuw in.</p>
    <div class="rij"><button class="knop" id="opnieuw">Stuur de mail opnieuw</button>
      <a href="#" id="terugLogin">Terug naar inloggen</a></div>
  </section>`);
  document.getElementById('terugLogin').onclick = e => { e.preventDefault(); loginView(); };
  document.getElementById('opnieuw').onclick = async e => {
    e.target.disabled = true;
    const { error } = await sb.auth.resend({
      type: 'signup', email, options: { emailRedirectTo: location.origin + location.pathname },
    });
    if (error) { melding(vertaalFout(error.message), 'fout'); e.target.disabled = false; }
    else melding('Mail verstuurd. Kijk in je inbox (en spam).');
  };
}

async function laadRol() {
  // kan_watchen bestaat pas na update-7; zonder die kolom gewoon de rol lezen
  const p = await q(sb.from('profiles').select('role, kan_watchen').eq('id', sessie.user.id).maybeSingle())
    .catch(() => q(sb.from('profiles').select('role').eq('id', sessie.user.id).maybeSingle()));
  sessie.rol = p?.role === 'watcher' ? 'speler' : (p?.role || 'speler');
  sessie.watcher = p?.role === 'watcher' || !!p?.kan_watchen;
}

async function route() {
  if (!isGeconfigureerd) return nietGeconfigureerd();
  if (!sessie.user) return loginView();
  if (window.__herstel) return nieuwWachtwoordView();   // via de link uit de wachtwoord-mail
  markeerActief();
  const [, pad, a, b] = location.hash.split('/');
  try {
    // Testversie: enkel voor trainers
    if (IS_TEST && sessie.rol !== 'trainer') {
      return toon(`<section class="kaart smal leeg"><h2>Testversie</h2>
        <p>Deze testversie is enkel voor trainers. Gebruik de gewone app:</p>
        <p><a class="knop" href="../">Naar de app</a></p></section>`);
    }
    if (pad === 'app') return installeerView();
    if (sessie.rol !== 'trainer') {
      if (sessie.watcher && pad === 'live') return await liveView(a);
      if (sessie.watcher && pad === 'watcher') return await watcherView();
      if (pad === 'zelfevaluatie') return await zelfevaluatieView(a === 'nieuw' ? null : a);
      if (pad === 'mijn' || pad === 'kies') return await mijnView();
      if (pad === 'avatar') return await avatarView();
      if (pad === 'matchen') return await mijnMatchenView();
      if (pad === 'kalender') return await kalenderView();
      if (pad === 'opstelling') return await opstellingView(a);
      if (pad === 'playbook') return await playbookView();
      if (pad === 'systeem') return await systeemView(a);
      if (pad === 'schieten') return await schietenView();
      return await homeView();
    }
    switch (pad) {
      case 'speler': return await spelerView(a);
      case 'rapport': return a === 'nieuw' ? await rapportView(null, b) : await rapportView(a);
      case 'wedstrijden': return await wedstrijdenView();
      case 'wedstrijd': return await wedstrijdView(a);
      case 'live': return await liveView(a);
      case 'stats': return await statsView(a);
      case 'accounts': return await accountsView();
      case 'trainingen': return await trainingenView();
      case 'training': return await trainingView(a);
      case 'schietstats': return await schietStatsView();
      case 'logboek': return await logboekView();
      case 'kalender': return await kalenderView();
      case 'voorbereiding': return await voorbereidingView();
      case 'opstelling': return await opstellingView(a);
      case 'playbook': return await playbookView();
      case 'xp': return await xpRanglijstView();
      case 'avatar': return await avatarView();
      case 'systeem': return await systeemView(a);
      case 'import': return await importView();
      case 'vaardigheden': return await vaardighedenView();
      case 'spelers': return await spelersView();
      default: return await homeView();
    }
  } catch (e) { fout(e); }
}

async function start() {
  if (!isGeconfigureerd) return nietGeconfigureerd();
  laden();
  const { data } = await sb.auth.getSession();
  sessie.user = data.session?.user || null;
  // Bestaat het account nog? (bv. verwijderd terwijl de gsm nog ingelogd was) Zo niet: netjes uitloggen.
  // Enkel bij een duidelijk "bestaat niet", niet bij geen verbinding.
  if (sessie.user) {
    const { error } = await sb.auth.getUser();
    if (error && /does not exist|user_not_found|not found|session_not_found/i.test(`${error.code} ${error.message}`)) {
      await sb.auth.signOut().catch(() => {});
      localStorage.removeItem('appInstallatieGelogd');
      sessie.user = null;
      setTimeout(() => melding('Je account bestaat niet meer. Maak een nieuw account aan.', 'fout'), 300);
    }
  }
  if (sessie.user) { await laadRol().catch(fout); meldAppGebruik(); }
  zetNavigatie();
  if (sessie.user && window.__herstel) nieuwWachtwoordView(); else await route();

  sb.auth.onAuthStateChange(async (event, s) => {
    const nieuw = s?.user || null;
    if (event === 'PASSWORD_RECOVERY') {
      sessie.user = nieuw;
      if (nieuw) await laadRol().catch(fout);
      zetNavigatie();
      return nieuwWachtwoordView();
    }
    if (nieuw?.id === sessie.user?.id) return;
    sessie.user = nieuw;
    sessie.rol = null;
    if (nieuw) { await laadRol().catch(fout); meldAppGebruik(); }
    zetNavigatie();
    if (location.hash === '#/') route(); else location.hash = '#/';
  });
  window.addEventListener('hashchange', route);
}

// Installeerbaar als app
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installeer = e; });

start();
