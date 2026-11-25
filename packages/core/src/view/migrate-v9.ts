// Migrace projektu 9 → 10 (základ 9, rozhraní UI3): pohled má příznak `saved`. První pohled každého
// podlaží se stane pracovním oknem podlaží (saved: false), ostatní jsou uložené pohledy.
type Obj = Record<string, unknown>;

export function projectV9toV10(data: Obj): Obj {
  const views = (data.views ?? {}) as Record<string, Obj>;
  const seen = new Set<unknown>();
  const migrated = Object.fromEntries(
    Object.entries(views).map(([id, v]) => {
      const first = !seen.has(v.storeyId);
      seen.add(v.storeyId);
      return [id, { saved: !first, ...v }];
    }),
  );
  return { ...data, views: migrated };
}
