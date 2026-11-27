// Startpagina: elke persoon ziet zijn eigen taken.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding } from '../ui.js';
import { sessie } from '../app.js';
import { formatDatum } from '../lib/voortgang.js';
import { laadMatchenVanVandaag, matchStartHtml, koppelMatchStart } from './matchstart.js';
import { mijnView } from './mijn.js';
import { openTraining } from './trainingen.js';
import { installeerHtml, koppelInstalleer } from '../installeer.js';
import { heroHtml, koppelHero } from './hero.js';
import { laadKalender } from '../kalender-data.js';
import { volgendeMatch } from '../lib/kalender.js';
import { compTag } from '../comp-tag.js';
import { VELD7 } from '../lib/opstelling.js';
import { vandaag } from '../ui.js';
import { opSeizoen, gekozenSeizoen } from '../seizoen-keuze.js';

const tegel = (href, icoon, titel, sub = '') =>
  `<a class="tegel" href="${href}"><span class="tegel-icoon">${icoon}</span><b>${titel}</b>${sub ? `<small class="zacht">${sub}</small>` : ''}</a>`;

const voornaam = naam => esc((naam || '').split(' ')[0]);
const DAG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MAAND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

// "Volgende match" uit de kalender (als die vandaag is en al bovenaan staat, de match erna)
async function volgendeMatchHtml(naVandaag = false, spelerId = null) {
  const items = await laadKalender().catch(() => []);
  const v = volgendeMatch(items, naVandaag ? vandaagPlusEen() : vandaag());
  if (!v) return '';
  const d = new Date(v.datum + 'T12:00:00Z');
  const wanneer = v.datum === vandaag() ? 'Vandaag' : `${DAG[d.getUTCDay()]} ${d.getUTCDate()} ${MAAND[d.getUTCMonth()]}`;

  // Gedeelde opstelling? Dan een link, en voor een speler: waar hij zelf staat
  let opst = '';
  if (v.match_id && sessie.rol !== 'trainer') {
    const o = await q(sb.rpc('gedeelde_opstelling', { wedstrijd: v.match_id })).catch(() => null);
    if (o) {
      const pos = spelerId && Object.entries(o.posities || {}).find(([, id]) => id === spelerId)?.[0];
      const naam = pos && VELD7.find(p => p.code === pos)?.naam;
      const ik = naam ? `Jij start als <b>${esc(naam.toLowerCase())}</b>.` : spelerId && (o.bank || []).includes(spelerId) ? 'Jij zit in de selectie.' : '';
      opst = `<a class="vm-opstelling" href="#/opstelling/${v.match_id}">📋 Bekijk de opstelling ${ik ? `· ${ik}` : ''}</a>`;
    }
  }
  return `<a class="volgende-match" href="#/kalender">
    <span class="vm-label">Volgende match</span>
    <span class="vm-wanneer"><b>${wanneer}</b>${v.uur ? ` · ${esc(v.uur)}` : ''}</span>
    <span class="vm-wie">${v.thuis ? 'Thuis tegen' : 'Uit bij'} <b>${esc(v.tegenstander)}</b> ${compTag(v.competitie)}</span>
    <span class="vm-pijl" aria-hidden="true">📆</span></a>${opst}`;
}
function vandaagPlusEen() { const d = new Date(vandaag() + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }

export async function homeView() {
  laden();
  if (sessie.rol === 'trainer') return trainerHome();

  const speler = await q(sb.from('players').select('id, naam').eq('user_id', sessie.user.id).maybeSingle());
  // Gewone speler zonder gekoppelde speler: eerst kiezen wie hij is
  if (!speler && !sessie.watcher) return mijnView();

  const delen = [];
  if (sessie.watcher) {
    const matchen = await laadMatchenVanVandaag();
    delen.push(matchStartHtml(matchen));
  }
  if (speler) {
    const [rapport, goals] = await Promise.all([
      q(sb.from('reports').select('datum').eq('player_id', speler.id).order('datum', { ascending: false }).limit(1)),
      q(sb.from('goals').select('aantal, matches(datum)').eq('player_id', speler.id)).then(g => opSeizoen(g, x => x.matches?.datum)),
    ]);
    const totaal = goals.reduce((t, g) => t + g.aantal, 0);
    delen.push(`<div class="tegels">
      ${tegel('#/mijn', '📋', 'Mijn rapport', rapport[0] ? `laatste: ${formatDatum(rapport[0].datum)}` : 'nog geen rapport')}
      ${tegel('#/matchen', '🤾', 'Mijn matchen', `${goals.length} matchen · ${totaal} goals`)}
      ${tegel('#/schieten', '🎯', 'Schiettraining', 'noteer je schoten')}
      ${tegel('#/playbook', '📖', 'Playbook', 'onze aanvalssystemen')}
      ${tegel('#/zelfevaluatie/nieuw', '🪞', 'Zelfevaluatie', 'hoe vind jij dat het gaat?')}
      ${sessie.watcher ? tegel('#/watcher', '📝', 'Alle matchen volgen', 'als matchwatcher') : ''}
    </div>`);
  } else {
    delen.push(`<div class="tegels">${tegel('#/watcher', '📝', 'Alle matchen', 'kies een match om te volgen')}
      ${tegel('#/kies', '🙋', 'Ben je ook speler?', 'kies wie je bent')}</div>`);
  }

  const held = await heroHtml({ groet: `Hoi ${speler ? voornaam(speler.naam) : 'matchwatcher'} 👋` });
  const volgende = await volgendeMatchHtml(sessie.watcher, speler?.id ?? null);
  toon(`<div class="home">
    ${held}
    ${volgende}
    ${delen.join('')}
    ${installeerHtml()}
  </div>`);
  koppelMatchStart({ herlaad: homeView });
  koppelInstalleer();
}

async function trainerHome() {
  const [matchen, spelers, rapporten] = await Promise.all([
    laadMatchenVanVandaag(),
    q(sb.from('players').select('id, rugnummer')),
    q(sb.from('reports').select('player_id, datum')).then(r => opSeizoen(r, x => x.datum)),
  ]);
  const metRapport = new Set(rapporten.map(r => r.player_id));
  const zonderRapport = spelers.filter(s => !metRapport.has(s.id)).length;
  const zonderNummer = spelers.filter(s => s.rugnummer == null).length;

  const held = await heroHtml({ groet: 'Hoi coach 👋', trainer: true });
  toon(`<div class="home">
    ${held}
    ${matchStartHtml(matchen, { trainer: true })}
    ${await volgendeMatchHtml(true)}
    <div class="tegels">
      ${tegel('#/spelers', '👥', 'Spelers', `${spelers.length} spelers${zonderRapport ? ` · ${zonderRapport} zonder rapport dit seizoen` : ''}${zonderNummer ? ` · ${zonderNummer} zonder nummer` : ''}`)}
      ${tegel('#/voorbereiding', '📋', 'Matchvoorbereiding', 'opstelling op het veld')}
      ${tegel('#/playbook', '📖', 'Playbook', 'aanvalssystemen tekenen')}
      ${tegel('#/wedstrijden', '🤾', 'Wedstrijden', 'uitslagen, live stats, verloop')}
      <a class="tegel" href="#" id="trainingVandaag"><span class="tegel-icoon">✅</span><b>Training vandaag</b><small class="zacht">aanwezigheden afvinken</small></a>
      ${tegel('#/trainingen', '📅', 'Trainingen', 'aanwezigheid per speler')}
      ${tegel('#/schietstats', '🎯', 'Schiettraining-stats', 'ranglijst spelers en doelmannen')}
      ${tegel('#/import', '⬇️', 'Importeren', 'Clubee of een lijst plakken')}
      ${tegel('#/accounts', '🔑', 'Accounts', 'matchwatchers aanduiden')}
      ${tegel('#/logboek', '📜', 'Logboek', 'wie logde in, welke fouten')}
      ${tegel('#/vaardigheden', '🎯', 'Vaardigheden', 'scores in de rapporten')}
    </div>
    ${installeerHtml()}
  </div>`);
  koppelInstalleer();
  koppelMatchStart({ trainer: true, herlaad: trainerHome });
  koppelHero(trainerHome);
  document.getElementById('trainingVandaag').onclick = e => { e.preventDefault(); openTraining().catch(err => melding(err.message, 'fout')); };
}
