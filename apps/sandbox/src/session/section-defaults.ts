// Výchozí nastavení nového řezu (nástroj Řez; info box podle Arditu „Řez – výchozí nastavení nových prvků“):
// styl řezu, vrstva značky, geometrická metoda (rovný / zalomený), hloubka a vzdálená oblast. Jen stav rozhraní.
import type { Id } from '@bim-light/core';
import type { Session } from './session.ts';

export type SectionMethod = 'straight' | 'jogged';

export interface SectionDefaults {
  /** Záložka info boxu: Instance (nový řez), nebo Styl (úprava vybraného stylu řezu). */
  tab: 'instance' | 'style';
  presetId: Id | null;
  /** Vrstva značky; null = výchozí podle jádra (Řezy a pohledy). */
  layerId: Id | null;
  method: SectionMethod;
  /** Hloubka pohledu (mm); null = neomezená (jako Ardit: prázdné pole). */
  depth: number | null;
  /** Vzdálená oblast od (mm); null = vypnuto. */
  farClip: number | null;
}

interface SectionUi {
  defaults: SectionDefaults;
}

const store = new WeakMap<Session, SectionUi>();

function ui(s: Session): SectionUi {
  let u = store.get(s);
  if (!u) {
    u = {
      defaults: {
        tab: 'instance',
        presetId: null,
        layerId: null,
        method: 'straight',
        depth: null,
        farClip: null,
      },
    };
    store.set(s, u);
  }
  return u;
}

export const sectionDefaults = (s: Session): SectionDefaults => ui(s).defaults;

/** Změní výchozí nastavení a překreslí rozhraní. */
export function setSectionDefaults(s: Session, patch: Partial<SectionDefaults>) {
  Object.assign(ui(s).defaults, patch);
  s.changed();
}

/** Parametry příkazu section.create z výchozího nastavení (styl řezu přebije hloubku a vzdálenou oblast). */
export function sectionCreateParams(s: Session) {
  const d = sectionDefaults(s);
  const preset = d.presetId && s.model.sectionPresets[d.presetId] ? d.presetId : null;
  return {
    ...(preset ? { presetId: preset } : { depth: d.depth, farClip: d.farClip }),
    ...(d.layerId && s.model.display.layers[d.layerId] ? { annotationLayerId: d.layerId } : {}),
  };
}

/** Výchozí nastavení nové výškové kóty: relativní / absolutní, značka v půdorysu (rámeček / kroužek). */
export interface LevelDimDefaults {
  absolute: boolean;
  marker: 'box' | 'circle';
}

const levelStore = new WeakMap<Session, LevelDimDefaults>();

export function levelDimDefaults(s: Session): LevelDimDefaults {
  let d = levelStore.get(s);
  if (!d) levelStore.set(s, (d = { absolute: false, marker: 'box' }));
  return d;
}
