// Trainer: live statistieken van een wedstrijd, ververst automatisch terwijl de watcher ingeeft.
import { sb, q } from '../supabase.js';
import { toon, esc, laden, bijVerlaten } from '../ui.js';
import { PLOEGNAAM } from '../config.js';
import {
  scoreUitEvents, schotStats, resultaatVerdeling, filterHelft, actieveStraffen, formatKlok, klokSeconden, telSoort,
} from '../lib/live.js';

const ZONE_PIJL = ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'];

export async function statsView(matchId) {
  laden();
  let [match, spelers, events] = await Promise.all([
    q(sb.from('matches').select('*').eq('id', matchId).maybeSingle()),
    q(sb.from('players').select('id, naam, rugnummer').order('rugnummer', { nullsFirst: false }).order('naam')),
    q(sb.from('match_events').select('*').eq('match_id', matchId)).catch(err => {
      throw new Error(/match_events|schema cache/i.test(err.message) ? 'Voer eerst supabase/update-5-live.sql uit in Supabase.' : err.message);
    }),
  ]);
  if (!match) throw new Error('Deze wedstrijd bestaat niet (meer).');
  let helft = 0;              // 0 = hele match
  let laatsteUpdate = new Date();

  toon(`<a class="terug" href="#/wedstrijd/${match.id}">← Wedstrijd</a>
    <section class="scorebord">
      <div class="ploegen"><span>${esc(PLOEGNAAM)}</span><b id="sScore">0 – 0</b><span>${esc(match.tegenstander)}</span></div>
      <div class="klokrij"><span id="sHelft"></span><b id="sKlok">–</b></div>
      <div id="sStraffen" class="straffen"></div>
    </section>
    <div class="rij tussen" style="margin-bottom:1rem">
      <div class="tabs" id="tabs">
        <button data-h="0" class="actief">Hele match</button><button data-h="1">1e helft</button><button data-h="2">2e helft</button>
      </div>
      <span class="zacht" id="sLive"></span>
    </div>
    <div id="sInhoud"></div>`);

  const naam = id => spelers.find(s => s.id === id);
  const kort = s => s ? `#${s.rugnummer ?? '?'} ${s.naam}` : 'Onbekend';

  function tekenKlok() {
    const k = match.klok;
    document.getElementById('sKlok').textContent = k ? formatKlok(klokSeconden(k, Date.now())) : '–';
    document.getElementById('sHelft').textContent = k ? `${k.helft}e helft${k.sinds == null ? ' · gepauzeerd' : ''}` : 'klok niet gestart';
    const nu = k ? { helft: k.helft, seconde: klokSeconden(k, Date.now()) } : null;
    document.getElementById('sStraffen').innerHTML = nu ? actieveStraffen(events, nu, k.helftDuur).map(s =>
      `<span class="strafje ${s.tegen ? 'tegen' : ''}">⏱ ${s.tegen ? esc(match.tegenstander) : esc(kort(naam(s.player_id)))} ${formatKlok(s.resterend)}</span>`).join('') : '';
    const sec = Math.round((Date.now() - laatsteUpdate) / 1000);
    document.getElementById('sLive').textContent = `● live · bijgewerkt ${sec < 5 ? 'zonet' : `${sec} s geleden`}`;
  }

  function teken() {
    const s = scoreUitEvents(events);
    document.getElementById('sScore').textContent = `${s.voor} – ${s.tegen}`;
    const ev = filterHelft(events, helft);
    const v = resultaatVerdeling(ev);
    const st = schotStats(ev);
    const sc = scoreUitEvents(ev);
    const maxPos = Math.max(1, ...st.perPositie.map(p => p.schoten));
    const maxZone = Math.max(1, ...st.perZone.map(z => z.goals + z.gestopt));
    const pctTekst = x => (x == null ? '–' : `${x}%`);

    const perSpeler = spelers.map(sp => {
      const eigen = ev.filter(e => e.player_id === sp.id);
      const r = resultaatVerdeling(eigen);
      const straf = eigen.filter(e => e.soort === 'twee_min').length;
      const verlies = telSoort(eigen, 'balverlies');
      if (!r.schoten && !straf && !verlies) return null;
      return { sp, r, straf, verlies };
    }).filter(Boolean).sort((a, b) => b.r.schoten - a.r.schoten);

    document.getElementById('sInhoud').innerHTML = !ev.length
      ? '<section class="kaart leeg"><p>Nog niets ingegeven' + (helft ? ' in deze helft' : '') + '. Dit scherm ververst vanzelf.</p></section>'
      : `
      <div class="stats">
        <div class="stat"><div class="titel">Schoten</div><div class="waarde">${v.schoten}</div></div>
        <div class="stat"><div class="titel">Goals</div><div class="waarde ok-kleur">${pctTekst(v.goal.pct)}</div><small class="zacht">${v.goal.aantal} goals</small></div>
        <div class="stat"><div class="titel">Gestopt door keeper</div><div class="waarde beter-kleur">${pctTekst(v.redding.pct)}</div><small class="zacht">${v.redding.aantal} reddingen</small></div>
        <div class="stat"><div class="titel">Mis (naast/over/paal)</div><div class="waarde rood">${pctTekst(v.mis.pct)}</div><small class="zacht">${v.mis.aantal} missers</small></div>
        <div class="stat"><div class="titel">Balverlies</div><div class="waarde">${telSoort(ev, 'balverlies')}</div></div>
        <div class="stat"><div class="titel">Tegengoals</div><div class="waarde">${sc.tegen}</div></div>
      </div>
      <div class="verdeling" title="Goals / reddingen / missers">
        <span class="v-goal" style="flex:${v.goal.aantal}"></span><span class="v-redding" style="flex:${v.redding.aantal}"></span><span class="v-mis" style="flex:${v.mis.aantal}"></span>
      </div>

      <div class="raster">
        <section class="kaart"><h3>Van waar wordt geschoten?</h3>
          ${st.perPositie.sort((a, b) => b.schoten - a.schoten).map(p => `<div class="pos-rij">
            <span>${esc(p.naam)}</span>
            <div class="pos-balk"><span class="pb-goal" style="width:${(p.goals / maxPos) * 100}%"></span><span class="pb-rest" style="width:${((p.schoten - p.goals) / maxPos) * 100}%"></span></div>
            <b>${p.goals}/${p.schoten}</b><small class="zacht">${p.pct}%</small></div>`).join('')}
          <p class="zacht" style="font-size:.85rem">Oranje = goal, grijs = gestopt of mis.</p>
        </section>
        <section class="kaart"><h3>Waar in het doel?</h3>
          <div class="doel-raster doelkaart">${st.perZone.map((z, i) => {
            const t = z.goals + z.gestopt;
            return `<div class="vak" style="background:color-mix(in srgb, var(--accent) ${t ? Math.round(12 + (t / maxZone) * 55) : 0}%, var(--kaart))">
              ${t ? `<span><b>${z.goals}/${t}</b>${ZONE_PIJL[i]} gescoord</span>` : ''}</div>`;
          }).join('')}</div>
          <p class="zacht" style="font-size:.85rem;text-align:center">Gescoord / op doel (goal + redding), gezien vanuit de schutter.</p>
        </section>
      </div>

      <section class="kaart"><h3>Per speler</h3>
        <table class="tabel"><thead><tr><th>Speler</th><th>Goals</th><th>Schoten</th><th>%</th><th>Gestopt</th><th>Mis</th><th>Balverlies</th><th>2 min</th></tr></thead>
        <tbody>${perSpeler.map(({ sp, r, straf, verlies }) => `<tr><td>${esc(kort(sp))}</td><td><b>${r.goal.aantal}</b></td><td>${r.schoten}</td>
          <td>${pctTekst(r.goal.pct)}</td><td>${r.redding.aantal}</td><td>${r.mis.aantal}</td><td>${verlies || ''}</td><td>${straf || ''}</td></tr>`).join('')}</tbody></table>
      </section>`;
    tekenKlok();
  }

  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
    helft = Number(b.dataset.h);
    document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('actief', x === b));
    teken();
  });

  // ---------- Live verversen: Realtime, met elke 20 s een volledige herlading als vangnet ----------
  async function herlaad() {
    try {
      [events, match] = await Promise.all([
        q(sb.from('match_events').select('*').eq('match_id', matchId)),
        q(sb.from('matches').select('*').eq('id', matchId).single()),
      ]);
      laatsteUpdate = new Date();
      teken();
    } catch { /* geen verbinding: volgende keer opnieuw */ }
  }
  let wacht = null;
  const binnenkort = () => { clearTimeout(wacht); wacht = setTimeout(herlaad, 300); };
  const kanaal = sb.channel(`stats-${matchId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` }, binnenkort)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, binnenkort)
    .subscribe();
  const vangnet = setInterval(herlaad, 20000);
  const tik = setInterval(tekenKlok, 1000);
  bijVerlaten(() => { clearInterval(vangnet); clearInterval(tik); clearTimeout(wacht); sb.removeChannel(kanaal); });

  teken();
}
