// Okno Ukázky (pokyn uživatele 2026-11-26): ukázkový projekt a testovací scény k posledním krokům.
// Klik otevře ukázku přes adresu ?ukazka=klíč (ukázka se postaví příkazy jádra při startu). Rozpracovaný
// projekt se zahodí – s neuloženými změnami se nejdřív zeptá.
import { SAMPLES, type Sample } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { openSample } from './open.ts';

function Item({ s, sample }: { s: Session; sample: Sample }) {
  return (
    <li class="sample">
      <div>
        <strong>{sample.title}</strong> <span class="muted">{sample.date}</span>
        <p class="muted">{sample.description}</p>
      </div>
      <button data-testid={`sample-${sample.key}`} onClick={() => openSample(s, sample.key)}>
        Otevřít
      </button>
    </li>
  );
}

export function SamplesDialog({ s, onClose }: { s: Session; onClose: () => void }) {
  const projects = SAMPLES.filter((x) => x.kind === 'projekt');
  const scenes = SAMPLES.filter((x) => x.kind === 'scena');
  return (
    <div class="dialog-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        class="dialog samples-dialog panel"
        role="dialog"
        aria-label="Ukázky"
        data-testid="samples-dialog"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') onClose();
        }}
      >
        <div class="find-head">
          <strong>Ukázky</strong>
          <span class="muted">Otevře se místo rozpracovaného projektu.</span>
          <IconButton icon="close" label="Zavřít" onClick={onClose} />
        </div>
        <div class="samples-body">
          <div class="content-group">Ukázkový projekt</div>
          <ul class="samples">
            {projects.map((x) => (
              <Item key={x.key} s={s} sample={x} />
            ))}
          </ul>
          <div class="content-group">Testovací scény k posledním krokům</div>
          <ul class="samples">
            {scenes.map((x) => (
              <Item key={x.key} s={s} sample={x} />
            ))}
          </ul>
          <button data-testid="sample-empty" onClick={() => openSample(s, null)}>
            Prázdný projekt
          </button>
        </div>
      </div>
    </div>
  );
}
