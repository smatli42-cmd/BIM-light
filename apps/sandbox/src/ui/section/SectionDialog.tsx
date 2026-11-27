// Okno řezu / pohledu (rozhodnutí 19): kresba spočítaná z modelu nad výkresem (jako okno výkazu). Zatím jen
// prohlížení – nástroj Řez, info box řezu a další ovládání přijdou podle vzoru z Arditu (koncepce rozhraní).
import { useEffect } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { SectionCanvas } from './SectionCanvas.tsx';

export function SectionDialog(p: { s: Session; sectionId: string; onClose: () => void }) {
  const { onClose } = p;
  // Esc zavře okno, i když fokus zůstal ve výkrese pod ním.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const sec = p.s.model.sections[p.sectionId];
  if (!sec) return null;
  return (
    <div class="dialog-back" onMouseDown={(e) => e.target === e.currentTarget && p.onClose()}>
      <div
        class="dialog section-dialog panel"
        role="dialog"
        aria-label={sec.name}
        data-testid="section-dialog"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') p.onClose();
        }}
      >
        <div class="find-head">
          <strong data-testid="section-title">{sec.name}</strong>
          <span class="muted">
            {sec.kind === 'section' ? 'Řez' : 'Pohled'} · 1:{sec.scale}
          </span>
          <IconButton icon="close" label="Zavřít" onClick={p.onClose} />
        </div>
        <SectionCanvas s={p.s} sectionId={sec.id} />
      </div>
    </div>
  );
}
