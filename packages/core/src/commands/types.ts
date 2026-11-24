// Příkaz = jediná cesta do dat (základ 6). Popis na jednom místě slouží tlačítkům, menu,
// propiskám, vyhledávání (Ctrl+K) i nástrojům pro AI (základ 15).
import type { Id, IdGenerator } from '../ids/index.ts';
import type { Model, VariantRef } from '../model/types.ts';
import type { JsonSchema } from './schema.ts';

export interface CommandContext {
  readonly newId: IdGenerator;
  /** Do které varianty příkaz zapisuje (základ 6). */
  readonly variant: VariantRef;
}

export type CommandErrorCode =
  'unknown-command' | 'invalid-params' | 'not-found' | 'invalid' | 'lock-violation';

export interface CommandError {
  readonly code: CommandErrorCode;
  readonly message: string;
  /** Kóty, které změně brání (zvýrazní se v UI). */
  readonly dimensionIds?: readonly Id[];
}

export interface CommandResult {
  readonly model: Model;
  /** Id nově vytvořených objektů (v pořadí vzniku). */
  readonly created?: readonly Id[];
}

export interface CommandDef<P = never> {
  /** Technický název, např. „wall.create“. */
  readonly name: string;
  /** Text tlačítka / položky menu. */
  readonly label: string;
  /** Propiska a popis pro AI. */
  readonly description: string;
  /** Skupina v menu (Stěna, Kóta, Zobrazení…). */
  readonly group: string;
  readonly icon?: string;
  readonly shortcut?: string;
  readonly params: JsonSchema;
  /** Provede změnu nad neměnným modelem a vrátí nový. Chybu hlásí přes `fail`. */
  readonly run: (model: Model, params: P, ctx: CommandContext) => CommandResult;
}

/** Chyba vyhozená z příkazu; editor ji převede na odmítnutí bez změny modelu. */
export class CommandFailure extends Error {
  constructor(
    readonly code: CommandErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function fail(code: CommandErrorCode, message: string): never {
  throw new CommandFailure(code, message);
}

/** Pomocník pro zápis definice se správným typem parametrů. */
export const defineCommand = <P>(def: CommandDef<P>): CommandDef<P> => def;
