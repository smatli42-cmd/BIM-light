// Okno Průvodní lekce (vzor Arditu): seznam lekcí s počtem kroků; lekce, které ještě nejsou, jsou
// zašedlé s poznámkou, kdy přibudou.
import { LESSONS, PLANNED } from '../../lessons/catalog.ts';
import { startLesson } from '../../lessons/runner.ts';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';

const steps = (n: number) => `${n} ${n === 1 ? 'krok' : n < 5 ? 'kroky' : 'kroků'}`;

export function LessonsDialog({ s, onClose }: { s: Session; onClose: () => void }) {
  return (
    <div class="dialog-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        class="dialog lessons-dialog panel"
        role="dialog"
        aria-label="Průvodní lekce"
        data-testid="lessons-dialog"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div class="content-head">
          <h2 class="content-title">Průvodní lekce</h2>
          <IconButton icon="close" label="Zavřít" onClick={onClose} />
        </div>
        <p class="muted">
          Krátké lekce přímo v aplikaci. Lekce s modelováním běží ve cvičném projektu – tvůj projekt se po
          ukončení vrátí.
        </p>
        <div class="lesson-list">
          {LESSONS.map((l) => (
            <button
              key={l.id}
              class="lesson-item"
              data-testid={`lesson-${l.id}`}
              onClick={() => {
                onClose();
                startLesson(s, l);
              }}
            >
              <span class="lesson-text">
                <strong>{l.title}</strong>
                <span class="muted">{l.description}</span>
              </span>
              <span class="muted">{steps(l.steps.length)}</span>
            </button>
          ))}
          {PLANNED.map((l) => (
            <button key={l.title} class="lesson-item" disabled title={`Přibude ${l.when}.`}>
              <span class="lesson-text">
                <strong>{l.title}</strong>
                <span class="muted">{l.description}</span>
              </span>
              <span class="muted">připravujeme</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
