# BIM-light – instrukce pro Claude Code: etapa 0 (pískoviště)

Stav: připraveno 2026-11-24 (doplněno o základ 33, velikost souborů; rozhodnutí rozdělena na 4 soubory), k vložení do Claude Code. Před spuštěním musí být v repu `smatli42-cmd/BIM-light` složka `docs/` se všemi 9 dokumenty z projektu (4× `rozhodnuti-*`, `pravidla-interakce`, `katalog-pohledy-styly-zobrazeni`, `katalog-kresleni-sten-kotovani`, `postup-etapy`, `checklist-dps`) a `docs/reference/prototyp-interakce.html`.
Doporučený model: **Krok 2 (jádro, architektura) Opus 5.5**, kroky 1, 3 a 4 Sonnet 5.5 (kód podle podrobných pravidel; levnější na limity). Pro každý krok nová session.

---

# BIM-light, etapa 0: pískoviště (stěny, kóty, zobrazení)

## Kdo jsem a jak spolu pracujeme
- Jsem architekt, programovat se teprve učím. Piš česky, stručně, bez zbytečné terminologie; odborný pojem vysvětli jednou větou.
- Stavíme vlastní lehký BIM program (web, později desktop). Teď pískoviště: jen stěny, kóty a zobrazení, ale hned správně podle základů, aby se z něj nic nemuselo přepisovat.
- Neptej se po kouskách. Když je chování nejasné, vyber standard z Revitu / Archicadu, zapiš to do `docs/STAV.md` do sekce „Rozhodl Code (k potvrzení)“ a pokračuj.
- Standardní chování BIM programů dělej rovnou celé, ne po částech; doladí se detaily.
- Nedívej se do repa zaměřování (smatli42-cmd/zamerovani), jeho chování je jiné.

## Povinné čtení (v tomto pořadí, před prvním řádkem kódu)
1. `docs/rozhodnuti-bim-light.md`: základy 1–33 (sekce „Základy od prvního dne“) jsou závazné; je tam i rejstřík, který říká, v kterém souboru je která sekce (`docs/rozhodnuti-koncepce-model-zobrazeni.md`, `rozhodnuti-prvky-stavby.md`, `rozhodnuti-platforma-ui-vystupy.md`). Ty si přečti, když pracuješ na dané věci (zobrazení → sekce 4, kreslení a kóty → sekce 16, ukládání → 17). Odkazy typu „sekce 16“ v ostatních dokumentech platí dál; číslování sekcí se dělením nezměnilo, rejstřík ukáže soubor.
2. `docs/pravidla-interakce-bim-light.md`: základ 25 a celé chování interakce (kóty, výběr, příkazy).
3. `docs/katalog-pohledy-styly-zobrazeni.md`: základy 26–32 (pohled, styl, vrstvy, skupiny anotací, grafické přepisy, měřítko, pera).
4. `docs/katalog-kresleni-sten-kotovani.md`: kreslení stěn a přichytávání (části 1–7).
5. `docs/postup-etapy-bim-light.md`: etapa 0 a metoda práce. `docs/checklist-dps-bim-light.md` jen projdi.
6. `docs/reference/prototyp-interakce.html`: klikací prototyp jako ZADÁNÍ CHOVÁNÍ. Je na zahození: kód nekopíruj, napiš vše čistě v TypeScriptu. Použij ho na okrajové případy a jako zdroj scénářů do testů.
Když `docs/` neexistuje nebo něco chybí, zastav se a napiš mi, co mám do repa nahrát.

Přednost při rozporu: pravidla-interakce > katalog-pohledy-styly-zobrazeni > katalog-kresleni-sten-kotovani > starší části rozhodnutí (sekce 4 je upřesněna katalogem pohledů a stylů). Dvě opravy oproti prototypu a starším textům: **kóty a popisky patří podlaží a mají skupinu anotací** (ne pohledu, prototyp je měl v modelu bez skupiny), a **měřítko mění jen tloušťky čar** (texty, značky a šrafy mají pevnou velikost na papíře).

