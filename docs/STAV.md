# BIM-light – stav práce

Aktualizuje Claude Code na konci každého kroku. Poslední změna: 2026-11-27, desky D3 (otvory v deskách); 3D náhled běží ve druhém proudu (`docs/STAV-3d.md`).

Etapa 0 (kroky 1–4, skupina A, doplněk šraf) a její rozhodnutí jsou v `docs/STAV-etapa-0.md`.
Stěny Z1–Z5 (hotovo a rozhodnutí, Z4 a Z5 k potvrzení) jsou v `docs/STAV-steny.md`.
Rozhraní UI1–UI5 je v `docs/STAV-rozhrani.md`, šrafy v `docs/STAV-srafy.md` (hotovo i rozhodnutí k potvrzení).

## Hotovo

### 3D pohled jako data a průhlednost povrchu, 2026-11-27 (požadavky 3D proudu)

- `views3d` (migrace 20 → 21): 3D pohled s názvem, víc instancí; styl, vrstvy, filtr rekonstrukce a
  přepisy jako u půdorysu (funkce grafiky bere `GraphicView`), `storeyIds` (null = všechna) a
  `sectionBox` (kvádr v mm, osy modelu). Nový projekt i migrace mají výchozí „3D“. Příkazy `view3d.create /
  rename / delete / setStoreys / setSectionBox / setStyle / setPhaseFilter / setLayerState`, dotaz
  `view3d.list`, AI scénář. Grafika: `surfaceTransparency` (null = materiál), bourání 50 %.

### Desky D3: otvory v deskách, 2026-11-27 (scéna `?ukazka=desky-otvory`; otvor pro schodiště v `?ukazka=dum`)

- Jádro: `slabOpenings` (migrace 18 → 19) – svislý otvor, obrys v půdorysu, hostitelé `hostIds` = desky
  podlaží pod obrysem (strop i podlaha najednou). Příkazy `slabOpening.create / setOutline / moveVertex /
  move`, mazání `selection.delete` (`slabOpeningIds`); smazaná deska zmizí z hostitelů, otvor bez desky
  zanikne; posun desky vezme otvory, které jsou jen v ní. Dotaz `slabOpening.list`, `slab.list` má
  `netArea` a počet otvorů. Půdorys: obrys + úhlopříčky, v deskách nad řezem čárkovaně (grafika „opening“).
  IFC: IfcOpeningElement + IfcRelVoidsElement ke každé desce (ověřeno web-ifc).
- Sandbox: nástroj Otvor → „V desce“ (mnohoúhelník / obdélník / natočený), výběr klikem i rámečkem,
  tažení, body obrysu, Del; info box s plochou a deskami.

### Barva povrchu ve 3D v grafice, 2026-11-27 (požadavek 3 z 3D proudu, `docs/STAV-3d.md`)

- Efekt grafiky má `surfaceColor` (null = barva materiálu; Archicad Override Surface), odděleně od výplně
  řezu. Výchozí null, pravidlo „Bourání žlutě čárkovaně“ ho nastaví sytě žlutě (#f2c200; světlá #fff3b0
  ve 3D splývala s omítkou, migrace 19 → 20); „proč“ v `resolveGraphics`,
  schéma balíčku. Migrace projektu 17 → 18 a balíčku zobrazení 5 → 6.

### Desky D2: nástroj Deska, 2026-11-27 (hlavní proud; scéna `?ukazka=desky-kresleni`; screenshot Arditu)

- Jádro: `slab.create` umí obrys i ze stěn (`walls: { wallIds, boundary: face | core }`) – stěny se seřadí do
  smyčky podle konců, vnitřní líc (nebo líc nosného jádra) sousedních stěn se protne; oblouková stěna dá
  oblouk rozložený na body. Výběr desky: `slabsAt` (klik do obrysu / na hranu, výš položená první),
  rámeček (`boxSelect` vrací `slabIds`, filtr „Vybírat desky“), karta prvku a dotaz `element.info` u desky.
- Sandbox: nástroj **Deska (S)** v paletě; metody v info boxu: mnohoúhelník (tracker délka / úhel, klik na
  první bod, dvojklik nebo pravé tlačítko uzavře, Backspace vrátí bod), obdélník, natočený obdélník, podle
  stěn (klik na stěny, Enter). Info box podle Arditu: typ, metoda, konstrukce (skladba, tloušťka, vrstvy
  shora), ref. rovina, horní hrana k podlaží, nosný, stav nových prvků.
- Výběr desky: klik, Shift, rámeček, Ctrl+A; tažení posune (`slab.move`), čtverečky v bodech obrysu se
  táhnou nebo klikají (`slab.moveVertex`), Del smaže. Info box vybraných: typ, horní hrana, funkce, horní a
  spodní líc, plocha, obvod, skladba.
- Testy: obrys ze stěn (obdélník, pořadí, jádro, oblouk), výběr, karta, AI scénář krok D2, e2e `desky.spec.ts`.

### Desky D1: jádro, 2026-11-27 (hlavní proud; scéna `?ukazka=desky`, desky i v `?ukazka=dum`)
- **Data:** deska je prvek `Element = Wall | Slab` (`slab/`), kategorie `slab`, obrys = mnohoúhelník,
  `topOffset` = horní líc nad úrovní podlaží, tloušťka dolů podle skladby typu. `slabFunction`: nosná
  deska / skladba podlahy (rozhodnutí sekce 5: dvě samostatné desky). Typy desek `slabTypes` (název,
  značka D1/P1, skladba „pro desku“ ze společných skladeb, nosná); knihovna 4 typů. Migrace 16 → 17.
- **Příkazy:** `slab.create` (outline / rect), `slab.update`, `slab.setOutline`, `slab.moveVertex`,
  `slab.move` (i kopie), `slabType.duplicate / update / delete`, `selection.delete` s `slabIds`. Dotazy
  `slab.list` (výšky líců, plocha m², obvod) a `slabType.list`; AI scénář `ai/scenario-slabs.test.ts`.
- **Kresba v půdorysu:** pod rovinou řezu plný obrys perem pohledu (2), nad řezem čárkovaně, v řezu perem
  řezu; vrstva Desky, filtr rekonstrukce a pravidla přes funkci grafiky; kreslí se pod stěnami.
