import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, vandaag } from '../ui.js';
import { formatDatum } from '../lib/voortgang.js';
import { schotStats, scoreUitEvents, verschilMetClubee, formatKlok } from '../lib/live.js';

export async function wedstrijdenView() {
  laden();
  const matches = await q(sb.from('matches').select('*, goals(aantal)').order('datum', { ascending: false }));
  toon(`
    <div class="paginakop"><div><h1>Wedstrijden</h1><p class="zacht">Vul per wedstrijd de goals van elke speler in.</p></div>
      <a class="knop tweede" href="#/import">Goals importeren</a></div>
    <section class="kaart">
      <h2>Nieuwe wedstrijd</h2>
      <form id="nieuwForm" class="formulier">
        <div class="velden">
          <label>Datum<input type="date" name="datum" required value="${vandaag()}"></label>
          <label>Tegenstander<input name="tegenstander" required placeholder="Bv. HC Visé"></label>
          <label>Thuis/uit<select name="thuis"><option value="1">Thuis</option><option value="0">Uit</option></select></label>
        </div>
        <div><button class="knop">Toevoegen en goals invullen</button></div>
      </form>
    </section>
    <section class="kaart">
      ${matches.length ? `<table class="tabel"><thead><tr><th>Datum</th><th>Tegenstander</th><th></th><th>Uitslag</th></tr></thead>
        <tbody>${matches.map(m => `<tr>
          <td>${formatDatum(m.datum)}</td>
          <td><a href="#/wedstrijd/${m.id}">${esc(m.tegenstander)}</a></td>
          <td><span class="label">${m.thuis ? 'thuis' : 'uit'}</span></td>
          <td>${m.score_voor != null ? `<b>${m.score_voor} – ${m.score_tegen}</b> ${m.score_voor > m.score_tegen ? '<span class="label ok">W</span>' : m.score_voor < m.score_tegen ? '<span class="label">V</span>' : '<span class="label">G</span>'}` : `${m.goals.reduce((t, g) => t + g.aantal, 0)} goals`}</td></tr>`).join('')}</tbody></table>`
      : '<p class="leeg">Nog geen wedstrijden.</p>'}
    </section>`);

  document.getElementById('nieuwForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const m = await q(sb.from('matches').insert({
        datum: f.get('datum'), tegenstander: f.get('tegenstander').trim(), thuis: f.get('thuis') === '1',
      }).select('id').single());
      location.hash = `#/wedstrijd/${m.id}`;
    } catch (err) {
      melding(err.message.includes('duplicate') ? 'Die wedstrijd bestaat al op deze datum.' : err.message, 'fout');
    }
  };
}

