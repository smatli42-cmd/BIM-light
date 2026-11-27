// Výška vybraných stěn (plán stěn Z3, základ 12): spodek = podlaží + odsazení, vršek = podlaží + N +
// odsazení, pevná výška („nespojeno“), nebo vršek k desce nad stěnou (desky D4, Revit Attach Top).
// Zápis jedním příkazem wall.setHeight nebo wall.attachTop.
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

const kindValue = (top: HeightTop) =>
  top.kind === 'height' ? 'height' : top.kind === 'slab' ? 'slab' : String(top.storeys);

function TopKind(props: { top: HeightTop; onPick: (v: string) => void }) {
  return (
    <label>
      Vršek
      <select
        data-testid="h-top-kind"
        value={kindValue(props.top)}
        onChange={(e) => props.onPick(e.currentTarget.value)}
      >
        <option value="height">Nespojeno (pevná výška)</option>
        {[0, 1, 2, 3].map((n) => (
          <option key={n} value={String(n)}>
            Podlaží + {n}
          </option>
        ))}
        <option value="slab">Vršek k desce</option>
      </select>
    </label>
  );
}

function slabName(s: Session, top: HeightTop): string {
  if (top.kind !== 'slab') return '';
  const slab = s.model.elements[top.slabId];
  return slab ? ` – deska ${s.model.slabTypes[slab.typeId]?.name ?? ''}` : '';
}

export function WallHeightFields({ s, walls }: { s: Session; walls: Wall[] }) {
  const first = walls[0];
  if (!first) return null;
  const h = first.height;
  const wallIds = walls.map((w) => w.id);
  const set = (next: Input) => s.run('wall.setHeight', { wallIds, height: next });
  const r = resolveHeight(s.model, h);
  const top = h.top;
  const pick = (v: string) => {
    if (v === 'slab') return void s.run('wall.attachTop', { wallIds });
    if (v === 'height') set({ baseOffset: h.baseOffset, top: { kind: 'height', value: r.top - r.bottom } });
    else set({ baseOffset: h.baseOffset, top: { kind: 'storey', storeys: Number(v), offset: 0 } });
  };
  return (
    <div class="height-fields" data-testid="wall-height">
      <Num
        label="Spodek: odsazení od podlaží (mm)"
        testid="h-base-offset"
        value={h.baseOffset}
        onSet={(v) => set({ baseOffset: v, top })}
      />
      <TopKind top={top} onPick={pick} />
      {top.kind === 'height' ? (
        <Num
          label="Výška (mm)"
          testid="h-top-value"
          value={top.value}
          onSet={(v) => set({ baseOffset: h.baseOffset, top: { kind: 'height', value: v } })}
        />
      ) : (
        <Num
          label={top.kind === 'slab' ? 'Vršek: odsazení od spodního líce desky (mm)' : 'Vršek: odsazení (mm)'}
          testid="h-top-offset"
          value={top.offset}
          onSet={(v) => set({ baseOffset: h.baseOffset, top: { ...top, offset: v } })}
        />
      )}
      <p class="muted" data-testid="h-result">
        Výška {Math.round(r.top - r.bottom)} mm (spodek {Math.round(r.bottom)}, vršek {Math.round(r.top)} nad
        ±0){slabName(s, top)}
        {walls.length > 1 ? ' – podle první vybrané' : ''}
      </p>
    </div>
  );
}
