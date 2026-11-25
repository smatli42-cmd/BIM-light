// E – okno pohledu (koncepce rozhraní, část 2): hlavička se záložkou pohledu, novým pohledem
// a měřítkem, pod ní výkres. Víc oken vedle sebe přijde v kroku UI4.
import { useState } from 'preact/hooks';
import { DrawingCanvas } from '../../canvas/DrawingCanvas.tsx';
import type { Controller } from '../../interaction/controller.ts';
import type { Session } from '../../session/session.ts';
import { Icon, IconButton } from '../icons/Icon.tsx';
import { CanvasOverlays } from '../Overlays.tsx';
import { useSession } from '../use-session.ts';
import { NewView, ScaleSelect } from '../ViewControls.tsx';

function storeyLabel(s: Session): string {
  const st = s.model.storeys[s.view.storeyId];
  if (!st) return '';
  const e = st.elevation;
  return `Půdorys · ${st.name} (${e > 0 ? '+' : e < 0 ? '−' : '±'}${Math.abs(e)})`;
}

export function ViewWindow({ s, controller }: { s: Session; controller: Controller }) {
  useSession(s);
  const [adding, setAdding] = useState(false);
  const v = s.view;
  return (
    <section class="window active" data-testid="window">
      <div class="window-head">
        <span class="window-tab">
          <Icon name="plan" size={16} />
          <select data-testid="view-select" value={v.id} onChange={(e) => s.setView(e.currentTarget.value)}>
            {Object.values(s.model.views).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </span>
        {adding ? (
          <NewView s={s} onDone={() => setAdding(false)} />
        ) : (
          <IconButton
            icon="view-new"
            label="Nový pohled"
            description="Vytvoří pohled podlaží s vlastním stylem a měřítkem (jako kopie půdorysu)."
            testid="new-view-open"
            onClick={() => setAdding(true)}
          />
        )}
        <span class="spacer" />
        <ScaleSelect
          value={v.scale}
          onPick={(scale) => s.run('view.setScale', { viewId: v.id, scale })}
          testid="view-scale"
        />
      </div>
      <main class="workspace">
        <span class="view-label">{storeyLabel(s)}</span>
        <DrawingCanvas session={s} controller={controller} />
        <CanvasOverlays session={s} />
      </main>
    </section>
  );
}
