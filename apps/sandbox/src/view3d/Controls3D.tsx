// Rozsah 3D okna (koncepce rozhraní, část 2 E): výběr podlaží (jako Filter and Cut Elements in 3D
// v Archicadu) a ořezový kvádr (Section Box v Revitu). Obojí je nastavení 3D pohledu v modelu (příkazy
// view3d.setStoreys, view3d.setSectionBox) – jde přes AI i Undo.
import { storeysOf, type Id } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { BarMenu, type MenuItem } from '../ui/bottom/BarMenu.tsx';
import { IconButton } from '../ui/icons/Icon.tsx';
import { solidsBounds, type Box3D } from './clip.ts';
import type { Solid } from './solids.ts';
import { phaseFilters } from '../ui/bottom/phase.tsx';
import { active3d, pick3d, setBox3D, setStoreys3D } from './state.ts';

/** Okraj kvádru kolem obsahu při zapnutí (mm), aby řez nebyl hned v líci. */
const MARGIN = 300;

const grow = (b: Box3D, d: number): Box3D => ({
  min: { x: b.min.x - d, y: b.min.y - d, z: b.min.z - d },
  max: { x: b.max.x + d, y: b.max.y + d, z: b.max.z + d },
});

/** Podlaží budovy aktivního podlaží, nejvyšší nahoře (jako v Archicadu). */
function storeyList(s: Session) {
  const b = s.model.storeys[s.storeyId]?.buildingId ?? '';
  return storeysOf(s.model, b).reverse();
}

export function storeysLabel(s: Session): string {
  const cur = active3d(s).storeyIds;
  if (!cur) return 'Všechna podlaží';
  if (cur.length === 1) return s.model.storeys[cur[0] as Id]?.name ?? '1 podlaží';
  return `${cur.length} podlaží`;
}

export function Storeys3DMenu({ s }: { s: Session }) {
  const list = storeyList(s);
  const cur = active3d(s).storeyIds;
  const shown = new Set(cur ?? list.map((x) => x.id));
  const active = list.find((x) => x.id === s.storeyId);
  const below = active ? list.filter((x) => x.elevation <= active.elevation).map((x) => x.id) : [];
  const toggle = (id: Id) => {
    const next = shown.has(id) ? [...shown].filter((x) => x !== id) : [...shown, id];
    if (next.length) setStoreys3D(s, next);
  };
  const quick: MenuItem[] = [
    {
      label: 'Všechna podlaží',
      checked: !cur,
      testid: 'view3d-storeys-all',
      onPick: () => setStoreys3D(s, null),
    },
    { label: 'Jen aktivní', testid: 'view3d-storeys-active', onPick: () => setStoreys3D(s, [s.storeyId]) },
    { label: 'Aktivní a níž', testid: 'view3d-storeys-below', onPick: () => setStoreys3D(s, below) },
  ];
  const items: MenuItem[] = list.map((x) => ({
    label: x.name,
    checked: shown.has(x.id),
    keepOpen: true,
    testid: `view3d-storey-${x.name}`,
    onPick: () => toggle(x.id),
  }));
  return (
    <BarMenu
      icon="storeys"
      label={storeysLabel(s)}
      title="Podlaží viditelná ve 3D"
      testid="view3d-storeys"
      sections={[{ items: quick }, { title: 'Podlaží', items }]}
    />
  );
}

/** Zapne / vypne ořezový kvádr: kolem výběru (jako BX v Revitu), bez výběru kolem celého obsahu. */
export function SectionBoxButton({ s, solids }: { s: Session; solids: readonly Solid[] }) {
  const on = !!active3d(s).sectionBox;
  const toggle = () => {
    if (on) return setBox3D(s, null);
    const sel = new Set([...s.selection.walls, ...s.selection.slabs]);
    const picked = solids.filter((x) => sel.has(x.elementId));
    const b = solidsBounds(picked.length ? picked : solids);
    if (b) setBox3D(s, grow(b, MARGIN));
  };
  return (
    <IconButton
      icon="section-box"
      label={on ? 'Vypnout ořezový kvádr' : 'Ořezový kvádr (kolem výběru, jinak kolem všeho)'}
      testid="view3d-box"
      pressed={on}
      onClick={toggle}
    />
  );
}

/** Výběr uloženého 3D pohledu a „Nový 3D pohled“ (příkaz view3d.create). */
export function Views3DMenu({ s }: { s: Session }) {
  const cur = active3d(s);
  const items: MenuItem[] = Object.values(s.model.views3d).map((v) => ({
    label: v.name,
    checked: v.id === cur.id,
    testid: `view3d-view-${v.name}`,
    onPick: () => pick3d(s, v.id),
  }));
  const create = () => {
    const r = s.run('view3d.create', { styleId: cur.styleId });
    const id = r.ok ? r.created[0] : undefined;
    if (id) pick3d(s, id);
  };
  return (
    <BarMenu
      icon="cube"
      label={cur.name}
      title="3D pohled"
      testid="view3d-views"
      sections={[{ items }, { items: [{ label: 'Nový 3D pohled', testid: 'view3d-new', onPick: create }] }]}
    />
  );
}

/** Filtr rekonstrukce 3D pohledu (příkaz view3d.setPhaseFilter) – vlastní, jako u každého pohledu v Revitu. */
export function Phase3DMenu({ s }: { s: Session }) {
  const v = active3d(s);
  const set = (filterId: Id | null) => s.run('view3d.setPhaseFilter', { viewId: v.id, filterId });
  const items: MenuItem[] = [
    ...phaseFilters(s.model).map((f) => ({
      label: f.label,
      checked: f.id === v.phaseFilterId,
      testid: `view3d-phase-${f.label}`,
      onPick: () => set(f.id),
    })),
    { label: 'Vše', checked: v.phaseFilterId === null, testid: 'view3d-phase-Vše', onPick: () => set(null) },
  ];
  const label = phaseFilters(s.model).find((f) => f.id === v.phaseFilterId)?.label ?? 'Fáze';
  return (
    <BarMenu
      icon="phase"
      label={label}
      title="Filtr rekonstrukce 3D pohledu"
      testid="view3d-phase"
      sections={[{ items }]}
    />
  );
}
