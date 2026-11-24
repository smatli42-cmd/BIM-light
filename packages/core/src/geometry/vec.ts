// Základní 2D vektory v mm (základ 9). Čisté funkce, nic nemění.

/** Bod nebo vektor v rovině půdorysu, v mm. Osa X doprava, Y nahoru. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
/** Z-složka vektorového součinu; kladná = b je vlevo od a. */
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Vec2, b: Vec2): Vec2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Jednotkový vektor; nulový vektor zůstane nulový. */
export function norm(a: Vec2): Vec2 {
  const l = len(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** Kolmice doleva (otočení o +90°). */
export const leftNormal = (d: Vec2): Vec2 => ({ x: -d.y, y: d.x });

/** Otočí bod kolem středu o úhel v radiánech (kladný = proti směru hodin). */
export function rotate(p: Vec2, center: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return { x: center.x + dx * c - dy * s, y: center.y + dx * s + dy * c };
}

/** Úhel vektoru od osy X v radiánech (−π, π]. */
export const angleOf = (d: Vec2): number => Math.atan2(d.y, d.x);

export const EPS = 1e-9;
