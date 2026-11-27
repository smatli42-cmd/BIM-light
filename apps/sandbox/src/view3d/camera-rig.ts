// Kamery 3D okna: perspektiva a axonometrie (rovnoběžné promítání, Persp. / Axon. v Arditu). Obě mají
// osu Z nahoru; při přepnutí se zachová směr pohledu i velikost obrazu v cíli. Ovládání OrbitControls
// (levé tlačítko otáčí nebo posouvá podle nástroje, pravé posouvá, kolečko přibližuje ke kurzoru).
import { Box3, MOUSE, OrthographicCamera, PerspectiveCamera, Sphere, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Projection3d } from '@bim-light/core';

/** Směr pohledu při „Zobrazit vše“: od jihovýchodu shora (axonometrie jako výchozí 3D v Archicadu). */
const VIEW_DIR = new Vector3(1, -1.3, 0.9).normalize();

export type DragTool = 'orbit' | 'pan';

export class CameraRig {
  readonly persp = new PerspectiveCamera(40, 1, 0.05, 5000);
  readonly ortho = new OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
  readonly controls: OrbitControls;
  private aspect = 1;

  constructor(canvas: HTMLCanvasElement, onChange: () => void) {
    for (const c of [this.persp, this.ortho]) c.up.set(0, 0, 1);
    this.persp.position.set(20, -26, 18);
    this.controls = new OrbitControls(this.persp, canvas);
    this.controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN };
    this.controls.zoomToCursor = true;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('change', onChange);
  }

  get camera(): PerspectiveCamera | OrthographicCamera {
    return this.controls.object as PerspectiveCamera | OrthographicCamera;
  }

  get projection(): Projection3d {
    return this.camera === this.ortho ? 'axonometric' : 'perspective';
  }

  /** Levé tlačítko: otáčet, nebo posouvat (ruka). */
  setDragTool(t: DragTool) {
    this.controls.mouseButtons = {
      ...this.controls.mouseButtons,
      LEFT: t === 'pan' ? MOUSE.PAN : MOUSE.ROTATE,
    };
  }

  /** Výška obrazu v cíli (m) – stejná velikost po přepnutí projekce. */
  private viewHeight(): number {
    const c = this.camera;
    if (c instanceof OrthographicCamera) return (c.top - c.bottom) / c.zoom;
    const dist = c.position.distanceTo(this.controls.target);
    return 2 * dist * Math.tan((c.fov * Math.PI) / 360);
  }

  private frameOrtho(height: number) {
    const o = this.ortho;
    o.top = height / 2;
    o.bottom = -height / 2;
    o.left = (-height / 2) * this.aspect;
    o.right = (height / 2) * this.aspect;
    o.zoom = 1;
    o.updateProjectionMatrix();
  }

  setProjection(p: Projection3d) {
    if (p === this.projection) return;
    const h = this.viewHeight();
    const from = this.camera;
    const dir = from.position.clone().sub(this.controls.target).normalize();
    const to = p === 'axonometric' ? this.ortho : this.persp;
    if (to === this.ortho) {
      this.frameOrtho(h);
      // Rovnoběžná kamera stojí daleko, aby blízké a vzdálené roviny nic neořízly.
      to.position.copy(this.controls.target).addScaledVector(dir, Math.max(h * 4, 50));
    } else {
      const dist = h / (2 * Math.tan((this.persp.fov * Math.PI) / 360));
      to.position.copy(this.controls.target).addScaledVector(dir, dist);
      this.persp.near = Math.max(0.01, dist / 1000);
      this.persp.far = dist * 20;
      this.persp.updateProjectionMatrix();
    }
    this.controls.object = to;
    this.controls.update();
  }

  resize(width: number, height: number) {
    this.aspect = width / height;
    this.persp.aspect = this.aspect;
    this.persp.updateProjectionMatrix();
    const o = this.ortho;
    const h = o.top - o.bottom;
    o.left = (-h / 2) * this.aspect;
    o.right = (h / 2) * this.aspect;
    o.updateProjectionMatrix();
  }

  /** Přiblíží kameru na obsah `box` (m) ze směru VIEW_DIR. */
  fit(box: Box3) {
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new Sphere());
    const fov = (this.persp.fov * Math.PI) / 180;
    const fovMin = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * this.aspect));
    const dist = (sphere.radius / Math.sin(fovMin / 2)) * 1.05;
    this.controls.target.copy(sphere.center);
    const c = this.camera;
    if (c instanceof OrthographicCamera) {
      const h = (sphere.radius * 2.1) / Math.min(1, this.aspect);
      this.frameOrtho(h);
      c.position.copy(sphere.center).addScaledVector(VIEW_DIR, Math.max(sphere.radius * 8, 50));
      c.near = -sphere.radius * 20;
      c.far = sphere.radius * 40;
    } else {
      c.position.copy(sphere.center).addScaledVector(VIEW_DIR, dist);
      c.near = Math.max(0.01, dist / 1000);
      c.far = dist * 20;
    }
    c.updateProjectionMatrix();
    this.controls.update();
  }

  /** Vodorovný směr pohledu (jednotkový, z = 0). */
  horizontalDir(): Vector3 {
    const d = this.controls.target.clone().sub(this.camera.position).setZ(0);
    return d.lengthSq() > 1e-9 ? d.normalize() : new Vector3(0, 1, 0);
  }
}
