// Formular „Eigenes Lebensmittel“: Werte pro 100 g/ml abtippen oder vom Foto der Nährwerttabelle lesen lassen.
// Nach openFoodForm/openOcrReview im Kalorien-Tracker (Rezeptbuch/tracker/js/app.js und ocr.js, ST0PTV/JuliaKelp, MIT).
// Vom Foto gelesene Werte stehen im selben Formular; unsichere und fehlende Felder sind markiert. Gespeichert wird erst,
// wenn bestätigt ist, dass alles mit der Packung verglichen wurde.
import { h } from '../../core/util.js';
import { openSheet } from '../../core/sheet.js';
import { toast } from '../../core/ui.js';
import { num, r1 } from '../../core/format.js';
import { makeCustom, saveCustom, removeCustom } from '../food/custom.js';
import { ocrImage, OCR_NAMES } from '../food/ocr.js';
import { stopScanner } from '../food/barcode.js';

const FIELDS = [
  ['k', 'kcal', 'kcal', true], ['p', 'Eiweiß', 'g'], ['c', 'Kohlenhydrate', 'g'], ['su', 'davon Zucker', 'g'],
  ['f', 'Fett', 'g'], ['sf', 'davon gesättigte Fettsäuren', 'g'], ['fi', 'Ballaststoffe', 'g'], ['sa', 'Salz', 'g']
];

/** Foto aufnehmen (Datei-Auswahl mit Kamera) und lesen. Gibt das OCR-Ergebnis zurück oder null bei Abbruch. */
function takePhoto(onProgress) {
  return new Promise((resolve, reject) => {
    const inp = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: 'display:none' });
    document.body.append(inp); // iPhone: das Feld muss im Dokument hängen
    stopScanner();             // sonst kann die Foto-Kamera nicht starten
    inp.addEventListener('cancel', () => { inp.remove(); resolve(null); });
    inp.addEventListener('change', async () => {
      inp.remove();
      const file = inp.files && inp.files[0];
      if (!file) { resolve(null); return; }
      try { resolve(await ocrImage(file, onProgress)); } catch (e) { reject(e); }
    });
    inp.click();
  });
}

/**
 * Öffnet das Formular. base: Startwerte (z. B. { barcode } oder ein vorhandenes eigenes Lebensmittel zum Bearbeiten).
 * onSaved(food): nach dem Speichern (z. B. Mengen-Dialog öffnen). photo: gleich die Kamera öffnen.
 */
