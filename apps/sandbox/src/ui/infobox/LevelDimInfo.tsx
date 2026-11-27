// Info box výškové kóty (ČSN 01 3420): nástroj = výchozí relativní / absolutní kóta; vybraná kóta = hodnota
// spočítaná z modelu, na co ukazuje, absolutní, praporek pod hranou (v řezu) / značka (v půdorysu), zámek,
// smazání (příkazy levelDim.*, planLevelDim.*).
import {
  absoluteText,
  elevationText,
  levelZ,
  planLevelTexts,
  type LevelDimension,
  type PlanLevelDimension,
} from '@bim-light/core';
import { levelDimDefaults } from '../../session/section-defaults.ts';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';

function Check(p: { label: string; testid: string; checked: boolean; onSet: (v: boolean) => void }) {
  return (
    <label class="check">
      <input
        type="checkbox"
        data-testid={p.testid}
        checked={p.checked}
        onChange={(e) => p.onSet(e.currentTarget.checked)}
      />
      {p.label}
    </label>
  );
}

/** Nástroj Výšková kóta: výchozí nastavení nové kóty. */
export function NewLevelDimInfo({ s }: { s: Session }) {
  const d = levelDimDefaults(s);
  return (
    <Section title="Výšková kóta" info="ČSN 01 3420: relativní k ±0,000 nevyplněná, absolutní (Bpv) plná.">
      <p class="muted">
        Jeden klik vloží kótu: v půdorysu na podlahu nebo roh stavby, v okně řezu na hranu nebo úroveň.
      </p>
      <Check
        label="Absolutní kóta (m n. m. Bpv)"
        testid="level-absolute-default"
        checked={d.absolute}
        onSet={(v) => ((d.absolute = v), s.changed())}
      />
      <MarkerSelect
        value={d.marker}
        testid="level-marker-default"
        onPick={(m) => ((d.marker = m), s.changed())}
      />
      <Check
        label="S odkazovou čarou (druhý klik = poloha hodnoty)"
        testid="level-leader-default"
        checked={d.leader}
        onSet={(v) => ((d.leader = v), s.changed())}
      />
      {d.marker === 'circle' && (
        <TerrainFields
          rt={d.rt}
          ut={d.ut}
          prefix="level-default"
          onSet={(patch) => (Object.assign(d, patch), s.changed())}
        />
      )}
    </Section>
  );
}

/** Značka výškové kóty v půdorysu: hodnota v rámečku (hlavní), nebo kroužek s poličkou. */
function MarkerSelect(p: { value: 'box' | 'circle'; testid: string; onPick: (m: 'box' | 'circle') => void }) {
  return (
    <label>
      Značka v půdorysu
      <select
        data-testid={p.testid}
        value={p.value}
        onChange={(e) => p.onPick(e.currentTarget.value as 'box' | 'circle')}
      >
        <option value="box">výška podlahy v rámečku</option>
        <option value="circle">kóta terénu RT / UT (nároží)</option>
      </select>
    </label>
  );
}

/** Vybraná výšková kóta v půdorysu: hodnota, značka, absolutní, zámek. */
function PlanOne({ s, d }: { s: Session; d: PlanLevelDimension }) {
  const upd = (patch: Record<string, unknown>) =>
    s.run('planLevelDim.update', { levelDimId: d.id, ...patch });
  const style = s.model.display.styles[s.view.styleId];
  const t = planLevelTexts(s.model, d, style);
  const terrain = d.marker === 'circle';
  return (
    <Section
      title="Výšková kóta"
      info="Rámeček: horní líc desky pod bodem z modelu. Kóta terénu: RT / UT zadané číslem, dokud terén není v modelu."
    >
      <div class="ib-row">
        <span class="muted">Hodnota</span>
        <strong data-testid="level-value">{t?.join(' / ') ?? '–'}</strong>
      </div>
      {terrain ? (
        <TerrainFields rt={d.rt ?? null} ut={d.ut ?? null} prefix="level" onSet={upd} />
      ) : (
        <div class="ib-row">
          <span class="muted">Kótuje</span>
          <span>{refLabel(s, d.ref)}</span>
        </div>
      )}
      <MarkerSelect value={d.marker} testid="level-marker" onPick={(marker) => upd({ marker })} />
      <Check
        label="Absolutní (m n. m. Bpv)"
        testid="level-absolute"
        checked={d.absolute}
        onSet={(v) => upd({ absolute: v })}
      />
      <Check label="Zamknout" testid="level-locked" checked={d.locked} onSet={(v) => upd({ locked: v })} />
    </Section>
  );
}

