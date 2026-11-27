// Záložka Podlaží (základ 12, plán stěn Z3): úroveň a konstrukční výška, nové a smazání podlaží.
// Změna výšky posune podlaží nad ním a přepočítá vázané výšky stěn. Vše přes příkazy jádra.
import { openInActive } from '../session/windows.ts';
import { storeysOf, workingViewOf, type Storey } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { NumberInput } from './NumberInput.tsx';
import { useSession } from './use-session.ts';

function Row({ s, st, i }: { s: Session; st: Storey; i: number }) {
  const view =
    workingViewOf(s.model, st.id) ?? Object.values(s.model.views).find((v) => v.storeyId === st.id);
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
          onClick={() => openInActive(s, view.id)}
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

/** Nové podlaží nad nejvyšším (úroveň = jeho vršek, výška jako jeho); otevře se jeho pracovní okno. */
function addStorey(s: Session, stack: Storey[]) {
  const last = stack[stack.length - 1];
  const elevation = last ? last.elevation + last.height : 0;
  const r = s.run('storey.create', {
    name: `${stack.length + 1}.NP`,
    elevation,
    height: last?.height ?? 3000,
  });
  if (r.ok && r.created[1]) s.setView(r.created[1]);
}

export function StoreysPanel({ s }: { s: Session }) {
  useSession(s);
  const buildingId = s.model.storeys[s.storeyId]?.buildingId ?? '';
  const stack = storeysOf(s.model, buildingId);
  return (
    <section data-testid="storeys">
      <h2>Nastavení podlaží ({stack.length})</h2>
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
