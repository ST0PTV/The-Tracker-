// Lebensmittel-Ereignisse (ab 0.2.5): wann ein Produkt gescannt, ein eigenes Lebensmittel angelegt oder eine
// fehlende Angabe nachgetragen wurde. Nur anhängen, nie kürzen – unabhängig vom Scan-Speicher (max. 500 Produkte).
// Vorbereitung für das Level-System (Drive: Handover Request - Timestamps for Level System). Nur auf dem Gerät.
// Einzige Stelle, die tt_food_events speichert.
import * as store from '../../core/store.js';
import { nowISO } from '../../core/util.js';

store.define('food_events', []); // [{ at, kind: 'scan' | 'custom' | 'fill', ref }]

export const KINDS = ['scan', 'custom', 'fill'];
export const foodEvents = () => store.get('food_events');

/** Hängt ein Ereignis an. ref: Barcode oder ID des Lebensmittels. Gibt das Ereignis zurück. */
export function logFoodEvent(kind, ref, at = nowISO()) {
  if (!KINDS.includes(kind)) throw new Error(`Unbekanntes Ereignis: ${kind}`);
  const ev = { at, kind, ref: String(ref || '') };
  store.update('food_events', (list) => { list.push(ev); });
  return ev;
}
