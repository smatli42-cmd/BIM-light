// Okno aplikace v rozložení podle koncepce rozhraní (část 2): A horní lišta, B lišta příkazů,
// C paleta nástrojů, D info box, E okno pohledu, F Obsah + F' lišta sekcí, G spodní lišta.
import { Fragment } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import { zoomTo } from '../interaction/keyboard.ts';
import { Controller } from '../interaction/controller.ts';
import { Session } from '../session/session.ts';
import { AppBar } from '../ui/layout/AppBar.tsx';
import { BottomBar } from '../ui/layout/BottomBar.tsx';
import { CommandBar } from '../ui/layout/CommandBar.tsx';
import { ContentPanel } from '../ui/layout/ContentPanel.tsx';
import { InfoBox } from '../ui/layout/InfoBox.tsx';
import { ToolPalette } from '../ui/layout/ToolPalette.tsx';
import { Splitter } from '../ui/layout/Splitter.tsx';
import { ViewWindow } from '../ui/layout/ViewWindow.tsx';
import { LessonGuide } from '../ui/lessons/LessonGuide.tsx';
import { WindowSplitter } from '../ui/layout/WindowSplitter.tsx';
import { applyPanelSizes, applyWindowSplit } from '../ui/panel-sizes.ts';
import { applyTheme } from '../ui/theme.ts';
import { useSession } from '../ui/use-session.ts';
import { installTestHook } from './test-hook.ts';
import { sampleFromUrl } from '../ui/samples/open.ts';

/** Okna pohledů vedle sebe (koncepce rozhraní, část 2 E). */
function Windows({ s, controller }: { s: Session; controller: Controller }) {
  useSession(s);
  return (
    <div class="windows">
      {s.windows.map((_, i) => (
        <Fragment key={i}>
          {i > 0 && <WindowSplitter />}
          <ViewWindow s={s} controller={controller} index={i} />
        </Fragment>
      ))}
    </div>
  );
}

export function App() {
  const { session, controller, sample } = useMemo(() => {
    const model = sampleFromUrl(window.location.search);
    const s = new Session(model);
    applyTheme(s.theme);
    applyPanelSizes();
    applyWindowSplit();
    installTestHook(s);
    return { session: s, controller: new Controller(s), sample: !!model };
  }, []);
  // Ukázka se otevře přiblížená na celý výkres (jako Home), až okno zná svou velikost.
  useEffect(() => {
    if (!sample) return;
    requestAnimationFrame(() => {
      zoomTo(session, false);
      session.changed();
    });
  }, []);
  return (
    <div class="app">
      <AppBar s={session} />
      <CommandBar s={session} />
      <div class="main">
        <ToolPalette s={session} />
        <InfoBox s={session} />
        <Splitter panel="infobox" dir={1} />
        <Windows s={session} controller={controller} />
        <ContentPanel s={session} />
      </div>
      <BottomBar s={session} />
      <LessonGuide s={session} />
    </div>
  );
}
