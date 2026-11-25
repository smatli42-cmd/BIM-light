// Rychlý výběr typu na nástroji palety (koncepce rozhraní, část 2 C): podržení myši, dvojklik nebo pravé
// tlačítko na nástroji Stěna otevře seznam typů stěn; klik na typ ho nastaví a zapne nástroj.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';

const HOLD_MS = 450;

function TypeList({ s, onPick }: { s: Session; onPick: () => void }) {
  return (
    <div class="quick-pick" data-testid="quick-wall-types" role="menu">
      <div class="quick-pick-title">Typy stěn</div>
      {Object.values(s.model.wallTypes).map((t) => (
        <button
          key={t.id}
          role="menuitem"
          data-testid="quick-type"
          class={t.id === s.wallTypeId ? 'active' : ''}
          onClick={() => {
            s.wallTypeId = t.id;
            s.setTool('wall');
            onPick();
          }}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}

/** Obal tlačítka nástroje Stěna s rychlým výběrem typu. */
export function WallTypePick({ s, children }: { s: Session; children: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const box = useRef<HTMLSpanElement>(null);
  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <span
      class="has-pick"
      ref={box}
      onPointerDown={(e) => {
        if (e.button === 0) timer.current = window.setTimeout(() => setOpen(true), HOLD_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onDblClick={() => setOpen(true)}
      onContextMenu={(e) => {
        e.preventDefault();
        setOpen(true);
      }}
    >
      {children}
      <span class="pick-mark" aria-hidden="true" />
      {open && <TypeList s={s} onPick={() => setOpen(false)} />}
    </span>
  );
}
