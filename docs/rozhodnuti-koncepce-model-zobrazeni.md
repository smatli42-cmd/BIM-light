# BIM-light – rozhodnutí: sekce 0–6

Část katalogu rozhodnutí (rozděleno 2026-11-24 podle základu 33). Základy 1–33 a rejstřík jsou v `rozhodnuti-bim-light.md`. Číslování sekcí se nemění, odkazy typu „viz 4“ nebo „sekce 16“ platí.
Značení: **[R]** = rozhodl uživatel, **(já)** = Claude podle Revitu/Archicadu, platí, dokud uživatel nesouhlasí jinak.

## 0. Základní koncepce

- **[R] Vlastní model „ve tvaru IFC“** (místo čistě nativního IFC). Struktura, třídy, strom podlaží, typ/instance, vztahy (otvor–stěna, místnost–stěny), Psety a GlobalId podle IFC 4.3. Data ve vlastním JSON, export do IFC je překlad.
- **[R] Funkce navíc mimo IFC** (sady zobrazení Studie/Projekt/Elektro, zámky vazeb a kót, styly čar, hladiny DXF, šrafy, varianty, přepisy grafiky) mají vlastní místo v modelu. Do IFC se případně ukládají jako vlastní vlastnosti.
- **[R] Hlavní výhoda: napojení na AI.** AI vytváří prvky a části projektu na prompt.
  - Každá operace je pojmenovaný příkaz s parametry v JSON (store/actions). UI i AI (přes MCP) volají stejné příkazy. AI nemá vlastní cestu do dat. (já)
  - Pojmy podle IFC pomáhají i AI, protože je zná. (já)
- **[R] Postup: nejdřív 2D, pak 3D.** Prvky jsou od začátku 3D (stěna má osu, tloušťku, výšku, odsazení od podlaží, okno má rozměry, parapet a 3D tvar). Zpočátku se zobrazuje jen půdorys. 3D pohled se doplní později bez změny dat.
  - Půdorys se generuje z modelu, nekreslí se zvlášť. Okna a dveře mají 3D tělo i 2D symbol (otvírání), jako dvě reprezentace v IFC (Plan + Body). (já)
  - Volné 2D čáry, šrafy a texty existují jako anotace (kategorie „kresba“). Stěny a otvory jsou vždy BIM prvky, nikdy jen čáry. (já)

## 1. Datový model

- Prvek má: kategorii, profesi, typ + instanci, podlaží, stav, variantu. (já)
- Kategorie: pevný seznam blízký IFC (stěna, otvor, místnost, podlaha, střecha, prvek krovu/trám, sloup, lehký obvodový plášť, schodiště, zábradlí, úprava povrchu, terén, výkop/násyp, zařizovací předmět, symbol). (já)
- Profese: výchozí seznam (architektura, elektro, ZTI…), uživatel může doplnit. (já)
- Typ drží skladbu, tloušťku, materiály. Instance drží polohu, výšku, odsazení, podlaží, stav. Změna typu přepíše všechny instance. (já)
- **[R] Stav (fáze): tři pevné stavy – stávající / bourání / nový** (podle Archicadu, ne vlastní pojmenované fáze). Mapuje se na IFC vlastnost Status. Filtry zobrazení podle stavu (viz 6).
- Hladiny v DXF se odvozují z profese + kategorie + stavu, názvy přejmenovatelné v jedné tabulce. (já)
- **[R] Import ze zaměřování: typy stěn se vytvářejí automaticky podle tloušťky** (stejné tloušťky se slučují). Skladbu uživatel doplní později u typu.

## 2. Okna a dveře

- **[R] Žádný editor rodin. Konfigurátor + vlastní výplně.**
  - Generátor v kódu (okno, dveře) řeší otvor ve stěně, rám/zárubeň, osazení v tloušťce stěny, ostění, parapety, šambrány a půdorysnou značku.
  - Okno jako mřížka polí: každé pole pevné / otvíravé / sklopné / OS, levé/pravé; rám, příčle.
  - Typ = uložená sada parametrů (O1, O2, D1…), instance = poloha, parapet, stav. Z typů vzniká výpis oken a dveří.
  - Výplň (křídlo) může být libovolné 3D těleso: import ze souboru (OBJ/GLB z Maxu/Blenderu, i organické tvary) nebo AI skript pro pravidelnou geometrii (např. kazetové dveře), uložený jako nový typ výplně. Důvod: rekonstrukce, zachování původního tvaru dveří ve 3D.
  - Když se výplň nemodeluje, použije se obecná a do vizualizace se nahradí v 3ds Max.
