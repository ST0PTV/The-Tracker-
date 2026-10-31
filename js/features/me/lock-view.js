// Sperrbildschirm und „Ich → PIN-Sperre“. Ablauf nach lockScreen/pinSection in zyklus.js im Rezeptbuch
// (Copyright (c) 2026 JuliaKelp, MIT); Speicher und Prüfung in core/lock.js. Gilt für die ganze App.
import { h } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { pageHead, toast } from '../../core/ui.js';
import * as store from '../../core/store.js';
import { lockSettings, unlock, setPin, clearPin, forgetPin, validPin, isDecoy } from '../../core/lock.js';

const pinInput = (label, autocomplete = 'off') => h('input', { class: 'input cy-pin', type: 'password', inputmode: 'numeric', autocomplete, maxlength: 8, 'aria-label': label, placeholder: label });

let forgot = false;

/** Sperrbildschirm der ganzen App. */
export function lockScreen(rerender) {
  const inp = pinInput('PIN');
  const err = h('p', { class: 'small warn', role: 'alert', hidden: true });
  const go = async () => {
    const r = await unlock(inp.value.trim());
    if (!r) { err.hidden = false; err.textContent = 'Die PIN stimmt nicht.'; inp.value = ''; inp.focus(); return; }
    forgot = false;
    rerender();
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  setTimeout(() => inp.focus(), 50);
  return h('div', { class: 'lock' },
    h('div', { class: 'lock-ico' }, icon('lock', { size: 34 })),
    pageHead('The Tracker ist gesperrt', 'Gib deine PIN ein.'),
    inp, err,
    h('button', { class: 'btn primary block', type: 'button', onclick: go }, 'Entsperren'),
    h('details', { class: 'small muted lock-forgot', open: forgot || undefined },
      h('summary', {}, 'PIN vergessen?'),
      h('p', {}, 'Die PIN lässt sich nicht wiederherstellen. Du kannst die Sperre aufheben; dabei werden alle Daten der App auf diesem Handy gelöscht. Mit einem Backup holst du sie zurück.'),
      forgot
        ? h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onclick: () => { forgot = false; rerender(); } }, 'Abbrechen'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => {
            forgetPin();
            store.wipeAll(); // alle tt_-Keys, auch Training
            forgot = false; toast('Sperre aufgehoben, Daten gelöscht'); rerender();
          } }, 'Daten löschen'))
        : h('button', { class: 'link danger', type: 'button', onclick: () => { forgot = true; rerender(); } }, 'Sperre aufheben und alle Daten löschen …')));
}

let editing = null; // 'pin' | 'decoy' | null

/** „Ich → PIN-Sperre“ */
export function lockSettingsView(rerender) {
  const L = lockSettings();
  const decoy = isDecoy();
  const field = (kind, label) => {
    const a = pinInput(label, 'new-password'), b = pinInput('Noch einmal', 'new-password');
    const save = async () => {
      if (!validPin(a.value)) { toast('Bitte 4 bis 8 Ziffern.', { error: true }); return; }
      if (a.value !== b.value) { toast('Die beiden Eingaben sind verschieden.', { error: true }); return; }
      try { await setPin(kind, a.value); editing = null; toast(kind === 'pin' ? 'PIN gespeichert. Beim nächsten Öffnen ist gesperrt.' : 'Schein-PIN gespeichert'); rerender(); }
      catch (e) { toast(e.message, { error: true }); }
    };
    return h('div', { class: 'lock-field' }, a, b, h('button', { class: 'btn primary block', type: 'button', onclick: save }, 'Speichern'));
  };
  return h('div', {},
    h('a', { class: 'back', href: '#/ich' }, icon('chevron', { size: 16, cls: 'flip' }), 'Ich'),
    pageHead('PIN-Sperre', 'Sperrt die ganze App beim Verlassen. Ohne PIN siehst du nur den Sperrbildschirm.'),
    decoy ? h('p', { class: 'hint small' }, 'Mit der Schein-PIN lassen sich die Einstellungen nicht ändern.') : null,
    h('h3', { class: 'sec' }, 'PIN'),
    h('section', { class: 'card' },
      L.on && editing !== 'pin'
        ? h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', disabled: decoy || undefined, onclick: () => { editing = 'pin'; rerender(); } }, 'PIN ändern'),
          h('button', { class: 'btn danger', type: 'button', disabled: decoy || undefined, onclick: () => { try { clearPin('pin'); toast('PIN-Sperre aus'); rerender(); } catch (e) { toast(e.message, { error: true }); } } }, 'Ausschalten'))
        : field('pin', L.on ? 'Neue PIN, 4 bis 8 Ziffern' : 'PIN, 4 bis 8 Ziffern')),
    L.on ? [h('h3', { class: 'sec' }, 'Schein-PIN'),
      h('section', { class: 'card' },
        h('p', { class: 'small muted' }, 'Eine zweite PIN öffnet die App mit einem leeren Zyklus-Kalender. Was du dort einträgst, bleibt getrennt. Alles andere ist mit der Schein-PIN sichtbar.'),
        L.decoyOn && editing !== 'decoy'
          ? h('div', { class: 'btn-row' }, h('button', { class: 'btn danger', type: 'button', disabled: decoy || undefined, onclick: () => { try { clearPin('decoy'); toast('Schein-PIN aus'); rerender(); } catch (e) { toast(e.message, { error: true }); } } }, 'Ausschalten'))
          : field('decoy', 'Schein-PIN, anders als die PIN'))] : null,
    h('p', { class: 'small muted page-note' }, 'Die PIN schützt nur den Bildschirm. Wer das Handy entsperrt hat und sich auskennt, kommt an den Browser-Speicher, und die Backup-Datei ist nicht verschlüsselt.'));
}
