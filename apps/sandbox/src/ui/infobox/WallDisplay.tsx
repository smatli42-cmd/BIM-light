// Sekce Zobrazení vybrané stěny (plán stěn Z6): stav (stávající / bourání / nový), kresba stěn ve stylu
// (konce stěn, značka osy) a „proč“ – které patro a pravidlo grafiky rozhodlo (základ 11). Data jsou
// z jádra (funkce grafiky, pro AI dotaz element.graphics); vše se mění jen příkazy.
import { elementFacts, resolveGraphics, styleOfView, type Wall } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { STATUS_LABELS } from './NewStatus.tsx';
import { Section } from './Section.tsx';

/** Vlastnosti grafiky, u kterých panel ukáže důvod. */
const WHY: [string, string][] = [
  ['visible', 'Viditelnost'],
  ['lineColor', 'Barva čar'],
  ['lineType', 'Typ čáry'],
  ['cutPen', 'Pero řezu'],
  ['fillColor', 'Výplň'],
  ['hatch', 'Šrafa'],
];

function value(v: unknown): string {
  if (v === null) return 'žádná';
  if (typeof v === 'boolean') return v ? 'ano' : 'ne';
  if (typeof v === 'object') return 'pevná šrafa';
  return v === 'material' ? 'z materiálu' : v === 'none' ? 'žádná' : String(v);
}

function Why({ s, wall }: { s: Session; wall: Wall }) {
  const r = resolveGraphics(s.model.display, s.view, elementFacts(s.model, wall));
  return (
    <dl class="why" data-testid="graphics-why">
      {WHY.map(([key, label]) => {
        const k = key as keyof typeof r.effect;
        return (
          <div key={key}>
            <dt>{label}</dt>
            <dd>
              {value(r.effect[k])}
              <span class="muted">
                {' '}
                · {r.why[k].level} {r.why[k].source}
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Kresba stěn ve stylu pohledu: konce stěn a značka osy (zaškrtnutí = výsledek funkce grafiky). */
function StyleChecks({ s, wall }: { s: Session; wall: Wall }) {
  const style = styleOfView(s.model.display, s.view);
  const g = resolveGraphics(s.model.display, s.view, elementFacts(s.model, wall)).effect;
  const setStyle = (k: 'endLines' | 'refLine', v: boolean) =>
    s.run('style.setWallDrawing', { styleId: style.id, [k]: v });
  return (
    <>
      <label class="check">
        <input
          type="checkbox"
          data-testid="style-endlines"
          checked={g.endLines}
          onChange={(e) => setStyle('endLines', e.currentTarget.checked)}
        />
        Čelní čára volného konce (styl {style.name})
      </label>
      <label class="check">
        <input
          type="checkbox"
          data-testid="style-refline"
          checked={g.refLine}
          onChange={(e) => setStyle('refLine', e.currentTarget.checked)}
        />
        Značka referenční čáry (styl {style.name})
      </label>
    </>
  );
}

export function WallDisplay({ s, walls }: { s: Session; walls: Wall[] }) {
  const first = walls[0] as Wall;
  const ids = walls.map((w) => w.id);
  const same = walls.every((w) => w.status === first.status);
  return (
    <Section title="Zobrazení" info="Stav řídí fáze; čáry a barvy určuje funkce grafiky (patra 1–6).">
      <label>
        Stav (fáze)
        <select
          data-testid="sel-status"
          value={same ? first.status : ''}
          onChange={(e) => s.run('wall.setProperties', { wallIds: ids, status: e.currentTarget.value })}
        >
          {!same && <option value="">různé</option>}
          {STATUS_LABELS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <StyleChecks s={s} wall={first} />
      <label class="check">
        <input
          type="checkbox"
          checked={s.tempMode === 'axis'}
          onChange={(e) => ((s.tempMode = e.currentTarget.checked ? 'axis' : 'face'), s.changed())}
        />
        Dočasné kóty k osám
      </label>
      {walls.length === 1 && (
        <>
          <div class="content-group">Proč tak vypadá (patro · zdroj)</div>
          <Why s={s} wall={first} />
        </>
      )}
    </Section>
  );
}
