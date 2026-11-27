// Znaky na líc stěny opsané z legendy uživatele (Corel SVG, zdroj pravdy tvarů 2026-11-27).
// Souřadnice v jednotkách legendy (0,01 mm), kotva = střed sloupce a spodní hrana kresby řádku.
import { arc, circle, disc, line, poly, text, v, type Glyph } from './glyph-shapes.ts';
import { fromLegend, LEGEND_COLUMN as X, wallAnchor } from './legend.ts';
import type { SymbolShape } from './types.ts';

const rect = (x0: number, y0: number, x1: number, y1: number) =>
  poly(v(x0, y1), v(x1, y1), v(x1, y0), v(x0, y0));
const stem = (bottom: number, top: number) => line(v(X, bottom), v(X, top));
const dot = (x: number, y: number, r = 20.4): SymbolShape[] => [disc(v(x, y), r), circle(v(x, y), r)];
const g = (bottom: number, shapes: SymbolShape[]): Glyph => fromLegend(wallAnchor(bottom), shapes);
const cup = (top: number, bottom: number) =>
  line(v(6272.73, top), v(6272.73, bottom), v(6612.73, bottom), v(6612.73, top));

/** Krabička s textem uprostřed (MK, EZS, T, EV, PIR). */
function box(x0: number, y0: number, x1: number, y1: number, t: string, size: number): SymbolShape[] {
  return [rect(x0, y0, x1, y1), text(v((x0 + x1) / 2, (y0 + y1) / 2), t, size)];
}

export const WALL_GLYPHS: Record<string, Glyph> = {
  socket: g(5726.02, [
    stem(5726.02, 5556.02),
    line(v(6272.73, 5556.02), v(6612.73, 5556.02)),
    arc(v(X, 5386.02), 170, 180, 360),
  ]),
  outlet1f: g(6246.02, [
    stem(6246.02, 6076.02),
    line(v(X, 6076.02), v(6612.73, 5906.02)),
    line(v(X, 6076.02), v(6272.73, 5906.02)),
  ]),
  outlet3f: g(6766.02, [
    stem(6766.02, 6426.02),
    line(v(X, 6596.02), v(6612.73, 6426.02)),
    line(v(X, 6596.02), v(6272.73, 6426.02)),
  ]),
  wallbox: g(7755.02, box(6272.73, 7517.02, 6612.73, 7755.02, 'EV', 115.6)),
  fan: g(8275.02, [
    rect(6238.73, 8037.02, 6646.73, 8275.02),
    circle(v(6374.73, 8156.02), 61.2),
    circle(v(6510.73, 8156.02), 61.2),
  ]),
  switch1: g(9345.97, [
    circle(v(6346.58, 9242.92), 103.05),
    line(v(6398.13, 9153.72), v(6552.63, 8886.02), v(6641.93, 8937.52)),
  ]),
  switch6: g(9866.02, [
    circle(v(X, 9636.02), 66.4),
    line(v(6475.93, 9578.52), v(6575.53, 9406.02), v(6633.03, 9439.22)),
    line(v(6409.53, 9693.52), v(6309.93, 9866.02), v(6252.43, 9832.82)),
  ]),
  switch5: g(10335.22, [
    circle(v(X, 10254.92), 80.3),
    line(v(6482.83, 10185.42), v(6603.23, 9976.92), v(6672.73, 10017.02)),
    line(v(6402.63, 10185.42), v(6282.23, 9976.92), v(6212.73, 10017.02)),
  ]),
  dimmer: g(10905.97, [
    circle(v(6339.68, 10802.92), 103.05),
    line(v(6391.23, 10713.72), v(6545.73, 10446.02)),
    poly(v(6271.03, 10596.92), v(6648.83, 10596.92), v(6648.83, 10493.82)),
  ]),
  data: g(15446.02, [
    stem(15446.02, 15276.02),
    cup(15106.02, 15276.02),
    rect(6397.43, 15106.02, 6488.03, 15219.32),
  ]),
  tv: g(17446.02, [
    stem(17446.02, 17276.02),
    cup(17106.02, 17276.02),
    line(v(6329.43, 17106.02), v(6329.43, 17219.32), v(6556.03, 17219.32), v(6556.03, 17106.02)),
  ]),
  videophone: g(17915.02, [rect(6272.73, 17677.02, 6612.73, 17915.02), circle(v(X, 17796.03), 51)]),
  blind: g(18926.03, [
    rect(6272.73, 18586.03, 6612.73, 18926.03),
    line(v(X, 18926.03), v(X, 18586.03)),
    line(v(6272.73, 18756.03), v(6357.73, 18926.03), v(X, 18756.03)),
    line(v(X, 18756.03), v(6527.73, 18586.03), v(6612.73, 18756.03)),
  ]),
  contact: g(20858.01, box(6306.73, 20654.02, 6578.73, 20858.01, 'MK', 102)),
  pir: g(20858.01, box(6306.73, 20654.02, 6578.73, 20858.01, 'PIR', 80)),
  siren: g(21412.02, [
    poly(
      v(6391.73, 21412.02),
      v(6493.73, 21412.02),
      v(6493.73, 21310.02),
      v(6595.73, 21140.02),
      v(6289.73, 21140.02),
      v(6391.73, 21310.02),
    ),
  ]),
  keypad: g(21932.02, [
    rect(6306.73, 21660.02, 6578.73, 21932.02),
    ...dot(6391.73, 21847.02),
    ...dot(6493.73, 21847.02),
    ...dot(6391.73, 21745.02),
    ...dot(6493.73, 21745.02),
  ]),
  'alarm-panel': g(22452.02, box(6238.73, 22180.02, 6646.73, 22452.02, 'EZS', 115.6)),
  'camera-wall': g(23509.02, [
    rect(6340.73, 23339.02, 6544.73, 23509.02),
    line(v(6391.73, 23339.02), v(6323.73, 23203.02)),
    line(v(6493.73, 23339.02), v(6561.73, 23203.02)),
  ]),
  bell: g(24469.02, [
    stem(24469.02, 24353.42),
    arc(v(X, 24299.02), 136, 0, 180),
    line(v(6306.73, 24299.02), v(6578.73, 24299.02)),
    ...dot(X, 24333.02),
  ]),
  thermostat: g(24972.02, box(6306.73, 24700.02, 6578.73, 24972.02, 'T', 153)),
  'lamp-outdoor': g(13945.02, [
    circle(v(6480.13, 13796.02), 136),
    arc(v(6480.13, 13796.02), 210.8, 135, 225),
    line(v(6383.93, 13892.22), v(6576.33, 13699.82)),
    line(v(6383.93, 13699.82), v(6576.33, 13892.22)),
  ]),
  /** Není v legendě: přisazené svítidlo legendy na držáku u stěny. */
  'lamp-wall': g(11912.02, [
    line(v(6342.73, 11912.02), v(6542.73, 11912.02)),
    stem(11912.02, 11852.02),
    circle(v(X, 11716.02), 136),
    line(v(6346.53, 11812.22), v(6538.93, 11619.82)),
    line(v(6346.53, 11619.82), v(6538.93, 11812.22)),
  ]),
};
