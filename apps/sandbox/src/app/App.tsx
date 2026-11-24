import { CORE_NAME } from '@bim-light/core';
import { DrawingCanvas } from '../canvas/DrawingCanvas.tsx';

export function App() {
  return (
    <div class="layout">
      <header class="topbar">
        <h1>BIM-light sandbox</h1>
        <span class="muted" data-testid="core-name">
          {CORE_NAME}
        </span>
      </header>
      <main class="workspace">
        <DrawingCanvas />
      </main>
    </div>
  );
}
