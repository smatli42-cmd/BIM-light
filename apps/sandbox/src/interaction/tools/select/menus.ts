// Nabídky na pravé tlačítko (katalog kreslení 5 [R]; pravidla-interakce: kóty 6, Výběr).
import {
  allWalls,
  connectionsOf,
  endToType,
  sidesFor,
  type Id,
  type PathEnd,
  type Vec2,
  type WallFace,
} from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import type { MenuItem } from '../../../session/ui-state.ts';
import type { PermDimView } from '../../hits.ts';
import type { Mode } from '../../mode.ts';
import type { PointerInfo } from '../../types.ts';
import { editText } from '../../value-edit.ts';
import { AddPointMode, OffsetMode } from './wall-modes.ts';

type SetMode = (m: Mode) => void;

function open(s: Session, title: string, at: Vec2, items: MenuItem[]) {
  s.menu = { title, at, items };
}

export function dimMenu(s: Session, view: PermDimView, at: Vec2) {
  const d = view.dim;
  const del = s.selection.dims.includes(d.id) ? s.selection.dims : [d.id];
  const grouped = d.alignGroupId !== null;
  const items: MenuItem[] = [
    {
      label: d.locked ? 'Odemknout' : 'Zamknout',
      action: () => s.run('dimension.setLocked', { dimensionId: d.id, locked: !d.locked }),
    },
  ];
  if (grouped)
    items.push({
      label: 'Vyjmout ze skupiny zarovnání',
      action: () => s.run('dimension.setAlignGroup', { dimensionIds: [d.id], groupId: null }),
    });
  if (grouped && d.kind === 'linear')
    items.push({
      label: 'Rozdělit rovnoměrně',
      action: () => s.run('dimension.equalize', { dimensionId: d.id }),
    });
  if (d.kind !== 'angular')
    items.push({
      label: 'Přepnout stranu kóty',
      action: () => s.run('dimension.flipSide', { dimensionIds: [d.id] }),
    });
  items.push({ label: 'Přepsat text kóty', action: () => editText(s, view) });
  if (d.textOverride !== null)
    items.push({
      label: 'Vrátit skutečnou hodnotu',
      action: () => s.run('dimension.setText', { dimensionId: d.id, text: null }),
    });
  items.push({ label: 'Smazat kótu', action: () => s.run('dimension.delete', { dimensionIds: del }) });
  open(s, 'Kóta', at, items);
}

export function nodeMenu(s: Session, wallId: Id, end: PathEnd, at: Vec2) {
  open(s, 'Uzel', at, [
    {
      label: 'Odpojit roh',
      action: () => {
        if (s.run('wall.disconnect', { wallId, end }).ok) s.toast('Roh odpojen. Stěna má vlastní konec.');
      },
    },
    ...joinItem(s, wallId, end),
    { label: 'Smazat uzel', action: () => s.run('wall.deleteNode', { wallId, end }) },
  ]);
}

/** Přepínač „nespojovat“ napojeného konce (plán stěn Z2, jako Disallow Join). */
function joinItem(s: Session, wallId: Id, end: PathEnd): MenuItem[] {
  const here = connectionsOf(s.model, wallId).filter((c) => sidesFor(c, wallId).own.at === endToType(end));
  if (here.length === 0) return [];
  const off = here.some((c) => c.noJoin);
  return [
    {
      label: off ? 'Spojovat (vyčistit roh)' : 'Nespojovat',
      action: () => s.run('wall.setJoin', { wallId, end, join: off }),
    },
  ];
}

export function edgeMenu(s: Session, wallId: Id, face: WallFace, p: PointerInfo, setMode: SetMode) {
  open(s, 'Hrana (líc)', p.screen, [
    { label: 'Odsadit', action: () => setMode(new OffsetMode(s, wallId, face, p, false)) },
    { label: 'Přidat bod', action: () => setMode(new AddPointMode(s, wallId, p)) },
  ]);
}

/** Položky jen pro obloukovou stěnu (Z5): Vyrovnat, kóta poloměru a tětivy. */
function arcItems(s: Session, wallId: Id) {
  const w = s.model.elements[wallId];
  if (!w || w.path.kind !== 'arc' || Math.abs(w.path.bulge) < 1e-9) return [];
  const dim = (measure: 'radius' | 'chord') => () =>
    s.run('dimension.create', { kind: 'length', ref: { wallId, face: 'ref' }, measure, viewId: s.viewId });
  return [
    { label: 'Vyrovnat stěnu', action: () => s.run('wall.straighten', { wallIds: s.selection.walls }) },
    { label: 'Kóta poloměru', action: dim('radius') },
    { label: 'Kóta tětivy', action: dim('chord') },
  ];
}

export function wallMenu(s: Session, wallId: Id, at: Vec2) {
  const n = s.selection.walls.length;
  const cmd = (label: string, tool: Parameters<Session['setTool']>[0]) => ({
    label,
    action: () => s.setTool(tool),
  });
  open(s, n > 1 ? `Stěna (${n} vybraných)` : 'Stěna', at, [
    {
      label: 'Vybrat stejný typ',
      action: () => {
        const type = s.model.elements[wallId]?.typeId;
        s.selection.set(
          allWalls(s.model)
            .filter((w) => w.typeId === type && w.storeyId === s.storeyId)
            .map((w) => w.id),
        );
      },
    },
    cmd('Přesunout (M)', 'move'),
    cmd('Kopírovat (K)', 'copy'),
    cmd('Otočit (R)', 'rotate'),
    cmd('Zrcadlit (F)', 'mirror'),
    cmd('Pole (P)', 'array'),
    {
      label: 'Okótovat celou stěnu',
      action: () => s.run('dimension.wholeWall', { wallId, side: 'opp', viewId: s.viewId }),
    },
    ...arcItems(s, wallId),
    { label: 'Smazat (Del)', action: () => s.run('selection.delete', { wallIds: s.selection.walls }) },
  ]);
}

/** Nabídka otvoru (plán stěn Z4). */
export function openingMenu(s: Session, openingId: Id, at: Vec2) {
  const ids = s.selection.openings.includes(openingId) ? s.selection.openings : [openingId];
  const hostId = s.model.openings[openingId]?.hostId;
  const cmd = (label: string, tool: Parameters<Session['setTool']>[0]) => ({
    label,
    action: () => s.setTool(tool),
  });
  open(s, ids.length > 1 ? `Otvor (${ids.length} vybraných)` : 'Otvor', at, [
    cmd('Přesunout (M)', 'move'),
    cmd('Kopírovat (K)', 'copy'),
    cmd('Zrcadlit (F)', 'mirror'),
    ...(hostId
      ? [
          {
            label: 'Okótovat celou stěnu',
            action: () => s.run('dimension.wholeWall', { wallId: hostId, side: 'opp', viewId: s.viewId }),
          },
        ]
      : []),
    { label: 'Smazat otvor (Del)', action: () => s.run('opening.delete', { openingIds: ids }) },
  ]);
}
