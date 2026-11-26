// Dotaz pro AI a panel Kontrola (plán stěn Z10): varování modelu – překrývající se stěny, nenapojené
// konce u jiné stěny, příliš krátké stěny. Nic nemění; varují, nebrání.
import { checkWalls, DEFAULT_MIN_LENGTH, type CheckIssue } from '../check/walls.ts';
import { S } from '../commands/schema.ts';
import type { Id } from '../ids/index.ts';
import { defineQuery } from './types.ts';

export const modelCheck = defineQuery<{ storeyId?: Id; minLength?: number }, CheckIssue[]>({
  name: 'model.check',
  label: 'Kontrola modelu',
  description:
    'Varování modelu: overlap (překrývající se stěny), unconnected (konec stěny u jiné stěny, ale nenapojený), ' +
    `short (stěna kratší než minLength, výchozí ${DEFAULT_MIN_LENGTH} mm). Každé má stěny, místo (mm) a text. ` +
    'Volitelně jen podlaží storeyId.',
  group: 'Kontrola',
  params: S.object({ storeyId: S.id, minLength: S.number('mez krátké stěny (mm)', { minimum: 0 }) }, []),
  run: (m, p) => checkWalls(m, p),
});
