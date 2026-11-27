// Testovací scéna Elektro, krok 1 (2026-11-27): tabulka všech typů značek z knihovny a místnost
// s prvky na stěnách a stropě (zásuvky, nad linkou +1150, rámeček se 4 sloty, spínače, svítidla, RH).
import { ELECTRO_LIBRARY } from '../electro/library.ts';
import { vec } from '../geometry/index.ts';
import { rect } from './scene-helpers.ts';
import { electroView, onCeiling, onWall } from './electro-sample.ts';
import type { Sample, SampleContext } from './types.ts';

const COLS = 4;

/** Tabulka typů pod místností: značka a vpravo od ní název typu (jako označení). */
function table(c: SampleContext) {
  ELECTRO_LIBRARY.forEach((item, i) => {
    const p = vec((i % COLS) * 4200, -2500 - Math.floor(i / COLS) * 1300);
    onCeiling(c, item.key, p, { mark: item.name });
  });
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
      'červeně, spínače a svítidla oranžově, data modře, TV fialově, zabezpečení tyrkysově). Dole tabulka všech ' +
      '44 typů z knihovny (ČSN EN 60617) s názvy. V místnosti: dvojzásuvky nad linkou (výška se nepíše – je ' +
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
