// Echte app of testversie? De testversie draait onder /test/ en is enkel voor trainers.
export const IS_TEST = /\/test\//.test(location.pathname);

// De Clubee-gegevens staan maar één keer op de site (bovenaan); de testversie haalt ze daar.
export const DATA_MAP = IS_TEST ? '../data/' : 'data/';
