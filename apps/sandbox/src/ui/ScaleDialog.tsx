// Okno příkazu Změnit velikost (Ctrl+K) podle vzoru Arditu: měřítko v %, změnit i rozměry otvorů.
// Hodnoty jsou volby nástroje (s.options), příkaz se spustí až klikem výchozího bodu.
import { ScaleTool } from '../interaction/tools/commands/scale-tool.ts';
import type { Session } from '../session/session.ts';
import { IconButton } from './icons/Icon.tsx';

function ScaleFields({ s }: { s: Session }) {
  return (
    <>
      <label class="scale-row">
        Měřítko (%)
        <input
          type="number"
          min="1"
          step="1"
          autoFocus
          data-testid="scale-percent"
          value={s.options.scalePercent}
          onInput={(e) => (s.options.scalePercent = Number(e.currentTarget.value) || 0)}
        />
      </label>
      <label class="check scale-row">
        Změnit i rozměry oken, dveří a otvorů
        <input
          type="checkbox"
          data-testid="scale-openings"
          checked={s.options.scaleOpenings}
          onChange={(e) => (s.options.scaleOpenings = e.currentTarget.checked)}
        />
      </label>
    </>
  );
}

export function ScaleDialog({ s }: { s: Session }) {
  const tool = s.tool;
  if (!(tool instanceof ScaleTool) || !tool.dialog) return null;
  const cancel = () => s.setTool('select');
  const ok = () => s.options.scalePercent > 0 && tool.confirm();
  return (
    <div class="dialog-back" onMouseDown={(e) => e.stopPropagation()}>
      <div
        class="dialog scale-dialog panel"
        role="dialog"
        aria-label="Změnit velikost"
        data-testid="scale-dialog"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') ok();
          if (e.key === 'Escape') cancel();
        }}
      >
        <div class="content-head">
          <h2 class="content-title">Změnit velikost</h2>
          <IconButton icon="close" label="Zavřít" onClick={cancel} />
        </div>
        <ScaleFields s={s} />
        <p class="muted">
          Pak klikni výchozí bod – vzdálenosti od něj se změní v daném poměru. Tloušťky stěn a výšky
          zůstávají.
        </p>
        <div class="dialog-actions">
          <button onClick={cancel}>Zrušit</button>
          <button class="active" data-testid="scale-ok" onClick={ok}>
            Pokračovat
          </button>
        </div>
      </div>
    </div>
  );
}
