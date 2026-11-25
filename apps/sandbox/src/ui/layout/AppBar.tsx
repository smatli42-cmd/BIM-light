// A – horní lišta aplikace (koncepce rozhraní, část 2): název, projekt, sady zobrazení (styl aktivního
// okna), Zpět / Znovu, export IFC, motiv a podklad výkresu.
import { CORE_NAME } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { ExportIfc } from '../ExportIfc.tsx';
import { IconButton } from '../icons/Icon.tsx';
import { useSession } from '../use-session.ts';
import { StyleSwitch } from '../ViewControls.tsx';

/** Motiv rozhraní a podklad výkresu (koncepce rozhraní, část 5). */
function LookToggles({ s }: { s: Session }) {
  const dark = s.theme === 'dark';
  return (
    <div class="tool-group">
      <IconButton
        icon="paper"
        label={s.paper === 'dark' ? 'Podklad výkresu: tmavý' : 'Podklad výkresu: papír'}
        description="Přepne podklad výkresu (papír / tmavý). Tisk a export mají vždy původní barvy."
        testid="paper-toggle"
        pressed={s.paper === 'dark'}
        onClick={() => s.setLook({ paper: s.paper === 'dark' ? 'light' : 'dark' })}
      />
      <IconButton
        icon={dark ? 'sun' : 'moon'}
        label={dark ? 'Světlý motiv' : 'Tmavý motiv'}
        description="Přepne motiv rozhraní; podklad výkresu jde s ním (lze změnit vedle)."
        testid="theme-toggle"
        onClick={() => s.setLook({ theme: dark ? 'light' : 'dark', paper: dark ? 'light' : 'dark' })}
      />
    </div>
  );
}

export function AppBar({ s }: { s: Session }) {
  useSession(s);
  return (
    <header class="appbar" data-testid="appbar">
      <span class="brand">BIM-light</span>
      <span class="project" title="Projekt">
        {s.model.project.name}
      </span>
      <span class="muted" data-testid="core-name">
        {CORE_NAME}
      </span>
      <StyleSwitch s={s} />
      <span class="spacer" />
      <div class="tool-group">
        <IconButton
          icon="undo"
          label="Zpět"
          shortcut="Ctrl+Z"
          testid="undo"
          disabled={!s.editor.canUndo}
          onClick={() => s.editor.undo()}
        />
        <IconButton
          icon="redo"
          label="Znovu"
          shortcut="Ctrl+Y"
          testid="redo"
          disabled={!s.editor.canRedo}
          onClick={() => s.editor.redo()}
        />
      </div>
      <ExportIfc s={s} />
      <a class="muted" href="#galerie" title="Galerie napojení stěn (pro vývoj)">
        Galerie napojení
      </a>
      <LookToggles s={s} />
    </header>
  );
}
