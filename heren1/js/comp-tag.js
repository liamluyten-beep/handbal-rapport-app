// Klein label met de competitie (bv. "VHV" of "Regionaal")
import { esc } from './ui.js';
export const compTag = c => (c ? `<span class="comp-tag ${c.toLowerCase() === 'vhv' ? 'vhv' : ''}">${esc(c)}</span>` : '');
