// Materiál (základ 10, rozhodnutí 5): šrafa a vzhled řezu jsou u materiálu, ne u typu stěny.
import type { Id } from '../ids/index.ts';
import type { LibraryRef } from '../model/types.ts';

/** Šrafa materiálu: vzor z knihovny šraf + pero (základ 32) + barva. Velikost vzoru je na papíře (základ 29). */
export interface MaterialHatch {
  readonly patternId: string;
  readonly pen: number;
  readonly color: string;
}

export interface Material {
  readonly id: Id;
  readonly name: string;
  /** Skupina materiálů: zdivo, beton, izolace, dřevo, omítka… */
  readonly group: string;
  readonly hatch: MaterialHatch;
  /** Barva výplně řezu (hrubá podrobnost ji může použít přes funkci grafiky). */
  readonly cutFillColor: string;
  /** Priorita napojování vrstev: vyšší číslo prochází rohem (jádro > izolace > omítka). */
  readonly joinPriority: number;
  readonly source?: LibraryRef;
}
