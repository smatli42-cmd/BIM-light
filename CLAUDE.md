# BIM-light – paměť projektu pro Claude Code

Vlastní lehký BIM program (web, později desktop). Uživatel je architekt, programovat se učí:
piš česky, stručně, odborný pojem vysvětli jednou větou. Na začátku každé session přečti tento soubor,
`docs/pracovni-postup.md` (pokyny uživatele, jak spolu pracujeme) a `docs/STAV.md`.

## Jak spolu pracujeme

- Neptej se po kouskách. Když je chování nejasné, vyber standard z Revitu / Archicadu, zapiš to do
  `docs/STAV.md` → „Rozhodl Code (k potvrzení)“ a pokračuj.
- Standardní chování BIM programů dělej rovnou celé, ne po částech.
- Nedívej se do repa zaměřování (`smatli42-cmd/zamerovani`), jeho chování je jiné.
- Rozhodnutí v `docs/` měň jen na pokyn uživatele.
- Repo je veřejné: žádná hesla, klíče ani reálná data klientů; ukázková data jen vymyšlená.
- Malé commity, česky, jedna věc. Větev `main`, CI běží při každém pushi.
- Každé pravidlo z dokumentů = test; název testu začíná odkazem na zdroj
  (např. „pravidla-interakce / kóty 5: …“). Oprava chyby = nejdřív test, který ji chytí.
- **Vše ovladatelné přes AI (základy 6, 15):** co jde udělat myší, jde udělat jedním příkazem z registru se
  stejným výsledkem; logika (napojení, ořezy, výpočty) patří do jádra, ne do UI. Ke každé nové funkci: příkaz
  (zápis), dotaz `queries/` (když AI potřebuje něco nového vidět) a krok ve scénáři `core/src/ai/scenario*.test.ts`.
  Hlídají to `ai/tools.test.ts` a `tools/ui-commands.test.mjs`.
- Žádné pevné milimetry čar, barvy ani šrafy v generátorech: vždy přes funkci grafiky (základy 11, 32).
- Žádný přímý přístup k souborům ani k prohlížeči z jádra (základy 9, 13); hlídá to ESLint.
- Na konci každého kroku aktualizuj `docs/STAV.md` (hotovo, rozhodl Code, otevřené, 5 největších souborů).
- **Ukázky (pokyn uživatele 2026-11-26):** ke každému hotovému kroku nebo opravě přidej testovací scénu
  (recept z příkazů) nahoru do `packages/core/src/samples/scenes.ts`; nové funkce doplň i do ukázkového
  projektu (`samples/house.ts`). Ve zprávě uživateli dej odkaz `…/BIM-light/?ukazka=<klíč>` a co zkusit.

## Dokumenty (zdroj pravdy)

- `docs/rozhodnuti-bim-light.md` – základy 1–33 a **rejstřík sekcí** (která sekce je ve kterém souboru:
  `rozhodnuti-koncepce-model-zobrazeni.md`, `rozhodnuti-prvky-stavby.md`, `rozhodnuti-platforma-ui-vystupy.md`).
- `docs/pravidla-interakce-bim-light.md` – základ 25, kóty, výběr, příkazy.
- `docs/katalog-pohledy-styly-zobrazeni.md` – základy 26–32.
- `docs/katalog-kresleni-sten-kotovani.md` – kreslení stěn, přichytávání, kóty (části 1–7).
- `docs/postup-etapy-bim-light.md` – etapy; `docs/checklist-dps-bim-light.md` – cíl DPS.
- `docs/koncepce-rozhrani.md` – rozložení a vzhled rozhraní (podle principu Arditu; u nové funkce si vyžádat
  screenshot z Arditu a probrat).
- `docs/reference/prototyp-interakce.html` – zadání chování, kód se NEkopíruje.
- Přednost při rozporu: pravidla-interakce > katalog-pohledy-styly > katalog-kresleni > starší rozhodnutí.
- Kóty a popisky patří podlaží a mají skupinu anotací (ne pohledu); měřítko mění jen tloušťky čar.

## Základy od prvního dne (závazné, podrobně v `docs/rozhodnuti-bim-light.md`)

