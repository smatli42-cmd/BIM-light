// Dotaz na kóty pro AI: druh, odkazy na stěny, skutečná hodnota, zámek a přepsaný text.
import { S } from '../commands/schema.ts';
import { measureDimension } from '../dimension/measure.ts';
import { defineQuery } from './types.ts';

export const dimensionList = defineQuery<{ storeyId?: string }, unknown>({
  name: 'dimension.list',
  label: 'Seznam kót',
  description:
    'Vrátí kóty (volitelně jen jednoho podlaží): id, druh (linear = vzdálenost rovnoběžných líců / čel, ' +
    'length = délka líce, angular = úhel), odkazy na stěny a líce, skutečnou hodnotu z modelu ' +
    '(mm nebo stupně, zaokrouhleno na 0,1), zámek a zamčenou hodnotu, přepsaný text a skupinu anotací.',
  group: 'Kóta',
  params: S.object({ storeyId: S.id }, []),
  run(m, p) {
    return Object.values(m.dimensions)
      .filter((d) => !p.storeyId || d.storeyId === p.storeyId)
      .map((d) => ({
        id: d.id,
        kind: d.kind,
        storeyId: d.storeyId,
        refs: d.kind === 'linear' ? d.refs : d.kind === 'length' ? [d.ref] : undefined,
        wallIds: d.kind === 'angular' ? d.wallIds : undefined,
        value: Math.round(measureDimension(m, d) * 10) / 10,
        locked: d.locked,
        lockedValue: d.locked ? d.value : undefined,
        text: d.textOverride,
        annotationLayerId: d.annotationLayerId,
      }));
  },
});
