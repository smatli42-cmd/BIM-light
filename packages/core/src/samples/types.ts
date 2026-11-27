// Ukázky (pokyn uživatele 2026-11-26): ukázkový projekt a testovací scény k posledním krokům. Každá ukázka
// je „recept“ – posloupnost příkazů z registru (stejná cesta jako AI, základ 6), ne uložený soubor;
// postaví se vždy v aktuální verzi modelu a je zároveň testem. Data jsou vymyšlená (repo je veřejné).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';

/** Co recept dostane: spuštění příkazu a vyhledání věcí v projektu podle názvu. */
export interface SampleContext {
  /** Provede příkaz; vrátí id vytvořených objektů. Odmítnutí = chyba receptu. */
  run(name: string, params: Record<string, unknown>): Id[];
  readonly model: Model;
  readonly storeyId: Id;
  readonly viewId: Id;
  /** Id typu stěny podle názvu. */
  type(name: string): Id;
  /** Id typu desky podle názvu. */
  slabType(name: string): Id;
  /** Id filtru rekonstrukce (fáze) podle názvu, např. „Fáze – plánovaný stav“. */
  phase(name: string): Id;
  /** Přímá stěna (zkratka pro wall.create s autoConnect). */
  line(a: Vec2, b: Vec2, extra?: Record<string, unknown>): Id;
}

export interface Sample {
  /** Klíč v adrese (?ukazka=…). */
  readonly key: string;
  readonly title: string;
  /** Co zkusit (krátce, česky). */
  readonly description: string;
  /** 'projekt' = ukázkový projekt; 'scena' = scéna k jednomu kroku nebo opravě. */
  readonly kind: 'projekt' | 'scena';
  /** Datum přidání (scény se řadí od nejnovější). */
  readonly date: string;
  build(c: SampleContext): void;
}
