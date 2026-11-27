// 3D okno (three.js): kamera s osou Z nahoru jako v modelu (perspektiva / axonometrie, view3d/camera-rig.ts),
// režim zobrazení, slunce a stíny, rovina řezu, mřížka, ořezový kvádr, procházka, výběr kliknutím
// a zvýraznění vybraných prvků. Kreslí jen na požádání (po změně kamery nebo scény), aby nebralo výkon půdorysu.
import {
  Box3,
  Color,
  Group,
  MeshLambertMaterial,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { CutPlane3d, Point3, Projection3d } from '@bim-light/core';
import { BoxGizmo, type HandleRef } from './box-gizmo.ts';
import { installHandles } from './handles.ts';
import { CameraRig } from './camera-rig.ts';
import type { Box3D } from './clip.ts';
import { exactCut } from './clip-plane.ts';
import { clipPlaneOf, CutGizmo } from './cut-gizmo.ts';
import { makeGrid } from './grid.ts';
import { buildMeshes, DEFAULT_LOOK, disposeGroup, highlight, Materials, type Look } from './mesh.ts';
import type { Solid } from './solids.ts';
import { buildSheets } from './sheets-mesh.ts';
import { SunLight } from './sun-light.ts';
import type { Sheet } from './surface-sheets.ts';
import { Walk } from './walk.ts';

/** Vzhled scény z 3D pohledu (bez roviny řezu – ta má vlastní setCut). */
export type SceneLook = Omit<Look, 'clip'> & { readonly sunDir: Point3 };

export class Viewer {
  readonly renderer: WebGLRenderer;
  readonly rig: CameraRig;
  readonly walk: Walk;
  private readonly scene = new Scene();
  readonly root = new Group();
  private mats = new Materials();
  private groups = new Map<string, Group>();
  private solids: readonly Solid[] = [];
  private sheets: readonly Sheet[] = [];
  private readonly selectedMat: MeshLambertMaterial;
  private frame = 0;
  readonly gizmo: BoxGizmo;
  readonly cut: CutGizmo;
  private readonly offHandles: () => void;
  private readonly sun = new SunLight();
  private look: SceneLook = { ...DEFAULT_LOOK, sunDir: { x: -0.3, y: -0.6, z: 0.75 } };
  private grid: Group | null = null;
  private liveCut = false;
  /** Po puštění úchytu ořezového kvádru: nový kvádr (mm). */
  onBoxChange: (box: Box3D) => void = () => {};
  /** Po puštění úchytu roviny řezu: nová rovina (mm). */
  onCutChange: (plane: CutPlane3d) => void = () => {};
  /** Procházka skončila (Esc). */
  onWalkEnd: () => void = () => {};

  constructor(
    readonly canvas: HTMLCanvasElement,
    colors: { background: string; selection: string },
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.localClippingEnabled = true;
    this.scene.background = new Color(colors.background);
    this.selectedMat = new MeshLambertMaterial({ color: colors.selection });
    this.rig = new CameraRig(canvas, () => this.render());
    this.walk = new Walk(
      this.rig,
      canvas,
      () => this.render(),
      () => this.onWalkEnd(),
    );
    this.gizmo = new BoxGizmo(colors.selection);
    this.cut = new CutGizmo(colors.selection);
    this.scene.add(this.sun.group, this.root, this.gizmo.group, this.cut.group);
    this.offHandles = installHandles(this);
  }

  get camera() {
    return this.rig.camera;
  }

  /** Obsah scény (m), bez pomůcek. */
  bounds(): Box3 {
    return new Box3().setFromObject(this.root);
  }

  /** Ořezový kvádr: obrys a úchyty (null = vypnutý). */
  setBox(box: Box3D | null) {
    this.gizmo.set(box);
    this.render();
  }

  /**
   * Rovina řezu (null = bez řezu): obdélník a úchyt. Svislou a vodorovnou rovinu ořízne přesně okno
   * (view3d/clip-plane.ts); obraz ji ořezává jen během tažení (`live`) a u šikmé roviny.
   */
  setCut(plane: CutPlane3d | null, live = false) {
    const same = JSON.stringify(plane) === JSON.stringify(this.cut.value) && live === this.liveCut;
    this.liveCut = live;
    const b = this.bounds();
    this.cut.set(plane, b.isEmpty() ? 20 : b.getSize(new Vector3()).length() * 0.8, live);
    if (!same) this.rebuild();
    this.render();
  }

  /** Režim zobrazení, barvy motivu, stíny a směr ke slunci. */
  setLook(look: SceneLook) {
    const prev = this.look;
    this.look = look;
    this.scene.background = new Color(look.background);
    const remesh =
      prev.mode !== look.mode ||
      prev.background !== look.background ||
      prev.ink !== look.ink ||
      prev.shadows !== look.shadows;
    if (remesh) this.rebuild();
    else this.updateSun();
    this.render();
  }

  /** Mřížka v pracovní rovině ve výšce `z` mm; null = bez mřížky. */
  setGrid(z: number | null) {
    if (this.grid) {
      this.scene.remove(this.grid);
      disposeGroup(this.grid);
      this.grid = null;
    }
    if (z !== null) {
      this.grid = new Group().add(makeGrid(this.bounds(), z * 0.001, this.look.background));
      this.scene.add(this.grid);
    }
    this.render();
  }

  get hasGrid(): boolean {
    return !!this.grid;
  }

  setProjection(p: Projection3d) {
    if (this.walk.active) return;
    this.rig.setProjection(p);
    this.render();
  }

  ray(x: number, y: number): Raycaster {
    const r = this.canvas.getBoundingClientRect();
    const ray = new Raycaster();
    ray.setFromCamera(new Vector2((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1), this.camera);
    return ray;
  }

  /** Úchyt kvádru pod bodem plátna (px), nebo null. */
  handleAt(x: number, y: number): HandleRef | null {
    const hit = this.ray(x, y).intersectObjects(this.gizmo.handles, false)[0];
    return (hit?.object.userData as HandleRef | undefined) ?? null;
  }

  /** Nahradí obsah scény tělesy modelu a povrchy místností. */
  setSolids(solids: readonly Solid[], sheets: readonly Sheet[] = []) {
    this.solids = solids;
    this.sheets = sheets;
    this.rebuild();
  }

  private rebuild() {
    disposeGroup(this.root);
    this.root.clear();
    this.mats.dispose();
    const c = this.cut.value;
    const clip = c && (this.liveCut || !exactCut(c)) ? [clipPlaneOf(c)] : [];
    this.mats = new Materials({ ...this.look, clip });
    this.groups = buildMeshes(this.solids, this.mats);
    for (const g of this.groups.values()) this.root.add(g);
    this.root.add(buildSheets(this.sheets, this.mats));
    this.updateSun();
    this.render();
  }

  private updateSun() {
    this.sun.update(this.renderer, this.look.sunDir, this.look.shadows, this.bounds());
  }

  get elementIds(): string[] {
    return [...this.groups.keys()];
  }

  setSelection(ids: readonly string[]) {
    const set = new Set(ids);
    for (const [id, g] of this.groups) highlight(g, set.has(id) ? this.selectedMat : null);
    this.render();
  }

  /** Přiblíží kameru na všechna tělesa. */
  fit() {
    if (this.walk.active) return;
    this.rig.fit(this.bounds());
    this.render();
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.rig.resize(width, height);
    this.render();
  }

  /** Prvek pod bodem plátna (px), nebo null; část odříznutá rovinou řezu se nepočítá. */
  pick(x: number, y: number): string | null {
    const plane = this.cut.value ? clipPlaneOf(this.cut.value) : null;
    const hit = this.ray(x, y)
      .intersectObjects(this.root.children, true)
      .find((h) => h.object.userData.elementId && (!plane || plane.distanceToPoint(h.point) >= -1e-4));
    return (hit?.object.userData.elementId as string | undefined) ?? null;
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
    this.walk.stop();
    this.offHandles();
    this.setGrid(null);
    this.gizmo.dispose();
    this.cut.dispose();
    this.sun.dispose();
    disposeGroup(this.root);
    this.mats.dispose();
    this.selectedMat.dispose();
    this.rig.controls.dispose();
    this.renderer.dispose();
  }
}
