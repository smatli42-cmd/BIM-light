import { useEffect, useRef } from 'preact/hooks';

/** Prázdné plátno. Velikost se drží podle okna; kreslení přijde v kroku 3. */
export function DrawingCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return <canvas ref={ref} class="drawing" data-testid="drawing-canvas" />;
}
