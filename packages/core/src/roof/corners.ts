// Přesahy a rohy obrysu okapu (hlášení uživatele 2026-11-28; jako Archicad / Ardit „Okap abs.“): okapy všech
// šikmých rovin jsou v jedné výšce. Rovina prochází referenční čárou (pozednice) ve výšce ref. čáry, takže
// mírnější rovina potřebuje delší vodorovný přesah: přesah = pokles / tg sklonu, pokles = největší
// z „přesah hrany × tg sklonu“ (každá hrana má aspoň svůj zadaný přesah). Obrys okapu je pak vlna kostry
// o pokles níž: každé nároží a úžlabí vede jako jedna přímka od hřebene přes roh ref. čáry do rohu obrysu
// okapu (průsečík posunutých hran). Štít má přesah štítu tak, jak je zadaný.
import type { Vec2 } from '../geometry/index.ts';
import type { EdgeLine } from './edge-lines.ts';

/** Průsečík přímek n1·x = k1 a n2·x = k2 v půdorysu; null = rovnoběžné. */
export function meet(n1: Vec2, k1: number, n2: Vec2, k2: number): Vec2 | null {
  const det = n1.x * n2.y - n1.y * n2.x;
  if (Math.abs(det) < 1e-9) return null;
  return { x: (k1 * n2.y - k2 * n1.y) / det, y: (n1.x * k2 - n2.x * k1) / det };
}

/** Pokles okapu pod referenční čáru (mm) – stejný pro všechny šikmé roviny. */
export function eaveDrop(edges: readonly EdgeLine[]): number {
  return Math.max(0, ...edges.filter((e) => !e.gable).map((e) => e.overhang * e.tan));
}

/** Hrany se skutečným vodorovným přesahem (šikmé: pokles / tg sklonu, štít beze změny). */
export function effectiveEdges(edges: readonly EdgeLine[]): EdgeLine[] {
  const drop = eaveDrop(edges);
  return edges.map((e) => (e.gable || e.tan <= 0 ? e : { ...e, overhang: drop / e.tan }));
}

/** Bod obrysu posunutý o přesah ven: na jedné hraně kolmo, v rohu průsečík posunutých přímek. */
export function cornerOf(edges: readonly EdgeLine[], q: Vec2): Vec2 {
  const on = edges.filter((e) => e.contains(q));
  const a = on[0];
  if (!a) return q;
  const b = on.find((e) => Math.abs(a.n.x * e.n.y - a.n.y * e.n.x) > 1e-6);
  if (!b) return { x: q.x - a.n.x * a.overhang, y: q.y - a.n.y * a.overhang };
  return meet(a.n, a.c - a.overhang, b.n, b.c - b.overhang) ?? q;
}
