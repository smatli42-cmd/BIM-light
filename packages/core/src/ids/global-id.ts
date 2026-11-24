// IFC GlobalId: 22 znaků z abecedy IFC base64 (128 bitů). Základ 1: stabilní id každého prvku.

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

export type Id = string;

/** Zdroj náhody 0..1 (v testech jde podstrčit pevná řada). */
export type RandomSource = () => number;

/** Vytvoří IFC GlobalId z 16 bajtů. */
export function globalIdFromBytes(bytes: readonly number[]): Id {
  if (bytes.length !== 16) throw new Error('GlobalId potřebuje 16 bajtů');
  // IFC: první znak nese 2 bity, dalších 21 znaků po 6 bitech (2 + 126 = 128).
  let bits = '';
  for (const b of bytes) bits += (b & 0xff).toString(2).padStart(8, '0');
  let out = ALPHABET[parseInt(bits.slice(0, 2), 2)] ?? '0';
  for (let i = 2; i < 128; i += 6) out += ALPHABET[parseInt(bits.slice(i, i + 6), 2)] ?? '0';
  return out;
}

/** Nové náhodné GlobalId. */
export function createGlobalId(random: RandomSource = Math.random): Id {
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) bytes.push(Math.floor(random() * 256));
  return globalIdFromBytes(bytes);
}

/** Platný tvar GlobalId? */
export function isGlobalId(id: string): boolean {
  return id.length === 22 && [...id].every((ch) => ALPHABET.includes(ch)) && '0123'.includes(id[0] ?? '');
}

/** Generátor id pro příkazy; v testech předvídatelný. */
export type IdGenerator = () => Id;

/** Předvídatelný generátor (pro testy a ukázková data): 1., 2., 3. id… */
export function sequentialIds(prefix = 0): IdGenerator {
  let n = 0;
  return () => {
    n++;
    const bytes = Array.from({ length: 16 }, (_, i) =>
      i === 0 ? prefix : i >= 12 ? (n >>> ((15 - i) * 8)) & 0xff : 0,
    );
    return globalIdFromBytes(bytes);
  };
}
