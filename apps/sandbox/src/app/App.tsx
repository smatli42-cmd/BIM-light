// Okno aplikace v rozložení podle koncepce rozhraní (část 2): A horní lišta, B lišta příkazů,
// C paleta nástrojů, D info box, E okno pohledu, F Obsah + F' lišta sekcí, G spodní lišta.
import { useMemo } from 'preact/hooks';
import { Controller } from '../interaction/controller.ts';
import { Session } from '../session/session.ts';
import { AppBar } from '../ui/layout/AppBar.tsx';
import { BottomBar } from '../ui/layout/BottomBar.tsx';
import { CommandBar } from '../ui/layout/CommandBar.tsx';
import { ContentPanel } from '../ui/layout/ContentPanel.tsx';
import { InfoBox } from '../ui/layout/InfoBox.tsx';
import { ToolPalette } from '../ui/layout/ToolPalette.tsx';
import { ViewWindow } from '../ui/layout/ViewWindow.tsx';
import { applyTheme } from '../ui/theme.ts';
import { useSession } from '../ui/use-session.ts';
import { installTestHook } from './test-hook.ts';

/** Okna pohledů vedle sebe (koncepce rozhraní, část 2 E). */
function Windows({ s, controller }: { s: Session; controller: Controller }) {
  useSession(s);
  return (
    <div class="windows">
      {s.windows.map((_, i) => (
        <ViewWindow key={i} s={s} controller={controller} index={i} />
      ))}
    </div>
  );
}

export function App() {
  const { session, controller } = useMemo(() => {
    const s = new Session();
    applyTheme(s.theme);
    installTestHook(s);
    return { session: s, controller: new Controller(s) };
  }, []);
  return (
    <div class="app">
      <AppBar s={session} />
      <CommandBar s={session} />
      <div class="main">
        <ToolPalette s={session} />
        <InfoBox s={session} />
        <Windows s={session} controller={controller} />
        <ContentPanel s={session} />
      </div>
      <BottomBar s={session} />
    </div>
  );
}
