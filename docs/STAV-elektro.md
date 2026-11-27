# BIM-light – stav: Elektro

Popis prvků, značek, skupin a výšek je v `docs/katalog-elektro.md`. Zadání: koncepce 3 a 4.

## Hotovo

### Elektro, krok 1: knihovna typů a půdorysné značky, 2026-11-27 (pokyn uživatele; scéna `?ukazka=elektro`, elektro i v `?ukazka=dum`)

- Jádro `packages/core/src/electro/`: typ a instance (základy 1, 2), 6 skupin legendy s barvou, knihovna
  44 typů po souborech (přístroje, zařízení, svítidla, rozvaděče) se stálými id `et-<klíč>`, značky jako
  data (znaky + sloty, vlastní tvary, liniové svítidlo, rozvaděč ve skutečné velikosti).
- Hostitel: líc stěny (poloha po referenční čáře + strana) nebo bod na stropě. Prvek jde se stěnou
  (`follow.ts`: posun, tloušťka, prodloužení, rozdělení), zaniká se stěnou (průřezová pravidla, řádek
  `electro`). Místnost se počítá z polohy (`room.ts`).
- Kresba (`draw*.ts`, `symbol.ts`): velikost 4 mm na papíře, kolmo k líci, odsazení s odkazovou čarou,
  popisek označení a výšky (výška jen při odlišné výšce od typu), tři podrobnosti, barva skupiny jako
  výchozí grafika (patro 1), sloty rámečku po skupinách.
- Sada Elektro (`display.ts`): vrstva Elektro (ve Studii a Projektu skrytá), skupina anotací elektro,
  pravidlo „Elektro – stavba šedě“, kombinace „Elektro – podklad šedě“, styl Elektro 1:50; v přepínači
  sad nahoře přibylo **Elektro**.
- Příkazy `electro.create / update / move / delete`, `electroType.create / duplicate / update / delete`;
  dotazy `electro.list`, `electroType.list`. Migrace 36 → 37 (skupiny, knihovna, prvky, sada Elektro).
- Testy: `electro/library.test.ts`, `draw.test.ts`, `follow.test.ts`, `commands/electro/electro.test.ts`,
  AI `ai/scenario-electro.test.ts`, ukázky `samples/electro-samples.test.ts`, e2e `elektro.spec.ts`.

### Značky podle legendy uživatele, 2026-11-27 (pokyn uživatele; scéna `?ukazka=elektro`, tabulka vlevo)

- Zdroj pravdy tvarů je legenda uživatele (Corel SVG, mimo repo). Všech 29 znaků opsáno ze souřadnic SVG
  (`electro/glyphs-wall.ts`, `glyphs-center.ts`, převod `legend.ts`: 400 jednotek legendy = značka 4 mm),
  rozvaděč hlavní a datový, liniové svítidlo a LED pásek podle legendy. Kresba dál přes funkci grafiky.
- Nová 7. skupina **Stínění** (zelená, ovladač stínění), ventilátor do Silnoproudu, barvy skupin
  z legendy, výšky a popisy typů z legendy (`legend-order.ts`). Knihovna verze 2, migrace 37 → 38.
- Ukázka `?ukazka=elektro`: tabulka typů v pořadí a skupinách legendy (rozvaděč a liniové svítidlo v
  rozměru legendy), typy mimo legendu ve druhém sloupci. Porovnáno s vyrenderovaným SVG vedle sebe
  (Edge headless + snímek plátna ve stejném měřítku 20 px/mm): tvary a poměry sedí.
- Popisek volně umístěné značky je nově svisle na středu značky a vpravo od její obálky.
- Testy `electro/legend.test.ts` („legenda uživatele: …“: rozměry a druhy primitiv každé značky, kotva,
  popisy), `migrate-v37.test.ts`.

## Rozhodl Code (k potvrzení)

1. **Kategorie `electrical` a jedna vrstva Elektro** pro všechny elektro prvky (skupiny se rozliší
   barvou a pravidly s vlastností `electroGroup`, ne vrstvami).
2. **Skupiny, pořadí a barvy podle legendy uživatele**: v legendě mají stejnou barvu data a zabezpečení
   (tyrkys `#21b8cf`) a silnoproud a řízení (červená `#f03d3d`) – převzato beze změny; rozlišení jen
   skupinou v legendě. Potvrdit, nebo dát skupinám odlišné odstíny.
3. **Výchozí výšky** podle legendy uživatele (katalog, část 4); typy mimo legendu: dvojzásuvka a ostatní
   zásuvky 300, nad linkou 1150, PIR 2200, nástěnné svítidlo 2000, rozvaděč podružný a elektroměrový 1400.
4. **Hlásiče, Wi-Fi AP, stropní kamera a stropní svítidla bez výšky** („na stropě“); popisek výšky
   se u nich ukáže jen při zadané výšce (závěsné svítidlo).
5. **Smazání stěny smaže elektro prvky na ní** (Revit u hostovaných prvků); rozdělení / sloučení je
   přenese na novou stěnu.
6. **Odsazení značky v mm na papíře**, kladné po směru referenční čáry stěny (na obou stranách stejně).
7. **Rozložení rámečku „pod sebou“** se ukládá, v půdorysu se sloty kreslí vždy po líci.
8. **Ve Studii i Projektu je elektro skryté** (vrstva Elektro vypnutá); v Elektru jsou skryté kóty.
9. **Popisek výšky v mm** („+1150“) vůči čisté podlaze, vodorovně, před značkou do místnosti.
10. **Typy mimo legendu** jsou složené ze znaků legendy (dvojzásuvka = dvě zásuvky…); PIR jako krabička
   MK s textem „PIR“, svítidlo nástěnné = přisazené na držáku – potvrdit, nebo doplnit do legendy.

## Další krok

1. **Probrat s uživatelem** (screenshoty Arditu): nástroj pro vkládání (paleta typů, klik na stěnu / strop,
   info box Osazení / Rámeček / Značka v půdorysu / Rozvaděč), výběr a úchopy elektro prvků v půdorysu,
   Del, kopírování.
2. **Vazby vypínač → svítidla** (čárkovaný oblouk, svítidla převezmou označení) a **okruhy** (sloty →
   okruh, lomená čára k rozvaděči, „Nástroj Okruh“), rozvaděč jako nástroj.
3. **Legenda značek elektro** podle screenshotu Arditu (katalog, část 7): tabulka Značka | Popis | Výška |
   Ks po skupinách v barvě skupiny, výšky výskytů typu sloučené lomítkem („300 / 1050 / 1150“), stropní
   „strop“, po podlažích – jako nový zdroj výkazu (základ 8). Pak kontroly (svítidlo bez vypínače, prvek
   bez obvodu).
4. Elektro ve 3D a v řezu (krabičky v líci stěny), export IFC (třídy už jsou v typech).

## Otevřené

- Okno Ardit „Zobrazení“ u prvku (zobrazit na podlažích, pero a výplň řezu / pohledu) – zatím jen přes
  pravidla a přepisy prvku; ověřit s uživatelem, zda stačí.
