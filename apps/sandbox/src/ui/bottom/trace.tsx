// Spodní lišta – trasování (koncepce rozhraní, část 2 G): průsvitný odkaz jiného podlaží; odkaz níž /
// výš / konkrétní podlaží, intenzita, kreslit nad / pod aktivním, prohodit odkaz s aktivním.
import { storeysOf } from '@bim-light/core';
import { traceStorey } from '../../render/screen-layers.ts';
import type { ScreenOptions } from '../../session/screen.ts';
import type { Session } from '../../session/session.ts';
import { openStorey } from '../../session/sets.ts';
import { IconButton } from '../icons/Icon.tsx';
import { BarMenu, type MenuSection } from './BarMenu.tsx';
import { setScreen } from './groups.tsx';

type Trace = ScreenOptions['trace'];

/** Odkaz: níž / výš (auto) a konkrétní podlaží (aktivní nejde). */
function refMenu(s: Session, t: Trace, set: (p: Partial<Trace>) => void) {
  const stack = storeysOf(s.model, s.model.storeys[s.storeyId]?.buildingId ?? '');
  return [
    { label: 'Níž (auto)', checked: t.ref === 'below', onPick: () => set({ ref: 'below' }) },
    { label: 'Výš (auto)', checked: t.ref === 'above', onPick: () => set({ ref: 'above' }) },
    ...[...stack].reverse().map((st) => ({
      label: st.name,
      checked: t.ref === st.id,
      disabled: st.id === s.storeyId,
      onPick: () => set({ ref: st.id }),
    })),
  ];
}

/** Volby nabídky trasování: odkaz, intenzita, kreslit nad / pod, prohodit. */
function traceSections(
  s: Session,
  t: Trace,
  set: (p: Partial<Trace>) => void,
  ref: string | null,
): MenuSection[] {
  const refItems = refMenu(s, t, set);
  const level = (v: Trace['intensity'], label: string) => ({
    label,
    checked: t.intensity === v,
    onPick: () => set({ intensity: v }),
  });
  const sections = [
    { title: 'Odkaz', items: refItems },
    {
      title: 'Intenzita',
      items: [level('weak', 'slabá'), level('mid', 'střední'), level('strong', 'silná')],
    },
    {
      title: 'Kreslit odkaz',
      items: [
        { label: 'nad aktivním', checked: t.over, onPick: () => set({ over: true }) },
        { label: 'pod aktivním', checked: !t.over, onPick: () => set({ over: false }) },
      ],
    },
    {
      title: 'Povel',
      items: [
        {
          label: '⇄ Prohodit odkaz s aktivním',
          testid: 'trace-swap',
          disabled: !ref,
          onPick: () => {
            const cur = s.storeyId;
            if (ref) openStorey(s, ref);
            set({ ref: cur });
          },
        },
      ],
    },
  ];
  return sections;
}

export function TraceGroup({ s }: { s: Session }) {
  const t = s.screen.trace;
  const set = (patch: Partial<Trace>) => setScreen(s, { trace: { ...t, ...patch } });
  const ref = traceStorey(s);
  const name = ref ? s.model.storeys[ref]?.name : '–';
  const sections = traceSections(s, t, set, ref);
  const label = `${t.ref === 'below' ? 'Níž' : t.ref === 'above' ? 'Výš' : 'Podlaží'} · ${name}`;
  return (
    <div class="tool-group">
      <IconButton
        icon="trace"
        label="Trasování"
        testid="trace-toggle"
        pressed={t.on}
        onClick={() => set({ on: !t.on })}
      />
      <BarMenu label={label} title="Odkaz trasování" testid="trace-menu" sections={sections} />
    </div>
  );
}
