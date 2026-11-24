// Panel Knihovna šraf: mřížka náhledů všech 40 šraf v pořadí z arditu, přepínač barvy náhledu.
// Slouží k porovnání vzhledu s arditem (vzhled je návrh podle názvu).
import { HATCH_LIBRARY, mixColor } from '@bim-light/core';
import { useState } from 'preact/hooks';
import { HatchSwatch } from './HatchSwatch.tsx';

export function HatchLibrary() {
  const [color, setColor] = useState('#000000');
  const fill = color === '#000000' ? '#ffffff' : mixColor(color, 255, 0.65);
  return (
    <section data-testid="hatch-library">
      <h2>Knihovna šraf · {HATCH_LIBRARY.length}</h2>
      <label>
        Barva náhledu
        <input type="color" value={color} onInput={(e) => setColor(e.currentTarget.value)} />
      </label>
      <div class="hatch-grid">
        {HATCH_LIBRARY.map((h) => (
          <figure key={h.id} data-testid="hatch-item" title={h.variantOf ? `varianta: ${h.variantOf}` : h.id}>
            <HatchSwatch hatch={h} lines={color} fill={fill} />
            <figcaption>
              {h.order}. {h.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
