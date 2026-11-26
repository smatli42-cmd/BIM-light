// Průvodce během lekce: modrý rámeček kolem popisované části okna a bublina s vysvětlením,
// Zpět / Další / Ukončit. Rámeček nepřekáží klikání (v cvičném projektu se dá zkoušet).
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { endLesson, goStep, runningLesson } from '../../lessons/runner.ts';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { useSession } from '../use-session.ts';

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const BUBBLE_W = 320;
const GAP = 12;

/** Bublina vedle rámečku: vpravo, jinak vlevo, jinak pod / nad; vždy celá v okně prohlížeče. */
export function bubbleAt(t: Box, bubbleH: number, view: { w: number; h: number }) {
  const clampY = (y: number) => Math.min(Math.max(8, y), view.h - bubbleH - 8);
  const clampX = (x: number) => Math.min(Math.max(8, x), view.w - BUBBLE_W - 8);
  if (t.x + t.w + GAP + BUBBLE_W < view.w) return { x: t.x + t.w + GAP, y: clampY(t.y) };
  if (t.x - GAP - BUBBLE_W > 0) return { x: t.x - GAP - BUBBLE_W, y: clampY(t.y) };
  if (t.y + t.h + GAP + bubbleH < view.h) return { x: clampX(t.x), y: t.y + t.h + GAP };
  return { x: clampX(t.x), y: clampY(t.y - GAP - bubbleH) };
}

/** Poloha popisované části okna (přeměří se po každém vykreslení a při změně velikosti okna). */
function useTargetBox(selector: string | null): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  const [, setTick] = useState(0);
  useLayoutEffect(() => {
    const r = selector ? document.querySelector(selector)?.getBoundingClientRect() : undefined;
    const next = r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
    if (JSON.stringify(next) !== JSON.stringify(box)) setBox(next);
  });
  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    window.addEventListener('resize', again);
    return () => window.removeEventListener('resize', again);
  }, []);
  return box;
}

export function LessonGuide({ s }: { s: Session }) {
  useSession(s);
  const run = runningLesson(s);
  const step = run?.lesson.steps[run.step];
  const box = useTargetBox(step?.target ?? null);
  const bubble = useRef<HTMLDivElement>(null);
  if (!run || !step) return null;
  const view = { w: window.innerWidth, h: window.innerHeight };
  const h = bubble.current?.offsetHeight ?? 180;
  const at = box ? bubbleAt(box, h, view) : { x: (view.w - BUBBLE_W) / 2, y: view.h / 3 };
  const last = run.step === run.lesson.steps.length - 1;
  return (
    <>
      {box && (
        <div
          class="lesson-frame"
          data-testid="lesson-frame"
          style={{ left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` }}
        />
      )}
      <div
        ref={bubble}
        class="lesson-bubble panel"
        data-testid="lesson-bubble"
        style={{ left: `${at.x}px`, top: `${at.y}px`, width: `${BUBBLE_W}px` }}
      >
        <div class="content-head">
          <span class="muted">
            {run.lesson.title} · krok {run.step + 1} / {run.lesson.steps.length}
          </span>
          <IconButton icon="close" label="Ukončit lekci" testid="lesson-end" onClick={() => endLesson(s)} />
        </div>
        <strong class="lesson-title">{step.title}</strong>
        <p>{step.text}</p>
        <div class="dialog-actions">
          <button disabled={run.step === 0} onClick={() => goStep(s, run.step - 1)}>
            Zpět
          </button>
          <button class="active" data-testid="lesson-next" onClick={() => goStep(s, run.step + 1)}>
            {last ? 'Dokončit' : 'Další'}
          </button>
        </div>
      </div>
    </>
  );
}
