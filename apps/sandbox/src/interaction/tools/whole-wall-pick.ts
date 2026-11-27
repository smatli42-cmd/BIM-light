// Nástroj Kóta v režimu „Celou stěnu“ (pokyn uživatele 2026-11-26; Revit: Vybrat „Celé stěny“):
// klik na stěnu vybere stěnu a líc blíž kliknutí, řetěz celé stěny (otvory, volitelně i šířky všech
// stěn) se pak nese na myši a druhý klik ho položí. Kóty vznikají příkazem dimension.wholeWall.
import {
  type Dimension,
  findWall,
  type Id,
  nearestOnPath,
  selectableWallGeometry,
  type Vec2,
  wallsAt,
} from '@bim-light/core';
import { FACE_PX, type Session } from '../../session/session.ts';
import type { Overlay, PointerInfo } from '../types.ts';

const MIN_DISTANCE = 300;

export class WholeWallPick {
  private picked: { wallId: Id; side: 'ref' | 'opp' } | null = null;
  private at: Vec2 | null = null;

  constructor(private readonly s: Session) {}

  get active(): boolean {
    return this.picked !== null;
  }

  hint(): string {
    return this.picked
      ? 'Posuň řetěz myší a klikni na místo. Esc zruší.'
      : 'Klikni na stěnu u líce, který se má okótovat (celá stěna).';
  }

  private params(p: Vec2) {
    const pk = this.picked;
    if (!pk) return null;
    const w = findWall(this.s.model, pk.wallId);
    const g = selectableWallGeometry(this.s.model, this.s.view).find((x) => x.wallId === pk.wallId);
    if (!w || !g) return null;
    const distance = Math.max(MIN_DISTANCE, nearestOnPath(g.faces[pk.side], p).distance);
    return {
      wallId: pk.wallId,
      side: pk.side,
      distance,
      viewId: this.s.viewId,
      walls: this.s.options.dimWalls,
    };
  }

  move(p: PointerInfo) {
    this.at = p.world;
  }

  down(p: PointerInfo) {
    if (p.button !== 0) return this.escape();
    if (this.picked) {
      const params = this.params(p.world);
      if (params) this.s.run('dimension.wholeWall', params);
      this.picked = null;
      return true;
    }
    const geoms = selectableWallGeometry(this.s.model, this.s.view);
    const id = wallsAt(geoms, p.world, this.s.viewport.px(FACE_PX))[0];
    const g = geoms.find((x) => x.wallId === id);
    if (!id || !g) return false;
    const [r, o] = (['ref', 'opp'] as const).map((f) => nearestOnPath(g.faces[f], p.world).distance);
    this.picked = { wallId: id, side: (r ?? 0) < (o ?? 0) ? 'ref' : 'opp' };
    this.at = p.world;
    return true;
  }

  escape(): boolean {
    if (!this.picked) return false;
    this.picked = null;
    return true;
  }

  overlay(): Overlay {
    const params = this.at && this.params(this.at);
    if (!this.picked || !params) return {};
    const m = this.s.editor.preview('dimension.wholeWall', params);
    const drafts: Dimension[] = m
      ? Object.values(m.dimensions).filter((d) => !this.s.model.dimensions[d.id])
      : [];
    return { draftDims: drafts, faces: [{ wallId: this.picked.wallId, face: this.picked.side }] };
  }
}
