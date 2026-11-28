// Dotazy na střechy pro AI (rozhodnutí 11, S1): seznam s výškami a okapem (Ardit „Okap abs.“), spočítané
// roviny a hrany (okap, štít, hřeben, nároží, úžlabí) – stejný výpočet jako kresba, řez a 3D; z něj bude
// vycházet i generátor krovu (S4). Typy střech se skladbou.
import { S } from '../commands/schema.ts';
import type { Model } from '../model/types.ts';
import { roofGeometry } from '../roof/planes.ts';
import { allRoofs, findRoof, roofLayerOffsets, roofLayers, roofTypeUsage } from '../roof/queries.ts';
import type { Vec3 } from '../roof/skeleton.ts';
import type { Roof } from '../roof/types.ts';
import { fail } from '../commands/types.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;
const p3 = (p: Vec3) => ({ x: r1(p.x), y: r1(p.y), z: r1(p.z) });
const m2 = (mm2: number) => Math.round(mm2 / 1e4) / 100;

function summary(m: Model, r: Roof) {
  const g = roofGeometry(m, r);
  const offsets = roofLayerOffsets(roofLayers(m, r));
  const eaves = g.planes.map((p) => p.eaveZ);
  return {
    id: r.id,
    storeyId: r.storeyId,
    typeId: r.typeId,
    typeName: m.roofTypes[r.typeId]?.name ?? '',
    status: r.status,
    outline: r.outline.map((p) => ({ x: r1(p.x), y: r1(p.y) })),
    edges: r.edges,
    refOffset: r.refOffset,
    /** Absolutní výška referenční čáry (mm nad ±0,000). */
    refLevel: r1(g.refZ),
    eaveCut: r.eaveCut,
    /** Nejnižší okap (absolutní, mm) – Ardit „Okap (abs.)“. */
    eaveLevel: eaves.length ? r1(Math.min(...eaves)) : null,
    /** Nejvyšší bod referenční roviny (hřeben, absolutní mm). */
    ridgeLevel: r1(Math.max(g.refZ, ...g.planes.flatMap((p) => p.polygon.map((q) => q.z)))),
    /** Tloušťka skladby kolmo k rovině a část pod referenční rovinou (mm). */
    thickness: r1((offsets.at(-1) ?? 0) - (offsets[0] ?? 0)),
    belowReference: r1(-(offsets[0] ?? 0)),
    planes: g.planes.length,
    /** Plocha rovin (m², v rovině střechy). */
    area: m2(g.planes.reduce((s, p) => s + p.area, 0)),
  };
}

export const roofList = defineQuery<{ storeyId?: string }, unknown>({
  name: 'roof.list',
  label: 'Střechy',
  description:
    'Střechy: obrys referenční čáry (mm), hrany (kind slope / gable, sklon °, přesah mm), výška referenční ' +
    'čáry nad podlažím (refOffset) i absolutně (refLevel), nejnižší okap eaveLevel a hřeben ridgeLevel ' +
    '(absolutní mm), úhel řezu okapu, tloušťka skladby kolmo k rovině, počet rovin a plocha (m²).',
  group: 'Střecha',
  params: S.object({ storeyId: S.id }, []),
  run: (m, p) =>
    allRoofs(m)
      .filter((r) => !p.storeyId || r.storeyId === p.storeyId)
      .map((r) => summary(m, r)),
});

export const roofPlanes = defineQuery<{ roofId: string }, unknown>({
  name: 'roof.planes',
  label: 'Roviny střechy',
  description:
    'Spočítané roviny střechy (vážený straight skeleton): u každé roviny hrana obrysu (edge), sklon, obrys ' +
    'v referenční rovině (3D body, absolutní z v mm, s přesahy), jednotková normála, výška okapu eaveZ a ' +
    'plocha (m²). Hrany střechy lines s druhem eave = okap, gable = štítová hrana, ridge = hřeben, hip = ' +
    'nároží, valley = úžlabí, délkou (mm) a rovinami po stranách; gables = svislé štíty v referenční čáře.',
  group: 'Střecha',
  params: S.object({ roofId: S.id }, ['roofId']),
  run: (m, p) => {
    const r = findRoof(m, p.roofId) ?? fail('not-found', `Střecha ${p.roofId} neexistuje`);
    const g = roofGeometry(m, r);
    return {
      refLevel: r1(g.refZ),
      planes: g.planes.map((q) => ({
        edge: q.edge,
        slope: q.slope,
        polygon: q.polygon.map(p3),
        normal: {
          x: r1(q.normal.x * 1000) / 1000,
          y: r1(q.normal.y * 1000) / 1000,
          z: r1(q.normal.z * 1000) / 1000,
        },
        eaveZ: r1(q.eaveZ),
        area: m2(q.area),
      })),
      lines: g.lines.map((l) => ({
        kind: l.kind,
        a: p3(l.a),
        b: p3(l.b),
        length: r1(Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y, l.b.z - l.a.z)),
        planes: l.planes,
      })),
      gables: g.gables.map((q) => ({ edge: q.edge, polygon: q.polygon.map(p3) })),
    };
  },
});

export const roofTypeList = defineQuery<Record<string, never>, unknown>({
  name: 'roofType.list',
  label: 'Typy střech',
  description:
    'Typy střech: id, název, značka, skladba (compositionId) s vrstvami odspodu (materiál, tloušťka mm, ' +
    'funkce; core = nosná vrstva krokví, její spodní líc je referenční rovina) a počet střech typu.',
  group: 'Střecha',
  params: S.object({}, []),
  run: (m) =>
    Object.values(m.roofTypes).map((t) => ({
      id: t.id,
      name: t.name,
      mark: t.mark,
      compositionId: t.compositionId,
      layers: (m.compositions[t.compositionId]?.layers ?? []).map((l) => ({
        materialId: l.materialId,
        material: m.materials[l.materialId]?.name ?? '',
        thickness: l.thickness,
        function: l.function,
      })),
      usage: roofTypeUsage(m, t.id),
    })),
});
