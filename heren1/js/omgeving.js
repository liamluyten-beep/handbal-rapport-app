import { PLOEG } from './config.js';
import { isTestPad } from './lib/ploeg.js';

// Echte app of testversie? De testversie draait onder /test/ (en /test/heren1/) en is enkel voor trainers.
export const IS_TEST = isTestPad(location.pathname);

// De Clubee-gegevens staan maar één keer op de site (in /data/), per ploeg een eigen bestand.
export const DATA_MAP = '/data/';
export const DATA_BESTAND = PLOEG.dataBestand;
