# BIM-light – stav práce

Aktualizuje Claude Code na konci každého kroku. Poslední změna: 2026-11-24, etapa 0 / krok 3 – opravy závad po vyzkoušení.

## Hotovo

### Krok 1 – kostra (2026-11-24)
- Monorepo (npm workspaces): `packages/core` (jádro bez DOM) a `apps/sandbox` (Vite + Preact, prázdné plátno).
- TypeScript strict, ESLint + Prettier, Vitest, Playwright (Chromium).
- ESLint hlídá, že jádro nevolá prohlížeč, disk ani UI (základy 9, 13) a že funkce mají do 50 řádků (varování).
- Kontrola velikosti souborů `npm run check:size` (pre-commit hook i CI).
- GitHub Actions: kontroly, testy, e2e, sestavení, nasazení na Pages: https://smatli42-cmd.github.io/BIM-light/

### Krok 2 – jádro bez UI (2026-11-24)
- **Model ve tvaru IFC** (`model/`): Projekt → Budova → Podlaží → prvek, GlobalId (22 znaků IFC), kategorie,
  profese, stav, varianta, typ + instance, výška vázaná na podlaží, georeference, `SCHEMA_VERSION`.
- **Stěna** (`wall/`): typ = výškové pásy × vrstvy (materiál, tloušťka, funkce), referenční čára líc / osa /
  líc jádra, tloušťka doleva, tvar úsečka nebo oblouk, napojení jako uložený vztah ATSTART / ATEND / ATPATH,
  rohy (pokos) a T napojení, natahování napojených stěn, kresba hrubá a střední.
- **Kóty** (`dimension/`): vzdálenost líců, délka líce, úhel; patří podlaží, mají skupinu anotací, zámek,
  přepis textu, skupinu zarovnání. Kresba podle ČSN (čárky, odkazové čáry, číslo nad čarou).
- **Zámky** (`constraints/`): jeden kontrolor; změna porušující zamčenou kótu se odmítne s vysvětlením.
- **Příkazy** (`commands/`): registr (název, popis, skupina, zkratka, JSON schéma), editor s Undo / Redo,
  38 příkazů (podlaží, stěny, kóty, pohledy, styly, import, pera). Popis nástrojů pro AI z registru.
- **Zobrazení** (`style/`, `view/`): vrstvy, kombinace vrstev, pravidla, kombinace přepisů, styly Studie
  a Projekt, pohled, tabulka per ISO 128, funkce grafiky 6 pater s „proč“, fáze jako pravidla,
  export / import balíčku zobrazení (JSON, schéma, verze, migrace).
- **Průřezová pravidla** (`rules/`): tabulka pravidlo × typ prvku (stěna, kóta); řídí mazání a výběr.
- **Ukládání** (`persistence/`): rozhraní `Platform`, platforma v paměti, bezpečný zápis, datované verze,
  migrace.
- Testy: 123 (jádro + nástroje), dělené podle zdroje pravidla; nový hlídač „generátory bez pevných barev a per“
  (`tools/generator-rules.test.mjs`).

### Krok 3 – interakce v sandboxu (2026-11-24)
- **Jádro doplněno:** služba přichytávání (`snap/`: konec → průsečík → střed → líc / kolmo → osa podle tabulky
  pravidel, C střídá, úhlové kroky, pomocné čáry, 10 mm, tracker), služba výběru (`selection/`: zásah, Tab,
  rámeček celé / protnuté, filtr kategorií), dočasné kóty a zarovnání kót (`dimension/temporary.ts`, `align.ts`).
- **Nové příkazy jádra:** `wall.copy` (kopie, pole, radiální pole, otočení s kopií, zrcadlení, nahrazení),
  `wall.paste`, `wall.trimToCorner`, `wall.align`, `wall.rectangle`, `wall.deleteNode`, `selection.delete`,
  `dimension.place`, `dimension.createSet` (řada kót = jeden krok Undo), `dimension.flipSide`,
  `dimension.equalize` (EQ); `wall.moveEndpoint` umí napojit přitažený konec.
