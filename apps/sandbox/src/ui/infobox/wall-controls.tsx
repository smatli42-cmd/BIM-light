// Ovládací prvky stěny v info boxu: geometrická metoda (jen nástroj Stěna), referenční čára jako ikony
// s přehozením strany a souhrn skladby (koncepce rozhraní, část 2 D).
import { bandThickness, type ReferenceLine, type WallType } from '@bim-light/core';
import type { WallMethod } from '../../interaction/tools/wall-method.ts';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import type { IconName } from '../icons/paths.ts';

const METHODS: readonly [WallMethod, IconName, string, string][] = [
  ['single', 'wall-single', 'Jedna stěna', ''],
  ['chain', 'wall-chain', 'Řetěz stěn', 'W'],
  ['rect', 'rect', 'Obdélník', 'B'],
  ['arc', 'wall-arc', 'Oblouk třemi body', 'A'],
  ['pick', 'wall-line', 'Z čáry (klik na líc)', 'V'],
];

export function MethodButtons({ s }: { s: Session }) {
  return (
    <div class="ib-buttons" data-testid="wall-method">
      {METHODS.map(([m, icon, label, key]) => (
        <IconButton
          key={m}
          icon={icon}
          label={label}
          shortcut={key || undefined}
          testid={`method-${m}`}
          pressed={s.wallMethod === m}
          onClick={() => {
            s.wallMethod = m;
            s.setTool('wall');
          }}
        />
      ))}
    </div>
  );
}

/**
 * Uvnitř = líc u první vrstvy skladby, uprostřed = osa, vně = líc u poslední vrstvy (rozhraní UI2, podle
 * vzoru). Líc jádra zůstává v datech a v editoru typu.
 */
const REF: readonly [ReferenceLine, IconName, string][] = [
  ['opp-face', 'ref-out', 'Ref. čára vně'],
  ['axis', 'ref-mid', 'Ref. čára uprostřed'],
  ['face', 'ref-in', 'Ref. čára uvnitř'],
];

/** Referenční čára (stěna roste od ní) a přehození strany tloušťky. */
export function RefLineButtons(props: {
  value: ReferenceLine | '';
  onPick: (v: ReferenceLine) => void;
  onFlip: () => void;
}) {
  return (
    <div class="ib-buttons" data-testid="refline">
      {REF.map(([v, icon, label]) => (
        <IconButton
          key={v}
          icon={icon}
          label={label}
          testid={`refline-${v}`}
          pressed={props.value === v}
          onClick={() => props.onPick(v)}
        />
      ))}
      <span class="spacer" />
      <IconButton
        icon="flip-arrows"
        label="Převrátit stranu stěny kolem ref. čáry"
        shortcut="Mezerník"
        testid="flip-side"
        onClick={props.onFlip}
      />
    </div>
  );
}

/** Souhrn skladby: tloušťka a vrstvy (materiál, tloušťka). */
export function CompositionSummary({ s, type }: { s: Session; type: WallType | undefined }) {
  const band = type?.bands[0];
  if (!band) return null;
  return (
    <div class="ib-composition">
      <div class="ib-row">
        <span class="muted">Tloušťka (součet vrstev)</span>
        <strong data-testid="ib-thickness">{bandThickness(band)} mm</strong>
      </div>
      {band.layers.map((l, i) => (
        <div class="ib-row" key={i}>
          <span class="muted">{s.model.materials[l.materialId]?.name ?? '?'}</span>
          <span>{l.thickness} mm</span>
        </div>
      ))}
    </div>
  );
}
