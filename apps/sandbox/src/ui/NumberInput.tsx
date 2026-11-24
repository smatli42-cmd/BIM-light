// Číselné pole v mm: hodnota se zapíše Enterem (jako ostatní pole panelu).
import { parseNumber } from '@bim-light/core';

export function NumberInput(props: { testid: string; value: number; onSet: (v: number) => void }) {
  return (
    <input
      data-testid={props.testid}
      key={props.value}
      defaultValue={String(props.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        const v = parseNumber(e.currentTarget.value);
        if (Number.isFinite(v)) props.onSet(v);
      }}
    />
  );
}
