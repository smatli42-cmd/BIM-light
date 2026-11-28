// Hrany vybrané střechy v info boxu (S1, S2): seznam hran (sklon / štít a sklon) a vybraná hrana – klikem na
// řádek, štítek nebo hranu v půdorysu – s druhem, sklonem a přesahem. Vše příkazem roof.setEdge.
import type { Roof } from '@bim-light/core';
import { roofDefaults } from '../../session/roof-defaults.ts';
import type { Session } from '../../session/session.ts';
import { NumberInput } from '../NumberInput.tsx';
import { Section } from './Section.tsx';

/** Vybraná hrana: druh, sklon, přesah. */
function ActiveEdge({ s, roof, index }: { s: Session; roof: Roof; index: number }) {
  const e = roof.edges[index];
  if (!e) return null;
  const set = (p: Record<string, unknown>) =>
    s.run('roof.setEdge', { roofId: roof.id, indices: [index], ...p });
  return (
    <div class="ib-group" data-testid="roof-active-edge">
      <strong>Hrana {index + 1}</strong>
      <label>
        Druh
        <select
          data-testid="roof-active-kind"
          value={e.kind}
          onChange={(ev) => set({ kind: ev.currentTarget.value })}
        >
          <option value="slope">sklon (okap)</option>
          <option value="gable">štít</option>
          <option value="halfhip">polovalba</option>
        </select>
      </label>
      {e.kind === 'halfhip' && (
        <label>
          Výška zlomu nad ref. čárou (mm)
          <NumberInput
            testid="roof-active-break"
            value={e.breakHeight ?? 0}
            onSet={(v) => set({ breakHeight: v })}
          />
        </label>
      )}
      {e.kind !== 'gable' && (
        <label>
          Sklon (°)
          <NumberInput testid="roof-active-slope" value={e.slope} onSet={(v) => set({ slope: v })} />
        </label>
      )}
      <label>
        Přesah (mm)
        <NumberInput testid="roof-active-overhang" value={e.overhang} onSet={(v) => set({ overhang: v })} />
      </label>
    </div>
  );
}

export function RoofEdges({ s, roof }: { s: Session; roof: Roof }) {
  const d = roofDefaults(s);
  const active = d.edge?.roofId === roof.id ? d.edge.index : null;
  const pick = (i: number) => ((d.edge = { roofId: roof.id, index: i }), s.changed());
  const set = (i: number, p: Record<string, unknown>) =>
    s.run('roof.setEdge', { roofId: roof.id, indices: [i], ...p });
  return (
    <Section
      title="Hrany"
      info="Každá hrana obrysu: sklon (okap) nebo štít, sklon a přesah. Klik na hranu nebo její štítek v půdorysu ji vybere."
    >
      {roof.edges.map((e, i) => (
        <div
          class={active === i ? 'ib-row active' : 'ib-row'}
          key={i}
          data-testid={`roof-edge-${i}`}
          onClick={() => pick(i)}
        >
          <select
            data-testid={`roof-edge-kind-${i}`}
            value={e.kind}
            onChange={(ev) => set(i, { kind: ev.currentTarget.value })}
          >
            <option value="slope">{i + 1}: sklon</option>
            <option value="gable">{i + 1}: štít</option>
            <option value="halfhip">{i + 1}: polovalba</option>
          </select>
          {e.kind !== 'gable' && (
            <NumberInput
              testid={`roof-edge-slope-${i}`}
              value={e.slope}
              onSet={(v) => set(i, { slope: v })}
            />
          )}
        </div>
      ))}
      {active !== null && <ActiveEdge s={s} roof={roof} index={active} />}
    </Section>
  );
}
