// Sekce info boxu (koncepce rozhraní, část 2 D): nadpis, sbalení klikem, (i) se stručným vysvětlením.
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Icon } from '../icons/Icon.tsx';

export function Section(props: {
  title: string;
  info?: string;
  testid?: string;
  children: ComponentChildren;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section class="ib-section" data-testid={props.testid}>
      <header class="ib-head">
        <button class="ib-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
          {props.title}
        </button>
        {props.info && (
          <span class="ib-info" title={props.info} aria-label={props.info}>
            <Icon name="info" size={14} />
          </span>
        )}
      </header>
      {open && <div class="ib-body">{props.children}</div>}
    </section>
  );
}

/** Přepínač Instance / Typ v záhlaví info boxu. */
export function InstanceTypeTabs(props: {
  value: 'instance' | 'type';
  onPick: (v: 'instance' | 'type') => void;
}) {
  return (
    <div class="ib-tabs" role="tablist">
      {(['instance', 'type'] as const).map((v) => (
        <button
          key={v}
          role="tab"
          data-testid={`ib-${v}`}
          aria-selected={props.value === v}
          class={props.value === v ? 'active' : ''}
          onClick={() => props.onPick(v)}
        >
          {v === 'instance' ? 'Instance' : 'Typ'}
        </button>
      ))}
    </div>
  );
}
