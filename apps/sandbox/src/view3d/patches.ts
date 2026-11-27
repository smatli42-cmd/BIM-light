// Rekonstrukce u otvorů ve 3D (plán stěn Z10, stejně jako záplaty v půdorysu – opening/renovation.ts):
// probourání (nový otvor ve stávající stěně) = část stěny ve stavu „bourání“, zazdívka (bouraný otvor) =
// část ve stavu „nový“. Barvu povrchu dá funkce grafiky pohledu; když se od stěny liší (Bourací práce:
// žlutě), otvor se ze stěny vyřízne a vyplní blokem té barvy. Jinak nic navíc. Jen čtení jádra.
import {
  elementFacts,
  openingLevels,
  resolveGraphics,
  type Model,
  type Opening,
  type Status,
  type View,
  type Wall,
} from '@bim-light/core';
import { sliceLayer } from './slice.ts';
import { openingFootprint, type Solid } from './solids.ts';

/** Stav záplaty: probourání = bourání, zazdívka = nový; otvor ve stěně stejného stavu nic. */
function patchStatus(o: Opening, host: Wall): Status | null {
  if (o.status === 'new' && host.status !== 'new') return 'demolished';
  if (o.status === 'demolished' && host.status !== 'demolished') return 'new';
  return null;
}

/** Barva záplaty otvoru v pohledu `view` (už na podlaží otvoru), nebo null = bez záplaty. */
export function patchColor(model: Model, view: View, o: Opening, host: Wall): string | null {
  const status = patchStatus(o, host);
  if (!status || o.variant.kind !== 'main') return null;
  const facts = elementFacts(model, host);
  const g = resolveGraphics(model.display, view, { ...facts, status }).effect;
  const hostColor = resolveGraphics(model.display, view, facts).effect.surfaceColor;
  return g.visible && g.surfaceColor && g.surfaceColor !== hostColor ? g.surfaceColor : null;
}

/** Blok záplaty přes celou tloušťku stěny (u niky do hloubky), výška otvoru. */
export function patchSolid(model: Model, o: Opening, host: Wall, color: string): Solid | null {
  const { bottom, top } = openingLevels(model, o, host);
  const slabs = sliceLayer([openingFootprint(model, o, host, 0)], bottom, top, []);
  return slabs.length ? { elementId: host.id, materialId: null, color, transparent: false, slabs } : null;
}