- **Sandbox** (`apps/sandbox/src/interaction/`, po modulech): Výběr (klik, Shift, rámeček, Tab, Ctrl+A, Del,
  tažení výběru, uzly, líce, nabídky na pravém tlačítku), Stěna (řetěz, tracker, Tab, Enter, uzavření,
  Backspace, mezerník), Stěna z čáry, Kóta (řetěz jako v Revitu), Úhel, Přesun, Kopie, Otočit, Zrcadlit,
  Pole, Zarovnat, Do rohu, Rozdělit, Obdélník, Okno, Vložit; Undo / Redo, schránka, šipky, Home, Z.
- **Vykreslení:** kresba z jádra (pera přes tabulku per, šrafy a texty na papíře), pomocné značky světle modře.
- **Testy:** jádro + nástroje 164 (Vitest), prohlížeč 62 (Playwright) podle kontrolního seznamu pravidel
  a regresí z prototypu.

### Krok 3 – opravy závad z vyzkoušení (2026-11-24)
- **Přichytávání na protější líc:** stěna kreslená mezi dvěma stěnami drží úhlový krok (rovně / pravý úhel,
  i se Shift) i po dojetí na protější líc; bod = průsečík směru s lícem („líc + rovně“) – `snap/face-snap.ts`.
- **Zaokrouhlení 10 mm:** bod přichycený k líci se zaokrouhlí – délka stěny od předchozího bodu, bez
  předchozího bodu poloha po líci.
- **Výplň a obrys:** světle šedá výplň stěn `#d9d9d9` (Studie i Projekt, v Projektu pod šrafou), obrys černý,
  pero řezu stěny a sloupu 6 (0,7 mm, velmi tlustá podle ČSN 01 3420).
- **Pokos se nekreslí:** obrys = líce + čelo jen u volného konce (`wall/outline.ts`); v rohu ani v T se čelo
  nekreslí; šev mezi výplněmi v sandboxu zakrývá okraj výplně stejnou barvou.
- **Kóta k volnému konci:** kóta jde navázat i na čelo nepřipojeného konce (`FaceRef.face` = `start` / `end`,
  `wall/edges.ts`); změna čísla takové kóty stěnu na tomto konci prodlouží / zkrátí.
- **Referenční čára v panelu:** přepínač Líc / Osa / Líc jádra pro vybrané stěny (`wall.setReferenceLine`)
  i pro nové stěny; při změně tloušťky zůstává referenční čára na místě a stěna roste od ní.
- Testy: jádro 178 (Vitest), prohlížeč 64 (Playwright), vše zelené.

### Ovládání přes AI – doplněno (2026-11-24)
- **Dotazy jen pro čtení** (`packages/core/src/queries/`): `project.info`, `wall.list`, `wall.get`,
  `dimension.list`. Jsou v registru vedle příkazů; `toolDescriptions()` vrací obojí s příznakem `readOnly`;
  `Editor.query()` čte bez Undo.
- **Logika z UI přesunuta do jádra:** samočinné napojení konců (`wall/auto-connect.ts`: roh na volném konci,
  T na líci / ose) používá nástroj Stěna i jádro; `wall.create` má `autoConnect`; nový příkaz `wall.chain`
  (řetěz stěn po bodech, `closed` uzavře obrys) = totéž co klikání nástrojem Stěna. Vkládání sad stěn (kopie,
  schránka, obdélník) teď napojuje i T, ne jen rohy.
- **Testy z pohledu AI:** klient jen přes JSON (`testing/ai-client.ts`), scénář `ai/scenario.test.ts`
  (místnost, příčka v T, stěna s volným koncem, kóta k čelu a změna jejího čísla, tloušťka a referenční čára),
  `ai/tools.test.ts` (každý nástroj má popis a úplné schéma, čitelné chyby), hlídač `tools/ui-commands.test.mjs`
  (obrazovka používá jen příkazy z registru). Pravidlo zapsané v `CLAUDE.md`.
- Testy: jádro a nástroje 271 (Vitest).

### Stěny – skupina A (2026-11-24)
- **T napojení:** líc hostitele se v místě T přeruší (`wall/tee-gaps.ts`, obrys po kusech v `wall/outline.ts`).
- **Priorita materiálů v T:** napojená stěna projde povrchovými vrstvami a izolací hostitele s nižší prioritou
  až k jeho jádru (jádro na jádro), jádro hostitele nikdy (`teeCutOffset` v `wall/joins.ts`); přerušují se
  i hranice vrstev, kterými prochází.
- **Desetinná čísla:** tažený uzel se přichytává od pevného konce jako při kreslení (úhlové kroky, Shift,
  délka po 10 mm).
