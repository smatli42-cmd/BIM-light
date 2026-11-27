// Napojení 3D prohlížeče na sezení: vytvoření (WebGL), velikost podle okna, výběr kliknutím (výběr je
// společný s půdorysem, Shift+klik přidá / odebere), tažení úchytů kvádru a roviny řezu jako příkazy.
import { useEffect, useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { active3d, setBox3D } from './state.ts';
import { installTestHook3D } from './test-hook-3d.ts';
import { Viewer } from './viewer.ts';

export const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Klik bez tažení (posun do 4 px) = výběr; tažení otáčí nebo posouvá. */
function clickPick(s: Session, v: Viewer) {
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (down = e.button === 0 ? { x: e.offsetX, y: e.offsetY } : null);
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.offsetX - down.x, e.offsetY - down.y) > 4) return;
    down = null;
    const id = v.pick(e.offsetX, e.offsetY);
    // Výběr ve 3D nepřepíná podlaží půdorysu (pokyn uživatele 2026-11-27): prvek jiného podlaží se vybere,
    // info box ho ukáže a mění, půdorys zůstane.
    const el = id ? s.model.elements[id] : undefined;
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

export function useViewer(s: Session, canvas: { current: HTMLCanvasElement | null }) {
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
    v.onCutChange = (plane) => s.run('view3d.setCutPlane', { viewId: active3d(s).id, plane });
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
