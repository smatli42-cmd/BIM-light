// Dotaz pro AI: značky typu stěn (plán stěn Z8) – stěna, značka typu, strana, poloha a střed v pohledu.
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import type { Id } from '../ids/index.ts';
import { tagCenter } from '../tag/draw.ts';
import type { TagSide } from '../tag/types.ts';
import { defineQuery } from './types.ts';

export interface WallTagRow {
  readonly id: Id;
  readonly wallId: Id;
  readonly mark: string;
  readonly side: TagSide;
  readonly position: number;
  readonly annotationLayerId: Id;
  /** Střed kroužku v modelu (mm) v měřítku pohledu. */
  readonly center: { x: number; y: number } | null;
}

export const wallTagList = defineQuery<{ viewId: Id }, WallTagRow[]>({
  name: 'wallTag.list',
  label: 'Značky typu stěn',
  description:
    'Značky typu stěn na podlaží pohledu: id, stěna, značka typu (text), strana, poloha podél stěny, ' +
    'skupina anotací a střed kroužku v mm (závisí na měřítku pohledu).',
  group: 'Popisy',
  params: S.object({ viewId: S.id }, ['viewId']),
  run(m, p) {
    const view = m.views[p.viewId] ?? fail('not-found', `Pohled ${p.viewId} neexistuje.`);
    return Object.values(m.wallTags)
      .filter((t) => t.storeyId === view.storeyId)
      .map((t) => {
        const c = tagCenter(m, t, view.scale, m.display.paperSizes);
        const w = m.elements[t.wallId];
        return {
          id: t.id,
          wallId: t.wallId,
          mark: (w && m.wallTypes[w.typeId]?.mark) ?? '',
          side: t.side,
          position: t.position,
          annotationLayerId: t.annotationLayerId,
          center: c && { x: Math.round(c.x), y: Math.round(c.y) },
        };
      });
  },
});
