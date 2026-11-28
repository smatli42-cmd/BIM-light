// Nástroj Popis skladby (Revit Multi-layer tag, Archicad Composite label): popis patří řezu, vkládá se
// v okně řezu (ui/section/section-tag-input.ts). V půdorysu nástroj jen radí, kde ho použít.
import type { Overlay, Tool, TrackerField } from '../types.ts';

export class CompositionTagTool implements Tool {
  readonly id = 'compositionTag';

  hint(): string {
    return 'Popis skladby se vkládá v okně řezu: klik na řezanou stěnu, desku nebo střechu, další kliky = lomy čáry, Enter = popiska.';
  }

  move() {}
  down() {}
  up() {}

  key(): boolean {
    return false;
  }

  escape(): boolean {
    return false;
  }

  overlay(): Overlay {
    return {};
  }

  tracker(): readonly TrackerField[] | null {
    return null;
  }
}
