// Okno Editor typů (rozhodnutí uživatele 2026-11-26, krok 1): jedno okno pro typy všech prvků –
// vlevo seznam, uprostřed náhled skladby, vpravo vrstvy a vlastnosti. Zatím jen stěny; desky, střechy,
// okna a dveře se zapojí jako další druh. Mění model jen přes příkazy jádra (základ 6).
import { bandThickness, typeHasCore } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { TypePropsSection } from '../infobox/WallProps.tsx';
import { useSession } from '../use-session.ts';
import { RefLineSelect } from '../WallFields.tsx';
import { TypeList } from './TypeList.tsx';
import { CompositionPreview } from './CompositionPreview.tsx';
import type { PreviewMode } from './preview-layout.ts';
import { WallTypeEditor } from './WallTypeEditor.tsx';

/** Druhy typů v okně; zatím jen stěny, ostatní přibudou se svými prvky. */
const KINDS: [string, string, boolean][] = [
  ['walls', 'Stěny', true],
  ['slabs', 'Desky', false],
  ['roofs', 'Střechy', false],
  ['openings', 'Okna a dveře', false],
];

export function openTypeEditor(s: Session, typeId?: string) {
  s.typeEditor = typeId ?? s.wallTypeId;
  s.changed();
}

function close(s: Session) {
  s.typeEditor = null;
  s.changed();
}

/** Vybraná vrstva (sdílí náhled a tabulka vrstev) a pohled náhledu. */
interface Pick {
  readonly selected: number | null;
  readonly onSelect: (layer: number | null) => void;
}

function Preview({ s, typeId, pick }: { s: Session; typeId: string; pick: Pick }) {
  const [mode, setMode] = useState<PreviewMode>('plan');
  const type = s.model.wallTypes[typeId];
  const band = type?.bands[0];
  if (!type || !band) return null;
  const hasCore = typeHasCore(type);
  const refLine = s.wallRefLine === 'core-face' && !hasCore ? 'face' : s.wallRefLine;
  return (
    <div class="te-preview">
      <CompositionPreview
        model={s.model}
        band={band}
        refLine={refLine}
        mode={mode}
        onMode={setMode}
        selected={pick.selected}
        onSelect={pick.onSelect}
      />
      <p>
        Tloušťka celkem <strong>{bandThickness(band)} mm</strong> · vrstev {band.layers.length}
      </p>
      <RefLineSelect
        label="Referenční čára (náhled, nové stěny)"
        value={refLine}
        testid="type-refline"
        coreAllowed={hasCore}
        onPick={(v) => ((s.wallRefLine = v), s.changed())}
      />
    </div>
  );
}

function Head({ s }: { s: Session }) {
  return (
    <div class="find-head">
      <strong>Editor typů</strong>
      <span class="te-kinds" role="tablist">
        {KINDS.map(([id, label, on]) => (
          <button
            key={id}
            role="tab"
            aria-selected={id === 'walls'}
            class={id === 'walls' ? 'active' : ''}
            disabled={!on}
            title={on ? label : `${label} přibudou s dalšími prvky`}
          >
            {label}
          </button>
        ))}
      </span>
      <IconButton icon="close" label="Zavřít" testid="type-editor-close" onClick={() => close(s)} />
    </div>
  );
}

export function TypeEditorDialog({ s }: { s: Session }) {
  useSession(s);
  const [sel, setSel] = useState<{ typeId: string; layer: number | null } | null>(null);
  if (s.typeEditor === null) return null;
  const type = s.model.wallTypes[s.typeEditor] ?? Object.values(s.model.wallTypes)[0];
  const pick: Pick = {
    selected: type && sel?.typeId === type.id ? sel.layer : null,
    onSelect: (layer) => type && setSel({ typeId: type.id, layer }),
  };
  return (
    <div class="dialog-back" onMouseDown={(e) => e.target === e.currentTarget && close(s)}>
      <div
        class="dialog type-editor-dialog panel"
        role="dialog"
        aria-label="Editor typů"
        data-testid="type-editor-dialog"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') close(s);
        }}
      >
        <Head s={s} />
        <div class="te-body">
          <TypeList s={s} />
          {type ? <Preview s={s} typeId={type.id} pick={pick} /> : <div />}
          <div class="te-props">
            {type && <WallTypeEditor key={type.id} s={s} type={type} {...pick} />}
            {type && <TypePropsSection s={s} type={type} />}
          </div>
        </div>
      </div>
    </div>
  );
}
