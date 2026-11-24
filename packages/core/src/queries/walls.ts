// Dotazy na stěny pro AI: seznam s délkami a napojeními, detail s líci a čely.
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import { pathLength, type Path } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { capPath } from '../wall/edges.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { allWalls, connectionsOf, getWall, sidesFor, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;
const pt = (p: { x: number; y: number }) => ({ x: r1(p.x), y: r1(p.y) });
const seg = (p: Path) => ({ start: pt(p.start), end: pt(p.end), length: r1(pathLength(p)) });

function summary(m: Model, w: Wall) {
  const g = wallGeometry(m, w);
  return {
    id: w.id,
    typeId: w.typeId,
    typeName: m.wallTypes[w.typeId]?.name ?? '',
    thickness: wallSection(m, w).thickness,
    path: w.path,
    referenceLine: w.referenceLine,
    side: w.side,
    status: w.status,
    height: w.height,
    length: r1(pathLength(g.faces.ref)),
    ends: { start: g.cuts.start.join, end: g.cuts.end.join },
    connections: connectionsOf(m, w.id).map((c) => {
      const s = sidesFor(c, w.id);
      return { id: c.id, own: s.own.at, otherWallId: s.other.wallId, other: s.other.at };
    }),
  };
}

const STOREY = S.object({ storeyId: S.id }, []);

export const wallList = defineQuery<{ storeyId?: string }, unknown>({
  name: 'wall.list',
  label: 'Seznam stěn',
  description:
    'Vrátí stěny (volitelně jen jednoho podlaží): id, typ, tloušťka (mm), referenční čára (path, mm), ' +
    'strana tloušťky, stav, výška, délka referenčního líce po oříznutí v rozích (mm), druh konců ' +
    '(free = volný, corner = roh, tee = T, multiple) a napojení na jiné stěny (ATSTART / ATEND / ATPATH).',
  group: 'Stěna',
  params: STOREY,
  run(m, p) {
    return allWalls(m)
      .filter((w) => !p.storeyId || w.storeyId === p.storeyId)
      .map((w) => summary(m, w));
  },
});

export const wallGet = defineQuery<{ wallId: string }, unknown>({
  name: 'wall.get',
  label: 'Detail stěny',
  description:
    'Vrátí jednu stěnu jako wall.list a navíc líce oříznuté podle napojení (ref = referenční, opp = ' +
    'protější, axis = osa; začátek, konec, délka v mm), čela konců (start / end; kótovat jde jen volné) ' +
    'a obrys. Hodí se pro kóty (dimension.create) a pro přesné navazování dalších stěn.',
  group: 'Stěna',
  params: S.object({ wallId: S.id }, ['wallId']),
  run(m, p) {
    const w = m.elements[p.wallId] ? getWall(m, p.wallId) : fail('not-found', `Stěna ${p.wallId} neexistuje`);
    const g = wallGeometry(m, w);
    return {
      ...summary(m, w),
      faces: { ref: seg(g.faces.ref), opp: seg(g.faces.opp), axis: seg(g.faces.axis) },
      caps: { start: seg(capPath(g, 'start')), end: seg(capPath(g, 'end')) },
      outline: g.outline.map(pt),
    };
  },
});
