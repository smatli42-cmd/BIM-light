// Plovoucí nabídka druhu úseku řetězu stěn (koncepce rozhraní, část 2 I): po prvním kliku u bodu řetězu
// úsečka / tečný oblouk / oblouk bodem; bublina řekne, co se nakreslí. Klávesa M přepíná.
import { WallTool } from '../interaction/tools/wall-tool.ts';
import { SEGMENTS } from '../interaction/tools/wall-segment.ts';
import type { Session } from '../session/session.ts';
import { IconButton } from './icons/Icon.tsx';

export function SegmentMenu({ s }: { s: Session }) {
  const tool = s.tool;
  const m = tool instanceof WallTool ? tool.segmentMenu() : null;
  if (!m || !(tool instanceof WallTool)) return null;
  const at = s.viewport.toScreen(m.at);
  return (
    <div
      class="segment-menu"
      data-testid="segment-menu"
      style={{ left: `${at.x - 56}px`, top: `${at.y - 52}px` }}
    >
      {SEGMENTS.map((g) => (
        <IconButton
          key={g.id}
          icon={g.icon}
          label={g.help}
          shortcut="M"
          testid={`seg-${g.id}`}
          pressed={m.seg === g.id}
          disabled={g.id === 'tangent' && !m.tangentOk}
          onClick={() => tool.setSegment(g.id)}
        />
      ))}
    </div>
  );
}
