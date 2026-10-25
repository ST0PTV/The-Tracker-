// App-Einstellungen, die keinem Bereich gehören (Darstellung). Bereichseigene Einstellungen liegen in ihren Modulen.
import * as store from './store.js';

store.define('settings', { appearance: 'dark' });

export const getSettings = () => store.get('settings');
export const setSettings = (patch) => store.update('settings', (s) => Object.assign(s, patch));
