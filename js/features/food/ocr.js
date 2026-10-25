// Nährwerttabelle vom Foto lesen (tesseract.js, läuft auf dem Gerät, vendor/tesseract/). Das Foto verlässt das Gerät nicht.
// Liest nur, was auf der Packung steht; nichts wird geschätzt. Ergebnis wird vor dem Speichern geprüft.
// Aus Rezeptbuch/tracker/js/ocr.js (JuliaKelp, MIT); parseNutrition unverändert übernommen, Laden als ES-Modul.
// tesseract.js 5.1.1 und tesseract.js-core (Apache-2.0), deutsches Sprachmodell (tessdata, Apache-2.0; Paket MIT).
// Wird erst beim ersten Foto geladen (ca. 9 MB) und danach vom Service Worker zwischengespeichert.

let ocrLib = null;
function loadOcr() {
  if (ocrLib) return ocrLib;
  ocrLib = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'vendor/tesseract/tesseract.min.js';
    s.onload = () => ok(globalThis.Tesseract);
    s.onerror = () => { ocrLib = null; fail(new Error('OCR nicht geladen')); };
    document.head.appendChild(s);
  });
  return ocrLib;
}

// Foto vorbereiten: auf eine gute Größe bringen, Graustufen
async function prepImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(3, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const g = c.getContext('2d');
    g.filter = 'grayscale(1)';
    g.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  } catch { return file; }
}

/** Liest das Foto (erst zeilenweise, dann als Spalten und als verstreuter Text; das Beste zählt). */
export async function ocrImage(file, onProgress) {
  const T = await loadOcr();
  const img = await prepImage(file);
  const base = new URL('vendor/tesseract/', location.href).href;
  const worker = await T.createWorker('deu', 1, {
    workerPath: base + 'worker.min.js', corePath: base + 'core', langPath: base + 'lang', gzip: true,
    logger: (m) => { if (onProgress && m.status === 'recognizing text') onProgress(m.progress); }
  });
  try {
    let best = null;
    for (const psm of ['6', '4', '11']) {
      await worker.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: '1' });
      const d = (await worker.recognize(img)).data;
      const lines = (d.lines || []).map((l) => (l.words || []).map((w) => ({ t: w.text, x: w.bbox ? w.bbox.x1 : null })));
      const r = parseNutrition(lines.length ? lines : textLines(d.text));
      if (!best || r.found.length > best.found.length) best = r;
      if (best.found.length >= 6) break;
    }
    return best;
  } finally { worker.terminate(); }
}

const textLines = (text) => String(text || '').split(/\n+/).map((l) => l.split(/\s+/).filter(Boolean).map((t) => ({ t, x: null })));
/** Für Tests und Text ohne Positionen. */
export const parseNutritionText = (text) => parseNutrition(textLines(text));

export const OCR_NAMES = { k: 'kcal', f: 'Fett', sf: 'gesättigte Fettsäuren', c: 'Kohlenhydrate', su: 'Zucker', fi: 'Ballaststoffe', p: 'Eiweiß', sa: 'Salz' };

/* Zeilen mit Wörtern (Text t, rechter Rand x) → Werte pro 100 g / 100 ml. Nichts wird geschätzt: was nicht sicher
   lesbar ist, fehlt oder wird zum Prüfen markiert.
   - Spalten: Zahlen stehen rechtsbündig. Die 100-g-Spalte ist die übliche Lage der ersten Zahl, die Portionsspalte die der
     zweiten. Eine Zahl in der Portionsspalte zählt nie als 100-g-Wert (z. B. wenn die 100-g-Zahl spiegelt).
   - Lesefehler: „24,0 g“ wird oft zu „24,09“ (das g als 9) und „1,5 g“ zu „159“ (Komma weg). Jede Zahl bekommt die
     möglichen Lesarten; gewählt wird, was zur Portionsspalte passt (gleiches Verhältnis in allen Zeilen), dann was
     physikalisch geht (≤ 100 g, Zucker ≤ Kohlenhydrate, gesättigte ≤ Fett) und am besten zum Brennwert passt.
   Gibt { k, p, c, f, sf, su, fi, sa, kjOnly, fit, found, unsure, notes } zurück. */
const NUT_KEYS = [['sf', /ges[äa]tt|saturat/], ['f', /\bfett|\bfat\b/], ['su', /zucker|sugar/], ['c', /kohlenhydr|carbohydr/],
  ['fi', /ballast|fibre|fiber/], ['p', /eiwei|protein/], ['sa', /\bsalz|\bsalt/]];
