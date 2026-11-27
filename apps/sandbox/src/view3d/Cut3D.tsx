// Řez ve 3D (jako Řez v Arditu): rovina ořízne model, zůstane část ve směru pohledu, řezné plochy se
// nevyplňují. Zatím ruční rovina – svislá podle pohledu (přes střed obsahu, kolmo na směr kamery), nebo
// vodorovná 1,2 m nad aktivním podlažím (půdorysný řez); Řez A / B přijdou s řezy. Úchyt roviny se táhne.
import type { CutPlane3d } from '@bim-light/core';
import { Vector3 } from 'three';
import type { Session } from '../session/session.ts';
import { active3d } from './state.ts';
import type { Viewer } from './viewer.ts';

/** Výška vodorovného řezu nad podlažím (mm) – jako rovina řezu půdorysu. */
const PLAN_CUT = 1200;

type CutKind = 'none' | 'vertical' | 'horizontal';

const kindOf = (p: CutPlane3d | null): CutKind =>
  !p ? 'none' : Math.abs(p.normal.z) > 0.99 ? 'horizontal' : 'vertical';

/** Rovina řezu daného druhu pro aktuální pohled kamery a obsah scény. */
export function cutPlaneFor(s: Session, viewer: Viewer, kind: CutKind): CutPlane3d | null {
  if (kind === 'none') return null;
  const b = viewer.bounds();
  const c = b.isEmpty() ? new Vector3() : b.getCenter(new Vector3());
  const mm = (v: number) => Math.round(v * 1000);
  if (kind === 'horizontal') {
    const floor = s.model.storeys[s.storeyId]?.elevation ?? 0;
    return { origin: { x: mm(c.x), y: mm(c.y), z: floor + PLAN_CUT }, normal: { x: 0, y: 0, z: -1 } };
  }
  const d = viewer.rig.horizontalDir();
  const r = (v: number) => Math.round(v * 1e6) / 1e6;
  return { origin: { x: mm(c.x), y: mm(c.y), z: mm(c.z) }, normal: { x: r(d.x), y: r(d.y), z: 0 } };
}

export function CutControls({ s, viewer }: { s: Session; viewer: Viewer | null }) {
  const v = active3d(s);
  const kind = kindOf(v.cutPlane);
  const set = (k: CutKind) => {
    if (!viewer) return;
    s.run('view3d.setCutPlane', { viewId: v.id, plane: cutPlaneFor(s, viewer, k) });
  };
  return (
    <>
      <button
        class={kind === 'none' ? 'tb3-text' : 'tb3-text active'}
        data-testid="view3d-cut"
        aria-pressed={kind !== 'none'}
        title="Řez ve 3D – rovina ořízne model, zůstane část ve směru pohledu; úchytem se posouvá"
        onClick={() => set(kind === 'none' ? 'vertical' : 'none')}
      >
        Řez
      </button>
      <select
        data-testid="view3d-cut-kind"
        title="Rovina řezu ve 3D"
        value={kind}
        onChange={(e) => set(e.currentTarget.value as CutKind)}
      >
        <option value="none">Bez 3D řezu</option>
        <option value="vertical">Svislý podle pohledu</option>
        <option value="horizontal">Vodorovný (nad podlažím)</option>
        <option value="sections" disabled>
          Řez A / B (přijde s řezy)
        </option>
      </select>
    </>
  );
}
