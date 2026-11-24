// Okno do pískoviště pro prohlížečové testy (Playwright): čtení modelu, převod mm → px
// a příprava scény příkazy z registru. Data mění zase jen příkazy (základ 6).
import type { Model, Vec2 } from '@bim-light/core';
import type { Session } from '../session/session.ts';

export interface TestHook {
  model(): Model;
  /** Bod v mm modelu → px na plátně. */
  toScreen(x: number, y: number): Vec2;
  run(name: string, params: unknown): readonly string[];
  selection(): { walls: string[]; dims: string[] };
  tool(): string;
  storeyId(): string;
  viewId(): string;
  typeId(name: string): string;
  /** Nastaví zvětšení a polohu počátku (px na mm, počátek v px). */
  setView(s: number, ox: number, oy: number): void;
}

declare global {
  interface Window {
    __bim?: TestHook;
  }
}

export function installTestHook(s: Session) {
  if (typeof window === 'undefined') return;
  window.__bim = {
    model: () => s.model,
    toScreen: (x, y) => s.viewport.toScreen({ x, y }),
    run(name, params) {
      const r = s.run(name, params);
      if (!r.ok) throw new Error(r.error.message);
      return r.created;
    },
    selection: () => ({ walls: [...s.selection.walls], dims: [...s.selection.dims] }),
    tool: () => s.tool.id,
    storeyId: () => s.storeyId,
    viewId: () => s.viewId,
    typeId: (name) => Object.values(s.model.wallTypes).find((t) => t.name === name)?.id ?? '',
    setView(scale, ox, oy) {
      s.viewport.s = scale;
      s.viewport.ox = ox;
      s.viewport.oy = oy;
      s.changed();
    },
  };
}
