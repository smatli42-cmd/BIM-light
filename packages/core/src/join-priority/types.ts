// Priority spojování vrstev jako tabulka úrovní (pokyn uživatele 2026-11-28). Priorita materiálu není
// číslo, ale pořadí jeho úrovně v seřazeném seznamu projektu: úroveň výš projede úroveň níž (spoje stěn,
// uložení stropu). Materiál patří do úrovně své kategorie, výjimka se uloží u materiálu (`joinLevelId`).
import type { Id } from '../ids/index.ts';
import type { MaterialCategory } from '../material/types.ts';

/** Úroveň priority spojování (řádek tabulky). */
export interface JoinLevel {
  readonly id: Id;
  readonly name: string;
}

export interface JoinPriorities {
  /** Úrovně shora dolů: první projede všechny ostatní. */
  readonly levels: readonly JoinLevel[];
  /** Výchozí úroveň podle kategorie materiálu (materiál bez výjimky). */
  readonly categoryLevels: Readonly<Record<MaterialCategory, Id>>;
  /** Zásady řazení textem: podle nich AI zařadí nový materiál (upravitelné příkazem). */
  readonly policy: string;
}

/**
 * Výchozí úrovně (já, k potvrzení): česká praxe a Archicad (nosné projede nenosné, izolace a povrchy
 * nejníž). `legacy` = dřívější číselná priorita, podle ní migrace 43 → 44 zařadí materiály tak, aby se
 * výsledek spojů nezměnil.
 */
export const DEFAULT_JOIN_LEVELS: readonly (JoinLevel & { readonly legacy: number })[] = [
  { id: 'join-steel', name: 'Ocel a kovy', legacy: 80 },
  { id: 'join-rc', name: 'Nosný železobeton', legacy: 70 },
  { id: 'join-concrete', name: 'Beton prostý a cementové potěry', legacy: 60 },
  { id: 'join-screed', name: 'Anhydritové potěry', legacy: 55 },
  { id: 'join-masonry', name: 'Zdivo', legacy: 50 },
  { id: 'join-wood', name: 'Dřevo a dřevěné konstrukce', legacy: 40 },
  { id: 'join-other', name: 'Ostatní, sklo a krytiny', legacy: 30 },
  { id: 'join-membrane', name: 'Hydroizolace a fólie', legacy: 25 },
  { id: 'join-insulation', name: 'Tepelná izolace', legacy: 20 },
  { id: 'join-boards', name: 'Sádrokarton a desky', legacy: 15 },
  { id: 'join-finish', name: 'Omítky a malby', legacy: 10 },
  { id: 'join-soil', name: 'Zemina a sypaniny', legacy: 5 },
];

export const DEFAULT_CATEGORY_LEVELS: Readonly<Record<MaterialCategory, Id>> = {
  Kov: 'join-steel',
  'Beton a potěry': 'join-concrete',
  Zdivo: 'join-masonry',
  Dřevo: 'join-wood',
  Sklo: 'join-other',
  Ostatní: 'join-other',
  Izolace: 'join-insulation',
  Omítky: 'join-finish',
  'Zemina a sypaniny': 'join-soil',
};

export const DEFAULT_JOIN_POLICY = [
  'Nosné konstrukce jsou nahoře: ocel, železobeton, beton, zdivo, dřevo – tvrdší a nosnější výš.',
  'Nenosné vrstvy pod nosnými: tepelná izolace, desky (sádrokarton), omítky a malby úplně dole.',
  'Hydroizolace a fólie nad tepelnou izolací (fólie má být souvislá, izolace se k ní dorazí).',
  'Izolace ani povrch nikdy nad nosnou vrstvou (jinak by prořízly zdivo nebo strop).',
  'Dva různé materiály ve stejné úrovni se ve spoji potkají pokosem; když má jeden vést, dej ho výš.',
  'Nový materiál zařaď do úrovně podle funkce ve skladbě, ne jen podle kategorie.',
].join('\n');

export function defaultJoinPriorities(): JoinPriorities {
  return {
    levels: DEFAULT_JOIN_LEVELS.map(({ id, name }) => ({ id, name })),
    categoryLevels: { ...DEFAULT_CATEGORY_LEVELS },
    policy: DEFAULT_JOIN_POLICY,
  };
}
