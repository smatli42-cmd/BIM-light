import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { createCoreRegistry } from './all.ts';
import { validate } from './schema.ts';

describe('rozhodnutí / základ 6: každá změna je pojmenovaný příkaz s JSON parametry, Undo/Redo', () => {
  it('základ 6: Undo vrátí celý krok, Redo ho zopakuje', () => {
    const f = fixture();
    const empty = f.model;
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const drawn = f.model;
    f.run('wall.offset', { wallId: id, distance: 400 });
    expect(f.editor.history).toEqual(['Stěna', 'Odsadit stěnu']);
    expect(f.editor.undo()).toBe(true);
    expect(f.model).toBe(drawn);
    f.editor.undo();
    expect(f.model).toBe(empty);
    expect(f.editor.undo()).toBe(false);
    f.editor.redo();
    f.editor.redo();
    expect(f.wall(id).path.start.y).toBe(400);
  });

  it('základ 6: nový příkaz po Undo smaže Redo', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.editor.undo();
    f.line({ x: 0, y: 0 }, { x: 0, y: 5000 });
    expect(f.editor.canRedo).toBe(false);
  });

  it('základ 6: špatné parametry, neznámý příkaz nebo neexistující prvek model nezmění', () => {
    const f = fixture();
    const before = f.model;
    const bad = f.editor.execute('wall.offset', { wallId: 'x' });
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.error.code).toBe('invalid-params');
    const unknown = f.editor.execute('wall.fly', {});
    expect(!unknown.ok && unknown.error.code).toBe('unknown-command');
    const missing = f.editor.execute('wall.offset', { wallId: 'neni', distance: 10 });
    expect(!missing.ok && missing.error.code).toBe('not-found');
    expect(f.model).toBe(before);
    expect(f.editor.canUndo).toBe(false);
  });

  it('základ 6: stěna s nulovou délkou se odmítne', () => {
    const f = fixture();
    const r = f.editor.execute('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'line', start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
    });
    expect(r.ok).toBe(false);
  });

  it('základ 6: posluchač dostane nový model po každé změně i po Undo', () => {
    const f = fixture();
    let calls = 0;
    f.editor.subscribe(() => calls++);
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.editor.undo();
    expect(calls).toBe(2);
  });
});

describe('rozhodnutí / základ 15: ovládání z popisů (registr příkazů)', () => {
  it('základ 15a: každý příkaz má název, popis, skupinu a schéma parametrů', () => {
    const r = createCoreRegistry();
    for (const c of r.list()) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(10);
      expect(c.group.length).toBeGreaterThan(0);
      expect(c.params).toBeTruthy();
    }
    expect(r.get('wall.create')?.shortcut).toBe('W');
  });

  it('základ 15a: vyhledávání příkazů (Ctrl+K) a nástroje pro AI z jednoho místa', () => {
    const r = createCoreRegistry();
    expect(r.search('odsadit').map((c) => c.name)).toContain('wall.offset');
    const tools = r.toolDescriptions();
    expect(tools.find((t) => t.name === 'dimension.setLocked')?.inputSchema.required).toEqual([
      'dimensionId',
      'locked',
    ]);
  });

  it('základ 15: dvakrát registrovaný příkaz je chyba', () => {
    const r = createCoreRegistry();
    const first = r.list()[0];
    expect(() => first && r.register(first)).toThrow();
  });

  it('základ 15: kontrola schématu hlásí čitelné chyby', () => {
    const errors = validate(
      {
        type: 'object',
        required: ['a'],
        additionalProperties: false,
        properties: { a: { type: 'number', minimum: 0 } },
      },
      { a: -1, b: 2 },
    );
    expect(errors).toEqual(['params.a: nejméně 0', 'params.b: neznámý parametr']);
  });
});
