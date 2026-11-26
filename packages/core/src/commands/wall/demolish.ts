// Příkaz: vybourat úsek stěny (plán stěn Z10, částečné bourání; Revit rozdělení + fáze „zbořeno“,
// Archicad rozdělení + stav „bourání“). Stěna se rozdělí ve dvou bodech a prostřední část dostane stav
// „bourání“; krajní části zůstanou. Bod na konci stěny se nedělí (bourá se až ke konci).
import { carrierOf, pointAt, projectOnCarrier, type Vec2 } from '../../geometry/index.ts';
import { paramOf } from '../../geometry/split.ts';
import type { Id } from '../../ids/index.ts';
import { putElements } from '../../model/update.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { wallSplit } from './split.ts';

const EDGE = 0.001;

export const wallDemolishPart = defineCommand<{ wallId: Id; from: Vec2; to: Vec2 }>({
  name: 'wall.demolishPart',
  label: 'Vybourat úsek stěny',
  description:
    'Částečné bourání: rozdělí stěnu v bodech „from“ a „to“ (promítnou se na stěnu) a úsek mezi nimi ' +
    'označí stavem „bourání“; krajní části zůstanou se svým stavem. Vrací id bouraného úseku, pak id ' +
    'zbylé části za ním a napojení. Jeden krok Zpět. Otvor v místě ' +
    'rozdělení příkaz odmítne.',
  group: 'Rekonstrukce',
  params: S.object({ wallId: S.id, from: S.point, to: S.point }, ['wallId', 'from', 'to']),
  run(model, p, ctx) {
    const w = wallOf(model, p.wallId);
    const t = [p.from, p.to]
      .map((q) => paramOf(w.path, projectOnCarrier(q, carrierOf(w.path))))
      .map((x) => Math.max(0, Math.min(1, x)))
      .sort((a, b) => a - b) as [number, number];
    if (t[1] - t[0] < EDGE) fail('invalid', 'Úsek k bourání má nulovou délku');
    let m = model;
    let mid = w.id;
    let rest: Id | null = null;
    const joins: Id[] = [];
    const splitAt = (wallId: Id, t1: number) => {
      const r = wallSplit.run(m, { wallId, point: pointAt(w.path, t1) }, ctx);
      const [part, ...rels] = (r.created ?? []) as Id[];
      m = r.model;
      joins.push(...rels);
      return part as Id;
    };
    if (t[0] > EDGE) mid = splitAt(w.id, t[0]);
    if (t[1] < 1 - EDGE) rest = splitAt(mid, t[1]);
    // Vrací: bouraný úsek, zbylou část za ním (je-li), pak nová napojení.
    const created = [mid, ...(rest ? [rest] : []), ...joins];
    return { model: putElements(m, [{ ...wallOf(m, mid), status: 'demolished' }]), created };
  },
});
