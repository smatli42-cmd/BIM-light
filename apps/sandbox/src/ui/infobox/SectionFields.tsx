// Pole řezu v info boxu (podle Arditu „Řez“): styl řezu, vrstva značky, geometrická metoda, hloubka
// (prázdné = neomezená) a vzdálená oblast (prázdné = vypnuto). Společné pro nástroj Řez i vybraný řez.
import type { Id } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import type { SectionMethod } from '../../session/section-defaults.ts';
import { IconButton } from '../icons/Icon.tsx';
import { Section } from './Section.tsx';

export interface SectionValues {
  presetId: Id | null;
  layerId: Id | null;
  depth: number | null;
  farClip: number | null;
}

/** Číslo v mm; prázdné pole = null (neomezená hloubka / vypnuto). */
export function OptionalMm(p: {
  label: string;
  value: number | null;
  testid: string;
  disabled?: boolean;
  onSet: (v: number | null) => void;
}) {
  return (
    <label>
      {p.label}
      <input
        type="number"
        min={1}
        step={100}
        data-testid={p.testid}
        disabled={p.disabled}
        value={p.value ?? ''}
        onChange={(e) => {
          const t = e.currentTarget.value.trim();
          const n = Number(t);
          p.onSet(t === '' || !(n > 0) ? null : n);
        }}
      />
    </label>
  );
}

/** Rozbalovač stylu řezu („– bez stylu –“ = vlastní hodnoty). */
export function PresetSelect(p: {
  s: Session;
  value: Id | null;
  testid: string;
  onPick: (id: Id | null) => void;
}) {
  return (
    <select
      data-testid={p.testid}
      value={p.value ?? ''}
      onChange={(e) => p.onPick(e.currentTarget.value || null)}
    >
      <option value="">– bez stylu –</option>
      {Object.values(p.s.model.sectionPresets).map((x) => (
        <option key={x.id} value={x.id}>
          {x.name}
        </option>
      ))}
    </select>
  );
}

/** Vrstva značky řezu: skupiny anotací (výchozí Řezy a pohledy). */
export function LayerSelect(p: { s: Session; value: Id; testid: string; onPick: (id: Id) => void }) {
  const layers = Object.values(p.s.model.display.layers).filter((l) => l.kind === 'annotation');
  return (
    <label class="ib-inline">
      Vrstva
      <select data-testid={p.testid} value={p.value} onChange={(e) => p.onPick(e.currentTarget.value)}>
        {layers.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}

const METHODS: readonly [SectionMethod, 'section-straight' | 'section-jogged', string][] = [
  ['straight', 'section-straight', 'Rovný řez (dva body)'],
  ['jogged', 'section-jogged', 'Zalomený řez (úseky kolmo a rovnoběžně)'],
];

export function MethodButtons(p: {
  value: SectionMethod;
  disabled?: boolean;
  onPick: (m: SectionMethod) => void;
}) {
  return (
    <Section title="Geometrická metoda">
      <div class="ib-buttons" data-testid="section-method">
        {METHODS.map(([v, icon, label]) => (
          <IconButton
            key={v}
            icon={icon}
            label={label}
            testid={`section-method-${v}`}
            pressed={p.value === v}
            onClick={() => !p.disabled && p.onPick(v)}
          />
        ))}
      </div>
    </Section>
  );
}

/** Sekce Řez: hloubka a vzdálená oblast; se stylem řezu jsou jen ke čtení (mění se ve Stylu). */
export function LimitsSection(p: {
  s: Session;
  values: SectionValues;
  onSet: (patch: Partial<SectionValues>) => void;
}) {
  const preset = p.values.presetId ? p.s.model.sectionPresets[p.values.presetId] : undefined;
  const depth = preset ? preset.depth : p.values.depth;
  const far = preset ? preset.farClip : p.values.farClip;
  return (
    <Section
      title="Řez"
      info="Hloubka pohledu za rovinou řezu a odkud se prvky kreslí jako vzdálená oblast (tence, šedě). Se stylem řezu platí hodnoty stylu."
    >
      <OptionalMm
        label="Hloubka (prázdné = neomezená)"
        testid="section-depth"
        value={depth}
        disabled={!!preset}
        onSet={(v) => p.onSet({ depth: v })}
      />
      <OptionalMm
        label="Vzdálená oblast od (prázdné = vyp.)"
        testid="section-far"
        value={far}
        disabled={!!preset}
        onSet={(v) => p.onSet({ farClip: v })}
      />
    </Section>
  );
}
