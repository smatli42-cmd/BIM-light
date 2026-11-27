// Znaky půdorysných značek (ČSN EN 60617, vlastní kresba – princip, ne kopie Arditu). Data: tvary
// v jednotkách velikosti značky. Znaky na stěnu začínají na líci (y = 0) a míří do místnosti; znaky
// na strop mají střed v počátku. Složené přístroje (dvojzásuvka, přepínač + zásuvka) jsou sloty vedle sebe.
import {
  arc,
  arm,
  box,
  circle,
  disc,
  fill,
  lamp,
  line,
  poly,
  rect,
  ring,
  stem,
  v,
  type Glyph,
} from './glyph-shapes.ts';

const g = (shapes: Glyph['shapes'], width = 1): Glyph => ({ width, shapes });
const cup = line(v(-0.45, 1), v(-0.45, 0.4), v(0.45, 0.4), v(0.45, 1));
const SW = v(0, 0.2);
const wallBar = line(v(-0.4, 0.1), v(0.4, 0.1));

/** Znaky na líc stěny (zásuvky, spínače, krabičky). */
const WALL: Record<string, Glyph> = {
  socket: g([stem(0.5), arc(v(0, 1), 0.5, 180, 360)]),
  data: g([stem(0.4), cup, stem(0.8, 0.4)]),
  tv: g([stem(0.4), cup, line(v(-0.15, 0.4), v(-0.15, 0.8)), line(v(0.15, 0.4), v(0.15, 0.8))]),
  switch1: g([circle(SW, 0.18), ...arm(SW, 0.18, 60)]),
  switch6: g([
    circle(v(0, 0.55), 0.18),
    ...arm(v(0, 0.55), 0.18, 60, 0.6),
    ...arm(v(0, 0.55), 0.18, 240, 0.55),
  ]),
  switch5: g([circle(SW, 0.18), ...arm(SW, 0.18, 60), ...arm(SW, 0.18, 120)]),
  dimmer: g([circle(SW, 0.18), ...arm(SW, 0.18, 60), line(v(0.06, 0.74), v(0.44, 0.52))]),
  blind: g([
    rect(-0.4, 0.1, 0.4, 0.9),
    fill(v(-0.2, 0.55), v(0.2, 0.55), v(0, 0.8)),
    fill(v(-0.2, 0.45), v(0.2, 0.45), v(0, 0.2)),
  ]),
  outlet1f: g([stem(0.5), line(v(0, 0.5), v(-0.35, 1)), line(v(0, 0.5), v(0.35, 1))]),
  outlet3f: g([stem(1), line(v(0, 0.5), v(-0.35, 1)), line(v(0, 0.5), v(0.35, 1))]),
  videophone: g([...box(''), circle(v(0, 0.5), 0.2)], 1.3),
  thermostat: g(box('T'), 1.3),
  wallbox: g(box('EV', 1.3, 0.4), 1.3),
  fan: g([...box(''), circle(v(-0.25, 0.5), 0.22), circle(v(0.25, 0.5), 0.22)], 1.3),
  pir: g(box('PIR', 1.3, 0.35), 1.3),
  contact: g(box('MK', 1.3, 0.38), 1.3),
  siren: g([stem(0.3), poly(v(-0.2, 0.3), v(0.2, 0.3), v(0.5, 1), v(-0.5, 1))]),
  keypad: g([
    rect(-0.5, 0.1, 0.5, 0.9),
    ...[-0.2, 0.2].flatMap((x) => [disc(v(x, 0.3), 0.07), disc(v(x, 0.7), 0.07)]),
  ]),
  'alarm-panel': g(box('EZS', 1.6, 0.38), 1.6),
  bell: g([stem(0.4), arc(v(0, 0.4), 0.5, 0, 180), line(v(-0.5, 0.4), v(0.5, 0.4))]),
  'camera-wall': g(
    [
      stem(0.3),
      line(v(-0.3, 0.3), v(0.3, 0.3)),
      line(v(-0.3, 0.3), v(-0.55, 1)),
      line(v(0.3, 0.3), v(0.55, 1)),
    ],
    1.1,
  ),
  'lamp-wall': g([wallBar, stem(0.15, 0.1), ...lamp(v(0, 0.65))]),
  'lamp-outdoor': g([wallBar, stem(0.15, 0.1), ...lamp(v(0, 0.65)), arc(v(0, 0.65), 0.75, 120, 240)], 1.5),
};

const O = v(0, 0);

/** Znaky na strop nebo do místnosti (střed v počátku). */
const CENTER: Record<string, Glyph> = {
  lamp: g(lamp(O)),
  'lamp-surface': g([...lamp(O, 0.42), circle(O, 0.55)]),
  'lamp-pendant': g([...lamp(O), disc(O, 0.12)]),
  'lamp-sensor': g([...lamp(O), arc(O, 0.72, 15, 75), arc(O, 0.92, 15, 75)]),
  smoke: g(ring('S', 0.5)),
  co: g(ring('CO', 0.38)),
  wifi: g([disc(v(0, -0.35), 0.08), ...[0.3, 0.55, 0.8].map((r) => arc(v(0, -0.35), r, 45, 135))]),
  'camera-ceiling': g([circle(O, 0.5), fill(v(-0.25, -0.2), v(0.25, -0.2), v(0, 0.25))]),
};

export const GLYPHS: Readonly<Record<string, Glyph>> = { ...WALL, ...CENTER };

/** Znaky, které jdou dát do slotu rámečku (Ardit „Rámeček“: zásuvka, datová, anténní, spínače). */
export const SLOT_GLYPHS = [
  'socket',
  'data',
  'tv',
  'switch1',
  'switch6',
  'switch5',
  'dimmer',
  'blind',
] as const;

/** Český název znaku (nabídka slotu rámečku, legenda). */
export const GLYPH_NAMES: Readonly<Record<string, string>> = {
  socket: 'El. zásuvka',
  data: 'Datová zásuvka',
  tv: 'Anténní zásuvka',
  switch1: 'Spínač č. 1',
  switch6: 'Přepínač č. 6',
  switch5: 'Přepínač č. 5',
  dimmer: 'Stmívač',
  blind: 'Ovladač stínění',
};

export const isGlyph = (key: string): boolean => key in GLYPHS;
