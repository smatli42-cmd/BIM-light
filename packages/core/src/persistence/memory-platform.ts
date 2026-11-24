// Platforma v paměti: pro testy a jako vzor pro skutečné implementace.
import type { Platform } from './platform.ts';

const dirOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));
const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

export class MemoryPlatform implements Platform {
  readonly files = new Map<string, string>();
  /** Záznam operací (testy ověřují pořadí: dočasný soubor → nahrazení). */
  readonly log: string[] = [];

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async readText(path: string): Promise<string> {
    const text = this.files.get(path);
    if (text === undefined) throw new Error(`Soubor ${path} neexistuje`);
    return text;
  }

  async writeTextAtomic(path: string, text: string): Promise<void> {
    const tmp = `${path}.tmp`;
    this.files.set(tmp, text);
    this.log.push(`write ${tmp}`);
    this.files.set(path, text);
    this.files.delete(tmp);
    this.log.push(`rename ${tmp} -> ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async list(dir: string): Promise<string[]> {
    return [...this.files.keys()].filter((p) => dirOf(p) === dir).map(nameOf);
  }

  async remove(path: string): Promise<void> {
    this.files.delete(path);
  }

  now(): Date {
    return this.clock();
  }
}
