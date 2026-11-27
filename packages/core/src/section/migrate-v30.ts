// Migrace projektu 30 → 31: řezy a pohledy (fasády) – prázdný seznam `sections`; deska v řezu dostane
// šrafu materiálu (výchozí grafika kategorie, patro 1), pokud ji projekt nemá nastavenou jinak.
// Půdorys desky šrafu nekreslí, takže se dosavadní výkresy nezmění.
type Obj = Record<string, unknown>;

function withSlabHatch(display: unknown): unknown {
  if (!display || typeof display !== 'object') return display;
  const d = display as Obj;
  const cg = (d['categoryGraphics'] ?? {}) as Obj;
  const slab = (cg['slab'] ?? {}) as Obj;
  if (slab['hatch'] !== undefined) return d;
  return { ...d, categoryGraphics: { ...cg, slab: { ...slab, hatch: 'material' } } };
}

export const projectV30toV31 = (data: Obj): Obj => ({
  ...data,
  sections: data['sections'] ?? {},
  display: withSlabHatch(data['display']),
});
