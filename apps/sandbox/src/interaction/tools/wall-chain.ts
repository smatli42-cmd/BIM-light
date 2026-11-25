// Řetěz stěn: stav řetězu, napojení nového úseku na předchozí stěnu / existující stěny (základ 24)
// a popisek přichycení u kurzoru. Používá nástroj Stěna (wall-tool.ts) i Oblouková stěna.
import { tangentAt, type Id, type Path, type SnapResult, type Vec2 } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { connectionAt } from './wall-links.ts';

export interface Chain {
  pt: Vec2;
  first: Vec2;
  prevDir: number | null;
  count: number;
  lastWallId: Id | null;
  firstWallId: Id | null;
  stack: { pt: Vec2; prevDir: number | null; lastWallId: Id | null }[];
}

/** Napojení úseku: začátek na předchozí stěnu řetězu, konec na první stěnu (uzavření) nebo jinou. */
export function chainLinks(s: Session, c: Chain, path: Path, closing: boolean) {
  const conns: { end: 'start' | 'end'; wallId: Id; at: string }[] = [];
  const startLink = c.lastWallId
    ? { wallId: c.lastWallId, at: 'ATEND' }
    : connectionAt(s, c.pt, [], tangentAt(path, 'start'));
  if (startLink) conns.push({ end: 'start', ...startLink });
  const back = tangentAt(path, 'end');
  const endLink = closing
    ? { wallId: c.firstWallId as Id, at: 'ATSTART' }
    : connectionAt(s, path.end, c.lastWallId ? [c.lastWallId] : [], { x: -back.x, y: -back.y });
  if (endLink) conns.push({ end: 'end', ...endLink });
  return conns;
}

export function snapLabel(r: SnapResult): string {
  const sn = r.snap;
  if (!sn) return '';
  return sn.count > 1 ? `${sn.label} ${sn.index + 1}/${sn.count} (C = další)` : sn.label;
}
