// Okno Nastavení → Priority spojování (pokyn uživatele 2026-11-28): vlevo tabulka úrovní s materiály,
// vpravo živý náhled vzorových spojů, podezřelá místa a zásady řazení (podle nich řadí AI).
import { priorityIssues } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { useSession } from '../use-session.ts';
import { JoinPreviewView } from './JoinPreviewView.tsx';
import { LevelList } from './LevelList.tsx';

export function openPriorities(s: Session) {
  s.prioritiesOpen = true;
  s.changed();
}

function close(s: Session) {
  s.prioritiesOpen = false;
  s.changed();
}

function Issues({ s }: { s: Session }) {
  const issues = priorityIssues(s.model).filter((i) => i.kind !== 'implicit');
  const implicit = priorityIssues(s.model).length - issues.length;
  return (
    <div class="jp-issues" data-testid="jp-issues">
      <strong>Podezřelá místa</strong>
      {issues.length === 0 && <p class="muted">Žádná (izolace ani povrch nejsou nad nosnou vrstvou).</p>}
      <ul>
        {issues.map((i) => (
          <li key={i.kind + i.materialIds.join()} data-testid="jp-issue">
            {i.message}
          </li>
        ))}
      </ul>
      {implicit > 0 && <p class="muted">{implicit} použitých materiálů má úroveň jen podle kategorie.</p>}
    </div>
  );
}

function Policy({ s }: { s: Session }) {
  return (
    <label class="jp-policy">
      Zásady řazení (podle nich zařadí nový materiál AI)
      <textarea
        data-testid="jp-policy"
        rows={6}
        value={s.model.joinPriorities.policy}
        onChange={(e) => s.run('material.setJoinPolicy', { policy: e.currentTarget.value })}
      />
    </label>
  );
}

export function PrioritiesDialog({ s }: { s: Session }) {
  useSession(s);
  if (!s.prioritiesOpen) return null;
  return (
    <div class="dialog-back" onMouseDown={(e) => e.target === e.currentTarget && close(s)}>
      <div
        class="dialog priorities-dialog panel"
        role="dialog"
        aria-label="Priority spojování"
        data-testid="priorities-dialog"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') close(s);
          const field = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
          if (!e.ctrlKey || field) return;
          if (e.key === 'z') s.editor.undo();
          if (e.key === 'y') s.editor.redo();
        }}
      >
        <div class="find-head">
          <strong>Nastavení · Priority spojování</strong>
          <span class="muted">Změna se hned projeví ve všech spojích projektu; Ctrl+Z ji vrátí.</span>
          <IconButton icon="close" label="Zavřít" testid="priorities-close" onClick={() => close(s)} />
        </div>
        <div class="jp-body">
          <LevelList s={s} />
          <div class="jp-side">
            <JoinPreviewView model={s.model} />
            <Issues s={s} />
            <Policy s={s} />
          </div>
        </div>
      </div>
    </div>
  );
}