## Technologie a struktura
- TypeScript (strict), Vite, Preact, canvas 2D v sandboxu, Vitest, Playwright, ESLint + Prettier, npm workspaces, Node LTS. Funguje na Windows i Linuxu, vše přes `npm run`.
- `packages/core`: BEZ DOM a bez API prohlížeče (základy 9, 13). `apps/sandbox`: web. Dál `docs/`, `tools/` a `.github/workflows/`.
- Jádro vrací kresbu jako seznam primitiv (čáry, výplně, šrafy, texty) s číslem pera, barvou a typem čáry; sandbox je překládá na pixely. Jádro nezná canvas ani milimetry čáry (základy 4, 11, 32).
- **Struktura po prvcích (základ 33):** každý druh věci má vlastní složku v `packages/core/src/` (např. `wall/`, `dimension/`, `view/`, `style/`, `commands/`, `snap/`, `selection/`), uvnitř menší soubory podle odpovědnosti (data, výpočty geometrie, příkazy, kreslení, testy vedle). `index.ts` ve složce jen exportuje. Nový prvek v budoucnu = nová složka, ne další řádky do velkého souboru.

## Velikost souborů (základ 33): BIM-light bude velký program, hlídej to od prvního dne
- **Limity:** zdrojový soubor (včetně testů) cíl do 250 řádků, tvrdý limit 400; funkce cíl do 50 řádků. Jeden soubor = jedna odpovědnost. Dokumenty v `docs/` do ~40 KB nebo 500 řádků, `CLAUDE.md` do 150 řádků. Datové knihovny (šrafy, symboly, předvolby) po jednom souboru na skupinu.
- **Automatická kontrola už v kroku 1:** skript `tools/check-size.mjs` a příkaz `npm run check:size`. Počítá řádky všech `.ts`, `.tsx`, `.md` (mimo `node_modules`, `dist`, `docs/reference/`, vygenerované soubory). Nad 250 řádků vypíše varování, nad 400 skončí chybou. Běží před každým commitem (pre-commit hook, např. husky) a v GitHub Actions; při chybě build neprojde.
- **Výjimky** jsou jen v `tools/size-exceptions.json` (soubor, limit, důvod). Přidat výjimku smíš jen s mým souhlasem; navrhni ji do `docs/STAV.md`.
- **Dělej to průběžně, ne na konci:** když soubor při práci přeroste 250 řádků, rozděl ho hned v téže session (čisté přesunutí bez změny chování, testy musí zůstat zelené, samostatný commit „rozdělení …“). Nečekej na chybu při 400.
- **Na konci každého kroku** vypiš do `docs/STAV.md` pět největších souborů s počtem řádků a varování z kontroly. Do `CLAUDE.md` přidej tato pravidla.
- Dokumenty v `docs/` nerozděluj sám (měň je jen na můj pokyn); když některý překročí limit, napiš mi to do `docs/STAV.md` a navrhni rozdělení podle sekcí.

## Pravidla práce
- Na začátku každé session přečti `CLAUDE.md` a `docs/STAV.md`. Na konci každého kroku aktualizuj `docs/STAV.md` (hotovo, rozhodl Code k potvrzení, otevřené, největší soubory).
- `CLAUDE.md` (max ~150 řádků): zkrácený seznam všech 33 základů (číslo, jedna věta, odkaz na dokument), odkaz na rejstřík sekcí v `docs/rozhodnuti-bim-light.md` (kdo hledá sekci, najde soubor), pravidla práce z tohoto textu a jak spustit testy. Je to hlavní paměť projektu.
- Malé commity, česky, jedna věc. Pracuj na větvi main, CI běží při každém pushi.
- Každé pravidlo z dokumentů = test; název testu začíná odkazem na zdroj (např. „pravidla-interakce / kóty 5: …“). Oprava chyby = nejdřív test, který ji chytí.
- Žádné pevné milimetry čar, barvy ani šrafy v generátorech: vždy přes funkci grafiky (základy 11, 32). Žádný přímý přístup k souborům z jádra (základ 13).
- Rozhodnutí v `docs/` měň jen na pokyn uživatele.
- Repo je veřejné: žádná hesla, klíče ani reálná data klientů; ukázková data jen vymyšlená.
- V této etapě NEDĚLEJ: nástroj na kreslení oblouku (jen data a výpočty), okna a dveře, okótování celé stěny, Elektro, 3D, export IFC, UI pro import a export stylů (jen schéma a test JSON).

