// Formulář generovaný z popisu parametrů příkazu (základ 15b): typ pole podle JSON schématu,
// popisek z popisu. Přidání vlastnosti = záznam v popisu, ne nové pole v UI.
import type { JsonSchema } from '@bim-light/core';

export interface FieldOption {
  readonly value: string;
  readonly label: string;
}

interface Props {
  readonly fields: Readonly<Record<string, JsonSchema>>;
  readonly labels: Readonly<Record<string, string>>;
  readonly value: Readonly<Record<string, unknown>>;
  /** Pole s vlastním seznamem možností (např. šrafa z knihovny). */
  readonly options?: Readonly<Record<string, readonly FieldOption[]>>;
  /** Odvozené hodnoty pro pole s null (např. 2D barvy z barvy materiálu). */
  readonly derived?: Readonly<Record<string, string>>;
  readonly onChange: (key: string, value: unknown) => void;
}

const isColor = (s: JsonSchema) => /barva/.test(s.description ?? '') && !s.enum;
const nullable = (s: JsonSchema) => !!s.oneOf?.some((x) => x.type === 'null');

/** Barva; u pole s null ukáže odvozenou barvu a tlačítko „auto“ vrátí odvozování. */
function ColorField({ k, s, p }: { k: string; s: JsonSchema; p: Props }) {
  const v = p.value[k];
  return (
    <span class="color-field">
      <input
        data-testid={`field-${k}`}
        type="color"
        value={String(v ?? p.derived?.[k] ?? '#000000')}
        onChange={(e) => p.onChange(k, e.currentTarget.value)}
      />
      {nullable(s) && v !== null && (
        <button type="button" onClick={() => p.onChange(k, null)} title="vrátit odvozenou barvu">
          auto
        </button>
      )}
    </span>
  );
}

function Field({ k, s, p }: { k: string; s: JsonSchema; p: Props }) {
  const v = p.value[k];
  const set = (x: unknown) => p.onChange(k, x);
  const opts = p.options?.[k] ?? s.enum?.map((e) => ({ value: String(e), label: String(e) }));
  if (opts)
    return (
      <select data-testid={`field-${k}`} value={String(v ?? '')} onChange={(e) => set(e.currentTarget.value)}>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  if (s.type === 'boolean')
    return (
      <input
        data-testid={`field-${k}`}
        type="checkbox"
        checked={!!v}
        onChange={(e) => set(e.currentTarget.checked)}
      />
    );
  if (isColor(s) || (nullable(s) && isColor(s.oneOf?.[0] ?? {}))) return <ColorField k={k} s={s} p={p} />;
  if (s.type === 'integer' || s.type === 'number')
    return (
      <input
        data-testid={`field-${k}`}
        type="number"
        min={s.minimum}
        max={s.maximum}
        value={Number(v ?? 0)}
        onChange={(e) => set(Number(e.currentTarget.value))}
      />
    );
  return (
    <input data-testid={`field-${k}`} value={String(v ?? '')} onChange={(e) => set(e.currentTarget.value)} />
  );
}

export function SchemaForm(p: Props) {
  return (
    <div class="schema-form">
      {Object.entries(p.fields).map(([k, s]) => (
        <label key={k}>
          {p.labels[k] ?? k}
          <Field k={k} s={s} p={p} />
        </label>
      ))}
    </div>
  );
}
