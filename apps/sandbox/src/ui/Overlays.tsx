// Ovládání nad plátnem: tracker u kurzoru, štítek nástroje, nabídka na pravé tlačítko,
// pole pro číslo kóty (čitelný tmavý text, pravidla-interakce kóty 5) a hlášky.
import { useEffect, useRef } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { HoverCard } from './HoverCard.tsx';
import { useKeepInside } from './keep-inside.ts';
import { PetPalette } from './PetPalette.tsx';
import { ScaleDialog } from './ScaleDialog.tsx';
import { SegmentMenu } from './SegmentMenu.tsx';
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
  const ref = useKeepInside<HTMLDivElement>(s.cursor.screen, { x: 28, y: 24 });
  if (!fields || !s.cursor.inside) return null;
  const { x, y } = s.cursor.screen;
  return (
    <div ref={ref} class="tracker" data-testid="tracker" style={{ left: `${x + 28}px`, top: `${y + 24}px` }}>
      {fields.map((f) => (
        <div key={f.label} class={f.active ? 'field on' : 'field'} data-testid={`tracker-${f.label}`}>
          <span>{f.label}</span> <b>{f.value}</b>
        </div>
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
      <SegmentMenu s={s} />
      <PetPalette s={s} />
      <HoverCard s={s} />
      <ScaleDialog s={s} />
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
