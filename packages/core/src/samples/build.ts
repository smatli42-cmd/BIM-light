// Postavení ukázky z receptu: prázdný projekt + příkazy z registru (základ 6). Odmítnutý příkaz
// = chyba receptu (test ji chytí dřív, než ukázka zastará).
import { createCoreRegistry } from '../commands/all.ts';
import { Editor } from '../commands/editor.ts';
import type { IdGenerator } from '../ids/index.ts';
import { createEmptyProject } from '../model/create.ts';
import type { Model } from '../model/types.ts';
import type { Sample, SampleContext } from './types.ts';

const byName = <T extends { id: string; name: string }>(
  items: Record<string, T>,
  name: string,
  what: string,
) => Object.values(items).find((x) => x.name === name)?.id ?? fail(`${what} „${name}“ v projektu není`);

function fail(message: string): never {
  throw new Error(`Ukázka: ${message}`);
}

export function buildSample(sample: Sample, newId: IdGenerator): Model {
  const editor = new Editor(createEmptyProject(newId, sample.title), {
    registry: createCoreRegistry(),
    newId,
  });
  const first = editor.model;
  const ctx: SampleContext = {
    get model() {
      return editor.model;
    },
    storeyId: Object.keys(first.storeys)[0] ?? '',
    viewId: Object.keys(first.views)[0] ?? '',
    run(name, params) {
      const r = editor.execute(name, params);
      if (!r.ok) fail(`${name}: ${r.error.message}`);
      return [...r.created];
    },
    type: (name) => byName(editor.model.wallTypes, name, 'Typ stěny'),
    phase: (name) => byName(editor.model.display.overrideCombinations, name, 'Filtr'),
    line(a, b, extra = {}) {
      const path = { kind: 'line', start: a, end: b };
      const typeId = ctx.type('Zdivo 300');
      return (
        ctx.run('wall.create', { storeyId: ctx.storeyId, typeId, path, autoConnect: true, ...extra })[0] ?? ''
      );
    },
  };
  sample.build(ctx);
  return editor.model;
}
