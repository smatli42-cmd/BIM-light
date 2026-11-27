// Dotazy na spárořez (prvky stavby 9) pro AI, 3D okno a info box: spáry jako úsečky v rovině plochy
// s transformací do 3D (stejný tvar rámce jako covering.surfaces) a počty dlaždic po místnostech a typech.
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import { roomTiling, tileCounts, withWaste, type SurfaceTiling } from '../covering/tiles.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { Room } from '../room/types.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;
const pt = (p: Vec2) => ({ x: r1(p.x), y: r1(p.y) });
const m2 = (mm2: number) => Math.round(mm2 / 1e4) / 100;

/** Místnosti podle parametrů (jedna, podlaží, nebo všechny). */
function rooms(m: Model, p: { roomId?: string; storeyId?: string }): Room[] {
  if (p.roomId) return [m.rooms[p.roomId] ?? fail('not-found', `Místnost ${p.roomId} neexistuje`)];
  return Object.values(m.rooms).filter((r) => !p.storeyId || r.storeyId === p.storeyId);
}

const where = (t: SurfaceTiling) => ({
  surfaceId: t.surface.id,
  place: t.surface.place,
  ...(t.surface.wallId && { wallId: t.surface.wallId, side: t.surface.side }),
  ...(t.surface.openingId && { openingId: t.surface.openingId, jambPart: t.surface.jambPart }),
  ...(t.surface.zone !== undefined && { zone: t.surface.zone }),
});

const PARAMS = S.object({ storeyId: S.id, roomId: S.id }, []);

export const coveringJoints = defineQuery<{ storeyId?: string; roomId?: string }, unknown>({
  name: 'covering.joints',
  label: 'Spáry obkladu a dlažby',
  description:
    'Spárořez ploch s obkladem / dlažbou / soklem: pro každou plochu surfaceId (= id z covering.surfaces), ' +
    'roomId, storeyId, place, wallId + side, zone, typeId, joint (šířka spáry mm), jointColor, ' +
    'segments = osy spár jako úsečky [{a, b}] v rovině plochy (u, v v mm) a frame = transformace do 3D ' +
    '(stejná jako v covering.surfaces; u válcové plochy je úsečka po u ve 3D oblouk).',
  group: 'Povrchy',
  params: PARAMS,
  run: (m, p) =>
    rooms(m, p).flatMap((r) =>
      roomTiling(m, r).map((t) => ({
        ...where(t),
        roomId: r.id,
        storeyId: r.storeyId,
        typeId: t.type.id,
        joint: t.tile.joint,
        jointColor: t.tile.jointColor,
        segments: t.layout.joints.map((s) => ({ a: pt(s.a), b: pt(s.b) })),
        frame: t.surface.frame,
      })),
    ),
});

export const coveringTiles = defineQuery<
  { storeyId?: string; roomId?: string; wastePercent?: number },
  unknown
>({
  name: 'covering.tiles',
  label: 'Počty dlaždic',
  description:
    'Počty dlaždic po místnostech a typech: whole (celé), cut (řezané – každý odřez = 1 dlaždice), narrow ' +
    '(úzké řezy pod třetinu formátu, aspoň 50 mm), total (celé + řezané), totalWithWaste (s prořezem ' +
    'wastePercent, výchozí 10 %, nahoru na kusy), area (m²). surfaces = plochy se spárořezem: surfaceId, ' +
    'place, wallId + side, originKey, anchor (bod zarovnání), origin (počátek = anchor + offset), offset ' +
    '(posun z covering.setOrigin, mm v rovině plochy), whole, cut, narrowCuts [{width, height}] (mm).',
  group: 'Povrchy',
  params: S.object(
    { storeyId: S.id, roomId: S.id, wastePercent: S.number('prořez v %', { minimum: 0 }) },
    [],
  ),
  run: (m, p) =>
    rooms(m, p).flatMap((r) => {
      const list = roomTiling(m, r);
      if (!list.length) return [];
      return [
        {
          roomId: r.id,
          roomNumber: r.number,
          types: tileCounts(list).map((c) => ({
            typeId: c.typeId,
            typeName: m.coveringTypes[c.typeId]?.name ?? '',
            whole: c.whole,
            cut: c.cut,
            narrow: c.narrow,
            total: c.whole + c.cut,
            totalWithWaste: withWaste(c.whole + c.cut, p.wastePercent ?? 10),
            area: m2(c.area),
          })),
          surfaces: list.map((t) => ({
            ...where(t),
            typeId: t.type.id,
            originKey: t.originKey,
            anchor: pt(t.layout.anchor),
            origin: pt(t.layout.origin),
            offset: pt(t.offset),
            whole: t.layout.whole,
            cut: t.layout.cut,
            narrowCuts: t.layout.pieces
              .filter((x) => x.narrow)
              .map((x) => ({ width: r1(x.width), height: r1(x.height) })),
          })),
        },
      ];
    }),
});