export function openFoodForm(base = {}, { onSaved = null, photo = false } = {}) {
  const isEdit = !!(base.id && String(base.id).startsWith('custom:'));
  let ocr = null;
  const inputs = {};
  const rowEls = {};
  const dv = (x) => (x == null ? '' : r1(x));

  const name = h('input', { class: 'input', type: 'text', value: base.n || '', placeholder: 'z. B. Haferkekse', 'aria-label': 'Name' });
  const brand = h('input', { class: 'input', type: 'text', value: base.brand || '', placeholder: 'optional', 'aria-label': 'Marke' });
  const liq = h('input', { type: 'checkbox', 'aria-label': 'Flüssigkeit' });
  liq.checked = !!base.liq;
  const serving = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: base.serving ? r1(base.serving) : '', placeholder: 'optional', 'aria-label': 'Portion' });
  const barcode = h('input', { class: 'input', type: 'text', inputmode: 'numeric', value: base.barcode || '', placeholder: 'optional', 'aria-label': 'Barcode' });
  const note = h('p', { class: 'small muted', 'aria-live': 'polite' }, 'Das Foto bleibt auf dem Handy; nur die Zahlen werden gelesen.');
  const checked = h('input', { type: 'checkbox', 'aria-label': 'Mit der Packung verglichen' });
  const checkRow = h('label', { class: 'check-row', hidden: true }, checked, h('span', {}, 'Ich habe alle Werte mit der Packung verglichen'));

  const table = h('div', { class: 'nut-form' }, ...FIELDS.map(([k, label, unit, req]) => {
    inputs[k] = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: dv(base[k]), 'aria-label': `${label} in ${unit}` });
    rowEls[k] = h('label', { class: 'nut-row' }, h('span', { class: 'nut-l' }, label + (req ? ' *' : ''), h('small', {})), h('span', { class: 'nut-v' }, inputs[k], h('i', {}, unit)));
    return rowEls[k];
  }));
  const unitNote = h('span', { class: 'label' }, 'Pro 100 g');
  liq.addEventListener('change', () => { unitNote.textContent = liq.checked ? 'Pro 100 ml (Annahme 1 ml ≈ 1 g)' : 'Pro 100 g'; });
  liq.dispatchEvent(new Event('change'));

  // Markierungen nach dem Foto: nicht erkannt / unsicher
  const mark = () => {
    for (const [k] of FIELDS) {
      const st = !ocr ? '' : !ocr.found.includes(k) ? 'nicht erkannt' : (ocr.unsure || []).includes(k) ? 'unsicher, bitte genau prüfen' : '';
      rowEls[k].classList.toggle('flag', !!st);
      rowEls[k].querySelector('small').textContent = st ? ` · ${st}` : '';
    }
    checkRow.hidden = !ocr;
  };

  const photoBtn = h('button', { class: 'btn block', type: 'button' }, 'Nährwerttabelle fotografieren');
  photoBtn.addEventListener('click', async () => {
    photoBtn.disabled = true;
    note.textContent = 'Lese die Nährwerttabelle …';
    let r;
    try { r = await takePhoto((p) => { note.textContent = `Lese die Nährwerttabelle … ${Math.round(p * 100)} %`; }); }
    catch { note.textContent = 'Das Lesen hat nicht geklappt (beim ersten Mal braucht es Internet). Bitte die Werte abtippen.'; photoBtn.disabled = false; return; }
    photoBtn.disabled = false;
    if (!r) { note.textContent = 'Kein Foto aufgenommen.'; return; }
    ocr = r;
    for (const k of r.found) inputs[k].value = dv(r[k]);
    const missing = ['k', 'f', 'c', 'su', 'fi', 'p'].filter((k) => !r.found.includes(k));
    note.textContent = r.found.length
      ? `Vom Foto gelesen: ${r.found.map((k) => OCR_NAMES[k]).join(', ')}.${r.kjOnly ? ' Nur kJ gefunden, kcal umgerechnet (1 kcal = 4,184 kJ).' : ''}${missing.length ? ` Nicht erkannt: ${missing.map((k) => OCR_NAMES[k]).join(', ')}.` : ''}${r.fit === false ? ' Achtung: Die Werte passen nicht zum Brennwert, da ist wohl etwas falsch gelesen.' : ''} Bitte jede Zahl mit der Packung vergleichen.`
      : 'Keine Nährwerte erkannt. Näher und gerade fotografieren, mit gutem Licht, oder abtippen.';
    note.classList.toggle('warn', r.fit === false);
    mark();
  });

  let sheet = null;
  const save = () => {
    if (ocr && !checked.checked) { toast('Bitte erst alle Werte mit der Packung vergleichen und das Häkchen setzen.', { error: true }); return; }
    const v = { n: name.value, brand: brand.value, liq: liq.checked, serving: num(serving.value), barcode: String(barcode.value).replace(/\D/g, '') || null,
      ns: ocr ? 'foto' : base.ns || 'hand' };
    for (const [k] of FIELDS) v[k] = inputs[k].value.trim() === '' ? null : num(inputs[k].value);
    if (v.k == null) { toast('Ohne kcal geht es nicht. Bitte von der Packung abtippen.', { error: true }); inputs.k.focus(); return; }
    for (const key of ['d', 'a', 'sw']) if (base[key] != null) v[key] = base[key];
    let food;
    try { food = makeCustom(v, isEdit ? base.id : null); } catch (e) { toast(e.message, { error: true }); return; }
    food = saveCustom(food);
    toast(isEdit ? 'Gespeichert' : `„${food.n}“ angelegt`);
    sheet.close();
    if (onSaved) onSaved(food);
  };
  const del = () => {
    if (!confirm(`„${base.n}“ löschen? Bereits eingetragene Mahlzeiten bleiben erhalten.`)) return;
    removeCustom(base.id); toast('Gelöscht'); sheet.close();
  };

  const content = h('div', { class: 'food-form' },
    h('p', { class: 'small muted' }, 'Werte pro 100 g bzw. 100 ml, z. B. von der Verpackung. * = Pflicht.'),
    photoBtn, note,
    h('label', { class: 'form-label' }, h('span', {}, 'Name *'), name),
    h('label', { class: 'form-label' }, h('span', {}, 'Marke'), brand),
    h('label', { class: 'check-row' }, liq, h('span', {}, 'Flüssigkeit (Mengen in ml)')),
    unitNote, table,
    h('div', { class: 'two' },
      h('label', { class: 'form-label' }, h('span', {}, 'Portion g/ml'), serving),
      h('label', { class: 'form-label' }, h('span', {}, 'Barcode'), barcode)),
    checkRow,
    h('button', { class: 'btn primary block', type: 'button', onclick: save }, isEdit ? 'Speichern' : 'Speichern & eintragen'),
    isEdit ? h('button', { class: 'btn block danger-text', type: 'button', onclick: del }, 'Lebensmittel löschen') : null);

  sheet = openSheet(content, { title: isEdit ? 'Lebensmittel bearbeiten' : 'Eigenes Lebensmittel', full: true });
  if (photo) photoBtn.click();
  return sheet;
}
