// Paleta u uzlu a hrany vybrané stěny (koncepce rozhraní, část 2 I, jako „pet palette“ v Archicadu).
// Horní řádek = úprava uzlu / hrany (aktivní je ta, která právě běží), dolní = příkazy celé stěny.
// Každá položka je příkaz z registru nebo režim výběru, který končí příkazem (základy 6, 15).
import {
  connectionsOf,
  endPoint,
  endToType,
  sidesFor,
  type Id,
  type PathEnd,
  type WallFace,
} from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import type { PetItem } from '../../../session/ui-state.ts';
import type { Mode } from '../../mode.ts';
import type { PointerInfo } from '../../types.ts';
import { CurveMode } from './curve-mode.ts';
import { AddPointMode, OffsetMode } from './wall-modes.ts';

type SetMode = (m: Mode | null) => void;

/** Dolní řádek: příkazy pro celou vybranou stěnu (stejné jako v liště B). */
function wallRow(s: Session): PetItem[] {
  const tool = (icon: PetItem['icon'], label: string, id: Parameters<Session['setTool']>[0]): PetItem => ({
    icon,
    label,
    action: () => s.setTool(id),
  });
  return [
    tool('move', 'Přesunout – M', 'move'),
    tool('copy', 'Kopírovat – K', 'copy'),
    tool('rotate', 'Otočit – R', 'rotate'),
    tool('mirror', 'Zrcadlit – F', 'mirror'),
    tool('array', 'Pole – P', 'array'),
  ];
}

/** Paleta u koncového uzlu: posun uzlu (běží), odpojit roh, spojovat / nespojovat, smazat uzel. */
export function nodePet(s: Session, wallId: Id, end: PathEnd, setMode: SetMode) {
  const w = s.model.elements[wallId];
  if (!w) return;
  const here = connectionsOf(s.model, wallId).filter((c) => sidesFor(c, wallId).own.at === endToType(end));
  const off = here.some((c) => c.noJoin);
  const after = (fn: () => void) => () => {
    setMode(null);
    s.pet = null;
    fn();
    s.changed();
  };
  const top: PetItem[] = [{ icon: 'node-move', label: 'Posun uzlu', active: true, action: () => {} }];
  if (here.length > 0) {
    top.push({
      icon: 'disconnect',
      label: 'Odpojit roh',
      action: after(() => s.run('wall.disconnect', { wallId, end })),
    });
    top.push({
      icon: 'join',
      label: off ? 'Spojovat (vyčistit roh)' : 'Nespojovat',
      action: after(() => s.run('wall.setJoin', { wallId, end, join: off })),
    });
  }
  top.push({
    icon: 'node-delete',
    label: 'Smazat uzel',
    action: after(() => s.run('wall.deleteNode', { wallId, end })),
  });
  s.pet = { at: endPoint(w.path, end), rows: [top, wallRow(s)] };
}

type EdgeAction = 'offset' | 'add-point' | 'curve';

/** Paleta u hrany (líce): odsadit (běží), přidat bod, zakřivit. */
export function edgePet(
  s: Session,
  wallId: Id,
  face: WallFace,
  p: PointerInfo,
  setMode: SetMode,
  active: EdgeAction = 'offset',
) {
  const pick = (a: EdgeAction, make: () => Mode) => () => {
    setMode(make());
    edgePet(s, wallId, face, p, setMode, a);
    s.changed();
  };
  const top: PetItem[] = [
    {
      icon: 'offset',
      label: 'Odsadit hranu',
      active: active === 'offset',
      action: pick('offset', () => new OffsetMode(s, wallId, face, p, false)),
    },
    {
      icon: 'add-point',
      label: 'Přidat bod',
      active: active === 'add-point',
      action: pick('add-point', () => new AddPointMode(s, wallId, p)),
    },
    {
      icon: 'curve',
      label: 'Zakřivit',
      active: active === 'curve',
      action: pick('curve', () => new CurveMode(s, wallId, p, false)),
    },
  ];
  s.pet = { at: p.world, rows: [top, wallRow(s)] };
}
