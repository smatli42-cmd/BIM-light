// Mřížka v pracovní rovině 3D okna (jako v Arditu): čtverce 1 m ve výšce aktivního podlaží, přes obsah
// s okrajem 5 m. Barva z motivu: pozadí ztmavené (ve světlém) nebo zesvětlené (v tmavém). Scéna v metrech.
import { Box3, GridHelper } from 'three';
import { mixColor } from '@bim-light/core';

export function makeGrid(bounds: Box3, z: number, background: string): GridHelper {
  const w = bounds.isEmpty() ? 20 : Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);
  const size = Math.ceil(w / 2 + 5) * 2;
  const toward = parseInt(background.slice(1, 3), 16) > 128 ? 0 : 255;
  const grid = new GridHelper(
    size,
    size,
    mixColor(background, toward, 0.35),
    mixColor(background, toward, 0.14),
  );
  grid.rotation.x = Math.PI / 2;
  const cx = bounds.isEmpty() ? 0 : Math.round((bounds.min.x + bounds.max.x) / 2);
  const cy = bounds.isEmpty() ? 0 : Math.round((bounds.min.y + bounds.max.y) / 2);
  // Těsně pod rovinou podlaží, aby podlaha mřížku zakryla (bez blikání stejné roviny).
  grid.position.set(cx, cy, z - 0.002);
  grid.userData = { helper: true };
  return grid;
}
