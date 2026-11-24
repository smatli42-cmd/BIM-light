// Hlídač pravidla „co jde udělat myší, jde udělat i přes AI“ (základy 6, 15): sandbox mění model
// jen příkazy z registru jádra, tedy těmi, které AI vidí v seznamu nástrojů.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCoreRegistry } from '../packages/core/src/index.ts';

const ROOT = 'apps/sandbox/src';

function sources(dir = ROOT) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sources(path));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(path);
  }
  return out;
}

const used = new Set();
for (const file of sources()) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\brun\(\s*['"]([a-zA-Z]+\.[a-zA-Z]+)['"]/g)) used.add(m[1]);
}

describe('základy 6, 15: obrazovka používá jen příkazy, které vidí i AI', () => {
  const tools = new Set(
    createCoreRegistry()
      .toolDescriptions()
      .map((t) => t.name),
  );

  it('hlídač něco kontroluje', () => {
    expect(used.size).toBeGreaterThanOrEqual(15);
  });

  it.each([...used])('%s je v seznamu nástrojů pro AI', (name) => {
    expect(tools.has(name)).toBe(true);
  });

  it('sandbox nemění model jinou cestou (žádné editor.load / přímé přiřazení modelu)', () => {
    for (const file of sources()) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/\.model\s*=[^=]/);
    }
  });
});
