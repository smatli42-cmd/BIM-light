// Místa T napojení na hostiteli (základ 24, priorita materiálů): čáry hostitele (přivrácený líc a hranice
// vrstev, kterými napojená stěna prochází) se mezi líci napojené stěny nekreslí – jeden souvislý řez.
import { carrierOf, endPoint, intersectNearest, paramOf, type Path } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { WallGeometry } from './geometry.ts';
import { teeCutOffset } from './joins.ts';
import { leftOffsetOf } from './offset.ts';
import type { FaceGaps } from './outline.ts';
import { connectionsOf, getWall, sidesFor, typeToEnd } from './queries.ts';

type Interval = [number, number];

/** Úsek čáry hostitele mezi dvěma líci napojené stěny (parametry 0..1), nebo null. */
function gapOn(line: Path, g: WallGeometry, end: 'start' | 'end'): Interval | null {
  const lim = 4 * g.section.thickness + 1000;
  const ts: number[] = [];
  for (const f of ['ref', 'opp'] as const) {
    const near = endPoint(g.faces[f], end);
    const hit = intersectNearest(carrierOf(line), carrierOf(g.faces[f]), near, lim);
    if (!hit) return null;
    ts.push(Math.min(1, Math.max(0, paramOf(line, hit))));
  }
  const [a, b] = ts as [number, number];
  return a === b ? null : [Math.min(a, b), Math.max(a, b)];
}

/** Mezery v čarách hostitele podle stěn napojených na něj v T. */
export function teeGaps(model: Model, host: WallGeometry, geoms: ReadonlyMap<Id, WallGeometry>): FaceGaps {
  const out = { ref: [] as Interval[], opp: [] as Interval[], layers: {} as Record<number, Interval[]> };
  const hostWall = getWall(model, host.wallId);
  const s = host.section;
  const lines: { key: 'ref' | 'opp' | number; offset: number; path: Path }[] = [
    { key: 'ref', offset: s.faces.ref, path: host.faces.ref },
    { key: 'opp', offset: s.faces.opp, path: host.faces.opp },
    ...host.layerBoundaries.map((path, i) => ({ key: i, offset: s.layers[i + 1]?.from ?? 0, path })),
  ];
  for (const c of connectionsOf(model, host.wallId)) {
    const sd = sidesFor(c, host.wallId);
    const end = typeToEnd(sd.other.at);
    const g = geoms.get(sd.other.wallId);
    if (sd.own.at !== 'ATPATH' || !end || !g || g.cuts[end].join !== 'tee') continue;
    const w = getWall(model, g.wallId);
    const side =
      Math.sign(leftOffsetOf(hostWall.path, endPoint(w.path, end === 'start' ? 'end' : 'start'))) || 1;
    const cut = teeCutOffset(model, w, end, hostWall);
    for (const l of lines) {
      const nearFace = side * l.offset >= Math.max(side * s.faces.ref, side * s.faces.opp) - 1e-6;
      // Přerušuje se přivrácený líc a hranice vrstev, kterými napojená stěna prochází (ne čára řezu).
      if (!nearFace && side * l.offset <= side * cut + 1e-6) continue;
      const gap = gapOn(l.path, g, end);
      if (!gap) continue;
      if (typeof l.key === 'number') (out.layers[l.key] ??= []).push(gap);
      else out[l.key].push(gap);
    }
  }
  return out;
}
