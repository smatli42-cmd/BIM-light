// Stav pískoviště: editor (jediná cesta do dat, základ 6), pohled, výběr, aktivní nástroj
// a ovládací prvky. Změny modelu jdou jen přes `run` (příkazy z registru jádra).
import {
  createCoreRegistry,
  createEmptyProject,
  createGlobalId,
  Editor,
  snapGeometry,
  resolveSnap,
  typeHasCore,
  ALL_CATEGORIES,
  type ExecuteResult,
  type Id,
  type Model,
  type PathEnd,
  type SelectionFilter,
  type SnapOptions,
  type SnapResult,
  type Vec2,
  type View,
  type WallGeometry,
  type ReferenceLine,
  type WallSide,
} from '@bim-light/core';
import { Viewport } from '../canvas/viewport.ts';
import type { Clipboard } from '../interaction/clipboard.ts';
import { createTool } from '../interaction/tools/index.ts';
import type { Tool, ToolId } from '../interaction/types.ts';
import { wallToolFor, type WallMethod } from '../interaction/tools/wall-method.ts';
import { Selection } from './selection.ts';
import { OPENING_DEFAULTS, TOOL_OPTIONS, type OpeningDefaults } from './opening-defaults.ts';
import type { Paper } from '../render/paper.ts';
import { DEFAULT_SCREEN, type ScreenOptions } from './screen.ts';
import type { WindowState } from './screen.ts';
import { applyTheme, loadUi, saveUi, type Theme } from '../ui/theme.ts';
import type {
  MenuState,
  PetState,
  Toast,
  ToastAction,
  ToastKind,
  TypedInput,
  ValueEditState,
} from './ui-state.ts';

/** Tolerance přichycení a výběru v px (katalog kreslení 2, pravidla-interakce kóty 7). */
export const SNAP_PX = 10;
export const FACE_PX = 12;

export class Session {
  readonly editor: Editor;
  readonly registry = createCoreRegistry();
  /** Okna vedle sebe (koncepce rozhraní, část 2 E, G); nástroje pracují v aktivním. */
  readonly windows: WindowState[] = [{ viewId: '', viewport: new Viewport() }];
  active = 0;
  readonly selection = new Selection();
  tool: Tool;
  wallTypeId: Id;
  wallSide: WallSide = 'left';
  /** Referenční čára nových stěn: podle ní se kreslí a od ní roste tloušťka (líc / osa / líc jádra). */
  wallRefLine: ReferenceLine = 'face';
  tempMode: 'face' | 'axis' = 'face';
  /** Konec stěny, který se hýbe při změně délky (uchopený, nebo přepnutý trojúhelníkem). */
  lenEnd: PathEnd = 'end';
  tempOffsets: Record<string, number> = {};
  filter: SelectionFilter = ALL_CATEGORIES;
  clipboard: Clipboard | null = null;
  /** Volby příkazů nad výběrem (session/opening-defaults.ts). */
  options = { ...TOOL_OPTIONS };
  /** Rozměry nového otvoru (nástroj Otvor, plán stěn Z4). */
  openingDefaults: OpeningDefaults = { ...OPENING_DEFAULTS };
  typed: TypedInput = { field: 'len', len: '', ang: '' };
  menu: MenuState | null = null;
  /** Paleta u uzlu / hrany vybrané stěny (koncepce rozhraní, část 2 I). */
  pet: PetState | null = null;
  valueEdit: ValueEditState | null = null;
  toasts: Toast[] = [];
  /** Kóty, které brání změně (zvýrazní se červeně). */
  flashDims: Id[] = [];
  snapCycle = 0;
  cursor: { screen: Vec2; world: Vec2; inside: boolean } = {
    screen: { x: 0, y: 0 },
    world: { x: 0, y: 0 },
    inside: false,
  };
  /** Volby zobrazení okna ze spodní lišty (session/screen.ts). */
  screen: ScreenOptions = structuredClone(DEFAULT_SCREEN);
  /** Zvolená sada zobrazení (styl) – filtruje Obsah (session/sets.ts); null = podle pracovního okna. */
  setStyleId: Id | null = null;
  /** Geometrická metoda nástroje Stěna (koncepce rozhraní, část 2 D). */
  wallMethod: WallMethod = 'chain';
  /** Motiv rozhraní a podklad výkresu (koncepce rozhraní, část 5). */
  theme: Theme;
  paper: Paper;
  private toastSeq = 0;
  private readonly listeners = new Set<() => void>();
  private geomCache: { model: Model; key: string; geoms: WallGeometry[] } | null = null;

  constructor(model?: Model) {
    const newId = () => createGlobalId();
    const m = model ?? createEmptyProject(newId, 'Pískoviště');
    this.editor = new Editor(m, { registry: this.registry, newId });
    this.viewId = Object.keys(m.views)[0] as Id;
    this.wallTypeId = Object.values(m.wallTypes)[0]?.id ?? '';
    this.tool = createTool('select', this);
    const ui = loadUi();
    this.theme = ui.theme;
    this.paper = ui.paper;
    this.editor.subscribe(() => {
      // Pohled mohl zmizet (Undo nového pohledu): přepne se na první existující.
      for (const w of this.windows)
        if (!this.model.views[w.viewId]) w.viewId = Object.keys(this.model.views)[0] as Id;
      this.keepNewWallType();
      this.selection.prune(this.model);
      this.changed();
    });
  }

