// Registr příkazů (základ 15a): z něj vznikají tlačítka, menu, propisky, Ctrl+K i nástroje pro AI.
import type { CommandDef } from './types.ts';
import type { JsonSchema } from './schema.ts';

// Registr drží příkazy s různými typy parametrů; volání jde vždy přes kontrolu schématu.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyCommand = CommandDef<any>;

export class CommandRegistry {
  private readonly commands = new Map<string, AnyCommand>();

  register(def: AnyCommand): this {
    if (this.commands.has(def.name)) throw new Error(`Příkaz ${def.name} je už zaregistrovaný`);
    this.commands.set(def.name, def);
    return this;
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

  /** Popis nástrojů pro AI (MCP): název, popis a schéma parametrů. */
  toolDescriptions(): { name: string; description: string; inputSchema: JsonSchema }[] {
    return this.list().map((c) => ({ name: c.name, description: c.description, inputSchema: c.params }));
  }
}
