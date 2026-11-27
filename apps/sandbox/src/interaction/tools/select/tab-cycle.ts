// Tab v nástroji Výběr (pravidla-interakce: Výběr): překrývající se stěny pod kurzorem se vybírají
// postupně jedna po druhé. Vrací nové pořadí v seznamu.
import type { Id } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import type { PointerInfo } from '../../types.ts';

export function cycleUnder(s: Session, under: (p: PointerInfo) => Id[], tab: number): number {
  const p = {
    screen: s.cursor.screen,
    world: s.cursor.world,
    button: 0,
    shift: false,
    ctrl: false,
    alt: false,
  };
  const list = under(p);
  if (!list.length) return tab;
  const next = (tab + 1) % list.length;
  s.selection.set([list[next] as Id]);
  return next;
}