export async function wedstrijdView(id) {
  laden();
  const [m, spelers, goals, events] = await Promise.all([
    q(sb.from('matches').select('*').eq('id', id).maybeSingle()),
    q(sb.from('players').select('id, naam, rugnummer').order('rugnummer', { nullsFirst: false }).order('naam')),
    q(sb.from('goals').select('*').eq('match_id', id)),
    q(sb.from('match_events').select('*').eq('match_id', id)).catch(() => []),
  ]);
  if (!m) throw new Error('Deze wedstrijd bestaat niet (meer).');
  const per = Object.fromEntries(goals.map(g => [g.player_id, g]));

  toon(`<a class="terug" href="#/wedstrijden">← Alle wedstrijden</a>
    <section class="kaart">
      <div class="rapport-kop"><div><h1>${esc(m.tegenstander)}</h1>
        <p class="zacht">${formatDatum(m.datum)} · ${m.thuis ? 'thuis' : 'uit'}${m.score_voor != null ? ` · <b>${m.score_voor} – ${m.score_tegen}</b> (Clubee)` : ''}</p></div>
        <a class="knop" href="#/live/${m.id}">▶ Live volgen</a></div>
      <form id="goalsForm">
        <table class="tabel"><thead><tr><th>#</th><th>Speler</th><th>Goals</th><th>Pogingen (optioneel)</th></tr></thead>
        <tbody>${spelers.map(s => `<tr>
          <td>${esc(s.rugnummer ?? '')}</td><td>${esc(s.naam)}</td>
          <td><input type="number" min="0" name="g_${s.id}" value="${per[s.id]?.aantal ?? ''}" placeholder="0"></td>
          <td><input type="number" min="0" name="p_${s.id}" value="${per[s.id]?.pogingen ?? ''}"></td></tr>`).join('')}</tbody></table>
        <p class="zacht">Laat een veld leeg als de speler niet meespeelde.</p>
        <div class="rij tussen"><button class="knop">Goals opslaan</button>
          <button type="button" class="knop gevaar" id="verwijder">Wedstrijd verwijderen</button></div>
      </form>
    </section>
    ${liveSamenvatting(events, spelers, goals)}`);

  document.getElementById('goalsForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const opslaan = [], wissen = [];
    for (const s of spelers) {
      const g = f.get(`g_${s.id}`), p = f.get(`p_${s.id}`);
      if (g === '' && p === '') { if (per[s.id]) wissen.push(s.id); continue; }
      const aantal = Number(g || 0), pogingen = p === '' ? null : Number(p);
      if (pogingen != null && pogingen < aantal) {
        return melding(`${s.naam}: pogingen kan niet lager zijn dan goals.`, 'fout');
      }
      opslaan.push({ match_id: id, player_id: s.id, aantal, pogingen });
    }
    try {
      if (opslaan.length) await q(sb.from('goals').upsert(opslaan, { onConflict: 'match_id,player_id' }));
      if (wissen.length) await q(sb.from('goals').delete().eq('match_id', id).in('player_id', wissen));
      melding('Goals opgeslagen');
      location.hash = '#/wedstrijden';
    } catch (err) { melding(err.message, 'fout'); }
  };
  document.getElementById('verwijder').onclick = async () => {
    if (!confirm('Deze wedstrijd en alle goals ervan verwijderen?')) return;
    try {
      await q(sb.from('matches').delete().eq('id', id));
      location.hash = '#/wedstrijden';
    } catch (err) { melding(err.message, 'fout'); }
  };
}

// Overzicht van wat de matchwatcher live ingaf
function liveSamenvatting(events, spelers, goals) {
  if (!events.length) return '';
  const naam = id => spelers.find(s => s.id === id)?.naam ?? 'Onbekend';
  const score = scoreUitEvents(events);
  const verschil = verschilMetClubee(events, goals.filter(g => g.aantal != null));
  const rijen = spelers.map(s => {
    const eigen = events.filter(e => e.player_id === s.id);
    const st = schotStats(eigen);
    const straf = eigen.filter(e => e.soort === 'twee_min').length;
    if (!st.schoten && !straf) return '';
    return `<tr><td>${esc(s.rugnummer ?? '')}</td><td>${esc(s.naam)}</td><td>${st.goals}/${st.schoten}</td>
      <td>${st.pct ?? '–'}${st.pct != null ? '%' : ''}</td><td>${straf || ''}</td></tr>`;
  }).join('');
  return `<section class="kaart">
    <h2>Live ingegeven: ${score.voor} – ${score.tegen}</h2>
    ${goals.length && verschil.length ? `<p class="rood">Verschil met Clubee (officieel): ${verschil.map(v =>
      `${esc(naam(v.player_id))} live ${v.live}, Clubee ${v.clubee}`).join(' · ')}</p>` : ''}
    <table class="tabel"><thead><tr><th>#</th><th>Speler</th><th>Goals/schoten</th><th>%</th><th>2 min</th></tr></thead>
      <tbody>${rijen}</tbody></table>
    <details class="ouder"><summary>Volledig verloop (${events.length} acties)</summary>
      ${[...events].sort((a, b) => (a.helft - b.helft) || (a.seconde - b.seconde)).map(e => `<div class="logrij">
        <span class="zacht">${e.helft}e ${formatKlok(e.seconde)}</span>
        <span>${e.soort === 'tegengoal' ? 'Tegengoal' : e.soort === 'twee_min_tegen' ? '2 min tegenstander' :
          e.soort === 'twee_min' ? `2 min ${esc(naam(e.player_id))}` : `${esc(naam(e.player_id))}: ${esc(e.resultaat)} (${esc(e.positie)})`}</span><span></span></div>`).join('')}
    </details></section>`;
}
