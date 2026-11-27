// Obsah info boxu podle situace (koncepce rozhraní, část 2 D): příkaz nad výběrem → jeho volby;
// výběr → vlastnosti vybraných prvků; nástroj Stěna → výchozí nastavení nových stěn; Otvor → rozměry
// nového otvoru; Deska → výchozí nastavení nové desky; Výběr bez výběru → metoda výběru.
import { findSlab, findWall, type Slab, type Wall } from '@bim-light/core';
import { WALL_TOOLS } from '../../interaction/tools/wall-method.ts';
import type { ToolId } from '../../interaction/types.ts';
import type { Session } from '../../session/session.ts';
import { OpeningPanel } from '../OpeningPanel.tsx';
import { CommandOptions, DimensionOptions, SelectOptions } from './ToolOptions.tsx';
import { TagAllSection } from './WallTags.tsx';
import { ModelCheckSection } from './ModelCheck.tsx';
import { NewWallInfo, SelectedWallsInfo } from './WallInfo.tsx';
import { NewSlabInfo, SelectedSlabsInfo } from './SlabInfo.tsx';
import { SelectedSlabOpenings } from './SlabOpeningInfo.tsx';
import { NewRoomPanel, SelectedRoomsInfo } from './RoomInfo.tsx';
import { NewSectionInfo, SelectedSectionsInfo } from './SectionInfo.tsx';
import { NewLevelDimInfo, SelectedLevelDimsInfo } from './LevelDimInfo.tsx';

const COMMANDS: readonly ToolId[] = ['move', 'copy', 'rotate', 'mirror', 'array', 'align', 'trim', 'split'];

function Selection({ s }: { s: Session }) {
  const walls = s.selection.walls.map((id) => findWall(s.model, id)).filter((w): w is Wall => !!w);
  const slabs = s.selection.slabs.map((id) => findSlab(s.model, id)).filter((x): x is Slab => !!x);
  const dims = s.selection.dims.length;
  return (
    <>
      {walls.length > 0 && <SelectedWallsInfo key={walls.map((w) => w.id).join()} s={s} walls={walls} />}
      <OpeningPanel s={s} />
      <SelectedSlabOpenings s={s} />
      <SelectedRoomsInfo s={s} />
      <SelectedSectionsInfo s={s} />
      <SelectedLevelDimsInfo s={s} />
      {slabs.length > 0 && <SelectedSlabsInfo key={slabs.map((x) => x.id).join()} s={s} slabs={slabs} />}
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
  const any = !s.selection.empty;
  if (COMMANDS.includes(id)) return <CommandOptions s={s} />;
  if (id === 'opening') return <OpeningPanel s={s} />;
  if (id === 'dimension' && !any) return <DimensionOptions s={s} />;
  if (any) return <Selection s={s} />;
  if (WALL_TOOLS.includes(id)) return <NewWallInfo s={s} />;
  if (id === 'slab') return <NewSlabInfo s={s} />;
  if (id === 'room') return <NewRoomPanel s={s} />;
  if (id === 'section') return <NewSectionInfo s={s} />;
  if (id === 'levelDim') return <NewLevelDimInfo s={s} />;
  return (
    <>
      <SelectOptions s={s} />
      <TagAllSection s={s} />
      <ModelCheckSection s={s} />
    </>
  );
}
