// PIN-Sperre für die ganze App (Nutzerwunsch 2026-10-29: „grundsätzliche Option für die App“; seit 0.3.2 ohne
// „nur Zyklus“, Nutzerwunsch 2026-10-31: nur die ganze App, keine einzelnen Teile).
// Idee und Ablauf (PIN, Schein-PIN mit leerem Zyklus, Sperren beim Verlassen, „PIN vergessen“) aus zyklus.js im
// Rezeptbuch (Copyright (c) 2026 JuliaKelp, MIT); hier als eigenes Modul, Hash mit SHA-256 und Zufallssalz.
// Wichtig: Die Sperre schützt nur den Bildschirm. Die Daten liegen weiter unverschlüsselt im Browser-Speicher und im Backup.
import * as store from './store.js';

store.define('lock', { pin: null, decoy: null, salt: null }); // ein altes Feld scope (bis 0.3.1) wird ignoriert

let unlocked = false;
let decoy = false;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(`tt-lock|${salt}|${pin}`);
  return hex(await globalThis.crypto.subtle.digest('SHA-256', data));
}
const newSalt = () => hex(globalThis.crypto.getRandomValues(new Uint8Array(12)));

export const lockSettings = () => { const l = store.get('lock'); return { on: !!l.pin, decoyOn: !!l.decoy }; };
export const validPin = (pin) => /^\d{4,8}$/.test(String(pin || ''));

/** Ist die App gesperrt? */
export function isLocked() {
  return lockSettings().on && !unlocked;
}
/** Mit der Schein-PIN entsperrt (dann gilt der leere Zyklus-Datenbestand). */
export const isDecoy = () => decoy && unlocked;

function changed() { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tt-lock')); }

/** Entsperren. Gibt 'ok', 'decoy' oder null zurück. */
export async function unlock(pin) {
  const l = store.get('lock');
  if (!l.pin || !validPin(pin)) return null;
  const h = await hashPin(pin, l.salt);
  if (h === l.pin) { unlocked = true; decoy = false; changed(); return 'ok'; }
  if (l.decoy && h === l.decoy) { unlocked = true; decoy = true; changed(); return 'decoy'; }
  return null;
}

/** Sperrt sofort wieder (beim Verlassen der App). */
export function relock() {
  if (!store.get('lock').pin) return;
  unlocked = false; decoy = false; changed();
}

/** PIN setzen oder ändern. kind: 'pin' | 'decoy'. Wirft mit verständlicher Meldung. */
export async function setPin(kind, pin) {
  if (!validPin(pin)) throw new Error('Bitte 4 bis 8 Ziffern.');
  if (isDecoy()) throw new Error('Das geht nur mit der richtigen PIN.');
  const l = store.get('lock');
  if (kind === 'decoy' && !l.pin) throw new Error('Erst eine PIN festlegen.');
  const salt = l.salt || newSalt();
  const h = await hashPin(pin, salt);
  if ((kind === 'decoy' && h === l.pin) || (kind === 'pin' && h === l.decoy)) throw new Error('PIN und Schein-PIN müssen verschieden sein.');
  store.update('lock', (x) => { x.salt = salt; x[kind === 'decoy' ? 'decoy' : 'pin'] = h; });
  unlocked = true; decoy = false; // wer die PIN gerade setzt, ist drin
  changed();
}

export function clearPin(kind = 'pin') {
  if (isDecoy()) throw new Error('Das geht nur mit der richtigen PIN.');
  store.update('lock', (x) => { if (kind === 'decoy') x.decoy = null; else { x.pin = null; x.decoy = null; } });
  changed();
}

/** „PIN vergessen“: Sperre aufheben. Die Daten löscht der Aufrufer (store.wipeAll). */
export function forgetPin() {
  store.update('lock', (x) => { x.pin = null; x.decoy = null; });
  unlocked = false; decoy = false;
  changed();
}

// Beim Verlassen der App (anderer Tab, Home-Bildschirm) wieder sperren
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') relock(); });
}

/** Nur für Tests: Sitzung zurücksetzen. */
export function _resetSession() { unlocked = false; decoy = false; }
