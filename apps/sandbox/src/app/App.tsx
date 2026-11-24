import { CORE_NAME } from '@bim-light/core';
import { useMemo } from 'preact/hooks';
import { DrawingCanvas } from '../canvas/DrawingCanvas.tsx';
import { Controller } from '../interaction/controller.ts';
import { Session } from '../session/session.ts';
import { CanvasOverlays, StatusBar } from '../ui/Overlays.tsx';
import { PropertiesPanel } from '../ui/PropertiesPanel.tsx';
import { Toolbar } from '../ui/Toolbar.tsx';
import { installTestHook } from './test-hook.ts';

export function App() {
  const { session, controller } = useMemo(() => {
    const s = new Session();
    installTestHook(s);
    return { session: s, controller: new Controller(s) };
  }, []);
  return (
    <div class="layout">
      <header class="topbar">
        <h1>BIM-light sandbox</h1>
        <span class="muted" data-testid="core-name">
          {CORE_NAME}
        </span>
      </header>
      <div class="main">
        <Toolbar session={session} />
        <main class="workspace">
          <DrawingCanvas session={session} controller={controller} />
          <CanvasOverlays session={session} />
        </main>
        <PropertiesPanel session={session} />
      </div>
      <StatusBar session={session} />
    </div>
  );
}
