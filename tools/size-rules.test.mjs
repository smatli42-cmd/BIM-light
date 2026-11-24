import { describe, expect, it } from 'vitest';
import { countLines, evaluate, isChecked } from './size-rules.mjs';

describe('rozhodnuti / základ 33: velikost souborů', () => {
  it('základ 33: kód do 250 řádků je v pořádku', () => {
    expect(evaluate({ path: 'packages/core/src/a.ts', lines: 250, bytes: 0 }).level).toBe('ok');
  });
  it('základ 33: kód nad 250 řádků dá varování', () => {
    expect(evaluate({ path: 'packages/core/src/a.ts', lines: 251, bytes: 0 }).level).toBe('warn');
  });
  it('základ 33: kód nad 400 řádků (i test) dá chybu', () => {
    expect(evaluate({ path: 'apps/sandbox/src/a.test.ts', lines: 401, bytes: 0 }).level).toBe('error');
  });
  it('základ 33: zapsaná výjimka zvedne tvrdý limit', () => {
    const ex = [{ file: 'packages/core/src/a.ts', limit: 600, reason: 'test' }];
    expect(evaluate({ path: 'packages/core/src/a.ts', lines: 500, bytes: 0 }, ex).level).toBe('warn');
  });
  it('základ 33: CLAUDE.md nad 150 řádků dá chybu', () => {
    expect(evaluate({ path: 'CLAUDE.md', lines: 151, bytes: 0 }).level).toBe('error');
  });
  it('základ 33: dokument v docs/ nad 500 řádků nebo 40 KB jen varuje', () => {
    expect(evaluate({ path: 'docs/a.md', lines: 501, bytes: 0 }).level).toBe('warn');
    expect(evaluate({ path: 'docs/a.md', lines: 10, bytes: 41 * 1024 }).level).toBe('warn');
  });
  it('základ 33: kontroluje .ts, .tsx, .md mimo node_modules, dist a docs/reference', () => {
    expect(isChecked('apps/sandbox/src/App.tsx')).toBe(true);
    expect(isChecked('docs/STAV.md')).toBe(true);
    expect(isChecked('node_modules/x/index.ts')).toBe(false);
    expect(isChecked('apps/sandbox/dist/a.ts')).toBe(false);
    expect(isChecked('docs/reference/prototyp.md')).toBe(false);
    expect(isChecked('tools/check-size.mjs')).toBe(false);
  });
  it('základ 33: počítání řádků', () => {
    expect(countLines('')).toBe(0);
    expect(countLines('a\nb\n')).toBe(2);
    expect(countLines('a\nb')).toBe(2);
  });
});
