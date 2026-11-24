// Rozhraní Platform v prohlížeči (základ 13). Zatím umí jen zápis jako stažení souboru;
// čtení a složky přijdou s ukládáním projektu (Tauri později nahradí celé rozhraní).
import type { Platform } from '@bim-light/core';

const unsupported = (what: string) => Promise.reject(new Error(`${what}: v prohlížeči zatím není`));

/** Zápis souboru = stažení; název souboru je poslední část cesty. */
function download(path: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = path.split('/').pop() ?? path;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const browserPlatform: Platform = {
  readText: () => unsupported('Čtení souboru'),
  writeTextAtomic: (path, text) => {
    download(path, text, path.endsWith('.ifc') ? 'application/x-step' : 'text/plain');
    return Promise.resolve();
  },
  exists: () => Promise.resolve(false),
  list: () => Promise.resolve([]),
  remove: () => unsupported('Mazání souboru'),
  now: () => new Date(),
};
