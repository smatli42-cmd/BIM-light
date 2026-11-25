// Společné části AI scénářů (testy): start projektu, místnost řetězem, řádky dotazů.
import { aiClient } from '../testing/ai-client.ts';

export interface Info {
  storeys: { id: string }[];
  wallTypes: { id: string; name: string; thickness: number }[];
  views: { id: string }[];
}
export interface WallRow {
  id: string;
  length: number;
  thickness: number;
  ends: { start: string; end: string };
  connections: { own: string; otherWallId: string; other: string }[];
}
export interface DimRow {
  id: string;
  value: number;
}

export function start() {
  const ai = aiClient();
  const info = ai.call<Info>('project.info');
  const storeyId = info.storeys[0]!.id;
  const typeId = info.wallTypes.find((t) => t.name === 'Zdivo 300')!.id;
  const viewId = info.views[0]!.id;
  return { ai, storeyId, typeId, viewId };
}

/** Místnost 6000 × 4000 po vnitřním líci, po směru hodin (tloušťka ven). Vrací [levá, horní, pravá, spodní]. */
export function room(c: ReturnType<typeof start>) {
  const points = [
    { x: 0, y: 0 },
    { x: 0, y: 4000 },
    { x: 6000, y: 4000 },
    { x: 6000, y: 0 },
  ];
  return c.ai.call<string[]>('wall.chain', { storeyId: c.storeyId, typeId: c.typeId, points, closed: true });
}

export const row = (rows: WallRow[], id: string) => rows.find((r) => r.id === id)!;
