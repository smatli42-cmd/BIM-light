// Migrace projektu 39 → 40 a 40 → 41: popis skladby s lomenou odkazovou čárou a kolečkem, pak zarovnání řádků
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

/** Migrace 40 → 41: zarovnání řádků (dosavadní vzhled: vpravo od čáry zleva, vlevo od čáry zprava). */
export function projectV40toV41(data: Obj): Obj {
  const tags = (data['compositionTags'] ?? {}) as Record<string, Obj>;
  const align = (t: Obj) => t['align'] ?? (t['side'] === 'left' ? 'right' : 'left');
  return {
    ...data,
    compositionTags: Object.fromEntries(
      Object.entries(tags).map(([id, t]) => [id, { ...t, align: align(t) }]),
    ),
  };
}

export function projectV39toV40(data: Obj): Obj {
  const tags = (data['compositionTags'] ?? {}) as Record<string, Obj>;
  return {
    ...data,
    compositionTags: Object.fromEntries(Object.entries(tags).map(([id, t]) => [id, tagV40(t)])),
  };
}
