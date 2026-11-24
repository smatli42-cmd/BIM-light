// Vlastní zapisovač textového STEP (ISO 10303-21) pro omezenou sadu entit IFC.
// Hodnoty se skládají z malých pomocníků; čísla jsou vždy reálná (s tečkou), texty se kódují podle IFC
// (apostrof zdvojený, znaky mimo ASCII jako \X2\…\X0\).

/** Hotový kus zápisu (odkaz #n, výčet .X., text '…' …). */
export interface Raw {
  readonly raw: string;
}

/** Argument entity: hotový kus, reálné číslo, chybějící hodnota ($) nebo seznam. */
export type Arg = Raw | number | null | readonly Arg[];

const raw = (s: string): Raw => ({ raw: s });

/** Chybějící hodnota odvozená z nadtypu (*). */
export const DERIVED = raw('*');

/** Výčtová hodnota, např. `.ELEMENT.`. */
export const en = (name: string): Raw => raw(`.${name}.`);

/** Celé číslo (IfcInteger, dimenze). */
export const int = (n: number): Raw => raw(String(Math.round(n)));

/** Logická hodnota. */
export const bool = (v: boolean): Raw => raw(v ? '.T.' : '.F.');

/** Reálné číslo STEP: vždy s tečkou, nejvýš 6 desetinných míst, bez -0. */
export function real(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`Neplatné číslo pro IFC: ${n}`);
  const r = Math.round(n * 1e6) / 1e6;
  return (Object.is(r, -0) ? 0 : r).toFixed(6).replace(/0+$/, '');
}

/** Text STEP s kódováním IFC. */
export function str(text: string): Raw {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === "'") out += "''";
    else if (ch === '\\') out += '\\\\';
    else if (code >= 32 && code < 127) out += ch;
    else {
      let hex = '';
      for (let i = 0; i < ch.length; i++) hex += ch.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
      out += `\\X2\\${hex}\\X0\\`;
    }
  }
  return raw(`'${out}'`);
}

/** Hodnota s typem, např. IFCLABEL('NEW'). */
export const typed = (type: string, value: Raw): Raw => raw(`${type}(${value.raw})`);

function format(a: Arg): string {
  if (a === null) return '$';
  if (typeof a === 'number') return real(a);
  if (Array.isArray(a)) return `(${a.map(format).join(',')})`;
  return (a as Raw).raw;
}

/** Sběrač entit: přidá entitu, vrátí odkaz; na konci složí celý soubor. */
export class StepWriter {
  private readonly lines: string[] = [];

  add(entity: string, args: readonly Arg[]): Raw {
    const id = this.lines.length + 1;
    this.lines.push(`#${id}=${entity.toUpperCase()}(${args.map(format).join(',')});`);
    return raw(`#${id}`);
  }

  get count(): number {
    return this.lines.length;
  }

  /** Celý soubor IFC. `name` = název souboru v hlavičce, `stamp` = čas ISO (kvůli stabilnímu výstupu zvenku). */
  toText(header: { name: string; stamp: string; schema: string }): string {
    return [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION(('ViewDefinition [ReferenceView]'),'2;1');",
      `FILE_NAME(${str(header.name).raw},'${header.stamp}',(''),(''),'BIM-light','BIM-light','');`,
      `FILE_SCHEMA(('${header.schema}'));`,
      'ENDSEC;',
      'DATA;',
      ...this.lines,
      'ENDSEC;',
      'END-ISO-10303-21;',
      '',
    ].join('\n');
  }
}
