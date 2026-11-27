// Rozsah 3D okna (koncepce rozhraní, část 2 E): výběr podlaží (jako Filter and Cut Elements in 3D
// v Archicadu) a ořezový kvádr (Section Box v Revitu). Zatím volby 3D okna; v jádře přibude 3D pohled
// s příkazy (docs/STAV-3d.md, požadavek na hlavní session).
import { storeysOf, type Id } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { BarMenu, type MenuItem } from '../ui/bottom/BarMenu.tsx';
import { IconButton } from '../ui/icons/Icon.tsx';
import { solidsBounds, type Box3D } from './clip.ts';
import type { Solid } from './solids.ts';
import { setBox3D, setStoreys3D, view3d } from './state.ts';

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
  const cur = view3d(s).storeys;
  if (!cur) return 'Všechna podlaží';
  if (cur.length === 1) return s.model.storeys[cur[0] as Id]?.name ?? '1 podlaží';
  return `${cur.length} podlaží`;
}

export function Storeys3DMenu({ s }: { s: Session }) {
  const list = storeyList(s);
  const cur = view3d(s).storeys;
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
  const on = !!view3d(s).box;
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
