// Skupiny tlačítek nástrojů s ikonou (paleta C i lišta příkazů B).
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { describeTool, type ToolDef } from './tool-defs.ts';

export function ToolGroups({ s, groups }: { s: Session; groups: readonly (readonly ToolDef[])[] }) {
  return (
    <>
      {groups.map((g, i) => (
        <div class="tool-group" key={i}>
          {g.map((d) => {
            const info = describeTool(s, d);
            return (
              <IconButton
                key={d.tool}
                icon={d.icon}
                label={info.label}
                shortcut={info.key}
                description={info.description}
                testid={`tool-${d.tool}`}
                pressed={s.tool.id === d.tool}
                onClick={() => s.setTool(d.tool)}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}
