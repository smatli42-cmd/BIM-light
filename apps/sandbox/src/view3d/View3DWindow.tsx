// E – 3D okno vedle půdorysu (koncepce rozhraní, část 2 E; rozhodnutí 14; lišta podle Ardit Designeru):
// hlavička s názvem, pod ní lišta 3D pohledu (pohled, fáze, podlaží | otáčet, posun, přiblížit vše,
// Persp. / Axon., režim zobrazení, slunce, procházka, Ořez, Řez, mřížka) a 3D model. Ukazuje uložený
// 3D pohled (View3d). Klik vybere prvek (výběr je společný s půdorysem), Shift+klik přidá / odebere;
// když kurzor stojí nad prvkem, ukáže se karta prvku.
import { sunDirection } from '@bim-light/core';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { setScreen } from '../ui/bottom/groups.tsx';
import { ElementCard } from '../ui/HoverCard.tsx';
import { Icon, IconButton } from '../ui/icons/Icon.tsx';
import { useSession } from '../ui/use-session.ts';
import type { DragTool } from './camera-rig.ts';
import { cutSolids, exactCut } from './clip-plane.ts';
import { clipSolids } from './clip.ts';
import { Phase3DMenu, Storeys3DMenu, Views3DMenu } from './Controls3D.tsx';
import { modelSolids, viewSheets } from './scene-model.ts';
import type { Solid } from './solids.ts';
import { active3d, close3D, focus3D, show3D, view3d } from './state.ts';
import { Toolbar3D, type CameraUi } from './Toolbar3D.tsx';
import { useHover3D } from './use-hover-3d.ts';
import { cssVar, useViewer } from './use-viewer.ts';
import type { Viewer } from './viewer.ts';
import './view3d.css';

/** Hlavička 3D okna: název a tlačítka zobrazení. */
function Head3D({ s, title }: { s: Session; title: string }) {
  return (
    <div class="window-head">
      <span class="window-tab" data-testid="window-3d-title">
        <Icon name="cube" size={16} />
        {title}
      </span>
      <span class="spacer" />
      <IconButton
        icon="cube"
        label="Zobrazit vše ve 3D"
        shortcut="Ctrl+F4 / Shift+F4"
        testid="view3d-all"
        onClick={() => show3D(s, false)}
      />
      <IconButton
        icon="cube-selection"
        label="Zobrazit výběr ve 3D"
        shortcut="F4"
        testid="view3d-selection"
        onClick={() => show3D(s, true)}
      />
      <IconButton icon="close" label="Zavřít 3D okno" testid="view3d-close" onClick={() => close3D(s)} />
    </div>
  );
}

/** Lišta 3D pohledu pod hlavičkou: vlevo který pohled, fáze, podlaží; vpravo nástroje jako v Arditu. */
function Bar3D(props: { s: Session; raw: readonly Solid[]; viewer: Viewer | null; cam: CameraUi }) {
  const { s } = props;
  return (
    <div class="window-3d-bar" data-testid="view3d-bar">
      <Views3DMenu s={s} />
      <Phase3DMenu s={s} />
      <Storeys3DMenu s={s} />
      <span class="spacer" />
      <Toolbar3D {...props} />
    </div>
  );
}

