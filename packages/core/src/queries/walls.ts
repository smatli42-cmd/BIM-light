// Dotazy na stěny pro AI: seznam s délkami a napojeními, detail s líci a čely.
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import { pathLength, type Path } from '../geometry/index.ts';
import { signedArea } from '../junction/half-plane.ts';
import type { Model } from '../model/types.ts';
import { capPath } from '../wall/edges.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { allWalls, connectionsOf, getWall, sidesFor, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
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
    ...levels(m, w),
    topProfile: w.topProfile,
    length: r1(pathLength(g.faces.ref)),
    ends: { start: g.cuts.start.join, end: g.cuts.end.join },
    connections: connectionsOf(m, w.id).map((c) => {
      const s = sidesFor(c, w.id);
      return { id: c.id, own: s.own.at, otherWallId: s.other.wallId, other: s.other.at, noJoin: !!c.noJoin };
    }),
  };
}

/** Spodek, vršek a výška stěny nad ±0,000 (mm), spočítané z podlaží. */
function levels(m: Model, w: Wall) {
  const h = wallHeight(m, w);
  return { bottom: r1(h.bottom), top: r1(h.top), wallHeight: r1(h.height) };
}

const STOREY = S.object({ storeyId: S.id }, []);

export const wallList = defineQuery<{ storeyId?: string }, unknown>({
  name: 'wall.list',
  label: 'Seznam stěn',
  description:
    'Vrátí stěny (volitelně jen jednoho podlaží): id, typ, tloušťka (mm), referenční čára (path, mm), ' +
    'strana tloušťky, stav, vazba výšky (height: spodek = podlaží + odsazení, vršek = pevná výška nebo ' +
    'podlaží + N + odsazení), spočítaný spodek, vršek a výška nad ±0 (bottom, top, wallHeight), horní profil, délka referenčního líce po oříznutí v rozích (mm), druh konců ' +
    '(free = volný, corner = roh, tee = T, straight = v přímce, multiple = tři a více) a napojení na jiné ' +
    'stěny (ATSTART / ATEND / ATPATH; obě ATPATH = kříž; noJoin = nespojovat).',
  group: 'Stěna',
  params: STOREY,
  run(m, p) {
    return allWalls(m)
      .filter((w) => !p.storeyId || w.storeyId === p.storeyId)
      .map((w) => summary(m, w));
  },
});

/** Spodek i-té vrstvy (nejspodnější pás) a vršek (nejvyšší pás) včetně prodloužení. */
function layerLevels(m: Model, w: Wall, i: number) {
  const bands = wallHeight(m, w).bands;
  const bottom = bands[0]?.layers[i]?.bottom;
  const top = bands[bands.length - 1]?.layers[i]?.top;
  return bottom !== undefined && top !== undefined ? { bottom: r1(bottom), top: r1(top) } : {};
}

export const wallGet = defineQuery<{ wallId: string }, unknown>({
  name: 'wall.get',
  label: 'Detail stěny',
  description:
    'Vrátí jednu stěnu jako wall.list a navíc líce oříznuté podle napojení (ref = referenční, opp = ' +
    'protější, axis = osa; začátek, konec, délka v mm), čela konců (start / end; kótovat jde jen volné), ' +
    'obrys a obrys každé vrstvy po napojení v rozích (layers: materiál, funkce, plocha mm², body, ' +
    'spodek a vršek vrstvy nad ±0 včetně prodloužení). ' +
    'Hodí se pro kóty (dimension.create) a pro přesné navazování dalších stěn.',
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
      layers: g.layers.map((l, i) => ({
        ...layerLevels(m, w, i),
        material: m.materials[l.span.layer.materialId]?.name ?? '',
        function: l.span.layer.function,
        area: r1(l.polygons.reduce((s, poly) => s + Math.abs(signedArea(poly)), 0)),
        polygons: l.polygons.map((poly) => poly.map(pt)),
      })),
    };
  },
});