- **Dočasné kóty při tažení uzlu** (katalog 5.2): `Editor.preview()` = zkušební běh příkazu bez uložení;
  během tažení se kreslí náhled celého modelu (navazující stěny jdou s uzlem) a dočasné kóty z něj.
- **Mřížka** (katalog 2.6): ve Volbách, výchozí vypnutá, rozteč 100 mm; přichycení k uzlu mřížky má přednost
  před úhlovým krokem, konce / líce stěn před mřížkou.
- **Oprava napojení k jiné stěně:** bod ve vnějším rohu leží na lících dvou stěn; napojení v T si teď
  vybere stěnu, která není s novou rovnoběžná (`connectionAt` dostává směr nové stěny).
- **Rovné napojení** (stěny za sebou, i jiné tloušťky, i po rozdělení stěny): nový druh konce `straight`,
  kolmé ukončení; čelo se kreslí jen v části, kterou navazující stěna nezakrývá.
- Testy: jádro a nástroje 284 (Vitest), prohlížeč 68 (Playwright), vše zelené.

### Doplněk šraf a materiálů: hotovo, 2026-11-24
- **Knihovna šraf** (`packages/core/src/hatch/`): šrafa = samostatná položka (id slug, název, skupina, pořadí,
  varianta, plná, rodiny čar / značek / vlnovek v mm na papíře, verze), žádná barva. 40 šraf v pořadí z arditu,
  po souborech podle skupin (`hatch/library/`), validace při startu, nová šrafa = nový záznam.
- **Materiál** (`material/`): název, kategorie, barva (3D), šrafa (id), pero šrafy, přepsané 2D barvy, průhledný
  ve 3D, priorita protínání, poznámka. 2D barvy se odvozují z barvy (`material/colors.ts`). Použití se počítá.
  15 výchozích materiálů. Projekt drží kopie použitých šraf s odkazem na původ (`display.hatches`).
- **Migrace:** projekt 1 → 2 a balíček zobrazení 1 → 2 (`hatch/migrate-v1.ts`); staré vzory → id šraf.
- **Grafika:** primitivum šrafy {polygon, šrafa, pero, barva čar, barva výplně, počátek rastru}; střední
  podrobnost kreslí vrstvy s výplní a šrafou materiálu, hrubá jednu výplň. Přepis šrafy pravidlem / prvkem
  ({hatchId, pen, lineColor, fillColor}) doplní kopii šrafy do projektu.
- **Příkazy:** `material.create / duplicate / update / delete` (použitý jen s náhradou),
  `wallType.setLayerMaterial`; dotazy pro AI `hatch.list`, `material.list`.
- **Sandbox:** pravý panel se záložkami Vlastnosti / Materiály / Šrafy; knihovna šraf (mřížka náhledů, barva
  náhledu), panel Materiály (hledání, rozbalení s poli z popisu parametrů, Použití, Duplikovat, Smazat),
  u vybrané stěny materiály vrstev typu.
- Testy: jádro a nástroje 316 (Vitest), prohlížeč 71 (Playwright).