- **IFC:** strop = IfcSlab FLOOR + IfcSlabType, podlaha = IfcCovering FLOORING + IfcCoveringType;
  tělo vytažené z obrysu, IfcMaterialLayerSetUsage AXIS3, Pset_SlabCommon / Pset_CoveringCommon
  (ověřeno web-ifc). Materiál ve skladbě desky se počítá do použití materiálu; podlaží s deskou nejde smazat.
- Prvky se v jádru i sandboxu čtou přes `findWall` / `allWalls` (stěnové nástroje desky ignorují).
  `check:size` přeskakuje `.claude` (worktree druhého proudu).

### Kóty: zámeček jen u vybrané, posun čísla, 2026-11-27 (pokyn uživatele; scéna `?ukazka=kota-cislo`)
- **Zámeček** se kreslí a jde kliknout jen u vybrané kóty (jako Revit); u kóty, která brání změně, se dál
  krátce rozsvítí.
- **Posun čísla:** u vybrané kóty tažení čísla posune číslo po kótovací čáře (`DimTextMode`), i ven z krátké
  kóty – kótovací čára se pod číslo prodlouží (`dimension/text-shift.ts`). Klik bez tažení dál otevře pole
  pro číslo; nevybraná kóta se tažením čísla dál posouvá celá. Data: `textShift` (mm od středu, chybí =
  uprostřed, bez migrace); příkaz `dimension.setTextShift`; nabídka „Číslo kóty doprostřed“.

### Kóta celé stěny se všemi stěnami, 2026-11-26 (pokyn uživatele; scéna `?ukazka=kota-cela-stena`)
- `dimension.wholeWall` s `walls: true` (Revit „Entire Walls – Intersecting Walls“, Archicad automatické
  kótování): řetěz obsahuje i tloušťky rohových stěn na koncích a oba líce napojených příček a křížících
  stěn, seřazené podél stěny; pod ním celková délka. Nabídka stěny i otvoru (pravé tlačítko): „Okótovat
  celou stěnu“ (jen otvory) a „Okótovat celou stěnu se všemi stěnami“. Také přímo v nástroji Kóta
  (připomínka uživatele: pravé tlačítko není intuitivní; jako Revit „Vybrat: celé stěny“): info box
  → Co kótovat: Líce a hrany / Celou stěnu, „i šířky všech stěn“; klik na stěnu u líce, řetěz se nese na
  myši, druhý klik ho položí (`interaction/tools/whole-wall-pick.ts`). Jen přímé stěny (u oblouku zatím
  jen otvory). Ukázkový dům je okótovaný takto. Testy `dimension/whole-wall-walls.test.ts`, e2e `otvory`.

### Oprava kótování oblouků, 2026-11-26 (druhé hlášení uživatele; scéna `?ukazka=koty`)
- **Poloměr a průměr:** nástroj Kóta – klik na líc obloukové stěny a pak do volna vloží poloměr (R) nebo
  průměr (⌀) podle volby v info boxu nástroje („Kóta oblouku“). Kóta leží na paprsku v místě kliknutí,
  průměr vede přes střed; změna čísla průměru změní poloměr stěny. Nová míra `diameter`.
- **Tloušťka obloukové stěny** se kótuje radiálně v místě položení (`dimension/radial.ts`), dřív
  vodorovnou čarou od začátku oblouku.
- **Obrys otvoru v obloukové stěně** (náhled při vkládání, otvor mimo řez, záplaty rekonstrukce) sleduje
  líce oblouku; dřív čtyřúhelník s rovnými stranami. Testy `dimension/arc-radial.test.ts`,
  `opening/draw.test.ts`, e2e `koty-otvory.spec.ts`.

### Oprava kótování, 2026-11-26 (hlášení uživatele; scéna `?ukazka=koty`)
- **Hrany otvorů v nástroji Kóta:** nástroj chytal jen líce a čela stěn. Teď chytí i hrany každého
  zobrazeného otvoru – i bouraného otvoru a niky (`selection/pick-opening.ts`); otvor skrytý filtrem
  rekonstrukce ne.
- **Oblouky:** hrany přes obloukovou stěnu (čelo, hrana otvoru) dají kótu po oblouku na líci blíž kliknutí
  (`dimension/pair.ts`, jako „délka oblouku“ v Revitu); soustředné líce téže stěny = tloušťka.
  `dimension.createSet` přijímá `arc`.
- **Odkazové čáry řady:** v řadě kót (skupina zarovnání) začínají všechny odkazové čáry u nejbližšího
  kótovaného místa řady – přes příčku končí u líce obvodové stěny, ne za ní; řada uvnitř místnosti beze
  změny. Testy `dimension/tool-rules.test.ts`, e2e `koty-otvory.spec.ts`.

### Ukázky: ukázkový projekt a testovací scény, 2026-11-26 (pokyn uživatele)
- Tlačítko **Ukázky** v horní liště: ukázkový projekt „Rodinný dům – ukázka“ (vymyšlený; 1.NP rekonstrukce
  se stávající, bouranou a novou konstrukcí, probouráním, zazdívkou, nikou a obloukovou příčkou, 2.NP
  nástavba, kóty celé stěny, značky typů) a testovací scény k posledním krokům (Z10, Z9, skladby, oprava
  oblouku). Jeden klik; odkaz `?ukazka=<klíč>` (např. `?ukazka=dum`). Ukázka se otevře přiblížená na celek.
- Ukázky jsou recepty z příkazů jádra (`packages/core/src/samples/`), ne uložené soubory: vždy v aktuální
  verzi modelu, každá je test (`samples.test.ts`; dům projde kontrolou modelu bez varování).
- Pravidlo do `CLAUDE.md`: ke každému kroku nová scéna a odkaz ve zprávě.

### Oprava: odkazová čára kóty začíná u líce nejblíž kótovací čáře, 2026-11-26
- Kóta celé stěny táhla odkazové čáry od středu líce kolmé stěny přes celý dům (viditelné v ukázce).
  Teď začíná v bodě líce nejblíž kótovací čáře (jako Revit / Archicad). Test `dimension/extension.test.ts`.

### Oprava: nová stěna místo vybouraného úseku se v plánovaném stavu napojí, 2026-11-26 (hlášení uživatele)
- Po „Vybourat úsek“ a nakreslení nové stěny do mezery byly v plánovaném stavu stávající části a nová stěna
  oddělené omítkou: napojení vedlo jen na skrytý bouraný úsek. Teď se v kresbě konec, který ztratil
  napojení kvůli skryté stěně, napojí na volný konec zobrazené stěny ve stejném bodě (`view/rejoin.ts`,
  jako v Archicadu – napojení mezi zobrazenými prvky). Model se nemění; ručně odpojené konce zůstanou.
  `wall.demolishPart` vrací id v pořadí bouraný úsek, zbylá část, napojení. Test `view/phase-joins.test.ts`.

