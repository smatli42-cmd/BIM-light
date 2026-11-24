// Hlídač pravidla „žádné pevné barvy, mm čar ani šrafy v generátorech“ (základy 11, 32).
// Generátory kresby (soubory draw*.ts v jádře) smí brát vzhled jen z funkce grafiky.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = 'packages/core/src';

function generators(dir = ROOT) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...generators(path));
    else if (/^draw.*\.ts$/.test(entry.name) && !entry.name.endsWith('.test.ts')) out.push(path);
  }
  return out;
}

describe('rozhodnuti / základy 11 a 32: generátory nevolí vzhled samy', () => {
  const files = generators();

  it('základ 11: generátory kresby existují (hlídač něco kontroluje)', () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it.each(files)('základ 11: %s neobsahuje pevnou barvu', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/['"]#[0-9a-f]{3,8}['"]|rgba?\(/i);
  });

  it.each(files)('základ 32: %s nenastavuje pero ani šrafu číslem napevno', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).not.toMatch(/\bpen:\s*\d/);
    expect(src).not.toMatch(/patternId:\s*['"]/);
    expect(src).not.toMatch(/lineWidth|widthMm/);
  });
});
