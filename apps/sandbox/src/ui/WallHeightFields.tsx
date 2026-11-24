// Výška vybraných stěn (plán stěn Z3, základ 12): spodek = podlaží + odsazení, vršek = podlaží + N +
// odsazení, nebo pevná výška („nespojeno“). Zápis jedním příkazem wall.setHeight.
import { resolveHeight, type HeightBinding, type HeightTop, type Wall } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { NumberInput } from './NumberInput.tsx';

type Input = Omit<HeightBinding, 'baseStoreyId'>;

function Num(props: { label: string; testid: string; value: number; onSet: (v: number) => void }) {
  return (
    <label>
      {props.label}
      <NumberInput testid={props.testid} value={props.value} onSet={props.onSet} />
    </label>
  );
}

function TopKind(props: { top: HeightTop; height: number; onPick: (top: HeightTop) => void }) {
  const { top } = props;
  return (
    <label>
      Vršek
      <select
        data-testid="h-top-kind"
        value={top.kind === 'height' ? 'height' : String(top.storeys)}
        onChange={(e) => {
          const v = e.currentTarget.value;
          props.onPick(
            v === 'height'
              ? { kind: 'height', value: props.height }
              : { kind: 'storey', storeys: Number(v), offset: 0 },
          );
        }}
      >
        <option value="height">Nespojeno (pevná výška)</option>
        {[0, 1, 2, 3].map((n) => (
          <option key={n} value={String(n)}>
            Podlaží + {n}
          </option>
        ))}
      </select>
    </label>
  );
}

export function WallHeightFields({ s, walls }: { s: Session; walls: Wall[] }) {
  const first = walls[0];
  if (!first) return null;
  const h = first.height;
  const set = (next: Input) => s.run('wall.setHeight', { wallIds: walls.map((w) => w.id), height: next });
  const r = resolveHeight(s.model, h);
  const top = h.top;
  return (
    <div class="height-fields" data-testid="wall-height">
      <Num
        label="Spodek: odsazení od podlaží (mm)"
        testid="h-base-offset"
        value={h.baseOffset}
        onSet={(v) => set({ baseOffset: v, top })}
      />
      <TopKind
        top={top}
        height={r.top - r.bottom}
        onPick={(t) => set({ baseOffset: h.baseOffset, top: t })}
      />
      {top.kind === 'height' ? (
        <Num
          label="Výška (mm)"
          testid="h-top-value"
          value={top.value}
          onSet={(v) => set({ baseOffset: h.baseOffset, top: { kind: 'height', value: v } })}
        />
      ) : (
        <Num
          label="Vršek: odsazení (mm)"
          testid="h-top-offset"
          value={top.offset}
          onSet={(v) => set({ baseOffset: h.baseOffset, top: { ...top, offset: v } })}
        />
      )}
      <p class="muted" data-testid="h-result">
        Výška {Math.round(r.top - r.bottom)} mm (spodek {Math.round(r.bottom)}, vršek {Math.round(r.top)} nad
        ±0){walls.length > 1 ? ' – podle první vybrané' : ''}
      </p>
    </div>
  );
}
