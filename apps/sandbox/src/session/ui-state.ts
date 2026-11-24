// Stav ovládacích prvků nad výkresem: nabídka na pravé tlačítko, pole pro číslo, hlášky.
import type { Vec2 } from '@bim-light/core';

export interface MenuItem {
  readonly label: string;
  readonly action: () => void;
  readonly disabled?: boolean;
  /** Proč je položka zakázaná (propiska). */
  readonly why?: string;
}

export interface MenuState {
  readonly title: string;
  readonly at: Vec2;
  readonly items: readonly MenuItem[];
}

export interface ValueEditState {
  /** Střed pole v px. */
  readonly at: Vec2;
  readonly value: string;
  /** Pole pro text (přepis textu kóty) místo čísla. */
  readonly text?: boolean;
  readonly commit: (value: string) => void;
}

export type ToastKind = 'ok' | 'bad';

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface Toast {
  readonly id: number;
  readonly text: string;
  readonly kind: ToastKind;
  /** Nabídnutá náprava (např. odemknout kótu, která brání změně). */
  readonly action?: ToastAction | undefined;
}

/** Čísla napsaná do trackeru nebo příkazu (katalog kreslení 1.4). */
export interface TypedInput {
  field: 'len' | 'ang';
  len: string;
  ang: string;
}

/** Klávesa, která se píše do čísla (číslice, čárka, tečka, minus). */
export const isNumberKey = (key: string): boolean => /^[0-9.,-]$/.test(key);

/** Zpracuje psaní čísla; vrací true, když klávesu použil. */
export function editTyped(t: TypedInput, key: string, allowTab: boolean): boolean {
  const f = t.field === 'len' ? 'len' : 'ang';
  if (isNumberKey(key)) {
    t[f] += key;
    return true;
  }
  if (key === 'Backspace' && t[f] !== '') {
    t[f] = t[f].slice(0, -1);
    return true;
  }
  if (key === 'Tab' && allowTab) {
    t.field = t.field === 'len' ? 'ang' : 'len';
    return true;
  }
  return false;
}

export const clearTyped = (t: TypedInput) => {
  t.len = '';
  t.ang = '';
  t.field = 'len';
};
