import { describe, expect, it } from 'vitest';
import { electroFixture, T } from './test-helpers.ts';

interface Row {
  id: string;
  host: { kind: string; wallId?: string; offset?: number; side?: string };
  position: { x: number; y: number } | null;
}

function setup() {
  const f = electroFixture();
  const [id] = f.run('electro.create', { typeId: T('socket'), wallId: f.wallId, offset: 4000, side: 'ref' });
  const row = (): Row | undefined => {
    const r = f.editor.query('electro.list', {});
    return r.ok ? (r.data as Row[]).find((x) => x.id === id) : undefined;
  };
  return { f, id: id ?? '', row };
}

describe('koncepce 3 Elektro, základ 4: prvek na stěně jde se stěnou', () => {
  it('posun stěny posune i zásuvku (poloha po stěně zůstane)', () => {
    const { f, row } = setup();
    f.run('wall.move', { wallIds: [f.wallId], vector: { x: 500, y: 1000 } });
    expect(row()?.position).toEqual({ x: 4500, y: 850 });
    expect(row()?.host.offset).toBe(4000);
  });

  it('změna tloušťky (jiný typ) posune značku na nový líc', () => {
    const { f, row } = setup();
    const partition = Object.values(f.model.wallTypes).find((t) => t.name === 'Příčka 100');
    f.run('wall.setType', { wallIds: [f.wallId], typeId: partition?.id });
    expect(row()?.position).toEqual({ x: 4000, y: -50 });
  });

  it('prodloužení začátku stěny: zásuvka zůstane na místě (drží vzdálenost od konce)', () => {
    const { f, row } = setup();
    f.run('wall.moveEndpoint', { wallId: f.wallId, end: 'start', point: { x: -1000, y: 0 } });
    expect(row()?.position).toEqual({ x: 4000, y: -150 });
    expect(row()?.host.offset).toBe(5000);
  });

  it('rozdělení stěny: zásuvka za bodem rozdělení přejde na novou část, stojí na místě a na stejné straně', () => {
    const { f, row } = setup();
    f.run('wall.split', { wallId: f.wallId, point: { x: 3000, y: 0 } });
    expect(row()?.host.wallId).not.toBe(f.wallId);
    expect(row()?.host.side).toBe('ref');
    expect(row()?.position).toEqual({ x: 4000, y: -150 });
  });

  it('průřezová pravidla (základ 7): smazání stěny smaže i elektro prvky na ní, Zpět je vrátí', () => {
    const { f, id, row } = setup();
    const [lamp] = f.run('electro.create', {
      typeId: T('lamp'),
      storeyId: f.storeyId,
      point: { x: 3000, y: 2000 },
    });
    f.run('wall.delete', { wallIds: [f.wallId] });
    expect(f.model.electroElements[id]).toBeUndefined();
    expect(f.model.electroElements[lamp ?? '']).toBeDefined();
    f.editor.undo();
    expect(row()?.position).toEqual({ x: 4000, y: -150 });
  });
});
