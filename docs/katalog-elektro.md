# BIM-light – katalog Elektro (značky, typy, skupiny, výšky)

Zadání: `rozhodnuti-koncepce-model-zobrazeni.md`, sekce 3 (Elektro) a 4 (sada Elektro). Vzor ovládání:
Ardit Designer (screenshoty uživatele 2026-11-27) – princip, ne kopie. **[R] Zdroj pravdy pro tvary,
skupiny, barvy, výšky a popisy značek je legenda uživatele** (Corel SVG „legenda elektro značek“, A4,
mimo repo – repo je veřejné, soubor se nekopíruje). Princip značek ČSN EN 60617; výšky typů, které legenda
nemá, podle české praxe. Značení: **[R]** = rozhodl uživatel, **(já)** = Claude podle Revitu / Archicadu / Arditu, platí,
dokud uživatel nerozhodne jinak.

## 1. Prvek a typ (základy 1, 2, 21)

- **[R] Značka je BIM prvek s typem a instancí.** Kategorie `electrical`, profese `electrical`, stav
  (stávající / bourání / nový), varianta, GlobalId, podlaží.
- **Typ** (knihovna, kopie v projektu s odkazem na původ, stálá id `et-<klíč>`): název, popis do legendy,
  druh (přístroj / zařízení / svítidlo / rozvaděč – rozdělení Arditu), skupina legendy, třída IFC
  a PredefinedType, osazení (stěna / strop), výchozí výška osy nad podlahou (strop = bez výšky), značka,
  u rozvaděče rozměry skříně, u liniového svítidla délka.
- **Instance**: hostitel, výška (chybí = výchozí výška typu), označení (S2a, Z1, „Z2, D1, T1“, RH),
  u rámečku vlastní sloty a rozložení, značka v půdorysu (velikost, odsazení, natočení), u rozvaděče
  vlastní rozměry, u liniového svítidla délka. **Místnost se neukládá, počítá se z polohy** (koncepce 3
  „automaticky“, základ 4).
- Změna typu (výchozí výška, značka, třída IFC) platí pro všechny instance (koncepce 1).

## 2. Hostitel a poloha (koncepce 3, základ 4)

- **Na líci stěny (já podle Revitu „face-based“):** poloha = vzdálenost po referenční čáře stěny + strana
  (referenční / protilehlý líc). Značka stojí na líci a je otočená kolmo do místnosti; jde se stěnou
  (posun, otočení, změna tloušťky, prodloužení – stejná pravidla jako otvor). Rozdělení a sloučení stěny
  prvek přenese na novou část na stejném místě; smazání stěny smaže i prvky na ní (průřezová pravidla:
  stěna → `electro`, jako Revit u hostovaných prvků).
- **Na stropě / v místnosti:** bod + natočení. Svítidla a hlásiče (koncepce 3: „patří k místnosti nebo
  stropu“). Výška stropních prvků = bez čísla („na stropě“); zadaná výška (závěsné svítidlo) se popíše.
- Vložení na stěnu jde i bodem (AI, později myš): bod se promítne na nejbližší líc a určí stranu.

## 3. Skupiny legendy a barvy (koncepce 3, 4; legenda uživatele)

Názvy, pořadí a barvy podle legendy uživatele (tabulka Značka | Popis | Výška | Ks po skupinách).

| Skupina | Barva (výchozí) | Co do ní patří |
|---|---|---|
| Silnoproud | červená `#f03d3d` | zásuvky, vývody, wallbox, ventilátor, rozvaděče |
| Osvětlení a ovládání | oranžová `#ffa84d` | spínače, přepínače, stmívač, svítidla |
| Data | tyrkysová `#21b8cf` | datová zásuvka, Wi-Fi AP, datový rozvaděč |
| AV a anténa | fialová `#5e3dc2` | anténní zásuvka, videotelefon |
| Stínění | zelená `#21c996` | ovladač stínění |
| Zabezpečení a požár | tyrkysová `#21b8cf` | hlásiče, kamery, PIR, MK, siréna, klávesnice, ústředna EZS |
| Řízení a signalizace | červená `#f03d3d` | zvonek, termostat |

- Barva skupiny je **výchozí grafika prvku (patro 1)**, jako barva kategorie místnosti; pravidla, styl
  a přepisy ji přebijí (základ 11). Panel „proč“ ukáže „skupina Silnoproud“. Pravidla se mohou ptát na
  vlastnost `electroGroup`.
- V rámečku má každý slot barvu své skupiny (datová tyrkysově, anténní fialově).

## 4. Knihovna (44 typů; 33 z legendy uživatele, ostatní složené z jejích tvarů)

