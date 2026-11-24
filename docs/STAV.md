# BIM-light – stav práce

Aktualizuje Claude Code na konci každého kroku. Poslední změna: 2026-11-24, etapa 0 / krok 2 (jádro).

## Hotovo

### Krok 1 – kostra (2026-11-24)
- Monorepo (npm workspaces): `packages/core` (jádro bez DOM) a `apps/sandbox` (Vite + Preact, prázdné plátno).
- TypeScript strict, ESLint + Prettier, Vitest, Playwright (Chromium).
- ESLint hlídá, že jádro nevolá prohlížeč, disk ani UI (základy 9, 13) a že funkce mají do 50 řádků (varování).
- Kontrola velikosti souborů `npm run check:size` (pre-commit hook i CI).
- GitHub Actions: kontroly, testy, e2e, sestavení, nasazení na Pages: https://smatli42-cmd.github.io/BIM-light/

### Krok 2 – jádro bez UI (2026-11-24) – čeká na schválení architektury
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

## Rozhodl Code (k potvrzení)

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

## Otevřené

- Schválení architektury kroku 2 (datové typy, příkazy, struktura složek) – pak krok 3 v nové session.
- Krok 3 doplní v jádře příkazy: kopie, zrcadlení, pole, ořez do rohu, zarovnání, obdélník, Rozdělit
  rovnoměrně (EQ) a službu přichytávání a výběru (zásahy do kresby, kandidáti podle tabulky pravidel).
- Napojení vrstev v rozích podle priority materiálů (data jsou připravená); přerušení čáry hostitele v T.
- Jemná podrobnost zatím kreslí jako střední.

## Největší soubory (po kroku 2)

Výstup `npm run check:size`: varování 0, chyb 0 (123 souborů).

| Řádky | Soubor |
|---|---|
| 162 | packages/core/src/dimension/dimension.test.ts |
| 156 | packages/core/src/style/package-schema.ts |
| 153 | packages/core/src/commands/view/view.ts |
| 146 | packages/core/src/view/view.test.ts |
| 143 | packages/core/src/style/types.ts |
