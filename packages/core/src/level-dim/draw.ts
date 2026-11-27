// Výškové kóty řezu v kresbě řezu (ČSN 01 3420): praporek na úrovni, kterou kóta odkazuje (přepočítá se
// z modelu), v poloze `at` po výkrese. Viditelnost podle skupiny anotací (základ 28), pero a barva z funkce
// grafiky (kategorie kót), výplň trojúhelníku: absolutní kóta, nebo styl „vždy plné“.
import type { Primitive } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import { annotationFacts } from '../section/facts.ts';
import type { Section } from '../section/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { layerState, styleOfView } from '../view/effective.ts';
import { drawLevelSymbol } from './symbol.ts';
import type { LevelDimension } from './types.ts';
import { absoluteText, elevationText, levelZ } from './value.ts';

/** Výšková kóta jako značka (bod, text, výplň); null = odkaz už neplatí. */
export function levelDimSymbol(model: Model, s: Section, d: LevelDimension) {
  const z = levelZ(model, d.ref);
  if (z === null) return null;
  // ČSN 01 3420 (rozhodnutí uživatele): relativní prázdná, absolutní a terén plné.
  const filled =
    d.absolute || d.ref.kind === 'terrain' || styleOfView(model.display, s).levelMarkFilled === true;
  const text = d.absolute ? absoluteText(model, z) : elevationText(z);
  return { x: d.at, z, text, below: d.below, filled };
}

export function drawLevelDims(model: Model, s: Section): Primitive[] {
  return Object.values(model.levelDims ?? {}).flatMap((d) => {
    if (d.sectionId !== s.id || !layerState(model.display, s, d.annotationLayerId).visible) return [];
    const sym = levelDimSymbol(model, s, d);
    if (!sym) return [];
    const g = resolveGraphics(model.display, s, annotationFacts(d.id, 'dimension')).effect;
    if (!g.visible) return [];
    return drawLevelSymbol(sym, model.display.paperSizes, s.scale, g, {
      dimensionId: d.id,
      role: 'výšková kóta',
    });
  });
}
