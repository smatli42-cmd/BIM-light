// Rovina řezu ve 3D okně (Řez ve 3D v Arditu): průsvitný obdélník roviny a úchyt v jejím bodě. Tažení
// úchytu posune rovinu po jejím směru (pohyb myši promítnutý na směr na obrazovce). Model v mm, scéna v m.
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Plane,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Camera,
} from 'three';
import type { CutPlane3d } from '@bim-light/core';
import { toScreen } from './box-gizmo.ts';
import { MM } from './mesh.ts';

const vec = (p: { x: number; y: number; z: number }) => new Vector3(p.x, p.y, p.z);

/** Rovina three.js, která nechá část ve směru `normal` (záporná strana se ořízne). */
export function clipPlaneOf(c: CutPlane3d): Plane {
  const n = vec(c.normal).normalize();
  return new Plane(n, -n.dot(vec(c.origin).multiplyScalar(MM)));
}

export class CutGizmo {
  readonly group = new Group();
  private readonly sheetMat: MeshBasicMaterial;
  private readonly handleMat: MeshBasicMaterial;
  private readonly sphere = new SphereGeometry(1, 16, 12);
  private plane: CutPlane3d | null = null;
  handle: Mesh | null = null;

  constructor(accent: string) {
    this.sheetMat = new MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.08,
      side: DoubleSide,
      depthWrite: false,
    });
    this.handleMat = new MeshBasicMaterial({ color: accent });
    this.group.visible = false;
  }

  get value(): CutPlane3d | null {
    return this.plane;
  }

  /** Rovina (null = bez řezu); `size` = velikost obdélníku v m; obdélník jen během tažení (`sheet`). */
  set(plane: CutPlane3d | null, size: number, showSheet = false) {
    this.plane = plane;
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      const geo = (c as Mesh).geometry;
      if (geo && geo !== this.sphere) geo.dispose();
    }
    this.handle = null;
    this.group.visible = !!plane;
    if (!plane) return;
    const at = vec(plane.origin).multiplyScalar(MM);
    const sheet = new Mesh(new PlaneGeometry(size, size), this.sheetMat);
    sheet.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), vec(plane.normal)));
    sheet.position.copy(at);
    sheet.visible = showSheet;
    const h = new Mesh(this.sphere, this.handleMat);
    h.scale.setScalar(Math.max(0.1, size * 0.012));
    h.position.copy(at);
    this.handle = h;
    this.group.add(sheet, h);
  }

  /** Rovina posunutá po svém směru o tažení `dx, dy` px (plátno `width × height`). */
  dragged(start: CutPlane3d, dx: number, dy: number, camera: Camera, width: number, height: number) {
    const p = vec(start.origin).multiplyScalar(MM);
    const q = p.clone().add(vec(start.normal));
    const sp = toScreen(p, camera, width, height);
    const sq = toScreen(q, camera, width, height);
    const ax = sq.x - sp.x;
    const ay = sq.y - sp.y;
    const len2 = ax * ax + ay * ay;
    if (len2 < 1e-6) return start;
    const mm = (dx * ax + dy * ay) / len2 / MM;
    const o = start.origin;
    const n = start.normal;
    const origin = {
      x: Math.round(o.x + n.x * mm),
      y: Math.round(o.y + n.y * mm),
      z: Math.round(o.z + n.z * mm),
    };
    return { ...start, origin };
  }

  dispose() {
    this.set(null, 1);
    this.sphere.dispose();
    this.sheetMat.dispose();
    this.handleMat.dispose();
  }
}
