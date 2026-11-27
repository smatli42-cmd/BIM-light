// Rozbalovací volba spodní lišty (koncepce rozhraní, část 2 G): tlačítko „popisek ›“, nad ním nabídka
// v sekcích, zaškrtnutá položka = aktuální stav. Klik mimo nabídku ji zavře.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../icons/Icon.tsx';
import type { IconName } from '../icons/paths.ts';

export interface MenuItem {
  readonly label: string;
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly testid?: string;
  /** Po výběru nechat nabídku otevřenou (zaškrtávání více položek, např. podlaží ve 3D). */
  readonly keepOpen?: boolean;
  readonly onPick: () => void;
}

export interface MenuSection {
  readonly title?: string;
  readonly items: readonly MenuItem[];
}

export function BarMenu(props: {
  label: string;
  title: string;
  testid: string;
  icon?: IconName;
  sections: readonly MenuSection[];
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <span class="bar-menu" ref={box}>
      <button class="bar-btn" data-testid={props.testid} title={props.title} onClick={() => setOpen(!open)}>
        {props.icon && <Icon name={props.icon} size={16} />}
        <span>{props.label}</span>
        <span class="muted">›</span>
      </button>
      {open && (
        <div class="bar-pop" role="menu" data-testid={`${props.testid}-menu`}>
          {props.sections.map((sec, i) => (
            <div key={i} class="bar-sec">
              {sec.title && <div class="bar-sec-title">{sec.title}</div>}
              {sec.items.map((it) => (
                <button
                  key={it.label}
                  role="menuitem"
                  data-testid={it.testid}
                  disabled={it.disabled}
                  class={it.checked ? 'on' : ''}
                  onClick={() => {
                    it.onPick();
                    if (!it.keepOpen) setOpen(false);
                  }}
                >
                  <span class="check-mark">{it.checked ? '✓' : ''}</span>
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}
