// Testovací scéna pohledů 1–4 (pokyn uživatele 2026-11-28, Obsah podle Arditu): dům do L se střechou
// a okny; pohledy kolem budovy vznikly samy. Jen příkazy z registru (stejná cesta jako AI).
import { vec } from '../geometry/index.ts';
import type { Sample } from './types.ts';

const L = [vec(0, 0), vec(12000, 0), vec(12000, 6000), vec(6000, 6000), vec(6000, 10000), vec(0, 10000)];

export const ELEVATION_SCENES: readonly Sample[] = [
  {
    key: 'pohledy',
    title: 'Pohledy 1–4 kolem budovy – samy',
    kind: 'scena',
    date: '2026-11-28',
    description:
      'Dům do L s okny a valbovou střechou. Pohledy 1 Jižní, 2 Východní, 3 Severní, 4 Západní vznikly ' +
      'samy s první stěnou (Obsah → Projekt: Podlaží, Řezy, Pohledy, 3D, Výkazy). Zkus: klik na „1 Jižní“ ' +
      'ho otevře v okně; dvojklik na název přejmenuje (Enter potvrdí, Esc zruší). Prodluž dům (posuň ' +
      'stěnu) – pohledy jdou samy za obrysem. Smaž pohled (Del v okně / AI) – sám se nevrátí, v Obsahu se ' +
      'objeví ⟳ „Obnovit pohledy kolem budovy“. Jeden pohled navíc: nástroj Řez → Geometrická metoda ' +
      'Pohled (třetí tlačítko), dva kliky a klik na stranu, kam se dívá – přibude „5 Jižní“ apod.',
    build(c) {
      const typeId = c.type('Zdivo 300');
      const [south] = c.run('wall.chain', { storeyId: c.storeyId, typeId, points: L, closed: true });
      if (south) {
        const win = { wallId: south, width: 1500, height: 1500, sill: 900 };
        c.run('opening.create', { ...win, offset: 2000 });
        c.run('opening.create', { ...win, offset: 8000 });
      }
      const roofTypeId = Object.values(c.model.roofTypes)[0]?.id ?? '';
      const roof = { storeyId: c.storeyId, typeId: roofTypeId, outline: L, slope: 35, refOffset: 3000 };
      c.run('roof.create', roof);
    },
  },
];
