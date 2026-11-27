// Řez / pohled (fasáda) v pracovním okně místo půdorysu (pokyn uživatele 2026-11-27, jako 3D pohled):
// záhlaví okna s výběrem řezu, stylem a měřítkem (příkaz section.update), pod ním kresba z modelu.
import type { Section } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { openSection } from '../../session/section-windows.ts';
import { activate } from '../../session/windows.ts';
import { Icon } from '../icons/Icon.tsx';
import { ScaleSelect } from '../ViewControls.tsx';
import { SectionCanvas } from './SectionCanvas.tsx';
import { PlanWindowTabs } from '../layout/WindowTabs.tsx';

export function SectionWindowView(p: { s: Session; index: number; sec: Section; cls: string }) {
  const { s, index, sec } = p;
  const active = index === s.active;
  const suffix = active ? '' : '-passive';
  const upd = (patch: Record<string, unknown>) => s.run('section.update', { sectionId: sec.id, ...patch });
  return (
    <section class={p.cls} data-testid={active ? 'window' : 'window-passive'}>
      <PlanWindowTabs s={s} index={index} />
      <div class="window-head" onMouseDown={() => activate(s, index)}>
        <span class="window-tab">
          <Icon name={sec.kind === 'section' ? 'section' : 'elevation'} size={16} />
          <select
            data-testid={`section-select${suffix}`}
            value={sec.id}
            onChange={(e) => openSection(s, e.currentTarget.value)}
          >
            {Object.values(s.model.sections).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </span>
        <select
          data-testid={`section-style${suffix}`}
          value={sec.styleId}
          onChange={(e) => upd({ styleId: e.currentTarget.value })}
        >
          {Object.values(s.model.display.styles).map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <span class="spacer" />
        <ScaleSelect value={sec.scale} onPick={(scale) => upd({ scale })} testid={`section-scale${suffix}`} />
      </div>
      <main class="workspace">
        <span class="view-label" data-testid={`section-label${suffix}`}>
          {sec.kind === 'section' ? 'Řez' : 'Pohled'} · {sec.name} · 1:{sec.scale}
        </span>
        <SectionCanvas s={s} sectionId={sec.id} index={index} />
      </main>
    </section>
  );
}
