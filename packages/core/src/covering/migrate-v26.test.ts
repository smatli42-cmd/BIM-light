import { describe, expect, it } from 'vitest';
import { serializeProject, parseProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';
import { projectV26toV27 } from './migrate-v26.ts';

describe('základ 9: migrace projektu 26 → 27 (úpravy povrchů)', () => {
  it('základ 9: knihovna typů úprav, materiály (stejné jméno se nezdvojí), šrafy a Výkaz povrchů', () => {
    const f = fixture();
    const old = JSON.parse(serializeProject(f.model)) as Record<string, Record<string, unknown>>;
    delete old['coveringTypes'];
    old['materials'] = Object.fromEntries(
      Object.entries(old['materials']!).filter(([id]) => !id.startsWith('mat-cov-')),
    );
    delete old['schedules']!['schedule-coverings'];
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 26 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const types = Object.values(r.model.coveringTypes);
    expect(types.map((t) => t.name)).toContain('Obklad 300×600 bílý');
    expect(types.every((t) => t.materialId && r.model.materials[t.materialId])).toBe(true);
    const names = Object.values(r.model.materials).map((m) => m.name);
    expect(names.filter((n) => n === 'Omítka')).toHaveLength(1);
    expect(r.model.display.hatches['hatch.bez-srafy']).toBeDefined();
    expect(r.model.schedules['schedule-coverings']?.name).toBe('Výkaz povrchů');
  });

  it('základ 9: projekt s typy úprav se nemění', () => {
    const data = { coveringTypes: { a: {} }, materials: {} };
    expect(projectV26toV27(data)).toBe(data);
  });
});
