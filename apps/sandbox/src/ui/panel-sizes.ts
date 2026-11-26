// Šířky panelů D (info box) a F (Obsah) nastavené tažením dělítka (koncepce rozhraní, část 2).
// Pamatují se v prohlížeči (pohodlí jednoho uživatele, ne data projektu) a platí přes proměnné CSS.

export type PanelName = 'infobox' | 'content';

export const PANEL_DEFAULT: Record<PanelName, number> = { infobox: 270, content: 300 };
export const PANEL_MIN = 200;
export const PANEL_MAX = 600;

const KEY = 'bim-light.panels';

/** Šířka omezená na rozumný rozsah (panel nezmizí ani nezabere celé okno). */
export function clampPanel(w: number): number {
  return Math.round(Math.min(PANEL_MAX, Math.max(PANEL_MIN, w)));
}

export function loadPanelSizes(): Record<PanelName, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<PanelName, number>>;
    return {
      infobox: clampPanel(Number(raw.infobox) || PANEL_DEFAULT.infobox),
      content: clampPanel(Number(raw.content) || PANEL_DEFAULT.content),
    };
  } catch {
    return { ...PANEL_DEFAULT };
  }
}

function save(sizes: Record<PanelName, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sizes));
  } catch {
    // Bez úložiště (soukromé okno) se šířka jen nezapamatuje.
  }
}

/** Nastaví šířku panelu (proměnná CSS --infobox-w / --content-w) a zapamatuje ji. */
export function setPanelWidth(name: PanelName, w: number) {
  const sizes = loadPanelSizes();
  sizes[name] = clampPanel(w);
  document.documentElement.style.setProperty(`--${name}-w`, `${sizes[name]}px`);
  save(sizes);
}

export function applyPanelSizes() {
  const sizes = loadPanelSizes();
  for (const name of Object.keys(sizes) as PanelName[]) {
    document.documentElement.style.setProperty(`--${name}-w`, `${sizes[name]}px`);
  }
}
