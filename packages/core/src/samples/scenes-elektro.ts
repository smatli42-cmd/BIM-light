// Testovací scéna Elektro, krok 1 (2026-11-27): tabulka všech typů značek z knihovny a místnost
// s prvky na stěnách a stropě (zásuvky, nad linkou +1150, rámeček se 4 sloty, spínače, svítidla, RH).
import { ELECTRO_LIBRARY } from '../electro/library.ts';
import { LEGEND_ROWS } from '../electro/legend-order.ts';
import { vec } from '../geometry/index.ts';
import { rect } from './scene-helpers.ts';
import { electroView, onCeiling, onWall } from './electro-sample.ts';
import type { Sample, SampleContext } from './types.ts';

/** Řádek legendy uživatele = 5,2 mm na papíře; v 1:50 260 mm modelu (značka 4 mm = 200 mm). */
const ROW = 260;
const HALF = 85;

/** Značka do tabulky: na stěnu kotvou dole, na strop středem; popis legendy jako označení vpravo. */
function cell(c: SampleContext, key: string, x: number, y: number, mark: string) {
  const item = ELECTRO_LIBRARY.find((i) => i.key === key);
  const extra: Record<string, unknown> = { mark };
  // Rozvaděč a liniové svítidlo jako v legendě: 4,6 × 2,3 mm a 4,6 mm na papíře.
  if (item?.symbol.kind === 'board') extra['board'] = { width: 230, depth: 115 };
  if (item?.symbol.kind === 'linear') extra['length'] = 230;
  const center = item?.mount === 'ceiling' || item?.symbol.kind !== 'glyphs';
  onCeiling(c, key, vec(x, center ? y + HALF : y), extra);
}

/**
 * Tabulka pod místností v pořadí a skupinách legendy uživatele (vizuální porovnání s legendou z Corelu);
 * typy, které v legendě nejsou, ve druhém sloupci.
 */
function table(c: SampleContext) {
  let y = -2500;
  let group = '';
  for (const [key, text] of LEGEND_ROWS) {
    const g = ELECTRO_LIBRARY.find((i) => i.key === key)?.groupId ?? '';
    if (group && g !== group) y -= ROW;
    group = g;
    cell(c, key, 0, y, text);
    y -= ROW;
  }
  const inLegend = new Set(LEGEND_ROWS.map(([k]) => k));
  ELECTRO_LIBRARY.filter((i) => !inLegend.has(i.key)).forEach((i, n) =>
    cell(c, i.key, 4000, -2500 - n * 2 * ROW, i.name),
  );
}

function room(c: SampleContext) {
  rect(c, 'Zdivo 300', 6000, 4000);
  c.run('room.create', { storeyId: c.storeyId, point: vec(3000, 2000), name: 'Kuchyně a jídelna' });
  onWall(c, 'socket2-1150', vec(1500, 3900), { mark: 'Z1' });
  onWall(c, 'socket2', vec(3000, 3900), { mark: 'Z1', height: 1150 });
  onWall(c, 'outlet3f', vec(2250, 3900), { mark: 'Z3' });
  onWall(c, 'socket', vec(5900, 2000), { mark: 'Z2, D1, T1', slots: ['socket', 'socket', 'data', 'tv'] });
  onWall(c, 'switch6-socket', vec(100, 600), { mark: 'S6a, Z2' });
  onWall(c, 'switch1', vec(5900, 600), { mark: 'S1' });
  onWall(c, 'board-main', vec(1200, 100), { mark: 'RH' });
  onWall(c, 'thermostat', vec(4500, 100), { symbol: { along: 6 } });
  onCeiling(c, 'lamp', vec(2000, 2000), { mark: 'S6a' });
  onCeiling(c, 'lamp-pendant', vec(4300, 2000), { mark: 'S1' });
  onCeiling(c, 'lamp-linear', vec(2250, 3300), { mark: 'S1' });
  onCeiling(c, 'smoke', vec(3150, 1000));
  onCeiling(c, 'wifi', vec(5200, 3300));
}

export const ELECTRO_SCENES: readonly Sample[] = [
  {
    key: 'elektro',
    title: 'Elektro – knihovna značek a prvky na stěnách',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Pohled je ve stylu Elektro (přepínač nahoře): stavba šedě, značky barevně po skupinách (zásuvky ' +
      'červeně, spínače a svítidla oranžově, data a zabezpečení tyrkysově, TV fialově, stínění zeleně). Dole tabulka všech ' +
      '44 typů: vlevo v pořadí a skupinách legendy uživatele (tvary z legendy, k porovnání), vpravo typy mimo legendu. V místnosti: dvojzásuvky nad linkou (výška se nepíše – je ' +
      'výchozí), obyčejná dvojzásuvka zvednutá na +1150 (popisek výšky), rámeček Z2, D1, T1 se 4 sloty, ' +
      'spínače, svítidla, rozvaděč RH ve skutečné velikosti, termostat odsazený s odkazovou čarou. Zkus: ' +
      'přepnout na Studii nebo Projekt (elektro zmizí), měřítko 1:100 (značky stejně velké na papíře), ' +
      'posunout nebo ztlustit stěnu – značky jdou s ní. Vkládání myší přijde v dalším kroku.',
    build(c) {
      electroView(c);
      room(c);
      table(c);
    },
  },
];
