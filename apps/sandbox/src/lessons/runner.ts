// Běh lekce: aktuální krok a cvičný projekt. Stav je mimo model (jen obrazovka tohoto uživatele);
// cvičný projekt se staví stejnými příkazy jádra jako jinde, původní projekt se po lekci vrátí.
import {
  createCoreRegistry,
  createEmptyProject,
  createGlobalId,
  Editor,
  type EditorState,
  type Model,
} from '@bim-light/core';
import { zoomTo } from '../interaction/keyboard.ts';
import type { Session } from '../session/session.ts';
import type { Lesson } from './types.ts';

export interface RunningLesson {
  readonly lesson: Lesson;
  step: number;
  readonly saved: EditorState | null;
}

const state = new WeakMap<Session, RunningLesson>();

export const runningLesson = (s: Session): RunningLesson | null => state.get(s) ?? null;

/** Cvičný projekt: místnost 6 × 4 m z Zdiva 300 s oknem v horní stěně. */
export function practiceModel(): Model {
  const newId = () => createGlobalId();
  const ed = new Editor(createEmptyProject(newId, 'Cvičný projekt'), {
    registry: createCoreRegistry(),
    newId,
  });
  const storeyId = Object.keys(ed.model.storeys)[0] ?? '';
  const types = Object.values(ed.model.wallTypes);
  const typeId = (types.find((t) => t.name === 'Zdivo 300') ?? types[0])?.id ?? '';
  const points = [
    { x: 0, y: 0 },
    { x: 0, y: 4000 },
    { x: 6000, y: 4000 },
    { x: 6000, y: 0 },
  ];
  const r = ed.execute('wall.chain', { storeyId, typeId, points, closed: true });
  const top = r.ok ? r.created[1] : undefined;
  if (top) ed.execute('opening.create', { wallId: top, offset: 2400, width: 1200, height: 1500, sill: 900 });
  return ed.model;
}

function show(s: Session, run: RunningLesson) {
  run.lesson.steps[run.step]?.setup?.(s);
  s.changed();
}

export function startLesson(s: Session, lesson: Lesson) {
  endLesson(s);
  s.setTool('select');
  s.selection.clear();
  const saved = lesson.practice ? s.editor.saveState() : null;
  if (lesson.practice) {
    s.editor.load(practiceModel());
    zoomTo(s, false);
  }
  const run: RunningLesson = { lesson, step: 0, saved };
  state.set(s, run);
  show(s, run);
}

/** Přejde na krok; za posledním lekce skončí. */
export function goStep(s: Session, step: number) {
  const run = state.get(s);
  if (!run) return;
  if (step >= run.lesson.steps.length) return endLesson(s);
  run.step = Math.max(0, step);
  show(s, run);
}

export function endLesson(s: Session) {
  const run = state.get(s);
  if (!run) return;
  state.delete(s);
  if (run.saved) {
    s.setTool('select');
    s.selection.clear();
    s.editor.restoreState(run.saved);
    zoomTo(s, false);
  }
  s.changed();
}
