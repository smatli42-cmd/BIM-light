// Skupiny tlačítek nástrojů s ikonou (paleta C i lišta příkazů B).
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { WallTypePick } from './QuickPick.tsx';
import { describeTool, type ToolDef } from './tool-defs.ts';

export function ToolGroups({ s, groups }: { s: Session; groups: readonly (readonly ToolDef[])[] }) {
  return (
    <>
      {groups.map((g, i) => (
        <div class="tool-group" key={i}>
          {g.map((d) => {
            const info = describeTool(s, d);
            const button = (
              <IconButton
                key={d.tool}
                icon={d.icon}
                label={info.label}
                shortcut={info.key}
                description={info.description}
                testid={`tool-${d.tool}`}
                pressed={s.tool.id === d.tool || !!d.also?.includes(s.tool.id)}
                onClick={() => s.setTool(d.tool)}
              />
            );
            return d.tool === 'wall' ? (
              <WallTypePick key={d.tool} s={s}>
                {button}
              </WallTypePick>
            ) : (
              button
            );
          })}
        </div>
      ))}
    </>
  );
}