Výška = osa nad čistou podlahou v mm; „strop“ = bez výšky, vazba na strop místnosti. Výšky z legendy
uživatele mají přednost: spínače a přepínače, stmívač, ovladač stínění **1050**, kabelové vývody 1f a 3f
300, videotelefon, zvonek, klávesnice a rozvaděče 1400, termostat 1500, ústředna 1600, magnetický
kontakt 2000, ventilátor 2200, siréna a kamera nástěnná 2500, venkovní svítidlo 2300, wallbox 1200.
Popis typu (sloupec legendy „Popis“) je text legendy, např. „El. zásuvka“, „Kabelový vývod 3f“.

**Přístroje (21):** Zásuvka 300, Dvojzásuvka 300, Trojzásuvka 300, Spínač č. 1 1050, Přepínač č. 6 1050,
Přepínač č. 5 1050, Přepínač č. 6 + zásuvka 1050, Přepínač č. 6 + č. 5 + zásuvka 1050, Datová zásuvka 300,
Zásuvka + datová 300, Anténní zásuvka 300, Ovladač stínění 1050, Zásuvka nad linkou 1150, Dvojzásuvka nad
linkou 1150, Stmívač 1050, Vývod 1f 300, Vývod 3f 300, Videotelefon 1400, Termostat 1500, Wallbox 1200,
Ventilátor 2200.

**Zařízení (11):** Hlásič kouře strop, Detektor CO strop, Wi-Fi AP strop, Kamera stropní strop, Kamera
nástěnná 2500, PIR čidlo 2200, Magnetický kontakt 2000, Siréna 2500, Klávesnice 1400, Ústředna EZS 1600,
Zvonek 1400 (skupina Řízení a signalizace).

**Svítidla (8):** stropní, přisazené, závěsné (strop), nástěnné 2000, liniové 1200 mm (strop), LED pásek
2000 mm (strop), venkovní 2300, s čidlem (strop).

**Rozvaděče (4):** hlavní (RH), podružný, elektroměrový, datový – 600 × 800 × 150 mm, střed 1400,
zapuštění 0 (vzor Arditu).

Třídy IFC: zásuvky `IfcOutlet` (POWEROUTLET, DATAOUTLET, AUDIOVISUALOUTLET), spínače, klávesnice
`IfcSwitchingDevice` (TOGGLESWITCH, DIMMERSWITCH, KEYPAD), vývody `IfcJunctionBox`, svítidla
`IfcLightFixture`, rozvaděče `IfcElectricDistributionBoard`, čidla `IfcSensor`, siréna a zvonek `IfcAlarm`,
Wi-Fi `IfcCommunicationsAppliance`, kamery a videotelefon `IfcAudioVisualAppliance`, termostat a ústředna
`IfcUnitaryControlElement`, ventilátor `IfcFan`, wallbox `IfcElectricAppliance`.

## 5. Značka v půdorysu (koncepce 3, základy 5, 11, 29, 32)

- **Velikost na papíře** 4 mm (Ardit „Velikost značky“), stejná ve všech měřítcích; jde změnit u prvku
  a v nastavení projektu (`paperSizes.electroSymbol`). Popisky 2 mm (`electroText`).
- **Značka = data**: tvary opsané z legendy uživatele (`electro/glyphs-wall.ts`, `glyphs-center.ts`,
  souřadnice legendy v 0,01 mm převedené v `legend.ts`): jednotka = velikost značky 4 mm, takže poměry
  i velikosti značek vůči sobě jsou jako v legendě (zásuvka 3,4 mm). Osa y od líce do místnosti; značka na
  stěnu má kotvu na spodní hraně kresby řádku legendy (na líci), značka na strop ve středu. Tvary:
  úsečka, kroužek, oblouk, výplň, text. Složené přístroje jsou **sloty** ze znaků vedle sebe (dvojzásuvka = 2 × zásuvka,
  přepínač č. 6 + zásuvka…). Vlastní značku (i od AI) jde zadat tvary (`electroType.create`).
- **Rozvaděč** se kreslí ve skutečné velikosti skříně (šířka po líci × hloubka), druh výplní: hlavní =
  plný pruh uprostřed (2/3 šířky, 1/3 hloubky, legenda), datový = úhlopříčka a „D“ (legenda), podružný =
  kříž, elektroměrový = plný trojúhelník (nejsou v legendě). Zapuštění
  posune skříň do stěny.
- **Liniové svítidlo a LED pásek** mají délku v mm modelu; LED pásek dvojitá čára s roztečí 0,23 mm
  na papíře (legenda), bez krajních čárek.
