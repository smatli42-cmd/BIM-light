// Info box desky (D2; podle Arditu „Deska – výchozí nastavení“, koncepce rozhraní 2 D): typ, geometrická
// metoda, konstrukce (skladba, tloušťka, vrstvy), referenční rovina, horní líc k podlaží, vlastnosti.
// Vybrané desky: typ, horní líc, funkce, výšky líců, plocha a obvod, smazání.
import {
  defaultTopOffset,
  formatLength,
  slabArea,
  slabLevels,
  slabPerimeter,
  SLAB_FUNCTIONS,
  type Slab,
  type SlabFunction,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import type { IconName } from '../icons/paths.ts';
import { NumberInput } from '../NumberInput.tsx';
import { openTypeEditor } from '../type-editor/TypeEditorDialog.tsx';
import { NewStatusField } from './NewStatus.tsx';
import { Section } from './Section.tsx';
import { SlabLinkSection } from './SlabLinkSection.tsx';
import type { SlabMethod } from '../../session/slab-defaults.ts';

const METHODS: readonly [SlabMethod, IconName, string][] = [
  ['polygon', 'slab-polygon', 'Mnohoúhelník'],
  ['rect', 'slab-rect', 'Obdélník'],
  ['rotated', 'slab-rotated', 'Natočený obdélník'],
  ['walls', 'slab-walls', 'Podle stěn (klik na stěny)'],
  ['room', 'slab-room', 'Podle místnosti (podlaha klikem do místnosti)'],
];
const FN_LABEL: Record<SlabFunction, string> = { structure: 'Nosná deska (strop)', floor: 'Skladba podlahy' };
const m2 = (mm2: number) => `${(mm2 / 1e6).toFixed(2).replace('.', ',')} m²`;
const m = (mm: number) => `${(mm / 1000).toFixed(2).replace('.', ',')} m`;
const level = (mm: number) => `${mm >= 0 ? '+' : '−'}${(Math.abs(mm) / 1000).toFixed(3).replace('.', ',')}`;

function Row({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div class="ib-row">
      <span class="muted">{label}</span>
      <strong data-testid={testid}>{value}</strong>
    </div>
  );
}

function SlabTypeSelect(p: { s: Session; value: string; testid: string; onPick: (id: string) => void }) {
  return (
    <label>
      Typ
      <select data-testid={p.testid} value={p.value} onChange={(e) => p.onPick(e.currentTarget.value)}>
        {p.value === '' && <option value="">(různé)</option>}
        {Object.values(p.s.model.slabTypes).map((t) => (
          <option key={t.id} value={t.id}>
            {t.mark} {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Konstrukce: skladba, tloušťka a vrstvy shora dolů (v datech jsou zdola). */
function Construction({ s, typeId }: { s: Session; typeId: string }) {
  const t = s.model.slabTypes[typeId];
  const c = t && s.model.compositions[t.compositionId];
  if (!t || !c) return null;
  const total = c.layers.reduce((a, l) => a + l.thickness, 0);
  return (
    <Section title="Konstrukce" info="Skladba typu; vrstvy shora dolů. Tloušťka jde od horního líce dolů.">
      <Row label="Skladba" value={c.name} />
      <Row label="Tloušťka (součet vrstev)" value={`${total} mm`} testid="slab-thickness" />
      {[...c.layers].reverse().map((l, i) => (
        <Row key={i} label={s.model.materials[l.materialId]?.name ?? '?'} value={`${l.thickness} mm`} />
      ))}
      <Row label="Ref. rovina" value="horní líc" />
      <Row label="Funkce" value={FN_LABEL[t.slabFunction]} />
      <label class="check">
        <input type="checkbox" checked={t.loadBearing} disabled />
        Nosný (LoadBearing)
      </label>
      <button data-testid="open-slab-type-editor" onClick={() => openTypeEditor(s, t.id)}>
        Upravit v editoru typů…
      </button>
    </Section>
  );
}

/** Geometrická metoda; u metody „podle stěn“ i to, po kterém líci obrys vede. */
function MethodSection({ s }: { s: Session }) {
  const d = s.slab;
  const set = (fn: () => void) => (fn(), s.changed());
  return (
    <Section title="Geometrická metoda">
      <div class="ib-buttons" data-testid="slab-method">
        {METHODS.map(([v, icon, label]) => (
          <IconButton
            key={v}
            icon={icon}
            label={label}
            testid={`slab-method-${v}`}
            pressed={d.method === v}
            onClick={() => ((d.method = v), s.setTool('slab'))}
          />
        ))}
      </div>
      {d.method === 'walls' && (
        <label>
          Obrys vede po
          <select
            data-testid="slab-boundary"
            value={d.boundary}
            onChange={(e) => set(() => (d.boundary = e.currentTarget.value as 'face' | 'core'))}
          >
            <option value="face">vnitřním líci stěn</option>
            <option value="core">líci nosného jádra</option>
          </select>
        </label>
      )}
    </Section>
  );
}

/** Nástroj Deska bez výběru: výchozí nastavení nových desek. */
export function NewSlabInfo({ s }: { s: Session }) {
  const d = s.slab;
  const set = (fn: () => void) => (fn(), s.changed());
  const type = s.model.slabTypes[d.typeId];
  const top = d.topOffset ?? (type ? defaultTopOffset(type.slabFunction) : 0);
  return (
    <>
      <SlabTypeSelect
        s={s}
        value={d.typeId}
        testid="new-slab-type"
        onPick={(id) => set(() => (d.typeId = id))}
      />
      <MethodSection s={s} />
      <Construction s={s} typeId={d.typeId} />
      <Section title="Umístění" info="Horní líc desky nad úrovní podlaží (čistá podlaha). Záporně = pod.">
        <label>
          Horní hrana k podlaží (mm)
          <NumberInput testid="new-slab-top" value={top} onSet={(v) => set(() => (d.topOffset = v))} />
        </label>
        <NewStatusField s={s} />
      </Section>
    </>
  );
}

/** Údaje jedné desky spočítané z modelu: výšky líců, tloušťka, plocha (bez ostrovů), obvod. */
function FromModel({ s, slab }: { s: Session; slab: Slab }) {
  const lv = slabLevels(s.model, slab);
  return (
    <Section title="Z modelu">
      <Row label="Horní líc" value={level(lv.top)} testid="slab-top-level" />
      <Row label="Spodní líc" value={level(lv.bottom)} />
      <Row label="Tloušťka" value={formatLength(lv.thickness)} />
      <Row label="Plocha" value={m2(slabArea(slab))} testid="slab-area" />
      <Row label="Obvod" value={m(slabPerimeter(slab))} />
    </Section>
  );
}

/** Vybrané desky: vlastnosti instance a údaje z modelu. */
export function SelectedSlabsInfo({ s, slabs }: { s: Session; slabs: readonly Slab[] }) {
  const ids = slabs.map((x) => x.id);
  const same = <T,>(f: (x: Slab) => T): T | undefined =>
    slabs.every((x) => f(x) === f(slabs[0] as Slab)) ? f(slabs[0] as Slab) : undefined;
  const update = (p: Record<string, unknown>) => s.run('slab.update', { slabIds: ids, ...p });
  const one = slabs.length === 1 ? slabs[0] : undefined;
  const typeId = same((x) => x.typeId) ?? '';
  return (
    <>
      <h2 data-testid="sel-slabs">Vybrané desky ({slabs.length})</h2>
      <SlabTypeSelect s={s} value={typeId} testid="slab-type" onPick={(id) => update({ typeId: id })} />
      <label>
        Horní hrana k podlaží (mm)
        <NumberInput
          testid="slab-top"
          value={same((x) => x.topOffset) ?? 0}
          onSet={(v) => update({ topOffset: v })}
        />
      </label>
      <label>
        Funkce
        <select
          data-testid="slab-function"
          value={same((x) => x.slabFunction) ?? ''}
          onChange={(e) => update({ slabFunction: e.currentTarget.value })}
        >
          {SLAB_FUNCTIONS.map((f) => (
            <option key={f} value={f}>
              {FN_LABEL[f]}
            </option>
          ))}
        </select>
      </label>
      {one && <FromModel s={s} slab={one} />}
      {one && <SlabLinkSection s={s} slab={one} />}
      {typeId && <Construction s={s} typeId={typeId} />}
      <button data-testid="slab-delete" onClick={() => s.run('selection.delete', { slabIds: ids })}>
        Smazat <kbd>Del</kbd>
      </button>
    </>
  );
}
