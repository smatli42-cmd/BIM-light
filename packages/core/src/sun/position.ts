// Poloha slunce (zjednodušený algoritmus NOAA, přesnost desetiny stupně) a směr ke slunci v osách modelu.
// Místní čas = středoevropský (SEČ, v létě SELČ: poslední neděle v březnu až poslední neděle v říjnu).
import type { Model } from '../model/types.ts';
import type { Point3, Sun3d } from '../view-3d/types.ts';
import { sjtskToLatLon, type LatLon } from './krovak.ts';

/** Střed ČR – když projekt nemá georeferenci (S-JTSK 0, 0). */
export const CZ_CENTER: LatLon = { lat: 49.8, lon: 15.5 };

export interface SunAngles {
  /** ° od severu po směru hodinových ručiček */
  readonly azimuth: number;
  /** ° nad obzorem (záporné = pod obzorem) */
  readonly altitude: number;
}

const RAD = Math.PI / 180;

const lastSunday = (year: number, month: number) => {
  const d = new Date(Date.UTC(year, month + 1, 0));
  return d.getUTCDate() - d.getUTCDay();
};

/** UTC čas (ms) místního data „RRRR-MM-DD“ a času „HH:MM“ v SEČ / SELČ. */
export function localToUtc(date: string, time: string): number {
  const [y = 2026, mo = 1, d = 1] = date.split('-').map(Number);
  const [h = 12, mi = 0] = time.split(':').map(Number);
  const winter = Date.UTC(y, mo - 1, d, h - 1, mi);
  const start = Date.UTC(y, 2, lastSunday(y, 2), 1);
  const end = Date.UTC(y, 9, lastSunday(y, 9), 1);
  return winter >= start && winter - 3600000 < end ? winter - 3600000 : winter;
}

/** Azimut a výška slunce v čase `utcMs` nad místem `at`. */
export function sunAngles(utcMs: number, at: LatLon): SunAngles {
  const d = utcMs / 86400000 - 10957.5;
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const l = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l));
  const dec = Math.asin(Math.sin(e) * Math.sin(l));
  const gmst = (18.697374558 + 24.06570982441908 * d) * 15;
  const h = (gmst + at.lon) * RAD - ra;
  const lat = at.lat * RAD;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h));
  const az = Math.atan2(-Math.sin(h), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(h));
  return { azimuth: (((az / RAD) % 360) + 360) % 360, altitude: alt / RAD };
}

/** Místo stavby z georeference (S-JTSK), jinak střed ČR. */
export function siteLatLon(model: Model): LatLon {
  const g = model.project.georef;
  return g.sjtskX && g.sjtskY ? sjtskToLatLon(g.sjtskY, g.sjtskX) : CZ_CENTER;
}

/** Azimut a výška slunce 3D pohledu (ručně, nebo podle data a času v místě stavby). */
export function sunOf(model: Model, sun: Sun3d): SunAngles {
  if (sun.mode === 'manual') return { azimuth: sun.azimuth, altitude: sun.altitude };
  return sunAngles(localToUtc(sun.date, sun.time), siteLatLon(model));
}

/**
 * Jednotkový směr ke slunci v osách modelu. Natočení georeference = úhel osy Y projektu od severu
 * po směru hodinových ručiček, proto se od azimutu odečte.
 */
export function sunDirection(model: Model, sun: Sun3d): Point3 {
  const { azimuth, altitude } = sunOf(model, sun);
  const a = (azimuth - model.project.georef.rotationDeg) * RAD;
  const h = altitude * RAD;
  return { x: Math.sin(a) * Math.cos(h), y: Math.cos(a) * Math.cos(h), z: Math.sin(h) };
}
