// Průvodní lekce (koncepce rozhraní, průvodce prostředím; vzor Arditu 2026-11-26): krátké kroky,
// každý zvýrazní část okna modrým rámečkem a vysvětlí ji v bublině.
import type { Session } from '../session/session.ts';

export interface LessonStep {
  /** CSS selektor zvýrazněné části okna (nejlépe data-testid). */
  readonly target: string;
  readonly title: string;
  readonly text: string;
  /** Příprava kroku (např. vybrat stěnu v cvičném projektu). */
  readonly setup?: (s: Session) => void;
}

export interface Lesson {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Lekce běží ve cvičném projektu; po ukončení se vrátí původní projekt i s historií Zpět. */
  readonly practice: boolean;
  readonly steps: readonly LessonStep[];
}

/** Lekce, která zatím není (přibude s funkcemi, které popisuje). */
export interface PlannedLesson {
  readonly title: string;
  readonly description: string;
  readonly when: string;
}