export function parseNutrition(lines) {
  const out = { found: [], unsure: [], notes: {} };
  const toNum = (t) => Number(String(t).replace(',', '.'));
  const med = (a) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 0.05);
  const rows = [];
  const energy = [];
  let portionHead = null;
  for (const words of lines) {
    const ws = words.map((w) => ({ t: String(w.t).replace(/[|]/g, ''), x: w.x })).filter((w) => w.t);
    const low = ws.map((w) => w.t).join(' ').toLowerCase();
    if (/portion|serving/.test(low)) portionHead = low;
    if (/kcal|kj\b|energie|brennwert|energy/.test(low)) { energy.push(ws); continue; }
    if (/alkohol|polyol|st[äa]rke|starch|unges|mehrfach|einfach/.test(low)) continue;
    const hit = NUT_KEYS.find(([, re]) => re.test(low));
    if (!hit || rows.some((r) => r.key === hit[0])) continue;
    const nums = ws.map((w, i) => ({ w, nx: ws[i + 1] })).filter(({ w }) => /\d/.test(w.t) && !/%/.test(w.t) && !/^[a-zäöüß]/i.test(w.t))
      .map(({ w, nx }) => ({ s: w.t.replace(/[^\d.,]/g, '').replace(/^[.,]+|[.,]+$/g, ''), g: /\d\s?m?[gl]$/i.test(w.t) || !!(nx && /^m?[gl]$/i.test(nx.t)), x: w.x }))
      .filter((n) => n.s);
    rows.push({ key: hit[0], nums });
  }
  // Spalten bestimmen
  const xs = (i) => rows.filter((r) => r.nums.length >= 2 && r.nums[i].x != null).map((r) => r.nums[i].x);
  const col100 = med(xs(0)) != null ? med(xs(0)) : med(rows.filter((r) => r.nums.length && r.nums[0].x != null).map((r) => r.nums[0].x));
  const colP = med(xs(1));
  const tol = col100 != null && colP != null ? Math.abs(colP - col100) * 0.4 : Infinity;
  const pick = (nums, col, idx) => (col == null || nums.every((n) => n.x == null) ? nums[idx] : nums.find((n) => n.x != null && Math.abs(n.x - col) <= tol));
  for (const r of rows) { r.v = pick(r.nums, col100, 0); r.pv = colP != null || r.nums.every((n) => n.x == null) ? pick(r.nums, colP, 1) : null; }
  // Schreibweise der Packung: meist mit Komma (24,0 g)? Dann ist eine Zahl ohne Komma eher ein verlorenes Komma.
  const v100 = rows.filter((r) => r.v);
  const commaStyle = v100.length && v100.filter((r) => /[.,]/.test(r.v.s)).length / v100.length >= 0.5;
  const readings = (n, key) => {
    if (!n) return [];
    const s = n.s;
    const dec = (s.split(/[.,]/)[1] || '').length;
    // „g“ als 9 gelesen (24,09) oder Leerzeichen als 9 (189g = 18 g): Lesart ohne die letzte 9
    const cut = s.length > 1 && s.endsWith('9') ? s.slice(0, -1).replace(/[.,]$/, '') : null;
    const lit = !cut || n.g || dec < (key === 'sa' ? 3 : 2) && !(commaStyle && dec === 2) ? s : null;
    const forms = (n.g ? [lit, cut] : [cut, lit]).filter(Boolean);
    const list = [];
    for (const f of forms) {
      const lost = !/[.,]/.test(f) && f.length >= 2 ? f.slice(0, -1) + '.' + f.slice(-1) : null; // Komma nicht gelesen
      if (lost && commaStyle && !n.g) list.push(toNum(lost), toNum(f)); else { list.push(toNum(f)); if (lost && f === cut) list.push(toNum(lost)); }
    }
    if (lit && !/[.,]/.test(s) && s.length >= 2 && !commaStyle && n.g) list.push(toNum(s.slice(0, -1) + '.' + s.slice(-1)));
    return [...new Set(list.filter((v) => isFinite(v) && v >= 0 && v <= 100))];
  };
  const opts = {}, popts = {};
  for (const r of rows) { const o = readings(r.v, r.key); if (o.length) { opts[r.key] = o; popts[r.key] = readings(r.pv, r.key); } }
  // Verhältnis Portion : 100 g, das in den meisten Zeilen passt
  const cand = [];
  for (const k in opts) for (const v of opts[k]) for (const w of popts[k]) if (v > 0 && w > 0) cand.push(w / v);
  let ratio = null, support = 0;
  for (const q of cand) {
    const n = Object.keys(opts).filter((k) => opts[k].some((v) => popts[k].some((w) => v > 0 && near(w / v, q, 0.04)))).length;
    if (n > support) { support = n; ratio = q; }
  }
  if (support < 3) ratio = null;
  const sure = {};
  for (const k in opts) {
    if (ratio) {
      // passende Lesarten, die genaueste zuerst
      const dev = (v) => Math.min(...popts[k].map((w) => (v === 0 && w === 0 ? 0 : v > 0 ? Math.abs(w / v - ratio) / ratio : 9)));
      const ok = opts[k].filter((v) => dev(v) <= 0.035).sort((a, b) => dev(a) - dev(b));
      if (ok.length) { opts[k] = ok; sure[k] = ok.length === 1 || dev(ok[1]) - dev(ok[0]) > 0.01; continue; } // zwei passen gleich gut: prüfen lassen
    }
    sure[k] = opts[k].length === 1;
  }
  // Brennwert: kcal-Zahl in der 100-g-Spalte; Probe mit kJ (1 kcal = 4,184 kJ) und mit der Portion
  const kc = [], kj = [];
  for (const ws of energy) ws.forEach((w, i) => {
    const t = w.t.toLowerCase();
    let m = t.match(/(\d+(?:[.,]\d+)?)k?cal/);
    if (!m && /^k?cal/.test(t) && i > 0) m = ws[i - 1].t.match(/(\d+(?:[.,]\d+)?)$/);
    if (m) kc.push({ v: toNum(m[1].replace(/^.*[/]/, '')), x: w.x });
    const j = t.match(/^(\d{2,5})(?:k[j)\]1l|]?)?$/) && ws[i + 1] && /^k/i.test(ws[i + 1].t) && !/^kcal/i.test(ws[i + 1].t) ? t.match(/^(\d{2,5})/) : t.match(/(\d{2,5})\s*kj/);
    if (j) kj.push({ v: toNum(j[1]), x: w.x });
  });
  const inCol = (list, col, idx) => (col == null || list.every((n) => n.x == null) ? list[idx] : list.find((n) => n.x != null && Math.abs(n.x - col) <= Math.max(tol, 40)));
  const kc100 = inCol(kc, col100, 0), kcP = colP != null ? inCol(kc, colP, 1) : kc[1];
  const kj100 = kj[0];
  const fromKj = kj100 ? Math.round(kj100.v / 4.184) : null;
  const fromP = ratio && kcP ? Math.round(kcP.v / ratio) : null;
  if (kc100 && kc100.v > 0 && kc100.v <= 900) {
    out.k = kc100.v;
    const checks = [fromKj, fromP].filter((x) => x);
    if (checks.length && !checks.some((x) => near(x, out.k, 0.04))) {
      out.unsure.push('k');
      out.notes.k = fromKj ? `Passt nicht zu ${kj100.v} kJ (das wären ${fromKj} kcal).` : `Passt nicht zur Portion (das wären ${fromP} kcal).`;
    }
  } else if (fromKj && fromKj <= 900) { out.k = fromKj; out.kjOnly = true; } // gesetzliche Umrechnung
  // Beste Kombination: erlaubt und nah am Brennwert
  const keys = Object.keys(opts);
  let best = null;
  const walk = (i, cur) => {
    if (i === keys.length) {
      if (cur.su != null && cur.c != null && cur.su > cur.c + 0.05) return;
      if (cur.sf != null && cur.f != null && cur.sf > cur.f + 0.05) return;
      let err = 0;
      if (out.k != null && ['f', 'c', 'p'].every((k) => cur[k] != null)) err = Math.abs(out.k - (9 * cur.f + 4 * cur.c + 4 * cur.p + 2 * (cur.fi || 0))) / Math.max(out.k, 1);
      const order = keys.reduce((n, k) => n + opts[k].indexOf(cur[k]), 0); // bei Gleichstand die erste Lesart
      combos.push({ cur: { ...cur }, err, order });
      return;
    }
    for (const v of opts[keys[i]]) walk(i + 1, { ...cur, [keys[i]]: v });
  };
  const combos = [];
  walk(0, {});
  // Packungen runden: bis 5 % über dem kleinsten Abstand zum Brennwert zählt der Brennwert nicht, dann gilt die wahrscheinlichste Lesart
  const minErr = Math.min(...combos.map((x) => x.err));
  for (const x of combos) if (x.err <= minErr + 0.05 && (!best || x.order < best.order)) best = x;
  if (best) Object.assign(out, best.cur);
  if (best && out.k != null && ['f', 'c', 'p'].every((k) => out[k] != null)) out.fit = best.err <= 0.15;
  keys.forEach((k) => { if (!sure[k] && out[k] != null) out.unsure.push(k); });
  out.found = ['k', 'f', 'sf', 'c', 'su', 'fi', 'p', 'sa'].filter((k) => out[k] != null);
  return out;
}
