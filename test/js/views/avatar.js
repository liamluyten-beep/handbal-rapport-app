// Avatar maken: speler kiest onderdelen; accessoires speel je vrij met XP-level of badges.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding } from '../ui.js';
import { sessie } from '../app.js';
import { ONDERDELEN, STANDAARD, normaliseerAvatar, isVrij, slotTekst, avatarSvg, volgendeOpLevel } from '../lib/avatar.js';
import { levelVan } from '../lib/xp.js';
import { BADGES } from '../lib/badges.js';
import { xpVanSpeler } from './xp.js';

const BADGE_NAMEN = Object.fromEntries(BADGES.map(b => [b.id, b.naam]));

export async function avatarView() {
  laden();
  // Trainer heeft geen eigen speler: voorbeeld waarin alles open staat (met het level erbij), niet opslaan
  const voorbeeld = sessie.rol === 'trainer';
  const speler = voorbeeld ? { rugnummer: 7, avatar: null, toon_avatar: false }
    : await q(sb.from('players').select('*').eq('user_id', sessie.user.id).maybeSingle());
  if (!speler) { location.hash = '#/mijn'; return; }
  // Avatar-spullen tellen op je XP van alle seizoenen samen, zodat je ze niet elk seizoen opnieuw moet vrijspelen
  const xp = voorbeeld ? { totaal: 0, badges: [] } : await xpVanSpeler(speler.id, { alleSeizoenen: true });
  const level = levelVan(xp.totaal).level;
  const badges = xp.badges.filter(b => b.behaald).map(b => b.id);
  const bewaard = speler.avatar ? normaliseerAvatar(speler.avatar) : null;
  let cfg = bewaard ? { ...bewaard } : { ...STANDAARD };
  // Wat al bewaard is, blijft bruikbaar
  const vrij = (deel, optie) => voorbeeld || isVrij(optie, { level, badges }) || bewaard?.[deel] === optie.id;
  const volgende = volgendeOpLevel(level, 3);

  toon(`<a class="terug" href="${voorbeeld ? '#/' : '#/mijn'}">← ${voorbeeld ? 'Home' : 'Mijn rapport'}</a>
    <div class="paginakop"><div><h1>${voorbeeld ? 'Avatar-spullen' : 'Mijn avatar'}</h1>
      ${voorbeeld ? '<p class="zacht">Voorbeeld voor de trainer: alle spullen staan open, met het level of de badge die een speler ervoor nodig heeft. Opslaan kan enkel een speler.</p>'
        : `<p class="zacht">Je bent level <b>${level}</b> (alle seizoenen samen). Met meer XP en badges speel je extra spullen vrij. Hoe hoger, hoe gekker.</p>
      ${volgende.length ? `<p class="zacht">Volgende: ${volgende.map(o => `<b>${esc(o.naam)}</b> (level ${o.level})`).join(', ')}</p>` : '<p><b>Je hebt alles vrijgespeeld. Legende!</b></p>'}`}</div></div>
    <div class="av-maker">
      <section class="kaart av-voorbeeld">
        <div class="av-groot" id="avGroot"></div>
        <label class="vinkje"><input type="checkbox" id="avToon" ${speler.toon_avatar || !speler.avatar ? 'checked' : ''}>
          Toon mijn avatar in plaats van mijn foto</label>
        <div class="rij"><button class="knop" id="avBewaar">Opslaan</button>
          <button class="knop tweede" id="avDobbel" type="button">🎲 Verras me</button></div>
      </section>
      <div id="avDelen"></div>
    </div>`);

  const teken = () => {
    document.getElementById('avGroot').innerHTML = avatarSvg(cfg, speler.rugnummer);
    document.getElementById('avDelen').innerHTML = ONDERDELEN.map(d => `<section class="kaart compact">
      <h3>${esc(d.naam)}</h3><div class="av-opties">${d.opties.map(o => {
        const open = vrij(d.id, o);
        return `<button type="button" class="av-optie ${cfg[d.id] === o.id ? 'gekozen' : ''} ${open ? '' : 'op-slot'}"
          data-deel="${d.id}" data-id="${o.id}" title="${esc(o.naam)}" aria-pressed="${cfg[d.id] === o.id}">
          <span class="av-mini">${avatarSvg({ ...cfg, [d.id]: o.id }, speler.rugnummer)}</span>
          <small>${!open ? `🔒 ${esc(slotTekst(o, BADGE_NAMEN))}`
            : voorbeeld && slotTekst(o, BADGE_NAMEN) ? `${esc(o.naam)}<br><b>${esc(slotTekst(o, BADGE_NAMEN))}</b>` : esc(o.naam)}</small></button>`;
      }).join('')}</div></section>`).join('');
    document.querySelectorAll('.av-optie').forEach(b => b.onclick = () => {
      const d = ONDERDELEN.find(x => x.id === b.dataset.deel), o = d.opties.find(x => x.id === b.dataset.id);
      if (!vrij(d.id, o)) return melding(`${o.naam}: vrij te spelen met ${slotTekst(o, BADGE_NAMEN).toLowerCase()}.`);
      cfg[d.id] = o.id; teken();
    });
  };
  teken();

  document.getElementById('avDobbel').onclick = () => {
    for (const d of ONDERDELEN) {
      const open = d.opties.filter(o => vrij(d.id, o));
      cfg[d.id] = open[Math.floor(Math.random() * open.length)].id;
    }
    teken();
  };

  document.getElementById('avBewaar').onclick = async e => {
    if (voorbeeld) return melding('Voorbeeld: enkel spelers kunnen hun avatar opslaan.');
    e.target.disabled = true;
    try {
      await q(sb.rpc('zet_mijn_avatar', { instelling: cfg, tonen: document.getElementById('avToon').checked }));
      melding('Avatar opgeslagen');
      location.hash = '#/mijn';
    } catch (err) {
      melding(/zet_mijn_avatar|schema cache|function/i.test(err.message)
        ? 'Dit werkt pas nadat de trainer update-20-avatar.sql heeft uitgevoerd in Supabase.' : err.message, 'fout');
      e.target.disabled = false;
    }
  };
}
