// Info box desky – vazba obrysu (základy 14, 16, 24): vázáno na místnost / stěny / ruční obrys; po ruční
// úpravě je vazba zamčená a tlačítko „Obnovit vazbu“ obrys znovu spočítá z modelu (slab.restoreLink).
import type { Model, Slab } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';

/** Text stavu vazby pro info box. */
export function linkText(m: Model, s: Slab): string {
  const l = s.link;
  if (!l) return 'ručně (bez vazby)';
  const what =
    l.kind === 'room'
      ? `na místnost ${m.rooms[l.roomId]?.number ?? ''} ${m.rooms[l.roomId]?.name ?? ''}`.trim()
      : `na stěny (${l.wallIds.length}, ${l.boundary === 'core' ? 'líc jádra' : 'líc'})`;
  return l.locked ? `${what} – ručně upraveno, zamčeno` : `vázáno ${what}`;
}

export function SlabLinkSection({ s, slab }: { s: Session; slab: Slab }) {
  const l = slab.link;
  return (
    <Section
      title="Vazba obrysu"
      info="Podlaha podle místnosti a deska podle stěn se po posunu stěn přepočítají. Ruční úprava obrysu (bod, posun, kóta) vazbu zamkne."
    >
      <div class="ib-row">
        <span class="muted">Obrys</span>
        <strong data-testid="slab-link">{linkText(s.model, slab)}</strong>
      </div>
      {l?.locked && (
        <button
          data-testid="slab-restore-link"
          onClick={() => s.run('slab.restoreLink', { slabId: slab.id })}
        >
          Obnovit vazbu
        </button>
      )}
      {l && (
        <button data-testid="slab-unlink" onClick={() => s.run('slab.unlink', { slabIds: [slab.id] })}>
          Zrušit vazbu
        </button>
      )}
    </Section>
  );
}
