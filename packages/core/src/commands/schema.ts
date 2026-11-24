// Malá podmnožina JSON Schema pro popis parametrů příkazů (základy 6, 15).
// Z popisu vzniká kontrola parametrů, panel vlastností i seznam nástrojů pro AI.

export type JsonType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';

export interface JsonSchema {
  readonly type?: JsonType;
  readonly description?: string;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly items?: JsonSchema;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly enum?: readonly (string | number | boolean | null)[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly oneOf?: readonly JsonSchema[];
}

function typeOf(v: unknown): JsonType {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v as JsonType;
}

const typeMatches = (want: JsonType, got: JsonType) =>
  want === got || (want === 'number' && got === 'integer');

function checkNumber(s: JsonSchema, v: number, at: string, out: string[]) {
  if (!Number.isFinite(v)) out.push(`${at}: musí být konečné číslo`);
  if (s.minimum !== undefined && v < s.minimum) out.push(`${at}: nejméně ${s.minimum}`);
  if (s.maximum !== undefined && v > s.maximum) out.push(`${at}: nejvýš ${s.maximum}`);
  if (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum)
    out.push(`${at}: víc než ${s.exclusiveMinimum}`);
}

function checkObject(s: JsonSchema, v: Record<string, unknown>, at: string, out: string[]) {
  for (const key of s.required ?? []) if (!(key in v)) out.push(`${at}.${key}: chybí`);
  for (const [key, val] of Object.entries(v)) {
    const sub = s.properties?.[key];
    if (sub) validate(sub, val, `${at}.${key}`, out);
    else if (s.additionalProperties === false) out.push(`${at}.${key}: neznámý parametr`);
  }
}

function checkArray(s: JsonSchema, v: unknown[], at: string, out: string[]) {
  if (s.minItems !== undefined && v.length < s.minItems) out.push(`${at}: nejméně ${s.minItems} položek`);
  if (s.maxItems !== undefined && v.length > s.maxItems) out.push(`${at}: nejvýš ${s.maxItems} položek`);
  if (s.items) v.forEach((item, i) => validate(s.items as JsonSchema, item, `${at}[${i}]`, out));
}

/** Zkontroluje hodnotu podle schématu; vrací seznam chyb (prázdný = v pořádku). */
export function validate(s: JsonSchema, v: unknown, at = 'params', out: string[] = []): string[] {
  if (s.oneOf) {
    const ok = s.oneOf.some((alt) => validate(alt, v, at, []).length === 0);
    if (!ok) out.push(`${at}: neodpovídá žádné z povolených podob`);
    return out;
  }
  const t = typeOf(v);
  if (s.type && !typeMatches(s.type, t)) {
    out.push(`${at}: má být ${s.type}, je ${t}`);
    return out;
  }
  if (s.enum && !s.enum.includes(v as string)) out.push(`${at}: povoleno ${s.enum.join(' / ')}`);
  if (t === 'number' || t === 'integer') checkNumber(s, v as number, at, out);
  if (t === 'object') checkObject(s, v as Record<string, unknown>, at, out);
  if (t === 'array') checkArray(s, v as unknown[], at, out);
  return out;
}

// Společné části schémat.
export const S = {
  id: { type: 'string', description: 'GlobalId' } as JsonSchema,
  number: (description: string, extra: Partial<JsonSchema> = {}): JsonSchema => ({
    type: 'number',
    description,
    ...extra,
  }),
  point: {
    type: 'object',
    description: 'Bod v mm',
    required: ['x', 'y'],
    additionalProperties: false,
    properties: { x: { type: 'number' }, y: { type: 'number' } },
  } as JsonSchema,
  object: (properties: Record<string, JsonSchema>, required: string[]): JsonSchema => ({
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  }),
  enumOf: (values: readonly string[], description: string): JsonSchema => ({
    type: 'string',
    enum: values,
    description,
  }),
};

export const PATH_SCHEMA: JsonSchema = {
  description: 'Referenční čára: úsečka, nebo oblouk (bulge = tan(středový úhel/4))',
  oneOf: [
    S.object({ kind: S.enumOf(['line'], 'úsečka'), start: S.point, end: S.point }, ['kind', 'start', 'end']),
    S.object({ kind: S.enumOf(['arc'], 'oblouk'), start: S.point, end: S.point, bulge: { type: 'number' } }, [
      'kind',
      'start',
      'end',
      'bulge',
    ]),
  ],
};
