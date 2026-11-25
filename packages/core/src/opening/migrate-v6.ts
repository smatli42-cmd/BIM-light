// Migrace projektu 6 → 7 (základ 9, plán stěn Z4): model má sbírku otvorů (prázdnou)
// a každý pohled rovinu řezu (výchozí 1000 mm nad podlažím, rozhodnutí 2).
type Obj = Record<string, unknown>;

export function projectV6toV7(data: Obj): Obj {
  const views = (data.views ?? {}) as Record<string, Obj>;
  const migrated = Object.fromEntries(Object.entries(views).map(([id, v]) => [id, { cutPlane: 1000, ...v }]));
  return { ...data, openings: data.openings ?? {}, views: migrated };
}
