import { describe, expect, it } from 'vitest';
import { resolveHeight } from '../model/height.ts';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { specOf } from '../commands/wall/instantiate.ts';
import { slabAboveWall } from './attach.ts';

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;

/** 1.NP (±0, 3000) + 2.NP (3000); strop 2.NP ŽB 250 (horní líc −150, spodní −410 → 2590 nad ±0). */
function house() {
  const f = fixture();
  const [s2] = f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
  const rect = { a: { x: -1000, y: -1000 }, b: { x: 6000, y: 5000 } };
  const [slab] = f.run('slab.create', { storeyId: s2, typeId: typeId(f, 'ŽB strop 250'), rect });
  const [floor] = f.run('slab.create', { storeyId: s2, typeId: typeId(f, 'Podlaha anhydrit 150'), rect });
  const wall = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
  return { f, s2: s2!, slab: slab!, floor: floor!, wall };
}
const top = (f: Fixture, id: string) => resolveHeight(f.model, f.wall(id).height).top;

describe('desky D4 / základy 12, 24: vršek stěny k desce (Revit Attach Top, Archicad spojit s deskou)', () => {
  it('desky D4: vršek se uloží jako vazba na desku (druh vršku), ne číslo; končí na spodním líci', () => {
    const { f, slab, wall } = house();
    f.run('wall.attachTop', { wallIds: [wall] });
    expect(f.wall(wall).height.top).toEqual({ kind: 'slab', slabId: slab, offset: 0 });
    expect(top(f, wall)).toBe(2590);
  });

  it('desky D4: bez slabId se najde deska nad stěnou s nejnižším spodním lícem (nosný strop, ne podlaha)', () => {
    const { f, slab, wall } = house();
    expect(slabAboveWall(f.model, f.wall(wall))?.id).toBe(slab);
    const away = f.line({ x: 20000, y: 0 }, { x: 25000, y: 0 });
    expect(slabAboveWall(f.model, f.wall(away))).toBeNull();
    expect(f.editor.execute('wall.attachTop', { wallIds: [away] }).ok).toBe(false);
  });

  it('desky D4: změna výšky desky nebo tloušťky (typu) stěnu přepočítá', () => {
    const { f, slab, wall } = house();
    f.run('wall.attachTop', { wallIds: [wall] });
    f.run('slab.update', { slabIds: [slab], topOffset: -200 });
    expect(top(f, wall)).toBe(2540);
    f.run('slab.update', { slabIds: [slab], typeId: typeId(f, 'ŽB základová deska 300') });
    expect(top(f, wall)).toBe(3000 - 200 - 450);
    f.run('storey.update', { storeyId: f.storeyId, height: 3200 });
    expect(top(f, wall)).toBe(3200 - 200 - 450);
  });

  it('desky D4: odsazení od spodního líce; deska pod spodkem stěny se odmítne', () => {
    const { f, slab, floor, wall } = house();
    f.run('wall.attachTop', { wallIds: [wall], slabId: floor, offset: -20 });
    expect(top(f, wall)).toBe(3000 - 150 - 20);
    f.run('wall.setHeight', {
      wallIds: [wall],
      height: { baseOffset: 2700, top: { kind: 'height', value: 200 } },
    });
    expect(f.editor.execute('wall.attachTop', { wallIds: [wall], slabId: slab }).ok).toBe(false);
  });

  it('desky D4: odpojení zachová výšku (podlaží + 1 s odsazením); smazání desky stěnu odpojí', () => {
    const { f, slab, wall } = house();
    const other = f.line({ x: 0, y: 0 }, { x: 0, y: 4000 });
    f.run('wall.attachTop', { wallIds: [wall, other] });
    f.run('wall.detachTop', { wallIds: [wall] });
    expect(f.wall(wall).height.top).toEqual({ kind: 'storey', storeys: 1, offset: -410 });
    f.run('selection.delete', { slabIds: [slab] });
    expect(f.wall(other).height.top).toEqual({ kind: 'storey', storeys: 1, offset: -410 });
    expect(top(f, other)).toBe(2590);
  });

  it('desky D4: kopie na jiné podlaží vazbu na desku nenese (stejná výška k podlaží + 1)', () => {
    const { f, s2, wall } = house();
    f.run('wall.attachTop', { wallIds: [wall] });
    const [copy] = f.run('wall.paste', { storeyId: s2, walls: [specOf(f.wall(wall))] });
    expect(f.wall(copy as string).height.top).toEqual({ kind: 'storey', storeys: 1, offset: -410 });
  });

  it('desky D4 / základ 9: vazba přežije uložení a načtení projektu', () => {
    const { f, slab, wall } = house();
    f.run('wall.attachTop', { wallIds: [wall] });
    const r = parseProject(serializeProject(f.model));
    if (!r.ok) throw new Error(r.error);
    expect(r.model.elements[wall]).toMatchObject({ height: { top: { kind: 'slab', slabId: slab } } });
  });
});
