// Dělítko mezi dvěma okny výkresu vedle sebe (koncepce rozhraní, část 2 E): tažením mění podíl oken,
// dvojklik je vrátí na půlky. Volba obrazovky, ne data modelu, proto nejde přes příkaz.
import { useState } from 'preact/hooks';
import { SPLIT_DEFAULT, setWindowSplit } from '../panel-sizes.ts';

export function WindowSplitter() {
  const [dragging, setDragging] = useState(false);
  const onDown = (e: PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const box = el.parentElement?.getBoundingClientRect();
    if (!box) return;
    el.setPointerCapture(e.pointerId);
    setDragging(true);
    const move = (ev: PointerEvent) => setWindowSplit((ev.clientX - box.left) / box.width);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      setDragging(false);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    e.preventDefault();
  };
  return (
    <div
      class={dragging ? 'splitter dragging' : 'splitter'}
      role="separator"
      aria-orientation="vertical"
      title="Tažením změníte poměr oken, dvojklikem je vrátíte na půlky"
      data-testid="splitter-windows"
      onPointerDown={onDown}
      onDblClick={() => setWindowSplit(SPLIT_DEFAULT)}
    />
  );
}
