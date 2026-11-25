// Pole kritérií panelu Najít a vybrat: rozsah, typ stěny, materiál, ID a název, oblouková stěna,
// rozsahy rozměrů (mm).
import type { Session } from '../../session/session.ts';
import type { FindForm } from './criteria.ts';

type Pair = 'thickness' | 'height' | 'openingWidth';

function RangeRow(props: { label: string; k: Pair; f: FindForm; set: (f: FindForm) => void }) {
  const [a, b] = props.f[props.k];
  const put = (i: 0 | 1, v: string) => {
    const next: [string, string] = i === 0 ? [v, b] : [a, v];
    props.set({ ...props.f, [props.k]: next });
  };
  return (
    <label class="find-row">
      <span>{props.label}</span>
      <span class="range">
        <input data-testid={`find-${props.k}-min`} value={a} onInput={(e) => put(0, e.currentTarget.value)} />
        <span>–</span>
        <input data-testid={`find-${props.k}-max`} value={b} onInput={(e) => put(1, e.currentTarget.value)} />
      </span>
    </label>
  );
}

function SelectRow(props: {
  label: string;
  testid: string;
  value: string;
  items: readonly { id: string; name: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <label class="find-row">
      <span>{props.label}</span>
      <select
        data-testid={props.testid}
        value={props.value}
        onChange={(e) => props.onPick(e.currentTarget.value)}
      >
        <option value="">– jakýkoli –</option>
        {props.items.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
    </label>
  );
}

type Props = { f: FindForm; set: (f: FindForm) => void };

function ScopeRow({ s, f, set }: Props & { s: Session }) {
  return (
    <label class="find-row">
      <span>Rozsah</span>
      <label class="check">
        <input
          type="checkbox"
          data-testid="find-all-storeys"
          checked={f.allStoreys}
          onChange={(e) => set({ ...f, allStoreys: e.currentTarget.checked })}
        />
        Všechna podlaží (jinak {s.model.storeys[s.storeyId]?.name})
      </label>
    </label>
  );
}

function CurvedRow({ f, set }: Props) {
  return (
    <label class="find-row">
      <span>Oblouková stěna</span>
      <select
        data-testid="find-curved"
        value={f.curved}
        onChange={(e) => set({ ...f, curved: e.currentTarget.value as FindForm['curved'] })}
      >
        <option value="">–</option>
        <option value="yes">ano</option>
        <option value="no">ne</option>
      </select>
    </label>
  );
}

export function FindFields({ s, f, set }: { s: Session; f: FindForm; set: (f: FindForm) => void }) {
  const text = (k: 'idContains' | 'nameContains', label: string, hint: string) => (
    <label class="find-row">
      <span>{label}</span>
      <input
        data-testid={`find-${k}`}
        placeholder={hint}
        value={f[k]}
        onInput={(e) => set({ ...f, [k]: e.currentTarget.value })}
      />
    </label>
  );
  return (
    <>
      <ScopeRow s={s} f={f} set={set} />
      <SelectRow
        label="Typ stěny"
        testid="find-type"
        value={f.wallTypeId}
        items={Object.values(s.model.wallTypes)}
        onPick={(wallTypeId) => set({ ...f, wallTypeId })}
      />
      <SelectRow
        label="Materiál"
        testid="find-material"
        value={f.materialId}
        items={Object.values(s.model.materials)}
        onPick={(materialId) => set({ ...f, materialId })}
      />
      {text('idContains', 'ID obsahuje', 'část GlobalId')}
      {text('nameContains', 'Název obsahuje', 'název typu')}
      <CurvedRow f={f} set={set} />
      <RangeRow label="Tloušťka (mm)" k="thickness" f={f} set={set} />
      <RangeRow label="Výška prvku (mm)" k="height" f={f} set={set} />
      <RangeRow label="Šířka otvoru (mm)" k="openingWidth" f={f} set={set} />
    </>
  );
}
