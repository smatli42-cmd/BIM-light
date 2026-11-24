// Vrstvy typu vybrané stěny: materiál každé vrstvy jde změnit (příkaz wallType.setLayerMaterial);
// šrafa v řezu se změní hned (střední podrobnost, styl Projekt). Změna platí pro celý typ.
import { materialFill, materialLines, type Wall } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { HatchSwatch } from './HatchSwatch.tsx';

const FUNCTION_LABEL: Record<string, string> = { core: 'jádro', insulation: 'izolace', finish: 'povrch' };

export function LayerMaterials({ s, wall }: { s: Session; wall: Wall }) {
  const type = s.model.wallTypes[wall.typeId];
  const band = type?.bands[0];
  if (!type || !band) return null;
  const mats = Object.values(s.model.materials);
  return (
    <div class="layers" data-testid="layer-materials">
      <p class="muted">Vrstvy typu {type.name} (změna platí pro všechny stěny typu)</p>
      {band.layers.map((l, i) => {
        const m = s.model.materials[l.materialId];
        return (
          <label key={i} class="layer-row">
            {m && (
              <HatchSwatch
                hatch={s.model.display.hatches[m.hatchId]}
                lines={materialLines(m)}
                fill={materialFill(m)}
                size={22}
              />
            )}
            <span>
              {l.thickness} mm · {FUNCTION_LABEL[l.function] ?? l.function}
            </span>
            <select
              data-testid={`layer-material-${i}`}
              value={l.materialId}
              onChange={(e) =>
                s.run('wallType.setLayerMaterial', {
                  typeId: type.id,
                  layerIndex: i,
                  materialId: e.currentTarget.value,
                })
              }
            >
              {mats.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}
