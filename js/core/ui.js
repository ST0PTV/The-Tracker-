// UI-Grundbausteine: Router, Tab-Leiste, Toast. Router und Toast nach Workout-Tracker/js/ui.js (MIT, ST0PTV).
// Navigation nach dem Rezeptbuch (Entwurf B): wenige Hauptreiter, Unterseiten über den Pfad (#/rezepte/woche).
import { h } from './util.js';
import { closeAllSheets } from './sheet.js';
import { icon } from './icons.js';

export const TABS = [
  { path: '/', label: 'Heute', icon: 'home' },
  { path: '/rezepte', label: 'Rezepte', icon: 'book' },
  { path: '/training', label: 'Training', icon: 'train' },
  { path: '/ich', label: 'Ich', icon: 'me' }
];

/** Aktueller Pfad aus dem Hash, z. B. "#/rezepte/woche" → "/rezepte/woche". */
export function currentPath() {
  const raw = location.hash.replace(/^#/, '').split('?')[0] || '/';
  return raw.startsWith('/') ? raw : '/' + raw;
}

/** Zu welchem Reiter gehört ein Pfad? Erstes Segment entscheidet ("/rezepte/woche" → "/rezepte"). */
export function tabOf(path) {
  const first = '/' + (path.split('/')[1] || '');
  return TABS.some((t) => t.path === first) ? first : '/';
}

// „+“ in der Mitte der Tab-Leiste (öffnet das Eintragen-Menü); wird von app.js gesetzt, damit ui.js keine Bereiche kennt.
let tabAction = null;
export function setTabAction(fn) { tabAction = fn; }

export function renderTabbar(container, path) {
  const active = tabOf(path);
  const tabs = TABS.map((tab) =>
    h('a', { class: 'tab', href: `#${tab.path}`, 'aria-current': tab.path === active ? 'page' : false }, icon(tab.icon, { size: 24 }), tab.label));
  if (tabAction) tabs.splice(2, 0, h('button', { class: 'tab-plus', type: 'button', 'aria-label': 'Eintragen', onclick: () => tabAction(path) }, icon('plus', { size: 26 })));
  container.replaceChildren(...tabs);
}

let toastTimer = null;
// Optional eine Aktion im Toast, z. B. { label: 'Rückgängig', onClick }; bleibt dann 6 s stehen.
export function toast(message, { error = false, action = null } = {}) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.replaceChildren(h('span', {}, message));
  if (action) {
    el.append(h('button', { class: 'toast-act', type: 'button', onclick: () => {
      clearTimeout(toastTimer);
      el.classList.remove('show', 'has-act');
      action.onClick();
    } }, action.label));
  }
  el.classList.toggle('error', error);
  el.classList.toggle('has-act', !!action);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show', 'has-act'), action ? 6000 : error ? 5000 : 2800);
}

/**
 * Startet den Router. routes: { '/pfad': (rerender) => Node }.
 * Unbekannte Unterseiten fallen auf die Hauptseite ihres Reiters zurück, unbekannte Reiter auf "/".
 */
export function startRouter(routes) {
  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');
  let lastPath = null;
  const render = () => {
    let path = currentPath();
    if (!routes[path]) path = routes[tabOf(path)] ? tabOf(path) : '/';
    const samePage = path === lastPath;
    lastPath = path;
    const y = view.scrollTop; // #view scrollt, nicht das Fenster
    renderTabbar(tabbar, path);
    view.replaceChildren(routes[path](render));
    view.scrollTop = samePage ? y : 0; // Neu-Rendern derselben Seite behält die Scrollposition
  };
  window.addEventListener('hashchange', () => { closeAllSheets(); render(); });
  render();
  return render;
}

/** Seitenkopf mit großem Titel und optionalem Untertitel (iOS Large Title). */
export function pageHead(title, sub = '') {
  return h('header', { class: 'page-head' }, h('h1', {}, title), sub ? h('p', { class: 'sub' }, sub) : null);
}

/** Platzhalterkarte für Bereiche, die in einer späteren Phase einziehen. */
export function comingSoon(what, phase) {
  return h('section', { class: 'card placeholder' },
    h('h2', {}, what),
    h('p', { class: 'muted' }, `Zieht in Phase ${phase} ein.`));
}
