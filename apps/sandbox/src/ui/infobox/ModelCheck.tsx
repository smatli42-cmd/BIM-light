// Kontrola modelu v info boxu (plán stěn Z10): nástroj Výběr bez výběru → „Zkontrolovat“ ukáže varování
// podlaží (překryv, nenapojený konec, krátká stěna); klik na varování vybere dotčené stěny. Stejný dotaz
// model.check má AI. Varování nic nemění a nebrání práci.
import type { CheckIssue, Id } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';

const ICON: Readonly<Record<CheckIssue['kind'], string>> = { overlap: '⧉', unconnected: '⊸', short: '↔' };

export function ModelCheckSection({ s }: { s: Session }) {
  const [issues, setIssues] = useState<CheckIssue[] | null>(null);
  const run = () => {
    const r = s.editor.query('model.check', { storeyId: s.storeyId });
    setIssues(r.ok ? (r.data as CheckIssue[]) : []);
  };
  const pick = (ids: readonly Id[]) => {
    s.selection.set(ids.filter((id) => s.model.elements[id]));
    s.changed();
  };
  return (
    <Section
      title="Kontrola"
      info="Překrývající se stěny, nenapojené konce u jiné stěny a velmi krátké stěny na podlaží. Jen varuje."
      testid="model-check"
    >
      <button data-testid="check-run" onClick={run}>
        Zkontrolovat podlaží
      </button>
      {issues && (
        <p class="muted" data-testid="check-count">
          {issues.length === 0 ? 'Bez varování.' : `Varování: ${issues.length}`}
        </p>
      )}
      {issues && issues.length > 0 && (
        <ul class="check-list">
          {issues.map((i, k) => (
            <li key={k}>
              <button data-testid="check-issue" onClick={() => pick(i.wallIds)}>
                <span aria-hidden="true">{ICON[i.kind]}</span> {i.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
