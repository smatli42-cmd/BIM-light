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

## Rozhodl Code (k potvrzení)

1. **Kategorie `electrical` a jedna vrstva Elektro** pro všechny elektro prvky (skupiny se rozliší
   barvou a pravidly s vlastností `electroGroup`, ne vrstvami).
2. **Barvy skupin** (tabulka v katalogu, část 3) podle vzoru Arditu; hnědá pro „Řízení“ a zelená pro
   „Zabezpečení“ jsou vlastní volba.
3. **Výchozí výšky** typů, které norma ani Ardit neurčují: vývod 1f 1200, vývod 3f 600, videotelefon
   1500, termostat 1500, wallbox 1200, ventilátor 2200, kamera nástěnná 2500, PIR 2200, MK 2000, siréna
   2500, klávesnice 1500, ústředna 1500, zvonek 2200, nástěnné svítidlo 2000, venkovní 2200.
4. **Hlásiče, Wi-Fi AP, stropní kamera a stropní svítidla bez výšky** („na stropě“); popisek výšky
   se u nich ukáže jen při zadané výšce (závěsné svítidlo).
5. **Smazání stěny smaže elektro prvky na ní** (Revit u hostovaných prvků); rozdělení / sloučení je
   přenese na novou stěnu.
6. **Odsazení značky v mm na papíře**, kladné po směru referenční čáry stěny (na obou stranách stejně).
7. **Rozložení rámečku „pod sebou“** se ukládá, v půdorysu se sloty kreslí vždy po líci.
8. **Ve Studii i Projektu je elektro skryté** (vrstva Elektro vypnutá); v Elektru jsou skryté kóty.
9. **Popisek výšky v mm** („+1150“) vůči čisté podlaze, vodorovně, před značkou do místnosti.

## Další krok

1. **Probrat s uživatelem** (screenshoty Arditu): nástroj pro vkládání (paleta typů, klik na stěnu / strop,
   info box Osazení / Rámeček / Značka v půdorysu / Rozvaděč), výběr a úchopy elektro prvků v půdorysu,
   Del, kopírování.
2. **Vazby vypínač → svítidla** (čárkovaný oblouk, svítidla převezmou označení) a **okruhy** (sloty →
   okruh, lomená čára k rozvaděči, „Nástroj Okruh“), rozvaděč jako nástroj.
3. **Legenda a tabulka elektro** (výkazy: symbol, popis, výška, počet po skupinách) a kontroly (svítidlo
   bez vypínače, prvek bez obvodu).
4. Elektro ve 3D a v řezu (krabičky v líci stěny), export IFC (třídy už jsou v typech).

## Otevřené

- Okno Ardit „Zobrazení“ u prvku (zobrazit na podlažích, pero a výplň řezu / pohledu) – zatím jen přes
  pravidla a přepisy prvku; ověřit s uživatelem, zda stačí.
