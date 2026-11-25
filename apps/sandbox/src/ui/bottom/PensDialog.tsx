// Pera a barvy (koncepce rozhraní, část 2 G; základ 32): tabulka pero × měřítko → mm na papíře.
// Změna jde přes příkaz display.setPenWidth. Sady per (Studie, Projekt, TZB…) přijdou s etapou 7.
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { NumberInput } from '../NumberInput.tsx';

export function PensDialog({ s, onClose }: { s: Session; onClose: () => void }) {
  const t = s.model.display.penTable;
  return (
    <div class="dialog-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div class="dialog panel" role="dialog" data-testid="pens-dialog">
        <div class="find-head">
          <strong>Pera a barvy</strong>
          <IconButton icon="close" label="Zavřít" onClick={onClose} />
        </div>
        <p class="muted">Tloušťka pera v mm na papíře pro každé měřítko (ISO 128). Barvy čar určuje styl.</p>
        <table class="pen-table">
          <thead>
            <tr>
              <th>Pero</th>
              {t.scales.map((sc) => (
                <th key={sc}>1:{sc}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.pens.map((p) => (
              <tr key={p.pen}>
                <td>{p.pen}</td>
                {p.widths.map((w, i) => (
                  <td key={i}>
                    <NumberInput
                      testid={`pen-${p.pen}-${t.scales[i]}`}
                      value={w}
                      onSet={(mm) => s.run('display.setPenWidth', { pen: p.pen, scale: t.scales[i], mm })}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
