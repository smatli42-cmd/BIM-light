// Migrace projektu 31 → 32: čára řezu jako seznam bodů (zalomený řez), vzdálená oblast (vypnuto), styl
// řezu (žádný), výchozí styly řezu, grafika vzdálené oblasti a skupina anotací „Řezy a pohledy“ – značky
// stávajících řezů se do ní přesunou (jsou tak vidět ve všech stylech).
import { withSectionLayer } from '../style/presets/create.ts';
import { FAR_AREA_GRAPHICS, SECTION_LAYER } from '../style/presets/defaults.ts';
import type { DisplaySettings } from '../style/types.ts';
import { defaultSectionPresets } from './presets.ts';

type Obj = Record<string, unknown>;

function section(s: Obj): Obj {
  const { start, end, ...rest } = s;
  return {
    ...rest,
    points: rest['points'] ?? [start, end],
    farClip: rest['farClip'] ?? null,
    presetId: rest['presetId'] ?? null,
    annotationLayerId: SECTION_LAYER.id,
  };
}

export function projectV31toV32(data: Obj): Obj {
  const sections = (data['sections'] ?? {}) as Record<string, Obj>;
  const display = data['display'] as DisplaySettings | undefined;
  return {
    ...data,
    sections: Object.fromEntries(Object.entries(sections).map(([id, s]) => [id, section(s)])),
    sectionPresets: data['sectionPresets'] ?? defaultSectionPresets(),
    ...(display
      ? { display: { ...withSectionLayer(display), farArea: display.farArea ?? FAR_AREA_GRAPHICS } }
      : {}),
  };
}
