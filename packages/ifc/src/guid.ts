// GlobalId pro IFC: prvky, podlaží, budova a projekt mají vlastní id z modelu (základ 1).
// Věci, které model nemá (pozemek, vztahy, sady vlastností), dostanou id odvozené z pevného klíče,
// takže opakovaný export dá stejná GlobalId.
import { globalIdFromBytes, isGlobalId } from '@bim-light/core';

/** 32bitový FNV-1a se zvoleným počátkem. */
function fnv(text: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

const SEEDS = [0x811c9dc5, 0x01234567, 0x89abcdef, 0x5bd1e995];

/** Stabilní GlobalId z textového klíče (16 bajtů ze čtyř hashů). */
export function derivedGlobalId(key: string): string {
  const bytes: number[] = [];
  for (const seed of SEEDS) {
    const h = fnv(key, seed);
    bytes.push((h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff);
  }
  return globalIdFromBytes(bytes);
}

/** Id z modelu, když je to platné GlobalId; jinak odvozené z něj. */
export const modelGlobalId = (id: string): string => (isGlobalId(id) ? id : derivedGlobalId(id));
