// Migrace projektu 25 → 26 (lišta 3D okna podle Arditu): 3D pohledy dostanou projekci, režim zobrazení,
// slunce, rovinu řezu a mřížku s výchozími hodnotami (perspektiva, materiály, bez stínů, bez řezu).
import { VIEW3D_LOOK } from './types.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function projectV25toV26(data: Obj): Obj {
  const views = isObj(data['views3d']) ? data['views3d'] : {};
  const views3d = Object.fromEntries(
    Object.entries(views).map(([id, v]) => [id, isObj(v) ? { ...VIEW3D_LOOK, ...v } : v]),
  );
  return { ...data, views3d };
}
