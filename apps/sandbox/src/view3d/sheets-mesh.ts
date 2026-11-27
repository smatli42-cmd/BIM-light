// Sítě povrchů místností (view3d/surface-sheets.ts): jedna síť na plochu, materiál podle barvy
// a průhlednosti (sdílený s tělesy, takže platí i rovina řezu). Barvy povrchů jen v režimu Materiály –
// bílý model, skica, skryté hrany a čárový je nekreslí. Plochy nejdou vybrat kliknutím (výběr trefí stěnu).
import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from 'three';
import { MM, type Materials } from './mesh.ts';
import type { Sheet } from './surface-sheets.ts';

export function buildSheets(sheets: readonly Sheet[], mats: Materials): Group {
  const g = new Group();
  if (mats.look.mode !== 'materials') return g;
  for (const s of sheets) {
    const geo = new BufferGeometry();
    geo.setAttribute(
      'position',
      new Float32BufferAttribute(
        s.positions.map((v) => v * MM),
        3,
      ),
    );
    geo.computeVertexNormals();
    const mesh = new Mesh(geo, mats.face(s.color, s.opacity, true));
    mesh.userData = { sheet: s.id, roomId: s.roomId };
    mesh.receiveShadow = mats.look.shadows;
    g.add(mesh);
  }
  g.userData = { sheets: true };
  return g;
}
