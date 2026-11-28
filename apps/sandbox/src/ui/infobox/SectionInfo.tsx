// Info box řezu (podle Arditu): nástroj Řez = „Výchozí nastavení nových prvků“ (Instance / Styl, styl řezu,
// vrstva, geometrická metoda, hloubka, vzdálená oblast); vybraný řez = totéž nad řezem + název, směr,
// měřítko, otevření okna řezu a smazání. Vše se mění příkazy (section.update, sectionPreset.*).
import type { Section as SectionData } from '@bim-light/core';
import { sectionDefaults, setSectionDefaults } from '../../session/section-defaults.ts';
import { openSection } from '../../session/section-windows.ts';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';
import {
  LayerSelect,
  LimitsSection,
  MethodButtons,
  PresetSelect,
  type SectionValues,
} from './SectionFields.tsx';
import { StyleTab } from './SectionStyle.tsx';

function Tabs(p: { value: 'instance' | 'style'; onPick: (v: 'instance' | 'style') => void }) {
  return (
    <div class="ib-tabs seg" role="tablist">
      {(['instance', 'style'] as const).map((v) => (
        <button
          key={v}
          role="tab"
          data-testid={`section-tab-${v}`}
          aria-selected={p.value === v}
          class={p.value === v ? 'active' : ''}
          onClick={() => p.onPick(v)}
        >
          {v === 'instance' ? 'Instance' : 'Styl'}
        </button>
      ))}
    </div>
  );
}

/** Nástroj Řez bez výběru: výchozí nastavení nových řezů. */
export function NewSectionInfo({ s }: { s: Session }) {
  const d = sectionDefaults(s);
  const set = (patch: Parameters<typeof setSectionDefaults>[1]) => setSectionDefaults(s, patch);
  return (
    <>
      <Tabs value={d.tab} onPick={(tab) => set({ tab })} />
      <PresetSelect
        s={s}
        value={d.presetId}
        testid="section-preset"
        onPick={(presetId) => set({ presetId })}
      />
      {d.tab === 'style' ? (
        <StyleTab s={s} presetId={d.presetId} values={d} onPick={(presetId) => set({ presetId })} />
      ) : (
        <>
          <LayerSelect
            s={s}
            value={d.layerId ?? 'ann-sections'}
            testid="section-layer"
            onPick={(layerId) => set({ layerId })}
          />
          <MethodButtons value={d.method} onPick={(method) => set({ method })} />
          <LimitsSection s={s} values={d} onSet={set} />
        </>
      )}
    </>
  );
}

/** Název, vrstva, metoda (jen ke čtení), hloubka a zobrazení jednoho vybraného řezu. */
function InstanceFields({ s, sec, values }: { s: Session; sec: SectionData; values: SectionValues }) {
  const upd = (patch: Record<string, unknown>) => s.run('section.update', { sectionId: sec.id, ...patch });
  const flip = () => upd({ direction: sec.direction === 'left' ? 'right' : 'left' });
  return (
    <>
      <label>
        Název
        <input
          data-testid="section-name"
          value={sec.name}
          onChange={(e) => s.run('section.rename', { sectionId: sec.id, name: e.currentTarget.value })}
        />
      </label>
      <LayerSelect
        s={s}
        value={sec.annotationLayerId}
        testid="section-layer"
        onPick={(id) => upd({ annotationLayerId: id })}
      />
      <MethodButtons
        value={sec.kind === 'elevation' ? 'elevation' : sec.points.length > 2 ? 'jogged' : 'straight'}
        disabled
        onPick={() => undefined}
      />
      <LimitsSection s={s} values={values} onSet={(patch) => upd(patch)} />
      <Section title="Zobrazení">
        <label>
          Měřítko 1:
          <input
            type="number"
            min={1}
            data-testid="section-scale"
            value={sec.scale}
            onChange={(e) => upd({ scale: Number(e.currentTarget.value) || sec.scale })}
          />
        </label>
        <div class="ib-buttons">
          <button data-testid="section-flip" onClick={flip}>
            Otočit směr
          </button>
          <button data-testid="section-open" onClick={() => openSection(s, sec.id)}>
            Otevřít řez
          </button>
        </div>
      </Section>
    </>
  );
}

function SelectedOne({ s, sec }: { s: Session; sec: SectionData }) {
  const d = sectionDefaults(s);
  const pick = (presetId: string | null) => s.run('section.update', { sectionId: sec.id, presetId });
  const values: SectionValues = {
    presetId: sec.presetId,
    layerId: sec.annotationLayerId,
    depth: sec.depth,
    farClip: sec.farClip,
  };
  return (
    <>
      <Tabs value={d.tab} onPick={(tab) => setSectionDefaults(s, { tab })} />
      <PresetSelect s={s} value={sec.presetId} testid="section-preset" onPick={pick} />
      {d.tab === 'style' ? (
        <StyleTab s={s} presetId={sec.presetId} values={values} onPick={pick} />
      ) : (
        <InstanceFields s={s} sec={sec} values={values} />
      )}
    </>
  );
}

/** Vybrané řezy: jeden = úpravy, víc = jen smazání. */
export function SelectedSectionsInfo({ s }: { s: Session }) {
  const secs = s.selection.sections.map((id) => s.model.sections[id]).filter((x): x is SectionData => !!x);
  if (!secs.length) return null;
  const only = secs.length === 1 && s.selection.walls.length === 0 ? secs[0] : undefined;
  const remove = () => s.run('selection.delete', { sectionIds: s.selection.sections });
  return (
    <>
      {only && <SelectedOne key={only.id} s={s} sec={only} />}
      <section>
        <button data-testid="section-delete" onClick={remove}>
          Smazat řez <kbd>Del</kbd>
        </button>
      </section>
    </>
  );
}
