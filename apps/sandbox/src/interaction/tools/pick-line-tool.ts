// Stěna z čáry (pravidla-interakce: kontrolní seznam „vybrat čáru → stěna“; Revit „Vybrat čáry“):
// klik na líc existující stěny vytvoří novou stěnu po této čáře. 2D čáry přibudou se 2D kresbou
// (základ 22); nástroj pak bude brát i je.
import { edgePath, pickFace, selectableWallGeometry, type FaceHit } from '@bim-light/core';
import { FACE_PX, type Session } from '../../session/session.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool } from '../types.ts';

export class PickLineTool implements Tool {
  readonly id = 'pickline';
  private hover: FaceHit | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    return 'Klikni na čáru (líc stěny); vznikne po ní nová stěna. Mezerník přehodí stranu, Esc končí.';
  }

  private face(p: PointerInfo) {
    return pickFace(selectableWallGeometry(this.s.model, this.s.view), p.world, this.s.viewport.px(FACE_PX));
  }

  move(p: PointerInfo) {
    this.hover = this.face(p);
  }

  down(p: PointerInfo) {
    if (p.button !== 0) return this.s.setTool('select');
    const f = this.face(p);
    const g = f && selectableWallGeometry(this.s.model, this.s.view).find((x) => x.wallId === f.wallId);
    if (!f || !g) return;
    const s = this.s;
    s.run('wall.create', {
      storeyId: s.storeyId,
      typeId: s.wallTypeId,
      path: edgePath(g, f.face),
      status: s.options.newStatus,
      side: s.wallSide,
      autoCross: true,
    });
  }

  up() {}

  key(k: KeyInfo): boolean {
    if (k.key !== ' ') return false;
    this.s.wallSide = this.s.wallSide === 'left' ? 'right' : 'left';
    return true;
  }

  escape(): boolean {
    return false;
  }

  overlay(): Overlay {
    return { faces: this.hover ? [{ wallId: this.hover.wallId, face: this.hover.face }] : [] };
  }

  tracker() {
    return null;
  }
}
