// Živý náhled priorit spojování (okno Nastavení → Priority spojování): malý model z typů a materiálů
// projektu postavený příkazy z registru – obvodové zateplené stěny do tvaru L (vnější rohy i vnitřní
// roh, kde se izolace potká se zdivem), jedna stěna křídla nezateplená (roh L zateplené × zdi), příčka
// (T-spoj), strop na obvodových zdech a řez jím.
// Projekt se nemění; náhled se kreslí stejnou kresbou jako výkres (půdorys drawView, řez drawSection).
import { createCoreRegistry } from '../commands/all.ts';
import { Editor } from '../commands/editor.ts';
import { vec } from '../geometry/index.ts';
import { sequentialIds, type Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { WallType } from '../wall-type/types.ts';

export interface JoinPreview {
  readonly model: Model;
  readonly viewId: Id;
  readonly sectionId: Id | null;
  /** Rámeček půdorysu v mm (pro přiblížení náhledu). */
  readonly box: readonly [number, number, number, number];
  /** Výřez detailu vnitřního rohu (zateplená stěna × nezateplená zeď). */
  readonly detail: readonly [number, number, number, number];
}

/** Půdorys tvaru L po vnitřním líci, po směru hodin (tloušťka jde ven); vnitřní roh v bodě 3. */
const OUTLINE = [vec(0, 0), vec(0, 3000), vec(2500, 3000), vec(2500, 1500), vec(4500, 1500), vec(4500, 0)];

/** Strop na obvodových zdech: obrys L posunutý o 300 mm ven (uložení na zdivu). */
const SLAB = [
  [-300, -300],
  [-300, 3300],
  [2800, 3300],
  [2800, 1800],
  [4800, 1800],
  [4800, -300],
] as const;

const hasInsulation = (t: WallType) => t.bands.some((b) => b.layers.some((l) => l.function === 'insulation'));

/** Typy pro náhled: obvodový zateplený, nosný bez izolace, příčka (první vhodný v projektu). */
function previewTypes(m: Model) {
  const types = Object.values(m.wallTypes);
  const ext = types.find((t) => t.properties.isExternal && hasInsulation(t)) ?? types[0];
  const plain = types.find((t) => t.properties.loadBearing && !hasInsulation(t) && t.id !== ext?.id);
  const partition = types.find((t) => t.properties.function === 'partition');
  const slab = Object.values(m.slabTypes).find((t) => t.loadBearing && t.slabFunction !== 'floor');
  return { ext, plain, partition, slab };
}

/** Projekt bez prvků a anotací (typy, materiály, priority a grafika zůstanou). */
function emptied(m: Model): Model {
  return {
    ...m,
    elements: {},
    openings: {},
    slabOpenings: {},
    rooms: {},
    relations: {},
    dimensions: {},
    sections: {},
    levelDims: {},
    planLevelDims: {},
    sectionDims: {},
    compositionTags: {},
    wallTags: {},
    electroElements: {},
    elevationsAround: { ...m.elevationsAround, removed: ['1', '2', '3', '4'] },
  };
}

export function joinPreviewModel(project: Model): JoinPreview | null {
  const view = Object.values(project.views)[0];
  const storey = view && project.storeys[view.storeyId];
  const t = previewTypes(project);
  if (!view || !storey || !t.ext) return null;
  const newId = sequentialIds(250);
  const ed = new Editor(emptied(project), { registry: createCoreRegistry(), newId });
  const run = (name: string, params: Record<string, unknown>) => {
    const r = ed.execute(name, params);
    return r.ok ? r.created : [];
  };
  const projectStyle = Object.values(project.display.styles).find((s) => s.name === 'Projekt');
  if (projectStyle) run('view.setStyle', { viewId: view.id, styleId: projectStyle.id });
  const storeyId = storey.id;
  const walls = run('wall.chain', { storeyId, typeId: t.ext.id, points: OUTLINE, closed: true });
  const wing = walls[3];
  if (wing && t.plain) run('wall.setType', { wallIds: [wing], typeId: t.plain.id });
  if (t.partition) {
    const path = { kind: 'line', start: vec(1250, 0), end: vec(1250, 3000) };
    run('wall.create', { storeyId, typeId: t.partition.id, path, autoConnect: true });
  }
  let sectionId: Id | null = null;
  if (t.slab) {
    const outline = SLAB.map(([x, y]) => vec(x, y));
    run('slab.create', { storeyId, typeId: t.slab.id, outline, topOffset: storey.height });
    sectionId = run('section.create', { start: vec(600, -1500), end: vec(600, 4500) })[0] ?? null;
  }
  return {
    model: ed.model,
    viewId: view.id,
    sectionId,
    box: [-700, -700, 5200, 3700],
    detail: [2050, 1100, 3550, 2500],
  };
}
