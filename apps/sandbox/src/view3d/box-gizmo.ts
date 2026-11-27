// Ořezový kvádr ve 3D okně (jako Section Box v Revitu): tenký obrys kvádru a na středu každé stěny úchyt.
// Tažení úchytu posune tu stěnu kvádru po její ose (směr myši se promítne na osu na obrazovce). Během tažení
// se mění jen obrys, po puštění se tělesa oříznou znovu (view3d/clip.ts). Model v mm, scéna v metrech.
import {
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
  type Camera,
} from 'three';
import type { Box3D, Point3 } from './clip.ts';
import { MM } from './mesh.ts';

type Axis = 'x' | 'y' | 'z';
type Side = 'min' | 'max';

export interface HandleRef {
  readonly axis: Axis;
  readonly side: Side;
}

/** Nejmenší rozměr kvádru (mm), aby se stěny nepřekřížily. */
const MIN_SIZE = 100;
const AXES: readonly Axis[] = ['x', 'y', 'z'];

export class BoxGizmo {
  readonly group = new Group();
  private readonly lineMat = new LineBasicMaterial({ color: 0x7a8290 });
  private readonly handleMat: MeshBasicMaterial;
  private readonly sphere = new SphereGeometry(1, 16, 12);
  private box: Box3D | null = null;

  constructor(accent: string) {
    this.handleMat = new MeshBasicMaterial({ color: accent });
    this.group.visible = false;
  }

  get value(): Box3D | null {
    return this.box;
  }

  get handles(): Mesh[] {
    return this.group.children.filter((c): c is Mesh => c instanceof Mesh);
  }

  set(box: Box3D | null) {
    this.box = box;
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      const geo = (c as Mesh).geometry;
      if (geo && geo !== this.sphere) geo.dispose();
    }
    this.group.visible = !!box;
    if (!box) return;
    const size = new Vector3(
      box.max.x - box.min.x,
      box.max.y - box.min.y,
      box.max.z - box.min.z,
    ).multiplyScalar(MM);
    const center = mid(box);
    const cube = new BoxGeometry(size.x, size.y, size.z);
    const edges = new EdgesGeometry(cube);
    cube.dispose();
    const outline = new LineSegments(edges, this.lineMat);
    outline.position.copy(center);
    this.group.add(outline);
    const r = Math.max(0.08, Math.min(size.x, size.y, size.z, 40) * 0.025);
    for (const axis of AXES)
      for (const side of ['min', 'max'] as const) {
        const h = new Mesh(this.sphere, this.handleMat);
        h.scale.setScalar(r);
        h.position.copy(center);
        h.position[axis] = box[side][axis] * MM;
        h.userData = { axis, side } satisfies HandleRef;
        this.group.add(h);
      }
  }

  /**
   * Nová poloha stěny kvádru po tažení o `dx, dy` px: posun myši promítnutý na osu úchytu na obrazovce
   * (`width × height` = velikost plátna). Vrací nový kvádr (mm), stěna nepřejde přes protější.
   */
  dragged(
    start: Box3D,
    h: HandleRef,
    dx: number,
    dy: number,
    camera: Camera,
    width: number,
    height: number,
  ): Box3D {
    const p = mid(start);
    p[h.axis] = start[h.side][h.axis] * MM;
    const q = p.clone();
    q[h.axis] += 1;
    const sp = toScreen(p, camera, width, height);
    const sq = toScreen(q, camera, width, height);
    const ax = sq.x - sp.x;
    const ay = sq.y - sp.y;
    const len2 = ax * ax + ay * ay;
    if (len2 < 1e-6) return start;
    const meters = (dx * ax + dy * ay) / len2;
    const v = start[h.side][h.axis] + meters / MM;
    const other = start[h.side === 'min' ? 'max' : 'min'][h.axis];
    const clamped = h.side === 'min' ? Math.min(v, other - MIN_SIZE) : Math.max(v, other + MIN_SIZE);
    const changed: Point3 = { ...start[h.side], [h.axis]: Math.round(clamped) };
    return { ...start, [h.side]: changed };
  }

  dispose() {
    this.set(null);
    this.sphere.dispose();
    this.lineMat.dispose();
    this.handleMat.dispose();
  }
}

function mid(b: Box3D): Vector3 {
  return new Vector3(b.min.x + b.max.x, b.min.y + b.max.y, b.min.z + b.max.z).multiplyScalar(MM / 2);
}

function toScreen(p: Vector3, camera: Camera, width: number, height: number) {
  const c = p.clone().project(camera);
  return { x: ((c.x + 1) / 2) * width, y: ((1 - c.y) / 2) * height };
}
