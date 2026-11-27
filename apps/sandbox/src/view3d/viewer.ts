// 3D okno (three.js): kamera s osou Z nahoru jako v modelu, otáčení / posun / zoom (OrbitControls),
// přiblížení na obsah, výběr kliknutím a zvýraznění vybraných prvků. Kreslí jen na požádání
// (po změně kamery nebo scény), aby nebralo výkon půdorysu.
import {
  Box3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MeshLambertMaterial,
  MOUSE,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildMeshes, disposeGroup, highlight, Materials } from './mesh.ts';
import type { Solid } from './solids.ts';

/** Směr pohledu při „Zobrazit vše“: od jihovýchodu shora (axonometrie jako výchozí 3D v Archicadu). */
const VIEW_DIR = new Vector3(1, -1.3, 0.9).normalize();

export class Viewer {
  readonly renderer: WebGLRenderer;
  readonly camera = new PerspectiveCamera(40, 1, 0.05, 5000);
  readonly controls: OrbitControls;
  private readonly scene = new Scene();
  private readonly root = new Group();
  private readonly mats = new Materials();
  private groups = new Map<string, Group>();
  private readonly selectedMat: MeshLambertMaterial;
  private frame = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    colors: { background: string; selection: string },
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.scene.background = new Color(colors.background);
    this.selectedMat = new MeshLambertMaterial({ color: colors.selection });
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(20, -26, 18);
    this.controls = new OrbitControls(this.camera, canvas);
    // Levé tlačítko otáčí, prostřední a pravé posouvá, kolečko přibližuje k místu kurzoru.
    this.controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN };
    this.controls.zoomToCursor = true;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('change', () => this.render());
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(-0.5, -1, 1.6);
    this.scene.add(new HemisphereLight(0xffffff, 0x8a8f99, 1.4), sun, this.root);
  }

  setBackground(color: string) {
    this.scene.background = new Color(color);
    this.render();
  }

  /** Nahradí obsah scény tělesy modelu. */
  setSolids(solids: readonly Solid[]) {
    for (const g of this.groups.values()) disposeGroup(g);
    this.root.clear();
    this.groups = buildMeshes(solids, this.mats);
    for (const g of this.groups.values()) this.root.add(g);
    this.render();
  }

  get elementIds(): string[] {
    return [...this.groups.keys()];
  }

  setSelection(ids: readonly string[]) {
    const set = new Set(ids);
    for (const [id, g] of this.groups) highlight(g, set.has(id) ? this.selectedMat : null);
    this.render();
  }

  /** Přiblíží kameru na všechna tělesa (směr pohledu VIEW_DIR). */
  fit() {
    const box = new Box3().setFromObject(this.root);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new Sphere());
    const fov = (this.camera.fov * Math.PI) / 180;
    const fovMin = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect));
    const dist = (sphere.radius / Math.sin(fovMin / 2)) * 1.05;
    this.controls.target.copy(sphere.center);
    this.camera.position.copy(sphere.center).addScaledVector(VIEW_DIR, dist);
    this.camera.near = Math.max(0.01, dist / 1000);
    this.camera.far = dist * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.render();
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  /** Prvek pod bodem okna (px od levého horního rohu plátna), nebo null. */
  pick(x: number, y: number): string | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new Vector2((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1);
    const ray = new Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObjects(this.root.children, true).find((h) => h.object.type === 'Mesh');
    return (hit?.object.userData.elementId as string | undefined) ?? null;
  }

  /** Střed prvku v px plátna (pro testy). */
  screenOf(id: string): { x: number; y: number } | null {
    const g = this.groups.get(id);
    if (!g) return null;
    const c = new Box3().setFromObject(g).getCenter(new Vector3()).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: ((c.x + 1) / 2) * r.width, y: ((1 - c.y) / 2) * r.height };
  }

  render() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.renderer.render(this.scene, this.camera);
    });
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    for (const g of this.groups.values()) disposeGroup(g);
    this.mats.dispose();
    this.selectedMat.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
