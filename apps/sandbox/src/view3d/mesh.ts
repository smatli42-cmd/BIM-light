// Převod těles (view3d/solids.ts) na sítě three.js: každý pás vrstvy = vytažený obrys s dírami,
// k tomu obrysové hrany (view3d/edges.ts, jako v Archicadu). Jednotky: model v mm, scéna v metrech (přesnost GPU).
import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  Path,
  Shape,
  type Material,
} from 'three';
import { mixColor } from '@bim-light/core';
import type { MultiPolygon, Ring } from 'polygon-clipping';
import { slabEdges } from './edges.ts';
import type { Solid } from './solids.ts';

export const MM = 0.001;

function toPath<T extends Path>(target: T, r: Ring): T {
  const pts = r.length > 1 && r[0]?.[0] === r.at(-1)?.[0] && r[0]?.[1] === r.at(-1)?.[1] ? r.slice(0, -1) : r;
  pts.forEach(([x, y], i) => (i ? target.lineTo(x * MM, y * MM) : target.moveTo(x * MM, y * MM)));
  target.closePath();
  return target;
}

function shapesOf(mp: MultiPolygon): Shape[] {
  return mp.flatMap(([outer, ...holes]) => {
    if (!outer) return [];
    const s = toPath(new Shape(), outer);
    s.holes = holes.map((h) => toPath(new Path(), h));
    return [s];
  });
}

/** Materiály podle barvy (sdílené mezi tělesy stejné barvy). */
export class Materials {
  private readonly faces = new Map<string, MeshLambertMaterial>();
  private readonly lines = new Map<string, LineBasicMaterial>();

  face(color: string, transparent: boolean): MeshLambertMaterial {
    const key = `${color}|${transparent}`;
    let m = this.faces.get(key);
    if (!m) {
      m = new MeshLambertMaterial({ color, transparent, opacity: transparent ? 0.35 : 1 });
      m.depthWrite = !transparent;
      // Hrany se kreslí přes plochy bez „cik-cak“ (polygonOffset odsune plochy dozadu).
      m.polygonOffset = true;
      m.polygonOffsetFactor = 1;
      m.polygonOffsetUnits = 1;
      this.faces.set(key, m);
    }
    return m;
  }

  line(color: string): LineBasicMaterial {
    const c = mixColor(color, 0, 0.6);
    let m = this.lines.get(c);
    if (!m) this.lines.set(c, (m = new LineBasicMaterial({ color: c })));
    return m;
  }

  dispose() {
    for (const m of [...this.faces.values(), ...this.lines.values()]) m.dispose();
    this.faces.clear();
    this.lines.clear();
  }
}

/** Skupina sítí jednoho prvku; `userData.elementId` = id prvku (výběr). */
export function buildMeshes(solids: readonly Solid[], mats: Materials): Map<string, Group> {
  const groups = new Map<string, Group>();
  for (const s of solids) {
    let g = groups.get(s.elementId);
    if (!g) {
      g = new Group();
      g.userData = { elementId: s.elementId };
      groups.set(s.elementId, g);
    }
    for (const slab of s.slabs) {
      const geo = new ExtrudeGeometry(shapesOf(slab.shape), {
        depth: (slab.z1 - slab.z0) * MM,
        bevelEnabled: false,
      });
      geo.translate(0, 0, slab.z0 * MM);
      const mesh = new Mesh(geo, mats.face(s.color, s.transparent));
      mesh.userData = { elementId: s.elementId, base: mesh.material };
      g.add(mesh);
    }
    const edges = new BufferGeometry();
    edges.setAttribute(
      'position',
      new Float32BufferAttribute(
        slabEdges(s.slabs).map((v) => v * MM),
        3,
      ),
    );
    g.add(new LineSegments(edges, mats.line(s.color)));
  }
  return groups;
}

/** Uvolní geometrie skupiny (materiály patří Materials). */
export function disposeGroup(g: Group) {
  g.traverse((o) => {
    const geo = (o as { geometry?: BufferGeometry }).geometry;
    geo?.dispose();
  });
}

/** Zvýraznění vybraného prvku: plochy dostanou materiál výběru, ostatní svůj. */
export function highlight(g: Group, selected: Material | null) {
  g.traverse((o) => {
    if (o instanceof Mesh) o.material = selected ?? (o.userData.base as Material);
  });
}
