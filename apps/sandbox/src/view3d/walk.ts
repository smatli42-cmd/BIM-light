// Procházka ve 3D okně (jako Procházka v Arditu, Shift+F3): oko 1,6 m nad aktivním podlažím, W A S D
// (i šipky) pohyb, Shift rychleji, Q / E dolů / nahoru, tažení myší rozhlížení, kolečko krok vpřed / vzad,
// Esc konec. Klávesy během procházky nejdou do půdorysu (W by jinak spustilo nástroj). Scéna v metrech.
import { Vector3 } from 'three';
import type { CameraRig } from './camera-rig.ts';

/** Výška oka nad podlahou (m). */
export const EYE = 1.6;
/** Rychlost chůze (m/s); se Shiftem 3×. */
const SPEED = 1.5;
const MOVE: Record<string, [number, number, number]> = {
  w: [1, 0, 0],
  arrowup: [1, 0, 0],
  s: [-1, 0, 0],
  arrowdown: [-1, 0, 0],
  a: [0, -1, 0],
  arrowleft: [0, -1, 0],
  d: [0, 1, 0],
  arrowright: [0, 1, 0],
  q: [0, 0, -1],
  e: [0, 0, 1],
};

export class Walk {
  active = false;
  private yaw = 0;
  private pitch = 0;
  private readonly keys = new Set<string>();
  private fast = false;
  private frame = 0;
  private last = 0;
  private drag: { x: number; y: number } | null = null;

  constructor(
    private readonly rig: CameraRig,
    private readonly canvas: HTMLCanvasElement,
    private readonly render: () => void,
    private readonly onExit: () => void,
  ) {}

  /** Začne procházku v místě, kam se kamera dívá, s okem ve výšce `floorZ + EYE` (m). */
  start(floorZ: number) {
    if (this.active) return;
    this.active = true;
    const dir = this.rig.horizontalDir();
    this.yaw = Math.atan2(dir.y, dir.x);
    this.pitch = 0;
    this.rig.setProjection('perspective');
    const cam = this.rig.persp;
    cam.position.set(this.rig.controls.target.x, this.rig.controls.target.y, floorZ + EYE);
    cam.near = 0.05;
    cam.far = 2000;
    cam.updateProjectionMatrix();
    this.rig.controls.enabled = false;
    this.look();
    window.addEventListener('keydown', this.onKey, { capture: true });
    window.addEventListener('keyup', this.onKeyUp, { capture: true });
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.keys.clear();
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    window.removeEventListener('keydown', this.onKey, { capture: true });
    window.removeEventListener('keyup', this.onKeyUp, { capture: true });
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('wheel', this.onWheel);
    // Otáčení pak pokračuje kolem bodu 5 m před okem.
    this.rig.controls.target.copy(this.rig.persp.position).addScaledVector(this.forward(), 5);
    this.rig.controls.enabled = true;
    this.rig.controls.update();
    this.onExit();
  }

  private forward(): Vector3 {
    const c = Math.cos(this.pitch);
    return new Vector3(Math.cos(this.yaw) * c, Math.sin(this.yaw) * c, Math.sin(this.pitch));
  }

  private look() {
    const cam = this.rig.persp;
    cam.lookAt(cam.position.clone().add(this.forward()));
    this.render();
  }

  /** Posun o `f` m vpřed, `r` m vpravo, `u` m nahoru (vodorovně podle natočení). */
  move(f: number, r: number, u: number) {
    const fx = Math.cos(this.yaw);
    const fy = Math.sin(this.yaw);
    this.rig.persp.position.add(new Vector3(fx * f + fy * r, fy * f - fx * r, u));
    this.look();
  }

  private tick = (t: number) => {
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 0;
    this.last = t;
    let [f, r, u] = [0, 0, 0];
    for (const k of this.keys) {
      const m = MOVE[k];
      if (m) [f, r, u] = [f + m[0], r + m[1], u + m[2]];
    }
    const step = SPEED * (this.fast ? 3 : 1) * dt;
    if (step) this.move(f * step, r * step, u * step);
    this.frame = this.keys.size ? requestAnimationFrame(this.tick) : 0;
  };

  private readonly onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') return (e.stopImmediatePropagation(), this.stop());
    if (!MOVE[k] && k !== 'shift') return;
    e.stopImmediatePropagation();
    e.preventDefault();
    this.fast = e.shiftKey;
    if (k === 'shift' || this.keys.has(k)) return;
    this.keys.add(k);
    if (!this.frame) {
      this.last = 0;
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.fast = e.shiftKey;
    this.keys.delete(e.key.toLowerCase());
  };

  private readonly onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.drag = { x: e.clientX, y: e.clientY };
    const move = (m: PointerEvent) => {
      if (!this.drag) return;
      this.yaw -= (m.clientX - this.drag.x) * 0.005;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - (m.clientY - this.drag.y) * 0.005));
      this.drag = { x: m.clientX, y: m.clientY };
      this.look();
    };
    const up = () => {
      this.drag = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  private readonly onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.move(e.deltaY < 0 ? 0.5 : -0.5, 0, 0);
  };
}
