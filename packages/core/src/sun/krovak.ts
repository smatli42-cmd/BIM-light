// S-JTSK (Křovákovo zobrazení, kladné Y, X v metrech) → zeměpisná šířka a délka na Besselově elipsoidu.
// Pro polohu slunce stačí přesnost na stovky metrů, posun mezi elipsoidy (Bessel / WGS 84) se zanedbává.
const E = 0.081696831215303;
const N = 0.97992470462083;
const RO0 = 12310230.12797036;
const SIN_UQ = 0.863499969506341;
const COS_UQ = 0.504348889819882;
const SIN_VQ = 0.420215144586493;
const COS_VQ = 0.907424504992097;
const ALFA = 1.000597498371542;
const K = 1.003419163966575;

export interface LatLon {
  /** ° severní šířky */
  readonly lat: number;
  /** ° východní délky */
  readonly lon: number;
}

export function sjtskToLatLon(y: number, x: number): LatLon {
  const ro = Math.hypot(x, y);
  const eps = 2 * Math.atan(y / (ro + x));
  const d = eps / N;
  const s = 2 * Math.atan(Math.exp((1 / N) * Math.log(RO0 / ro))) - Math.PI / 2;
  const sinU = SIN_UQ * Math.sin(s) - COS_UQ * Math.cos(s) * Math.cos(d);
  const cosU = Math.sqrt(1 - sinU * sinU);
  const sinDV = (Math.sin(d) * Math.cos(s)) / cosU;
  const cosDV = Math.sqrt(1 - sinDV * sinDV);
  const sinV = SIN_VQ * cosDV - COS_VQ * sinDV;
  const cosV = COS_VQ * cosDV + SIN_VQ * sinDV;
  const dLon = (2 * Math.atan(sinV / (1 + cosV))) / ALFA;
  const t = Math.exp((2 / ALFA) * Math.log((1 + sinU) / cosU / K));
  let sinB = (t - 1) / (t + 1);
  for (let i = 0; i < 20; i++) {
    const p = t * Math.exp(E * Math.log((1 + E * sinB) / (1 - E * sinB)));
    const next = (p - 1) / (p + 1);
    if (Math.abs(next - sinB) < 1e-15) break;
    sinB = next;
  }
  const deg = 180 / Math.PI;
  return { lat: Math.asin(sinB) * deg, lon: dLon * deg };
}
