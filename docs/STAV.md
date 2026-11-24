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
- Testy: jádro a nástroje 281 (Vitest), prohlížeč 67 (Playwright), vše zelené.

## Rozhodl Code (k potvrzení)

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

- Uživatel vyzkouší skupinu A na webu a pošle případné další chyby stěn; pak kóty (rozhodnuto: nejdřív
  stěny, potom kóty), potom krok 4.

## Otevřené

- Připojení AI přes MCP (etapa 6): server nad jádrem a souborem projektu, nástroje Undo / Redo, uložení.

- Krok 4 (zobrazení v sandboxu): přepínač stylu, panel Vrstvy, skupiny anotací, nový pohled, měřítko.
- Skupina zarovnaných kót zatím nedrží společnou polohu čáry po změně geometrie (kóty 4, druhá věta):
  poloha čáry je odsazení od středu líce, po prodloužení stěny se řada může rozejít. Návrh: uložit polohu
  skupiny v modelu (nová verze schématu + migrace) – k rozhodnutí.
- Jemná podrobnost (= střední); obtékání omítky v rozích různých typů; přerušení šrafy hostitele v T.

## Největší soubory (po skupině A)

Výstup `npm run check:size`: varování 0, chyb 0 (219 souborů). Rozděleno: `select/wall-modes.ts` →
`click-or-drag.ts` + `node-mode.ts` + `wall-modes.ts`; `e2e/prikazy.spec.ts` → + `e2e/uzly.spec.ts`.

| Řádky | Soubor |
|---|---|
| 244 | apps/sandbox/src/ui/PropertiesPanel.tsx |
| 220 | apps/sandbox/src/interaction/tools/wall-tool.ts |
| 211 | apps/sandbox/e2e/koty-trvale.spec.ts |
| 192 | apps/sandbox/e2e/koty-docasne.spec.ts |
| 192 | apps/sandbox/src/interaction/tools/commands/edit-tools.ts |
