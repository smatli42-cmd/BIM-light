// Příkazy elektro prvku (koncepce 3): vložení na líc stěny nebo do bodu (strop, místnost) a úprava
// vlastností (Ardit: Osazení, Rámeček, Značka v půdorysu, Rozvaděč). Každý je jeden krok Zpět.
import type { ElectroElement } from '../../electro/types.ts';
import type { Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { storeyOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import {
  checkSlots,
  electroOf,
  electroTypeOf,
  GROUP,
  hostFrom,
  NULLABLE,
  PLACEMENT_PROPS,
  putElectro,
  type HostParams,
} from './shared.ts';
import type { BoardSize, SlotLayout, SymbolPlacement } from '../../electro/types.ts';

const STATUS = S.enumOf(STATUSES, 'stav: stávající / bourání / nový');

interface Props extends HostParams {
  mark?: string;
  status?: Status;
  layout?: SlotLayout;
  symbol?: SymbolPlacement;
  height?: number | null;
  slots?: string[] | null;
  board?: Partial<BoardSize> | null;
  length?: number | null;
}

/** Vlastnosti z parametrů; null = zrušit vlastní hodnotu (platí typ). */
function withProps(el: ElectroElement, p: Props): ElectroElement {
  const reset = new Set(['height', 'slots', 'board', 'length'].filter((k) => p[k as keyof Props] === null));
  const out: Record<string, unknown> = Object.fromEntries(Object.entries(el).filter(([k]) => !reset.has(k)));
  for (const key of ['height', 'slots', 'board', 'length'] as const)
    if (p[key] !== undefined && p[key] !== null) out[key] = p[key];
  if (p.mark !== undefined) out['mark'] = p.mark;
  if (p.status !== undefined) out['status'] = p.status;
  if (p.layout !== undefined) out['layout'] = p.layout;
  if (p.symbol !== undefined) out['symbol'] = { ...el.symbol, ...p.symbol };
  return out as unknown as ElectroElement;
}

export const electroCreate = defineCommand<Props & { typeId: Id; storeyId?: Id }>({
  name: 'electro.create',
  label: 'Elektro prvek',
  description:
    'Vloží elektro prvek (zásuvka, spínač, svítidlo, čidlo, rozvaděč…) typu typeId (electroType.list). Na stěnu: ' +
    'wallId + offset (mm po referenční čáře) a side, nebo wallId + point (bod se promítne na nejbližší líc); ' +
    'značka je kolmo k líci a jde se stěnou. Na strop / do místnosti: storeyId + point (+ angle). Výška osy ' +
    'height (mm nad podlahou, chybí = výchozí výška typu; popisek výšky se kreslí jen při odlišné výšce), ' +
    'mark = označení (Z1, S2a), slots = rámeček, symbol = velikost a odsazení značky, board / length.',
  group: GROUP,
  params: S.object(
    {
      typeId: S.id,
      storeyId: S.id,
      ...PLACEMENT_PROPS,
      status: STATUS,
      ...NULLABLE,
    },
    ['typeId'],
  ),
  run(model, p, ctx) {
    const t = electroTypeOf(model, p.typeId);
    checkSlots(t, p.slots);
    if (p.wallId === undefined && p.storeyId === undefined)
      fail('invalid', 'Prvek mimo stěnu potřebuje storeyId');
    const blank: ElectroElement = {
      id: ctx.newId(),
      ifcClass: t.ifcClass,
      category: 'electrical',
      discipline: 'electrical',
      status: 'new',
      variant: ctx.variant,
      storeyId: p.storeyId ? storeyOf(model, p.storeyId).id : '',
      typeId: t.id,
      host: { kind: 'free', point: { x: 0, y: 0 }, angle: 0 },
      mark: '',
    };
    const el = withProps(hostFrom(model, blank, p), p);
    return { model: putElectro(model, [el]), created: [el.id] };
  },
});

export const electroUpdate = defineCommand<Props & { elementId: Id; typeId?: Id }>({
  name: 'electro.update',
  label: 'Upravit elektro prvek',
  description:
    'Změní elektro prvek: typ (typeId), hostitele a polohu (wallId + offset / side / point, nebo point + angle ' +
    'pro volný prvek; bez wallId a s point se prvek odpojí od stěny), výšku (null = podle typu), označení, ' +
    'stav, rámeček (slots, layout), značku v půdorysu (symbol: size, along, out, rotation), rozvaděč, délku.',
  group: GROUP,
  params: S.object({ elementId: S.id, typeId: S.id, ...PLACEMENT_PROPS, status: STATUS, ...NULLABLE }, [
    'elementId',
  ]),
  run(model, p) {
    const before = electroOf(model, p.elementId);
    const t = electroTypeOf(model, p.typeId ?? before.typeId);
    let el: ElectroElement = { ...before, typeId: t.id, ifcClass: t.ifcClass };
    const h = before.host;
    if (p.wallId !== undefined || p.point !== undefined) el = hostFrom(model, el, p);
    else if (h.kind === 'wall' && (p.offset !== undefined || p.side !== undefined))
      el = hostFrom(model, el, { wallId: h.wallId, offset: p.offset ?? h.offset, side: p.side ?? h.side });
    else if (h.kind === 'free' && p.angle !== undefined) el = { ...el, host: { ...h, angle: p.angle } };
    el = withProps(el, p);
    if (el.slots && t.symbol.kind !== 'glyphs') el = withProps(el, { slots: null });
    checkSlots(t, p.slots);
    return { model: putElectro(model, [el]) };
  },
});

/** Posun bodu volného prvku (pomůcka pro electro.move). */
export const shiftPoint = (p: Vec2, d: Vec2): Vec2 => ({ x: p.x + d.x, y: p.y + d.y });
