// Tažení v okně priorit událostmi ukazatele (HTML5 drag & drop se v plátně aplikace nespouští spolehlivě):
// po puštění tlačítka se najde úroveň pod kurzorem (data-level-id).
export interface Drag {
  readonly kind: 'level' | 'material';
  readonly id: string;
}

export type OnDrop = (d: Drag, levelId: string) => void;

export function startDrag(e: PointerEvent, d: Drag, onDrop: OnDrop) {
  if (e.button !== 0) return;
  e.preventDefault();
  document.body.classList.add('jp-dragging');
  const up = (u: PointerEvent) => {
    window.removeEventListener('pointerup', up);
    document.body.classList.remove('jp-dragging');
    const el = document.elementFromPoint(u.clientX, u.clientY)?.closest<HTMLElement>('[data-level-id]');
    const id = el?.dataset['levelId'];
    if (id) onDrop(d, id);
  };
  window.addEventListener('pointerup', up);
}
