// Nástroj Výšková kóta (ČSN 01 3420, Ardit): v půdorysu klik na bod podlahy / desky (přichytávání jako
// u kót), druhý klik umístí hodnotu: rámeček = horní líc desky pod bodem, kroužek = kóta terénu RT / UT
// u nároží (naváže se na roh stěny). V okně řezu kreslí nástroj ui/section/section-input.ts. Esc vrátí krok.
import type { SnapResult, Vec2 } from '@bim-light/core';
import { levelDimDefaults } from '../../session/section-defaults.ts';
import type { Session } from '../../session/session.ts';
import type { Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';
import { snapLabel } from './wall-chain.ts';

export class LevelDimTool implements Tool {
  readonly id = 'levelDim';
  private point: Vec2 | null = null;
  private end: Vec2 | null = null;
  private snapRes: SnapResult | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    if (this.point) return 'Klikni, kam dát hodnotu výškové kóty. Esc vrátí krok.';
    return 'Klikni na bod podlahy nebo desky (výška horního líce); v okně řezu na hranu nebo úroveň podlaží.';
  }

  move(p: PointerInfo) {
    this.snapRes = this.s.snap(p.world, { from: this.point, orthoOnly: p.shift, alt: p.alt });
    this.end = this.snapRes.point;
  }

  down(p: PointerInfo) {
    if (p.button !== 0) return;
    this.move(p);
    const e = this.end;
    if (!e) return;
    if (!this.point) {
      this.point = e;
      // Rámeček stačí jedním klikem, když se myš nepohne (hodnota přímo v bodě) – druhý klik ho dá jinam.
      return;
    }
    const d = levelDimDefaults(this.s);
    const r = this.s.run('planLevelDim.create', {
      storeyId: this.s.storeyId,
      point: this.point,
      textAt: e,
      marker: d.marker,
      absolute: d.absolute,
      ...(d.marker === 'circle' ? { rt: d.rt, ut: d.ut } : {}),
      viewId: this.s.viewId,
    });
    if (r.ok) this.point = null;
  }

  up() {}

  key(): boolean {
    return false;
  }

  escape(): boolean {
    if (!this.point) return false;
    this.point = null;
    return true;
  }

  overlay(): Overlay {
    const r = this.snapRes;
    const snap = r?.snap && this.end ? { point: this.end, label: snapLabel(r) } : null;
    const p = this.point;
    return {
      snap,
      guides: r?.guides ?? [],
      markers: p ? [p] : [],
      lines: p && this.end ? [[p, this.end]] : [],
    };
  }

  tracker(): readonly TrackerField[] | null {
    return null;
  }
}
