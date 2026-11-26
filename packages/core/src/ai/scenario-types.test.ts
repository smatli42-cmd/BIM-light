// Scénář „AI kreslí dům“, část typy a skladby (koncepce rozhraní 11a, krok 3 editoru typů): jen JSON
// volání nástrojů – stejné kroky, jaké dělá uživatel v okně Editor typů.
import { describe, expect, it } from 'vitest';
import { room, row, start } from './scenario-helpers.ts';
import type { WallRow } from './scenario-helpers.ts';

interface CompRow {
  id: string;
  name: string;
  thickness: number;
  wallTypes: { id: string; name: string }[];
}

describe('AI scénář: skladby (koncepce rozhraní 11a)', () => {
  it('společná skladba: přiřadit typu, upravit vrstvu, obě stěny se změní; přejmenovat a Použít pro', () => {
    const c = start();
    const [left, top] = room(c);
    const types = c.ai.call<{ id: string; name: string }[]>('wallType.list');
    const partition = types.find((t) => t.name === 'Příčka 125')!.id;
    c.ai.call('wall.setType', { wallIds: [top], typeId: partition });
    const comps = () => c.ai.call<CompRow[]>('composition.list');
    const shared = comps().find((x) => x.wallTypes.some((t) => t.id === c.typeId))!;
    c.ai.call('wallType.setComposition', { typeId: partition, compositionId: shared.id });
    expect(row(c.ai.call<WallRow[]>('wall.list'), top!).thickness).toBe(shared.thickness);
    c.ai.call('wallType.updateLayer', { typeId: c.typeId, layerIndex: 0, thickness: shared.thickness + 50 });
    const walls = c.ai.call<WallRow[]>('wall.list');
    expect(row(walls, left!).thickness).toBe(row(walls, top!).thickness);
    c.ai.call('composition.rename', { compositionId: shared.id, name: 'Zdivo AI' });
    c.ai.call('composition.setUse', { compositionId: shared.id, slab: true });
    const after = comps().find((x) => x.id === shared.id)!;
    expect(after.name).toBe('Zdivo AI');
    expect(after.wallTypes).toHaveLength(2);
  });
});
