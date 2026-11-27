// Znaky půdorysných značek: tvary opsané z legendy uživatele (Corel SVG, zdroj pravdy 2026-11-27),
// převedené na jednotky velikosti značky (4 mm). Značky na stěnu začínají na líci (y = 0) a míří do
// místnosti, značky na strop mají střed v počátku. Složené přístroje (dvojzásuvka, přepínač + zásuvka)
// jsou sloty vedle sebe ze znaků legendy.
import { CENTER_GLYPHS } from './glyphs-center.ts';
import { WALL_GLYPHS } from './glyphs-wall.ts';
import type { Glyph } from './glyph-shapes.ts';

export const GLYPHS: Readonly<Record<string, Glyph>> = { ...WALL_GLYPHS, ...CENTER_GLYPHS };

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
