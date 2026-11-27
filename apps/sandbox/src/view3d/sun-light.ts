// Slunce a stíny ve 3D okně: směrové světlo ze směru slunce 3D pohledu (jádro: sunDirection – ručně, nebo
// podle data, času a georeference), stíny přes stínovou mapu a neviditelná podložka pod modelem, na kterou
// stíny padají. Bez stínů měkké světlo jako dřív. Scéna v metrech.
import {
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PCFSoftShadowMap,
  PlaneGeometry,
  ShadowMaterial,
  Sphere,
  Vector3,
  type WebGLRenderer,
} from 'three';
import type { Point3 } from '@bim-light/core';

export class SunLight {
  readonly group = new Group();
  private readonly sun = new DirectionalLight(0xffffff, 1.6);
  private readonly sky = new HemisphereLight(0xffffff, 0x8a8f99, 1.4);
  private readonly ground = new Mesh(new PlaneGeometry(1, 1), new ShadowMaterial({ opacity: 0.22 }));

  constructor() {
    this.sun.shadow.mapSize.set(2048, 2048);
    // Měkké stíny (PCF) s posunem proti „akné“ (pruhy a trojúhelníky stínu na osvětlených stěnách).
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 3;
    this.ground.receiveShadow = true;
    this.ground.visible = false;
    this.group.add(this.sky, this.sun, this.sun.target, this.ground);
  }

  /** Nastaví světlo podle směru ke slunci (osy modelu) a obsahu scény `bounds` (m). */
  update(renderer: WebGLRenderer, dir: Point3, shadows: boolean, bounds: Box3) {
    const up = dir.z > 0.01;
    const on = shadows && up && !bounds.isEmpty();
    renderer.shadowMap.enabled = on;
    renderer.shadowMap.type = PCFSoftShadowMap;
    this.sun.castShadow = on;
    this.ground.visible = on;
    this.sun.intensity = up ? (on ? 2.2 : 1.6) : 0.3;
    this.sky.intensity = on ? 1.0 : 1.4;
    const sphere = bounds.isEmpty() ? new Sphere(new Vector3(), 10) : bounds.getBoundingSphere(new Sphere());
    const r = Math.max(sphere.radius, 1);
    const d = new Vector3(dir.x, dir.y, Math.max(dir.z, 0.05)).normalize();
    this.sun.target.position.copy(sphere.center);
    this.sun.position.copy(sphere.center).addScaledVector(d, r * 2);
    const cam = this.sun.shadow.camera;
    cam.left = -r * 1.2;
    cam.right = r * 1.2;
    cam.top = r * 1.2;
    cam.bottom = -r * 1.2;
    cam.near = 0.1;
    cam.far = r * 4;
    cam.updateProjectionMatrix();
    // Podložka pod nejnižším bodem modelu, dost velká na dlouhé stíny.
    this.ground.scale.set(r * 8, r * 8, 1);
    this.ground.position.set(sphere.center.x, sphere.center.y, bounds.isEmpty() ? 0 : bounds.min.z - 0.002);
  }

  dispose() {
    this.ground.geometry.dispose();
    (this.ground.material as ShadowMaterial).dispose();
    this.sun.shadow.map?.dispose();
  }
}
