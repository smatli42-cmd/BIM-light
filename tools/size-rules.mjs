// Pravidla velikosti souborů (základ 33). Čisté funkce, bez přístupu k disku.

export const CODE_WARN = 250;
export const CODE_LIMIT = 400;
export const DOC_LINES = 500;
export const DOC_BYTES = 40 * 1024;
export const CLAUDE_MD_LIMIT = 150;

const CODE_EXT = /\.(ts|tsx)$/;
const SKIP_DIRS = ['node_modules', 'dist', 'playwright-report', 'test-results', 'coverage', '.git', '.vite'];

/** Má se soubor (cesta s lomítky, relativní ke kořeni repa) kontrolovat? */
export function isChecked(path) {
  const parts = path.split('/');
  if (parts.some((p) => SKIP_DIRS.includes(p))) return false;
  if (path.startsWith('docs/reference/')) return false;
  if (path.endsWith('.d.ts')) return false;
  return CODE_EXT.test(path) || path.endsWith('.md');
}

/** Zařadí soubor a vrátí jeho limity. */
export function limitsFor(path) {
  if (path === 'CLAUDE.md') return { kind: 'claude', warn: CLAUDE_MD_LIMIT, error: CLAUDE_MD_LIMIT };
  if (path.startsWith('docs/')) return { kind: 'doc', warn: DOC_LINES, error: Infinity, bytes: DOC_BYTES };
  return { kind: 'code', warn: CODE_WARN, error: CODE_LIMIT };
}

/**
 * Vyhodnotí jeden soubor.
 * Kód: nad 250 řádků varování, nad 400 chyba. CLAUDE.md: nad 150 chyba.
 * Dokumenty v docs/: nad 500 řádků nebo 40 KB jen varování (dělí je jen uživatel).
 * Výjimka z tools/size-exceptions.json zvedá tvrdý limit.
 */
export function evaluate({ path, lines, bytes }, exceptions = []) {
  const limits = limitsFor(path);
  const exception = exceptions.find((e) => e.file === path);
  const error = exception ? exception.limit : limits.error;
  if (lines > error) return { level: 'error', message: `${lines} řádků, limit ${error}` };
  if (limits.kind === 'doc' && bytes > limits.bytes) {
    return { level: 'warn', message: `${Math.round(bytes / 1024)} KB, limit ~40 KB: navrhni rozdělení` };
  }
  if (lines > limits.warn) {
    const hint = limits.kind === 'doc' ? 'navrhni rozdělení' : 'rozděl při nejbližším doteku';
    return { level: 'warn', message: `${lines} řádků, cíl ${limits.warn}: ${hint}` };
  }
  return { level: 'ok', message: '' };
}

/** Spočítá řádky textu (poslední prázdný řádek po koncovém \n se nepočítá). */
export function countLines(text) {
  if (text.length === 0) return 0;
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
}
