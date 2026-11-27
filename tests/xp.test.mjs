import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berekenXP, levelVan, XP, ZONE_NAMEN, kiesUitdaging, xpVoorSchot } from '../js/lib/xp.js';

test('xpVoorSchot: 5 voor een goal, 5 extra op de gevraagde plek', () => {
  assert.equal(xpVoorSchot({ resultaat: 'goal', doelzone: 7, uitdaging_zone: 7 }), 10);
  assert.equal(xpVoorSchot({ resultaat: 'goal', doelzone: 3, uitdaging_zone: 7 }), 5);
  assert.equal(xpVoorSchot({ resultaat: 'goal', doelzone: 3, uitdaging_zone: null }), 5);
  assert.equal(xpVoorSchot({ resultaat: 'redding', doelzone: 7, uitdaging_zone: 7 }), 0);
});

test('berekenXP: schoten (max 100 per dag), aanwezigheid, zelfevaluatie 1x per maand', () => {
  const goal = (datum, plek = false) => ({ datum, resultaat: 'goal', doelzone: 1, uitdaging_zone: plek ? 1 : 2 });
  const schoten = [
    ...Array.from({ length: 12 }, () => goal('2026-11-20', true)),   // 12 x 10 = 120 -> max 100
    goal('2026-11-21'), goal('2026-11-21', true), { datum: '2026-11-21', resultaat: 'mis', doelzone: null, uitdaging_zone: 4 },
  ];
  const aanwezig = [{ status: 'aanwezig' }, { status: 'aanwezig' }, { status: 'afwezig' }, { status: 'verwittigd' }];
  const zelf = [{ datum: '2026-10-02' }, { datum: '2026-10-28' }, { datum: '2026-11-05' }];
  const r = berekenXP({ schoten, aanwezig, zelf });
  assert.equal(r.bronnen.schieten, 115);          // 100 (afgetopt) + 15
  assert.equal(r.bronnen.training, 10);
  assert.equal(r.bronnen.zelfevaluatie, 20);      // oktober + november
  assert.equal(r.totaal, 145);
  assert.equal(r.goals, 14);
  assert.equal(r.opPlek, 13);
});

test('levelVan: level 2 bij 100, 3 bij 250, 4 bij 450', () => {
  assert.deepEqual(levelVan(0), { level: 1, inLevel: 0, nodig: 100, pct: 0 });
  assert.deepEqual(levelVan(99).level, 1);
  assert.deepEqual(levelVan(100), { level: 2, inLevel: 0, nodig: 150, pct: 0 });
  assert.deepEqual(levelVan(325), { level: 3, inLevel: 75, nodig: 200, pct: 38 });
  assert.equal(levelVan(450).level, 4);
});

test('uitdaging: zones 1-9 met een naam, hoeken vaker', () => {
  assert.equal(ZONE_NAMEN.length, 9);
  assert.equal(ZONE_NAMEN[6], 'linksonder');
  const telling = Array(10).fill(0);
  for (let i = 0; i < 3000; i++) telling[kiesUitdaging(() => i / 3000)]++;   // gelijk verdeeld
  assert.ok(telling[1] > telling[2] * 1.8, 'hoeken komen vaker voor');
  assert.equal(telling[0], 0);
  assert.equal(XP.goal, 5);
});

import { berekenKeeperXP } from '../js/lib/xp.js';

test('berekenKeeperXP: 5 per redding, midden dicht +15, 30% gestopt +20, max 100 per dag', () => {
  const r = (datum, resultaat, doelzone) => ({ datum, resultaat, doelzone });
  // Dag 1: 3 reddingen in het midden (2,5,8), 7 goals in de hoeken -> 3/10 = 30%
  const dag1 = [r('d1', 'redding', 2), r('d1', 'redding', 5), r('d1', 'redding', 8),
    ...Array.from({ length: 7 }, () => r('d1', 'goal', 1)), r('d1', 'mis', null)];
  const a = berekenKeeperXP(dag1);
  assert.equal(a.reddingen, 3);
  assert.equal(a.middenDicht, 1);
  assert.equal(a.dertigProcent, 1);
  assert.equal(a.keepen, 3 * 5 + 15 + 20);

  // Goal in het midden -> geen "midden dicht"; minder dan 10 op doel -> geen 30%-bonus
  const b = berekenKeeperXP([r('d2', 'redding', 2), r('d2', 'redding', 5), r('d2', 'goal', 8)]);
  assert.equal(b.middenDicht, 0);
  assert.equal(b.dertigProcent, 0);
  assert.equal(b.keepen, 10);

  // Minder dan 3 schoten in het midden -> geen bonus
  assert.equal(berekenKeeperXP([r('d3', 'redding', 5), r('d3', 'redding', 2)]).middenDicht, 0);

  // Max 100 per dag
  const veel = Array.from({ length: 30 }, () => r('d4', 'redding', 5));
  assert.equal(berekenKeeperXP(veel).keepen, XP.maxKeepenPerDag);
});

test('berekenXP telt keeper-XP mee als bron "keepen"', () => {
  const tegen = [{ datum: 'd1', resultaat: 'redding', doelzone: 1 }];
  const x = berekenXP({ tegen });
  assert.equal(x.bronnen.keepen, 5);
  assert.equal(x.totaal, 5);
});
