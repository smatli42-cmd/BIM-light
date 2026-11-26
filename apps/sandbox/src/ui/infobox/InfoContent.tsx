// Obsah info boxu podle situace (koncepce rozhraní, část 2 D): příkaz nad výběrem → jeho volby;
// výběr → vlastnosti vybraných prvků; nástroj Stěna → výchozí nastavení nových stěn; Otvor → rozměry
// nového otvoru; Výběr bez výběru → metoda výběru.
import type { Wall } from '@bim-light/core';
import { WALL_TOOLS } from '../../interaction/tools/wall-method.ts';
import type { ToolId } from '../../interaction/types.ts';
import type { Session } from '../../session/session.ts';
import { OpeningPanel } from '../OpeningPanel.tsx';
import { CommandOptions, SelectOptions } from './ToolOptions.tsx';
import { TagAllSection } from './WallTags.tsx';
import { ModelCheckSection } from './ModelCheck.tsx';
import { NewWallInfo, SelectedWallsInfo } from './WallInfo.tsx';

const COMMANDS: readonly ToolId[] = ['move', 'copy', 'rotate', 'mirror', 'array', 'align', 'trim', 'split'];

function Selection({ s }: { s: Session }) {
  const walls = s.selection.walls.map((id) => s.model.elements[id]).filter((w): w is Wall => !!w);
  const dims = s.selection.dims.length;
  return (
    <>
      {walls.length > 0 && <SelectedWallsInfo key={walls.map((w) => w.id).join()} s={s} walls={walls} />}
      <OpeningPanel s={s} />
      {dims > 0 && (
        <section>
          <h2 data-testid="sel-dims">Vybrané kóty ({dims})</h2>
          <button onClick={() => s.run('selection.delete', { dimensionIds: s.selection.dims })}>
            Smazat <kbd>Del</kbd>
          </button>
        </section>
      )}
    </>
  );
}

export function InfoContent({ s }: { s: Session }) {
  const id = s.tool.id;
  const { walls, openings, dims } = s.selection;
  const any = walls.length + openings.length + dims.length > 0;
  if (COMMANDS.includes(id)) return <CommandOptions s={s} />;
  if (id === 'opening') return <OpeningPanel s={s} />;
  if (any) return <Selection s={s} />;
  if (WALL_TOOLS.includes(id)) return <NewWallInfo s={s} />;
  return (
    <>
      <SelectOptions s={s} />
      <TagAllSection s={s} />
      <ModelCheckSection s={s} />
    </>
  );
}
