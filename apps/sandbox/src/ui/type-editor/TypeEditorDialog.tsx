// Okno Editor typů (rozhodnutí uživatele 2026-11-26, krok 1): jedno okno pro typy všech prvků –
// vlevo seznam, uprostřed náhled skladby, vpravo vrstvy a vlastnosti. Zatím jen stěny; desky, střechy,
// okna a dveře se zapojí jako další druh. Mění model jen přes příkazy jádra (základ 6).
import { bandThickness, typeHasCore } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { TypePropsSection } from '../infobox/WallProps.tsx';
import { useSession } from '../use-session.ts';
import { RefLineSelect } from '../WallFields.tsx';
import { TypeList } from './TypeList.tsx';
import { TypePreview } from './TypePreview.tsx';
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

function Preview({ s, typeId }: { s: Session; typeId: string }) {
  const type = s.model.wallTypes[typeId];
  const band = type?.bands[0];
  if (!type || !band) return null;
  const hasCore = typeHasCore(type);
  const refLine = s.wallRefLine === 'core-face' && !hasCore ? 'face' : s.wallRefLine;
  return (
    <div class="te-preview">
      <TypePreview model={s.model} band={band} refLine={refLine} width={420} height={260} />
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

export function TypeEditorDialog({ s }: { s: Session }) {
  useSession(s);
  if (s.typeEditor === null) return null;
  const type = s.model.wallTypes[s.typeEditor] ?? Object.values(s.model.wallTypes)[0];
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
        <div class="te-body">
          <TypeList s={s} />
          {type ? <Preview s={s} typeId={type.id} /> : <div />}
          <div class="te-props">
            {type && <WallTypeEditor key={type.id} s={s} type={type} />}
            {type && <TypePropsSection s={s} type={type} />}
          </div>
        </div>
      </div>
    </div>
  );
}
