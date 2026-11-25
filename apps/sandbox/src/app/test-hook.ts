// Okno do pískoviště pro prohlížečové testy (Playwright): čtení modelu, převod mm → px
// a příprava scény příkazy z registru. Data mění zase jen příkazy (základ 6).
import type { Model, Vec2 } from '@bim-light/core';
import { gripViews, permDimViews } from '../interaction/hits.ts';
import { tempDimViews } from '../interaction/temp-layout.ts';
import type { Overlay } from '../interaction/types.ts';
import type { Session } from '../session/session.ts';

interface Px {
  x: number;
  y: number;
}

export interface TestHook {
  model(): Model;
  /** Bod v mm modelu → px na stránce (pro kliknutí myší). */
  toPage(x: number, y: number): Vec2;
  overlay(): Overlay;
  /** Dočasné kóty: číslo, kolečko a trojúhelník v px stránky. */
  temps(): { key: string; value: number; text: Px; pin: Px | null; lenEnd: Px | null; line: Px }[];
  /** Trvalé kóty: číslo, zámek a bod na čáře v px stránky. */
  perms(): { id: string; text: Px; lock: Px; line: Px }[];
  grips(): { end: string; at: Px }[];
  lenEnd(): string;
  scale(): number;
  run(name: string, params: unknown): readonly string[];
  selection(): { walls: string[]; dims: string[]; openings: string[] };
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

const centre = (r: { x: number; y: number; w: number; h: number }) => ({
  x: r.x + r.w / 2,
  y: r.y + r.h / 2,
});

/** Trvalé kóty v px stránky (číslo, zámek, bod na čáře). */
function permsOf(s: Session, page: (p: Px) => Px) {
  return permDimViews(s).map((d) => {
    const [a, b] = d.segs[0] ?? [d.lock, d.lock];
    return {
      id: d.id,
      text: page(centre(d.textRect)),
      lock: page(d.lock),
      line: page({ x: (a.x * 3 + b.x) / 4, y: (a.y * 3 + b.y) / 4 }),
    };
  });
}

export function installTestHook(s: Session) {
  if (typeof window === 'undefined') return;
  const page = (p: Px): Px => {
    const r = document.querySelector('canvas')?.getBoundingClientRect();
    return { x: p.x + (r?.left ?? 0), y: p.y + (r?.top ?? 0) };
  };
  window.__bim = {
    model: () => s.model,
    toPage: (x, y) => page(s.viewport.toScreen({ x, y })),
    overlay: () => s.tool.overlay(),
    temps: () =>
      tempDimViews(s, s.tool.overlay().previewModel ?? s.model).map((t) => ({
        key: t.key,
        value: t.temp.value,
        text: page(centre(t.textRect)),
        pin: t.pin && page(t.pin),
        lenEnd: t.lenEnd && page(t.lenEnd),
        line: page({ x: (t.a.x * 3 + t.b.x) / 4, y: (t.a.y * 3 + t.b.y) / 4 }),
      })),
    perms: () => permsOf(s, page),
    grips: () => gripViews(s).map((g) => ({ end: g.end, at: page(g.at) })),
    lenEnd: () => s.lenEnd,
    scale: () => s.viewport.s,
    run(name, params) {
      const r = s.run(name, params);
      if (!r.ok) throw new Error(r.error.message);
      return r.created;
    },
    selection: () => ({
      walls: [...s.selection.walls],
      dims: [...s.selection.dims],
      openings: [...s.selection.openings],
    }),
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
