// Nástroj Výšková kóta (ČSN 01 3420, Ardit): v půdorysu klik na bod podlahy / desky (přichytávání jako
// u kót) hned vloží kótu: rámeček = horní líc desky pod bodem, kroužek = kóta terénu RT / UT u nároží
// (naváže se na roh stěny, text šikmo ven). Volba „S odkazovou čarou“: druhý klik = poloha hodnoty. V okně řezu kreslí nástroj ui/section/section-input.ts. Esc vrátí krok.
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
    if (this.point) return 'Klikni, kam dát hodnotu výškové kóty (odkazová čára). Esc vrátí krok.';
    return 'Klikni na podlahu nebo desku – kóta se vloží hned; kóta terénu na roh stavby. V řezu klik na hranu.';
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
    const d = levelDimDefaults(this.s);
    // Jeden klik (pokyn uživatele); s odkazovou čarou druhý klik určí polohu hodnoty (Revit „Leader“).
    if (!this.point && d.leader) return void (this.point = e);
    const point = this.point ?? e;
    const textAt = this.point ? e : d.marker === 'box' ? e : undefined;
    const r = this.s.run('planLevelDim.create', {
      storeyId: this.s.storeyId,
      point,
      ...(textAt ? { textAt } : {}),
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
