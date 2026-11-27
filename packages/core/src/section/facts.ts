// Fakta anotací řezu pro funkci grafiky: výškové kóty a úrovně (kategorie kót), značka řezu (značky).
import type { Id } from '../ids/index.ts';
import type { Category } from '../model/categories.ts';
import type { ElementFacts } from '../style/conditions.ts';

export const annotationFacts = (id: Id, category: Category): ElementFacts => ({
  id,
  category,
  discipline: '',
  status: '',
  variant: 'main',
  typeId: '',
  materialIds: [],
});