  /** Typ nových stěn mohl zmizet (smazání, vyčištění); bez jádra nejde „líc jádra“ (plán stěn Z1). */
  private keepNewWallType() {
    if (!this.model.wallTypes[this.wallTypeId]) this.wallTypeId = Object.keys(this.model.wallTypes)[0] ?? '';
    const t = this.model.wallTypes[this.wallTypeId];
    if (this.wallRefLine === 'core-face' && t && !typeHasCore(t)) this.wallRefLine = 'face';
  }

  /** Přepne motiv (světlý / tmavý) nebo podklad výkresu a zapamatuje volbu. */
  setLook(look: { theme?: Theme; paper?: Paper }) {
    this.theme = look.theme ?? this.theme;
    this.paper = look.paper ?? this.paper;
    applyTheme(this.theme);
    saveUi({ theme: this.theme, paper: this.paper });
    this.changed();
  }

  get model(): Model {
    return this.editor.model;
  }

  /** Výřez aktivního okna. */
  get viewport(): Viewport {
    return (this.windows[this.active] as WindowState).viewport;
  }

  /** Pohled aktivního okna. */
  get viewId(): Id {
    return (this.windows[this.active] as WindowState).viewId;
  }

  set viewId(id: Id) {
    (this.windows[this.active] as WindowState).viewId = id;
  }

  get view(): View {
    return this.model.views[this.viewId] as View;
  }

  get storeyId(): Id {
    return this.view.storeyId;
  }

  /** Přepne aktivní pohled (výběr se zruší, jiný pohled může mít jiné podlaží). */
  setView(id: Id) {
    if (!this.model.views[id] || id === this.viewId) return;
    this.viewId = id;
    this.selection.set([]);
    this.changed();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Překreslit výkres i ovládání. */
  changed() {
    for (const fn of this.listeners) fn();
  }

  /** Spustí příkaz jádra; chybu ukáže hláškou a zvýrazní kóty, které brání (katalog kreslení 4). */
  run(name: string, params: unknown): ExecuteResult {
    const r = this.editor.execute(name, params);
    if (!r.ok) {
      const ids = [...(r.error.dimensionIds ?? [])];
      const unlock = ids.length ? { label: 'Odemknout kótu', run: () => this.unlock(ids) } : undefined;
      this.toast(r.error.message, 'bad', unlock);
      this.flashDims = ids;
      this.changed();
    } else this.flashDims = [];
    return r;
  }

  setTool(id: ToolId) {
    this.menu = null;
    this.pet = null;
    this.valueEdit = null;
    this.snapCycle = 0;
    this.typed = { field: 'len', len: '', ang: '' };
    // Obdélník a oblouk jsou metody nástroje Stěna: zkratky B / A metodu přepnou.
    if (id === 'rect') this.wallMethod = 'rect';
    if (id === 'arc') this.wallMethod = 'arc';
    this.tool = createTool(id === 'wall' ? wallToolFor(this.wallMethod) : id, this);
    this.changed();
  }

  /** Odemkne kóty, které bránily změně (katalog kreslení 4: nabídne se odemknutí). */
  private unlock(ids: readonly Id[]) {
    for (const id of ids) this.run('dimension.setLocked', { dimensionId: id, locked: false });
    this.flashDims = [];
    this.toasts = [];
    this.changed();
  }

  toast(text: string, kind: ToastKind = 'ok', action?: ToastAction) {
    const id = ++this.toastSeq;
    this.toasts = [...this.toasts.slice(-2), { id, text, kind, action }];
    this.changed();
    setTimeout(
      () => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.changed();
      },
      action ? 8000 : 4000,
    );
  }

  /** Geometrie stěn podlaží pro přichytávání (mezipaměť podle modelu). */
  geometry(exclude?: ReadonlySet<Id>): WallGeometry[] {
    const key = exclude ? [...exclude].sort().join(',') : '';
    if (!this.geomCache || this.geomCache.model !== this.model || this.geomCache.key !== key) {
      this.geomCache = { model: this.model, key, geoms: snapGeometry(this.model, this.storeyId, exclude) };
    }
    return this.geomCache.geoms;
  }

  /** Přichytí bod (základ 20); tolerance z px, Alt vypne, C střídá kandidáty. */
  snap(raw: Vec2, o: Partial<SnapOptions> & { alt?: boolean } = {}): SnapResult {
    const r = resolveSnap(this.geometry(o.exclude), raw, {
      grid: this.options.grid || this.screen.step || null,
      ...o,
      tolerance: this.viewport.px(SNAP_PX),
      // Přichytávání vypnuté ve spodní liště = jako trvale držený Alt (krok kurzoru zůstává).
      disabled: (o.alt ?? o.disabled ?? false) || !this.screen.snap,
      cycle: this.snapCycle,
    });
    return this.screen.guides ? r : { ...r, guides: [] };
  }
}
