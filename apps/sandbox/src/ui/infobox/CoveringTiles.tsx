// Info box místnosti – spárořez (prvky stavby 9): počty dlaždic po typech (celé, řezané, celkem), upozornění
// na úzké řezy a posun počátku spárořezu číslem (podlaha a vybraná stěna). Tažení počátku dlažby je
// v půdorysu (křížek ve vybrané místnosti). Vše příkazem covering.setOrigin; počítá jádro (roomTiling).
import { narrowLimit, roomTiling, tileCounts, type Room, type SurfaceTiling } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { NumberInput } from '../NumberInput.tsx';

const r0 = (v: number) => Math.round(v);
const SIDE_NAME: Record<string, string> = { floor: 'Podlaha', ceiling: 'Strop' };

/** Posun počátku jedné plochy (X po ploše, Y nahoru / v půdorysu). */
function OriginRow({ s, r, t }: { s: Session; r: Room; t: SurfaceTiling }) {
  const key = t.originKey;
  if (!key) return null;
  const [wallId, side] = key.includes(':') ? key.split(':') : [];
  const place = wallId ? 'wall' : key;
  const set = (x: number, y: number) =>
    s.run('covering.setOrigin', {
      roomId: r.id,
      place,
      ...(wallId && { wallId, side }),
      offset: { x, y },
    });
  const id = wallId ? 'wall' : key;
  return (
    <div class="ib-row" data-testid={`tiles-origin-${id}`}>
      <span class="muted">{SIDE_NAME[key] ?? 'Vybraná stěna'} – posun počátku</span>
      <span>
        X{' '}
        <NumberInput
          testid={`tiles-origin-${id}-x`}
          value={r0(t.offset.x)}
          onSet={(v) => set(v, t.offset.y)}
        />
        Y{' '}
        <NumberInput
          testid={`tiles-origin-${id}-y`}
          value={r0(t.offset.y)}
          onSet={(v) => set(t.offset.x, v)}
        />
      </span>
    </div>
  );
}

/** Upozornění na úzké řezy (rozměry pod mezí). */
function Narrow({ list }: { list: readonly SurfaceTiling[] }) {
  const cuts = list.flatMap((t) =>
    t.layout.pieces
      .filter((p) => p.narrow)
      .map((p) => {
        const w = p.width < narrowLimit(t.tile.width) && p.width < t.tile.width - 0.5;
        return `${t.type.name}: ${r0(w ? p.width : p.height)} mm`;
      }),
  );
  if (!cuts.length) return null;
  const shown = [...new Set(cuts)].slice(0, 4).join(', ');
  return (
    <p class="warn" data-testid="tiles-narrow">
      Úzké řezy ({cuts.length}): {shown}. Posuňte počátek spárořezu.
    </p>
  );
}

export function CoveringTiles({ s, r }: { s: Session; r: Room }) {
  const list = roomTiling(s.model, r);
  if (!list.length) return null;
  const f = s.selection.face;
  const face = f && f.roomId === r.id ? list.find((t) => t.originKey === `${f.wallId}:${f.side}`) : undefined;
  const floor = list.find((t) => t.originKey === 'floor');
  return (
    <div data-testid="covering-tiles">
      <span class="muted">Spárořez (celé + řezané = celkem dlaždic)</span>
      {tileCounts(list).map((c) => (
        <div class="ib-row" key={c.typeId} data-testid="tiles-count">
          <span class="muted">{s.model.coveringTypes[c.typeId]?.name}</span>
          <strong>
            {c.whole} + {c.cut} = {c.whole + c.cut} ks
          </strong>
        </div>
      ))}
      <Narrow list={list} />
      {floor && <OriginRow s={s} r={r} t={floor} />}
      {face && <OriginRow s={s} r={r} t={face} />}
    </div>
  );
}
