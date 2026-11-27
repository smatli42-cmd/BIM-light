// Části nástroje Deska / Otvor v desce (slab-tool.ts): tvary obdélníků, nápověda a pole trackeru.
// U obdélníku Šířka / Hloubka, u natočeného délka a úhel hrany a pak šířka (Tab přepíná, Enter potvrdí).
import { add, dist, dot, leftNormal, mul, norm, sub, type Vec2 } from '@bim-light/core';
import type { TypedInput } from '../../session/ui-state.ts';
import { deltaFields, trackerMm } from '../tracker-fields.ts';
import type { SlabMethod } from '../../session/slab-defaults.ts';
import type { TrackerField } from '../types.ts';

/** Obdélník s hranou a–b a protější stranou procházející bodem c (natočený obdélník). */
export function rotatedRect(a: Vec2, b: Vec2, c: Vec2): Vec2[] {
  const n = leftNormal(norm(sub(b, a)));
  const h = mul(n, dot(sub(c, a), n));
  return [a, b, add(b, h), add(a, h)];
}

export const axisRect = (a: Vec2, b: Vec2): Vec2[] => [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];

/** Nápověda ve stavovém řádku podle metody a počtu položených bodů. */
export function slabHint(method: SlabMethod, n: number): string {
  if (method === 'rect')
    return n
      ? 'Klikni protější roh, nebo napiš šířku (Tab = hloubka) a Enter. Klik na číslo kóty posune první roh.'
      : 'Klikni první roh desky (přichytává se, pomocné čáry z rohů a líců).';
  if (method === 'rotated')
    return (
      [
        'Klikni začátek první hrany desky.',
        'Klikni konec první hrany, nebo napiš délku (Tab = úhel) a Enter.',
        'Klikni šířku desky, nebo ji napiš a Enter.',
      ][n] ?? ''
    );
  if (!n) return 'Klikni první bod obrysu desky (přichytává se; Alt vypne).';
  return 'Klikni další bod, nebo napiš délku (Tab = úhel) a Enter. Klik na první bod, dvojklik nebo pravé tlačítko obrys uzavře; Backspace vrátí bod; klik na číslo kóty posune obrys.';
}

const typedOr = (text: string, value: string) => (text !== '' ? `${text}▏` : value);

/** Pole trackeru pro natočený obdélník a obdélník (mnohoúhelník řeší `lengthAngleFields`). */
export function rectFields(
  method: SlabMethod,
  pts: readonly Vec2[],
  e: Vec2,
  t: TypedInput,
  width: number,
): TrackerField[] {
  const a = pts[0] as Vec2;
  if (method === 'rect') {
    return [
      { label: 'Šířka', value: typedOr(t.len, trackerMm(Math.abs(e.x - a.x))), active: t.field === 'len' },
      { label: 'Hloubka', value: typedOr(t.ang, trackerMm(Math.abs(e.y - a.y))), active: t.field === 'ang' },
    ];
  }
  const b = pts[1] as Vec2;
  return [
    { label: 'Hrana', value: trackerMm(dist(a, b)), active: false },
    { label: 'Šířka', value: typedOr(t.len, trackerMm(width)), active: true },
  ];
}

/** Délka a úhel od posledního bodu (mnohoúhelník a první hrana natočeného obdélníku). */
export function lengthAngleFields(from: Vec2, e: Vec2, t: TypedInput, length: number, angle: number) {
  const ang = String(Math.round(angle * 10) / 10).replace('.', ',');
  return [
    { label: 'Délka', value: typedOr(t.len, trackerMm(length)), active: t.field === 'len' },
    { label: 'Úhel', value: typedOr(t.ang, `${ang}°`), active: t.field === 'ang' },
    ...deltaFields(from, e),
  ];
}
