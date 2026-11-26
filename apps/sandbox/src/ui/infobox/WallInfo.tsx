// Info box stěny (koncepce rozhraní, část 2 D): výchozí nastavení nových stěn (nástroj Stěna) a vlastnosti
// vybraných stěn. Instance = vlastnosti prvku, Typ = úprava skladby (platí pro všechny stěny typu).
import { bandThickness, parseNumber, type Wall, type WallType } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { LayerMaterials } from '../LayerMaterials.tsx';
import { TypeSelect } from '../WallFields.tsx';
import { WallHeightFields } from '../WallHeightFields.tsx';
import { openTypeEditor } from '../type-editor/TypeEditorDialog.tsx';
import { CompositionSummary, MethodButtons, RefLineButtons } from './wall-controls.tsx';
import { InstanceTypeTabs, Section } from './Section.tsx';
import { NewStatusField } from './NewStatus.tsx';
import { WallDisplay } from './WallDisplay.tsx';
import { TypePropsSection, WallPropsSection } from './WallProps.tsx';
import { WallTagSection } from './WallTags.tsx';

/** Záložka Typ: přehled skladby a otevření okna Editor typů (úprava vrstev). */
function TypeTab({ s, type }: { s: Session; type: WallType }) {
  return (
    <Section title="Skladba" info="Platí pro všechny stěny typu; vrstvy se upravují v okně Editor typů.">
      <CompositionSummary s={s} type={type} />
      <button data-testid="open-type-editor" onClick={() => openTypeEditor(s, type.id)}>
        Upravit v editoru typů…
      </button>
    </Section>
  );
}

const REF_INFO = 'Čára, která zůstane na místě při změně tloušťky; stěna se rozšíří od ní.';

/** Nástroj Stěna bez výběru: výchozí nastavení nových stěn. */
export function NewWallInfo({ s }: { s: Session }) {
  const [tab, setTab] = useState<'instance' | 'type'>('instance');
  const type = s.model.wallTypes[s.wallTypeId];
  const set = (fn: () => void) => (fn(), s.changed());
  return (
    <>
      <InstanceTypeTabs value={tab} onPick={setTab} />
      <TypeSelect
        s={s}
        value={s.wallTypeId}
        mixed={false}
        testid="new-type"
        onPick={(id) => set(() => (s.wallTypeId = id))}
      />
      {tab === 'type' && type && <TypeTab s={s} type={type} />}
      {tab === 'instance' && (
        <>
          <Section title="Geometrická metoda">
            <MethodButtons s={s} />
          </Section>
          <Section title="Referenční čára" info={REF_INFO}>
            <RefLineButtons
              value={s.wallRefLine}
              onPick={(v) => set(() => (s.wallRefLine = v))}
              onFlip={() => set(() => (s.wallSide = s.wallSide === 'left' ? 'right' : 'left'))}
            />
            <p class="muted" data-testid="new-side">
              Tloušťka {s.wallSide === 'left' ? 'vlevo' : 'vpravo'} od směru kreslení
            </p>
          </Section>
          <Section title="Konstrukce">
            <CompositionSummary s={s} type={type} />
          </Section>
          <Section title="Rekonstrukce" info="Stávající = zaměření původního stavu, Nový = návrh.">
            <NewStatusField s={s} />
          </Section>
        </>
      )}
    </>
  );
}

function Construction({ s, walls }: { s: Session; walls: Wall[] }) {
  const first = walls[0] as Wall;
  const band = s.model.wallTypes[first.typeId]?.bands[0];
  const setThickness = (text: string) => {
    const t = parseNumber(text);
    if (t > 0) for (const w of walls) s.run('wall.setThickness', { wallId: w.id, thickness: t });
  };
  return (
    <Section
      title="Konstrukce"
      info="Tloušťka mění jádro; povrchové vrstvy zůstanou. Materiál vrstvy platí pro celý typ."
    >
      <label>
        Tloušťka (mm)
        <input
          data-testid="sel-thickness"
          key={`${first.id}-${first.typeId}`}
          defaultValue={band ? String(bandThickness(band)) : ''}
          onKeyDown={(e) => e.key === 'Enter' && setThickness(e.currentTarget.value)}
        />
      </label>
      {walls.length === 1 && <LayerMaterials s={s} wall={first} />}
    </Section>
  );
}

/** Vlastnosti instance vybraných stěn: referenční čára, konstrukce, výška, zobrazení. */
function SelectedInstance({ s, walls }: { s: Session; walls: Wall[] }) {
  const first = walls[0] as Wall;
  const ids = walls.map((w) => w.id);
  const sameRef = walls.every((w) => w.referenceLine === first.referenceLine);
  return (
    <>
      <Section title="Referenční čára" info={REF_INFO}>
        <RefLineButtons
          value={sameRef ? first.referenceLine : ''}
          onPick={(v) =>
            ids.forEach((id) => s.run('wall.setReferenceLine', { wallId: id, referenceLine: v }))
          }
          onFlip={() => s.run('wall.flipSide', { wallIds: ids })}
        />
      </Section>
      <Construction s={s} walls={walls} />
      <Section
        title="Výška a úroveň"
        info="Spodek a vršek vázané na podlaží; změna výšky podlaží stěnu přepočítá."
      >
        <WallHeightFields s={s} walls={walls} />
      </Section>
      <WallPropsSection s={s} walls={walls} />
      <WallTagSection s={s} walls={walls} />
      <WallDisplay s={s} walls={walls} />
    </>
  );
}

/** Vybrané stěny: vlastnosti instance, nebo úprava typu. */
export function SelectedWallsInfo({ s, walls }: { s: Session; walls: Wall[] }) {
  const [tab, setTab] = useState<'instance' | 'type'>('instance');
  const first = walls[0] as Wall;
  const ids = walls.map((w) => w.id);
  const mixed = !walls.every((w) => w.typeId === first.typeId);
  const type = s.model.wallTypes[first.typeId];
  return (
    <>
      <InstanceTypeTabs value={tab} onPick={setTab} />
      <TypeSelect
        s={s}
        value={first.typeId}
        mixed={mixed}
        testid="sel-type"
        onPick={(typeId) => s.run('wall.setType', { wallIds: ids, typeId })}
      />
      {tab === 'type' && type && !mixed && (
        <>
          <TypePropsSection s={s} type={type} />
          <TypeTab s={s} type={type} />
        </>
      )}
      {tab === 'instance' && <SelectedInstance s={s} walls={walls} />}
    </>
  );
}
