// Nástroj Střecha, metoda „podle obrysu budovy“ (S2; Archicad: obrys střechy kouzelnou hůlkou z jádra
// stěn): klik do budovy vytvoří střechu s ref. čárou po vnějším líci nosné vrstvy obvodových stěn a ve
// výšce vršku stěn (roof.create s fromWalls). Vybrané stěny obrys omezí. Náhled spočítané střechy pod kurzorem.
import { buildingOutline, type Model, type Vec2 } from '@bim-light/core';
import { roofFromWallsParams } from '../../session/roof-defaults.ts';
import type { Session } from '../../session/session.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';

export class RoofBuildingTool implements Tool {
  readonly id = 'roof';
  private at: Vec2 | null = null;
  private outline: readonly Vec2[] = [];
  private preview: Model | null = null;
  private top: number | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    return 'Klikni do budovy: střecha po vnějším líci nosné vrstvy obvodových stěn (výška z vršku stěn). Vybrané stěny obrys omezí.';
  }

  move(p: PointerInfo) {
    this.at = p.world;
    const walls = this.s.selection.walls;
    const b = buildingOutline(this.s.model, this.s.storeyId, {
      point: p.world,
      ...(walls.length ? { wallIds: walls } : {}),
    });
    this.outline = b?.outline ?? [];
    this.top = b?.top ?? null;
    this.preview = b ? this.s.editor.preview('roof.create', roofFromWallsParams(this.s, p.world)) : null;
  }

  down(p: PointerInfo) {
    if (p.button !== 0) return;
    this.move(p);
    if (!this.outline.length)
      return this.s.toast('Tady není budova – klikni dovnitř uzavřené smyčky stěn.', 'bad');
    this.s.run('roof.create', roofFromWallsParams(this.s, p.world));
  }

  up() {}

  key(_k: KeyInfo): boolean {
    return false;
  }

  escape(): boolean {
    return false;
  }

  overlay(): Overlay {
    return {
      previewModel: this.preview,
      ghosts: this.outline.length ? [this.outline] : [],
      markers: this.at ? [this.at] : [],
    };
  }

  tracker(): readonly TrackerField[] | null {
    if (this.top === null) return null;
    const lvl = this.top - (this.s.model.storeys[this.s.storeyId]?.elevation ?? 0);
    return [{ label: 'Ref. čára', value: `${Math.round(lvl)}`, active: false }];
  }
}
