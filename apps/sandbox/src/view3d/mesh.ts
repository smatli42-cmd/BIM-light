// Převod těles (view3d/solids.ts) na sítě three.js: každý pás vrstvy = vytažený obrys s dírami,
// k tomu obrysové hrany (view3d/edges.ts, jako v Archicadu). Vzhled podle režimu zobrazení 3D pohledu
// (materiály, bílý model, čárový, skryté hrany, skica), rovina řezu ořízne plochy i hrany, stíny volitelně.
// Jednotky: model v mm, scéna v metrech (přesnost GPU).
import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Path,
  type Plane,
  Shape,
  type Material,
} from 'three';
import { mixColor, type RenderMode3d } from '@bim-light/core';
import type { MultiPolygon, Ring } from 'polygon-clipping';
import { boxed, elementEdges } from './element-edges.ts';
import type { Slab } from './slice.ts';
import { sketchSegments } from './sketch.ts';
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

/** Vzhled scény: režim zobrazení, barva pozadí a písma (motiv), rovina řezu, stíny. */
export interface Look {
  readonly mode: RenderMode3d;
  readonly background: string;
  readonly ink: string;
  readonly clip: readonly Plane[];
  readonly shadows: boolean;
}

export const DEFAULT_LOOK: Look = {
  mode: 'materials',
  background: '#ffffff',
  ink: '#1e1e1e',
  clip: [],
  shadows: false,
};

/** Barva bílého modelu a skici. */
const WHITE = '#f4f3ef';
/** Vlastní jas bílého modelu: plochy na slunci skoro bílé, ve stínu světle šedé (jako v Arditu). */
const GLOW = '#5c5c58';

/** Materiály podle barvy (sdílené mezi tělesy stejné barvy) a podle vzhledu scény. */
export class Materials {
  private readonly faces = new Map<string, MeshLambertMaterial | MeshBasicMaterial>();
  private readonly lines = new Map<string, LineBasicMaterial>();

  constructor(readonly look: Look = DEFAULT_LOOK) {}

  private makeFace(color: string, opacity: number, front: boolean) {
    const { mode, background } = this.look;
    const transparent = opacity < 1;
    const m =
      mode === 'hidden-lines' || mode === 'wireframe'
        ? new MeshBasicMaterial({ color: background, transparent, opacity })
        : mode === 'materials'
          ? new MeshLambertMaterial({ color, transparent, opacity })
          : new MeshLambertMaterial({ color: WHITE, emissive: GLOW, transparent, opacity });
    // Čárový režim: plochy se nekreslí, ale výběr kliknutím na ně dál funguje.
    m.visible = mode !== 'wireframe';
    m.depthWrite = !transparent;
    // Hrany se kreslí přes plochy bez „cik-cak“ (polygonOffset odsune plochy dozadu); povrchy místností
    // (`front`) naopak dopředu, aby vždy vyhrály nad lícem stěny i na dálku.
    m.polygonOffset = true;
    m.polygonOffsetFactor = front ? -2 : 1;
    m.polygonOffsetUnits = front ? -8 : 1;
    m.clippingPlanes = [...this.look.clip];
    // Odříznutá část nevrhá stín.
    m.clipShadows = true;
    return m;
  }

  face(color: string, opacity: number, front = false): MeshLambertMaterial | MeshBasicMaterial {
    const key = `${color}|${opacity}|${front}`;
    let m = this.faces.get(key);
    if (!m) this.faces.set(key, (m = this.makeFace(color, opacity, front)));
    return m;
  }

  private lineColor(color: string): string {
    const { mode, ink } = this.look;
    if (mode === 'materials' || mode === 'wireframe') return mixColor(color, 0, 0.6);
    const light = parseInt(ink.slice(1, 3), 16) > 128;
    return mode === 'white' ? mixColor(ink, light ? 0 : 255, 0.45) : ink;
  }

  line(color: string): LineBasicMaterial {
    const c = this.lineColor(color);
    let m = this.lines.get(c);
    if (!m) {
      m = new LineBasicMaterial({ color: c, clippingPlanes: [...this.look.clip] });
      this.lines.set(c, m);
    }
    return m;
  }

  dispose() {
    for (const m of [...this.faces.values(), ...this.lines.values()]) m.dispose();
    this.faces.clear();
    this.lines.clear();
  }
}

/** Hrany prvků: obrys celého prvku (ne vrstev), bez částí uvnitř jiných prvků; ve Skice kreslené. */
function edgesOf(solids: readonly Solid[], sketch: boolean): Map<string, number[]> {
  const byId = new Map<string, Slab[]>();
  for (const s of solids) byId.set(s.elementId, [...(byId.get(s.elementId) ?? []), ...s.slabs]);
  const all = [...byId].flatMap(([id, slabs]) => slabs.map((x) => ({ id, b: boxed(x) })));
  const out = new Map<string, number[]>();
  for (const [id, slabs] of byId) {
    const others = all.filter((o) => o.id !== id).map((o) => o.b);
    const own = solids.filter((s) => s.elementId === id).flatMap((s) => s.edges ?? []);
    const segs = [...elementEdges(slabs, others), ...own];
    out.set(
      id,
      (sketch ? sketchSegments(segs) : segs).map((v) => v * MM),
    );
  }
  return out;
}

function solidMesh(geo: BufferGeometry, s: Solid, mats: Materials): Mesh {
  const mesh = new Mesh(geo, mats.face(s.color, s.opacity));
  mesh.userData = { elementId: s.elementId, base: mesh.material };
  mesh.castShadow = mats.look.shadows && s.opacity >= 1;
  mesh.receiveShadow = mats.look.shadows;
  return mesh;
}

/** Skupina sítí jednoho prvku; `userData.elementId` = id prvku (výběr). */
export function buildMeshes(solids: readonly Solid[], mats: Materials): Map<string, Group> {
  const groups = new Map<string, Group>();
  for (const s of solids) {
    let g = groups.get(s.elementId);
    if (!g) {
      g = new Group();
      g.userData = { elementId: s.elementId, color: s.color };
      groups.set(s.elementId, g);
    }
    if (s.mesh?.length) {
      const geo = new BufferGeometry();
      geo.setAttribute(
        'position',
        new Float32BufferAttribute(
          s.mesh.map((v) => v * MM),
          3,
        ),
      );
      geo.computeVertexNormals();
      g.add(solidMesh(geo, s, mats));
    }
    for (const slab of s.slabs) {
      const geo = new ExtrudeGeometry(shapesOf(slab.shape), {
        depth: (slab.z1 - slab.z0) * MM,
        bevelEnabled: false,
      });
      geo.translate(0, 0, slab.z0 * MM);
      g.add(solidMesh(geo, s, mats));
    }
  }
  for (const [id, segs] of edgesOf(solids, mats.look.mode === 'sketch')) {
    const g = groups.get(id);
    if (!g) continue;
    const edges = new BufferGeometry();
    edges.setAttribute('position', new Float32BufferAttribute(segs, 3));
    g.add(new LineSegments(edges, mats.line(g.userData.color as string)));
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
