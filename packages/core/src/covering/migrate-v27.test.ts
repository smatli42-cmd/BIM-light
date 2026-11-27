import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';
import { projectV27toV28 } from './migrate-v27.ts';

describe('základ 9: migrace projektu 27 → 28 (spárořez)', () => {
  it('základ 9: starší projekt dostane Výkaz dlaždic', () => {
    const old = JSON.parse(serializeProject(fixture().model)) as Record<string, Record<string, unknown>>;
    delete old['schedules']!['schedule-tiles'];
    const r = parseProject(JSON.stringify({ ...old, schemaVersion: 27 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model.schedules['schedule-tiles']?.name).toBe('Výkaz dlaždic');
  });

  it('základ 9: projekt s výkazem dlaždic se nemění', () => {
    const data = { schedules: { 'schedule-tiles': {} } };
    expect(projectV27toV28(data)).toBe(data);
  });
});