- **Odsazení** po líci a od líce v mm na papíře (Ardit „Odsazení podél / od stěny“), kladné po směru
  referenční čáry stěny; posunutá značka má **odkazovou čáru** k místu osazení. Natočení ve stupních.
- **Popisek**: označení + výška „+1150“ **jen když se výška liší od výchozí výšky typu** (koncepce 3).
  Dvojzásuvka nad linkou 1150 tedy výšku nepíše, obyčejná dvojzásuvka zvednutá na 1150 ano (jako Ardit).
  Popisek je vodorovný, před značkou do místnosti; u stropních prvků vpravo od značky.
- **Podrobnost**: hrubá = jen značky (bez popisků, rozvaděč jen obrys); střední = popisky a výplň druhu
  rozvaděče; jemná = navíc líc stěny přes zapuštěný rozvaděč.
- Pero a barva jen z funkce grafiky: kategorie `electrical` = pero 2 (značky, katalog pohledů), barva
  skupiny, typ čáry z grafiky.

## 6. Sada zobrazení Elektro (koncepce 4, katalog pohledů 26–32)

- Vrstva **Elektro** (kategorie `electrical`) a skupina anotací „Kóty a popisky – elektro“.
- **Studie a Projekt**: vrstva Elektro skrytá (tabulka katalogu pohledů: elektro symboly jen v Elektru).
- **Styl Elektro** (1:50, střední podrobnost): pravidlo **„Elektro – stavba šedě“** (vše kromě elektra
  a místností šedě, bez šraf, slabší obrys řezu), kombinace „Elektro – podklad šedě“, místnosti s barvou
  a razítkem (číslo, název), kóty skryté, popisky elektra zapnuté (`labels.electroMarks`,
  `labels.electroHeights`).
- Vše jsou data v nastavení zobrazení (styl, pravidlo, kombinace, vrstvy) – jdou upravit a kopírovat.

## 7. Legenda (další krok, základ 8)

- Vzor: legenda Arditu „Legenda značek elektro – 1.NP“ – sloupce Značka | Popis | Výška [mm] | Ks, řádky po
  skupinách (pořadí a nadpis skupiny), značka v barvě skupiny; výšky všech výskytů typu sloučené lomítkem
  („300 / 1050 / 1150“), stropní prvky „strop“; legenda po podlažích.
- Datový model je na to připravený: skupina (název, pořadí, barva), typ (popis, značka, výchozí výška),
  instance (výška, podlaží). Legenda bude jen **nový zdroj výkazu** (`schedule/source-electro.ts`, stejný
  mechanismus jako výpis místností): seskupit po skupině a typu, sloučit odlišné výšky, sečíst kusy,
  filtr podlaží; značka do buňky z téže kresby jako půdorys.

## 8. Rozdíly oproti legendě uživatele a Arditu a vlastní rozhodnutí (já)

- Značky kreslené vlastní stavebnicí tvarů (princip ČSN EN 60617), ne kopie ikon Arditu.
- „Rozložení slotů pod sebou“ se ukládá, v půdorysu se ale sloty vždy kreslí po líci (pod sebou je rozdíl
  jen v pohledu na stěnu, až bude pohled stěny).
- Odsazení značky je v mm na papíře (Ardit neuvádí jednotku); při změně měřítka zůstane stejně daleko na
  papíře.
- „Zobrazit na podlažích“, pero / výplň / šrafa řezu a pohledu, povrch 3D (Ardit „Zobrazení“) řeší
  společná funkce grafiky (pravidla a přepisy prvku, základ 11) – žádná vlastní nastavení u prvku.
- Okruhy (sloty → okruhy Z2, D1, T1), vazby vypínač – svítidla a legenda přijdou v dalším kroku; označení
  se zatím zadává ručně jako text.
- Legenda uživatele (zdroj pravdy tvarů 2026-11-27): přepsány všechny tvary, skupina Stínění, barvy
  a výšky. Data a zabezpečení mají v legendě stejnou tyrkysovou, silnoproud a řízení stejnou červenou –
  převzato beze změny (k potvrzení). Tloušťku čar legendy (0,15 mm) neurčuje značka, ale pero 2 (0,18 mm).
- Typy mimo legendu (dvojzásuvka, trojzásuvka, přepínač + zásuvka, zásuvka + datová, nad linkou 1150,
  rámeček) se skládají ze znaků legendy vedle sebe; svítidlo nástěnné = přisazené svítidlo legendy na
  držáku u stěny, PIR = krabička jako MK s textem „PIR“, rozvaděč podružný a elektroměrový zůstaly.
