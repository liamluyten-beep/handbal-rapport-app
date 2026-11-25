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
import { zelfevaluatieView } from './views/zelfevaluatie.js';

export const sessie = { user: null, rol: null };

document.title = PLOEGNAAM;
document.getElementById('ploegnaam').textContent = PLOEGNAAM;

function zetNavigatie() {
  const nav = document.getElementById('nav');
  if (!sessie.user) { nav.innerHTML = ''; return; }
  const links = sessie.rol === 'trainer'
    ? [['#/spelers', 'Spelers'], ['#/wedstrijden', 'Wedstrijden'], ['#/import', 'Importeren'], ['#/vaardigheden', 'Vaardigheden']]
    : [['#/mijn', 'Mijn progressie']];
  nav.innerHTML = links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('') +
    `<button class="knop-link" id="uitloggen">Uitloggen</button>`;
  document.getElementById('uitloggen').onclick = async () => { await sb.auth.signOut(); location.hash = '#/'; };
  markeerActief();
}

function markeerActief() {
  const hoofd = location.hash.split('/')[1] || '';
  document.querySelectorAll('#nav a').forEach(a => {
    const doel = a.getAttribute('href').split('/')[1];
    const actief = doel === hoofd || (doel === 'spelers' && ['speler', 'rapport'].includes(hoofd)) ||
      (doel === 'wedstrijden' && ['wedstrijd', 'live'].includes(hoofd)) ||
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
  </section>`);
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
      }
    } catch (err) {
      melding(vertaalFout(err.message), 'fout');
    } finally { knop.disabled = false; }
  };
}

function vertaalFout(m) {
  if (/invalid login credentials/i.test(m)) return 'E-mailadres of wachtwoord klopt niet.';
  if (/already registered/i.test(m)) return 'Er bestaat al een account met dit e-mailadres. Log in.';
  if (/password should be at least/i.test(m)) return 'Je wachtwoord moet minstens 6 tekens lang zijn.';
  if (/rate limit|too many/i.test(m)) return 'Te veel pogingen. Wacht even en probeer opnieuw.';
  if (/not confirmed/i.test(m)) return 'Je e-mailadres is nog niet bevestigd.';
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
  const p = await q(sb.from('profiles').select('role').eq('id', sessie.user.id).maybeSingle());
  sessie.rol = p?.role || 'speler';
}

async function route() {
  if (!isGeconfigureerd) return nietGeconfigureerd();
  if (!sessie.user) return loginView();
  markeerActief();
  const [, pad, a, b] = location.hash.split('/');
  try {
    if (sessie.rol !== 'trainer') {
      if (pad === 'zelfevaluatie') return await zelfevaluatieView(a === 'nieuw' ? null : a);
      return await mijnView();
    }
    switch (pad) {
      case 'speler': return await spelerView(a);
      case 'rapport': return a === 'nieuw' ? await rapportView(null, b) : await rapportView(a);
      case 'wedstrijden': return await wedstrijdenView();
      case 'wedstrijd': return await wedstrijdView(a);
      case 'live': return await liveView(a);
      case 'import': return await importView();
      case 'vaardigheden': return await vaardighedenView();
      default: return await spelersView();
    }
  } catch (e) { fout(e); }
}

async function start() {
  if (!isGeconfigureerd) return nietGeconfigureerd();
  laden();
  const { data } = await sb.auth.getSession();
  sessie.user = data.session?.user || null;
  if (sessie.user) await laadRol().catch(fout);
  zetNavigatie();
  await route();

  sb.auth.onAuthStateChange(async (event, s) => {
    const nieuw = s?.user || null;
    if (nieuw?.id === sessie.user?.id) return;
    sessie.user = nieuw;
    sessie.rol = null;
    if (nieuw) await laadRol().catch(fout);
    zetNavigatie();
    if (location.hash === '#/') route(); else location.hash = '#/';
  });
  window.addEventListener('hashchange', route);
}

start();