#### Šrafy (návrh, k porovnání s arditem; rozměry mm na papíře)
| # | Šrafa | Vzhled |
|---|---|---|
| 1 | bez šrafy | nic |
| 2 | Obecné | šikmé čáry 45°, 3 mm |
| 3 | Terén (zemina) | čárkované šikmé 45° (3 / 1,2), 2 mm |
| 4 | Zásypy a násypy | řídké čárky 45° + tečky v rastru 1,5 mm |
| 5 | Zeminy – kamenivo (var. 3) | terén + kroužky 3 mm |
| 6 | Zeminy – čárky (var. 3) | krátké čárky 45° |
| 7 | Zeminy – šipky (var. 3) | terén + šipky 45° |
| 8 | Štěrk | kroužky v rastru s posunem řad |
| 9 | Beton vyztužený | prostý beton + šikmé čáry 45°, 2,5 mm |
| 10 | Beton nevyztužený | tečky + malé trojúhelníky |
| 11 | Beton – kroužky (var. 10) | tečky + kroužky |
| 12 | Beton – trojúhelníky (var. 10) | husté trojúhelníky |
| 13 | Beton – čárkovaná s kroužky (var. 10) | čárkované 45° + kroužky |
| 14 | Zdivo | šikmé čáry 45°, 2 mm |
| 15 | Zdivo – mřížka | 45° + 135°, 2 mm |
| 16 | Zdivo – čárkovaná (var. 14) | čárkované 45° |
| 17 | Zdivo – hustá mřížka | 45° + 135°, 1 mm |
| 18 | Zdivo – svislice a šikmé (var. 14) | svislé + 45° |
| 19 | Dílce | svislé čáry 3 mm |
| 20 | Dřevo | vodorovná vlnovka |
| 21 | Sendvičové konstrukce | vodorovné + 45° |
| 22 | Sendvič – křížky (var. 21) | vodorovné + křížky |
| 23 | Sendvič – kroužky (var. 21) | vodorovné + kroužky |
| 24 | Tepelná izolace | cik-cak |
| 25 | Izolace obecná | kosočtverce (60° + 120°) |
| 26 | Akustická izolace | vlnovka |
| 27 | Izolace – plástve (var. 24) | šestiúhelníky |
| 28 | Izolace – trojúhelníky (var. 24) | trojúhelníky |
| 29 | Izolace – kroužky (var. 24) | kroužky |
| 30 | Izolace proti vodě | plná (vyčerněná) |
| 31 | Kámen | 30° + čárkované 120° |
| 32 | Kovy | jemné 45°, 1 mm |
| 33 | Sklo | krátké řídké čárky 45° |
| 34 | Ploché sklo | vodorovné 1 mm |
| 35 | Omítky, sádra, stěrky | husté tečky |
| 36 | Sádrokarton | jemné čárkované 45° |
| 37 | Anhydrit | malé trojúhelníky + tečky |
| 38 | Plasty, pryž | 45° + čárkované 135° |
| 39 | Bourané konstrukce | čárkovaná mřížka 45° + 135° |
| 40 | Krytina | vodorovné 1,2 mm |

## Rozhodl Code (k potvrzení)

Doplněk šraf a materiálů:
- **Velikost šrafy na obrazovce:** podle zadání stejný koeficient jako tloušťky čar (mm papíru × 96/25,4 px),
  šrafa se tedy se zoomem nemění (dřív se zvětšovala). Kreslí se přímo čarami a značkami oříznutými
  mnohoúhelníkem, ne dlaždicí: obecné úhly a značky se do svislé dlaždice nevejdou bez chyb.
- **Odvození 2D barev:** výplň = barva smíchaná 65 % s bílou, čáry = 70 % s černou (`material/colors.ts`).
- **Výchozí priority:** Kov 80, Železobeton 70, Beton a potěry 60, Anhydrit 55, Zdivo 50, Dřevo 40,
  Sklo a Ostatní 30, Izolace 20, Sádrokarton 15, Omítky 10, Zemina 5.
- **Šrafy jsou v nastavení zobrazení** (`display.hatches`), proto jsou součástí balíčku (základ 31); import
  „nahradit“ vezme importované, „ponechat obě“ nechá projektové (id je stabilní slug).
- Styl Projekt už nemá šedou výplň stěny: výplň a šrafu dává materiál vrstvy (fillColor null = z materiálu).
  Studie má dál světle šedou jednu výplň bez šrafy.
- Šrafa rodiny vlnovka má navíc tvar sinus / cik-cak (izolace potřebuje cik-cak).
- Změna materiálu vrstvy u vybrané stěny mění typ (všechny stěny typu); úplný editor skladby je krok Z1.


Opravy závad kroku 3:
- **Pero řezu stěny 6 (0,7 mm)** místo 5 (0,5) podle pokynu „tučné podle ČSN“. Katalog pohledů (Tloušťky čar)
  zatím uvádí „velmi tlustá = pero 5“ – k potvrzení, případně upravit dokument.
- Šedá výplň je i v Projektu pod šrafou materiálu (ne jen ve Studii).
- Čelo konce, který se později napojí, se v kótě dál měří jako čára mezi konci líců (kóta nezmizí).
- Délka stěny s nepřipojeným koncem se kótuje nástrojem Kóta: čelo volného konce + rovnoběžný líc (např. líc
  stěny v rohu na druhém konci). Kóta typu „délka“ přímo na čelo nejde (měřila by jen tloušťku).
- Při kreslení s referenční čárou Osa leží kliknutá čára uprostřed stěny; Stěna z čáry a Obdélník berou dál líc.