/** Rostlý a upravený terén (mm k ±0,000); prázdné = neznámý („?“). */
function TerrainFields(p: {
  rt: number | null;
  ut: number | null;
  prefix: string;
  onSet: (patch: { rt?: number | null; ut?: number | null }) => void;
}) {
  const num = (label: string, key: 'rt' | 'ut', value: number | null) => (
    <label>
      {label}
      <input
        type="number"
        step={10}
        data-testid={`${p.prefix}-${key}`}
        value={value ?? ''}
        onChange={(e) => {
          const t = e.currentTarget.value.trim();
          p.onSet({ [key]: t === '' || !Number.isFinite(Number(t)) ? null : Number(t) });
        }}
      />
    </label>
  );
  return (
    <>
      {num('RT – rostlý terén (mm k ±0,000)', 'rt', p.rt)}
      {num('UT – upravený terén (mm k ±0,000)', 'ut', p.ut)}
    </>
  );
}

function refLabel(s: Session, ref: LevelDimension['ref']): string {
  if (ref.kind === 'terrain') return 'terén (zadaná výška)';
  if (ref.kind === 'storey') return `úroveň podlaží ${s.model.storeys[ref.storeyId]?.name ?? '?'}`;
  const el = s.model.elements[ref.elementId];
  const what = el?.category === 'slab' ? 'deska' : 'stěna';
  return `${ref.edge === 'top' ? 'horní' : 'spodní'} hrana – ${what}`;
}

function One({ s, d }: { s: Session; d: LevelDimension }) {
  const upd = (patch: Record<string, unknown>) => s.run('levelDim.update', { levelDimId: d.id, ...patch });
  const z = levelZ(s.model, d.ref);
  const text = z === null ? '–' : d.absolute ? absoluteText(s.model, z) : elevationText(z);
  return (
    <Section title="Výšková kóta" info="Hodnota se počítá z modelu – po změně výšky prvku se přepočítá.">
      <div class="ib-row">
        <span class="muted">Hodnota</span>
        <strong data-testid="level-value">{text}</strong>
      </div>
      <div class="ib-row">
        <span class="muted">Kótuje</span>
        <span>{refLabel(s, d.ref)}</span>
      </div>
      <Check
        label="Absolutní (m n. m. Bpv)"
        testid="level-absolute"
        checked={d.absolute}
        onSet={(v) => upd({ absolute: v })}
      />
      <Check
        label="Praporek pod hranou"
        testid="level-below"
        checked={d.below}
        onSet={(v) => upd({ below: v })}
      />
      <Check label="Zamknout" testid="level-locked" checked={d.locked} onSet={(v) => upd({ locked: v })} />
    </Section>
  );
}

/** Vybrané výškové kóty: jedna = úpravy, vždy smazání. */
export function SelectedLevelDimsInfo({ s }: { s: Session }) {
  const ids = s.selection.levelDims.filter((id) => s.model.levelDims[id] || s.model.planLevelDims[id]);
  if (!ids.length) return null;
  const section = ids.length === 1 ? s.model.levelDims[ids[0] as string] : undefined;
  const plan = ids.length === 1 ? s.model.planLevelDims[ids[0] as string] : undefined;
  return (
    <>
      {section && <One key={section.id} s={s} d={section} />}
      {plan && <PlanOne key={plan.id} s={s} d={plan} />}
      <section>
        <button
          data-testid="level-delete"
          onClick={() => s.run('selection.delete', { levelDimIds: s.selection.levelDims })}
        >
          Smazat <kbd>Del</kbd>
        </button>
      </section>
    </>
  );
}
