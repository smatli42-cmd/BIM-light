// Pomocníci prohlížečových testů: otevření pískoviště s pevným výřezem, klikání na body v mm
// a příprava scény příkazy z registru (přes window.__bim). Ukázková data jsou vymyšlená.
import type { Page } from '@playwright/test';
import type { Id, Model, Wall } from '@bim-light/core';

/** Model v e2e testech stěn: prvky čte jako stěny (testy, které kreslí desky, použijí `allSlabs`). */
export type WallModel = Omit<Model, 'elements'> & { readonly elements: Readonly<Record<Id, Wall>> };

export interface Pt {
  x: number;
  y: number;
}

/** Otevře pískoviště; 0,1 px na mm, počátek modelu 300 px zleva a 500 px shora v plátně. */
export async function open(page: Page) {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./');
  await page.waitForFunction(() => !!window.__bim);
  // Rozměry rozhraní jsou v rem, plátno tak může začínat na zlomku px; počátek modelu se posune na celý px
  // stránky, aby body testů (násobky 10 mm) padly přesně na pixely myši.
  const c = (await page.getByTestId('drawing-canvas').boundingBox())!;
  const [dx, dy] = [Math.round(c.x) - c.x, Math.round(c.y) - c.y];
  await page.evaluate(([x, y]) => window.__bim!.setView(0.1, 300 + x, 500 + y), [dx, dy] as const);
}

export const px = (page: Page, x: number, y: number): Promise<Pt> =>
  page.evaluate(([a, b]) => window.__bim!.toPage(a, b), [x, y] as const);

export async function moveTo(page: Page, x: number, y: number, steps = 3) {
  const p = await px(page, x, y);
  await page.mouse.move(p.x, p.y, { steps });
}

/** Klik na bod v mm modelu (volitelně s klávesou). */
export async function clickAt(page: Page, x: number, y: number, mod?: 'Shift' | 'Alt' | 'Control') {
  await moveTo(page, x, y);
  if (mod) await page.keyboard.down(mod);
  await page.mouse.down();
  await page.mouse.up();
  if (mod) await page.keyboard.up(mod);
}

export async function clickPx(page: Page, p: Pt, button: 'left' | 'right' = 'left') {
  await page.mouse.move(p.x, p.y, { steps: 2 });
  await page.mouse.click(p.x, p.y, { button });
}

/** Tažení myší mezi dvěma body v px stránky. */
export async function dragPx(page: Page, a: Pt, b: Pt, mod?: 'Shift' | 'Alt') {
  await page.mouse.move(a.x, a.y);
  if (mod) await page.keyboard.down(mod);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  if (mod) await page.keyboard.up(mod);
}

export const model = (page: Page): Promise<WallModel> =>
  page.evaluate(() => window.__bim!.model()) as Promise<WallModel>;

export async function walls(page: Page) {
  const m = await model(page);
  return Object.values(m.elements);
}

export async function dims(page: Page) {
  const m = await model(page);
  return Object.values(m.dimensions);
}

export const run = (page: Page, name: string, params: unknown): Promise<string[]> =>
  page.evaluate(([n, p]) => [...window.__bim!.run(n as string, p)], [name, params] as const);

export const selection = (page: Page) => page.evaluate(() => window.__bim!.selection());

/** Přímá stěna Zdivo 300 (tloušťka vlevo od směru). */
export async function wall(page: Page, a: Pt, b: Pt, connections: unknown[] = []): Promise<string> {
  const [id] = await page.evaluate(
    ([a1, b1, c]) => {
      const h = window.__bim!;
      return h.run('wall.create', {
        storeyId: h.storeyId(),
        typeId: h.typeId('Zdivo 300'),
        path: { kind: 'line', start: a1, end: b1 },
        connections: c,
      });
    },
    [a, b, connections] as const,
  );
  return id as string;
}

/** Místnost 4000 × 3000 po směru hodin (tloušťka ven). Vrací levá, horní, pravá, spodní. */
export async function room(page: Page): Promise<[string, string, string, string]> {
  const ids = await page.evaluate(() => {
    const h = window.__bim!;
    return h.run('wall.rectangle', {
      storeyId: h.storeyId(),
      typeId: h.typeId('Zdivo 300'),
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 3000 },
    });
  });
  const [top, right, bottom, left] = ids as string[];
  return [left as string, top as string, right as string, bottom as string];
}

export const temps = (page: Page) => page.evaluate(() => window.__bim!.temps());
export const perms = (page: Page) => page.evaluate(() => window.__bim!.perms());

export async function wallById(page: Page, id: string) {
  const m = await model(page);
  const w = m.elements[id];
  if (!w) throw new Error(`Stěna ${id} není v modelu`);
  return w;
}

export const near = (a: number, b: number, tol = 0.5) => Math.abs(a - b) <= tol;

/** Vybere kótu (klik na její čáru) a klikne na její zámeček – zámeček je jen u vybrané kóty. */
export async function clickLock(page: Page, i = 0) {
  const p = (await perms(page))[i]!;
  await page.mouse.click(p.line.x, p.line.y);
  const lock = (await perms(page))[i]!.lock;
  await page.mouse.click(lock.x, lock.y);
}
