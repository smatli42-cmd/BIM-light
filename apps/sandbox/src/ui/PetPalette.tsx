// Paleta u uzlu / hrany vybrané stěny (koncepce rozhraní, část 2 I): dvě řady ikon nad kotvou.
// Obsah skládá nástroj Výběr (interaction/tools/select/pet.ts); tady se jen vykreslí.
import type { Session } from '../session/session.ts';
import { IconButton } from './icons/Icon.tsx';
import { useKeepInside } from './keep-inside.ts';

export function PetPalette({ s }: { s: Session }) {
  const pet = s.pet;
  const at = pet ? s.viewport.toScreen(pet.at) : null;
  // Nad uzlem vpravo; u pravého okraje okna vlevo od něj.
  const ref = useKeepInside<HTMLDivElement>(at && { x: at.x, y: Math.max(0, at.y - 96) }, { x: 14, y: 0 });
  if (!pet || !at) return null;
  return (
    <div
      ref={ref}
      class="pet"
      data-testid="pet"
      style={{ left: `${at.x + 14}px`, top: `${at.y - 96}px` }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {pet.rows.map((row, i) => (
        <div key={i} class="pet-row">
          {row.map((it) => (
            <IconButton
              key={it.label}
              icon={it.icon}
              label={it.label}
              testid={`pet-${it.icon}`}
              pressed={it.active ?? false}
              onClick={() => it.action()}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
