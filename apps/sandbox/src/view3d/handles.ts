// Tažení úchytů ve 3D okně: ořezový kvádr (stěna po své ose) a rovina řezu (po svém směru). Zachycuje se
// dřív než OrbitControls, takže tažení úchytu kameru neotáčí. Během tažení se mění jen pomůcka, po puštění
// jde nová hodnota příkazem (onBoxChange / onCutChange).
import type { Viewer } from './viewer.ts';

/** Tažení myší od `e`: posun v px do `move`, po puštění `up`. */
function dragFrom(e: PointerEvent, move: (dx: number, dy: number) => void, up: () => void) {
  e.stopImmediatePropagation();
  e.preventDefault();
  const onMove = (m: PointerEvent) => move(m.clientX - e.clientX, m.clientY - e.clientY);
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    up();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

export function installHandles(v: Viewer): () => void {
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || v.walk.active) return;
    const r = v.canvas.getBoundingClientRect();
    const cut = v.cut.value;
    const h = v.cut.handle;
    if (cut && h && v.ray(e.offsetX, e.offsetY).intersectObject(h).length) {
      let next = cut;
      const move = (dx: number, dy: number) => {
        next = v.cut.dragged(cut, dx, dy, v.camera, r.width, r.height);
        v.setCut(next, true);
      };
      return dragFrom(e, move, () => v.onCutChange(next));
    }
    const start = v.gizmo.value;
    const handle = start ? v.handleAt(e.offsetX, e.offsetY) : null;
    if (!handle || !start) return;
    let box = start;
    const move = (dx: number, dy: number) => {
      box = v.gizmo.dragged(start, handle, dx, dy, v.camera, r.width, r.height);
      v.setBox(box);
    };
    dragFrom(e, move, () => v.onBoxChange(box));
  };
  v.canvas.addEventListener('pointerdown', onDown, { capture: true });
  return () => v.canvas.removeEventListener('pointerdown', onDown, { capture: true });
}
