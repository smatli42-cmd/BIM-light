// Záložka Podlaží (základ 12, plán stěn Z3): úroveň a konstrukční výška, nové a smazání podlaží.
// Změna výšky posune podlaží nad ním a přepočítá vázané výšky stěn. Vše přes příkazy jádra.
import { storeysOf, type Storey } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { NumberInput } from './NumberInput.tsx';
import { useSession } from './use-session.ts';

function Row({ s, st, i }: { s: Session; st: Storey; i: number }) {
  const view = Object.values(s.model.views).find((v) => v.storeyId === st.id);
  return (
    <div class="storey-row" data-testid={`storey-${i}`}>
      <strong>{st.name}</strong>
      <label>
        Úroveň (mm)
        <NumberInput
          testid={`storey-elev-${i}`}
          value={st.elevation}
          onSet={(v) => s.run('storey.update', { storeyId: st.id, elevation: v })}
        />
      </label>
      <label>
        Výška (mm)
        <NumberInput
          testid={`storey-height-${i}`}
          value={st.height}
          onSet={(v) => s.run('storey.update', { storeyId: st.id, height: v })}
        />
      </label>
      {view && (
        <button
          data-testid={`storey-open-${i}`}
          disabled={s.storeyId === st.id}
          onClick={() => s.setView(view.id)}
        >
          Otevřít
        </button>
      )}
      <button data-testid={`storey-delete-${i}`} onClick={() => s.run('storey.delete', { storeyId: st.id })}>
        Smazat
      </button>
    </div>
  );
}

/** Nové podlaží nad nejvyšším (úroveň = jeho vršek, výška jako jeho) a pohled na něj. */
function addStorey(s: Session, stack: Storey[]) {
  const last = stack[stack.length - 1];
  const elevation = last ? last.elevation + last.height : 0;
  const r = s.run('storey.create', {
    name: `${stack.length + 1}.NP`,
    elevation,
    height: last?.height ?? 3000,
  });
  if (!r.ok || !r.created[0]) return;
  const v = s.run('view.create', { storeyId: r.created[0], styleId: s.view.styleId, scale: s.view.scale });
  if (v.ok && v.created[0]) s.setView(v.created[0]);
}

export function StoreysPanel({ s }: { s: Session }) {
  useSession(s);
  const buildingId = s.model.storeys[s.storeyId]?.buildingId ?? '';
  const stack = storeysOf(s.model, buildingId);
  return (
    <section data-testid="storeys">
      <h2>Podlaží ({stack.length})</h2>
      <p class="muted">Úroveň a výška v mm (Enter). Změna výšky posune podlaží nad ním i vázané stěny.</p>
      {[...stack].reverse().map((st) => (
        <Row key={st.id} s={s} st={st} i={stack.indexOf(st)} />
      ))}
      <button data-testid="storey-add" onClick={() => addStorey(s, stack)}>
        + Nové podlaží
      </button>
    </section>
  );
}
