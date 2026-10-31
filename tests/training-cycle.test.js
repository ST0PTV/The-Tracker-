// Zykluskarte im Training (0.3.2): liest und schreibt nur den Zyklus von The Tracker (tt_zyklus), nie wt_cycle;
// aus, ohne Daten, mit Beispiel-Zyklen, Beschwerden-Zuordnung, Schein-PIN mit leerem Bestand; Beispiel-Zyklen entfernbar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './helpers.js';
import { setProfile, getProfile } from '../js/core/profile.js';
import * as C from '../js/features/cycle/cycle.js';
import * as L from '../js/core/lock.js';
import { generateDemoCycle } from '../js/features/dev/demo.js';
import { isoDate, addDays } from '../js/core/format.js';
import { cycleState, symptomOn, toggledField, SYMPTOMS } from '../js/features/training/cycle-view.js';

const WT = '{"enabled":true,"periods":[{"start":"2026-01-01"}]}';
const fresh = () => { globalThis.localStorage = new MemoryStorage({ wt_cycle: WT }); L._resetSession(); };
const today = isoDate();

test('Aus ohne Profil-Angabe und für „Mann“; ohne Daten „nodata“', () => {
  fresh();
  assert.equal(cycleState(today).mode, 'off');
  setProfile({ sex: 'm', cycle: 'yes' });
  assert.equal(cycleState(today).mode, 'off');
  setProfile({ sex: 'f', cycle: 'yes' });
  assert.equal(cycleState(today).mode, 'nodata');
  C.setCycleSettings({ on: false });
  assert.equal(cycleState(today).mode, 'off', 'Zyklus unter „Ich → Zyklus“ ausgeschaltet');
  assert.equal(localStorage.getItem('wt_cycle'), WT);
});

test('Beispiel-Zyklen: Tag 10, Vorhersage aus The Tracker, keine Arzt-Hinweise; entfernbar', () => {
  fresh();
  setProfile({ sex: 'f' });
  const r = C.loadDemoCycle(generateDemoCycle({ today }));
  assert.ok(r.added >= 24 && r.visible);
  assert.equal(getProfile().cycle, 'yes');
  const st = cycleState(today);
  assert.equal(st.mode, 'on');
  assert.equal(st.a.dayNo, 10);
  assert.equal(st.a.starts.length, 5);
  assert.equal(st.inPeriod, false);
  assert.ok(st.next.length > 0);
  assert.deepEqual(st.flags, []);
  assert.equal(C.removeDemoCycle(), r.added);
  assert.deepEqual(C.cycleDays(), {});
  assert.equal(getProfile().cycle, null, 'Profil-Angabe wieder offen');
  assert.equal(localStorage.getItem('wt_cycle'), WT);
});

test('Echte Tage bleiben beim Laden und Entfernen der Beispiele', () => {
  fresh();
  setProfile({ sex: 'f', cycle: 'yes' });
  C.setDayField(addDays(today, -3), 'pain', 'Leicht');
  C.loadDemoCycle(generateDemoCycle({ today }));
  assert.deepEqual(C.dayEntry(addDays(today, -3)), { pain: 'Leicht' });
  C.removeDemoCycle();
  assert.deepEqual(C.cycleDays(), { [addDays(today, -3)]: { pain: 'Leicht' } });
  assert.equal(getProfile().cycle, 'yes', 'eigene Angabe bleibt');
});

test('Beschwerden landen in Körper, Stimmung, Schmerz und Blutung; zweites Tippen nimmt sie zurück', () => {
  fresh();
  setProfile({ sex: 'f', cycle: 'yes' });
  for (const k of Object.keys(SYMPTOMS)) C.setDayField(today, ...toggledField(C.dayEntry(today), k));
  const e = C.dayEntry(today);
  assert.deepEqual(e.body.sort(), ['Blähbauch', 'Kopfweh', 'Schlecht geschlafen', 'Unterleibskrämpfe']);
  assert.deepEqual(e.mood.sort(), ['Müde', 'Stimmungsschwankungen']);
  assert.equal(e.pain, 'Stark');
  assert.equal(e.bleed, 4);
  for (const k of Object.keys(SYMPTOMS)) assert.ok(symptomOn(e, k), k);
  assert.equal(cycleState(today).inPeriod, true);
  for (const k of Object.keys(SYMPTOMS)) C.setDayField(today, ...toggledField(C.dayEntry(today), k));
  assert.deepEqual(C.dayEntry(today), { bleed: 3 }, '„Sehr starke Blutung“ aus → Mittel, alles andere weg');
});

test('Schein-PIN: Training sieht den leeren Bestand, echte Daten bleiben', async () => {
  fresh();
  setProfile({ sex: 'f', cycle: 'yes' });
  C.loadDemoCycle(generateDemoCycle({ today }));
  await L.setPin('pin', '2580'); await L.setPin('decoy', '1357');
  L.relock();
  assert.equal(await L.unlock('1357'), 'decoy');
  assert.equal(cycleState(today).mode, 'nodata');
  L.relock(); await L.unlock('2580');
  assert.equal(cycleState(today).a.dayNo, 10);
});
