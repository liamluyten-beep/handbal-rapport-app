// Startpagina: elke persoon ziet zijn eigen taken.
import { sb, q } from '../supabase.js';
import { toon, esc, laden } from '../ui.js';
import { sessie } from '../app.js';
import { formatDatum } from '../lib/voortgang.js';
import { laadMatchenVanVandaag, matchStartHtml, koppelMatchStart } from './matchstart.js';
import { mijnView } from './mijn.js';

const tegel = (href, icoon, titel, sub = '') =>
  `<a class="tegel" href="${href}"><span class="tegel-icoon">${icoon}</span><b>${titel}</b>${sub ? `<small class="zacht">${sub}</small>` : ''}</a>`;

const voornaam = naam => esc((naam || '').split(' ')[0]);

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
      q(sb.from('goals').select('aantal').eq('player_id', speler.id)),
    ]);
    const totaal = goals.reduce((t, g) => t + g.aantal, 0);
    delen.push(`<div class="tegels">
      ${tegel('#/mijn', '📋', 'Mijn rapport', rapport[0] ? `laatste: ${formatDatum(rapport[0].datum)}` : 'nog geen rapport')}
      ${tegel('#/matchen', '🤾', 'Mijn matchen', `${goals.length} matchen · ${totaal} goals`)}
      ${tegel('#/zelfevaluatie/nieuw', '🪞', 'Zelfevaluatie', 'hoe vind jij dat het gaat?')}
      ${sessie.watcher ? tegel('#/watcher', '📝', 'Alle matchen volgen', 'als matchwatcher') : ''}
    </div>`);
  } else {
    delen.push(`<div class="tegels">${tegel('#/watcher', '📝', 'Alle matchen', 'kies een match om te volgen')}
      ${tegel('#/kies', '🙋', 'Ben je ook speler?', 'kies wie je bent')}</div>`);
  }

  toon(`<div class="home">
    <h1>Hoi ${speler ? voornaam(speler.naam) : ''}${speler ? '' : 'matchwatcher'} 👋</h1>
    ${delen.join('')}
  </div>`);
  koppelMatchStart({ herlaad: homeView });
}

async function trainerHome() {
  const [matchen, spelers, rapporten] = await Promise.all([
    laadMatchenVanVandaag(),
    q(sb.from('players').select('id, rugnummer')),
    q(sb.from('reports').select('player_id')),
  ]);
  const metRapport = new Set(rapporten.map(r => r.player_id));
  const zonderRapport = spelers.filter(s => !metRapport.has(s.id)).length;
  const zonderNummer = spelers.filter(s => s.rugnummer == null).length;

  toon(`<div class="home">
    <h1>Hoi coach 👋</h1>
    ${matchStartHtml(matchen, { trainer: true })}
    <div class="tegels">
      ${tegel('#/spelers', '👥', 'Spelers', `${spelers.length} spelers${zonderRapport ? ` · ${zonderRapport} zonder rapport` : ''}${zonderNummer ? ` · ${zonderNummer} zonder nummer` : ''}`)}
      ${tegel('#/wedstrijden', '🤾', 'Wedstrijden', 'uitslagen, live stats, verloop')}
      ${tegel('#/import', '⬇️', 'Importeren', 'Clubee of een lijst plakken')}
      ${tegel('#/accounts', '🔑', 'Accounts', 'matchwatchers aanduiden')}
      ${tegel('#/vaardigheden', '🎯', 'Vaardigheden', 'scores in de rapporten')}
    </div>
  </div>`);
  koppelMatchStart({ trainer: true, herlaad: trainerHome });
}
