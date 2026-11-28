// Testovací scéna pohledů 1–4 (pokyn uživatele 2026-11-28, Obsah podle Arditu): dům do L se střechou
// a okny, bez pohledů – uživatel je přidá v Obsahu. Jen příkazy z registru (stejná cesta jako AI).
import { vec } from '../geometry/index.ts';
import type { Sample } from './types.ts';

const L = [vec(0, 0), vec(12000, 0), vec(12000, 6000), vec(6000, 6000), vec(6000, 10000), vec(0, 10000)];

export const ELEVATION_SCENES: readonly Sample[] = [
  {
    key: 'pohledy',
    title: 'Pohledy 1–4 kolem budovy z Obsahu',
    kind: 'scena',
    date: '2026-11-28',
    description:
      'Dům do L s okny a valbovou střechou, zatím bez pohledů. Zkus: Obsah → Projekt → Pohledy → tlačítko + ' +
      '(„Přidat pohledy 1–4 kolem budovy“) – přibudou 1 Pohled jižní, 2 východní, 3 severní, 4 západní; klik ' +
      'otevře pohled v okně, dvojklik na název ho přejmenuje (Enter potvrdí, Esc zruší). Pak prodluž dům ' +
      '(posuň stěnu) a klikni na ⟳ – pohledy se přepočítají podle nového obrysu, nezdvojí se a nechají si ' +
      'název. Jeden pohled ručně: nástroj Řez → Geometrická metoda Pohled (třetí tlačítko), dva kliky a klik ' +
      'na stranu, kam se dívá – přibude „5 Pohled …“.',
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
