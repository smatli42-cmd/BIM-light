// Registr příkazů (základ 15a): z něj vznikají tlačítka, menu, propisky, Ctrl+K i nástroje pro AI.
import type { QueryDef } from '../queries/types.ts';
import type { CommandDef } from './types.ts';
import type { JsonSchema } from './schema.ts';

// Registr drží příkazy s různými typy parametrů; volání jde vždy přes kontrolu schématu.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyCommand = CommandDef<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyQuery = QueryDef<any, unknown>;

/** Nástroj pro AI: příkaz (mění model, jde do Undo) nebo dotaz (jen čte). */
export interface ToolDescription {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly readOnly: boolean;
}

export class CommandRegistry {
  private readonly commands = new Map<string, AnyCommand>();
  private readonly queries = new Map<string, AnyQuery>();

  register(def: AnyCommand): this {
    if (this.commands.has(def.name) || this.queries.has(def.name))
      throw new Error(`Příkaz ${def.name} je už zaregistrovaný`);
    this.commands.set(def.name, def);
    return this;
  }

  registerQuery(def: AnyQuery): this {
    if (this.commands.has(def.name) || this.queries.has(def.name))
      throw new Error(`Dotaz ${def.name} je už zaregistrovaný`);
    this.queries.set(def.name, def);
    return this;
  }

  getQuery(name: string): AnyQuery | undefined {
    return this.queries.get(name);
  }

  listQueries(): AnyQuery[] {
    return [...this.queries.values()];
  }

  get(name: string): AnyCommand | undefined {
    return this.commands.get(name);
  }

  list(): AnyCommand[] {
    return [...this.commands.values()];
  }

  /** Vyhledávání příkazů (Ctrl+K): v názvu, popisu i technickém jméně. */
  search(text: string): AnyCommand[] {
    const q = text.trim().toLowerCase();
    if (!q) return this.list();
    return this.list().filter((c) =>
      [c.name, c.label, c.description, c.group].some((s) => s.toLowerCase().includes(q)),
    );
  }

  /** Popis nástrojů pro AI (MCP): příkazy i dotazy, název, popis, schéma parametrů a zda jen čtou. */
  toolDescriptions(): ToolDescription[] {
    const tool = (c: AnyCommand | AnyQuery, readOnly: boolean) => ({
      name: c.name,
      description: c.description,
      inputSchema: c.params,
      readOnly,
    });
    return [...this.listQueries().map((q) => tool(q, true)), ...this.list().map((c) => tool(c, false))];
  }
}
