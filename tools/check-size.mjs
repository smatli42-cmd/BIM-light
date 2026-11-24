// Kontrola velikosti souborů (základ 33). Spuštění: npm run check:size [-- --top 5]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countLines, evaluate, isChecked } from './size-rules.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const SKIP = new Set(['node_modules', '.git', 'dist', 'playwright-report', 'test-results', 'coverage']);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

function loadExceptions() {
  const raw = JSON.parse(readFileSync(join(root, 'tools/size-exceptions.json'), 'utf8'));
  for (const e of raw.exceptions) {
    if (!e.file || !e.limit || !e.reason) throw new Error(`Neúplná výjimka: ${JSON.stringify(e)}`);
  }
  return raw.exceptions;
}

const topArg = process.argv.indexOf('--top');
const top = topArg > 0 ? Number(process.argv[topArg + 1]) : 5;
const exceptions = loadExceptions();
const files = walk(root, [])
  .filter(isChecked)
  .map((path) => {
    const text = readFileSync(join(root, path), 'utf8');
    return { path, lines: countLines(text), bytes: Buffer.byteLength(text) };
  });

const results = files.map((f) => ({ ...f, ...evaluate(f, exceptions) }));
const warns = results.filter((r) => r.level === 'warn');
const errors = results.filter((r) => r.level === 'error');

for (const r of warns) console.log(`VAROVÁNÍ  ${r.path}: ${r.message}`);
for (const r of errors) console.log(`CHYBA     ${r.path}: ${r.message}`);

const code = results.filter((r) => !r.path.startsWith('docs/') && r.path.match(/\.(ts|tsx)$/));
console.log(`\nNejvětší zdrojové soubory (${top}):`);
for (const r of code.sort((a, b) => b.lines - a.lines).slice(0, top)) console.log(`  ${r.lines}\t${r.path}`);
console.log(`\nZkontrolováno ${results.length} souborů, varování ${warns.length}, chyb ${errors.length}.`);

if (errors.length > 0) {
  console.log(
    'Soubor nad limitem rozděl (čisté přesunutí, testy zelené). Výjimku jen se souhlasem uživatele.',
  );
  process.exit(1);
}
