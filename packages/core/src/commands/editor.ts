// Editor: spouští příkazy, drží Undo / Redo a hlídá zámky (základ 6, katalog kreslení část 4).
// Každý úspěšný příkaz = jeden krok zpět. Model je neměnný, snímek je předchozí model.
import { describeViolation, lockViolations } from '../constraints/locks.ts';
import type { IdGenerator } from '../ids/index.ts';
import { followOpenings } from '../opening/follow.ts';
import { describeOpeningViolation, openingViolations } from '../opening/validate.ts';
import { MAIN_MODEL, type Model, type VariantRef } from '../model/types.ts';
import type { CommandRegistry } from './registry.ts';
import { validate } from './schema.ts';
import { CommandFailure, type CommandError, type CommandResult } from './types.ts';

export type QueryResult =
  { readonly ok: true; readonly data: unknown } | { readonly ok: false; readonly error: CommandError };

export type ExecuteResult =
  | { readonly ok: true; readonly created: readonly string[] }
  | { readonly ok: false; readonly error: CommandError };

interface HistoryEntry {
  readonly label: string;
  readonly before: Model;
  readonly after: Model;
}

export interface EditorOptions {
  readonly registry: CommandRegistry;
  readonly newId: IdGenerator;
  readonly variant?: VariantRef;
  readonly historyLimit?: number;
}

export class Editor {
  private current: Model;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private readonly listeners = new Set<(m: Model) => void>();
  variant: VariantRef;

  constructor(
    model: Model,
    private readonly options: EditorOptions,
  ) {
    this.current = model;
    this.variant = options.variant ?? MAIN_MODEL;
  }

  get model(): Model {
    return this.current;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Názvy kroků pro Undo (nejnovější poslední). */
  get history(): string[] {
    return this.undoStack.map((h) => h.label);
  }

  subscribe(fn: (m: Model) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Spustí příkaz podle jména s parametry v JSON. Při chybě se model nezmění. */
  execute(name: string, params: unknown): ExecuteResult {
    const def = this.options.registry.get(name);
    if (!def) return { ok: false, error: { code: 'unknown-command', message: `Neznámý příkaz ${name}` } };
    const problems = validate(def.params, params);
    if (problems.length)
      return { ok: false, error: { code: 'invalid-params', message: problems.join('; ') } };
    let result: CommandResult;
    try {
      result = def.run(this.current, params, { newId: this.options.newId, variant: this.variant });
    } catch (e) {
      if (e instanceof CommandFailure) return { ok: false, error: { code: e.code, message: e.message } };
      throw e;
    }
    const model = followOpenings(this.current, result.model);
    const violations = lockViolations(model);
    const first = violations[0];
    if (first) {
      const dimensionIds = violations.map((v) => v.dimensionId);
      return {
        ok: false,
        error: { code: 'lock-violation', message: describeViolation(first), dimensionIds },
      };
    }
    const bad = openingViolations(this.current, model)[0];
    if (bad) return { ok: false, error: { code: 'invalid', message: describeOpeningViolation(bad) } };
    this.commit(def.label, model);
    return { ok: true, created: result.created ?? [] };
  }

  /**
   * Zkušební běh příkazu: vrátí model po změně, ale nic neuloží (náhled při tažení myší).
   * Chyba nebo porušený zámek = null.
   */
  preview(name: string, params: unknown): Model | null {
    const def = this.options.registry.get(name);
    if (!def || validate(def.params, params).length) return null;
    try {
      const run = def.run(this.current, params, { newId: this.options.newId, variant: this.variant }).model;
      const m = followOpenings(this.current, run);
      return lockViolations(m).length || openingViolations(this.current, m).length ? null : m;
    } catch (e) {
      if (e instanceof CommandFailure) return null;
      throw e;
    }
  }

  /** Spustí dotaz (jen čtení, bez Undo) podle jména s parametry v JSON. */
  query(name: string, params: unknown): QueryResult {
    const def = this.options.registry.getQuery(name);
    if (!def) return { ok: false, error: { code: 'unknown-command', message: `Neznámý dotaz ${name}` } };
    const problems = validate(def.params, params);
    if (problems.length)
      return { ok: false, error: { code: 'invalid-params', message: problems.join('; ') } };
    try {
      return { ok: true, data: def.run(this.current, params) };
    } catch (e) {
      if (e instanceof CommandFailure) return { ok: false, error: { code: e.code, message: e.message } };
      throw e;
    }
  }

  private commit(label: string, after: Model) {
    this.undoStack.push({ label, before: this.current, after });
    if (this.undoStack.length > (this.options.historyLimit ?? 200)) this.undoStack.shift();
    this.redoStack = [];
    this.set(after);
  }

  undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    this.redoStack.push(entry);
    this.set(entry.before);
    return true;
  }

  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.undoStack.push(entry);
    this.set(entry.after);
    return true;
  }

  /** Nahradí celý model (otevření souboru); historie se smaže. */
  load(model: Model) {
    this.undoStack = [];
    this.redoStack = [];
    this.set(model);
  }

  private set(model: Model) {
    this.current = model;
    for (const fn of this.listeners) fn(model);
  }
}
