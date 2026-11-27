// Dotazy pro AI (koncepce 3): elektro prvky podlaží (typ, skupina, poloha, výška, označení, místnost)
// a knihovna typů projektu (symbol, výchozí výška, třída IFC, počet použití).
import { S } from '../commands/schema.ts';
import { heightDiffers } from '../electro/place.ts';
import { heightLabel } from '../electro/draw.ts';
import { electroFrame, electroHeight, slotsOf } from '../electro/place.ts';
import { electroRoom } from '../electro/room.ts';
import type { ElectroHost, ElectroType } from '../electro/types.ts';
import type { Id } from '../ids/index.ts';
import { defineQuery } from './types.ts';

export interface ElectroRow {
  readonly id: Id;
  readonly typeId: Id;
  readonly typeName: string;
  readonly groupId: Id;
  readonly ifcClass: string;
  readonly storeyId: Id;
  readonly status: string;
  readonly host: ElectroHost;
  /** Místo osazení (líc stěny / bod) v mm. */
  readonly position: { x: number; y: number } | null;
  /** Výška osy nad podlahou; null = na stropě. */
  readonly height: number | null;
  /** Popisek výšky ve výkresu (jen když se liší od výchozí výšky typu). */
  readonly heightLabel: string | null;
  readonly mark: string;
  readonly slots: readonly string[];
  readonly roomId: Id | null;
  readonly roomNumber: string | null;
}

const round = (v: number) => Math.round(v * 10) / 10;

export const electroList = defineQuery<{ storeyId?: Id }, ElectroRow[]>({
  name: 'electro.list',
  label: 'Elektro prvky',
  description:
    'Elektro prvky (volitelně jen podlaží storeyId): typ, skupina legendy, třída IFC, hostitel (stěna + poloha ' +
    'a strana, nebo bod), místo osazení v mm, výška osy (null = strop), popisek výšky (jen při odlišné výšce ' +
    'od typu), označení, sloty rámečku a místnost (počítá se z polohy).',
  group: 'Elektro',
  params: S.object({ storeyId: S.id }, []),
  run(m, p) {
    return Object.values(m.electroElements)
      .filter((e) => !p.storeyId || e.storeyId === p.storeyId)
      .map((e) => {
        const t = m.electroTypes[e.typeId];
        const f = electroFrame(m, e);
        const h = electroHeight(m, e);
        const room = electroRoom(m, e);
        return {
          id: e.id,
          typeId: e.typeId,
          typeName: t?.name ?? '?',
          groupId: t?.groupId ?? '',
          ifcClass: e.ifcClass,
          storeyId: e.storeyId,
          status: e.status,
          host: e.host,
          position: f && { x: round(f.origin.x), y: round(f.origin.y) },
          height: h,
          heightLabel: h !== null && heightDiffers(m, e) ? heightLabel(h) : null,
          mark: e.mark,
          slots: slotsOf(m, e),
          roomId: room?.id ?? null,
          roomNumber: room?.number ?? null,
        };
      });
  },
});

export const electroTypeList = defineQuery<
  Record<string, never>,
  (ElectroType & { used: number; groupName: string })[]
>({
  name: 'electroType.list',
  label: 'Elektro typy',
  description:
    'Typy elektro značek projektu (knihovna ČSN EN 60617 + vlastní): id, název, popis, druh (device / equipment / ' +
    'light / board), skupina legendy, třída IFC, osazení, výchozí výška (null = strop), značka, rozměry rozvaděče ' +
    'a počet prvků daného typu.',
  group: 'Elektro',
  params: S.object({}, []),
  run(m) {
    const used = new Map<Id, number>();
    for (const e of Object.values(m.electroElements)) used.set(e.typeId, (used.get(e.typeId) ?? 0) + 1);
    return Object.values(m.electroTypes).map((t) => ({
      ...t,
      used: used.get(t.id) ?? 0,
      groupName: m.electroGroups[t.groupId]?.name ?? '',
    }));
  },
});
