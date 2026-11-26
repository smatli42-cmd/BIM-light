// Obsah průvodních lekcí. Lekce popisují jen to, co program už umí; další přibudou s etapami.
import { allWalls } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import type { Lesson, PlannedLesson } from './types.ts';

const selectFirstWall = (s: Session) => {
  const w = allWalls(s.model).find((x) => x.storeyId === s.storeyId);
  if (w) s.selection.set([w.id]);
};

export const ENVIRONMENT: Lesson = {
  id: 'environment',
  title: 'Prostředí aplikace',
  description: 'Kde co je: lišty, nástroje, info box, okna a pravý panel.',
  practice: false,
  steps: [
    {
      target: '[data-testid=appbar]',
      title: 'Horní lišta',
      text: 'Název projektu, sady zobrazení Studie / Projekt (jak výkres vypadá), Zpět / Znovu, export IFC a přepnutí světlého a tmavého motivu.',
    },
    {
      target: '.commandbar',
      title: 'Lišta příkazů',
      text: 'Úpravy vybraných prvků: přesunout, kopírovat, otočit, zrcadlit, pole, změnit velikost (Ctrl+K), zarovnat, do rohu, rozdělit. Lupa vlevo = Najít a vybrat prvky podle vlastností.',
    },
    {
      target: '.palette',
      title: 'Paleta nástrojů',
      text: 'Výběr, Stěna, Otvor, Kóta a Úhel (stěnu z čáry najdeš v metodách Stěny). Bublina nad ikonou ukáže zkratku (W = stěna, D = kóta…). Dvojklik na Stěnu nabídne typy stěn.',
    },
    {
      target: '[data-testid=infobox]',
      title: 'Info box',
      text: 'Nastavení aktivního nástroje (typ nové stěny, metoda, referenční čára), nebo vlastnosti vybraných prvků po sekcích. Šířku změníš tažením pravého okraje.',
    },
    {
      target: '[data-testid=window]',
      title: 'Okno pohledu',
      text: 'Tady se kreslí. Kolečko přibližuje, prostřední tlačítko posouvá. V záhlaví vybereš pohled a měřítko. Když podržíš myš nad prvkem, ukáže se karta s jeho údaji.',
    },
    {
      target: '[data-testid=bottombar]',
      title: 'Spodní lišta',
      text: 'Zobrazení okna: přiblížení, jedno / dvě okna, trasování jiného podlaží, přichytávání a krok, vrstvy, tloušťky čar, karty prvků, pera, grafické přepisy, šrafy, rovina řezu a skupina kót.',
    },
    {
      target: '[data-testid=panel]',
      title: 'Pravý panel',
      text: 'Obsah projektu: podlaží a jejich pracovní okna, uložené pohledy a jejich nastavení. Šířku změníš tažením levého okraje, křížkem panel schováš.',
    },
    {
      target: '.sections',
      title: 'Sekce panelu',
      text: 'Přepíná obsah pravého panelu: Obsah, Vrstvy, Typy stěn, Materiály a Šrafy. Klik na ikonu schovaný panel znovu otevře.',
    },
  ],
};

export const EDITING: Lesson = {
  id: 'editing',
  title: 'Výběr a úpravy',
  description: 'Výběr, karta prvku, paleta u uzlu, posun a kopie, Zpět (cvičný projekt).',
  practice: true,
  steps: [
    {
      target: '[data-testid=window]',
      title: 'Výběr',
      text: 'Klikni na stěnu – vybere se. Shift přidá další, tažení z prázdného místa vybere rámečkem, Esc výběr zruší. Když chvíli podržíš myš nad stěnou, ukáže se karta s délkou a plochou.',
    },
    {
      target: '[data-testid=infobox]',
      title: 'Vlastnosti výběru',
      text: 'Info box ukazuje vlastnosti vybrané stěny: typ, referenční čáru, výšku a zobrazení. Přepínač Instance / Typ ukáže skladbu typu.',
      setup: selectFirstWall,
    },
    {
      target: '[data-testid=window]',
      title: 'Paleta u uzlu a hrany',
      text: 'Klikni na koncový bod vybrané stěny: rozběhne se posun uzlu a ukáže se paleta (odpojit roh, smazat uzel; dole přesunout, kopírovat, otočit, zrcadlit, pole). Klik na líc stěny nabídne odsazení, přidání bodu a zakřivení.',
      setup: selectFirstWall,
    },
    {
      target: '.commandbar',
      title: 'Úpravy a Zpět',
      text: 'Přesunout (M), Kopírovat (K), Otočit (R), Zrcadlit (F), Pole (P), Změnit velikost (Ctrl+K). Každou změnu vrátí Zpět (Ctrl+Z). Po ukončení lekce se vrátí tvůj projekt.',
    },
  ],
};

export const LESSONS: readonly Lesson[] = [ENVIRONMENT, EDITING];

export const PLANNED: readonly PlannedLesson[] = [
  {
    title: 'Stěny, okna a dveře',
    description: 'Obvod domu, otvory a pohled do 3D.',
    when: 's okny a dveřmi (etapa 4)',
  },
  {
    title: 'Desky, místnosti a střecha',
    description: 'Deska, místnost a střecha.',
    when: 's deskami a místnostmi',
  },
  {
    title: 'Kóty, řez a export',
    description: 'Kóta, řez, výkres a export do PDF.',
    when: 's řezy a výkresy (etapa 7)',
  },
  {
    title: 'Ovládání agentem',
    description: 'Claude kreslí a upravuje model za tebe.',
    when: 's připojením AI (etapa 6)',
  },
];
