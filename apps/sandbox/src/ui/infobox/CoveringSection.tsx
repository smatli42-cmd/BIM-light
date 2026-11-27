// Info box místnosti – sekce Povrchy (prvky stavby 9, základ 14; podle principu Arditu): zóny stěn celé
// místnosti, podlaha, strop, vybraný líc stěny (klik u líce v půdorysu) s vlastními zónami a plochy po
// typech úprav. Vše příkazy covering.* (i pro AI); plochy počítá jádro (roomSurfaces).
import {
  NO_ZONES,
  roomFaces,
  roomSurfaces,
  type CoveringSurface,
  type Model,
  type Room,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { CoveringTiles } from './CoveringTiles.tsx';
import { CEILING_KINDS, FLOOR_KINDS, TypeSelect, ZoneEditor } from './CoveringZones.tsx';
import { Section } from './Section.tsx';

const dec = (v: number, d: number) => v.toFixed(d).replace('.', ',');
const SIDE: Record<string, string> = {
  ref: 'líc',
  opp: 'protější líc',
  start: 'čelo (začátek)',
  end: 'čelo (konec)',
};

/** Součty ploch po typech (m²). */
function Totals({ m, list }: { m: Model; list: readonly CoveringSurface[] }) {
  const sums = new Map<string, number>();
  for (const x of list) {
    const name = x.typeId ? (m.coveringTypes[x.typeId]?.name ?? '?') : 'bez úpravy';
    sums.set(name, (sums.get(name) ?? 0) + x.area);
  }
  return (
    <div data-testid="covering-totals">
      {[...sums].map(([name, a]) => (
        <div class="ib-row" key={name}>
          <span class="muted">{name}</span>
          <strong>{dec(a / 1e6, 2)} m²</strong>
        </div>
      ))}
    </div>
  );
}

/** Vybraný líc stěny: vlastní zóny (přepis), nebo zóny místnosti. */
function FacePanel({ s, r }: { s: Session; r: Room }) {
  const f = s.selection.face;
  if (!f || f.roomId !== r.id) {
    return <p class="muted">Jednu stěnu nastavíte jinak: klikněte uvnitř místnosti kousek od jejího líce.</p>;
  }
  const len = roomFaces(s.model, r).find((x) => x.wallId === f.wallId && x.side === f.side)?.length ?? 0;
  const own = r.coverings?.wallOverrides?.[`${f.wallId}:${f.side}`];
  const params = { roomId: r.id, wallId: f.wallId, side: f.side };
  return (
    <div class="ib-face" data-testid="covering-face">
      <div class="ib-row">
        <strong>Vybraná stěna</strong>
        <span class="muted">
          {SIDE[f.side]}, {dec(len / 1000, 2)} m
        </span>
      </div>
      <label class="check">
        <input
          type="checkbox"
          data-testid="covering-face-own"
          checked={!!own}
          onChange={(e) =>
            s.run('covering.setZones', {
              ...params,
              zones: e.currentTarget.checked ? (r.coverings?.wallZones ?? NO_ZONES) : null,
            })
          }
        />
        Vlastní zóny této stěny
      </label>
      {own && (
        <ZoneEditor
          s={s}
          zones={own}
          testid="covering-face-zones"
          onSet={(zones) => s.run('covering.setZones', { ...params, zones })}
        />
      )}
    </div>
  );
}

export function CoveringSection({ s, r }: { s: Session; r: Room }) {
  const c = r.coverings ?? {};
  const list = roomSurfaces(s.model, r);
  const assign = (place: 'floor' | 'ceiling', typeId: string | null) =>
    s.run('covering.assign', { roomId: r.id, place, typeId });
  return (
    <Section
      title="Povrchy"
      testid="covering"
      info="Úpravy povrchů (malba, obklad, dlažba…). Stěny mají výškové zóny od podlahy; plochy se počítají z modelu – otvory se odečtou, ostění přičte."
    >
      <label>
        Podlaha
        <TypeSelect
          s={s}
          value={c.floor ?? null}
          kinds={FLOOR_KINDS}
          testid="covering-floor"
          onSet={(v) => assign('floor', v)}
        />
      </label>
      <span class="muted">Stěny – zóny místnosti (odspodu)</span>
      <ZoneEditor
        s={s}
        zones={c.wallZones ?? NO_ZONES}
        testid="covering-zones"
        onSet={(zones) => s.run('covering.setZones', { roomId: r.id, zones })}
      />
      <FacePanel s={s} r={r} />
      <label>
        Strop
        <TypeSelect
          s={s}
          value={c.ceiling ?? null}
          kinds={CEILING_KINDS}
          testid="covering-ceiling"
          onSet={(v) => assign('ceiling', v)}
        />
      </label>
      <Totals m={s.model} list={list} />
      <CoveringTiles s={s} r={r} />
    </Section>
  );
}
