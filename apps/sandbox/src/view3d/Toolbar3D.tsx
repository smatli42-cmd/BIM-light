// Nástroje 3D okna podle lišty Ardit Designeru (koncepce rozhraní, část 2 E): otáčet / posouvat / přiblížit
// vše, Persp. / Axon., režim zobrazení, slunce a stíny, procházka, Ořez (kvádr), Řez rovinou, mřížka.
// Projekce, režim, slunce, řez a mřížka jsou data 3D pohledu (příkazy view3d.* – jdou přes AI i Undo);
// otáčet / posouvat a procházka jsou jen ovládání kamery.
import type { RenderMode3d } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { IconButton } from '../ui/icons/Icon.tsx';
import { CutControls } from './Cut3D.tsx';
import type { DragTool } from './camera-rig.ts';
import { SunButton } from './Sun3D.tsx';
import { SectionBoxButton } from './Controls3D.tsx';
import type { Solid } from './solids.ts';
import { active3d } from './state.ts';
import type { Viewer } from './viewer.ts';

export const RENDER_MODE_LABELS: Record<RenderMode3d, string> = {
  materials: 'Materiály',
  white: 'Bílý model',
  wireframe: 'Čárový',
  'hidden-lines': 'Skryté hrany',
  sketch: 'Skica',
};

export interface CameraUi {
  readonly tool: DragTool;
  readonly setTool: (t: DragTool) => void;
  readonly walking: boolean;
  readonly toggleWalk: () => void;
}

function Projection({ s }: { s: Session }) {
  const v = active3d(s);
  const set = (projection: string) => s.run('view3d.setProjection', { viewId: v.id, projection });
  return (
    <span class="seg" role="group" aria-label="Projekce">
      <button
        class={v.projection === 'perspective' ? 'active' : ''}
        data-testid="view3d-persp"
        title="Perspektiva"
        onClick={() => set('perspective')}
      >
        Persp.
      </button>
      <button
        class={v.projection === 'axonometric' ? 'active' : ''}
        data-testid="view3d-axon"
        title="Axonometrie (rovnoběžné promítání)"
        onClick={() => set('axonometric')}
      >
        Axon.
      </button>
    </span>
  );
}

function RenderMode({ s }: { s: Session }) {
  const v = active3d(s);
  return (
    <select
      data-testid="view3d-mode"
      title="Režim zobrazení"
      value={v.renderMode}
      onChange={(e) => s.run('view3d.setRenderMode', { viewId: v.id, mode: e.currentTarget.value })}
    >
      {Object.entries(RENDER_MODE_LABELS).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function Toolbar3D(props: {
  s: Session;
  viewer: Viewer | null;
  raw: readonly Solid[];
  cam: CameraUi;
}) {
  const { s, viewer, raw, cam } = props;
  const v = active3d(s);
  return (
    <span class="tools-3d">
      <IconButton
        icon="rotate"
        label="Otáčet (levé tlačítko)"
        testid="view3d-orbit"
        pressed={cam.tool === 'orbit' && !cam.walking}
        onClick={() => cam.setTool('orbit')}
      />
      <IconButton
        icon="hand"
        label="Posouvat (levé tlačítko)"
        testid="view3d-pan"
        pressed={cam.tool === 'pan' && !cam.walking}
        onClick={() => cam.setTool('pan')}
      />
      <IconButton icon="zoom-all" label="Přiblížit vše" testid="view3d-fit" onClick={() => viewer?.fit()} />
      <Projection s={s} />
      <RenderMode s={s} />
      <SunButton s={s} />
      <IconButton
        icon="walk"
        label="Procházka (W A S D, tažení rozhlížení, Esc konec)"
        shortcut="Shift+F3"
        testid="view3d-walk"
        pressed={cam.walking}
        onClick={cam.toggleWalk}
      />
      <SectionBoxButton s={s} solids={raw} />
      <CutControls s={s} viewer={viewer} />
      <IconButton
        icon="grid"
        label="Mřížka v pracovní rovině"
        testid="view3d-grid"
        pressed={v.grid}
        onClick={() => s.run('view3d.setGrid', { viewId: v.id, grid: !v.grid })}
      />
    </span>
  );
}
