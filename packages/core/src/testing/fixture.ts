// Pomocníci pro testy jádra: projekt s předvídatelnými id a zkratky pro příkazy.
// Ukázková data jsou vymyšlená.
import { createCoreRegistry } from '../commands/all.ts';
import { Editor } from '../commands/editor.ts';
import { vec, type Vec2 } from '../geometry/index.ts';
import { sequentialIds, type Id } from '../ids/index.ts';
import { createEmptyProject } from '../model/create.ts';
import type { Model } from '../model/types.ts';
import { getWall } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';

export interface Fixture {
  readonly editor: Editor;
  readonly storeyId: Id;
  readonly viewId: Id;
  /** Typ podle názvu (Zdivo 300, Příčka 125, Obvodová zateplená 465). */
  type(name: string): Id;
  style(name: string): Id;
  layer(name: string): Id;
  /** Spustí příkaz; při chybě test spadne se zprávou. Vrací id nových objektů. */
  run(name: string, params: unknown): readonly string[];
  wall(id: Id): Wall;
  readonly model: Model;
  /** Přímá stěna z bodu do bodu (typ výchozí Zdivo 300). */
  line(a: Vec2, b: Vec2, extra?: Record<string, unknown>): Id;
}

export function fixture(): Fixture {
  const newId = sequentialIds();
  const model = createEmptyProject(newId, 'Ukázkový dům');
  const editor = new Editor(model, { registry: createCoreRegistry(), newId });
  const find = <T extends { id: Id; name: string }>(rec: Record<Id, T>, name: string) => {
    const hit = Object.values(rec).find((x) => x.name === name);
    if (!hit) throw new Error(`Nenalezeno: ${name}`);
    return hit.id;
  };
  const f: Fixture = {
    editor,
    storeyId: Object.keys(model.storeys)[0] as Id,
    viewId: Object.keys(model.views)[0] as Id,
    type: (name) => find(editor.model.wallTypes, name),
    style: (name) => find(editor.model.display.styles, name),
    layer: (name) => find(editor.model.display.layers, name),
    run(name, params) {
      const r = editor.execute(name, params);
      if (!r.ok) throw new Error(`${name}: ${r.error.message}`);
      return r.created;
    },
    wall: (id) => getWall(editor.model, id),
    get model() {
      return editor.model;
    },
    line(a, b, extra = {}) {
      const [id] = f.run('wall.create', {
        storeyId: f.storeyId,
        typeId: f.type('Zdivo 300'),
        path: { kind: 'line', start: a, end: b },
        ...extra,
      });
      return id as Id;
    },
  };
  return f;
}

/**
 * Místnost 4000 × 3000 obkreslená po směru hodin po vnitřním líci (tloušťka jde ven).
 * Rohy jsou uložené vztahy (základ 24). Vrací id stěn: levá, horní, pravá, spodní.
 */
export function room(f: Fixture, w = 4000, h = 3000): [Id, Id, Id, Id] {
  const p = [vec(0, 0), vec(0, h), vec(w, h), vec(w, 0)];
  const ids: Id[] = [];
  for (let i = 0; i < 4; i++) {
    const conn = i > 0 ? [{ end: 'start', wallId: ids[i - 1], at: 'ATEND' }] : [];
    if (i === 3) conn.push({ end: 'end', wallId: ids[0] as Id, at: 'ATSTART' });
    ids.push(f.line(p[i] as Vec2, p[(i + 1) % 4] as Vec2, { connections: conn }));
  }
  return ids as [Id, Id, Id, Id];
}

export const near = (a: Vec2, b: Vec2, tol = 1e-6) =>
  Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
