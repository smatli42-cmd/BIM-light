// Výběr typu úpravy a editor výškových zón stěn (prvky stavby 9; info box místnosti podle Arditu):
// řádek zóny = typ úpravy + horní hrana nad čistou podlahou (mm); poslední zóna jde ke stropu.
import type { CoveringKind, CoveringZone, Id } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { NumberInput } from '../NumberInput.tsx';

export const WALL_KINDS: readonly CoveringKind[] = ['paint', 'plaster', 'tiling', 'skirting'];
export const FLOOR_KINDS: readonly CoveringKind[] = ['floor-tiles', 'flooring'];
export const CEILING_KINDS: readonly CoveringKind[] = ['paint', 'plaster', 'ceiling'];

/** Výběr typu úpravy (jen druhy vhodné pro místo; přiřazený jiný druh zůstane v nabídce). */
export function TypeSelect(p: {
  s: Session;
  value: Id | null;
  kinds: readonly CoveringKind[];
  testid: string;
  onSet: (v: Id | null) => void;
}) {
  const types = Object.values(p.s.model.coveringTypes).filter(
    (t) => p.kinds.includes(t.kind) || t.id === p.value,
  );
  return (
    <select
      data-testid={p.testid}
      value={p.value ?? ''}
      onChange={(e) => p.onSet(e.currentTarget.value || null)}
    >
      <option value="">bez úpravy</option>
      {types.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

/** Přidá zónu nahoru: dosavadní poslední dostane horní hranu, nová (stejný typ) jde ke stropu. */
function addZone(zones: readonly CoveringZone[]): CoveringZone[] {
  const prev = zones.length > 1 ? (zones[zones.length - 2]?.top ?? 0) : 0;
  const last = zones[zones.length - 1] ?? { typeId: null, top: null };
  return [...zones.slice(0, -1), { ...last, top: prev + 1500 }, { typeId: last.typeId, top: null }];
}

/** Odebere zónu; zbylá poslední jde zase ke stropu. */
function removeZone(zones: readonly CoveringZone[], i: number): CoveringZone[] {
  const out = zones.filter((_, k) => k !== i);
  const last = out[out.length - 1];
  return last ? [...out.slice(0, -1), { ...last, top: null }] : [{ typeId: null, top: null }];
}

export function ZoneEditor(p: {
  s: Session;
  zones: readonly CoveringZone[];
  testid: string;
  onSet: (zones: CoveringZone[]) => void;
}) {
  const set = (i: number, patch: Partial<CoveringZone>) =>
    p.onSet(p.zones.map((z, k) => (k === i ? { ...z, ...patch } : z)));
  return (
    <div class="ib-zones" data-testid={p.testid}>
      {[...p.zones.entries()].reverse().map(([i, z]) => (
        <div class="ib-zone" key={i}>
          <TypeSelect
            s={p.s}
            value={z.typeId}
            kinds={WALL_KINDS}
            testid={`${p.testid}-type-${i}`}
            onSet={(v) => set(i, { typeId: v })}
          />
          {z.top === null ? (
            <span class="muted">ke stropu</span>
          ) : (
            <span class="ib-zone-top">
              do{' '}
              <NumberInput testid={`${p.testid}-top-${i}`} value={z.top} onSet={(v) => set(i, { top: v })} />
            </span>
          )}
          {p.zones.length > 1 && (
            <button
              data-testid={`${p.testid}-remove-${i}`}
              title="Odebrat zónu"
              onClick={() => p.onSet(removeZone(p.zones, i))}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button data-testid={`${p.testid}-add`} onClick={() => p.onSet(addZone(p.zones))}>
        + Zóna nahoře
      </button>
    </div>
  );
}
