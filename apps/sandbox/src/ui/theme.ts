// Motiv rozhraní a podklad výkresu (koncepce rozhraní, část 5). Výchozí světlý; volba se pamatuje
// v prohlížeči (pohodlí jednoho uživatele, ne data projektu).
import type { Paper } from '../render/paper.ts';

export type Theme = 'light' | 'dark';

const KEY = 'bim-light.ui';

interface Saved {
  theme: Theme;
  paper: Paper;
}

export function loadUi(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>;
    return { theme: raw.theme === 'dark' ? 'dark' : 'light', paper: raw.paper === 'dark' ? 'dark' : 'light' };
  } catch {
    return { theme: 'light', paper: 'light' };
  }
}

export function saveUi(v: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // Bez úložiště (soukromé okno) se volba jen nezapamatuje.
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
