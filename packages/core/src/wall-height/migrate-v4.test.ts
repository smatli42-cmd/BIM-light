import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { getWall } from '../wall/queries.ts';
import { SCHEMA_VERSION } from '../model/types.ts';
import { resolveHeight } from '../model/height.ts';
import { fixture } from '../testing/fixture.ts';

type Obj = Record<string, unknown>;

/** Projekt ve tvaru verze 4: vršek vázaný na id podlaží, bez horního profilu. */
function v4Project() {
  const f = fixture();
  const [s2] = f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
  const [s3] = f.run('storey.create', { name: '3.NP', elevation: 6000, height: 3000 });
  const a = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
  const b = f.line({ x: 0, y: 0 }, { x: 0, y: 3000 }, { storeyId: s3 });
  const data = JSON.parse(serializeProject(f.model)) as { elements: Record<string, Obj> };
  const strip = (id: string, top: unknown) => {
    const { topProfile: _t, ...w } = data.elements[id]!;
    data.elements[id] = { ...w, height: { ...(w['height'] as Obj), top } };
  };
  strip(a, { kind: 'storey', storeyId: s3, offset: -200 });
  strip(b, { kind: 'storey', storeyId: s2, offset: 500 });
  return { text: JSON.stringify({ ...data, schemaVersion: 4 }), a, b };
}

describe('základ 9 / plan-steny Z3: migrace projektu 4 → 5', () => {
  it('plan-steny / Z3: vršek na id podlaží → podlaží + N, výsledná výška stejná', () => {
    const { text, a } = v4Project();
    const r = parseProject(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.schemaVersion).toBe(SCHEMA_VERSION);
    const w = getWall(r.model, a);
    expect(w.height.top).toEqual({ kind: 'storey', storeys: 2, offset: -200 });
    expect(resolveHeight(r.model, w.height)).toEqual({ bottom: 0, top: 5800 });
    expect(w.topProfile).toEqual({ kind: 'flat' });
  });

  it('plan-steny / Z3: vršek pod spodním podlažím → pevná výška se stejným vrškem', () => {
    const { text, b } = v4Project();
    const r = parseProject(text);
    if (!r.ok) throw new Error(r.error);
    const w = getWall(r.model, b);
    expect(w.height.top).toEqual({ kind: 'height', value: -2500 });
  });
});
