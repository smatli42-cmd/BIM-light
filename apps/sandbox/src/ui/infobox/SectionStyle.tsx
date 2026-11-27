// Záložka Styl v info boxu řezu (Ardit: Instance / Styl): úprava zvoleného stylu řezu (platí pro všechny
// jeho řezy), nový styl z hodnot instance, smazání stylu (řezy si nechají jeho hodnoty).
import type { SectionPreset } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';
import { OptionalMm, type SectionValues } from './SectionFields.tsx';

function PresetFields({ s, preset }: { s: Session; preset: SectionPreset }) {
  const update = (patch: Record<string, unknown>) =>
    s.run('sectionPreset.update', { presetId: preset.id, ...patch });
  return (
    <>
      <label>
        Název
        <input
          data-testid="section-preset-name"
          value={preset.name}
          onChange={(e) => update({ name: e.currentTarget.value })}
        />
      </label>
      <OptionalMm
        label="Hloubka (prázdné = neomezená)"
        testid="section-preset-depth"
        value={preset.depth}
        onSet={(v) => update({ depth: v })}
      />
      <OptionalMm
        label="Vzdálená oblast od (prázdné = vyp.)"
        testid="section-preset-far"
        value={preset.farClip}
        onSet={(v) => update({ farClip: v })}
      />
      <button
        data-testid="section-preset-delete"
        onClick={() => s.run('sectionPreset.delete', { presetId: preset.id })}
      >
        Smazat styl
      </button>
    </>
  );
}

export function StyleTab(p: {
  s: Session;
  presetId: string | null;
  values: SectionValues;
  onPick: (id: string | null) => void;
}) {
  const { s } = p;
  const preset = p.presetId ? s.model.sectionPresets[p.presetId] : undefined;
  const create = () => {
    const r = s.run('sectionPreset.create', {
      name: 'Nový styl řezu',
      depth: p.values.depth,
      farClip: p.values.farClip,
    });
    if (r.ok && r.created[0]) p.onPick(r.created[0]);
  };
  return (
    <Section
      title="Styl řezu"
      info="Styl sdílí hloubku a vzdálenou oblast mezi řezy; změna platí pro všechny."
    >
      {preset ? (
        <PresetFields s={s} preset={preset} />
      ) : (
        <p class="muted">Bez stylu – řez má vlastní hloubku a vzdálenou oblast.</p>
      )}
      <button data-testid="section-preset-new" onClick={create}>
        Nový styl z hodnot instance
      </button>
    </Section>
  );
}