## Krok 1: kostra
- Monorepo, strict tsconfig, ESLint + Prettier, `npm run dev`, `npm run test` (Vitest), `npm run test:e2e` (Playwright, Chromium), **`npm run check:size`** (viz výše, včetně pre-commit hooku).
- GitHub Actions: při pushi typecheck, lint, kontrola velikosti, testy; po zelených testech nasazení `apps/sandbox` na GitHub Pages. Napiš mi přesně, kam v nastavení repa kliknout (Settings → Pages → Source: GitHub Actions).
- `CLAUDE.md`, `docs/STAV.md`, `README.md` (česky, do 10 řádků).
- Stránka „BIM-light sandbox“ s prázdným plátnem, dostupná na Pages.

## Krok 2: jádro (packages/core, bez UI)
Po tomto kroku se ZASTAV: vypiš datové typy, příkazy, strukturu složek, největší soubory a výsledek testů a počkej na schválení architektury.
- **Model ve tvaru IFC** (základy 1–3): Projekt → Budova → Podlaží → prvek; GlobalId; kategorie, profese, stav (stávající / bourání / nový), varianta (hlavní model); data 3D (výška, odsazení); jednotky mm; SCHEMA_VERSION a migrace; ukládání jako JSON přes rozhraní `Platform` (v jádře jen rozhraní a implementace v paměti).
- **Stěna:** typ = seznam výškových pásů, pás = seznam vrstev (materiál, tloušťka, funkce); první verze jeden pás a jedna vrstva, tvar dat ale umí víc (základ 10). Referenční čára osa / líc / líc jádra, výchozí vnitřní líc, tloušťka doleva od směru kreslení. Tvar přímá nebo oblouk (data a výpočty líců pro oba, základ 23). Výška vázaná na podlaží (základ 12). Napojení stěn jako uložený vztah (základ 24, ATSTART / ATEND / ATPATH). Materiál s šrafou a prioritou napojování (jen data).
- **Příkazy** (základ 6): registr příkazů s názvem, popisem a parametry jako JSON schéma; `execute`, undo / redo; každý commit = snapshot + validace zámků kót; žádná jiná cesta do dat. Registr slouží i pro tlačítka a budoucí AI (základ 15). Každý příkaz vlastní malý soubor.
- **Zobrazení** (základy 26–32, 4, 5, 11): datové typy Vrstva, Kombinace vrstev, Pravidlo, Kombinace přepisů, Styl, Pohled, Skupina anotací, Tabulka tlouštěk čar, Kóta (patří podlaží, má skupinu, zámek je omezení modelu a platí i ve skryté skupině). Předvolby stylů Studie a Projekt. Výchozí tabulka pera: řada ISO 128, 7 per (0,13 / 0,18 / 0,25 / 0,35 / 0,5 / 0,7 / 1,0 mm), stejná ve všech měřítcích (1:20, 1:50, 1:100, 1:200, 1:500); výchozí přiřazení per podle katalogu. Funkce grafiky = pevné pořadí 6 pater přepisů, vrací i „proč“ (patro a pravidlo). Generátor stěny: hrubá podrobnost (obrys + jedna výplň) a střední (čáry vrstev + šrafa materiálu). Měřítko mění jen tloušťky čar. Export a import nastavení zobrazení jako JSON se schématem (test: export → import dá stejná data).
- **Průřezová pravidla na jednom místě** (základ 7): tabulka „pravidlo × typ prvku“ pro kóty, zámky, přichytávání, posuny, mazání a hostitele; zatím jeden typ prvku (stěna), struktura ale připravená na další.
- **Testy:** geometrie stěn (líce, tloušťka, rohy, T napojení, oblouk), příkazy a undo, zámky, uložení / načtení, migrace, funkce grafiky (pořadí pater, přepis prvku vyhraje, „proč“), tabulka pera, skupiny kót, všechny scénáře z dokumentů, které jdou bez UI. Testy dělené do souborů podle zdroje pravidla.

