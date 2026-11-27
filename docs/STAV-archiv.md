# BIM-light – archiv hotových kroků (do desek, 2026-11-26 – 27)

Přesunuto z `docs/STAV.md` (základ 33: STAV.md přerostl ~40 KB; rozdělení schválil uživatel 2026-11-27).
Aktuální stav, rozhodnutí k potvrzení a další krok jsou dál v `docs/STAV.md`.

## Hotovo (starší)

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
