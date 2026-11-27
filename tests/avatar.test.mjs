import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ONDERDELEN, STANDAARD, normaliseerAvatar, isVrij, slotTekst, avatarSvg } from '../js/lib/avatar.js';

const optie = (deel, id) => ONDERDELEN.find(o => o.id === deel).opties.find(o => o.id === id);

test('normaliseerAvatar: onbekende of kwaadaardige waarden worden de standaard', () => {
  assert.deepEqual(normaliseerAvatar(null), STANDAARD);
  const a = normaliseerAvatar({ huid: 'h5', haar: '"><script>', hoofd: 'petje', extra: 'x' });
  assert.equal(a.huid, 'h5');
  assert.equal(a.haar, STANDAARD.haar);
  assert.equal(a.hoofd, 'petje');
  assert.equal(a.extra, undefined);
});

test('isVrij: petje vanaf level 2, kroon vanaf level 6, oogstrepen met badge Scherpschutter', () => {
  assert.equal(isVrij(optie('hoofd', 'petje'), { level: 1 }), false);
  assert.equal(isVrij(optie('hoofd', 'petje'), { level: 2 }), true);
  assert.equal(isVrij(optie('hoofd', 'kroon'), { level: 5 }), false);
  assert.equal(isVrij(optie('hoofd', 'kroon'), { level: 6 }), true);
  assert.equal(isVrij(optie('gezicht', 'strepen'), { level: 9, badges: [] }), false);
  assert.equal(isVrij(optie('gezicht', 'strepen'), { level: 1, badges: ['scherpschutter'] }), true);
  assert.equal(isVrij(optie('haar', 'krullen'), { level: 1 }), true);
});

test('slotTekst toont level of badgenaam', () => {
  assert.equal(slotTekst(optie('hoofd', 'petje')), 'Level 2');
  assert.equal(slotTekst(optie('achtergrond', 'goud'), { honderd: 'Honderd' }), 'Badge Honderd');
});

test('avatarSvg: geldige svg met rugnummer, en laat nooit ingevoerde tekst door', () => {
  const svg = avatarSvg({ ...STANDAARD, hoofd: 'petje' }, 7);
  assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
  assert.match(svg, />7<\/text>/);
  assert.match(svg, /#a80f22/);                       // klep van het petje
  const kwaad = avatarSvg({ huid: '"/><script>alert(1)</script>' }, '<b>12');
  assert.doesNotMatch(kwaad, /script|<b>/);
  assert.match(kwaad, />12<\/text>/);
  assert.doesNotMatch(avatarSvg(STANDAARD, null), /<text/);
});

test('elk onderdeel heeft een standaard die vrij is op level 1', () => {
  for (const o of ONDERDELEN) assert.equal(isVrij(optie(o.id, STANDAARD[o.id]), { level: 1 }), true, o.id);
});
