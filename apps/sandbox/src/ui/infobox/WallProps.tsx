// Vlastnosti stěny v info boxu (plán stěn Z7): pole se generují z popisu parametrů jádra (základ 15b).
// Instance: každé pole nabízí „podle typu“ (bez přepisu) nebo vlastní hodnotu. Typ: hodnoty typu.
import {
  typeProperties,
  wallProperties,
  WALL_PROPERTY_PARAMS,
  type Wall,
  type WallPropertyParam,
  type WallType,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';

const INFO = 'Hodnoty typu platí pro všechny stěny typu; tady je jde přepsat jen u vybraných stěn.';
const BY_TYPE = '__type';
const MIXED = '__mixed';

/** Text hodnoty pro zobrazení (ano / ne, popisek výčtu, „neurčeno“). */
function show(p: WallPropertyParam, v: unknown): string {
  if (typeof v === 'boolean') return v ? 'ano' : 'ne';
  if (p.options) return p.options.find((o) => o.value === v)?.label ?? String(v);
  return String(v ?? '') || 'neurčeno';
}

const choices = (p: WallPropertyParam) =>
  p.options ?? [
    { value: 'true', label: 'ano' },
    { value: 'false', label: 'ne' },
  ];

const parse = (p: WallPropertyParam, v: string) => (p.schema.type === 'boolean' ? v === 'true' : v);

/** Společná hodnota výběru: přepis všech stejný → hodnota; všechny bez přepisu → „podle typu“. */
function common(p: WallPropertyParam, walls: Wall[]): string {
  const vals = walls.map((w) =>
    w.properties && p.key in w.properties ? String(w.properties[p.key]) : BY_TYPE,
  );
  return vals.every((v) => v === vals[0]) ? (vals[0] ?? BY_TYPE) : MIXED;
}

function InstanceField({ s, walls, p }: { s: Session; walls: Wall[]; p: WallPropertyParam }) {
  const ids = walls.map((w) => w.id);
  const typeValue = typeProperties(s.model.wallTypes[(walls[0] as Wall).typeId])[p.key];
  const set = (v: unknown) => s.run('wall.setProperties', { wallIds: ids, properties: { [p.key]: v } });
  const cur = common(p, walls);
  if (p.schema.type === 'string' && !p.options) {
    const value = cur === BY_TYPE || cur === MIXED ? '' : cur;
    return (
      <span class="prop-text">
        <input
          data-testid={`prop-${p.key}`}
          key={`${ids.join()}-${value}`}
          defaultValue={value}
          placeholder={cur === MIXED ? 'různé' : `podle typu: ${show(p, typeValue)}`}
          onKeyDown={(e) => e.key === 'Enter' && set(e.currentTarget.value.trim() || null)}
        />
        {cur !== BY_TYPE && (
          <button type="button" title="vrátit hodnotu typu" onClick={() => set(null)}>
            typ
          </button>
        )}
      </span>
    );
  }
  return (
    <select
      data-testid={`prop-${p.key}`}
      value={cur}
      onChange={(e) => {
        const v = e.currentTarget.value;
        if (v !== MIXED) set(v === BY_TYPE ? null : parse(p, v));
      }}
    >
      {cur === MIXED && <option value={MIXED}>různé</option>}
      <option value={BY_TYPE}>podle typu ({show(p, typeValue)})</option>
      {choices(p).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Instance: vlastnosti vybraných stěn s přepisem proti typu. */
export function WallPropsSection({ s, walls }: { s: Session; walls: Wall[] }) {
  const first = walls[0] as Wall;
  const result = walls.length === 1 ? wallProperties(s.model, first) : null;
  return (
    <Section title="Vlastnosti" info={INFO} testid="wall-props">
      {WALL_PROPERTY_PARAMS.map((p) => (
        <label key={p.key} title={p.description}>
          {p.label}
          <InstanceField s={s} walls={walls} p={p} />
        </label>
      ))}
      {result && (
        <p class="muted" data-testid="props-summary">
          {show(WALL_PROPERTY_PARAMS[0] as WallPropertyParam, result.function)} ·{' '}
          {result.loadBearing ? 'nosná' : 'nenosná'} · {result.isExternal ? 'vnější' : 'vnitřní'}
        </p>
      )}
    </Section>
  );
}

function TypeField({ s, type, p }: { s: Session; type: WallType; p: WallPropertyParam }) {
  const v = typeProperties(type)[p.key];
  const set = (x: unknown) =>
    s.run('wallType.setProperties', { typeId: type.id, properties: { [p.key]: x } });
  if (p.schema.type === 'string' && !p.options)
    return (
      <input
        data-testid={`type-prop-${p.key}`}
        key={`${type.id}-${String(v)}`}
        defaultValue={String(v)}
        placeholder="neurčeno"
        onKeyDown={(e) => e.key === 'Enter' && set(e.currentTarget.value.trim())}
      />
    );
  return (
    <select
      data-testid={`type-prop-${p.key}`}
      value={String(v)}
      onChange={(e) => set(parse(p, e.currentTarget.value))}
    >
      {choices(p).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Typ: vlastnosti typu (platí pro všechny stěny typu bez přepisu). */
export function TypePropsSection({ s, type }: { s: Session; type: WallType }) {
  return (
    <Section
      title="Vlastnosti typu"
      info="Platí pro všechny stěny typu, které hodnotu nepřepisují."
      testid="type-props"
    >
      {WALL_PROPERTY_PARAMS.map((p) => (
        <label key={p.key} title={p.description}>
          {p.label}
          <TypeField s={s} type={type} p={p} />
        </label>
      ))}
    </Section>
  );
}
