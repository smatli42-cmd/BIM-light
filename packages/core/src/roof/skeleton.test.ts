import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../geometry/index.ts';
import { signedArea } from '../slab/geometry.ts';
import { faceLoop, loopArea } from './faces.ts';
import { straightSkeleton } from './skeleton.ts';

const P = (x: number, y: number): Vec2 => ({ x, y });
const speed = (deg: number) => 1 / Math.tan((deg * Math.PI) / 180);

/** Kontrola: roviny pokryjí celý obrys a každý bod roviny leží ve výšce podle sklonu své hrany. */
function check(pts: Vec2[], speeds: number[]) {
  const sk = straightSkeleton(pts, speeds);
  const loops = pts.map((_, i) => faceLoop(sk, pts, i));
  loops.forEach((l, i) => {
    expect(l, `rovina ${i}`).not.toBeNull();
    const a = pts[i] as Vec2;
    const b = pts[(i + 1) % pts.length] as Vec2;
    const d = {
      x: (b.x - a.x) / Math.hypot(b.x - a.x, b.y - a.y),
      y: (b.y - a.y) / Math.hypot(b.x - a.x, b.y - a.y),
    };
    const v = speeds[i] as number;
    for (const p of l ?? []) {
      const dist = -d.y * (p.x - a.x) + d.x * (p.y - a.y);
      if (v > 0) expect(dist / v).toBeCloseTo(p.z, 0);
      else expect(Math.abs(dist)).toBeLessThan(1);
    }
  });
  const total = loops.reduce((s, l) => s + (l ? loopArea(l) : 0), 0);
  expect(total).toBeCloseTo(signedArea(pts), -2);
  return { sk, loops };
}

const rect = (w: number, h: number) => [P(0, 0), P(w, 0), P(w, h), P(0, h)];

describe('rozhodnutí 11 / střechy: vážený straight skeleton', () => {
  it('rozhodnutí 11 / střechy: valbová na obdélníku = 4 roviny, hřeben délky a − b', () => {
    const { sk } = check(rect(10000, 6000), [1, 1, 1, 1]);
    const ridge = sk.arcs.filter((a) => Math.abs(a.a.z - a.b.z) < 1 && a.a.z > 1);
    expect(ridge).toHaveLength(1);
    const r = ridge[0]!;
    expect(Math.hypot(r.a.x - r.b.x, r.a.y - r.b.y)).toBeCloseTo(4000, 0);
    expect(r.a.z).toBeCloseTo(3000, 0);
  });

  it('rozhodnutí 11 / střechy: sedlová se štíty – hřeben přes celou délku', () => {
    const { sk, loops } = check(rect(10000, 6000), [1, 0, 1, 0]);
    const ridge = sk.arcs.filter((a) => a.faces.includes(0) && a.faces.includes(2));
    expect(ridge).toHaveLength(1);
    const r = ridge[0]!;
    expect(Math.hypot(r.a.x - r.b.x, r.a.y - r.b.y)).toBeCloseTo(10000, 0);
    expect(loopArea(loops[1]!)).toBeCloseTo(0, 0);
  });

  it('rozhodnutí 11 / střechy: pultová – jedna rovina přes celý obrys', () => {
    const { loops } = check(rect(8000, 4000), [speed(15), 0, 0, 0]);
    expect(loopArea(loops[0]!)).toBeCloseTo(32e6, -3);
    expect(Math.max(...loops[0]!.map((p) => p.z))).toBeCloseTo(4000 * Math.tan((15 * Math.PI) / 180), 0);
  });

  it('rozhodnutí 11 / střechy: L s úžlabím – roviny pokryjí obrys, úžlabí od vnitřního rohu', () => {
    const L = [P(0, 0), P(12000, 0), P(12000, 6000), P(6000, 6000), P(6000, 12000), P(0, 12000)];
    const { sk } = check(
      L,
      L.map(() => 1),
    );
    const valley = sk.arcs.filter((a) => !a.convex);
    expect(valley).toHaveLength(1);
    expect(valley[0]!.a).toMatchObject({ x: 6000, y: 6000, z: 0 });
  });

  it('rozhodnutí 11 / střechy: různé sklony a nepravidelné tvary (T, U, lichoběžník)', () => {
    check(rect(10000, 6000), [speed(45), speed(30), speed(45), speed(60)]);
    check(rect(10000, 6000), [speed(30), speed(45), speed(50), speed(45)]);
    const T = [
      P(0, 0),
      P(4000, 0),
      P(4000, 6000),
      P(10000, 6000),
      P(10000, 10000),
      P(-6000, 10000),
      P(-6000, 6000),
      P(0, 6000),
    ];
    check(
      T,
      T.map(() => 1),
    );
    const U = [
      P(0, 0),
      P(4000, 0),
      P(4000, 6000),
      P(8000, 6000),
      P(8000, 0),
      P(12000, 0),
      P(12000, 10000),
      P(0, 10000),
    ];
    check(
      U,
      U.map(() => 1),
    );
    check([P(0, 0), P(12000, 0), P(9000, 5000), P(2000, 5000)], [1, 1, 1, 1]);
    const L = [P(0, 0), P(12000, 0), P(12000, 6000), P(6000, 6000), P(6000, 12000), P(0, 12000)];
    check(L, [1, 0, 1, 1, 0, 1]);
    check(L, [speed(40), speed(35), 1, 1, speed(35), speed(40)]);
  });

  it('rozhodnutí 11 / střechy: náhodné hvězdicové obrysy s náhodnými sklony a štíty pokryjí celý obrys', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 150; k++) {
      const n = 4 + Math.floor(rnd() * 8);
      const pts = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const r = 4000 + rnd() * 6000;
        return P(Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r));
      });
      const sp = pts.map(() => (rnd() < 0.15 ? 0 : speed(20 + rnd() * 40)));
      if (sp.every((s) => s === 0)) continue;
      const sk = straightSkeleton(pts, sp);
      const loops = pts.map((_, i) => faceLoop(sk, pts, i));
      expect(loops.every((l) => l)).toBe(true);
      const total = loops.reduce((s, l) => s + (l ? loopArea(l) : 0), 0);
      expect(Math.abs(total / signedArea(pts) - 1)).toBeLessThan(1e-4);
    }
  });
});
