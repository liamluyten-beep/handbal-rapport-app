import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logTekst, SOORTEN } from '../js/lib/logboek.js';

const r = (actie, extra = {}) => ({ actie, email: 'nyo.luyten@gmail.com', speler_naam: 'Nyo Luyten', details: null, ...extra });

test('logTekst: inloggen met en zonder gekoppelde speler', () => {
  assert.equal(logTekst(r('ingelogd')), 'nyo.luyten@gmail.com heeft zich ingelogd op Nyo Luyten');
  assert.equal(logTekst(r('ingelogd', { speler_naam: null })), 'nyo.luyten@gmail.com heeft zich ingelogd (nog geen speler gekozen)');
});

test('logTekst: andere acties', () => {
  assert.equal(logTekst(r('account_aangemaakt', { speler_naam: null })), 'nyo.luyten@gmail.com heeft een account aangemaakt');
  assert.equal(logTekst(r('speler_gekozen', { details: 'Nyo Luyten' })), 'nyo.luyten@gmail.com heeft gekozen: ik ben Nyo Luyten');
  assert.equal(logTekst(r('speler_aangemaakt', { details: 'Nyo Luyten' })), 'nyo.luyten@gmail.com heeft zichzelf aangemaakt als speler Nyo Luyten');
  assert.equal(logTekst(r('schiettraining', { details: '12/20' })), 'Nyo Luyten heeft een schiettraining afgesloten (12/20 raak)');
  assert.equal(logTekst(r('zelfevaluatie')), 'Nyo Luyten heeft een zelfevaluatie ingevuld');
  assert.equal(logTekst(r('fout', { details: 'Netwerkfout op #/schieten' })), 'Fout bij Nyo Luyten: Netwerkfout op #/schieten');
  assert.equal(logTekst(r('uitgelogd')), 'Nyo Luyten heeft zich uitgelogd');
});

test('soorten voor de filter', () => {
  assert.deepEqual(Object.keys(SOORTEN), ['alles', 'inloggen', 'activiteit', 'app', 'fouten']);
  assert.equal(SOORTEN.inloggen.includes('ingelogd'), true);
  assert.equal(SOORTEN.fouten.includes('fout'), true);
});

test('logTekst: app geïnstalleerd', () => {
  assert.equal(logTekst(r('app_geinstalleerd', { details: 'Android' })), 'Nyo Luyten heeft de app geïnstalleerd (Android)');
  assert.equal(logTekst(r('app_geinstalleerd', { speler_naam: null })), 'nyo.luyten@gmail.com heeft de app geïnstalleerd');
  assert.equal(SOORTEN.app.includes('app_geinstalleerd'), true);
});

test('logTekst: schiettraining gestart', () => {
  assert.equal(logTekst(r('schiettraining_gestart')), 'Nyo Luyten is een schiettraining gestart');
  assert.equal(SOORTEN.activiteit.includes('schiettraining_gestart'), true);
});
