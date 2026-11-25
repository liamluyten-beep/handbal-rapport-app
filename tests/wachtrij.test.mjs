import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zetInWachtrij, pasToeOpLijst } from '../js/lib/wachtrij.js';

test('toevoegen en verwijderen komen in de wachtrij', () => {
  let w = zetInWachtrij([], { op: 'insert', rij: { id: '1' } });
  w = zetInWachtrij(w, { op: 'insert', rij: { id: '2' } });
  w = zetInWachtrij(w, { op: 'delete', id: '9' });
  assert.deepEqual(w.map(o => o.op + (o.rij?.id ?? o.id)), ['insert1', 'insert2', 'delete9']);
});

test('verwijderen van iets dat nog niet verstuurd is: beide verdwijnen', () => {
  let w = zetInWachtrij([], { op: 'insert', rij: { id: '1' } });
  w = zetInWachtrij(w, { op: 'delete', id: '1' });
  assert.deepEqual(w, []);
});

test('pasToeOpLijst: lokale lijst = server + wachtrij', () => {
  const server = [{ id: 'a' }, { id: 'b' }];
  const w = [{ op: 'insert', rij: { id: 'c' } }, { op: 'delete', id: 'a' }, { op: 'insert', rij: { id: 'b' } }];
  assert.deepEqual(pasToeOpLijst(server, w).map(r => r.id).sort(), ['b', 'c']);
});

test('pasToeOpLijst: een nieuwere versie van dezelfde rij vervangt de oude (bijwerken)', () => {
  const server = [{ id: 's1', gestopt_op: null }];
  const w = [{ op: 'insert', rij: { id: 's1', gestopt_op: '2026-11-25T18:00' } }];
  assert.deepEqual(pasToeOpLijst(server, w), [{ id: 's1', gestopt_op: '2026-11-25T18:00' }]);
});
