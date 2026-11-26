import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { SCHEMA_VERSION } from '../model/types.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';

type F = ReturnType<typeof fixture>;
const tagPrims = (f: F) =>
  drawView(f.model, f.viewId).primitives.filter(
    (p) => !!p.source?.elementId && !!f.model.wallTags[p.source.elementId],
  );
const texts = (f: F) => tagPrims(f).flatMap((p) => (p.kind === 'text' ? [p] : []));

describe('plan-steny / Z8: značka typu stěny v půdorysu', () => {
  it('plan-steny / Z8: kroužek se značkou typu vedle referenčního líce, velikost pevná na papíře', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(4000, 0));
    f.run('wallTag.create', { wallIds: [w], viewId: f.viewId });
    const [t] = texts(f);
    expect(t?.text).toBe('S1');
    expect(t?.heightMm).toBe(f.model.display.paperSizes.labelText);
    // tloušťka doleva (+y), referenční líc y = 0; střed (1 + 2,5 × 1,25) mm × měřítko pod lícem
    const scale = f.model.views[f.viewId]!.scale;
    expect(t?.at.x).toBeCloseTo(2000);
    expect(t?.at.y).toBeCloseTo(-(1 + 2.5 * 1.25) * scale);
    f.run('wallTag.move', { tagId: Object.keys(f.model.wallTags)[0], side: 'opp' });
    expect(texts(f)[0]?.at.y).toBeCloseTo(300 + (1 + 2.5 * 1.25) * scale);
  });

  it('plan-steny / Z8: značka jde se stěnou a změnou typu (vztah, ne souřadnice)', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(4000, 0));
    f.run('wallTag.create', { wallIds: [w], viewId: f.viewId, side: 'on' });
    f.run('wall.move', { wallIds: [w], vector: { x: 1000, y: 500 } });
    f.run('wall.setType', { wallIds: [w], typeId: f.type('Příčka 125') });
    const [t] = texts(f);
    expect(t?.text).toBe('S2');
    expect(t?.at.x).toBeCloseTo(3000);
  });

  it('plan-steny / Z8: Označit vše přeskočí označené; smazání stěny smaže její značku (základ 7)', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    f.line(vec(0, 3000), vec(4000, 3000));
    f.run('wallTag.create', { wallIds: [a], viewId: f.viewId });
    expect(f.run('wallTag.tagAll', { viewId: f.viewId })).toHaveLength(1);
    expect(f.run('wallTag.tagAll', { viewId: f.viewId })).toHaveLength(0);
    f.run('wall.delete', { wallIds: [a] });
    expect(Object.values(f.model.wallTags).map((t) => t.wallId)).not.toContain(a);
    expect(Object.keys(f.model.wallTags)).toHaveLength(1);
  });

  it('základ 28: značka patří skupině anotací – skrytá skupina ji schová', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(4000, 0));
    f.run('wallTag.create', { wallIds: [w], viewId: f.viewId });
    const layerId = Object.values(f.model.wallTags)[0]!.annotationLayerId;
    f.run('view.setLayerState', { viewId: f.viewId, layerId, visible: false });
    expect(tagPrims(f)).toEqual([]);
  });

  it('plan-steny / Z8: dotaz wallTag.list a smazání podle stěny', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(4000, 0));
    f.run('wallTag.create', { wallIds: [w], viewId: f.viewId });
    const r = f.editor.query('wallTag.list', { viewId: f.viewId });
    expect(r.ok && (r.data as { mark: string }[])[0]?.mark).toBe('S1');
    f.run('wallTag.delete', { wallIds: [w] });
    expect(f.model.wallTags).toEqual({});
  });
});

describe('základ 9 / plan-steny Z8: migrace projektu 14 → 15', () => {
  it('projekt dostane prázdné značky typu', () => {
    const f = fixture();
    const old = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    delete old.wallTags;
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 14 }));
    expect(r.ok && r.model.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.ok && r.model.wallTags).toEqual({});
  });
});
