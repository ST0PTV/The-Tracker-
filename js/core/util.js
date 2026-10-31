// Gemeinsame Konventionen (übernommen aus dem Workout-Tracker, MIT):
// - IDs sind UUIDs (String)
// - Zeitstempel sind ISO-8601 in UTC (String)

export function uuid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function nowISO() {
  return new Date().toISOString();
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Links ohne javascript:/vbscript:/data: (aus Workout-Tracker 3.14.0 übernommen).
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href']);
const UNSAFE_URL = /^\s*(javascript|vbscript|data):/i;
export function safeUrl(v) { return !UNSAFE_URL.test(String(v)); }

// Kleiner DOM-Helfer: h('div', {class:'card'}, 'Text', childNode)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs || {})) {
    if (val === false || val === null || val === undefined) continue;
    if (key === 'class') el.className = val;
    else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (URL_ATTRS.has(key) && UNSAFE_URL.test(String(val))) continue;
    else el.setAttribute(key, val === true ? '' : String(val));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// Schutz (v2.7.1): replaceChildren/append schreiben null/undefined/false sonst als Text "null" ins DOM
// (so geschehen im Tagebuch seit v2.3.0). Der Wrapper lässt solche Werte weg.
if (typeof Element !== 'undefined') {
  for (const name of ['replaceChildren', 'append', 'prepend']) {
    const orig = Element.prototype[name];
    if (orig && !orig.__ttSafe) {
      const safe = function (...nodes) { return orig.apply(this, nodes.filter((n) => n !== null && n !== undefined && n !== false)); };
      safe.__ttSafe = true;
      Element.prototype[name] = safe;
    }
  }
}