### Stěny Z10 dokončení: kresba probourání a zazdívky, nástroj Vybourat úsek, 2026-11-26
- Místo otvoru v řezu stěny se kreslí jako část stěny v opačném stavu (`opening/renovation.ts`):
  probourání (nový otvor ve stávající stěně) jako bourání – v Bouracích pracích a Srovnávacím žlutě
  čárkovaně s výplní; zazdívka (bouraný otvor) jako nová konstrukce – v Novém stavu a Srovnávacím červeně.
  Grafiku dává filtr rekonstrukce (žádné barvy v kódu); kde se neliší od stěny, nic navíc. Jen u otvorů
  v rovině řezu a při zobrazení celé skladby.
- Nástroj **Vybourat úsek** v liště úprav (vedle Rozdělit): dva kliky na stěnu → `wall.demolishPart`.

### Stěny Z10: rekonstrukce a kontroly, 2026-11-26 (plán stěn, část 3; bez importu a kouzelné hůlky)
- **Probourání a zazdívka** = otvor se stavem: otvor, který filtr rekonstrukce skryje, stěnu v kresbě
  nevyřízne (`view/visible-walls.ts`). Nový otvor ve stávající stěně: ve stávajícím stavu stěna celá,
  v novém stavu otvor; bouraný otvor (zazdívka): ve stávajícím stavu otvor, v plánovaném stavu stěna celá.
- **Vybourat úsek stěny**: příkaz `wall.demolishPart` (rozdělí ve dvou bodech, prostřední část „bourání“,
  jeden krok Zpět). V rozhraní zatím ručně: Rozdělit dvakrát + stav (viz Otevřené).
- **Kontrola modelu**: dotaz `model.check` (`check/walls.ts`) – překrývající se stěny (bourání + nová na
  stejném místě nevadí), nenapojený konec u jiné stěny, stěna kratší než mez (100 mm). Info box nástroje
  Výběr bez výběru → Kontrola → „Zkontrolovat podlaží“; klik na varování vybere stěny. Jen varuje.
- Testy `view/phase-openings.test.ts`, `check/check.test.ts`, scénář AI, e2e `kontrola.spec.ts`.

### Stěny Z9: pohodlí úprav, 2026-11-26 (plán stěn, část 3)
- **Pipeta** (Revit Match Type, Archicad pipeta a stříkačka): příkaz `wall.matchProperties` – typ, výška
  (odsazení a vršek; spodní podlaží cílové stěny zůstane), přepisy vlastností, na vyžádání stav. Info box
  vybrané stěny → Úpravy → „Nasát vlastnosti“, pak vybrat jiné stěny → „Přenést z …“.
- **Výběr stejných**: dotaz `wall.findSame` (typ / podlaží / stav); Úpravy → stejný typ na podlaží,
  v projektu, nebo i se stejným stavem → Vybrat.
- **Rozdělit s mezerou** (Split with Gap): `wall.split` s parametrem `gap`; volba „Rozdělit – mezera (mm)“
  u příkazů (nástroj Rozdělit i rozdělení z palety stěny). Části nejsou spojené, otvor v mezeře odmítne.
- Hromadná změna typu (`wall.setType` pro víc stěn, info box) a sloučení stěn v přímce (`wall.deleteNode`)
  už byly. Testy `commands/wall/z9.test.ts`, scénář AI `ai/scenario-edits.test.ts`, e2e `upravy.spec.ts`.

### Editor typů, krok 3: skladby společné pro stěny, desky a střechy, 2026-11-26 (koncepce rozhraní 11a)
- Skladba je samostatná položka projektu (`composition/`, pole modelu `compositions`): název, vrstvy,
  „Použít pro“ stěna / deska / střecha. Pás typu stěny na ni odkazuje (`compositionId`); jeho vrstvy jsou
  kopie, kterou drží jediné místo zápisu (`putValidType` → `storeTypeCompositions` + `syncTypes`), takže
  kresba, napojení, výkazy a IFC se nemusely měnit. Schéma 15 → 16: každý pás dostane skladbu, typy se
  stejnými vrstvami jednu společnou.
- Příkazy `composition.rename`, `composition.setUse`, `composition.delete` (jen nepoužitou),
  `wallType.setComposition`; dotaz `composition.list`; krok ve scénáři AI (`ai/scenario-types.test.ts`).
- Okno Editor typů: pole Skladba (výběr společné skladby), Název skladby, Použít pro, „Sdílí N typy“.

### Stěna z čáry jako metoda nástroje Stěna, 2026-11-26 (pokyn uživatele: zbytečná ikona navíc)
- Ikona Stěna z čáry zmizela z palety; funkce zůstala jako geometrická metoda nástroje Stěna v info boxu
  („Z čáry (klik na líc)“, zkratka V), stejně jako „Vybrat čáry“ v Revitu. Klik na líc stěny vytvoří
  stěnu po něm; s 2D kresbou (základ 22) bude brát i nakreslené čáry (kontrolní seznam pravidel interakce).

### Editor typů, krok 2: náhled skladby Půdorys / Řez / 3D, 2026-11-26 (koncepce rozhraní 11a)
- Záložky náhledu: **Půdorys** (úsek stěny vodorovně, vrstvy jako pásy shora dolů ve stejném pořadí jako tabulka –
  referenční strana nahoře; opraveno po připomínce uživatele, šipky ↑↓ teď odpovídají náhledu),
  **Řez** (stěna nastojato, vrstvy svisle i s prodloužením nahoru / dolů), **3D** (izometrický výsek,
  vrstvy odstupňované jako schody – vnitřní nejdelší, u každé vidět čelo se šrafou, horní plochu a líc).
  Vše ve skutečném poměru, šrafy materiálů v měřítku 1 : 20, kóty tlouštěk a celková tloušťka (půdorys,
  řez), červená referenční čára.
- Klik na vrstvu v náhledu ji vybere i v tabulce vrstev a obráceně (zvýraznění barvou). Rozložení je čistá
  funkce s testy (`ui/type-editor/preview-layout.ts`, `preview-iso.ts`), kreslení v `preview-paint.ts`.

