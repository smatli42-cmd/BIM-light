// Karta prvku ve 3D okně (jako v Arditu): když kurzor chvíli stojí nad prvkem, ukáže se stejná karta jako
// v půdorysu (data z jádra, elementInfo). Vypíná se stejně jako v půdorysu (tlačítko „i“, karty prvků).
import type { Vec2 } from '@bim-light/core';
import { useEffect, useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { HOVER_DELAY_MS } from '../ui/HoverCard.tsx';
import type { Viewer } from './viewer.ts';

export function useHover3D(s: Session, viewer: Viewer | null): { id: string; at: Vec2 } | null {
  const [shown, setShown] = useState<{ id: string; at: Vec2 } | null>(null);
  const on = s.screen.infoCards;
  useEffect(() => {
    if (!viewer || !on) return setShown(null);
    const c = viewer.canvas;
    let timer = 0;
    let at: Vec2 | null = null;
    const hide = () => {
      clearTimeout(timer);
      setShown(null);
    };
    const onMove = (e: PointerEvent) => {
      if (at && Math.hypot(e.offsetX - at.x, e.offsetY - at.y) <= 4) return;
      hide();
      if (e.buttons || viewer.walk.active) return;
      at = { x: e.offsetX, y: e.offsetY };
      const here = at;
      timer = window.setTimeout(() => {
        const id = viewer.pick(here.x, here.y);
        if (id && s.model.elements[id]) setShown({ id, at: here });
      }, HOVER_DELAY_MS);
    };
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerleave', hide);
    c.addEventListener('pointerdown', hide);
    return () => {
      hide();
      c.removeEventListener('pointermove', onMove);
      c.removeEventListener('pointerleave', hide);
      c.removeEventListener('pointerdown', hide);
    };
  }, [viewer, on]);
  return shown;
}
