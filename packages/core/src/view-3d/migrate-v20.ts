// Migrace projektu 20 → 21 (požadavek 3D náhledu): průhlednost povrchu v grafice (balíček zobrazení 7 → 8)
// a 3D pohledy – projekt dostane jeden výchozí „3D“ se stylem prvního pohledu (jako {3D} v Revitu).
import { displayV7toV8 } from '../style/migrate-v7.ts';
import { newView3d } from './types.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function projectV20toV21(data: Obj): Obj {
  const display = isObj(data['display']) ? data['display'] : {};
  const views = isObj(data['views']) ? Object.values(data['views']) : [];
  const first = views.find(isObj);
  const styleId = typeof first?.['styleId'] === 'string' ? first['styleId'] : '';
  const views3d = isObj(data['views3d'])
    ? data['views3d']
    : { 'view3d-default': newView3d('view3d-default', '3D', styleId) };
  return { ...data, display: { ...displayV7toV8(display), schemaVersion: 8 }, views3d };
}
