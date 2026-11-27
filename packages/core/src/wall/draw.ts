// Generátor půdorysu stěn (základy 5, 11; katalog pohledů: „Stěna: smlouva s kreslením“; plán stěn Z2).
// Stěna nevolí barvu, šrafu ani pero sama: vše dostane z funkce grafiky.
// Hrubá: sjednocený obrys všech viditelných stěn + jedna výplň. Střední: navíc vrstvy po napojení se
// šrafou materiálu a čáry mezi různými materiály (mezi stejnými se nekreslí). Jemná (Z6): jako střední,
// hranice nosného jádra perem řezu. Čelní čára volného konce jen se zapnutými konci stěn (`endLines`).
import type { Primitive } from '../drawing/primitives.ts';
import type { Detail, ResolvedEffect } from '../style/types.ts';
import { drawCutLines, type CutLineItem, type CutLinePiece } from './cut-lines.ts';
import { freeEndCaps } from './draw-extras.ts';
import { layerBandFrame, layerHatch, type DrawLookup } from './draw-hatch.ts';
import type { WallGeometry } from './geometry.ts';

export interface WallDrawItem {
  readonly geom: WallGeometry;
  /** Výsledná grafika stěny (funkce grafiky); neviditelné stěny se sem nedávají. */
  readonly g: ResolvedEffect;
}

/** Výplň a šrafy jedné stěny. */
export function drawWallFills(item: WallDrawItem, detail: Detail, look: DrawLookup): Primitive[] {
  const { geom, g } = item;
  const id = geom.wallId;
  const out: Primitive[] = [];
  if (g.fillColor !== null) {
    for (const polygon of geom.outlines)
      out.push({
        kind: 'fill',
        polygon,
        color: g.fillColor,
        transparency: g.transparency,
        source: { elementId: id, role: 'výplň' },
      });
  }
  if (detail !== 'coarse') {
    for (const layer of geom.layers)
      for (const p of layer.polygons)
        out.push(...layerHatch(layer, p, g, look, id, layerBandFrame(geom, layer)));
  }
  return out;
}

/** Čáry všech stěn najednou (obrys sjednocený přes napojené stěny). */
export function drawWallLines(items: readonly WallDrawItem[], detail: Detail, merge = true): Primitive[] {
  const pieces: CutLinePiece[] = items.flatMap((it, item) =>
    it.geom.layers.flatMap((l, layer) =>
      l.polygons.map((polygon) => ({
        polygon,
        item,
        layer,
        materialId: l.span.layer.materialId,
        core: l.span.layer.function === 'core',
      })),
    ),
  );
  // Čela volných konců stěn, které mají konce stěn vypnuté (grafika `endLines`), se nekreslí.
  const lineItems: CutLineItem[] = items.map((it) => ({
    elementId: it.geom.wallId,
    g: it.g,
    hiddenCaps: it.g.endLines ? [] : freeEndCaps(it.geom),
  }));
  return drawCutLines(lineItems, pieces, detail, merge);
}

/**
 * Kresba stěn: výplně a šrafy, potom čáry. `merge` = průchozí materiál: stejný materiál sousedních stěn
 * bez dělicí čáry (výchozí; vypnutí je volba zobrazení okna, koncepce rozhraní 2 G).
 */
export function drawWalls(
  items: readonly WallDrawItem[],
  detail: Detail,
  look: DrawLookup,
  merge = true,
): Primitive[] {
  return [...items.flatMap((it) => drawWallFills(it, detail, look)), ...drawWallLines(items, detail, merge)];
}
