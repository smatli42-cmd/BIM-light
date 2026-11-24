// Klient „jako AI“ pro testy: zná jen seznam nástrojů (toolDescriptions) a posílá a dostává JSON.
// Nepoužívá žádné funkce jádra mimo registr, takže test ověří, že AI zvládne totéž co uživatel.
import { createCoreRegistry } from '../commands/all.ts';
import { Editor } from '../commands/editor.ts';
import { sequentialIds } from '../ids/index.ts';
import { createEmptyProject } from '../model/create.ts';

export interface AiCallError {
  readonly code: string;
  readonly message: string;
}

export function aiClient() {
  const registry = createCoreRegistry();
  const newId = sequentialIds();
  const editor = new Editor(createEmptyProject(newId, 'Ukázkový dům'), { registry, newId });
  const tools = JSON.parse(JSON.stringify(registry.toolDescriptions())) as {
    name: string;
    readOnly: boolean;
  }[];
  /** Zavolá nástroj; argumenty i výsledek projdou přes text JSON. */
  function raw(name: string, args: unknown): { ok: boolean; result?: unknown; error?: AiCallError } {
    const tool = tools.find((t) => t.name === name);
    if (!tool) return { ok: false, error: { code: 'unknown-tool', message: `Nástroj ${name} neexistuje` } };
    const params: unknown = JSON.parse(JSON.stringify(args));
    const r = tool.readOnly ? editor.query(name, params) : editor.execute(name, params);
    const out = r.ok ? { ok: true, result: 'data' in r ? r.data : r.created } : { ok: false, error: r.error };
    return JSON.parse(JSON.stringify(out)) as { ok: boolean; result?: unknown; error?: AiCallError };
  }
  /** Zavolá nástroj a při chybě test shodí s čitelnou zprávou. */
  function call<T = unknown>(name: string, args: unknown = {}): T {
    const r = raw(name, args);
    if (!r.ok) throw new Error(`${name}: ${r.error?.message}`);
    return r.result as T;
  }
  return { tools, raw, call };
}
