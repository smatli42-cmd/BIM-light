// Změna čísla v kótě (katalog kreslení 3.3–3.4, pravidla-interakce kóty 1, 9, 10; základ 25).
// Pohne se vybraná stěna; u délky uchopený konec. Zámek se změnou čísla nikdy nemění.
import {
  refOwnerId,
  type Dimension,
  dot,
  findWall,
  formatLength,
  type Id,
  leftNormal,
  measureDimension,
  parseNumber,
  tangentAt,
} from '@bim-light/core';
import type { Session } from '../session/session.ts';
import type { PermDimView } from './hits.ts';
import type { TempDimView } from './temp-layout.ts';

function centre(r: { x: number; y: number; w: number; h: number }) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Pole pro číslo dočasné kóty obrysu; `apply` dostane nové kladné číslo (mm). */
export function editOutline(s: Session, t: TempDimView, apply: (value: number) => void) {
  s.valueEdit = {
    at: centre(t.textRect),
    value: formatLength(t.temp.value),
    commit: (text) => {
      const v = parseNumber(text);
      if (v > 0 && Math.abs(v - t.temp.value) > 1e-6) apply(v);
    },
  };
  s.changed();
}

/** Pole pro číslo dočasné kóty: příčná posune vybranou stěnu, délková uchopený konec. */
export function editTemp(s: Session, t: TempDimView) {
  const temp = t.temp;
  if (temp.kind === 'outline') {
    const elementId = temp.own?.ownerId;
    if (!elementId) return;
    return editOutline(s, t, (value) => s.run('outline.setDistance', { elementId, side: temp.side, value }));
  }
  const wallId = temp.own.wallId;
  s.valueEdit = {
    at: centre(t.textRect),
    value: formatLength(temp.value),
    commit: (text) => {
      const v = parseNumber(text);
      if (!(v > 0)) return;
      if (temp.own.openingId && temp.kind === 'cross') {
        // Otvor (Z4): delší odstup od začátku = posun ke konci stěny, od konce = k začátku.
        const sign = temp.own.face === 'start' ? 1 : -1;
        const distance = (v - temp.value) * sign;
        if (Math.abs(distance) > 1e-6) s.run('opening.move', { openingIds: [temp.own.openingId], distance });
        return;
      }
      if (temp.kind === 'length') {
        s.run('wall.setLength', { wallId, end: s.lenEnd, length: v, face: 'ref' });
        return;
      }
      const w = findWall(s.model, wallId);
      if (!w) return;
      const n = leftNormal(tangentAt(w.path, 'start'));
      const distance = -(v - temp.value) * dot(temp.dir, n);
      if (Math.abs(distance) > 1e-6) s.run('wall.offset', { wallId, distance });
    },
  };
  s.changed();
}

/** Který odkaz kóty se hýbe: vybraná stěna z dvojice, jinak ta, z níž kóta vznikla (základ 25). */
export function moverOf(d: Dimension, selected: readonly Id[]): 0 | 1 | undefined {
  if (d.kind === 'length') return undefined;
  const ids = d.kind === 'linear' ? [refOwnerId(d.refs[0]), refOwnerId(d.refs[1])] : d.wallIds;
  if (selected.includes(ids[1] as Id) && !selected.includes(ids[0] as Id)) return 1;
  if (selected.includes(ids[0] as Id)) return 0;
  return undefined;
}

/** Pole pro číslo trvalé kóty. */
/** `selected` = stěny vybrané v okamžiku kliknutí na číslo (určují, co se pohne). */
export function editPerm(
  s: Session,
  view: PermDimView,
  selected: readonly Id[] = [
    ...s.selection.walls,
    ...s.selection.openings,
    ...s.selection.slabs,
    ...s.selection.slabOpenings,
  ],
) {
  const d = view.dim;
  const value = measureDimension(s.model, d);
  s.valueEdit = {
    at: centre(view.textRect),
    value:
      d.kind === 'angular' ? String(Math.round(value * 100) / 100).replace('.', ',') : formatLength(value),
    commit: (text) => {
      const v = parseNumber(text);
      if (!(v > 0)) return;
      const moveRef = moverOf(d, selected);
      const end = d.kind === 'length' && selected.includes(d.ref.wallId) ? s.lenEnd : undefined;
      s.run('dimension.setValue', {
        dimensionId: d.id,
        value: v,
        ...(moveRef !== undefined ? { moveRef } : {}),
        ...(end ? { end } : {}),
      });
    },
  };
  s.changed();
}

/** Přepsat text kóty (pravidla-interakce, kóty 10); prázdné = vrátit skutečnou hodnotu. */
export function editText(s: Session, view: PermDimView) {
  s.valueEdit = {
    at: centre(view.textRect),
    value: view.dim.textOverride ?? '',
    text: true,
    commit: (text) => {
      s.run('dimension.setText', { dimensionId: view.id, text: text.trim() === '' ? null : text.trim() });
    },
  };
  s.changed();
}
