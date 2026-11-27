// A – horní lišta aplikace (koncepce rozhraní, část 2): název, projekt, sady zobrazení (styl aktivního
// okna), Zpět / Znovu, export IFC, motiv a podklad výkresu.
import { CORE_NAME } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { isUiSize, UI_SIZES } from '../../session/ui-scale.ts';
import { ExportIfc } from '../ExportIfc.tsx';
import { IconButton } from '../icons/Icon.tsx';
import { useState } from 'preact/hooks';
import { LessonsDialog } from '../lessons/LessonsDialog.tsx';
import { SamplesDialog } from '../samples/SamplesDialog.tsx';
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
      <select
        class="ui-size"
        data-testid="ui-size"
        aria-label="Velikost rozhraní"
        title="Velikost rozhraní (písmo, ikony, panely; výkres se nemění)"
        value={s.uiSize}
        onChange={(e) => {
          const v = e.currentTarget.value;
          if (isUiSize(v)) s.setLook({ size: v });
        }}
      >
        {UI_SIZES.map((o) => (
          <option key={o.id} value={o.id}>
            {`Aa ${o.label}`}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Ukázkový projekt a testovací scény (pokyn uživatele 2026-11-26). */
function SamplesButton({ s }: { s: Session }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        data-testid="samples-open"
        title="Ukázkový projekt a testovací scény"
        onClick={() => setOpen(true)}
      >
        Ukázky
      </button>
      {open && <SamplesDialog s={s} onClose={() => setOpen(false)} />}
    </>
  );
}

export function AppBar({ s }: { s: Session }) {
  useSession(s);
  const [lessons, setLessons] = useState(false);
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
      <SamplesButton s={s} />
      <ExportIfc s={s} />
      <a class="muted" href="#galerie" title="Galerie napojení stěn (pro vývoj)">
        Galerie napojení
      </a>
      <IconButton icon="help" label="Průvodní lekce" testid="lessons-open" onClick={() => setLessons(true)} />
      {lessons && <LessonsDialog s={s} onClose={() => setLessons(false)} />}
      <LookToggles s={s} />
    </header>
  );
}
