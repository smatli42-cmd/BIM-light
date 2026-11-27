// D – info box vlevo (koncepce rozhraní, část 2): nastavení aktivního nástroje, nebo vlastnosti
// vybraných prvků, po sekcích (krok UI2).
import type { Session } from '../../session/session.ts';
import { InfoContent } from '../infobox/InfoContent.tsx';
import { useSession } from '../use-session.ts';
import { toolLabel } from './tool-defs.ts';

function heading(s: Session): { title: string; sub: string } {
  const { walls, openings, dims, rooms, sections, levelDims } = s.selection;
  const n = walls.length + openings.length + dims.length + rooms.length + sections.length + levelDims.length;
  if (!n && s.tool.id !== 'select') return { title: toolLabel(s), sub: 'Výchozí nastavení nových prvků' };
  if (!n) return { title: toolLabel(s), sub: 'nic nevybráno' };
  if (n === walls.length) return { title: n > 1 ? 'Stěny' : 'Stěna', sub: `Označené: ${n}` };
  if (n === openings.length) return { title: n > 1 ? 'Otvory' : 'Otvor', sub: `vybráno: ${n}` };
  if (n === rooms.length) return { title: n > 1 ? 'Místnosti' : 'Místnost', sub: `vybráno: ${n}` };
  if (n === sections.length) return { title: n > 1 ? 'Řezy' : 'Řez', sub: `vybráno: ${n}` };
  if (n === levelDims.length) return { title: n > 1 ? 'Výškové kóty' : 'Výšková kóta', sub: `vybráno: ${n}` };
  if (n === dims.length) return { title: n > 1 ? 'Kóty' : 'Kóta', sub: `vybráno: ${n}` };
  return { title: 'Výběr', sub: `vybráno: ${n}` };
}

export function InfoBox({ s }: { s: Session }) {
  useSession(s);
  const h = heading(s);
  return (
    <aside class="infobox panel" data-testid="infobox">
      <div class="infobox-head">
        <strong data-testid="infobox-title">{h.title}</strong>
        <span class="muted">{h.sub}</span>
      </div>
      <InfoContent s={s} />
    </aside>
  );
}
