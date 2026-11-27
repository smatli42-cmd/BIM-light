// Sloučení skoro shodných bodů (průsečíky spočítané z různých dvojic hran se liší o zlomky mm).
import { dist, type Vec2 } from '../geometry/index.ts';

/** Body bližší než tato mez jsou jeden vrchol (mm). */
const MERGE = 0.01;
const CELL = 0.1;

export class VertexPool {
  private readonly pts: Vec2[] = [];
  private readonly grid = new Map<string, number[]>();

  /** Index vrcholu pro bod (existující, je-li blízko, jinak nový). */
  add(p: Vec2): number {
    const cx = Math.floor(p.x / CELL);
    const cy = Math.floor(p.y / CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const i of this.grid.get(`${cx + dx}_${cy + dy}`) ?? []) {
          if (dist(this.pts[i] as Vec2, p) <= MERGE) return i;
        }
      }
    }
    const i = this.pts.push(p) - 1;
    const key = `${cx}_${cy}`;
    this.grid.set(key, [...(this.grid.get(key) ?? []), i]);
    return i;
  }

  at(i: number): Vec2 {
    return this.pts[i] as Vec2;
  }
}
