// Popisy skladby v Řezu A ukázkového domu (úkol uživatele 2026-11-28): obvodová stěna 1.NP, strop nad 1.NP,
// podlaha a střecha (kolmo k rovině střechy) – odkazová čára kolmo přes konstrukci, lom, kolečko s číslem a vrstvy typu. Jen příkazy compositionTag.create.
import { cutRowOf } from '../composition-tag/content.ts';
import { roofCross } from '../composition-tag/roof.ts';
import { vec, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { SampleContext } from './types.ts';

/** Řezaný prvek podle podmínky (nejvíc vlevo na výkrese): střed jeho řezu a rozsah. */
function cut(c: SampleContext, sectionId: Id, pick: (id: Id) => boolean) {
  const s = c.model.sections[sectionId];
  if (!s) return null;
  const rows = Object.values(c.model.elements)
    .flatMap((e) => (pick(e.id) ? [{ id: e.id, row: cutRowOf(c.model, s, e.id) }] : []))
    .flatMap((x) => (x.row ? [{ id: x.id, row: x.row }] : []))
    .sort((a, b) => a.row.u0 - b.row.u0);
  const hit = rows[0];
  if (!hit) return null;
  const { row } = hit;
  return { id: hit.id, row, mid: { x: (row.u0 + row.u1) / 2, y: (row.bottom + row.top) / 2 } };
}

/** Obálka řezaných prvků na výkrese (texty popisů jdou mimo budovu). */
function extent(c: SampleContext, sectionId: Id) {
  const s = c.model.sections[sectionId];
  const rows = s ? Object.keys(c.model.elements).flatMap((id) => cutRowOf(c.model, s, id) ?? []) : [];
  return { u0: Math.min(...rows.map((r) => r.u0)), u1: Math.max(...rows.map((r) => r.u1)) };
}

/** Střecha: šikmá jižní rovina u okapu (dál už řez vede valbou podél vrstevnice), čára kolmo ven, lom doleva. */
function roofTag(c: SampleContext, sectionId: Id, left: number) {
  const s = c.model.sections[sectionId];
  const roof = cut(c, sectionId, (id) => c.model.elements[id]?.category === 'roof');
  if (!s || !roof) return;
  const u = roof.row.u0 + (roof.row.u1 - roof.row.u0) * 0.1;
  const r = roofCross(c.model, s, roof.id, u);
  if (!r) return;
  const at = {
    x: r.bottom.x + (r.normal.x * r.thickness) / 2,
    y: r.bottom.y + (r.normal.y * r.thickness) / 2,
  };
  const bend = { x: at.x + r.normal.x * 1200, y: at.y + r.normal.y * 1200 };
  c.run('compositionTag.create', {
    sectionId,
    elementId: roof.id,
    at,
    points: [bend, vec(left, bend.y)],
    side: 'left',
    align: 'right',
  });
}

export function houseCompositionTags(c: SampleContext, sectionId: Id) {
  const m = c.model;
  const box = extent(c, sectionId);
  const wall = cut(c, sectionId, (id) => {
    const e = m.elements[id];
    return (
      e?.category === 'wall' && e.storeyId === c.storeyId && !!m.wallTypes[e.typeId]?.properties.isExternal
    );
  });
  const slab = (fn: string, upperStorey: boolean) =>
    cut(c, sectionId, (id) => {
      const e = m.elements[id];
      return (
        e?.category === 'slab' &&
        (e.storeyId !== c.storeyId) === upperStorey &&
        m.slabTypes[e.typeId]?.slabFunction === fn
      );
    });
  const put = (id: Id, at: Vec2, points: Vec2[], extra: Record<string, unknown> = {}) =>
    c.run('compositionTag.create', { sectionId, elementId: id, at, points, ...extra });
  // Obvodová stěna: čára kolmo (vodorovně) ven doleva, nad koncem popiska s řádky vlevo.
  if (wall) {
    const y = wall.row.bottom + 700;
    put(wall.id, { x: wall.mid.x, y }, [vec(box.u0 - 3200, y)], {
      side: 'left',
      align: 'right',
    });
  }
  // Strop a podlaha: čára kolmo (svisle) nahoru, lom vodorovně ven doprava, nad koncem popiska.
  const ceiling = slab('structure', true);
  if (ceiling) {
    const x = ceiling.row.u1 - 1500;
    const y = ceiling.row.top + 700;
    put(ceiling.id, vec(x, ceiling.mid.y), [vec(x, y), vec(box.u1 + 1500, y)]);
  }
  const floor = slab('floor', false);
  if (floor) {
    const x = floor.row.u1 - 1000;
    const y = floor.row.top + 800;
    put(floor.id, vec(x, floor.mid.y), [vec(x, y), vec(box.u1 + 1500, y)], { numbered: true });
  }
  roofTag(c, sectionId, box.u0 - 3200);
}