1. Model ve tvaru IFC: GlobalId, Projekt → Budova → Podlaží → prvek, třída IFC, typ + instance, vztahy jako objekty.
2. Každý prvek nese kategorii, profesi, stav (stávající / bourání / nový) a variantu.
3. Data prvků jsou 3D od začátku (výška, odsazení, parapet).
4. Nic se neukládá jako kresba; vše se počítá z modelu, geometrie se vztahuje k hostiteli.
5. Každý generátor kreslí ve třech podrobnostech (hrubá / střední / jemná).
6. Každá změna modelu je pojmenovaný příkaz s parametry v JSON; žádná jiná cesta do dat; Undo.
7. Průřezová pravidla na jednom místě: tabulka „pravidlo × typ prvku“.
8. Výkazy a legendy jsou jeden obecný mechanismus (tabulka z modelu).
9. Jednotky mm, SCHEMA_VERSION s migracemi, jádro bez DOM.
10. Typ = seznam výškových pásů, pás = seznam vrstev (materiál, tloušťka, funkce); referenční čára.
11. Grafika přes jednu funkci s pevným pořadím 6 pater přepisů; umí vrátit „proč“.
12. Výška prvku může být vázaná na podlaží (spodek i vršek).
13. Soubory a systém jen přes rozhraní `Platform` (prohlížeč teď, Tauri později).
14. Povrchy se odkazují logicky (místnost + stěna + strana + zóna), ne geometricky.
15. Ovládání se generuje z popisů (registr příkazů, popis parametrů, popis nastavení).
16. Generované prvky a ruční úpravy: jeden mechanismus se zámkem.
17. Georeference od začátku (S-JTSK, natočení, ±0,000 v Bpv).
18. „Mřížka polí“ je jeden mechanismus (okno, plášť, výplně).
19. Otvor v hostiteli je jeden mechanismus pro stěny, desky i střechy.
20. Interakce je jedna společná služba (přichytávání, tracker, kóty, výběr).
21. Typ v projektu je kopie s odkazem na původ v knihovně.
22. 2D kresba je jedno společné jádro; čáry nejsou BIM prvky.
23. Tvar stěny: přímá nebo oblouk; všechny výpočty počítají s oběma.
24. Napojení stěn je uložený vztah (ATSTART / ATEND / ATPATH), ne shoda souřadnic.
25. Vybraná entita se pohybuje, všechno ostatní stojí; při změně délky se pohne uchopený konec.
26. Pohled má svůj styl (podlaží + výřez + měřítko + styl); styl mění jen vzhled.
27. Styly jsou data v projektu; Studie / Projekt / Elektro jsou jen předvolby.
28. Kóty, popisky a 2D kresba patří podlaží a mají skupinu anotací; zámek platí i ve skryté skupině.
29. Měřítko mění jen tloušťky čar; texty, značky a šrafy mají pevnou velikost na papíře.
30. Pravidla grafiky jsou data (podmínka + efekt), kombinace = seřazený seznam (patro 3).
31. Nastavení zobrazení je přenositelný JSON se schématem, verzí a migracemi; import nemění model.
32. Tloušťka čáry se ukládá jen jako číslo pera; tabulka pero × měřítko → mm (ISO 128, 7 per).
33. Velikost souborů se hlídá automaticky a soubory se dělí včas (viz níže).
34. Šrafa je samostatná položka knihovny (jen tvar, mm na papíře), materiál ji odkazuje; barva je u materiálu (`docs/katalog-sraf-materialu.md`).

## Velikost souborů (základ 33)

- Zdrojový soubor (i test): cíl do 250 řádků, tvrdý limit 400. Funkce cíl do 50 řádků. Jeden soubor = jedna odpovědnost.
- Dokumenty v `docs/` do ~40 KB / 500 řádků, `CLAUDE.md` do 150 řádků. Datové knihovny po jednom souboru na skupinu.
- `npm run check:size` (skript `tools/check-size.mjs`): nad 250 varování, nad 400 chyba. Běží v pre-commit hooku
  (husky) i v GitHub Actions; při chybě build neprojde.
- Výjimky jen v `tools/size-exceptions.json` (soubor, limit, důvod) a jen se souhlasem uživatele; návrh do `docs/STAV.md`.
- Soubor, který při práci přeroste 250 řádků, rozděl hned v téže session: čisté přesunutí bez změny chování,
  testy zelené, samostatný commit „rozdělení …“.
- Dokumenty v `docs/` sám nerozděluj; při překročení napiš do `docs/STAV.md` návrh rozdělení podle sekcí.

## Struktura

- `packages/core` – jádro, BEZ DOM a API prohlížeče. Po prvcích (základ 33): `src/wall/`, `src/dimension/`,
  `src/view/`, `src/style/`, `src/commands/`, `src/snap/`, `src/selection/`…; uvnitř malé soubory podle
  odpovědnosti (data, geometrie, příkazy, kreslení), testy vedle (`*.test.ts`). `index.ts` jen exportuje.
  Nový prvek = nová složka.
- Jádro vrací kresbu jako seznam primitiv (čáry, výplně, šrafy, texty) s číslem pera, barvou a typem čáry;
  canvas ani mm čáry nezná.
- `apps/sandbox` – web (Vite + Preact, canvas 2D). Interakce po modulech (kreslení, přichytávání, výběr, kóty,
  příkazy). E2E testy v `apps/sandbox/e2e`.
- `tools/` – pomocné skripty; `.github/workflows/ci.yml` – CI a nasazení na GitHub Pages.

## Příkazy

- `npm install` – nainstalovat (Node LTS).
- `npm run dev` – sandbox na http://localhost:5173/BIM-light/
- `npm run test` – testy jádra a nástrojů (Vitest).
- `npm run test:e2e` – testy v prohlížeči (Playwright, Chromium; poprvé `npx playwright install chromium`).
- `npm run typecheck`, `npm run lint`, `npm run format`, `npm run check:size`.
- `npm run check` – vše kromě e2e najednou (před pushem).

## Začátek na jiném počítači („pokračujeme“)

Když uživatel napíše „pokračujeme“ (nebo začíná na počítači, kde ještě nic není), udělej sám:

1. Repo: když chybí, `git clone https://github.com/smatli42-cmd/BIM-light.git`; jinak `git pull` na `main`.
   Ověř `git status` (čisto) a že poslední commit odpovídá GitHubu.
2. Node LTS (22+) a npm; `npm install` (nastaví i husky), `npx playwright install chromium`.
3. `npm run check` a `npm run test:e2e` – musí být zelené. Když ne, nejdřív oprav a řekni uživateli.
4. Přečti `docs/STAV.md` (hlavně „Další krok“) a pokračuj podle něj; náhled sandboxu přes `.claude/launch.json`.

## Etapa 0 – mimo rozsah

Nástroj na kreslení oblouku (jen data a výpočty), okna a dveře, okótování celé stěny, Elektro, 3D,
export IFC, UI pro import a export stylů (jen schéma a test JSON).
