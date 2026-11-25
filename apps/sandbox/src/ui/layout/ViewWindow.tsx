// E – okno pohledu (koncepce rozhraní, část 2): hlavička se záložkou pohledu, novým pohledem
// a měřítkem, pod ní výkres. Oken může být víc vedle sebe; aktivní má modrý rámeček (UI4).
import { useState } from 'preact/hooks';
import { DrawingCanvas } from '../../canvas/DrawingCanvas.tsx';
import type { Controller } from '../../interaction/controller.ts';
import type { Session } from '../../session/session.ts';
import { Icon, IconButton } from '../icons/Icon.tsx';
import { CanvasOverlays } from '../Overlays.tsx';
import { activate, setWindowView } from '../../session/windows.ts';
import { useSession } from '../use-session.ts';
import { NewView, ScaleSelect } from '../ViewControls.tsx';

function storeyLabel(s: Session, storeyId: string): string {
  const st = s.model.storeys[storeyId];
  if (!st) return '';
  const e = st.elevation;
  return `Půdorys · ${st.name} (${e > 0 ? '+' : e < 0 ? '−' : '±'}${Math.abs(e)})`;
}

export function ViewWindow({ s, controller, index }: { s: Session; controller: Controller; index: number }) {
  useSession(s);
  const [adding, setAdding] = useState(false);
  const active = index === s.active;
  const v = s.model.views[s.windows[index]?.viewId ?? ''] ?? s.view;
  return (
    <section class={active ? 'window active' : 'window'} data-testid={active ? 'window' : 'window-passive'}>
      <div class="window-head" onMouseDown={() => activate(s, index)}>
        <span class="window-tab">
          <Icon name="plan" size={16} />
          <select
            data-testid={active ? 'view-select' : 'view-select-passive'}
            value={v.id}
            onChange={(e) => setWindowView(s, index, e.currentTarget.value)}
          >
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
            testid={active ? 'new-view-open' : 'new-view-open-passive'}
            onClick={() => setAdding(true)}
          />
        )}
        <span class="spacer" />
        <ScaleSelect
          value={v.scale}
          onPick={(scale) => s.run('view.setScale', { viewId: v.id, scale })}
          testid={active ? 'view-scale' : 'view-scale-passive'}
        />
      </div>
      <main class="workspace">
        <span class="view-label">{storeyLabel(s, v.storeyId)}</span>
        <DrawingCanvas session={s} controller={controller} index={index} />
        {active && <CanvasOverlays session={s} />}
      </main>
    </section>
  );
}