### Editor typů, krok 1: samostatné okno, 2026-11-26 (rozhodnutí uživatele, koncepce rozhraní 11a)
- Okno Editor typů (`ui/type-editor/`): záložky druhů (Stěny; Desky, Střechy, Okna a dveře zašedlé),
  vlevo seznam se značkou, tloušťkou a použitím, hledání (i podle značky), nový typ, vyčistit, z knihovny;
  uprostřed náhled skladby a referenční čára; vpravo název, vrstvy jako řádky materiál – mm – funkce
  (vzor Arditu), „+ vrstva“, prodloužení vrstvy rozbalením, duplikovat / smazat, vlastnosti typu.
- Otevírá se ikonou Editor typů v liště sekcí (dřív panel Typy stěn) a tlačítkem „Upravit v editoru
  typů…“ v záložce Typ info boxu (tam zůstal přehled skladby a vlastnosti typu). Esc nebo křížek zavře.
- Jen rozhraní nad stávajícími příkazy `wallType.*` – nové příkazy ani dotazy nebyly potřeba.

### Oprava: napojení přímé stěny a oblouku pod malým úhlem, 2026-11-26 (hlášení uživatele se screenshotem)
- Na vnější straně zalomení se vrstva přímé stěny (omítka, u opačného zakřivení izolace) u uzlu
  nezapokosovala, ale zmizela a líc ujel. Příčina: pás vrstvy oblouku (mezikruží) protne pás přímé
  stěny dvakrát – u uzlu a daleko, kde se kružnice vrací; výpočet napojení vzal i ten vzdálený průsečík
  a vrstvu zastavil o vrstvu, která u uzlu není. Teď platí jen kus buňky nejblíž uzlu (`cell`
  v `junction/travel.ts`). Test: `junction/arc.test.ts` (oprava 2026-11-26, oba směry zakřivení).

### Oprava: šrafy na obrazovce stejně silné, 2026-11-26 (připomínka uživatele se screenshoty z Arditu)
- Čáry šraf vycházely tenčí než pixel obrazovky (pero 0,13 mm ≈ 0,5 px); vyhlazování je pak podle polohy
  vůči mřížce pixelů kreslilo různě sytě, takže šrafa vypadala, že má čáry různě silné. Teď mají čáry
  na obrazovce vždy celé pixely obrazovky, nejméně jeden (`render/line-width.ts`, platí pro šrafy
  i ostatní čáry; silnější pero nikdy tenčí než slabší), vodorovné a svislé šrafy leží ve středu pixelu.
  Tisk (mm z tabulky per) se nemění. Test: `render/line-width.test.ts`.

### Oprava: šikmé dočasné kóty, 2026-11-26 (hlášení uživatele se screenshotem)
- Po kliknutí na stěnu, jejíž líce jsou po napojení různě dlouhé (roh jen na jednom konci, pokos), šla
  příčná dočasná kóta šikmo a podélná měla šikmé odkazové čáry; stejně ujížděly úchyty (kolečko zakřivení,
  šipka překlopení). Příčina: směr kolmo ke stěně se bral ze spojnice středů obou líců, které pak nejsou
  proti sobě. Teď je to normála stěny uprostřed (`wallOutward` v `dimension/temporary.ts`), použitá
  v jádře i v sandboxu. Test: `dimension/temporary.test.ts` (oprava 2026-11-26).

### Stěny Z8: výkazy, legenda skladeb a značka typu, 2026-11-26 (plán stěn, část 3)
- **Výkazy jako jeden obecný mechanismus** (základ 8, `packages/core/src/schedule/`): definice výkazu jsou
  data v projektu (zdroj, sloupce, seskupení, po prvcích / součty, řazení, filtr podlaží / stavů / variant,
  mez odečtu otvorů); tabulka se vždy spočítá z modelu. Zdroje: **stěny**, **vrstvy stěn** (výkaz materiálů),
  **typy stěn** (legenda skladeb). Hodnoty se zaokrouhlí na řádku, součty tedy sedí s ručním přepočtem.
- **Výměry z geometrie po napojení** (`schedule/quantities.ts`): délka osy, výška, plocha hrubá / otvory /
  čistá, objem = plocha obrysu vrstev v půdorysu × výška − otvory a niky. Ověřeno ručně: stěna 4 × 3 m
  s oknem 1,2 × 1,5 → 12 / 1,8 / 10,2 m², 3,06 m³; místnost 4 × 3 m zdivo 300 ven → osa 15,2 m, 13,68 m³.
- **Pravidlo odečtu otvorů** (sekce 9): otvory do zadané plochy (m²) se z ploch neodečítají, z objemu ano.
- Výchozí výkazy projektu: **Výkaz stěn** (podle typu), **Výkaz materiálů stěn** (podle materiálu),
  **Legenda skladeb** (značka, typ, tloušťka, skladba, funkce, nosná, požární odolnost; jen použité typy).
- **Značka typu** (`WallType.mark`, S1, S2…): nový typ dostane volnou, příkaz `wallType.setMark`, pole Značka
  v záložce Typ. **Značka typu v půdorysu** (`tag/`, model `wallTags`): kroužek se značkou u referenčního
  nebo protilehlého líce nebo na stěně; patří podlaží a skupině anotací (základ 28), jde se stěnou, smaže se
  se stěnou (tabulka průřezových pravidel), velikost z „popis“ na papíře (základ 29).
- Příkazy `schedule.create / update / delete`, `wallTag.create / tagAll / move / delete`; dotazy
  `schedule.list`, `schedule.fields`, `schedule.table` (i CSV), `wallTag.list`; kroky scénáře AI.
- **Rozhraní:** Obsah → Projekt → **Výkazy** (seznam, + Nový výkaz ze zvoleného zdroje); okno výkazu
  s tabulkou, nastavením (název, seskupení, po prvcích, stav, mez otvorů / jen použité typy, sloupce),
  **Exportovat CSV** (středník, desetinná čárka, pro Excel) a Smazat. Info box stěny: sekce **Popis**
  (značka typu zap./vyp., poloha); nástroj Výběr bez výběru: **Označit všechny stěny**.
- Schéma projektu 13 → 14 (značky typů S1… a výchozí výkazy), 14 → 15 (značky v půdorysu).
- Testy: jádro a nástroje 763, prohlížeč 143 (`vykazy.spec.ts`, `znacky.spec.ts`).

