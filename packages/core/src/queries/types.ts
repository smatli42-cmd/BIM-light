// Dotaz = čtení modelu bez změny (doplněk příkazů, základy 6 a 15). Popis na jednom místě slouží
// AI (MCP) i budoucím panelům; dotaz nikdy nemění model a nejde do Undo.
import type { Model } from '../model/types.ts';
import type { JsonSchema } from '../commands/schema.ts';

export interface QueryDef<P = never, R = unknown> {
  /** Technický název, např. „wall.list“. */
  readonly name: string;
  readonly label: string;
  /** Popis pro AI: co dotaz vrací a v jakých jednotkách. */
  readonly description: string;
  readonly group: string;
  readonly params: JsonSchema;
  /** Přečte model; chybu hlásí přes `fail` (stejně jako příkazy). */
  readonly run: (model: Model, params: P) => R;
}

/** Pomocník pro zápis definice se správným typem parametrů. */
export const defineQuery = <P, R>(def: QueryDef<P, R>): QueryDef<P, R> => def;
