import { sb, q } from '../supabase.js';
import { toon, esc, laden, melding, vandaag } from '../ui.js';

export const SCHAAL = ['', 'Moet nog veel groeien', 'Op weg', 'Goed', 'Sterk', 'Uitstekend'];

export function scoreKiezerHtml(skills, scoreVan) {
  return `<div class="scores">${skills.map(sk => `<div class="kiezer"><span>${esc(sk.naam)}</span>
    <div class="kiezer-knoppen" role="radiogroup" aria-label="${esc(sk.naam)}">
      ${[1, 2, 3, 4, 5].map(n => `<input type="radio" id="s${sk.id}_${n}" name="skill_${sk.id}" value="${n}"
        ${scoreVan(sk.id) === n ? 'checked' : ''}><label for="s${sk.id}_${n}" title="${SCHAAL[n]}">${n}</label>`).join('')}
      <input type="radio" id="s${sk.id}_0" name="skill_${sk.id}" value="" ${scoreVan(sk.id) == null ? 'checked' : ''}>
      <label for="s${sk.id}_0" title="Niet beoordeeld" class="zacht">–</label>
    </div></div>`).join('')}</div>`;
}

export function leesScores(form, skills) {
  const f = new FormData(form);
  return skills.map(sk => ({ skill_id: sk.id, score: Number(f.get(`skill_${sk.id}`)) }))
    .filter(s => s.score >= 1 && s.score <= 5);
}

// rapportId = bewerken, of playerId = nieuw rapport
export async function rapportView(rapportId, playerId) {
  laden();
  const skills = await q(sb.from('skills').select('*').order('volgorde'));
  let rapport = { datum: vandaag(), goed_tekst: '', beter_tekst: '', report_scores: [] };
  if (rapportId) {
    rapport = await q(sb.from('reports').select('*, report_scores(skill_id, score)').eq('id', rapportId).maybeSingle());
    if (!rapport) throw new Error('Dit rapport bestaat niet (meer).');
    playerId = rapport.player_id;
  }
  const speler = await q(sb.from('players').select('id, naam').eq('id', playerId).maybeSingle());
  if (!speler) throw new Error('Speler niet gevonden.');

  // Bij een nieuw rapport: scores van het vorige rapport als startpunt
  let vorige = {};
  if (!rapportId) {
    const v = await q(sb.from('reports').select('report_scores(skill_id, score)').eq('player_id', playerId)
      .order('datum', { ascending: false }).limit(1));
    (v[0]?.report_scores || []).forEach(s => { vorige[s.skill_id] = s.score; });
  }
  const huidige = Object.fromEntries(rapport.report_scores.map(s => [s.skill_id, s.score]));
  const scoreVan = id => huidige[id] ?? vorige[id] ?? null;

  toon(`<a class="terug" href="#/speler/${speler.id}">← ${esc(speler.naam)}</a>
    <section class="kaart">
      <h1>${rapportId ? 'Rapport bewerken' : 'Nieuw rapport'}</h1>
      <p class="zacht">voor ${esc(speler.naam)}</p>
      <form id="rapportForm" class="formulier">
        <label style="max-width:220px">Datum<input type="date" name="datum" required value="${esc(rapport.datum)}"></label>
        <div class="blokken">
          <label class="blok goed"><h3>Dit gaat al goed</h3>
            <textarea name="goed_tekst" placeholder="Bv. sterke sprongworp, goede communicatie in verdediging…">${esc(rapport.goed_tekst)}</textarea></label>
          <label class="blok beter"><h3>Hier kan het nog beter</h3>
            <textarea name="beter_tekst" placeholder="Bv. sneller terugkeren na balverlies, meer variëren in het werpen…">${esc(rapport.beter_tekst)}</textarea></label>
        </div>
        <div>
          <h3>Scores</h3>
          <p class="uitleg-schaal">1 = ${SCHAAL[1]} · 2 = ${SCHAAL[2]} · 3 = ${SCHAAL[3]} · 4 = ${SCHAAL[4]} · 5 = ${SCHAAL[5]}
            ${!rapportId && Object.keys(vorige).length ? '<br>De scores van het vorige rapport zijn al ingevuld. Pas aan wat veranderd is.' : ''}</p>
          ${scoreKiezerHtml(skills, scoreVan)}
        </div>
        <div class="rij tussen">
          <button class="knop">Rapport opslaan</button>
          ${rapportId ? '<button type="button" class="knop gevaar" id="verwijder">Rapport verwijderen</button>' : ''}
        </div>
      </form>
    </section>`);

  const form = document.getElementById('rapportForm');
  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(form);
    const knop = form.querySelector('button'); knop.disabled = true;
    const velden = { datum: f.get('datum'), goed_tekst: f.get('goed_tekst').trim(), beter_tekst: f.get('beter_tekst').trim() };
    const scores = leesScores(form, skills);
    try {
      let id = rapportId;
      if (id) await q(sb.from('reports').update(velden).eq('id', id));
      else id = (await q(sb.from('reports').insert({ ...velden, player_id: playerId }).select('id').single())).id;
      await q(sb.from('report_scores').delete().eq('report_id', id));
      if (scores.length) await q(sb.from('report_scores').insert(scores.map(s => ({ ...s, report_id: id }))));
      melding('Rapport opgeslagen');
      location.hash = `#/speler/${playerId}`;
    } catch (err) { melding(err.message, 'fout'); knop.disabled = false; }
  };

  const del = document.getElementById('verwijder');
  if (del) del.onclick = async () => {
    if (!confirm('Dit rapport definitief verwijderen?')) return;
    try {
      await q(sb.from('reports').delete().eq('id', rapportId));
      melding('Rapport verwijderd');
      location.hash = `#/speler/${playerId}`;
    } catch (err) { melding(err.message, 'fout'); }
  };
}
