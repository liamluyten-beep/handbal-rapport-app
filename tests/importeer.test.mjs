import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGoalsTekst, koppelSpeler } from '../js/lib/importeer.js';

test('puntkomma (Belgische Excel) met header', () => {
  const t = 'Datum;Tegenstander;Speler;Goals\n12/10/2026;HC Visé;Lars Peeters;4\n';
  const { rijen, fouten } = parseGoalsTekst(t);
  assert.deepEqual(fouten, []);
  assert.deepEqual(rijen, [{ datum: '2026-10-12', tegenstander: 'HC Visé', speler: 'Lars Peeters', goals: 4 }]);
});

test('komma, tab en ISO-datum zonder header', () => {
  assert.deepEqual(parseGoalsTekst('2026-10-12,Sasja,7,2').rijen,
    [{ datum: '2026-10-12', tegenstander: 'Sasja', speler: '7', goals: 2 }]);
  assert.deepEqual(parseGoalsTekst('2026-10-12\tSasja\tJan\t0').rijen,
    [{ datum: '2026-10-12', tegenstander: 'Sasja', speler: 'Jan', goals: 0 }]);
});

test('datum d/m/jjjj met enkele cijfers en streepjes', () => {
  assert.equal(parseGoalsTekst('1/2/2026;X;Jan;1').rijen[0].datum, '2026-02-01');
  assert.equal(parseGoalsTekst('01-02-2026;X;Jan;1').rijen[0].datum, '2026-02-01');
});

test('foute regels worden gemeld, niet stil overgeslagen', () => {
  const { rijen, fouten } = parseGoalsTekst('32/13/2026;X;Jan;1\n2026-01-01;X;Jan;veel\n2026-01-01;X\n\n');
  assert.equal(rijen.length, 0);
  assert.equal(fouten.length, 3);
  assert.match(fouten[0], /regel 1/i);
});

test('lege tekst', () => {
  assert.deepEqual(parseGoalsTekst('   '), { rijen: [], fouten: [] });
});

const spelers = [
  { id: 'a', naam: 'Lars Peeters', rugnummer: 7 },
  { id: 'b', naam: 'Emma De Smet', rugnummer: 12 },
];

test('koppelSpeler op naam, hoofdletters/spaties/accenten maken niet uit', () => {
  assert.equal(koppelSpeler('  lars   peeters ', spelers).id, 'a');
  assert.equal(koppelSpeler('Emma de Smét', spelers).id, 'b');
});

test('koppelSpeler op rugnummer', () => {
  assert.equal(koppelSpeler('12', spelers).id, 'b');
  assert.equal(koppelSpeler('#7', spelers).id, 'a');
});

test('koppelSpeler onbekend geeft null', () => {
  assert.equal(koppelSpeler('Onbekend', spelers), null);
  assert.equal(koppelSpeler('99', spelers), null);
});
