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
    'označí stavem „bourání“; krajní části zůstanou se svým stavem. Jeden krok Zpět. Otvor v místě ' +
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
    const created: Id[] = [];
    if (t[0] > EDGE) {
      const r = wallSplit.run(m, { wallId: w.id, point: pointAt(w.path, t[0]) }, ctx);
      m = r.model;
      mid = (r.created ?? [])[0] as Id;
      created.push(...(r.created ?? []));
    }
    if (t[1] < 1 - EDGE) {
      const r = wallSplit.run(m, { wallId: mid, point: pointAt(w.path, t[1]) }, ctx);
      m = r.model;
      created.push(...(r.created ?? []));
    }
    return {
      model: putElements(m, [{ ...wallOf(m, mid), status: 'demolished' }]),
      created: [mid, ...created],
    };
  },
});
