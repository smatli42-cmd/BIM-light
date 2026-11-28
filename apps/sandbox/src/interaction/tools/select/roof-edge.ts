// Výběr hrany vybrané střechy v půdorysu (S2): klik na štítek „1 · 45°“, na okapovou čáru nebo na hranu
// ref. čáry vybere hranu – info box ukáže její sklon, štít a přesah (příkaz roof.setEdge).
import { nearestOnPath, type Vec2 } from '@bim-light/core';
import { roofEdgeTags } from '../../../render/roof-labels.ts';
import { roofDefaults } from '../../../session/roof-defaults.ts';
import type { Session } from '../../../session/session.ts';

const segDist = (p: Vec2, a: Vec2, b: Vec2) => nearestOnPath({ kind: 'line', start: a, end: b }, p).distance;

/** Hrana pod kurzorem (px plátna) u jediné vybrané střechy, nebo null. */
export function roofEdgeAt(s: Session, screen: Vec2): { roofId: string; index: number } | null {
  if (s.selection.roofs.length !== 1) return null;
  const tags = roofEdgeTags(s, s.model);
  const tag = tags.find((t) => Math.abs(screen.x - t.at.x) < 28 && Math.abs(screen.y - t.at.y) < 11);
  const line = tags.find((t) => segDist(screen, ...t.eave) < 5 || segDist(screen, ...t.ref) < 5);
  const hit = tag ?? line;
  return hit ? { roofId: hit.roofId, index: hit.index } : null;
}

/** Klik na hranu vybrané střechy ji vybere; vrací true, když klik použil. */
export function pickRoofEdge(s: Session, screen: Vec2): boolean {
  const hit = roofEdgeAt(s, screen);
  if (!hit) return false;
  roofDefaults(s).edge = hit;
  return true;
}
