// Datei teilen oder herunterladen (0.5.1, aus me/backup-view.js 0.5.0 herausgelöst): auf dem iPhone das Teilen-Menü,
// sonst ein Download. Gibt 'shared' | 'downloaded' | 'aborted' zurück.
import { h } from './util.js';

export function download(text, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function shareOrDownload(text, name, title, type = 'application/json') {
  try {
    const file = new File([text], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'aborted';
  }
  download(text, name, type);
  return 'downloaded';
}
