// Plovoucí prvek u kurzoru (karta, tracker, paleta) zůstane celý uvnitř okna výkresu: když by přesáhl
// pravý nebo dolní okraj, překlopí se na druhou stranu kotvy (koncepce rozhraní, část 2 I).
import type { Vec2 } from '@bim-light/core';
import { useLayoutEffect, useRef } from 'preact/hooks';

/** Poloha levého horního rohu: vpravo dole od kotvy, u okraje překlopená. Čistá funkce (testovatelná). */
export function placeNear(at: Vec2, off: Vec2, size: Vec2, room: Vec2): Vec2 {
  const x = at.x + off.x + size.x > room.x ? at.x - off.x - size.x : at.x + off.x;
  const y = at.y + off.y + size.y > room.y ? at.y - off.y - size.y : at.y + off.y;
  return { x: Math.max(0, x), y: Math.max(0, y) };
}

/** Ref pro plovoucí prvek; po vykreslení ho umístí u kotvy uvnitř rodiče. */
export function useKeepInside<T extends HTMLElement>(at: Vec2 | null, off: Vec2) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent || !at) return;
    const p = placeNear(
      at,
      off,
      { x: el.offsetWidth, y: el.offsetHeight },
      { x: parent.clientWidth, y: parent.clientHeight },
    );
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
  });
  return ref;
}
