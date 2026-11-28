// Info box popisu skladby (česká výkresová praxe, Revit Multi-layer tag): nastavení popisky = co obsahuje
// (kolečko s číslem konstrukce, název typu, tloušťky, číslování), pořadí vrstev, strana a zarovnání řádků. Nástroj =
// výchozí nastavení nového popisu; vybraný popis = řádky spočítané z typu, nastavení, zámek, smazání.
import {
  tagLayout,
  type CompositionTag,
  type CompositionTagAlign,
  type CompositionTagOptions,
  type CompositionTagSide,
} from '@bim-light/core';
import { setTagDefaults, tagDefaults } from '../../session/tag-defaults.ts';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';

type Flag = Exclude<keyof CompositionTagOptions, 'side' | 'align'>;
const OPTIONS: readonly [Flag, string][] = [
  ['mark', 'Číslo konstrukce v kolečku'],
  ['title', 'Název typu a celková tloušťka'],
  ['thickness', 'Tloušťky vrstev'],
  ['numbered', 'Číslovat vrstvy'],
  ['reverse', 'Obrácené pořadí (deska zdola, stěna od druhé strany)'],
];

function Options(p: {
  prefix: string;
  value: CompositionTagOptions;
  onSet: (patch: Partial<CompositionTagOptions>) => void;
}) {
  return (
    <>
      {OPTIONS.map(([key, label]) => (
        <label class="check" key={key}>
          <input
            type="checkbox"
            data-testid={`${p.prefix}-${key}`}
            checked={p.value[key]}
            onChange={(e) => p.onSet({ [key]: e.currentTarget.checked })}
          />
          {label}
        </label>
      ))}
      <label>
        Řádky od svislé čáry
        <select
          data-testid={`${p.prefix}-side`}
          value={p.value.side}
          onChange={(e) => p.onSet({ side: e.currentTarget.value as CompositionTagSide })}
        >
          <option value="right">vpravo</option>
          <option value="left">vlevo</option>
        </select>
      </label>
      <label>
        Zarovnání textu
        <select
          data-testid={`${p.prefix}-align`}
          value={p.value.align}
          onChange={(e) => p.onSet({ align: e.currentTarget.value as CompositionTagAlign })}
        >
          <option value="left">vlevo</option>
          <option value="center">na střed</option>
          <option value="right">vpravo</option>
        </select>
      </label>
    </>
  );
}

/** Nástroj Popis skladby: výchozí obsah nového popisu. */
export function NewCompositionTagInfo({ s }: { s: Session }) {
  return (
    <Section
      title="Popis skladby"
      info="Text se počítá z typu prvku (skladby) – po změně skladby se hned přepíše. Deska shora dolů, stěna od referenční strany."
    >
      <p class="muted">
        V okně řezu: klik na řezanou stěnu, desku nebo střechu, další kliky = lomy odkazové čáry (první úsek
        vždy kolmo ke konstrukci, Shift = volně). Dvojklik, Enter nebo pravé tlačítko = kolečko s číslem a
        vrstvy.
      </p>
      <Options prefix="tag-default" value={tagDefaults(s)} onSet={(patch) => setTagDefaults(s, patch)} />
    </Section>
  );
}

function One({ s, t }: { s: Session; t: CompositionTag }) {
  const upd = (patch: Record<string, unknown>) => s.run('compositionTag.update', { tagId: t.id, ...patch });
  const sec = s.model.sections[t.sectionId];
  const l = sec ? tagLayout(s.model, sec, t) : null;
  const el = s.model.elements[t.elementId];
  return (
    <Section title="Popis skladby" info="Anotace řezu: text z typu prvku, uložená je jen poloha a volby.">
      <div class="ib-row">
        <span class="muted">Popisuje</span>
        <span>{el?.category === 'slab' ? 'deska' : 'stěna'}</span>
      </div>
      <pre class="muted" data-testid="tag-lines">
        {l
          ? [...(l.mark !== null ? [`(${l.mark})`] : []), ...l.lines].join('\n')
          : 'prvek už rovina řezu neprotíná'}
      </pre>
      <Options prefix="tag" value={t} onSet={upd} />
      <label class="check">
        <input
          type="checkbox"
          data-testid="tag-locked"
          checked={t.locked}
          onChange={(e) => upd({ locked: e.currentTarget.checked })}
        />
        Zamknout
      </label>
    </Section>
  );
}

/** Vybrané popisy skladby: jeden = úpravy, vždy smazání. */
export function SelectedCompositionTagsInfo({ s }: { s: Session }) {
  const tags = s.selection.levelDims.flatMap((id) => {
    const t = s.model.compositionTags[id];
    return t ? [t] : [];
  });
  if (!tags.length) return null;
  const only = tags.length === 1 ? tags[0] : undefined;
  return (
    <>
      {only && <One key={only.id} s={s} t={only} />}
      <section>
        <button
          data-testid="tag-delete"
          onClick={() => s.run('selection.delete', { levelDimIds: tags.map((t) => t.id) })}
        >
          Smazat popis <kbd>Del</kbd>
        </button>
      </section>
    </>
  );
}
