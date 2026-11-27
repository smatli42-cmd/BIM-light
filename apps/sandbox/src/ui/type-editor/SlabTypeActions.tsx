// Spodek editoru typu desky: použití, Duplikovat (kopie dostane vlastní skladbu – jako Duplikovat
// v Revitu) a Smazat (jen typ, který žádná deska nepoužívá). Vše přes příkazy slabType.* (základ 6).
import { slabTypeUsage, type SlabType } from '@bim-light/core';
import type { Session } from '../../session/session.ts';

function freeName(s: Session, base: string): string {
  const names = new Set(Object.values(s.model.slabTypes).map((t) => t.name));
  let name = base;
  for (let i = 2; names.has(name); i++) name = `${base} (${i})`;
  return name;
}

export function SlabTypeActions({ s, type }: { s: Session; type: SlabType }) {
  const used = slabTypeUsage(s.model, type.id);
  const select = (id: string | null) => ((s.typeEditor = id), s.changed());
  const duplicate = () => {
    const name = freeName(s, type.name);
    const r = s.run('slabType.duplicate', { typeId: type.id, name, ownComposition: true });
    if (r.ok && r.created[0]) select(r.created[0]);
  };
  const remove = () => {
    const next = Object.values(s.model.slabTypes).find(
      (t) => t.id !== type.id && t.slabFunction === type.slabFunction,
    );
    const r = s.run('slabType.delete', { typeId: type.id });
    if (r.ok) select(next?.id ?? Object.keys(s.model.slabTypes)[0] ?? null);
  };
  return (
    <div class="type-actions">
      <p class="muted" data-testid="type-usage">
        Použití: {used} desek
      </p>
      <span class="row">
        <button data-testid="type-duplicate" onClick={duplicate}>
          Duplikovat
        </button>
        <button
          data-testid="type-delete"
          disabled={used > 0}
          title={used > 0 ? 'Typ používají desky – nejdřív jim dej jiný typ' : 'Smazat typ'}
          onClick={remove}
        >
          Smazat
        </button>
      </span>
    </div>
  );
}