## Krok 3: interakce v sandboxu (apps/sandbox)
Udělej CELÉ standardní chování naráz podle `pravidla-interakce` a `katalog-kresleni-sten-kotovani`, včetně položek označených jako „chybí“ v kontrolním seznamu pravidel:
- **Kreslení stěny:** tracker u kurzoru, Tab mezi délkou a úhlem, řetěz stěn, uzavření obrysu, mezerník přehodí stranu (i u vybrané stěny), úhel vůči předchozí stěně (90° = zatáčka doprava), kroky 0° / 90° / 45°, zaokrouhlení na 10 mm bez přichycení, přesné zadané číslo.
- **Přichytávání** a pomocné značky (světle modré).
- **Výběr:** klik, rámeček zleva doprava (celé) a zprava doleva (protnuté), Shift, Ctrl+A, výběr kót rámečkem a hromadné smazání.
- **Základ 25:** vybraná entita se pohybuje, vše ostatní stojí, i při umísťování kót. Při změně délky stěny se pohne uchopený konec.
- **Dočasné a trvalé kóty:** zámek jen klikem na zámek, nová kóta na myši, zarovnání a skupiny, řetěz jako v Revitu, EQ, úhlová kóta, přepis textu, více kót na stejném prvku.
- **Příkazy:** posun, kopie, otočení, zrcadlení, pole, ořez do rohu, rozdělení, zarovnání, obdélník, zoom na výběr; Undo / Redo; schránka.
- **Regresní testy z prototypu** (chyby, které jsme už chytili):
  - při výběru dvou protilehlých stěn se hýbe jen vybraná;
  - zámek kóty se nastaví jen klikem na zámek, nikdy změnou čísla; text v poli je čitelný;
  - nová kóta se nepřichytí sama k existující; druhá sada kót na stejném prvku se nepřilepí k první; usazená kóta se už nehýbe;
  - řetězové kóty: celý řetěz se při umísťování pohybuje spolu, klik do prázdna řetěz ukončí, klik na další líc pokračuje; kóta vznikne až po kliknutí.
- Prohlížečové testy (Playwright) na každé pravidlo z kontrolního seznamu.
- Interakce se píše po modulech (kreslení, přichytávání, výběr, kóty, příkazy každé zvlášť), ne jako jeden velký soubor sandboxu.

## Krok 4: zobrazení v sandboxu
- Přepínač stylu nahoře (Studie, Projekt), ukazatel „styl (upraveno)“ s tlačítkem Vrátit, panel Vrstvy (oko, zámek, „Uložit jako styl“), aktivní skupina anotací, nový pohled (podlaží + styl + měřítko), změna měřítka.
- Studie kreslí stěny hrubě, Projekt střední podrobností; kóta vytvořená ve Studii je v Projektu skrytá a po návratu beze změny.
- Testy podle katalogu (část „První pískoviště“: testy).

## Konec etapy
Krátká zpráva: co je hotové, co zkusit (nejvýš 5 kroků s adresou na Pages), co je otevřené, pět největších souborů. Aktualizuj `docs/STAV.md`.
