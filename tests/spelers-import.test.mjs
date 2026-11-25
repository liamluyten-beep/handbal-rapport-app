import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpelersTekst } from '../js/lib/importeer.js';

test('naam;rugnummer met header en puntkomma', () => {
  const { rijen, fouten } = parseSpelersTekst('Naam;Rugnummer\nLars Peeters;7\nEmma De Smet;12\n');
  assert.deepEqual(fouten, []);
  assert.deepEqual(rijen, [{ naam: 'Lars Peeters', rugnummer: 7 }, { naam: 'Emma De Smet', rugnummer: 12 }]);
});

test('zonder rugnummer: leeg veld of enkel een naam', () => {
  const { rijen, fouten } = parseSpelersTekst('Lars Peeters;\nNoah Janssens\nEmma,12');
  assert.deepEqual(fouten, []);
  assert.deepEqual(rijen, [
    { naam: 'Lars Peeters', rugnummer: null },
    { naam: 'Noah Janssens', rugnummer: null },
    { naam: 'Emma', rugnummer: 12 },
  ]);
});

test('rugnummer eerst wordt herkend', () => {
  assert.deepEqual(parseSpelersTekst('7\tLars Peeters').rijen, [{ naam: 'Lars Peeters', rugnummer: 7 }]);
});

test('ongeldig rugnummer wordt gemeld', () => {
  const { rijen, fouten } = parseSpelersTekst('Lars;abc\nEmma;100');
  assert.equal(rijen.length, 0);
  assert.equal(fouten.length, 2);
  assert.match(fouten[0], /regel 1/i);
});

test('dubbele naam in de lijst wordt gemeld', () => {
  const { rijen, fouten } = parseSpelersTekst('Lars;7\nlars ;8');
  assert.equal(rijen.length, 1);
  assert.equal(fouten.length, 1);
  assert.match(fouten[0], /regel 2/i);
});

test('lege tekst', () => {
  assert.deepEqual(parseSpelersTekst('\n  \n'), { rijen: [], fouten: [] });
});
