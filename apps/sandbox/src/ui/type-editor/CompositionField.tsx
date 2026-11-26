// Skladba typu v okně Editor typů (krok 3, koncepce rozhraní 11a; vzor Arditu „Skladby“): výběr
// společné skladby, její název, „Použít pro“ stěnu / desku / střechu a které typy ji sdílejí. Vrstvy pod
// tímto polem patří skladbě – jejich úprava platí pro všechny typy, které ji sdílejí.
import {
  compositionUsers,
  USE_KEYS,
  type Composition,
  type CompositionUse,
  type WallType,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';

const USE_LABELS: Readonly<Record<keyof CompositionUse, string>> = {
  wall: 'Stěna',
  slab: 'Deska',
  roof: 'Střecha',
};

function UseChecks({ s, c, used }: { s: Session; c: Composition; used: boolean }) {
  return (
    <div class="te-use">
      Použít pro:
      {USE_KEYS.map((k) => (
        <label key={k} class="check">
          <input
            type="checkbox"
            data-testid={`composition-use-${k}`}
            checked={c.use[k]}
            disabled={k === 'wall' && used}
            onChange={(e) =>
              s.run('composition.setUse', { compositionId: c.id, [k]: e.currentTarget.checked })
            }
          />
          {USE_LABELS[k]}
        </label>
      ))}
    </div>
  );
}

export function CompositionField({ s, type }: { s: Session; type: WallType }) {
  const id = type.bands[0]?.compositionId ?? '';
  const c = s.model.compositions[id];
  if (!c) return null;
  const users = compositionUsers(s.model, c.id);
  const options = Object.values(s.model.compositions).filter((x) => x.use.wall || x.id === c.id);
  return (
    <div class="te-composition" data-testid="composition">
      <label>
        Skladba
        <select
          data-testid="composition-select"
          value={c.id}
          onChange={(e) =>
            s.run('wallType.setComposition', { typeId: type.id, compositionId: e.currentTarget.value })
          }
        >
          {options.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Název skladby
        <input
          data-testid="composition-name"
          key={c.name}
          defaultValue={c.name}
          onChange={(e) => s.run('composition.rename', { compositionId: c.id, name: e.currentTarget.value })}
        />
      </label>
      <UseChecks s={s} c={c} used={users.length > 0} />
      {users.length > 1 && (
        <p class="muted" data-testid="composition-shared">
          Sdílí {users.length} typy: {users.map((t) => t.name).join(', ')} – změna vrstev platí pro všechny.
        </p>
      )}
    </div>
  );
}
