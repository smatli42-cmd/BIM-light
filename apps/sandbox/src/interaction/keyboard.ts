// Klávesy, které platí ve všech nástrojích (pravidla-interakce: Výběr, Příkazy; katalog kreslení 2.3).
// Nástroj dostane klávesu první (psaní čísel, Tab, Enter); tady je zbytek.
import { allWallGeometry, boundsOf, boxSelect, type Vec2 } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { copyWalls } from './clipboard.ts';
import type { KeyInfo, ToolId } from './types.ts';

/** Zkratky nástrojů (písmena z pravidel interakce). */
export const TOOL_KEYS: Readonly<Record<string, ToolId>> = {
  w: 'wall',
  a: 'arc',
  v: 'pickline',
  d: 'dimension',
  u: 'angle',
  m: 'move',
  k: 'copy',
  r: 'rotate',
  f: 'mirror',
  p: 'array',
  l: 'align',
  t: 'trim',
  x: 'split',
  b: 'rect',
  o: 'opening',
  s: 'slab',
};

/** Přiblíží na všechny stěny (Home) nebo na vybrané (Z). */
export function zoomTo(s: Session, onlySelection: boolean) {
  const geoms = [...allWallGeometry(s.model, s.storeyId).values()].filter(
    (g) => !onlySelection || s.selection.walls.includes(g.wallId),
  );
  const pts: Vec2[] = geoms.flatMap((g) => g.outlines.flat());
  if (!pts.length) return;
  const b = boundsOf(pts);
  s.viewport.zoomToBox(b.x0, b.y0, b.x1, b.y1);
}

function ctrlKey(s: Session, key: string): boolean {
  switch (key) {
    case 'z':
      s.editor.undo();
      return true;
    case 'y':
      s.editor.redo();
      return true;
    case 'a': {
      const all = boxSelect(s.model, s.view, { x0: -1e12, y0: -1e12, x1: 1e12, y1: 1e12 }, false, s.filter);
      s.selection.set(all.wallIds, all.dimensionIds, all.openingIds, all.slabIds);
      return true;
    }
    case 'c':
      s.clipboard = copyWalls(s.model, s.selection.walls) ?? s.clipboard;
      if (s.selection.walls.length) s.toast('Zkopírováno do schránky.');
      return true;
    case 'v':
      s.setTool('paste');
      return true;
    case 'k':
      s.setTool('scale');
      return true;
    case 'd':
      s.clipboard = copyWalls(s.model, s.selection.walls) ?? s.clipboard;
      if (s.selection.walls.length) s.setTool('paste');
      return true;
  }
  return false;
}

const ARROWS: Readonly<Record<string, Vec2>> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: -1 },
};

/** Zpracuje klávesu; vrací true, když ji použil (prohlížeč pak nedělá nic svého). */
export function handleKey(s: Session, k: KeyInfo): boolean {
  if (k.key === 'Escape') {
    s.menu = null;
    if (!s.tool.escape() && s.tool.id !== 'select') s.setTool('select');
    return true;
  }
  if (k.ctrl && k.key.toLowerCase() === 'z' && k.shift) return ctrlKey(s, 'y');
  if (k.ctrl && ctrlKey(s, k.key.toLowerCase())) return true;
  if (s.tool.key(k)) return true;
  const arrow = ARROWS[k.key];
  if (arrow && s.selection.walls.length) {
    const step = k.ctrl ? 1000 : k.shift ? 100 : 10;
    s.run('wall.move', { wallIds: s.selection.walls, vector: { x: arrow.x * step, y: arrow.y * step } });
    return true;
  }
  if (k.key === 'Delete' || (k.key === 'Backspace' && s.tool.id === 'select')) {
    if (!s.selection.empty) s.run('selection.delete', s.selection.deleteParams());
    return true;
  }
  if (k.ctrl || k.alt) return false;
  const lower = k.key.toLowerCase();
  if (lower === 'c') {
    s.snapCycle++;
    return true;
  }
  if (k.key === 'Home') {
    zoomTo(s, false);
    return true;
  }
  if (lower === 'z') {
    zoomTo(s, true);
    return true;
  }
  const tool = TOOL_KEYS[lower];
  if (tool) {
    s.setTool(tool);
    return true;
  }
  return false;
}
