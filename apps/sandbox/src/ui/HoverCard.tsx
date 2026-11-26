// Karta prvku (koncepce rozhraní, část 2 I): když kurzor chvíli stojí nad stěnou nebo otvorem, ukáže
// souhrn vlastností. Neukazuje se hned, aby při přejíždění po výkresu neblikala; jde vypnout ve spodní
// liště. Data počítá jádro (`elementInfo`, pro AI dotaz `element.info`).
import { elementInfo, type ElementInfo, type Vec2 } from '@bim-light/core';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { Icon } from './icons/Icon.tsx';
import { useKeepInside } from './keep-inside.ts';

/** Jak dlouho musí kurzor stát nad prvkem, než se karta ukáže (ms). */
export const HOVER_DELAY_MS = 800;
/** Pohyb do této vzdálenosti (px) se za pohyb nepočítá. */
const REST_PX = 4;

const mm = (v: number) => `${Math.round(v)} mm`;
const m2 = (v: number) => `${v.toFixed(2).replace('.', ',')} m²`;

interface Card {
  readonly icon: 'wall' | 'opening';
  readonly title: string;
  readonly sub: string;
  readonly head: string;
  readonly note: string;
  readonly rows: readonly [string, string][];
}

function card(i: ElementInfo): Card {
  if (i.kind === 'wall')
    return {
      icon: 'wall',
      title: 'Stěna',
      sub: `Stěna · ${i.storeyName}`,
      head: `${mm(i.length)} · ${m2(i.sideAreaNet)}`,
      note: 'délka · čistá plocha boku',
      rows: [
        ['Délka', mm(i.length)],
        ['Tloušťka', mm(i.thickness)],
        ['Výška', mm(i.height)],
        ['Skladba', i.typeName],
        ['Plocha boku', `${m2(i.sideArea)} / čistá ${m2(i.sideAreaNet)}`],
        ['Vrstva', i.layerName],
      ],
    };
  const niche = i.openingKind === 'niche';
  return {
    icon: 'opening',
    title: niche ? 'Nika' : 'Otvor',
    sub: `${niche ? 'Nika' : 'Otvor'} · ${i.storeyName}`,
    head: `${Math.round(i.width)} × ${mm(i.height)}`,
    note: 'šířka × výška',
    rows: [
      ['Parapet', mm(i.sill)],
      ['Spodní hrana', `${mm(i.bottom)} nad ±0`],
      ['Ve stěně', i.hostTypeName],
      ['Vrstva', i.layerName],
    ],
  };
}

/** Prvek pod klidným kurzorem po prodlevě; jinak null. */
function useRestingHover(s: Session): { id: string; at: Vec2 } | null {
  const [shown, setShown] = useState<{ id: string; at: Vec2 } | null>(null);
  const rest = useRef<{ id: string; at: Vec2; timer: number } | null>(null);
  const on = s.screen.infoCards && s.cursor.inside && !s.pet && !s.menu;
  const id = on ? (s.tool.hoverId?.() ?? null) : null;
  const at = s.cursor.screen;
  useEffect(() => {
    const r = rest.current;
    const still = r && r.id === id && Math.hypot(r.at.x - at.x, r.at.y - at.y) <= REST_PX;
    if (still) return;
    if (r) clearTimeout(r.timer);
    rest.current = null;
    if (shown) setShown(null);
    if (!id) return;
    const here = { x: at.x, y: at.y };
    rest.current = {
      id,
      at: here,
      timer: window.setTimeout(() => setShown({ id, at: here }), HOVER_DELAY_MS),
    };
  });
  useEffect(() => () => clearTimeout(rest.current?.timer), []);
  return shown;
}

export function HoverCard({ s }: { s: Session }) {
  const shown = useRestingHover(s);
  const ref = useKeepInside<HTMLDivElement>(shown?.at ?? null, { x: 18, y: 18 });
  const info = shown ? elementInfo(s.model, shown.id) : null;
  if (!shown || !info) return null;
  const c = card(info);
  return (
    <div
      ref={ref}
      class="hover-card"
      data-testid="hover-card"
      style={{ left: `${shown.at.x + 18}px`, top: `${shown.at.y + 18}px` }}
    >
      <div class="hc-title">
        <Icon name={c.icon} size={16} />
        <div>
          <strong>{c.title}</strong>
          <div class="hc-sub">{c.sub}</div>
        </div>
      </div>
      <div class="hc-head">
        <strong data-testid="hover-card-head">{c.head}</strong>
        <div class="hc-sub">{c.note}</div>
      </div>
      <dl class="hc-rows">
        {c.rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
