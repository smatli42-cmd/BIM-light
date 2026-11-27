// Dělítko mezi panelem a oknem výkresu: tažením mění šířku panelu, dvojklik vrátí výchozí šířku.
// Šířka je volba obrazovky, ne data modelu, proto nejde přes příkaz.
import { useState } from 'preact/hooks';
import { uiK } from '../../session/ui-scale.ts';
import { PANEL_DEFAULT, setPanelWidth, type PanelName } from '../panel-sizes.ts';

/** `dir` 1 = panel vlevo od dělítka (tažení doprava ho rozšíří), −1 = panel vpravo. */
export function Splitter({ panel, dir }: { panel: PanelName; dir: 1 | -1 }) {
  const [dragging, setDragging] = useState(false);
  const onDown = (e: PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const target = dir === 1 ? el.previousElementSibling : el.nextElementSibling;
    // Šířka panelu se ukládá při původní velikosti rozhraní (panel-sizes.ts), proto dělení násobkem.
    const k = uiK();
    const start = target ? target.getBoundingClientRect().width / k : PANEL_DEFAULT[panel];
    const x0 = e.clientX;
    el.setPointerCapture(e.pointerId);
    setDragging(true);
    const move = (ev: PointerEvent) => setPanelWidth(panel, start + (dir * (ev.clientX - x0)) / k);
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
      title="Tažením změníte šířku panelu, dvojklikem vrátíte výchozí"
      data-testid={`splitter-${panel}`}
      onPointerDown={onDown}
      onDblClick={() => setPanelWidth(panel, PANEL_DEFAULT[panel])}
    />
  );
}
