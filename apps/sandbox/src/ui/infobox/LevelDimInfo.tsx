// Info box výškové kóty (ČSN 01 3420): nástroj = výchozí relativní / absolutní kóta; vybraná kóta = hodnota
// spočítaná z modelu, na co ukazuje, absolutní, praporek pod hranou, zámek, smazání (příkazy levelDim.*).
import { absoluteText, elevationText, levelZ, type LevelDimension } from '@bim-light/core';
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
      <p class="muted">V okně řezu klikni na hranu nebo úroveň podlaží, druhým klikem umísti praporek.</p>
      <Check
        label="Absolutní kóta (m n. m. Bpv)"
        testid="level-absolute-default"
        checked={d.absolute}
        onSet={(v) => ((d.absolute = v), s.changed())}
      />
    </Section>
  );
}

function refLabel(s: Session, d: LevelDimension): string {
  if (d.ref.kind === 'storey') return `úroveň podlaží ${s.model.storeys[d.ref.storeyId]?.name ?? '?'}`;
  const el = s.model.elements[d.ref.elementId];
  const what = el?.category === 'slab' ? 'deska' : 'stěna';
  return `${d.ref.edge === 'top' ? 'horní' : 'spodní'} hrana – ${what}`;
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
        <span>{refLabel(s, d)}</span>
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
  const dims = s.selection.levelDims
    .map((id) => s.model.levelDims[id])
    .filter((x): x is LevelDimension => !!x);
  if (!dims.length) return null;
  const only = dims.length === 1 ? dims[0] : undefined;
  return (
    <>
      {only && <One key={only.id} s={s} d={only} />}
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
