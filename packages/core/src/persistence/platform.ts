// Rozhraní „platforma“ (základ 13): jediná cesta k souborům a systému.
// Jádro zná jen toto rozhraní; prohlížeč (teď) a Tauri (později) ho implementují mimo jádro.

export interface Platform {
  /** Přečte textový soubor; neexistující soubor = chyba. */
  readText(path: string): Promise<string>;
  /** Bezpečný zápis: nejdřív dočasný soubor, pak nahrazení (OneDrive nikdy nevidí půl souboru). */
  writeTextAtomic(path: string, text: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** Soubory ve složce (jen názvy). */
  list(dir: string): Promise<string[]>;
  remove(path: string): Promise<void>;
  /** Aktuální čas (kvůli datovaným verzím; v testech pevný). */
  now(): Date;
}