### Stěny Z7: vlastnosti stěny a úplný IFC, 2026-11-26 (plán stěn, část 3)
- **Vlastnosti stěny** (`packages/core/src/wall-props/`): funkce (obvodová / vnitřní / příčka / základová /
  opěrná), nosná, vnější, požární odolnost a neprůzvučnost (volný text, např. „REI 60 DP1“, „R'w 52 dB“).
  **Výchozí hodnoty nese typ** (jako Function a Fire Rating v Revitu), **stěna je může přepsat** (jako
  Structural Usage v Revitu / Position v Archicadu); bez přepisu = „podle typu“.
- **Jeden popis parametrů** (`wall-props/params.ts`, základ 15b): popisek, skupina, schéma hodnoty a
  mapování na IFC. Z něj vzniká panel v info boxu, schéma příkazů pro AI i Pset_WallCommon v exportu.
- Příkazy: **`wallType.setProperties`** (vlastnosti typu), **`wall.setProperties`** má nově `properties`
  (přepis; `null` = zpět podle typu), `wallType.create` má volitelné `properties`. Nová tloušťka stěny
  (nový typ) převezme vlastnosti původního typu. Dotaz pro AI **`wall.properties`** (výsledné hodnoty,
  přepsané klíče, PredefinedType v IFC); krok scénáře AI.
- Knihovní typy mají výchozí vlastnosti (Obvodová zateplená 465 = obvodová, nosná, vnější; Zdivo 300,
  Nosná zeď 330, ŽB stěna 200 = vnitřní nosná; příčky = příčka, nenosná). Schéma projektu 12 → 13
  (`wall-props/migrate-v12.ts`): typy dostanou vlastnosti podle knihovny, vlastní typy obecné výchozí.
- **IFC** (`packages/ifc/src/pset.ts`): IfcWallType nese Pset_WallCommon s hodnotami typu (Reference,
  LoadBearing, IsExternal, FireRating, AcousticRating) a PredefinedType podle funkce (příčka = PARTITIONING,
  základová a opěrná = USERDEFINED s názvem druhu); IfcWall má Pset_WallCommon s výslednými hodnotami
  (i s přepisy) a Status. Skladba (IfcMaterialLayerSet + Usage) a otvory byly hotové už z Z3–Z5.
- **Info box:** sekce **Vlastnosti** u vybraných stěn (každé pole „podle typu (hodnota)“ nebo vlastní;
  u textu tlačítko „typ“ vrátí hodnotu typu; u víc stěn „různé“), v záložce Typ sekce **Vlastnosti typu**.
- **Konstrukční zobrazení „Jen jádro nosných“** ve spodní liště (dořešeno ze Z6): nenosné stěny se
  nekreslí, nosné jen jádrem (jako Archicad).
- Testy: jádro a nástroje 722 (`wall-props/wall-props.test.ts`, `ifc/src/pset.test.ts` přes web-ifc),
  prohlížeč 137 (`vlastnosti.spec.ts`).

### Rekonstrukce: filtr rekonstrukce a stav nových prvků, 2026-11-26 (po vyzkoušení Z6, vzor Arditu)
- **Filtr rekonstrukce je nastavení pohledu** (`view.phaseFilterId`, příkaz `view.setPhaseFilter`),
  platí **vedle grafických přepisů** a má před nimi přednost. Volby: Stávající stav, Bourací práce,
  Plánovaný stav, Nový stav, Srovnávací, Vše. Ve spodní liště **Fáze ›** i v Obsahu → Nastavení pohledu
  → **Filtr rekonstrukce** (totéž nastavení; uložený pohled si ho pamatuje).
- Předvolby fází jsou kombinace pravidel s příznakem `phase` (pravidla dál jako data). „Plánovaný stav“ =
  bez bouraných, „Nový stav“ = bez bouraných a nové červeně. Grafické přepisy fáze nenabízejí.
- **Stav nových prvků** (info box nástroje Stěna, sekce Rekonstrukce, a nový otvor): stávající / bourání /
  nový; dostanou ho stěny, obdélník, oblouk, stěna z čáry i otvory (`wall.rectangle` má nově `status`).
- Schéma projektu 11 → 12, zobrazení 4 → 5 (`view/migrate-v11.ts`): fáze vybraná dřív v přepisech se
  přesune do filtru; „Fáze – nový stav“ se přejmenuje na „plánovaný“ a přibude nový „nový stav“.
- AI: `view.info` vrací `phaseFilterId` a `phaseFilters`; scénář AI používá `view.setPhaseFilter`.
- **Oprava po vyzkoušení (mezera v plánovaném stavu):** stěny skryté v pohledu (filtr rekonstrukce,
  vrstva, pravidlo „skrýt“) se v kresbě nenapojují (`view/visible-walls.ts`) – nová příčka přes bouranou
  je v plánovaném stavu souvislá i u už nakreslených napojení. Při kreslení se nová stěna s bouranou
  nenapojí vůbec (ani křížem, ani v T, `canJoinStatus`); stávající se napojuje s oběma.
- Testy: jádro 706 (`view/phase-filter.test.ts` – příklad uživatele: 4 stěny, bouraná a nová příčka),
  prohlížeč 133 (`rekonstrukce.spec.ts`).

### Rozhraní UI1–UI5 hotovo (podrobnosti a rozhodnutí v `docs/STAV-rozhrani.md`)

### Stěny: Z1, Z2, Z3, Z4, Z5, Z6 hotovo (podrobnosti v `docs/STAV-steny.md`)
- Z1 typ a skladba (2026-11-24), Z2 napojování vrstev (2026-11-24), Z3 výška a IFC (2026-11-24),
  Z4 otvory (2026-11-25), Z5 oblouk (2026-11-25), **Z6 kresba v půdorysu (2026-11-26)**,
  **Z7 vlastnosti a úplný IFC**, **Z8 výkazy a popisky (2026-11-26, výše)**. Kroky Z9–Z10 podle plánu.

### Šrafy (ČSN 01 3420, tepelná izolace, velikost) hotovo (podrobnosti v `docs/STAV-srafy.md`)

## Rozhodl Code (k potvrzení)

- **Desky D3:** otvory v deskách mají vlastní seznam (`slabOpenings`), ne společný s otvory ve stěně –
  poloha je obrys v půdorysu, ne staničení po stěně; společné je IFC (IfcOpeningElement), kategorie
  „opening“ (vrstva, grafika, filtr) a mazání. V IFC jeden otvor modelu = jeden IfcOpeningElement na každou
  desku (IFC dovoluje jednoho hostitele). Čistá plocha odečte celý otvor (přesah přes okraj se neořezává).
  Kříž kreslím i u otvoru nad řezem (čárkovaně). Šachta přes více podlaží a otvor ze schodiště až později.

- **Desky D2:** metoda „podle stěn“ jako Revit „Vybrat stěny“ (klik na stěny), ne klik do místnosti
  (kouzelná hůlka až s místnostmi); obrys vede po vnitřním líci, volba „líc nosného jádra“ (Revit „k jádru“).
  Stěny se řadí podle nejbližších konců, smysl oběhu z os. Ref. rovina zatím jen horní líc (Ardit nabízí
  4 – horní / spodní líc, líce jádra; doplním, až budou potřeba). Záložka Typ a úprava skladby desky v
  editoru typů zatím nejsou (skladba jen ke čtení). Klávesa nástroje **S**. Desky se vybírají až po
  otvorech a stěnách (leží pod nimi); z několika desek nad sebou je první ta s výš položeným horním lícem.

- **Desky D1:** referenční rovina = horní líc (Revit Floor, výchozí Archicad), vrstvy skladby od spodu.
  Úroveň podlaží = čistá podlaha: nová podlaha má horní líc 0, nová nosná deska −150 (výchozí skladba
  podlahy). Podlaha se exportuje jako IfcCovering FLOORING (IFC správně), v programu je to deska. Obrys zatím
  jen z úseček (oblouky v obrysu později), hrany se nesmí křížit. Deska v půdorysu bez šraf a vrstev
  (patří do řezu); výplň jen pravidlem grafiky. Hrany desky pod stěnou zatím nejsou skryté (zakryje je
  výplň stěny, kde je). Profese nové desky „architecture“ jako u stěn.

- **Z10:** probourání a zazdívka jsou otvor se stavem (žádný nový druh prvku); jejich místo se kreslí
  grafikou opačného stavu (probourání = bourání, zazdívka = nový), jen obrys a výplň, bez vlastní šrafy
  zdiva u zazdívky (výplň podle pravidla). Kontrola: „nenapojený konec“ = volný konec blíž k referenční čáře jiné stěny než
  její tloušťka + 100 mm; překryv jen u přímých rovnoběžných stěn (oblouky zatím ne); mezery v obrysu
  místnosti až s místnostmi. Import ze zaměřování a kouzelná hůlka čekají na etapu 3 (otázka G).

- **Z9 pipeta:** výchozí přenos = typ, výška a vlastnosti (jako Archicad bez stavu); stav rekonstrukce
  jen na vyžádání (`include: ['status']`, v info boxu zatím ne). Spodní podlaží a poloha cílové stěny se
  nemění. Zdroj pipety se pamatuje jen do obnovení stránky. Výběr stejných výchozí „stejný typ na podlaží“
  (Revit „ve viditelném pohledu“). Mezera rozdělení je volba příkazu, výchozí 0 (rozdělení s rohem).

- **Skladby (krok 3 editoru typů):** úprava vrstev v editoru mění skladbu, tedy všechny typy, které ji
  sdílejí (to je smysl společné skladby; okno to píše). Duplikát typu dostane vlastní kopii skladby (jako
  Revit – kopii jde upravit bez vlivu na původní typ). Změna tloušťky stěny, která založí nový typ, založí
  i novou skladbu. Skladba, kterou žádný typ nepoužívá, v projektu zůstane (knihovna skladeb, jako
  v Arditu); smazat jde ručně příkazem. Typ stěny musí mít skladbu „pro stěnu“. IFC dál exportuje sadu
  vrstev po typech (IfcMaterialLayerSet) s názvem typu.
- **Stěna z čáry:** ikona z palety pryč, funkce přesunuta do metod nástroje Stěna (jako „Vybrat čáry“
  v Revitu); zkratka V zůstala.

- **Z8 výkazy:** délka stěny = délka osy po napojení (Revit měří po ose napojené stěny); plocha boku =
  délka osy × výška; niky se z ploch neodečítají (jen z objemu). Výchozí mez odečtu otvorů 0 (odečíst
  vše jako Revit); českou zvyklost (např. do 0,25 m²) jde nastavit u výkazu. Plocha vrstvy = objem / tloušťka,
  takže omítka obalená kolem volného konce má plochu i s čelem. Výkaz bere pás typu v rovině řezu
  (vícepásové typy zatím jako jeden pás); prodloužení vrstev nahoru / dolů se nezapočítává.
- **Okno výkazu** je zatím dialog nad výkresem (jako výkaz v Revitu, ale ne v záložce okna); na výkres
  (list) se výkazy vloží s etapou 7. Prosím o screenshot výkazu / legendy z Arditu – podle něj doladím vzhled.
- **Značka typu v půdorysu:** výchozí poloha uprostřed stěny u referenčního (vnitřního) líce; kroužek
  o poloměru 1,25 × výška popisu. Značka zatím nejde vybrat a táhnout myší – poloha a strana se mění v info
  boxu stěny (a příkazem `wallTag.move`). Nový typ dostane první volnou značku S1, S2…

- **Z7 vlastnosti:** hodnoty na typu + přepis u stěny (Revit), ne jen u instance (Archicad) – typ se
  vyplní jednou. Funkce a „vnější“ jsou nezávislé (obvodová funkce „vnější“ sama nezaškrtne).
  Požární odolnost a neprůzvučnost jsou volný text (bez seznamu tříd podle ČSN); u knihovních typů
  prázdné – hodnoty doplní projektant. Funkce jde do IFC jen jako PredefinedType (obvodová i vnitřní =
  STANDARD, rozliší je IsExternal); vlastní sada vlastností BIM-light zatím není.
- **Jen jádro nosných:** nenosné stěny zmizí úplně i se svými otvory (jako Archicad „Core of Load-bearing
  Elements only“); kóty zůstávají.
- **Kontrola v BIMvision** jsem nemohl udělat sám; export ověřuje knihovna web-ifc v testech (Pset typu
  i instance, PredefinedType). Prosím otevřít export v BIMvision.

- **Filtr rekonstrukce:** volba „podle okna“ z Arditu zatím není (výchozí je Vše); „Nový stav“ ukazuje
  nové stěny červeně, „Plánovaný stav“ normálně. Stav nových prvků se po obnovení stránky vrátí na Nový.
- **Z6 (podrobně v `STAV-steny.md`):** jemná podrobnost = střední + hranice nosného jádra perem řezu;
  pás stěny v půdorysu se dál bere z výšky 1000 mm (ne z roviny řezu); konstrukční zobrazení bez
  „jen jádro nosných“ (Z7). Fáze už nepřepínají grafické přepisy (opraveno filtrem rekonstrukce).
- Rozhraní (Změnit velikost, lekce, UI5, vzhled, UI2) a šrafy: v `docs/STAV-rozhrani.md` a `docs/STAV-srafy.md`.

## Další krok

- **Desky D4 (hlavní proud):** vazba vršku stěny na desku, výkazy desek, kóty k hranám desky, záložka
  Typ desky v editoru typů. Pak povrchy místností.
- **Uživatel vyzkouší D3:** `?ukazka=desky-otvory` – O → V desce, obdélník do desky; klik do otvoru,
  tažení, body, Del; posun desky s otvorem; IFC v BIMvision.
  Deska v 3D: druhý proud po sloučení `main` do své větve (desky už v `main` jsou).
- **Povrchy místností (návrh 3D proudu; uživatel 2026-11-27 potvrdil: hned po deskách D3–D4):** základ 14, rozhodnutí
  prvky-stavby sekce 9. Jedna spočítaná plocha povrchu v jádře = zdroj pro 3D, rozvinutý pohled i výkaz.
  Pořadí: místnosti z líců stěn (ČSN 73 4301) → plochy povrchů (líc v místnosti rozvinutý do roviny, minus
  otvory, plus ostění, s transformací do 3D) + typy úprav (IfcCovering: materiál, formát, spára,
  zarovnání) + výškové zóny + výkaz m² → spárořez (mřížka oříznutá na obrys, odřezy) → podlahy a stropy.
  Příkazy `covering.assign`, `covering.setOrigin`; dotaz pro 3D vrátí plochy (obrys, transformace,
  surfaceColor, spáry jako úsečky).
- **Uživatel vyzkouší D2:** `?ukazka=desky-kresleni` – S → metoda Podle stěn: klik na stěny L a Enter (líc /
  líc jádra); Mnohoúhelník, Obdélník, Natočený obdélník; pak Esc, klik do desky, tažení, čtverečky v rozích,
  info box (horní hrana, typ), Del.
- **Uživatel vyzkouší D1:** `?ukazka=desky` – obrysy desek, čárkovaná podesta, Obsah → vrstva Desky
  skrýt / zobrazit; Exportovat IFC a v BIMvision IfcSlab a IfcCovering se skladbou; `?ukazka=dum` desky ve
  1.NP i 2.NP.
- **Druhý proud běží:** 3D náhled ve vlastním worktree (větev `nahled-3d`), stav v `docs/STAV-3d.md`.
- **Dohoda 2026-11-27: dva paralelní proudy** podle
  `docs/postup-etapy-bim-light.md` (Předplatné a paralelní práce):
  - **Hlavní proud (tato session, jádro):** desky D1–D4 (data, kresba, IFC; kreslení obdélník /
    mnohoúhelník / podle stěn; otvory v desce; vazba vršku stěny, výkazy). Před rozhraním vyžádat
    screenshoty z Arditu (kreslení desky, info box desky, deska v půdorysu).
  - **Druhý proud (samostatná session, vlastní worktree a větev):** 3D náhled modelu – nový modul, jádro jen
    čte (3D geometrie stěn a otvorů), okno vedle půdorysu. Stav do `docs/STAV-3d.md`, scény do vlastního
    souboru scén; jádro nemění (potřebuje-li změnu jádra, požádá hlavní session). Sloučení do `main` až po
    zelených testech a souhlasu uživatele.
- **Uživatel vyzkouší skladby (krok 3):** Editor typů → u typu pole Skladba – vybrat jinou skladbu (typ
  ji pak sdílí), upravit vrstvu a zkontrolovat druhý typ, Použít pro.
- **Uživatel vyzkouší Z9:** vybrat stěnu → Úpravy → Nasát vlastnosti, vybrat jinou → Přenést; Úpravy →
  Vybrat stejné; nástroj Rozdělit s mezerou (Volby příkazu → mezera).
- **Uživatel vyzkouší Z10:** stávající stěna s novým otvorem (Otvor, stav nových prvků „Nový“) a filtr
  rekonstrukce Stávající / Nový stav; Kontrola v info boxu (dvě překrývající se stěny, příčka 5 cm od zdi).
- **Další:** podle `docs/postup-etapy-bim-light.md` (stěny Z1–Z10 hotové kromě importu ze zaměřování
  a kouzelné hůlky, které čekají na etapu 3) – navrhnu další etapu, nebo desky (otázka E plánu stěn).
- Uživatel posoudí šrafy po opravě velikosti a novou tepelnou izolaci (typ Obvodová zateplená 465, styl
  Projekt) a řekne, které doladit.
- Uživatel vyzkouší stěny Z5 (nástroj Oblouková stěna, tažení kolečka zakřivení, kruh ze dvou oblouků
  s otvorem, Okótovat celou stěnu u oblouku, galerie oblouků, IFC obloukové stěny v BIMvision) a potvrdí
  body „Rozhodl Code“ u Z4 a Z5.
- Uživatel vyzkouší UI2–UI4 (info box, Obsah a pohledy, Najít a vybrat, spodní lišta, dvě okna,
  trasování, vrstvy, izolovat / odhalit, pera).
- UI5, stěny Z6 a rekonstrukce (filtr rekonstrukce, stav nových prvků) uživatel vyzkoušel 2026-11-26:
  „vše funguje“ (po opravě mezery v plánovaném stavu).
- **Uživatel vyzkouší Z8:** Obsah → Projekt → Výkazy → Výkaz stěn (přepočítá se po změně stěn), Výkaz
  materiálů, Legenda skladeb, + Nový výkaz, Exportovat CSV a otevřít v Excelu; vybrat stěnu → Popis →
  Značka typu v půdorysu; Výběr bez výběru → Označit všechny stěny; přepočet výkazu ručně na pilotním projektu.
- **Uživatel vyzkouší Z7:** vybrat stěnu → info box Vlastnosti (nosná, požární odolnost), záložka Typ →
  Vlastnosti typu, spodní lišta → Jen jádro nosných, Exportovat IFC a otevřít v BIMvision (Pset_WallCommon
  u stěny i typu, skladba).

## Otevřené

- **STAV.md má 39,5 KB (limit ~40 KB):** návrh rozdělení – oddíly „Hotovo“ starší než desky (kóty,
  stěny Z7–Z10, editor typů, opravy z 2026-11-26) přesunout do nového `docs/STAV-archiv.md`. Čeká na souhlas.
- **Desky – zbývá:** úprava vrstev skladby jen pro desku (příkazy vrstev jsou zatím `wallType.*`), typ
  desky v editoru typů, výkaz desek (obecný výkaz zná jen stěny), oblouky v obrysu.
- **Z10 zbývá:** kontrola překryvu oblouků, mezery v obrysu místnosti (s místnostmi), import ze
  zaměřování a kouzelná hůlka (etapa 3).
- **Skladby – další:** výpočty u skladby podle vzoru Arditu (U, R, plošná hmotnost, CO₂e, cena,
  kondenzace, Rw) – vyžadují vlastnosti materiálů (λ, hustota…); seznam samotných skladeb (bez typu)
  v okně a jejich přímé zakládání; desky a střechy skladby použijí, až budou.
- **Lineární prvek stěny (nápad uživatele 2026-11-26):** přidání nebo vybrání hmoty podle profilu (sokl,
  římsa, drážka) jako Obklad stěny / Drážka v Revitu; profil jako položka knihovny, součást typu nebo
  instance, vybrání přes společný mechanismus otvorů (základ 19). Zařadit po oknech a dveřích.
- Z8: výběr a tažení značky typu myší (dnes jen info box a příkaz); legenda skladeb jako kresba (řez
  skladbou se šrafami) na výkrese – s etapou 7 (listy); výkaz ve vlastní záložce okna; export XLSX
  (dnes CSV); výkazy po variantách vedle sebe (porovnání A / B).
- Z7: hledání a výběr podle vlastností (nosná, funkce) v Najít a vybrat a pravidla grafiky podle
  vlastností (např. nosné stěny tučněji) – patří k Z9 a k přepisům vzhledu. Součinitel prostupu tepla
  (ThermalTransmittance) se zatím nepočítá – přijde s výpočty skladby.
- Šrafy podle ČSN 01 3406 (k rozhodnutí): převládající hmota bez šrafy (předvolba pravidla ve stylu),
  tenké vrstvy (hydroizolace, plech) vyčernit automaticky pod danou tloušťkou na papíře, sousední
  konstrukce ze stejného materiálu se šrafou otočenou o 90°.
- Připojení AI přes MCP (etapa 6): server nad jádrem a souborem projektu, nástroje Undo / Redo, uložení.

- Skupina zarovnaných kót zatím nedrží společnou polohu čáry po změně geometrie (kóty 4, druhá věta):
  poloha čáry je odsazení od středu líce, po prodloužení stěny se řada může rozejít. Návrh: uložit polohu
  skupiny v modelu (nová verze schématu + migrace) – k rozhodnutí.
- Z6: pás vícepásového typu stěny v půdorysu podle roviny řezu (dnes 1000 mm) – vyžaduje rovinu řezu
  v napojování a otvorech; čelní čára u volného konce se schová jen v přímé části čela.
- UI1: hledání příkazů (Ctrl+K) je zatím jen neaktivní ikona (UI3); panel Podlaží je provizorní místo
  Obsahu (UI3); úpravy Studie / Projekt jsou zatím jen dva styly bez Elektro.
- UI4: trasování kreslí odkaz bez kót; zpět změnu vrstev jen přes Zpět editoru; sady per, gravitace,
  konstrukční zobrazení, fáze a 3D podle tabulky v koncepci později; na úzké obrazovce lišta zatím
  nepřetéká do „…“; volby okna (přichytávání, trasování…) se po obnovení stránky nepamatují.
- UI3: uložené sady kritérií Najít a vybrat zatím nejsou; řezy, pohledy, 3D a výpisy v Obsahu přibudou
  s etapami; Organizátor s etapou 7; hledání příkazů Ctrl+K přesunuto do UI5.
- UI2: metody natočený obdélník a oblouk středem (jsou ve vzoru) zatím nejsou; tracker u tečného oblouku
  a oblouku bodem jen ukazuje poloměr a úhel (číslo napsat nejde); rychlý výběr typu zatím jen u Stěny.
- Úprava vzhledu fází (2026-11-26, odloženo uživatelem): vzhled je v pravidlech grafiky projektu (data,
  ne kód), okno na úpravu zatím není. Návrh: „Fáze › Upravit fáze…“ – tabulka stav × fáze (zobrazit /
  skrýt, barva a typ čáry, výplň, šrafa) jako Renovation Filter Options v Archicadu; udělat spolu
  s návrhem přepisů vzhledu.
- Přepisy vzhledu (pravidla grafiky, vlastní styly) – uživatel je ještě promýšlí; rozhraní pro ně se
  navrhne zvlášť (koncepce rozhraní, část 4).
- Oblouk se zatím nedá kreslit „středem a poloměrem“ ani zadat tětivu číslem po zadání konce (jen při
  zadávání konce); případně doplnit podle zkušenosti.

## Chybělo

- Z5: nic z pozdějších kroků; primitivum oblouku v kresbě (rozhodnuto lomenou čarou, viz Rozhodl Code).
- Z2: nic z pozdějších kroků nebylo potřeba; desky (rozhodnutí E) se napojení v půdorysu netýkají.
- Z3 (rozhodnutí E): **desky** – vršek stěny nejde přichytit ke stropu, „omítka pod strop“ je jen číslo
  prodloužení. **Ukládání projektu v sandboxu** – Platform v prohlížeči umí jen stažení (export IFC).
- Z4: **okna a dveře** (etapa 4) – ostění se počítá bez výplně; obalení podle polohy okna doplní etapa 4.
  **Výšková kóta** (parapet) v půdorysu zatím neexistuje. **Řez a 3D** – otvor je v datech celý (výška,
  parapet), kresba jen v půdorysu.

## Největší soubory (po deskách D2)

Výstup `npm run check:size`: varování 0, chyb 0 (624 souborů).

| Řádky | Soubor |
|---|---|
| 248 | apps/sandbox/src/render/overlay.ts |
| 246 | apps/sandbox/src/interaction/tools/select/select-tool.ts |
| 244 | apps/sandbox/src/session/session.ts |
| 242 | apps/sandbox/e2e/koty-trvale.spec.ts |
| 235 | apps/sandbox/src/interaction/tools/wall-tool.ts |
