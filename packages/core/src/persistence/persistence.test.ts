import { describe, expect, it } from 'vitest';
import { fixture, room } from '../testing/fixture.ts';
import { MemoryPlatform } from './memory-platform.ts';
import { migrate } from './migrate.ts';
import {
  openProject,
  parseProject,
  saveProject,
  serializeProject,
  versionedFileName,
} from './project-file.ts';

const clock = () => new Date(2026, 10, 21, 9, 15);

describe('rozhodnutí / základy 9, 13 a sekce 17: ukládání přes platformu, verze a migrace', () => {
  it('uložení a načtení dá stejný model; Undo po načtení funguje na nových krocích', async () => {
    const f = fixture();
    room(f);
    const p = new MemoryPlatform(clock);
    const { main } = await saveProject(p, f.model, { dir: 'projekty', baseName: 'Dum' });
    const loaded = await openProject(p, main);
    expect(loaded.ok && loaded.model).toEqual(f.model);
    if (loaded.ok) {
      f.editor.load(loaded.model);
      f.run('wall.offset', { wallId: Object.keys(f.model.elements)[0], distance: 100 });
      expect(f.editor.undo()).toBe(true);
      expect(f.model).toEqual(loaded.model);
    }
  });

  it('sekce 17: ruční uložení vytvoří i datovanou verzi „Projekt_2026-11-21_0915.bim“', async () => {
    const f = fixture();
    const p = new MemoryPlatform(clock);
    const r = await saveProject(p, f.model, { dir: 'projekty', baseName: 'Dum', versionsDir: 'zalohy' });
    expect(r.version).toBe('zalohy/Dum_2026-11-21_0915.bim');
    expect(await p.list('zalohy')).toEqual(['Dum_2026-11-21_0915.bim']);
    expect(versionedFileName('Projekt', clock())).toBe('Projekt_2026-11-21_0915.bim');
  });

  it('základ 13: zápis je bezpečný – nejdřív dočasný soubor, pak nahrazení', async () => {
    const p = new MemoryPlatform(clock);
    await p.writeTextAtomic('a/b.bim', 'x');
    expect(p.log).toEqual(['write a/b.bim.tmp', 'rename a/b.bim.tmp -> a/b.bim']);
    expect(await p.exists('a/b.bim.tmp')).toBe(false);
  });

  it('základ 9: migrace se použijí postupně podle verze schématu', () => {
    const steps = {
      0: (d: Record<string, unknown>) => ({ ...d, a: 1 }),
      1: (d: Record<string, unknown>) => ({ ...d, b: (d['a'] as number) + 1 }),
    };
    const r = migrate({ schemaVersion: 0 }, 2, steps);
    expect(r).toEqual({ ok: true, data: { schemaVersion: 2, a: 1, b: 2 }, applied: [0, 1] });
    expect(migrate({ schemaVersion: 0 }, 2, {}).ok).toBe(false);
  });

  it('základ 9: projekt s vlastní migrací se načte ve verzi programu', () => {
    const f = fixture();
    const old = JSON.parse(serializeProject(f.model)) as Record<string, unknown>;
    const prev = f.model.schemaVersion - 1;
    const json = JSON.stringify({ ...old, schemaVersion: prev, projectName: f.model.project.name });
    const r = parseProject(json, { [prev]: ({ projectName: _n, ...rest }) => rest });
    expect(r.ok && r.model).toEqual(f.model);
  });

  it('základ 9: neplatný nebo novější soubor se odmítne se srozumitelnou chybou', () => {
    expect(parseProject('nesmysl')).toEqual({ ok: false, error: 'Soubor není platný JSON' });
    expect(parseProject('{"format":"bim-light-project","schemaVersion":99}').ok).toBe(false);
    expect(parseProject('{"a":1}').ok).toBe(false);
  });
});
