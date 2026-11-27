// Slunce a stíny 3D pohledu (jako v Arditu): stíny zapnout / vypnout, poloha ručně (azimut, výška), nebo
// podle data a místního času v místě stavby (georeference; jádro: sunOf). Mění se příkazem view3d.setSun.
import { sunOf, type Sun3d } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { IconButton } from '../ui/icons/Icon.tsx';
import { active3d } from './state.ts';

const deg = (v: number) => `${Math.round(v)}°`;

type SetSun = (patch: Partial<Sun3d>) => void;
const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value);

function ManualSun({ sun, set }: { sun: Sun3d; set: SetSun }) {
  return (
    <>
      <label>
        Azimut
        <input
          type="number"
          step={5}
          data-testid="view3d-sun-azimuth"
          value={sun.azimuth}
          onChange={(e) => set({ azimuth: num(e) })}
        />
      </label>
      <label>
        Výška
        <input
          type="number"
          min={0}
          max={90}
          step={5}
          data-testid="view3d-sun-altitude"
          value={sun.altitude}
          onChange={(e) => set({ altitude: num(e) })}
        />
      </label>
    </>
  );
}

function TimeSun({ sun, set }: { sun: Sun3d; set: SetSun }) {
  return (
    <>
      <input
        type="date"
        data-testid="view3d-sun-date"
        value={sun.date}
        onChange={(e) => e.currentTarget.value && set({ date: e.currentTarget.value })}
      />
      <input
        type="time"
        data-testid="view3d-sun-time"
        value={sun.time}
        onChange={(e) => e.currentTarget.value && set({ time: e.currentTarget.value })}
      />
    </>
  );
}

function SunPanel({ s }: { s: Session }) {
  const v = active3d(s);
  const sun = v.sun;
  const set: SetSun = (patch) => s.run('view3d.setSun', { viewId: v.id, sun: patch });
  const at = sunOf(s.model, sun);
  return (
    <div class="sun-pop" data-testid="view3d-sun-panel">
      <label>
        <input
          type="checkbox"
          data-testid="view3d-shadows"
          checked={sun.shadows}
          onChange={(e) => set({ shadows: e.currentTarget.checked })}
        />
        Stíny
      </label>
      <select
        data-testid="view3d-sun-mode"
        value={sun.mode}
        onChange={(e) => set({ mode: e.currentTarget.value as Sun3d['mode'] })}
      >
        <option value="manual">Ručně</option>
        <option value="time">Podle data a času</option>
      </select>
      {sun.mode === 'manual' ? <ManualSun sun={sun} set={set} /> : <TimeSun sun={sun} set={set} />}
      <span class="sun-at" data-testid="view3d-sun-at">
        Slunce: azimut {deg(at.azimuth)}, výška {deg(at.altitude)}
        {at.altitude <= 0 ? ' (pod obzorem)' : ''}
      </span>
    </div>
  );
}

export function SunButton({ s }: { s: Session }) {
  const [open, setOpen] = useState(false);
  return (
    <span class="sun-3d">
      <IconButton
        icon="sun"
        label="Slunce a stíny"
        testid="view3d-sun"
        pressed={open || active3d(s).sun.shadows}
        onClick={() => setOpen(!open)}
      />
      {open && <SunPanel s={s} />}
    </span>
  );
}
