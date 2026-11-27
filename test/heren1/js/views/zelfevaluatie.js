// Zelfevaluatie: de speler beoordeelt zichzelf (zelfde vorm als het trainersrapport).
import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, vandaag } from '../ui.js';
import { sessie } from '../app.js';
import { SCHAAL, scoreKiezerHtml, leesScores } from './rapport.js';
import { log } from '../logboek.js';

export async function zelfevaluatieView(id) {
  laden();
  const speler = await q(sb.from('players').select('id, naam').eq('user_id', sessie.user.id).maybeSingle());
  if (!speler) throw new Error('Je account is nog niet gekoppeld aan een speler.');
  const skills = await q(sb.from('skills').select('*').order('volgorde'));

  let evaluatie = { datum: vandaag(), goed_tekst: '', beter_tekst: '', self_report_scores: [] };
  if (id) {
    evaluatie = await q(sb.from('self_reports').select('*, self_report_scores(skill_id, score)').eq('id', id).maybeSingle());
    if (!evaluatie) throw new Error('Deze zelfevaluatie bestaat niet (meer).');
  }
  const huidige = Object.fromEntries(evaluatie.self_report_scores.map(s => [s.skill_id, s.score]));

  toon(`<a class="terug" href="#/mijn">← Mijn progressie</a>
    <section class="kaart">
      <h1>${id ? 'Zelfevaluatie bewerken' : 'Zelfevaluatie'}</h1>
      <p class="zacht">Hoe vind jij zelf dat het gaat? Wees eerlijk, je trainer ziet dit en kan het vergelijken met zijn rapport.</p>
      <form id="zelfForm" class="formulier">
        <label style="max-width:220px">Datum<input type="date" name="datum" required value="${esc(evaluatie.datum)}"></label>
        <div class="blokken">
          <label class="blok goed"><h3>Dit doe ik al goed</h3>
            <textarea name="goed_tekst" placeholder="Bv. ik durf meer te werpen vanop afstand…">${esc(evaluatie.goed_tekst)}</textarea></label>
          <label class="blok beter"><h3>Hier wil ik beter in worden</h3>
            <textarea name="beter_tekst" placeholder="Bv. sneller terugkeren in verdediging…">${esc(evaluatie.beter_tekst)}</textarea></label>
        </div>
        <div>
          <h3>Hoe goed ben ik in…</h3>
          <p class="uitleg-schaal">1 = ${SCHAAL[1]} · 2 = ${SCHAAL[2]} · 3 = ${SCHAAL[3]} · 4 = ${SCHAAL[4]} · 5 = ${SCHAAL[5]}</p>
          ${scoreKiezerHtml(skills, sid => huidige[sid] ?? null)}
        </div>
        <div class="rij tussen">
          <button class="knop">Opslaan</button>
          ${id ? '<button type="button" class="knop gevaar" id="verwijder">Verwijderen</button>' : ''}
        </div>
      </form>
    </section>`);

  const form = document.getElementById('zelfForm');
  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(form);
    const knop = form.querySelector('button'); knop.disabled = true;
    const velden = { datum: f.get('datum'), goed_tekst: f.get('goed_tekst').trim(), beter_tekst: f.get('beter_tekst').trim() };
    const scores = leesScores(form, skills);
    try {
      let rid = id;
      if (rid) await q(sb.from('self_reports').update(velden).eq('id', rid));
      else rid = (await q(sb.from('self_reports').insert({ ...velden, player_id: speler.id }).select('id').single())).id;
      await q(sb.from('self_report_scores').delete().eq('self_report_id', rid));
      if (scores.length) await q(sb.from('self_report_scores').insert(scores.map(s => ({ ...s, self_report_id: rid }))));
      if (!id) log('zelfevaluatie');
      melding('Zelfevaluatie opgeslagen');
      location.hash = '#/mijn';
    } catch (err) { melding(err.message, 'fout'); knop.disabled = false; }
  };
  const del = document.getElementById('verwijder');
  if (del) del.onclick = async () => {
    if (!confirm('Deze zelfevaluatie verwijderen?')) return;
    try { await q(sb.from('self_reports').delete().eq('id', id)); location.hash = '#/mijn'; }
    catch (err) { melding(err.message, 'fout'); }
  };
}
