// Karta prvku v okně řezu (jako v půdorysu a ve 3D): když kurzor chvíli stojí nad prvkem, ukáže se stejná
// karta (data z jádra). Vypíná se stejně jako v půdorysu (karty prvků). Pohyb o víc než 4 px ji schová.
import type { Id, Vec2 } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { HOVER_DELAY_MS } from '../HoverCard.tsx';

export type CardState = { id: Id; at: Vec2 } | null;

export function cardTimer(s: Session, hovered: () => Id | null, show: (c: CardState) => void) {
  let timer = 0;
  let at: Vec2 | null = null;
  const hide = () => {
    clearTimeout(timer);
    at = null;
    show(null);
  };
  const move = (pt: Vec2, buttons: number) => {
    if (at && Math.hypot(pt.x - at.x, pt.y - at.y) <= 4) return;
    hide();
    if (buttons || !s.screen.infoCards || s.menu) return;
    at = pt;
    timer = window.setTimeout(() => {
      const id = hovered();
      if (id && (s.model.elements[id] || s.model.openings[id])) show({ id, at: pt });
    }, HOVER_DELAY_MS);
  };
  return { move, hide };
}
