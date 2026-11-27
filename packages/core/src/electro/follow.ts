// Elektro prvek jde se svou stěnou (koncepce 3, základ 4), stejně jako otvor (opening/follow.ts):
// po každém příkazu se poloha po stěně přepočítá podle změny referenční čáry hostitele. Když hostitel
// zmizí a na jeho místě vznikla nová stěna (rozdělení, sloučení), prvek se do ní přenese; jinak zaniká
// se stěnou (průřezová pravidla: stěna → onDelete 'electro').
import { dist, dot, nearestOnPath, pathLength, sub, type Path, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { lengthAt, stationAt } from '../opening/along.ts';
import { rulesFor } from '../rules/cross-rules.ts';
import { allWalls, findWall, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { electroFrame } from './place.ts';
import type { ElectroElement } from './types.ts';

const TOL = 1e-6;

/** Nová vzdálenost po stěně (stejná pravidla jako u otvoru, prvek má nulovou šířku). */
function followOffset(s: number, before: Path, after: Path): number {
  const sameStart = dist(before.start, after.start) < TOL;
  const sameEnd = dist(before.end, after.end) < TOL;
  const lb = pathLength(before);
  const la = pathLength(after);
  if (sameStart || Math.abs(la - lb) < TOL) return s;
  if (sameEnd) return la - (lb - s);
  return lengthAt(after, stationAt(before, s).point);
}

/** Přenese prvek na stěnu `w` tak, aby zůstal na stejném místě a na stejné straně. */
export function hostOnWall(m: Model, el: ElectroElement, w: Wall, p: Vec2): ElectroElement {
  const offset = lengthAt(w.path, p);
  const st = stationAt(w.path, offset);
  const o = dot(sub(p, st.point), st.normal);
  const f = wallSection(m, w).faces;
  const side = Math.abs(o - f.ref) <= Math.abs(o - f.opp) ? 'ref' : 'opp';
  return { ...el, storeyId: w.storeyId, host: { kind: 'wall', wallId: w.id, offset, side } };
}

/** Nová stěna, na jejíž referenční čáře (do tloušťky) leží bod. */
function newHostAt(before: Model, after: Model, el: ElectroElement, p: Vec2): Wall | undefined {
  let best: { w: Wall; d: number } | undefined;
  for (const w of allWalls(after)) {
    if (before.elements[w.id] || w.storeyId !== el.storeyId) continue;
    const d = nearestOnPath(w.path, p).distance;
    if (d <= wallSection(after, w).thickness + 1 && (!best || d < best.d)) best = { w, d };
  }
  return best?.w;
}

/** Přepočítá elektro prvky po příkazu (poloha po stěně, nový hostitel, zánik se stěnou). */
export function followElectro(before: Model, after: Model): Model {
  const els = after.electroElements;
  if (!els || !Object.keys(els).length) return after;
  const next: Record<string, ElectroElement> = { ...els };
  const gone = new Set<string>();
  let changed = false;
  for (const el of Object.values(els)) {
    const h = el.host;
    if (h.kind !== 'wall') continue;
    const a = findWall(after, h.wallId);
    const b = findWall(before, h.wallId);
    const prev = before.electroElements?.[el.id];
    if (a && b && a.path !== b.path && prev?.host.kind === 'wall' && prev.host.wallId === h.wallId) {
      const offset = followOffset(h.offset, b.path, a.path);
      // Rozdělení stěny: prvek za bodem rozdělení přejde na novou část.
      const p = (offset < -1 || offset > pathLength(a.path) + 1) && electroFrame(before, el)?.origin;
      const w = p && newHostAt(before, after, el, p);
      if (w && p) next[el.id] = hostOnWall(after, el, w, p);
      else if (Math.abs(offset - h.offset) > 1e-9) next[el.id] = { ...el, host: { ...h, offset } };
      changed ||= next[el.id] !== el;
    } else if (!a) {
      const p = b && electroFrame(before, el)?.origin;
      const w = p && newHostAt(before, after, el, p);
      if (w && p) next[el.id] = hostOnWall(after, el, w, p);
      else if (rulesFor('wall').onDelete.includes('electro')) gone.add(el.id);
      changed = true;
    }
  }
  if (!changed) return after;
  const kept = Object.entries(next).filter(([id]) => !gone.has(id));
  return { ...after, electroElements: Object.fromEntries(kept) };
}
