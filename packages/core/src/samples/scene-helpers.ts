// Pomůcky receptů testovacích scén (obdélník stěn).
import { vec } from '../geometry/index.ts';
import type { SampleContext } from './types.ts';

export const rect = (c: SampleContext, type: string, w: number, h: number, status = 'new') =>
  c.run('wall.rectangle', { storeyId: c.storeyId, typeId: c.type(type), a: vec(0, 0), b: vec(w, h), status });
