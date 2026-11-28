// Automatické pohledy 1–4 kolem budovy (základ 16; Revit: pohledy v šabloně projektu). Po každém příkazu
// (jako `followSlabs`): vzniknou, jakmile je v modelu stěna nebo deska, a jejich čáry jdou za obálkou
// budovy. Čára změněná příkazem (posun uživatelem) pohled zamkne a přepočet ho nechá být; smazaný
// automatický pohled se zapamatuje a sám se znovu nevytvoří (obnoví ho elevation.create).
import { dist, type Vec2 } from '../../geometry/index.ts';
import type { IdGenerator } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { elevationsAround, isCompassName, type ElevationSpec } from '../../section/elevations.ts';
import type { Section } from '../../section/types.ts';
import { checkSection, newSection } from './shape.ts';

const samePoints = (a: readonly Vec2[], b: readonly Vec2[]) =>
  a.length === b.length && a.every((p, i) => dist(p, b[i] as Vec2) < 0.01);

const put = (m: Model, s: Section): Model => ({ ...m, sections: { ...m.sections, [s.id]: s } });

/** Čára automatického pohledu změněná příkazem (při nezměněném `auto`) = ruční úprava → zámek. */
function lockMoved(before: Model, after: Model): Model {
  let m = after;
  for (const s of Object.values(after.sections)) {
    const prev = before.sections[s.id];
    if (!s.auto || s.auto.locked || !prev || prev.auto !== s.auto) continue;
    if (samePoints(prev.points, s.points) && prev.direction === s.direction) continue;
    m = put(m, { ...s, auto: { locked: true } });
  }
  return m;
}

/** Smazané automatické pohledy si model pamatuje (podle označení). */
function rememberRemoved(before: Model, after: Model): Model {
  const gone = Object.values(before.sections)
    .filter((s) => s.auto && !after.sections[s.id])
    .map((s) => s.mark)
    .filter((mark) => !after.elevationsAround.removed.includes(mark));
  if (!gone.length) return after;
  const removed = [...after.elevationsAround.removed, ...gone];
  return { ...after, elevationsAround: { ...after.elevationsAround, removed } };
}

/** Pohled podle obálky: nová čára (a výchozí název), nebo stejný objekt, když se nic nemění. */
function follow(m: Model, s: Section, spec: ElevationSpec): Section {
  const name = isCompassName(s.name) ? spec.name : s.name;
  const points = [spec.start, spec.end];
  if (samePoints(s.points, points) && s.direction === spec.direction && s.name === name) return s;
  return checkSection(m, { ...s, name, points, direction: spec.direction });
}

/**
 * Srovná automatické pohledy s obálkou: odemčené přepočítá, chybějící (ne smazané) vytvoří.
 * Vrátí model a id všech 4 pohledů (v pořadí 1–4). Prázdný model = beze změny.
 */
export function syncElevations(model: Model, newId: IdGenerator): { model: Model; ids: string[] } {
  const specs = elevationsAround(model, model.elevationsAround.margin);
  let m = model;
  const ids: string[] = [];
  for (const spec of specs) {
    const all = Object.values(m.sections).filter((x) => x.kind === 'elevation' && x.mark === spec.mark);
    const auto = all.find((x) => x.auto);
    if (auto) {
      const next = auto.auto?.locked ? auto : follow(m, auto, spec);
      if (next !== auto) m = put(m, next);
      ids.push(auto.id);
    } else if (!all.length && !m.elevationsAround.removed.includes(spec.mark)) {
      const s = newSection(m, newId(), 'elevation', { ...spec, depth: null });
      m = put(m, { ...s, auto: { locked: false } });
      ids.push(s.id);
    }
  }
  return { model: m, ids };
}

/** Po příkazu: zámek ručně posunutých, zapamatování smazaných, přepočet podle obálky budovy. */
export function followElevations(before: Model, after: Model, newId: IdGenerator): Model {
  const same = (['elements', 'sections', 'elevationsAround', 'project'] as const).every(
    (k) => before[k] === after[k],
  );
  if (same) return after;
  return syncElevations(rememberRemoved(before, lockMoved(before, after)), newId).model;
}