- **[R] Půdorysná značka = funkce, ne uložená kresba.** Počítá se při každé změně ze stěny (tloušťka, líce), typu (šířka, zárubeň, otvírání, osazení) a nastavení pohledu. Geometrie je vztažená ke stěně (ostění = od líce k zárubni), takže se při změně tloušťky stěny přepočítá sama.
  - Podrobnost podle sady zobrazení (viz 4). (já)
  - Rovina řezu (výchozí 1 m nad podlahou): otvory nad ní čárkovaně, jedno pravidlo pro všechny otvory. (já)
  - České zvyklosti v generátoru: kóta šířka/výška + parapet, symbol otvírání podle ČSN, rozměr stavebního otvoru i rámu. (já)

## 3. Elektro (vzor: ardit.designer)

- **[R] Rozsah: značky + vazby + legenda/tabulka.** Rozmístění prvků, vazby vypínač–svítidla, obvody k rozvaděči, živá tabulka. Bez výpočtů (jističe, příkony, schéma rozvaděče).
- **[R] Knihovna: vestavěná základní sada podle ČSN EN 60617 + vlastní značky** (lze doplnit i přes AI).
- Značka je BIM prvek s typem a instancí. Typ: symbol, popis, výchozí výška, skupina legendy (silnoproud, osvětlení a ovládání, data, AV, zabezpečení, řízení), třída IFC (IfcOutlet, IfcSwitchingDevice, IfcLightFixture, IfcElectricDistributionBoard…). Instance: poloha, výška nad podlahou, místnost (automaticky), označení (S2a, Z2…). (já)
- Hostitel: vypínače a zásuvky se přichytí na líc stěny, otočené kolmo, a pohybují se se stěnou. Svítidla a hlásiče patří k místnosti nebo stropu. Popisek výšky (+1150) se zobrazí, jen když se liší od výchozí výšky typu. (já)
- Vazby se kreslí interaktivně ve výkresu: vybrat vypínač → klikat na svítidla. Vznikne vazba „ovládá“ (čárkovaný oblouk, který se při posunu prvků přepočítá), svítidla převezmou označení. Stejně prvek → obvod → rozvaděč. (já)
- Legenda a tabulka (symbol, popis, výška, počet kusů po skupinách) se počítají z modelu stejným mechanismem jako výkazy (okna, místnosti). (já)
- Kontroly: svítidlo bez vypínače, vypínač nic neovládá, prvek bez obvodu. AI rozmisťuje a propojuje na prompt stejnými příkazy. (já)

## 4. Zobrazení – sady (Studie / Projekt / Elektro)

**Upřesněno 2026-11-24 v `katalog-pohledy-styly-zobrazeni.md` (základy 26–32): pohled má styl, styl = kombinace vrstev + podrobnost + kombinace přepisů + popisky + měřítko, kóty patří podlaží a mají skupinu anotací, pravidla a kombinace přepisů, pera. Při rozporu s textem níže platí katalog pohledů a stylů.**

- **[R] Viditelnost odvozeně, bez ručních hladin.** Co je vidět, se řídí kategorií + profesí + stavem prvku (jako Revit). DXF hladiny vznikají ze stejných vlastností.
- **[R] Pohled si může sadu lokálně upravit, s označením.** Změna je viditelná a jde vrátit k sadě.
- Sada zobrazení má 5 částí, přepíná se jedním kliknutím, ukládá se v projektu: (já)
  1. Co je vidět (kategorie, profese, stav).
  2. Podrobnost: hrubá / střední / jemná. Každý generátor (stěna, okno, dveře, značky) umí kreslit všechny tři.
     - Studie (hrubá): stěna obrys + jedna výplň bez vrstev, okno jen otvor + čára, bez popisů výšek.
     - Projekt (střední): vrstvy skladby a šrafy, zárubně, oblouky otvírání, čísla a plochy místností.
     - Jemná (1:50): profily rámů, parapety, ostění, detailní šrafy.
  3. Grafika: tloušťka a typ čar, barvy, výplně podle kategorie + pravidla (přepisy), např. bourání žlutě čárkovaně, nové červeně, v Elektru architektura šedě a elektro barevně.
  4. Popisky: co se popisuje (čísla místností, plochy, výšky elektro, kóty oken).
  5. Měřítko: tloušťky čar se přizpůsobí měřítku.
- Pohled = co a kde (podlaží, výřez, měřítko). Sada = jak to vypadá. (já)

### Přepisy grafiky – pevné pořadí (důvod: v Revitu se grafika fáze a ruční přepis přebíjely a stěnu nešlo samostatně přepsat)
- Patra, vyšší vždy vyhrává: (já)
  1. Materiál a kategorie (výchozí šrafa, čára, barva).
  2. Sada zobrazení.
  3. Pravidla (stav/fáze, profese, varianta).
  4. Úprava pohledu oproti sadě.
  5. Přepis prvku „ve všech pohledech“ (uložený na prvku).
  6. Přepis prvku „jen v tomto pohledu“.