/** Otáčet / posouvat a procházka (jen ovládání kamery, ne data pohledu); Shift+F3 procházka. */
function useCameraUi(s: Session, viewer: Viewer | null): CameraUi {
  const [tool, setToolState] = useState<DragTool>('orbit');
  const [walking, setWalking] = useState(false);
  const setTool = (t: DragTool) => {
    viewer?.rig.setDragTool(t);
    setToolState(t);
  };
  const toggleWalk = () => {
    if (!viewer) return;
    if (viewer.walk.active) return viewer.walk.stop();
    viewer.onWalkEnd = () => {
      setWalking(false);
      viewer.rig.setProjection(active3d(s).projection);
      viewer.render();
    };
    viewer.walk.start((s.model.storeys[s.storeyId]?.elevation ?? 0) / 1000);
    setWalking(true);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F3' || !e.shiftKey) return;
      e.preventDefault();
      toggleWalk();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return { tool, setTool, walking, toggleWalk };
}

/** Promítne data 3D pohledu do prohlížeče: vzhled, slunce, řez, mřížka, projekce. */
function useViewLook(s: Session, viewer: Viewer | null, solids: readonly Solid[]) {
  const v = active3d(s);
  const background = cssVar('--paper') || '#ffffff';
  const ink = cssVar('--ink') || '#1e1e1e';
  const sunDir = sunDirection(s.model, v.sun);
  const sunKey = `${sunDir.x},${sunDir.y},${sunDir.z}`;
  useEffect(
    () => viewer?.setLook({ mode: v.renderMode, background, ink, shadows: v.sun.shadows, sunDir }),
    [viewer, v.renderMode, background, ink, v.sun.shadows, sunKey, solids],
  );
  useEffect(() => viewer?.setCut(v.cutPlane), [viewer, v.cutPlane, solids]);
  const floor = s.model.storeys[s.storeyId]?.elevation ?? 0;
  useEffect(() => viewer?.setGrid(v.grid ? floor : null), [viewer, v.grid, floor, solids, background]);
  useEffect(() => viewer?.setProjection(v.projection), [viewer, v.projection]);
}

/** „i“ vpravo dole: karty prvků po podržení myši zapnout / vypnout (stejné nastavení jako v půdorysu). */
function InfoToggle({ s }: { s: Session }) {
  const on = s.screen.infoCards;
  return (
    <button
      class="info-3d"
      data-testid="view3d-info"
      aria-pressed={on}
      title={on ? 'Karty prvků po podržení myši (zapnuto)' : 'Karty prvků (vypnuto)'}
      onClick={() => setScreen(s, { infoCards: !on })}
    >
      i
    </button>
  );
}

/** Tělesa a povrchy 3D pohledu: rozsah podlaží, výběr F4, ořezový kvádr a přesný řez rovinou. */
function useScene(s: Session) {
  const st = view3d(s);
  const v = active3d(s);
  const onlyKey = st.only?.join(',') ?? '';
  const raw = useMemo(
    () =>
      modelSolids(s.model, v, st.only ? new Set(st.only) : null, v.storeyIds ? new Set(v.storeyIds) : null),
    [s.model, v, onlyKey],
  );
  const box = v.sectionBox;
  const cut = v.cutPlane;
  const solids = useMemo(() => {
    const boxed = box ? clipSolids(raw, box) : raw;
    return cut && exactCut(cut) ? cutSolids(boxed, cut) : boxed;
  }, [raw, box, cut]);
  const sheets = useMemo(
    () => viewSheets(s.model, v, st.only ? new Set(st.only) : null, box),
    [s.model, v, onlyKey, box],
  );
  return { raw, solids, sheets };
}

export function View3DWindow({ s }: { s: Session }) {
  useSession(s);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { viewer, error } = useViewer(s, canvas);
  const st = view3d(s);
  const v = active3d(s);
  const { raw, solids, sheets } = useScene(s);
  useEffect(() => viewer?.setSolids(solids, sheets), [viewer, solids, sheets]);
  useViewLook(s, viewer, solids);
  useEffect(() => viewer?.setBox(v.sectionBox), [viewer, v.sectionBox]);
  useEffect(() => viewer?.fit(), [viewer, st.fit]);
  const picked = [...s.selection.walls, ...s.selection.slabs];
  useEffect(() => viewer?.setSelection(picked), [viewer, solids, picked.join(',')]);
  const cam = useCameraUi(s, viewer);
  const hover = useHover3D(s, viewer);
  const title = st.only ? `3D · Výběr (${st.only.length})` : '3D · Celý model';
  return (
    <section
      class={st.focused ? 'window window-3d active' : 'window window-3d'}
      data-testid="window-3d"
      onMouseDown={() => focus3D(s)}
    >
      <Head3D s={s} title={title} />
      <Bar3D s={s} raw={raw} viewer={viewer} cam={cam} />
      <main class="workspace">
        <span class="view-label">
          {cam.walking
            ? 'Procházka: W A S D pohyb, Q / E dolů / nahoru, tažení rozhlížení, Esc konec'
            : 'Levé tlačítko otáčí, pravé posouvá, kolečko přibližuje'}
        </span>
        <canvas ref={canvas} class="drawing" data-testid="canvas-3d" />
        {hover && <ElementCard s={s} id={hover.id} at={hover.at} />}
        <InfoToggle s={s} />
        {error && <p class="view3d-error">{error}</p>}
      </main>
    </section>
  );
}