Skupina A:
- Napojená stěna v T končí na jedné čáře pro všechny své vrstvy (i její omítka dojde k jádru hostitele).
  Šrafa omítky hostitele se v místě T zatím nepřerušuje (je pod výplní; doladí se s jemnou podrobností).
- Rohy mezi stěnami různých typů zůstávají pokos přes celou tloušťku (u stejných typů to dává vrstvu na
  vrstvu); obtékání omítky kolem rohu u různých typů – s jemnou podrobností.
- **Jemná podrobnost** se podle katalogu pohledů („Jemná: později“) nedělá; kreslí jako střední.
- Mřížka: světle modrá, čára se skryje pod 8 px, každá desátá výraznější.

Ovládání přes AI:
- `wall.create` napojuje samočinně jen s `autoConnect: true` (výchozí ne, aby AI mohla stěnu položit i bez
  napojení); `wall.chain` napojuje vždy.
- Dotazy vracejí souřadnice a délky zaokrouhlené na 0,1 mm.
- Undo / Redo pro AI zatím není nástroj (je to funkce editoru, ne příkaz); přijde s připojením přes MCP.

Krok 1:
- Dokumenty v `docs/` nad limit dávají v `check:size` jen varování; `CLAUDE.md` nad 150 řádků je chyba.
- Kontrola velikosti počítá `.ts`, `.tsx`, `.md`; skripty `.mjs` v `tools/` ne.
- Sandbox běží i lokálně na `/BIM-light/`; e2e testy běží proti sestavené stránce (port 4317).
- Jádro se do sandboxu načítá ze zdrojů TypeScriptu; CI běží na Node LTS, lokálně Node 22+.

Krok 2:
- **Oblouk** se ukládá jako začátek, konec a „bulge“ = tan(středový úhel / 4) (zvyklost DXF); do IFC se
  převede na IfcTrimmedCurve.
- **Vrstvy v typu** jsou seřazené od referenční strany ke straně tloušťky. „Líc jádra“ = začátek první vrstvy jádra.
- **Půdorys** bere pás typu v rovině řezu 1000 mm nad podlažím.
- **Konce stěn** mají souřadnice na každé stěně a navíc uložený vztah; po změně se napojené konce dopočítají
  podle vztahu (ne podle shody souřadnic). Roh = pokos (průsečík líců), T = konec utnutý na bližším líci
  hostitele; čára hostitele se v T zatím nepřerušuje (doladí se s prioritou materiálů).
- **Změna délky:** kolmá stěna napojená v rohu se posune celá (jako prototyp), rovnoběžná se natáhne.
  Tažení uzlu: stěny v rohu jdou za ním; konec tažený mimo hostitele T napojení vztah zruší.
- **Délková kóta** měří líc po oříznutí v rozích (jako prototyp).
- **Změna tloušťky** mění první vrstvu jádra; nový typ se jmenuje „název bez čísla + tloušťka“ (Zdivo 450).
- **Zámky:** tolerance 0,5 mm a 0,05°. Kontrolor po každém příkazu jen ověří a případně odmítne; skutečné
  dopočítávání vazeb (řešič) přijde, až bude potřeba.
- **Undo:** snímek = předchozí neměnný model, nejvýš 200 kroků; otevření souboru historii smaže.
- **Přepnutí stylu** zruší místní úpravy a vrátí aktivní skupinu anotací na výchozí stylu. Měřítko pohledu
  se nemění (styl dává výchozí měřítko jen novému pohledu).
- **Měřítko mimo sloupce** tabulky per vezme nejbližší sloupec (poměrově: 1:75 → 1:100, 1:60 → 1:50).
- **Studie:** výplň stěny #3d3d3d, obrys #8a8a8a. **Šrafy:** vlastní knihovna vzorů, rozteče na papíře odhadem.
- **Fáze:** pravidla Stávající černě, Bourání žlutě čárkovaně, Nové červeně, Skrýt nové, Skrýt bourané
  a kombinace „Fáze – stávající / bourací práce / nový / srovnávací“ + „Bez přepisů“. Skrytí = efekt
  `visible: false` v pravidle.
- **Pravidla:** všechny podmínky musí platit (A); operátory rovná se / nerovná se / je v seznamu.
- **Import balíčku:** shoda podle názvu; „nahradit“ zachová id (pohledy dál fungují); při „ponechat obě“
  zůstane tabulka per, výchozí grafika a velikosti projektu.
