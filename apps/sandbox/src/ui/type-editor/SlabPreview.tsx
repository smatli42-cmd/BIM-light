// Náhled skladby desky v okně Editor typů: řez deskou ve skutečném poměru, vrstvy shora dolů, šrafy,
// kóty tlouštěk a referenční rovina (horní líc). Klik na vrstvu ji vybere i v tabulce vrstev.
import { slabThickness, type SlabType } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { CompositionPreview } from './CompositionPreview.tsx';

export function SlabPreview(p: {
  s: Session;
  type: SlabType;
  selected: number | null;
  onSelect: (layer: number | null) => void;
}) {
  const layers = p.s.model.compositions[p.type.compositionId]?.layers ?? [];
  const n = layers.length;
  // Náhled kreslí vrstvy v pořadí shora; v datech jsou odspodu → index n − 1 − i.
  const flip = (i: number | null) => (i === null ? null : n - 1 - i);
  return (
    <div class="te-preview" data-testid="slab-preview">
      <CompositionPreview
        model={p.s.model}
        layers={[...layers].reverse()}
        refDepth={0}
        minLength={600}
        mode="plan"
        modes={['plan']}
        onMode={() => undefined}
        selected={flip(p.selected)}
        onSelect={(i) => p.onSelect(flip(i))}
      />
      <p>
        Tloušťka celkem <strong>{slabThickness(p.s.model, p.type.id)} mm</strong> · vrstev {n} · řez deskou,
        horní líc = referenční rovina
      </p>
    </div>
  );
}
