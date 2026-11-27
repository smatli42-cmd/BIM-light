// Elektro v ukázkovém domě (1.NP): zásuvky, spínače, rámeček TV, kuchyň nad linkou, svítidla, hlásič,
// Wi-Fi a rozvaděč RH. Prvky jsou na stěnách (jdou s nimi) a na stropě; vidět ve stylu Elektro.
import { vec } from '../geometry/index.ts';
import { onCeiling, onWall } from './electro-sample.ts';
import type { SampleContext } from './types.ts';

export function houseElectro(c: SampleContext) {
  // Obývací pokoj
  onWall(c, 'socket2', vec(700, 1000), { mark: 'Z1' });
  onWall(c, 'socket', vec(700, 3500), { mark: 'Z1, D1, T1', slots: ['socket', 'socket', 'data', 'tv'] });
  onWall(c, 'socket-data', vec(5500, 700), { mark: 'Z1, D1' });
  onWall(c, 'switch6', vec(2100, 4800), { mark: 'S6a' });
  onCeiling(c, 'lamp', vec(3000, 3000), { mark: 'S6a' });
  onCeiling(c, 'smoke', vec(5500, 3500));
  onCeiling(c, 'wifi', vec(1500, 4300));
  // Pokoj: rozvaděč na příčce do haly, zásuvka, svítidlo
  onWall(c, 'board-main', vec(2300, 5300), { mark: 'RH' });
  onWall(c, 'socket2', vec(700, 7500), { mark: 'Z4' });
  onCeiling(c, 'lamp', vec(1700, 7000), { mark: 'S1' });
  // Kuchyně: nad linkou na obvodové stěně, vývod pro desku, spínač u dveří
  onWall(c, 'socket2-1150', vec(4300, 8300), { mark: 'Z2' });
  onWall(c, 'socket2-1150', vec(6300, 8300), { mark: 'Z2' });
  onWall(c, 'outlet3f', vec(5300, 8300), { mark: 'Z3' });
  onWall(c, 'switch1', vec(3800, 5300), { mark: 'S1' });
  onCeiling(c, 'lamp-pendant', vec(5200, 7000), { mark: 'S1' });
  // Ložnice a koupelna
  onWall(c, 'socket2', vec(11300, 1500), { mark: 'Z5' });
  onWall(c, 'socket2', vec(11300, 3500), { mark: 'Z5' });
  onCeiling(c, 'lamp-surface', vec(9500, 2500), { mark: 'S1' });
  onWall(c, 'fan', vec(11300, 8300));
  onWall(c, 'socket', vec(7400, 7500), { mark: 'Z6', height: 1200 });
  onCeiling(c, 'lamp', vec(9500, 7500), { mark: 'S1' });
}