- **Varianty:** kreslí se zatím jen hlavní model; příkaz zapisuje do varianty, kterou má editor nastavenou.
- ESLint: proměnné začínající `_` jsou záměrně nepoužité; v testech je povolené `!`.

Krok 3:
- **Tloušťka čáry na obrazovce** je stálá (pero × měřítko → mm na papíře × 96/25,4 px), se zoomem se nemění
  (jako Revit); texty a šrafy jsou na papíře, takže se se zoomem zvětšují.
- **Nová kóta se nese na myši a vznikne až kliknutím** (náhled není v modelu); řada kót = jeden příkaz
  `dimension.createSet` = jeden krok Undo. Po usazení řady zůstává nástroj Kóta aktivní (Esc = Výběr).
- **Zarovnání kót** se nabízí do 12 px od čáry rovnoběžné kóty (a do 5 m podél); zarovnaná kóta jde do skupiny.
  Kolečko u dočasné kóty dává kótu bez zarovnání v místě myši (regrese: nepřichytí se sama).
- **Klik na číslo trvalé kóty** výběr nemění, jen otevře pole; pohne se stěna vybraná v okamžiku kliknutí.
  Klik na čáru kóty kótu vybere.
- **Líc vybrané stěny má při tažení přednost** před čárou dočasné kóty, která na něm začíná.
- **Tažení stěny myší** posouvá celý výběr; vektor se zaokrouhluje na 10 mm (Alt = bez zaokrouhlení).
- **Délková dočasná kóta** leží na straně referenčního líce (do místnosti); trojúhelník u ní volí konec, který
  se hýbe při zadání čísla; tažení uzlu tento konec nastaví.
- **Kopie** napojí konce, které padnou na volný konec jiné stěny (roh). Zrcadlení přehodí stranu tloušťky.
- **Pole:** počet včetně originálu (výchozí 3); lineární = rozteč, radiální = úhel mezi kopiemi.
- **Otočit kopii:** volba v panelu nebo Ctrl při posledním kliku. **Ctrl+D** = do schránky a hned vkládat.
- **„Vybrat čáru → stěna“** = nástroj Stěna z čáry (V): klik na líc vytvoří stěnu po něm. Až budou 2D čáry
  (základ 22), bude brát i je.
- **Odmítnutá změna kvůli zámku:** hláška s tlačítkem „Odemknout kótu“, bránící kóty červeně.
- **Osa** je kandidát přichycení s nejnižší prioritou (sama jen tam, kde v dosahu nic jiného není).
- Prohlížečové testy ovládají sandbox přes `window.__bim` (čtení modelu, mm → px, příprava scény příkazy).

## Další krok

- Uživatel porovná knihovnu šraf s arditem (záložka Šrafy). Pak podle `instrukce-code-srafy.md`: krok 4
  etapy 0 (zobrazení v sandboxu), potom stěny Z1 (`instrukce-code-steny.md`).

## Otevřené

- Připojení AI přes MCP (etapa 6): server nad jádrem a souborem projektu, nástroje Undo / Redo, uložení.

- Krok 4 (zobrazení v sandboxu): přepínač stylu, panel Vrstvy, skupiny anotací, nový pohled, měřítko.
- Skupina zarovnaných kót zatím nedrží společnou polohu čáry po změně geometrie (kóty 4, druhá věta):
  poloha čáry je odsazení od středu líce, po prodloužení stěny se řada může rozejít. Návrh: uložit polohu
  skupiny v modelu (nová verze schématu + migrace) – k rozhodnutí.
- Jemná podrobnost (= střední); obtékání omítky v rozích různých typů; přerušení šrafy hostitele v T.

## Největší soubory (po doplňku šraf a materiálů)

Výstup `npm run check:size`: varování 0, chyb 0 (255 souborů).

| Řádky | Soubor |
|---|---|
| 246 | apps/sandbox/src/ui/PropertiesPanel.tsx |
| 222 | apps/sandbox/src/interaction/tools/wall-tool.ts |
| 211 | apps/sandbox/e2e/koty-trvale.spec.ts |
| 206 | apps/sandbox/e2e/kresleni.spec.ts |
| 192 | apps/sandbox/e2e/koty-docasne.spec.ts |
