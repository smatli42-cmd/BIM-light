// Info box vybrané střechy (S1, názvy podle panelu Střecha v Arditu): typ, ref. čára nad podlahou podlaží
// a absolutně, skladba a tloušťka kolmo, přesah, úhel okapu, okap abs. (jen ke čtení), sklon všech hran,
// stav a smazání. Plný nástroj Střecha (kreslení, předvolby, úpravy hran klikem) je krok S2.
import {
  EAVE_CUTS,
  roofGeometry,
  roofLayerOffsets,
  roofLayers,
  type EaveCut,
  type Roof,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { NumberInput } from '../NumberInput.tsx';
import { STATUS_LABELS } from './NewStatus.tsx';
import { Section } from './Section.tsx';

const CUT_LABEL: Record<EaveCut, string> = {
  vertical: 'svisle',
  perpendicular: 'kolmo',
  horizontal: 'vodorovně',
};
const level = (mm: number) => `${mm >= 0 ? '+' : '−'}${(Math.abs(mm) / 1000).toFixed(3).replace('.', ',')}`;
const m2 = (mm2: number) => `${(mm2 / 1e6).toFixed(2).replace('.', ',')} m²`;

function Row({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div class="ib-row">
      <span class="muted">{label}</span>
      <strong data-testid={testid}>{value}</strong>
    </div>
  );
}

/** Hrany obrysu: sklon / štít, sklon a přesah (hrana i = bod i → i+1). */
function EdgesSection({ s, roof }: { s: Session; roof: Roof }) {
  const set = (i: number, p: Record<string, unknown>) =>
    s.run('roof.setEdge', { roofId: roof.id, indices: [i], ...p });
  return (
    <Section
      title="Hrany"
      info="Každá hrana obrysu: sklon (okap) nebo štít, sklon a přesah. Hřebeny se dopočítají."
    >
      {roof.edges.map((e, i) => (
        <div class="ib-row" key={i} data-testid={`roof-edge-${i}`}>
          <select
            data-testid={`roof-edge-kind-${i}`}
            value={e.kind}
            onChange={(ev) => set(i, { kind: ev.currentTarget.value })}
          >
            <option value="slope">{i + 1}: sklon</option>
            <option value="gable">{i + 1}: štít</option>
          </select>
          {e.kind === 'slope' && (
            <NumberInput
              testid={`roof-edge-slope-${i}`}
              value={e.slope}
              onSet={(v) => set(i, { slope: v })}
            />
          )}
        </div>
      ))}
    </Section>
  );
}

type Update = (p: Record<string, unknown>) => void;

function Select(p: {
  label: string;
  testid: string;
  value: string;
  options: [string, string][];
  on: (v: string) => void;
}) {
  return (
    <label>
      {p.label}
      <select data-testid={p.testid} value={p.value} onChange={(e) => p.on(e.currentTarget.value)}>
        {p.options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Num(p: { label: string; testid: string; value: number; on: (v: number) => void }) {
  return (
    <label>
      {p.label}
      <NumberInput testid={p.testid} value={p.value} onSet={p.on} />
    </label>
  );
}

const single = (xs: readonly number[]) => (new Set(xs).size === 1 ? (xs[0] as number) : 0);

/** Geometrie (Ardit „Střecha“): sklon, ref. čára, přesah, úhel okapu, okap (abs.) jen ke čtení. */
function GeometrySection({ s, roof, update }: { s: Session; roof: Roof; update: Update }) {
  const g = roofGeometry(s.model, roof);
  const eave = g.planes.length ? Math.min(...g.planes.map((p) => p.eaveZ)) : g.refZ;
  const slopes = roof.edges.filter((e) => e.kind === 'slope').map((e) => e.slope);
  const cuts = EAVE_CUTS.map((c): [string, string] => [c, CUT_LABEL[c]]);
  return (
    <Section title="Geometrie" info="Referenční čára = spodní líc nosné vrstvy (krokví) v obrysu střechy.">
      <Num
        label={new Set(slopes).size > 1 ? 'Sklon (°, všechny hrany; teď různé)' : 'Sklon (°, všechny hrany)'}
        testid="roof-slope"
        value={single(slopes)}
        on={(v) => update({ slope: v })}
      />
      <Num
        label="Ref. čára nad podlahou podlaží (mm)"
        testid="roof-ref"
        value={roof.refOffset}
        on={(v) => update({ refOffset: v })}
      />
      <Row label="Ref. čára (abs.)" value={level(g.refZ)} testid="roof-ref-abs" />
      <Num
        label="Přesah (mm)"
        testid="roof-overhang"
        value={single(roof.edges.map((e) => e.overhang))}
        on={(v) => update({ overhang: v })}
      />
      <Select
        label="Úhel okapu"
        testid="roof-eave-cut"
        value={roof.eaveCut}
        options={cuts}
        on={(v) => update({ eaveCut: v })}
      />
      <Row label="Okap (abs.)" value={level(eave)} testid="roof-eave-abs" />
    </Section>
  );
}

/** Skladba typu: název, tloušťka kolmo k rovině, počet a plocha rovin. */
function CompositionSection({ s, roof }: { s: Session; roof: Roof }) {
  const g = roofGeometry(s.model, roof);
  const offsets = roofLayerOffsets(roofLayers(s.model, roof));
  const type = s.model.roofTypes[roof.typeId];
  const comp = type && s.model.compositions[type.compositionId];
  const thick = Math.round((offsets.at(-1) ?? 0) - (offsets[0] ?? 0));
  const area = m2(g.planes.reduce((a, p) => a + p.area, 0));
  return (
    <Section title="Skladba" info="Tloušťka kolmo k rovině střechy; nosná vrstva = krokve s izolací.">
      <Row label="Skladba" value={comp?.name ?? '?'} />
      <Row label="Tloušťka kolmo" value={`${thick} mm`} testid="roof-thickness" />
      <Row label="Roviny" value={`${g.planes.length} (${area})`} testid="roof-planes" />
    </Section>
  );
}

export function SelectedRoofInfo({ s, roof }: { s: Session; roof: Roof }) {
  const update: Update = (p) => s.run('roof.update', { roofIds: [roof.id], ...p });
  const types = Object.values(s.model.roofTypes).map((t): [string, string] => [t.id, `${t.mark} ${t.name}`]);
  return (
    <>
      <h2 data-testid="sel-roof">Střecha</h2>
      <Select
        label="Typ"
        testid="roof-type"
        value={roof.typeId}
        options={types}
        on={(v) => update({ typeId: v })}
      />
      <GeometrySection s={s} roof={roof} update={update} />
      <CompositionSection s={s} roof={roof} />
      <EdgesSection s={s} roof={roof} />
      <Select
        label="Stav (fáze)"
        testid="roof-status"
        value={roof.status}
        options={STATUS_LABELS}
        on={(v) => update({ status: v })}
      />
      <button data-testid="roof-delete" onClick={() => s.run('selection.delete', { roofIds: [roof.id] })}>
        Smazat <kbd>Del</kbd>
      </button>
    </>
  );
}

/** Více vybraných střech: počet a smazání. */
export function SelectedRoofsInfo({ s }: { s: Session }) {
  const ids = s.selection.roofs;
  const one = s.selection.roofs.length === 1 ? s.model.elements[ids[0] as string] : undefined;
  if (!ids.length) return null;
  if (one?.category === 'roof') return <SelectedRoofInfo key={one.id} s={s} roof={one} />;
  return (
    <section>
      <h2 data-testid="sel-roofs">Vybrané střechy ({ids.length})</h2>
      <button onClick={() => s.run('selection.delete', { roofIds: ids })}>
        Smazat <kbd>Del</kbd>
      </button>
    </section>
  );
}
