// Posun a smazání elektro prvků (koncepce 3, základ 25): prvek na stěně se posouvá jen po líci (složka
// posunu ve směru stěny), volný prvek o celý vektor. Jeden krok Zpět pro celý výběr.
import { dot } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { stationAt } from '../../opening/along.ts';
import { omitIds } from '../../model/update.ts';
import { wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand } from '../types.ts';
import { shiftPoint } from './element.ts';
import { checkOnWall, electroOf, GROUP, putElectro } from './shared.ts';
import type { ElectroElement } from '../../electro/types.ts';
import type { Vec2 } from '../../geometry/index.ts';

const IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;

export const electroMove = defineCommand<{ elementIds: Id[]; vector: Vec2 }>({
  name: 'electro.move',
  label: 'Posunout elektro prvky',
  description:
    'Posune elektro prvky o vektor (mm). Prvek na stěně zůstane na líci: posune se jen o složku ve směru ' +
    'stěny (poloha mimo stěnu se odmítne). Prvek na stropě / v místnosti se posune o celý vektor.',
  group: GROUP,
  params: S.object({ elementIds: IDS, vector: S.point }, ['elementIds', 'vector']),
  run(model, p) {
    const moved = p.elementIds.map((id): ElectroElement => {
      const el = electroOf(model, id);
      const h = el.host;
      if (h.kind === 'free') return { ...el, host: { ...h, point: shiftPoint(h.point, p.vector) } };
      const t = stationAt(wallOf(model, h.wallId).path, h.offset).tangent;
      const next = { ...el, host: { ...h, offset: h.offset + dot(p.vector, t) } };
      checkOnWall(model, next);
      return next;
    });
    return { model: putElectro(model, moved) };
  },
});

export const electroDelete = defineCommand<{ elementIds: Id[] }>({
  name: 'electro.delete',
  label: 'Smazat elektro prvky',
  description: 'Smaže elektro prvky (zásuvky, spínače, svítidla, rozvaděče…) jedním krokem.',
  group: GROUP,
  params: S.object({ elementIds: IDS }, ['elementIds']),
  run(model, p) {
    p.elementIds.forEach((id) => electroOf(model, id));
    return { model: { ...model, electroElements: omitIds(model.electroElements, p.elementIds) } };
  },
});
