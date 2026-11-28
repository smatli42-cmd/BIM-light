# BIM-light – stav: materiály a priority spojování

Aktualizuje Claude Code. Souhrn je v `docs/STAV.md`; tady podrobnosti k materiálům.

## Hotovo

### Priority spojování vrstev jako tabulka úrovní, 2026-11-28 (návrh schválil uživatel; scéna `?ukazka=priority-spojovani`)

- **Priorita = pořadí úrovně, ne číslo.** Projekt má `model.joinPriorities`: seřazené úrovně shora dolů
  (úroveň výš projede úroveň níž), výchozí úroveň každé kategorie materiálu (`categoryLevels`) a zásady řazení
  textem (`policy`). Materiál nese `joinLevelId` (null = podle kategorie, jinak výjimka).
- **Jedna funkce** `joinRank` (`join-priority/rank.ts`): pořadí úrovně zdola (horní = počet úrovní,
  neznámý materiál 0). Volá ji napojení stěn (`junction/frame.ts` → roh, T, kříž, víc konců) i uložení
  stropu (`junction/slab-wall.ts`); IFC priorita vrstvy = `joinRankPercent` (0–100).
- **Migrace 43 → 44** (`join-priority/migrate-v43.ts`): každé dosavadní číslo 0–999 dostane svou úroveň
  (výchozí úrovně mají „své“ číslo, cizí číslo přidá úroveň „Priorita N“ na správné místo), takže pořadí i
  shody zůstanou a spoje se nezmění – hlídá test (otisk geometrie stěn před a po, porovnání všech dvojic).
  Materiál v úrovni své kategorie dostane null.
- **Podezřelá místa** (`join-priority/check.ts`): `finish-over-core` = izolace / povrch (nikde jádro) nad
  jádrem nosné stěny nebo desky; `same-level-join` = dva různé materiály stejné úrovně v jednom spoji stěn
  (pokos); `implicit` = použitý materiál bez výslovné úrovně.
- **Příkazy:** `material.setPriorities` (celá tabulka + kategorie + přiřazení + zásady, jeden krok Zpět;
  úroveň bez id = nová, odkaz id nebo názvem), `material.addPriorityLevel`, `renamePriorityLevel`,
  `movePriorityLevel`, `deletePriorityLevel` (neprázdná jen s `moveTo`), `setJoinLevel`, `setJoinPolicy`.
  `material.create / update` berou `joinLevelId`.
- **Dotazy:** `material.priorities` (úrovně s pořadím, materiály – výslovně / podle kategorie, skladby,
  počet prvků –, kategorie, zásady, podezřelá místa); `material.list` vrací `joinLevelId`, `joinRank`.
- **Sandbox:** horní lišta **Nastavení ▾ → Priority spojování…**: vlevo úrovně (pořadí, název k přepsání,
  ↑ ↓, tažení za ⠿, Smazat… s přesunem, + Úroveň), pod úrovní materiály (šedě = podle kategorie; volba
  úrovně nebo tažení do jiné úrovně), kategorie úrovně; vpravo živý náhled (`joinPreviewModel` v jádře:
  půdorys domu tvaru L z typů projektu – vnější rohy, vnitřní roh zateplené stěny × nezateplené zdi,
  T příčky; detail vnitřního rohu; řez stropem na obvodové zdi), podezřelá místa, zásady řazení. Ctrl+Z
  v okně vrací. Panel Materiály: místo čísla „Priorita protínání“ volba „Priorita spojování“ (podle
  kategorie / úroveň) a tlačítko na okno.
- Testy: `join-priority/priorities.test.ts`, `preview.test.ts`, AI `ai/scenario-priorities.test.ts`,
  e2e `priority.spec.ts`.

## Rozhodl Code (k potvrzení)

- **Výchozí úrovně (12, shora):** Ocel a kovy · Nosný železobeton · Beton prostý a cementové potěry ·
  Anhydritové potěry · Zdivo · Dřevo a dřevěné konstrukce · Ostatní, sklo a krytiny · Hydroizolace a fólie ·
  Tepelná izolace · Sádrokarton a desky · Omítky a malby · Zemina a sypaniny. Pořadí drží dosavadní čísla
  (Kov 80, ŽB 70, Beton 60, Anhydrit 55, Zdivo 50, Dřevo 40, Ostatní 30, Izolace 20, SDK 15, Omítky 10,
  Zemina 5), aby se spoje v existujících projektech nezměnily; proto je jich 12, ne 8–10, a beton / potěry
  jsou nad zdivem (v zadání byly potěry pod zdivem – změna by posunula uložení stropů). Kdo chce méně
  úrovní, sloučí je smazáním s přesunem.
- **Hydroizolace a fólie** je nová úroveň nad tepelnou izolací (fólie má být souvislá, Archicad to tak má);
  v knihovně ji mají jen fólie střech (pojistná hydroizolace, parozábrana) u nových projektů. Ve starých
  projektech zůstanou fólie v úrovni Izolace (výsledek se nemění).
- **Kategorie → úroveň:** Kov → Ocel a kovy, Beton a potěry → Beton prostý…, Zdivo → Zdivo, Dřevo → Dřevo…,
  Sklo i Ostatní → Ostatní…, Izolace → Tepelná izolace, Omítky → Omítky a malby, Zemina → Zemina. Výjimky
  v knihovně: Železobeton, Anhydrit, Sádrokarton.
- **Podezřelé „izolace nad nosnou“** se počítá jen proti jádru nosných typů stěn a desek (příčky SDK mají
  minerální vatu jako jádro, střechy se podle priorit nespojují – jinak by hlášení bylo plné šumu).
- **Náhled** staví vlastní malý model z typů projektu (první obvodový zateplený typ, první nosný bez izolace,
  první příčka, první nosná deska), ne výřez z výkresu: jde vidět vždy, i v prázdném projektu.
- U vypouklého rohu dvou zateplených stěn se posun izolace nad zdivo neprojeví (izolace obtéká roh v obou
  případech); projeví se u vnitřního rohu zateplené stěny a nezateplené zdi – proto je v náhledu i ve scéně.
- Okno je v novém menu **Nastavení ▾** v horní liště (Ardit samostatné okno priorit nemá – jen pole
  u materiálu; menu připravené pro další nastavení projektu).
- Tažení úrovní a materiálů je událostmi ukazatele (pointer), ne HTML5 drag & drop (ten se v Chromiu
  nad plátnem aplikace nespouštěl).

## Otevřené

- **Výjimka priority u vrstvy skladby** (vrstva typu jinak než její materiál) – teď se nedělá (pokyn
  uživatele 2026-11-28).
- Podezřelé „stejná úroveň ve spoji“ hlídá jen spoje stěn, ne uložení stropu na stěně.
- Náhled zatím neumí vybrat jiné typy stěn / desek (bere první vhodné z projektu).
