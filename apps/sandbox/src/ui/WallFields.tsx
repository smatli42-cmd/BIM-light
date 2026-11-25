// Společná pole stěny v panelech: výběr typu a referenční čáry. „Líc jádra“ je zašedlý,
// když typ jádro nemá (jako Archicad, plán stěn Z1).
import type { ReferenceLine } from '@bim-light/core';
import type { Session } from '../session/session.ts';

export function TypeSelect(props: {
  s: Session;
  value: string;
  mixed: boolean;
  testid: string;
  onPick: (id: string) => void;
}) {
  return (
    <label>
      Typ
      <select
        data-testid={props.testid}
        value={props.mixed ? '' : props.value}
        onChange={(e) => props.onPick(e.currentTarget.value)}
      >
        {props.mixed && <option value="">(různé)</option>}
        {Object.values(props.s.model.wallTypes).map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

const REF_LINES: readonly [ReferenceLine, string][] = [
  ['face', 'Líc'],
  ['axis', 'Osa'],
  ['opp-face', 'Protilehlý líc'],
  ['core-face', 'Líc jádra'],
];

/** Referenční čára: zůstává na místě při změně tloušťky, stěna roste od ní (katalog kreslení 6.3). */
export function RefLineSelect(props: {
  value: ReferenceLine | '';
  testid: string;
  /** false = typ nemá jádro, „líc jádra“ nejde zvolit. */
  coreAllowed: boolean;
  label?: string;
  onPick: (v: ReferenceLine) => void;
}) {
  return (
    <label title="Čára, která zůstane na místě při změně tloušťky; stěna se rozšíří od ní.">
      {props.label ?? 'Referenční čára'}
      <select
        data-testid={props.testid}
        value={props.value}
        onChange={(e) => props.onPick(e.currentTarget.value as ReferenceLine)}
      >
        {props.value === '' && <option value="">(různé)</option>}
        {REF_LINES.map(([v, label]) => (
          <option key={v} value={v} disabled={v === 'core-face' && !props.coreAllowed}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
