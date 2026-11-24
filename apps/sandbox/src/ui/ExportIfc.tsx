// Tlačítko „Exportovat IFC“ (plán stěn Z3): celý model do IFC4, zápis přes Platform (základ 13).
import { exportIfc } from '@bim-light/ifc';
import type { Session } from '../session/session.ts';
import { browserPlatform } from '../platform/browser.ts';

/** Bezpečný název souboru z názvu projektu. */
const fileName = (name: string) => `${name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'projekt'}.ifc`;

export function ExportIfc({ s }: { s: Session }) {
  const run = () => {
    const name = fileName(s.model.project.name);
    const text = exportIfc(s.model, { fileName: name, timestamp: new Date().toISOString().slice(0, 19) });
    void browserPlatform.writeTextAtomic(name, text).then(() => s.toast(`Exportováno: ${name}`, 'ok'));
  };
  return (
    <div class="tool-group">
      <button data-testid="export-ifc" title="Uloží projekt, podlaží a stěny do IFC4" onClick={run}>
        Exportovat IFC
      </button>
    </div>
  );
}
