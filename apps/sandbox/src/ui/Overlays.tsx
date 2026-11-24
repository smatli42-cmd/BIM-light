// Ovládání nad plátnem: tracker u kurzoru, štítek nástroje, nabídka na pravé tlačítko,
// pole pro číslo kóty (čitelný tmavý text, pravidla-interakce kóty 5) a hlášky.
import { useEffect, useRef } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { useSession } from './use-session.ts';

function ValueEditor({ s }: { s: Session }) {
  const ref = useRef<HTMLInputElement>(null);
  const ed = s.valueEdit;
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, [ed]);
  if (!ed) return null;
  const close = () => {
    s.valueEdit = null;
    s.changed();
  };
  return (
    <input
      ref={ref}
      class="value-edit"
      data-testid="value-edit"
      style={{ left: `${ed.at.x - 48}px`, top: `${ed.at.y - 13}px` }}
      defaultValue={ed.value}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') close();
        if (e.key !== 'Enter') return;
        const value = e.currentTarget.value;
        close();
        ed.commit(value);
      }}
      onBlur={() => s.valueEdit === ed && close()}
    />
  );
}

function Menu({ s }: { s: Session }) {
  const m = s.menu;
  if (!m) return null;
  return (
    <div
      class="menu"
      data-testid="context-menu"
      style={{ left: `${m.at.x + 8}px`, top: `${m.at.y + 8}px` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div class="menu-title">{m.title}</div>
      {m.items.map((it) => (
        <button
          key={it.label}
          disabled={it.disabled}
          title={it.why}
          onClick={() => {
            s.menu = null;
            it.action();
            s.changed();
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Tracker({ s }: { s: Session }) {
  const fields = s.tool.tracker();
  if (!fields || !s.cursor.inside) return null;
  const { x, y } = s.cursor.screen;
  return (
    <div class="tracker" data-testid="tracker" style={{ left: `${x + 16}px`, top: `${y + 16}px` }}>
      {fields.map((f) => (
        <span key={f.label} class={f.active ? 'field on' : 'field'} data-testid={`tracker-${f.label}`}>
          {f.label} <b>{f.value}</b>
        </span>
      ))}
    </div>
  );
}

export function CanvasOverlays({ session }: { session: Session }) {
  useSession(session);
  const s = session;
  return (
    <>
      <Tracker s={s} />
      <Menu s={s} />
      <ValueEditor s={s} />
      <div class="toasts">
        {s.toasts.map((t) => (
          <div key={t.id} class={`toast ${t.kind}`} data-testid="toast">
            {t.text}
            {t.action && (
              <button data-testid="toast-action" onClick={() => t.action?.run()}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function StatusBar({ session }: { session: Session }) {
  useSession(session);
  const s = session;
  const w = s.cursor.world;
  return (
    <footer class="status">
      <span data-testid="hint">{s.tool.hint()}</span>
      <span class="muted">
        X {Math.round(w.x)} Y {Math.round(w.y)} · 1:{s.view.scale} · výběr {s.selection.walls.length} stěn,{' '}
        {s.selection.dims.length} kót
      </span>
    </footer>
  );
}
