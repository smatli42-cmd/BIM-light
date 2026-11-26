// Značky typu stěny v info boxu (plán stěn Z8): zapnout / vypnout značku u vybraných stěn, strana stěny,
// a u nástroje Výběr „Označit všechny stěny“ podlaží. Vše přes příkazy wallTag.* (stejně jako AI).
import { TAG_SIDES, type TagSide, type Wall } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';

const SIDE_LABELS: Readonly<Record<TagSide, string>> = {
  ref: 'u referenčního líce',
  opp: 'u protilehlého líce',
  on: 'na stěně',
};

/** Vybrané stěny: značka typu v půdorysu. */
export function WallTagSection({ s, walls }: { s: Session; walls: Wall[] }) {
  const ids = walls.map((w) => w.id);
  const tags = Object.values(s.model.wallTags).filter((t) => ids.includes(t.wallId));
  const all = tags.length === walls.length;
  const side = tags.every((t) => t.side === tags[0]?.side) ? (tags[0]?.side ?? '') : '';
  const toggle = (on: boolean) =>
    on
      ? s.run('wallTag.create', { wallIds: ids, viewId: s.viewId })
      : s.run('wallTag.delete', { wallIds: ids });
  return (
    <Section
      title="Popis"
      info="Značka typu (S1…) v kroužku; jde se stěnou, patří skupině anotací."
      testid="wall-tags"
    >
      <label class="check">
        <input
          type="checkbox"
          data-testid="wall-tag-on"
          checked={all}
          ref={(el) => {
            if (el) el.indeterminate = tags.length > 0 && !all;
          }}
          onChange={(e) => toggle(e.currentTarget.checked)}
        />
        Značka typu v půdorysu
      </label>
      {tags.length > 0 && (
        <label>
          Poloha značky
          <select
            data-testid="wall-tag-side"
            value={side}
            onChange={(e) => {
              for (const t of tags) s.run('wallTag.move', { tagId: t.id, side: e.currentTarget.value });
            }}
          >
            {!side && <option value="">různé</option>}
            {TAG_SIDES.map((k) => (
              <option key={k} value={k}>
                {SIDE_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      )}
    </Section>
  );
}

/** Nástroj Výběr bez výběru: označit všechny stěny podlaží aktivního okna. */
export function TagAllSection({ s }: { s: Session }) {
  return (
    <Section title="Popisy" info="Přidá značku typu všem stěnám podlaží, které ji ještě nemají.">
      <button data-testid="tag-all" onClick={() => s.run('wallTag.tagAll', { viewId: s.viewId })}>
        Označit všechny stěny
      </button>
    </Section>
  );
}
