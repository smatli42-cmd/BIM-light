// Stav pískoviště: editor (jediná cesta do dat, základ 6), pohled, výběr, aktivní nástroj
// a ovládací prvky. Změny modelu jdou jen přes `run` (příkazy z registru jádra).
import {
  createCoreRegistry,
  createEmptyProject,
  createGlobalId,
  Editor,
  snapGeometry,
  resolveSnap,
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
  type WallSide,
} from '@bim-light/core';
import { Viewport } from '../canvas/viewport.ts';
import type { Clipboard } from '../interaction/clipboard.ts';
import { createTool } from '../interaction/tools/index.ts';
import type { Tool, ToolId } from '../interaction/types.ts';
import { Selection } from './selection.ts';
import type { MenuState, Toast, ToastAction, ToastKind, TypedInput, ValueEditState } from './ui-state.ts';

/** Tolerance přichycení a výběru v px (katalog kreslení 2, pravidla-interakce kóty 7). */
export const SNAP_PX = 10;
export const FACE_PX = 12;

export class Session {
  readonly editor: Editor;
  readonly registry = createCoreRegistry();
  readonly viewport = new Viewport();
  readonly selection = new Selection();
  viewId: Id;
  tool: Tool;
  wallTypeId: Id;
  wallSide: WallSide = 'left';
  tempMode: 'face' | 'axis' = 'face';
  /** Konec stěny, který se hýbe při změně délky (uchopený, nebo přepnutý trojúhelníkem). */
  lenEnd: PathEnd = 'end';
  tempOffsets: Record<string, number> = {};
  filter: SelectionFilter = ALL_CATEGORIES;
  clipboard: Clipboard | null = null;
  options = { copy: false, arrayCount: 3, arrayRadial: false };
  typed: TypedInput = { field: 'len', len: '', ang: '' };
  menu: MenuState | null = null;
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
    this.editor.subscribe(() => {
      this.selection.prune(this.model);
      this.changed();
    });
  }

  get model(): Model {
    return this.editor.model;
  }

  get view(): View {
    return this.model.views[this.viewId] as View;
  }

  get storeyId(): Id {
    return this.view.storeyId;
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
    this.valueEdit = null;
    this.snapCycle = 0;
    this.typed = { field: 'len', len: '', ang: '' };
    this.tool = createTool(id, this);
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
    return resolveSnap(this.geometry(o.exclude), raw, {
      ...o,
      tolerance: this.viewport.px(SNAP_PX),
      disabled: o.alt ?? o.disabled ?? false,
      cycle: this.snapCycle,
    });
  }
}