- **[R] Přepis zobrazení konkrétního prvku (např. příčky): typ a barva čáry, šrafa, výplň, průhlednost. Přepínač platnosti: jen tento pohled (výchozí) / všude.**
- Přepis prvku vždy vyhraje nad fází i sadou, bez výjimek. (já)
- Přepsaný prvek má v pohledu malou značku. Po výběru panel ukáže „proč to vypadá takhle“ (které patro rozhoduje). Přepis jde zrušit jedním tlačítkem. (já)
- Funguje na výběr více prvků i přes AI („v tomto pohledu dej příčky 1.NP modře čárkovaně“). (já)

## 5. Konstrukce – stěny, stropy, podlahy

- IFC: skladba = IfcMaterialLayerSet (vrstvy materiál + tloušťka), použití vůči referenční čáře = IfcMaterialLayerSetUsage. Šrafy IFC prakticky nepřenáší, jsou to naše data; do IFC jde materiál a skladba.
- **[R] Šrafa a vzhled řezu jsou u materiálu** (jako Archicad / ardit), ne u typu stěny. Nastaví se jednou a platí ve všech skladbách.
- Knihovna materiálů: název, kategorie, šrafa řezu podle českých zvyklostí (zdivo, beton, ŽB, tepelná izolace, dřevo…), barva/povrch pro 3D, priorita napojování; později λ. (já)
- Typ = seznam vrstev (materiál + tloušťka + funkce jádro/izolace/povrch). Jeden mechanismus pro stěny, stropy, podlahy i střechy. (já)
- Editor typu: tabulka vrstev + živý náhled řezu. Grafická změna tloušťky stěny mění jádro, povrchové vrstvy zůstávají. (já)
- Napojování stěn podle priority materiálů: jádro na jádro, izolace na izolaci, omítka obteče roh. (já)
- **[R] Referenční čára stěny volitelná (osa / líc / líc jádra), výchozí vnitřní líc** – odpovídá zaměřování (kreslí se vnitřní líc místností). Při změně tloušťky zůstává referenční líc na místě.
- **[R] Strop a podlaha jsou dvě samostatné desky** (nosný strop + skladba podlahy). Při rekonstrukci se často mění jen podlaha.
- **[R] Výška stěny může být vázaná na podlaží** (viz základ 12).
- Import ze zaměřování: stěna dostane materiál „stávající zdivo (neurčeno)“ a jednu vrstvu; skladba se doplní, až je známá. (já)
- Střechy viz 11.

## 6. Fáze a varianty (cíl: jednoduše, žádné tápání jako v Revitu)

### Fáze
- Jedna vlastnost prvku: stav = stávající / bourání / nový (viz 1). Žádné revitovské „fáze vytvoření / zbourání“ ani filtry fází.
- **[R] Čtyři hotová tlačítka, přepnutí jedním kliknutím** (jako sady zobrazení):
  - Stávající stav: stávající + bourané, bez nového.
  - Bourací práce: stávající černě, bourané žlutě čárkovaně.
  - Nový stav: stávající + nové, bez bouraného.
  - Srovnávací: vše, nové červeně.
- Grafika fází je patro 3 v pořadí přepisů; jednotlivý prvek ji vždy může přepsat (viz 4). Technicky jsou fáze předdefinovaná pravidla (základ 30). (já)

### Varianty
- Hlavní model = vše, co není ve variantě. Prvek patří buď hlavnímu modelu, nebo jedné variantě (vlastnost prvku). (já)
- **[R] Více nezávislých sad variant** (např. Kuchyně A/B, Koupelna A/B/C nezávisle). Vhodné pro rekonstrukce po místnostech.
- Přepínač nahoře jako u sad zobrazení: „Kuchyně: [A] B C“. (já)
- Vždy je jasné, kam se kreslí: v režimu varianty barevný rámeček kolem výkresu s nápisem „Kreslíš do: Kuchyně – B“. Mimo režim se kreslí do hlavního modelu. (já)
- **[R] Úprava prvku hlavního modelu uvnitř varianty = automatická kopie do varianty.** Originál zůstane, varianta dostane upravenou kopii a originál v ní skryje. Zobrazí se krátké upozornění. Ostatní varianty nedotčené.
- Pohled buď sleduje aktivní variantu, nebo má variantu pevně (výkres A i B vedle sebe). (já)
- „Přijmout variantu“ = sloučit do hlavního modelu, ostatní varianty smazat nebo archivovat. (já)
- Výkazy po variantách (porovnání ploch A vs. B). (já)
- Varianty a stav jsou nezávislé: varianta může mít vlastní bourání i nové konstrukce. (já)
- AI: „udělej variantu C kuchyně s ostrůvkem“ vytvoří variantu a kreslí jen do ní. (já)
