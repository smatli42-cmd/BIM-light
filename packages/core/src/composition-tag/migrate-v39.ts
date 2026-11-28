// Migrace projektu 39 → 40: popis skladby s lomenou odkazovou čárou a kolečkem (pokyn uživatele 2026-11-28).
// Dřívější poloha textu (offset) = jediný bod čáry; kolečko s číslem zapnuté, řádky na stranu, kam šel text.
type Obj = Record<string, unknown>;

function tagV40(t: Obj): Obj {
  const { offset, ...rest } = t;
  const o = (offset as { x: number; y: number } | undefined) ?? { x: 1000, y: 1000 };
  return {
    ...rest,
    leader: rest['leader'] ?? [o],
    mark: rest['mark'] ?? true,
    side: rest['side'] ?? (o.x >= 0 ? 'right' : 'left'),
  };
}

export function projectV39toV40(data: Obj): Obj {
  const tags = (data['compositionTags'] ?? {}) as Record<string, Obj>;
  return {
    ...data,
    compositionTags: Object.fromEntries(Object.entries(tags).map(([id, t]) => [id, tagV40(t)])),
  };
}
