// Tloušťka čar na obrazovce (základ 32, koncepce rozhraní 2 G). Čára tenčí než pixel obrazovky nebo
// s necelým počtem pixelů se vyhlazuje a podle polohy vůči mřížce pixelů vychází každá jinak sytá –
// šrafa pak vypadá, že má čáry různě silné. Proto vždy celé pixely obrazovky, nejméně jeden.
// Tisk (mm z tabulky per) se tím nemění; jde jen o vykreslení na monitoru.

/** 1 mm na papíře = 96 / 25,4 px při 100 %. */
export const PX_PER_PAPER_MM = 96 / 25.4;

/**
 * Tloušťka čáry v CSS px pro plátno se škálováním `dpr` (pixely obrazovky na CSS px).
 * Vlasové čáry = 1 pixel obrazovky; jinak pero v mm zaokrouhlené na celé pixely obrazovky (min. 1).
 */
export function screenLineWidth(penMm: number, hairline: boolean, dpr: number): number {
  const device = hairline ? 1 : Math.max(1, Math.round(penMm * PX_PER_PAPER_MM * dpr));
  return device / dpr;
}

/** Souřadnice ve středu pixelu obrazovky (pro vodorovné a svislé čáry tloušťky 1 pixel). */
export function snapToPixel(x: number, dpr: number): number {
  return (Math.floor(x * dpr) + 0.5) / dpr;
}

/** Škálování plátna (pixely obrazovky na CSS px) z jeho transformace. */
export const canvasDpr = (ctx: CanvasRenderingContext2D): number => {
  const t = typeof ctx.getTransform === 'function' ? ctx.getTransform() : undefined;
  return t && t.a > 0 ? t.a : 1;
};
