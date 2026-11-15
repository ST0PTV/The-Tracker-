// App-Einstellungen, die keinem Bereich gehören (Darstellung: appearance hell/dunkel/system, palette = Theme). Bereichseigene Einstellungen liegen in ihren Modulen.
import * as store from './store.js';

store.define('settings', { appearance: 'dark', palette: 'nativ' });

export const getSettings = () => store.get('settings');
export const setSettings = (patch) => store.update('settings', (s) => Object.assign(s, patch));
