// Popisy skladby v Řezu A ukázkového domu (úkol uživatele 2026-11-28): obvodová stěna 1.NP, strop nad 1.NP
// a podlaha – odkazová čára od řezané konstrukce k vrstvám typu. Jen příkazy compositionTag.create.
import { cutRowOf } from '../composition-tag/content.ts';
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
  // Obvodová stěna: text vlevo od budovy (polička doleva, řádky zarovnané zprava).
  if (wall)
    c.run('compositionTag.create', {
      sectionId,
      elementId: wall.id,
      at: { x: wall.mid.x, y: wall.row.bottom + 1200 },
      textAt: { x: box.u0 - 1500, y: wall.row.bottom + 2000 },
    });
  // Strop a podlaha: text vpravo od budovy.
  const ceiling = slab('structure', true);
  if (ceiling)
    c.run('compositionTag.create', {
      sectionId,
      elementId: ceiling.id,
      at: { x: ceiling.row.u1 - 1500, y: ceiling.mid.y },
      textAt: { x: box.u1 + 1500, y: ceiling.row.top + 1500 },
    });
  const floor = slab('floor', false);
  if (floor)
    c.run('compositionTag.create', {
      sectionId,
      elementId: floor.id,
      at: { x: floor.row.u1 - 1000, y: floor.mid.y },
      textAt: { x: box.u1 + 1500, y: floor.row.top + 400 },
      numbered: true,
    });
}
