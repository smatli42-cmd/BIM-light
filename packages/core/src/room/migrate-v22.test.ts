import { describe, expect, it } from 'vitest';
import { projectV22toV23 } from './migrate-v22.ts';

describe('základ 9: migrace projektu 22 → 23 (místnosti)', () => {
  it('základ 9: prázdný seznam místností a výchozí Výpis místností; stávající výkazy zůstanou', () => {
    const out = projectV22toV23({ schedules: { a: { id: 'a' } } });
    expect(out['rooms']).toEqual({});
    expect(Object.keys(out['schedules'] as object)).toEqual(['a', 'schedule-rooms']);
  });

  it('základ 9: existující místnosti a výpis se nepřepíšou', () => {
    const rooms = { r: { id: 'r' } };
    const out = projectV22toV23({ rooms, schedules: { 'schedule-rooms': { id: 'x' } } });
    expect(out['rooms']).toBe(rooms);
    expect((out['schedules'] as Record<string, { id: string }>)['schedule-rooms']!.id).toBe('x');
  });
});
