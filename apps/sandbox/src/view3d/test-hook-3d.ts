// Okno do 3D náhledu pro prohlížečové testy (Playwright): co je ve scéně a kde je prvek na stránce.
import type { Session } from '../session/session.ts';
import type { Box3D } from './clip.ts';
import { active3d, view3d } from './state.ts';
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
  /** Ořezový kvádr (mm), nebo null. */
  box(): Box3D | null;
  /** Rozsah podlaží, nebo null = všechna. */
  storeys(): string[] | null;
  /** Úchyt ořezového kvádru v px stránky. */
  handleOf(axis: 'x' | 'y' | 'z', side: 'min' | 'max'): { x: number; y: number } | null;
  /** Stav prohlížeče: projekce kamery, stíny, mřížka, procházka, poloha kamery (m). */
  scene(): { projection: string; shadows: boolean; grid: boolean; walking: boolean; eye: number[] };
  /** Bod stránky (px), kde klik trefí prvek `id` (hledá v mřížce po 8 px), nebo null. */
  hitOf(id: string): { x: number; y: number } | null;
  /** Úchyt roviny řezu v px stránky, nebo null. */
  cutHandle(): { x: number; y: number } | null;
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
    box: () => active3d(s).sectionBox,
    storeys: () => {
      const ids = active3d(s).storeyIds;
      return ids ? [...ids] : null;
    },
    handleOf(axis, side) {
      const b = active3d(s).sectionBox;
      if (!b) return null;
      const c = { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2, z: (b.min.z + b.max.z) / 2 };
      c[axis] = b[side][axis];
      const p = v.screenOfPoint(c.x, c.y, c.z);
      const r = v.canvas.getBoundingClientRect();
      return { x: p.x + r.left, y: p.y + r.top };
    },
    scene: () => ({
      projection: v.rig.projection,
      shadows: v.renderer.shadowMap.enabled,
      grid: v.hasGrid,
      walking: v.walk.active,
      eye: v.camera.position.toArray(),
    }),
    hitOf(id) {
      const r = v.canvas.getBoundingClientRect();
      for (let y = 4; y < r.height; y += 8)
        for (let x = 4; x < r.width; x += 8) if (v.pick(x, y) === id) return { x: x + r.left, y: y + r.top };
      return null;
    },
    cutHandle() {
      const c = active3d(s).cutPlane;
      if (!c) return null;
      const p = v.screenOfPoint(c.origin.x, c.origin.y, c.origin.z);
      const r = v.canvas.getBoundingClientRect();
      return { x: p.x + r.left, y: p.y + r.top };
    },
  };
  return () => {
    delete window.__bim3d;
  };
}
