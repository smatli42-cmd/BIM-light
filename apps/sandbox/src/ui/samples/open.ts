// Otevření ukázky: adresa ?ukazka=klíč (odkaz jde poslat ve zprávě) a nový start aplikace. Model ukázky
// postaví jádro příkazy (buildSample); prohlížeč jen přečte adresu.
import { buildSample, createGlobalId, findSample, type Model } from '@bim-light/core';
import type { Session } from '../../session/session.ts';

const PARAM = 'ukazka';

/** Model ukázky z adresy stránky, nebo undefined (prázdný projekt). */
export function sampleFromUrl(search: string): Model | undefined {
  const key = new URLSearchParams(search).get(PARAM);
  const sample = key ? findSample(key) : undefined;
  return sample && buildSample(sample, () => createGlobalId());
}

/** Otevře ukázku (null = prázdný projekt); s neuloženými změnami se nejdřív zeptá. */
export function openSample(s: Session, key: string | null) {
  if (s.editor.canUndo && !window.confirm('Rozpracovaný projekt se zahodí. Pokračovat?')) return;
  const url = new URL(window.location.href);
  if (key) url.searchParams.set(PARAM, key);
  else url.searchParams.delete(PARAM);
  url.hash = '';
  window.location.assign(url.toString());
}
