// Vložit ze schránky (Ctrl+V, Ctrl+D): náhled stěn se nese na myši, klik je vloží.
import { add, leftNormal, mul, norm, sub, type Vec2 } from '@bim-light/core';
import type { Overlay } from '../../types.ts';
import { typeThickness } from '../wall-links.ts';
import { PointCommand } from './base.ts';

export class PasteTool extends PointCommand {
  readonly id = 'paste';
  protected readonly steps = ['Klikni na místo vložení (přichytává se). Esc ruší.'];

  protected click(p: Vec2) {
    const c = this.s.clipboard;
    if (!c) return this.s.setTool('select');
    const r = this.s.run('wall.paste', {
      storeyId: this.s.storeyId,
      walls: c.walls,
      connections: c.connections,
      vector: sub(p, c.base),
    });
    this.s.setTool('select');
    if (r.ok) this.s.selection.set(r.created);
  }

  protected preview(): Overlay {
    const c = this.s.clipboard;
    if (!c || !this.cur) return {};
    const v = sub(this.cur, c.base);
    const ghosts = c.walls.map((w) => {
      const a = add(w.path.start, v);
      const b = add(w.path.end, v);
      const t = typeThickness(this.s.model, w.typeId) * (w.side === 'left' ? 1 : -1);
      const n = mul(leftNormal(norm(sub(b, a))), t);
      return [a, b, add(b, n), add(a, n)];
    });
    return { ghosts };
  }
}
