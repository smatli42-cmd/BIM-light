// E – 3D okno vedle půdorysu (koncepce rozhraní, část 2 E; rozhodnutí 14): hlavička s názvem a tlačítky,
// pod ní 3D model. Ukazuje uložený 3D pohled (View3d) – stěny a desky podle jeho stylu a filtru rekonstrukce aktivního pohledu; klik vybere prvek
// (výběr je společný s půdorysem), Shift+klik přidá / odebere.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { openStorey } from '../session/sets.ts';
import { Icon, IconButton } from '../ui/icons/Icon.tsx';
import { useSession } from '../ui/use-session.ts';
import { clipSolids } from './clip.ts';
import { Phase3DMenu, SectionBoxButton, Storeys3DMenu, Views3DMenu } from './Controls3D.tsx';
import { modelSolids } from './scene-model.ts';
import type { Solid } from './solids.ts';
import { active3d, close3D, setBox3D, show3D, view3d } from './state.ts';
import { installTestHook3D } from './test-hook-3d.ts';
import { Viewer } from './viewer.ts';
import './view3d.css';

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Klik bez tažení (posun do 4 px) = výběr; tažení otáčí nebo posouvá. */
function clickPick(s: Session, v: Viewer) {
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (down = e.button === 0 ? { x: e.offsetX, y: e.offsetY } : null);
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.offsetX - down.x, e.offsetY - down.y) > 4) return;
    down = null;
    const id = v.pick(e.offsetX, e.offsetY);
    // Prvek jiného podlaží: aktivní okno přejde na jeho podlaží (výběr pak v půdorysu vidět, jako Archicad).
    const el = id ? s.model.elements[id] : undefined;
    if (el && el.storeyId !== s.storeyId) openStorey(s, el.storeyId);
    const slab = el?.category === 'slab';
    if (e.shiftKey && el) {
      if (slab) s.selection.toggleSlab(el.id);
      else s.selection.toggleWall(el.id);
    } else if (el) s.selection.set(slab ? [] : [el.id], [], [], slab ? [el.id] : []);
    else s.selection.clear();
    s.changed();
  };
  v.canvas.addEventListener('pointerdown', onDown);
  v.canvas.addEventListener('pointerup', onUp);
  return () => {
    v.canvas.removeEventListener('pointerdown', onDown);
    v.canvas.removeEventListener('pointerup', onUp);
  };
}

function useViewer(s: Session, canvas: { current: HTMLCanvasElement | null }) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let v: Viewer;
    try {
      v = new Viewer(el, { background: cssVar('--paper') || '#ffffff', selection: cssVar('--accent') });
    } catch {
      setError('3D okno potřebuje WebGL – v tomto prohlížeči není dostupné.');
      return;
    }
    const resize = () => v.resize(el.clientWidth, el.clientHeight);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    v.onBoxChange = (box) => setBox3D(s, box);
    const offPick = clickPick(s, v);
    const offHook = installTestHook3D(s, v);
    setViewer(v);
    return () => {
      observer.disconnect();
      offPick();
      offHook();
      v.dispose();
    };
  }, []);
  return { viewer, error };
}

/** Hlavička 3D okna: název a tlačítka zobrazení. */
function Head3D({ s, title, onFit }: { s: Session; title: string; onFit: () => void }) {
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
      <IconButton icon="zoom-all" label="Přizpůsobit" testid="view3d-fit" onClick={onFit} />
      <IconButton icon="close" label="Zavřít 3D okno" testid="view3d-close" onClick={() => close3D(s)} />
    </div>
  );
}

/** Lišta 3D pohledu pod hlavičkou: který pohled, fáze, podlaží, ořezový kvádr (vše data 3D pohledu). */
function Bar3D({ s, raw }: { s: Session; raw: readonly Solid[] }) {
  return (
    <div class="window-3d-bar" data-testid="view3d-bar">
      <Views3DMenu s={s} />
      <Phase3DMenu s={s} />
      <Storeys3DMenu s={s} />
      <SectionBoxButton s={s} solids={raw} />
    </div>
  );
}

export function View3DWindow({ s }: { s: Session }) {
  useSession(s);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { viewer, error } = useViewer(s, canvas);
  const st = view3d(s);
  const v = active3d(s);
  const onlyKey = st.only?.join(',') ?? '';
  const raw = useMemo(
    () =>
      modelSolids(s.model, v, st.only ? new Set(st.only) : null, v.storeyIds ? new Set(v.storeyIds) : null),
    [s.model, v, onlyKey],
  );
  const box = v.sectionBox;
  const solids = useMemo(() => (box ? clipSolids(raw, box) : raw), [raw, box]);
  useEffect(() => viewer?.setSolids(solids), [viewer, solids]);
  useEffect(() => viewer?.setBox(box), [viewer, box]);
  useEffect(() => viewer?.fit(), [viewer, st.fit]);
  const picked = [...s.selection.walls, ...s.selection.slabs];
  useEffect(() => viewer?.setSelection(picked), [viewer, solids, picked.join(',')]);
  useEffect(() => viewer?.setBackground(cssVar('--paper') || '#ffffff'), [viewer, s.theme]);
  const title = st.only ? `3D · Výběr (${st.only.length})` : '3D · Celý model';
  return (
    <section class="window window-3d" data-testid="window-3d">
      <Head3D s={s} title={title} onFit={() => viewer?.fit()} />
      <Bar3D s={s} raw={raw} />
      <main class="workspace">
        <span class="view-label">Levé tlačítko otáčí, pravé posouvá, kolečko přibližuje</span>
        <canvas ref={canvas} class="drawing" data-testid="canvas-3d" />
        {error && <p class="view3d-error">{error}</p>}
      </main>
    </section>
  );
}
