// Nástroj Střecha bez výběru: výchozí nastavení nových střech (S2; názvy podle panelu Střecha v Arditu):
// konstrukční metoda, tvar, sklon, ref. čára nad podlahou podlaží a absolutně, přesah, úhel okapu, okap
// abs. a tloušťka kolmo jen ke čtení, skladba (typ), vrstva, stav. Polovalbová přijde s výškou zlomu.
import { EAVE_CUTS, layerForCategory, roofLayerOffsets, type EaveCut, type RoofShape } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { roofDefaults, type RoofMethod } from '../../session/roof-defaults.ts';
import { IconButton } from '../icons/Icon.tsx';
import type { IconName } from '../icons/paths.ts';
import { NumberInput } from '../NumberInput.tsx';
import { NewStatusField } from './NewStatus.tsx';
import { Section } from './Section.tsx';

const METHODS: readonly [RoofMethod, IconName, string][] = [
  ['polygon', 'slab-polygon', 'Mnohoúhelník'],
  ['rect', 'slab-rect', 'Obdélník'],
  ['rotated', 'slab-rotated', 'Natočený obdélník'],
  [
    'building',
    'roof-building',
    'Podle obrysu budovy (klik do budovy; ref. čára = vnější líc nosné vrstvy stěn)',
  ],
];
const SHAPES: readonly [RoofShape, IconName, string][] = [
  ['shed', 'roof-shed', 'Pultová (okap na první hraně, ostatní štíty)'],
  ['gable', 'roof-gable', 'Sedlová (štíty na kratších hranách obdélníku)'],
  ['hip', 'roof-hip', 'Valbová'],
  ['halfhip', 'roof-halfhip', 'Polovalbová (kratší hrany: štít do výšky zlomu, nad ním valba)'],
];
const CUT_LABEL: Record<EaveCut, string> = {
  vertical: 'svisle',
  perpendicular: 'kolmo',
  horizontal: 'vodorovně',
};
const level = (mm: number) => `${mm >= 0 ? '+' : '−'}${(Math.abs(mm) / 1000).toFixed(3).replace('.', ',')}`;

function Row({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div class="ib-row">
      <span class="muted">{label}</span>
      <strong data-testid={testid}>{value}</strong>
    </div>
  );
}

function Buttons<T extends string>(p: {
  items: readonly [T, IconName, string][];
  value: T;
  testid: string;
  on: (v: T) => void;
}) {
  return (
    <div class="ib-buttons" data-testid={p.testid}>
      {p.items.map(([v, icon, label]) => (
        <IconButton
          key={v}
          icon={icon}
          label={label}
          testid={`${p.testid}-${v}`}
          pressed={p.value === v}
          onClick={() => p.on(v)}
        />
      ))}
    </div>
  );
}

/** Geometrie nové střechy: sklon, ref. čára, přesah, úhel okapu; okap abs. se spočítá. */
function Geometry({ s }: { s: Session }) {
  const d = roofDefaults(s);
  const set = (fn: () => void) => (fn(), s.changed());
  const ref = (s.model.storeys[s.storeyId]?.elevation ?? 0) + d.refOffset;
  const eave = ref - d.overhang * Math.tan((d.slope * Math.PI) / 180);
  return (
    <Section
      title="Geometrie"
      info="Referenční čára = spodní líc nosné vrstvy (krokví), obvykle vnější líc zdi."
    >
      <label>
        Sklon (°)
        <NumberInput testid="new-roof-slope" value={d.slope} onSet={(v) => set(() => (d.slope = v))} />
      </label>
      <label>
        Ref. čára nad podlahou podlaží (mm)
        <NumberInput testid="new-roof-ref" value={d.refOffset} onSet={(v) => set(() => (d.refOffset = v))} />
      </label>
      <Row label="Ref. čára (abs.)" value={level(ref)} testid="new-roof-ref-abs" />
      <label>
        Přesah (mm)
        <NumberInput
          testid="new-roof-overhang"
          value={d.overhang}
          onSet={(v) => set(() => (d.overhang = v))}
        />
      </label>
      <label>
        Úhel okapu
        <select
          data-testid="new-roof-eave-cut"
          value={d.eaveCut}
          onChange={(e) => set(() => (d.eaveCut = e.currentTarget.value as EaveCut))}
        >
          {EAVE_CUTS.map((c) => (
            <option key={c} value={c}>
              {CUT_LABEL[c]}
            </option>
          ))}
        </select>
      </label>
      <Row label="Okap (abs.)" value={level(eave)} testid="new-roof-eave-abs" />
    </Section>
  );
}

/** Skladba: typ střechy, tloušťka kolmo k rovině (ze skladby), vrstva výkresu. */
function Construction({ s }: { s: Session }) {
  const d = roofDefaults(s);
  const t = s.model.roofTypes[d.typeId];
  const layers = (t && s.model.compositions[t.compositionId]?.layers) || [];
  const off = roofLayerOffsets(layers);
  const thick = Math.round((off.at(-1) ?? 0) - (off[0] ?? 0));
  return (
    <Section
      title="Skladba"
      info="Typ střechy = skladba vrstev; nosná vrstva (krokve) nese referenční rovinu."
    >
      <label>
        Typ
        <select
          data-testid="new-roof-type"
          value={d.typeId}
          onChange={(e) => ((d.typeId = e.currentTarget.value), s.changed())}
        >
          {Object.values(s.model.roofTypes).map((x) => (
            <option key={x.id} value={x.id}>
              {x.mark} {x.name}
            </option>
          ))}
        </select>
      </label>
      <Row label="Tloušťka kolmo" value={`${thick} mm`} testid="new-roof-thickness" />
      <Row label="Vrstva" value={layerForCategory(s.model.display, 'roof')?.name ?? ''} />
    </Section>
  );
}

export function NewRoofInfo({ s }: { s: Session }) {
  const d = roofDefaults(s);
  return (
    <>
      <Section title="Konstrukční metoda">
        <Buttons
          items={METHODS}
          value={d.method}
          testid="roof-method"
          on={(v) => ((d.method = v), s.setTool('roof'))}
        />
      </Section>
      <Section title="Tvar" info="Předvolba hran; po vytvoření jde každou hranu přepnout na sklon nebo štít.">
        <Buttons
          items={SHAPES}
          value={d.shape}
          testid="roof-shape"
          on={(v) => ((d.shape = v), s.changed())}
        />
      </Section>
      <Geometry s={s} />
      <Construction s={s} />
      <Section title="Vlastnosti">
        <NewStatusField s={s} />
      </Section>
    </>
  );
}
