import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { sjtskToLatLon } from './krovak.ts';
import { localToUtc, sunAngles, sunDirection } from './position.ts';

describe('3D náhled / slunce a stíny: poloha slunce z data, času a místa stavby', () => {
  it('základ 17: S-JTSK → zeměpisné souřadnice (Praha, Brno)', () => {
    const praha = sjtskToLatLon(743000, 1043000);
    expect(praha.lat).toBeCloseTo(50.08, 1);
    expect(praha.lon).toBeCloseTo(14.42, 1);
    const brno = sjtskToLatLon(598500, 1160500);
    expect(brno.lat).toBeCloseTo(49.19, 1);
    expect(brno.lon).toBeCloseTo(16.6, 1);
  });

  it('místní čas: léto SELČ (UTC+2), zima SEČ (UTC+1)', () => {
    expect(new Date(localToUtc('2026-06-21', '12:00')).toISOString()).toBe('2026-06-21T10:00:00.000Z');
    expect(new Date(localToUtc('2026-12-21', '12:00')).toISOString()).toBe('2026-12-21T11:00:00.000Z');
  });

  it('Praha 21. 6. v pravé poledne: slunce na jihu asi 63° nad obzorem; v zimě asi 16°', () => {
    const at = { lat: 50.08, lon: 14.42 };
    const noon = (date: string) => Date.parse(`${date}T11:02:00Z`);
    const summer = sunAngles(noon('2026-06-21'), at);
    expect(summer.azimuth).toBeGreaterThan(175);
    expect(summer.azimuth).toBeLessThan(185);
    expect(summer.altitude).toBeCloseTo(63.4, 0);
    const winter = sunAngles(noon('2026-12-21'), at);
    expect(winter.altitude).toBeCloseTo(16.5, 0);
  });

  it('směr ke slunci v osách modelu: azimut 180° = −Y, natočení georeference ho otočí', () => {
    const f = fixture();
    const sun = { shadows: true, mode: 'manual' as const, azimuth: 180, altitude: 0, date: '', time: '' };
    const d = sunDirection(f.model, sun);
    expect([d.x, d.y, d.z].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, -1, 0]);
    const turned = {
      ...f.model,
      project: { ...f.model.project, georef: { ...f.model.project.georef, rotationDeg: 90 } },
    };
    const t = sunDirection(turned, sun);
    expect([t.x, t.y].map((v) => Math.round(v * 1000) / 1000)).toEqual([1, 0]);
  });
});
