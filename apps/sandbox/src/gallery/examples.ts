// Příklady pro galerii napojení (plán stěn Z2): každý příklad je malý projekt postavený jen příkazy
// z registru (jako by kreslila AI), aby šlo posoudit vzhled rohů pro různé skladby.
import {
  createCoreRegistry,
  createEmptyProject,
  Editor,
  sequentialIds,
  type Id,
  type Vec2,
} from '@bim-light/core';

export interface Example {
  readonly title: string;
  readonly note: string;
  readonly editor: Editor;
  readonly viewId: Id;
}

interface Ctx {
  readonly ed: Editor;
  readonly storeyId: Id;
  type(name: string): Id;
  wall(a: Vec2, b: Vec2, type: string, connections?: unknown[]): Id;
  run(name: string, params: unknown): void;
}

function context(): { ctx: Ctx; viewId: Id } {
  const newId = sequentialIds();
  const ed = new Editor(createEmptyProject(newId, 'Galerie'), { registry: createCoreRegistry(), newId });
  const storeyId = Object.keys(ed.model.storeys)[0] as Id;
  const viewId = Object.keys(ed.model.views)[0] as Id;
  const run = (name: string, params: unknown) => {
    const r = ed.execute(name, params);
    if (!r.ok) throw new Error(`${name}: ${r.error.message}`);
    return r.created;
  };
  const type = (name: string) => Object.values(ed.model.wallTypes).find((t) => t.name === name)?.id ?? '';
  const ctx: Ctx = {
    ed,
    storeyId,
    type,
    run,
    wall: (a, b, t, connections = []) =>
      run('wall.create', {
        storeyId,
        typeId: type(t),
        path: { kind: 'line', start: a, end: b },
        connections,
      })[0] as Id,
  };
  return { ctx, viewId };
}

const v = (x: number, y: number): Vec2 => ({ x, y });
const at = (deg: number, r: number): Vec2 =>
  v(r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180));

/** Roh L: A vodorovně do počátku, B z počátku pod úhlem `deg`. */
function corner(c: Ctx, ta: string, tb: string, deg = 90) {
  const a = c.wall(v(2000, 0), v(0, 0), ta);
  return [a, c.wall(v(0, 0), at(deg, 2000), tb, [{ end: 'start', wallId: a, at: 'ATEND' }])] as const;
}

function tee(c: Ctx, host: string, t: string, deg = 90, outside = false) {
  const h = c.wall(v(-2000, 0), v(2000, 0), host);
  // Zevnitř končí na líci y = 0, zvenku na vnějším líci zateplené stěny (y = 465).
  const from = outside ? at(deg, 2500) : at(-deg, 2500);
  const to = outside ? v(from.x * (465 / from.y), 465) : v(0, 0);
  c.wall(from, to, t, [{ end: 'end', wallId: h, at: 'ATPATH' }]);
}

function cross(c: Ctx, ta: string, tb: string) {
  const a = c.wall(v(-2000, 0), v(2000, 0), ta);
  const b = c.wall(v(0, -2000), v(0, 2000), tb);
  c.run('wall.cross', { wallId: b, toWallId: a });
}

function three(c: Ctx, host: string, t: string, four = false) {
  const a = c.wall(v(-2000, 0), v(0, 0), host);
  const b = c.wall(v(0, 0), v(2000, 0), host, [{ end: 'start', wallId: a, at: 'ATEND' }]);
  c.wall(v(0, -2000), v(0, 0), t, [
    { end: 'end', wallId: a, at: 'ATEND' },
    { end: 'end', wallId: b, at: 'ATSTART' },
  ]);
  if (four) c.wall(v(0, 0), v(0, 2000), t, [{ end: 'start', wallId: a, at: 'ATEND' }]);
}

const RECIPES: readonly [string, string, (c: Ctx) => void][] = [
  [
    'L – zateplená × zateplená',
    'jádro na jádro, izolace kolem vnějšího rohu, omítka ve vnitřním',
    (c) => corner(c, 'Obvodová zateplená 465', 'Obvodová zateplená 465'),
  ],
  [
    'L – zateplená × nosná s omítkami',
    'izolace podjede k vnějšímu líci, omítka obteče roh',
    (c) => corner(c, 'Obvodová zateplená 465', 'Nosná zeď 330'),
  ],
  [
    'L – příčka 100 × příčka 150',
    'různé tloušťky, omítky v obou rozích',
    (c) => corner(c, 'Příčka 100', 'Příčka 150'),
  ],
  [
    'L – zdivo × ŽB',
    'ŽB (vyšší priorita) projede zdivem až k líci',
    (c) => corner(c, 'Zdivo 300', 'ŽB stěna 200'),
  ],
  [
    'Šikmý roh 60°',
    'pokos po vrstvách',
    (c) => corner(c, 'Obvodová zateplená 465', 'Obvodová zateplená 465', 60),
  ],
  ['Šikmý roh 135°', 'tupý úhel', (c) => corner(c, 'Nosná zeď 330', 'Nosná zeď 330', 135)],
  [
    'T – příčka zevnitř',
    'jádro k jádru, omítka hostitele obteče roh',
    (c) => tee(c, 'Obvodová zateplená 465', 'Příčka 100'),
  ],
  [
    'T – zeď zvenku',
    'izolace se přeruší, jádro hostitele nikdy',
    (c) => tee(c, 'Obvodová zateplená 465', 'Zdivo 300', 90, true),
  ],
  ['T šikmé 45°', 'napojení pod úhlem', (c) => tee(c, 'Nosná zeď 330', 'Příčka 100', 45)],
  ['X – příčka × příčka', 'kříž, při shodě vyhraje hostitel', (c) => cross(c, 'Příčka 150', 'Příčka 100')],
  ['X – nosná × ŽB', 'ŽB projede', (c) => cross(c, 'Nosná zeď 330', 'ŽB stěna 200')],
  ['Tři konce v uzlu', 'dvojice v přímce = hostitel', (c) => three(c, 'Nosná zeď 330', 'Příčka 100')],
  ['Čtyři konce v uzlu', 'jako kříž', (c) => three(c, 'Nosná zeď 330', 'Příčka 150', true)],
  [
    'V přímce – různé tloušťky',
    'kolmý řez v uzlu',
    (c) => {
      const a = c.wall(v(-2000, 0), v(0, 0), 'Nosná zeď 330');
      c.wall(v(0, 0), v(2000, 0), 'Příčka 150', [{ end: 'start', wallId: a, at: 'ATEND' }]);
    },
  ],
  ['Volný konec', 'omítky zahnou přes čelo', (c) => void c.wall(v(-2000, 0), v(0, 0), 'Nosná zeď 330')],
  [
    'Nespojovat',
    'roh se nečistí (Disallow Join)',
    (c) => {
      const [, b] = corner(c, 'Příčka 150', 'Příčka 150');
      c.run('wall.setJoin', { wallId: b, end: 'start', join: false });
    },
  ],
];

export function buildExamples(): Example[] {
  return RECIPES.map(([title, note, build]) => {
    const { ctx, viewId } = context();
    build(ctx);
    return { title, note, editor: ctx.ed, viewId };
  });
}
