// Okno do 3D náhledu pro prohlížečové testy (Playwright): co je ve scéně a kde je prvek na stránce.
import type { Session } from '../session/session.ts';
import { view3d } from './state.ts';
import type { Viewer } from './viewer.ts';

export interface TestHook3D {
  /** Prvky, které má 3D scéna. */
  elements(): string[];
  /** Jen výběr (F4), nebo null = celý model. */
  only(): string[] | null;
  /** Střed prvku v px stránky. */
  pageOf(id: string): { x: number; y: number } | null;
  /** Scéna se opravdu vykreslila (poslední snímek měl trojúhelníky). */
  drawn(): boolean;
}

declare global {
  interface Window {
    __bim3d?: TestHook3D;
  }
}

export function installTestHook3D(s: Session, v: Viewer): () => void {
  window.__bim3d = {
    elements: () => v.elementIds,
    only: () => view3d(s).only,
    pageOf(id) {
      const p = v.screenOf(id);
      const r = v.canvas.getBoundingClientRect();
      return p && { x: p.x + r.left, y: p.y + r.top };
    },
    drawn: () => v.renderer.info.render.triangles > 0,
  };
  return () => {
    delete window.__bim3d;
  };
}
