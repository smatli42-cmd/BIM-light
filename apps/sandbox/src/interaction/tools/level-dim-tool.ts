// Nástroj Výšková kóta (ČSN 01 3420): kreslí se v okně řezu nebo pohledu (ui/section/section-input.ts).
// V okně půdorysu jen napoví, kde se používá; nic nemění.
import type { Session } from '../../session/session.ts';
import type { Overlay, Tool, TrackerField } from '../types.ts';

export class LevelDimTool implements Tool {
  readonly id = 'levelDim';

  constructor(private readonly s: Session) {}

  hint(): string {
    return this.s.windows.some((w) => w.sectionId)
      ? 'V okně řezu klikni na hranu prvku nebo úroveň podlaží, pak druhým klikem umísti praporek. Esc ukončí.'
      : 'Výšková kóta se dává v řezu nebo pohledu: otevři ho z Obsahu → Projekt → Řezy / Pohledy.';
  }

  down() {}
  move() {}
  up() {}
  key(): boolean {
    return false;
  }
  escape(): boolean {
    return false;
  }
  overlay(): Overlay {
    return {};
  }
  tracker(): readonly TrackerField[] | null {
    return null;
  }
}
