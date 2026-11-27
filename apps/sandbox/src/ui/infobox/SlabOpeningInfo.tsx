// Otvor v desce v info boxu (D3; základ 19): u nástroje Otvor volba hostitele (stěna / deska) a metoda
// obrysu otvoru v desce; u výběru plocha, desky, které otvor prořízne, a smazání.
import { polygonArea } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import type { IconName } from '../icons/paths.ts';
import { Section } from './Section.tsx';

const METHODS: readonly ['polygon' | 'rect' | 'rotated', IconName, string][] = [
  ['polygon', 'slab-polygon', 'Mnohoúhelník'],
  ['rect', 'slab-rect', 'Obdélník'],
  ['rotated', 'slab-rotated', 'Natočený obdélník'],
];

/** Nástroj Otvor: do stěny (klik na stěnu), nebo do desky (obrys v půdorysu, prořízne strop i podlahu). */
export function OpeningHost({ s }: { s: Session }) {
  const d = s.openingDefaults;
  const pick = (host: 'wall' | 'slab') => {
    s.openingDefaults = { ...d, host };
    s.setTool('opening');
  };
  return (
    <div class="ib-tabs seg" role="tablist" data-testid="opening-host">
      {(['wall', 'slab'] as const).map((h) => (
        <button
          key={h}
          role="tab"
          data-testid={`opening-host-${h}`}
          aria-selected={d.host === h}
          class={d.host === h ? 'active' : ''}
          onClick={() => pick(h)}
        >
          {h === 'wall' ? 'Ve stěně' : 'V desce'}
        </button>
      ))}
    </div>
  );
}

/** Geometrická metoda obrysu otvoru v desce. */
export function SlabHoleMethod({ s }: { s: Session }) {
  const d = s.openingDefaults;
  return (
    <Section
      title="Geometrická metoda"
      info="Otvor prořízne všechny desky podlaží pod obrysem (strop i podlahu)."
    >
      <div class="ib-buttons" data-testid="hole-method">
        {METHODS.map(([v, icon, label]) => (
          <IconButton
            key={v}
            icon={icon}
            label={label}
            testid={`hole-method-${v}`}
            pressed={d.slabMethod === v}
            onClick={() => {
              s.openingDefaults = { ...d, slabMethod: v };
              s.setTool('opening');
            }}
          />
        ))}
      </div>
    </Section>
  );
}

/** Vybrané otvory v deskách. */
export function SelectedSlabOpenings({ s }: { s: Session }) {
  const ops = s.selection.slabOpenings.map((id) => s.model.slabOpenings[id]).filter((o) => !!o);
  if (!ops.length) return null;
  const area = ops.reduce((a, o) => a + polygonArea(o.outline), 0);
  const hosts = [...new Set(ops.flatMap((o) => o.hostIds))]
    .map((id) => s.model.elements[id])
    .map((e) => (e?.category === 'slab' ? (s.model.slabTypes[e.typeId]?.name ?? '?') : '?'));
  return (
    <section data-testid="sel-slab-openings">
      <h2>Vybrané otvory v desce ({ops.length})</h2>
      <div class="ib-row">
        <span class="muted">Plocha</span>
        <strong data-testid="hole-area">{(area / 1e6).toFixed(2).replace('.', ',')} m²</strong>
      </div>
      <div class="ib-row">
        <span class="muted">Prořízne</span>
        <span>{hosts.join(', ')}</span>
      </div>
      <button
        data-testid="hole-delete"
        onClick={() => s.run('selection.delete', { slabOpeningIds: ops.map((o) => o.id) })}
      >
        Smazat <kbd>Del</kbd>
      </button>
    </section>
  );
}
