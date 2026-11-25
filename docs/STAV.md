# BIM-light – stav práce

Aktualizuje Claude Code na konci každého kroku. Poslední změna: 2026-11-25, stěny Z5 – oblouk.

Etapa 0 (kroky 1–4, skupina A, doplněk šraf) a její rozhodnutí jsou v `docs/STAV-etapa-0.md`.

## Hotovo

### Stěny: Z1 hotovo, 2026-11-24 (typ stěny a skladba)
- **Složka `wall-type/`:** typ, pás a vrstva (přesunuté z `wall/types.ts`, ten je dál re-exportuje), vrstva má
  nově prodloužení nahoře a dole (`extendTop`, `extendBottom`, výchozí 0; výpočet až Z3). Validace
  (`validate.ts`: kladné tloušťky, existující materiály, jedno souvislé jádro, pásy), skladba
  (`composition.ts`: jádro, stejná skladba, změna tloušťky), „Použití“ (`usage.ts`).
- **Knihovna typů** (`wall-type/library.ts`, 8 vymyšlených typů): Zdivo 300, Příčka 125, Obvodová zateplená 465
  (omítka 15 + zdivo 300 + EPS 150), Nosná zeď 330, Příčka 100, Příčka 150, ŽB stěna 200, SDK příčka 100.
  Nový projekt dostane kopie všech s odkazem na původ (knihovna + klíč + verze, základ 21).
- **Migrace projektu 2 → 3** (`wall-type/migrate-v2.ts`): vrstvy dostanou prodloužení 0. `SCHEMA_VERSION = 3`.
- **Příkazy** (`commands/wall-type/`): `wallType.create`, `duplicate`, `rename`, `delete` (použitý jen
  s náhradou), `purgeUnused`, `load` (z knihovny, chybějící materiály doplní), `addLayer`, `removeLayer`,
  `moveLayer`, `updateLayer`. Každá změna typu prochází validací. `wall.setThickness` mění nejtlustší vrstvu
  jádra (bez jádra nejtlustší vrstvu) a slučuje se s typem stejné skladby; `wall.setReferenceLine` odmítne
  „líc jádra“ u typu bez jádra.
- **Dotazy pro AI:** `wallType.list` (skladba, tloušťka, jádro, použití, původ), `wallType.library`;
  krok scénáře AI (vlastní skladba, přiřazení, smazání s náhradou).
- **Sandbox:** záložka **Typy stěn** (počet, hledání, tloušťka a použití v řádku, Nový typ, Vyčistit nepoužité,
  Načíst z knihovny); **editor typu** (název, živý náhled řezu se šrafami a červenou referenční čarou, součet
  tloušťky, vrstvy z popisu parametrů: materiál, tloušťka, funkce, prodloužení; ↑ ↓ ×, + Přidat vrstvu,
  Použití, Duplikovat, Smazat s náhradou). Ve Vlastnostech je „Líc jádra“ zašedlý u typu bez jádra.
- **Kresba:** beze změny z doplňku šraf – Projekt (střední) vrstvy se šrafami a čarami mezi vrstvami, Studie
  (hrubá) jedna výplň; ověřeno testem. **Známé omezení:** každá stěna se kreslí zvlášť, rohy po vrstvách
  nečistí (to je krok Z2).
- Testy: jádro a nástroje 371 (Vitest), prohlížeč 84 (Playwright), vše zelené.

### Stěny: Z2 hotovo, 2026-11-24 (napojování vrstev v rozích)
- **Složka `junction/`** (algoritmus viz „Rozhodl Code“ níže): `half-plane` (polorovina, ořez), `frame`
  (rám stěny v uzlu), `travel` (pořadí vrstev, buňky), `corner` (L), `tee` (T a kříž X), `multi` (v přímce,
  tři a více konců), `free-end` (uzavřené čelo), `nodes` (uzly z uložených vztahů), `solve` (mezipaměť uzlů),
  `wall` (obrys každé vrstvy a stěny), `trim` (líce), `edges` + `chain` (svaření bodů, sousední hrany, obrysy).
- **Přesunuto / nahrazeno:** `wall/joins.ts` (pokos, T, priorita) → `junction/corner.ts`, `tee.ts`, `multi.ts`;
  `wall/tee-gaps.ts` a `wall/outline.ts` (mezery v čarách) → mezery ve vrstvách (`Gap`) a hledání hran
  v `junction/edges.ts`; `wall/draw.ts` kreslí všechny stěny najednou. Testy `tee-gaps`, `outline`,
  `tee-priority` převedeny do `junction/*.test.ts`.
- **Výstup:** `WallGeometry.layers[i].polygons` (obrys vrstvy po napojení), `outlines` / `outline` (obrys
  stěny), líce oříznuté podle krajních vrstev. Nic se neukládá; mezipaměť podle identity vstupů.
- **Data:** napojení má `noJoin` („nespojovat“), kříž = vztah ATPATH–ATPATH. Schéma 3 → 4
  (`junction/migrate-v3.ts`, data beze změny).
- **Příkazy:** `wall.setJoin` (nespojovat / spojovat), `wall.cross` (kříž); `wall.create` s autoConnect,
  řetěz, kopie a obdélník uloží kříž samy, když stěna jinou protne uprostřed. Dotaz `wall.get` vrací
  i obrys každé vrstvy (materiál, funkce, plocha, body), `wall.list` příznak noJoin. Krok scénáře AI.
- **Kresba:** hrubá = sjednocený obrys všech viditelných stěn + jedna výplň; střední = vrstvy se šrafou,
  čára jen mezi různými materiály (pokos stejného materiálu bez čáry). Obrys je jedna souvislá čára přes
  napojené stěny (stejné pero) – roh bez zubu. Šrafa omítky hostitele se v T přeruší.
- **Sandbox:** pravé tlačítko na uzlu – Nespojovat / Spojovat (vyčistit roh); **galerie napojení**
  `…/BIM-light/#galerie` (odkaz nahoře): 16 příkladů, přepínač Studie / Projekt, detail uzlu / celek.
- **Polygonová knihovna:** žádná. Každý kousek vrstvy = pás ∩ poloroviny (ořez přímkou), mezera = dvě
  poloroviny; slévání a obrysy přes společné hrany. Krok Z4 udělá otvor jako mezeru ve všech vrstvách.
- Testy: jádro a nástroje 398 (Vitest), prohlížeč 86 (Playwright), vše zelené.
- **Oprava po vyzkoušení:** stěna nakreslená myší přes jinou zůstala oddělená (nástroj Stěna předává
  napojení konců sám a kříž se zapínal jen s `autoConnect`). `wall.create` má volbu `autoCross`, nástroje
  Stěna a Stěna z čáry ji zapínají. Test v prohlížeči (`kresleni.spec.ts`), celkem 87.

### Stěny: Z3 hotovo, 2026-11-24 (výška, svislé vazby, minimální export IFC)
- **Výška stěny** (`model/height.ts`, `model/storeys.ts`): spodek = podlaží + odsazení; vršek = pevná výška
  („nespojeno“) nebo **podlaží + N** + odsazení (jako Archicad Home + N). Stěna přes dvě podlaží = N = 2.
  Nová stěna má vršek podlaží + 1. Příkaz `wall.setHeight` odmítne výšku ≤ 0 a N mimo budovu.
- **Podlaží:** `storey.update` posune podlaží nad ním (změna výšky i úrovně), `storey.delete` smaže prázdné
  podlaží i s pohledy, jinak odmítne a řekne počet prvků a kót (počítá i stěnu, která podlažím prochází).
- **Složka `wall-height/`:** výška stěny, pásů a vrstev včetně prodloužení nahoře a dole (`resolve.ts`),
  horní profil {rovný | polygon} s validací (`top-profile.ts`, příkaz `wall.setTopProfile`, bez nástroje),
  migrace 4 → 5 (`migrate-v4.ts`). `SCHEMA_VERSION = 5`.
- **Dotazy pro AI:** `wall.list` vrací spodek, vršek, výšku a horní profil, `wall.get` i výšky vrstev;
  `project.info` podlaží odspodu. Krok scénáře AI (přes dvě podlaží, změna 1.NP, odmítnuté smazání).
- **Balíček `packages/ifc`:** `exportIfc(model)` → text IFC4: projekt, pozemek, budova, podlaží, IfcWall
  s osou a tělem (vytažený obrys po napojení z Z2), IfcWallType, IfcMaterialLayerSet + Usage, materiály,
  Pset_WallCommon.Status. GlobalId z modelu, ostatní odvozené z pevného klíče → opakovaný export dá stejný
  soubor. Test otevře soubor knihovnou web-ifc 0.0.78 (devDependency) a spočítá entity i geometrii.
- **Sandbox:** u vybrané stěny pole výšky (odsazení spodku, Vršek: Nespojeno / Podlaží + 0–3, odsazení
  nebo výška, výsledek v mm); záložka **Podlaží** (úroveň, výška, + Nové podlaží s pohledem, Otevřít,
  Smazat); tlačítko **Exportovat IFC** (stažení přes rozhraní Platform, `apps/sandbox/src/platform/`).
- Kóty, zámky a výběr zůstaly 2D beze změny (všechny dřívější testy zelené).
- Testy: jádro, IFC a nástroje 432 (Vitest), prohlížeč 91 (Playwright), vše zelené.

### Stěny: Z4 hotovo, 2026-11-25 (otvory ve stěně)
- **Složka `opening/`** (základ 19): prvek Otvor ve sbírce `model.openings` (IfcOpeningElement): hostitel
  `hostId`, `offset` = vzdálenost počátku od začátku referenční čáry, šířka, výška, parapet nad spodkem
  stěny, druh průchozí / nika (hloubka + strana ref / opp), stav, varianta, obrys `{rect}` (polygon jen
  v datech). Schéma 6 → 7 (`opening/migrate-v6.ts`): prázdné otvory + rovina řezu pohledu 1000 mm.
- **Výřez vrstev** (`opening/jamb.ts`): mechanismus mezer ze Z2 rozšířen (mezera = oblasti, které zůstanou,
  + kousky navíc). Průchozí otvor přeruší všechny vrstvy, omítky zahnou do ostění (pravidlo níže), nika
  vyřízne jen vrstvy do své hloubky. Hrubá i střední podrobnost stěnu v otvoru přeruší (dvě smyčky obrysu).
- **Rovina řezu** = nastavení pohledu (`view.cutPlane`, příkaz `view.setCutPlane`, v liště „Řez“). Otvor,
  který ji protíná, stěnu přeruší; otvor celý nad / pod ní stěnu nepřeruší a kreslí se čárkovaným obrysem
  v tloušťce stěny (pero a barva z funkce grafiky, kategorie „opening“).
- **Příkazy:** `opening.create` (offset nebo střed v bodě), `opening.move` (po stěně, nebo vektorem i na
  jinou stěnu), `opening.update` (rozměry, druh, stav; šířka kolem středu), `opening.delete`,
  `opening.copy` (i pole), `opening.mirror`; `selection.delete` maže i otvory. Dotaz `opening.list`
  (poloha, výšky, vztah k rovině řezu, upozornění). Krok scénáře AI.
- **Vazby na stěnu** (`opening/follow.ts`, hlídá editor po každém příkazu): otvor jde se stěnou při
  posunu, otočení, odsazení, kopii, zrcadlení, poli i vložení ze schránky; při změně délky stojí na místě
  (uchopený konec). Smazání stěny smaže otvory. Rozdělení přes otvor se odmítne, jinak otvor přejde na
  část, ve které leží; sloučení (Smazat uzel) otvory zachová. Změna tloušťky a typu polohu nemění.
- **Kontrola** (`opening/validate.ts`, v editoru): otvor musí ležet celý ve stěně po délce i na výšku, nika
  mělčí než stěna, otvory se nepřekrývají. Zkrácení stěny, ořez do rohu, snížení stěny nebo podlaží, které
  by to porušilo, se odmítne s vysvětlením. Pilířek u napojeného konce pod 100 mm jen upozorní (panel,
  dotaz).
- **Kóty:** trvalá kóta smí odkazovat na hranu otvoru (`FaceRef.openingId`, hrana = příčka přes stěnu
  v líci stavebního otvoru), zámek i změna čísla (posune otvor; kóta mezi hranami téhož otvoru = šířka).
  Smazání otvoru smaže jeho kóty. **Okótovat celou stěnu** (`dimension.wholeWall`, nabídka stěny
  i otvoru): řetěz líc – hrany otvorů – líc + celková délka, dvě skupiny zarovnání v aktivní skupině
  anotací. Dočasné kóty vybraného otvoru: k sousednímu otvoru nebo k líci / čelu, které stěnu ohraničuje.
- **IFC:** IfcOpeningElement (OPENING, u niky RECESS) + IfcRelVoidsElement; tělo stěny je bez otvorů.
  Ověřeno knihovnou web-ifc.
- **Sandbox:** nástroj **Otvor** (O, tlačítko v liště; klik na stěnu, náhled s výřezem, přichytávání ke
  středu stěny, k líci v rohu, k otvorům a k ose otvoru v jiné stěně, Alt vypne; rozměry v panelu „Nový
  otvor“, v trackeru odstupy). Klik do otvoru ho vybere, tažení posune (i na jinou stěnu), Del smaže,
  Přesunout / Kopírovat / Zrcadlit fungují i na otvory, panel „Vybrané otvory“ z popisu parametrů.
- **Oprava při testech:** stěnu přerušenou otvorem šlo vybrat jen v největší části (výběr bral jen největší
  smyčku obrysu); klik i rámeček teď berou všechny smyčky. Rámeček vybírá i otvory.
- Testy: jádro, IFC a nástroje 603 (Vitest), prohlížeč 96 (Playwright), vše zelené.

### Stěny: Z5 hotovo, 2026-11-25 (oblouk)
- **Napojení oblouků** (`junction/`): hranice vrstvy obloukové stěny je soustředná kružnice. Nový řez
  „vnitřek / vnějšek kružnice“ (`circle-cut.ts`) vedle poloroviny; kružnice se bere jako tětivy **společné
  mřížky úhlů** (`geometry/arc-grid.ts`, chyba tětivy do 0,5 mm), takže sousední vrstvy i stěny mají na
  společné kružnici stejné body a obrysy se spojí bez švu. Roh, T, kříž, v přímce, tři konce, volný konec
  i rám uzlu (`frame.ts`: `arc`, `curveAt`, `boundary`) počítají s obloukem; průsečík hranic po tětivách
  (`curve.ts`). Pás oblouku se za uzlem prodlužuje po kružnici; řezy konce platí jen pro „svou“ polovinu
  oblouku a mezery T / kříže jen pro polovinu roviny u uzlu (kružnice neprořízne protější stranu).
- **Příkazy:** `wall.curve` (bodem oblouku, nebo poloměrem se znaménkem strany středu), `wall.straighten`.
  Konce stojí, T konce sklouznou na novou křivku, otvory drží vzdálenost od začátku; nevejde-li se otvor,
  editor změnu odmítne. Editor odmítne oblouk, jehož vnitřní líc by měl poloměr pod 10 mm, a oblouk nad
  350° (`wall/shape.ts`).
- **Otvory v oblouku:** výřez radiálně (klín ze středu), ostění obalené jako u přímé stěny, nika do
  soustředné hloubky; posun po délce oblouku i vektorem. IFC tělo otvoru jako výseč.
- **Kóty:** délková kóta má `measure` = oblouk (délka líce) / tětiva / poloměr (text „R 5000“); změna čísla
  poloměru stěnu přezakřiví, tětivy posune uchopený konec po kružnici. Vzdálenostní kóta má `arc` = kóta
  po oblouku (délka oblouku na líci mezi hranami přes stěnu, soustředná kótovací čára).
  **Okótovat celou stěnu** u oblouku vytvoří řetěz po oblouku. Schéma 7 → 8 (`dimension/migrate-v7.ts`,
  nová volitelná pole, data beze změny).
- **Přichytávání:** střed oblouku, kvadranty (0°/90°/180°/270° na líci), tečna a kolmice z výchozího bodu,
  průsečík přímka–oblouk (`snap/arc-snap.ts`).
- **IFC:** osa obloukové stěny = IfcTrimmedCurve na IfcCircle (smysl podle směru); tělo lomená čára po
  mřížce; ověřeno knihovnou web-ifc (`packages/ifc/src/arc.test.ts`).
- **AI:** `wall.list` vrací `arc` (střed, poloměr, středový úhel); krok scénáře (kruh ze dvou oblouků,
  zakřivení, kóty poloměru a tětivy, otvor, odmítnutí, vyrovnání). Scénář rozdělen na `scenario.test.ts`
  (etapa 0) a `scenario-walls.test.ts` (Z1–Z5) + `scenario-helpers.ts`.
- **Sandbox:** nástroj **Oblouková stěna** (A): začátek – konec – bod oblouku; **M** přepne na „tečně“ na
  předchozí stěnu řetězu; tracker u konce Tětiva / Úhel, u oblouku Poloměr / Středový úhel (Tab, Enter);
  řetěz pokračuje z konce oblouku. U vybrané stěny **kolečko zakřivení** 16 px za protilehlým lícem:
  tažení stěnu prohne (číslo = poloměr). Nabídka obloukové stěny: Vyrovnat stěnu, Kóta poloměru, Kóta
  tětivy. Galerie napojení má 6 příkladů s oblouky.
- Testy: jádro, IFC a nástroje 635 (Vitest), prohlížeč 99 (Playwright), vše zelené.

### Šrafy podle ČSN 01 3420 (grafické označení hmot): hotovo, 2026-11-24
- **Nový druh rodiny „motiv“** (`hatch/motif.ts`): křivky (lomené / vyhlazené, otevřené / uzavřené) v mm
  na papíře, opakované v rastru (dx, dy, posun řad, úhel). Rodina čar má navíc volitelný kolmý posun
  (`shift`) pro střídání čar. Šrafa má příznak `derived` (základní / odvozená). Schéma projektu 5 → 6,
  balíček zobrazení 2 → 3 (`hatch/migrate-v2.ts`); šrafy v knihovně mají verzi 2.
- **Měřítko šraf ve stylu** (`hatchScale`, výchozí 1, rozsah 0,5–3, `hatch/scale.ts`): násobí všechny
  rozměry šraf, tvar se nemění. Příkaz `style.setHatchScale`, v liště nahoře pole „Šrafy ×“.
- **Knihovna přepsaná podle popisu**, rozteče a velikosti asi 1,6× větší; názvy a pořadí beze změny.
- **Podařily se:** Obecné (plná + kratší střídavě), Terén, Zásypy, Zeminy – kamenivo / čárky / šipky,
  Štěrk, Beton vyztužený a nevyztužený (plná + čerchovaná, u prostého řidčí), Beton – kroužky /
  trojúhelníky / čárkovaná s kroužky, všechna Zdiva, Dílce, Sendvič (+ křížky a kroužky na pásech),
  Izolace obecná (mřížka s kroužky), Akustická, Izolace – plástve / trojúhelníky / kroužky (šestiúhelníky),
  proti vodě, Kámen, Kovy, Sklo, Ploché sklo (pásy ze tří čar), Plasty, Bourané (křížky +), Krytina.
- **Zjednodušené:** Terén (rovnoměrné šikmé čáry bez zkrácení u horní hrany), Tepelná izolace (láhve
  v řadách nad sebou, ne jedna souvislá křivka nahoru a dolů), Dřevo (řady „<“ bez nepravidelnosti),
  Omítky / Sádrokarton / Anhydrit (náhodnost ze tří rastrů s nesoudělnými roztečemi, ne skutečně náhodně),
  Kamenivo a Čárky (pevný vzor v buňce, opakuje se).
- **Opraveno při kontrole:** záložky pravého panelu se po přidání „Podlaží“ nevešly (panel ujížděl
  do strany); nyní se zalamují do dvou řádků.
- Testy: jádro a nástroje 483 (Vitest, vč. kreslení všech 40 šraf v sandboxu), prohlížeč 91 (Playwright).

### Tepelná izolace přes celou šířku vrstvy: hotovo, 2026-11-25
- **Nová rodina šrafy „pás“** (`band`, `hatch/band.ts`): cik-cak přes celou šířku vrstvy s očkem u obou
  líců (podle Arditu a detailu uživatele; Revit / Archicad „izolace podle tloušťky“). Rozměry jsou poměry
  k šířce vrstvy: smyčka 0,65 × šířka, očko 0,3 × šířka – šrafa se přizpůsobí každé tloušťce. Měřítko šraf
  stylu ji nemění.
- Jádro spočítá křivku podél osy stěny (úsečka i oblouk, základ 23) v souřadnicích modelu
  (`curves` v primitivu šrafy); kresba ji jen ořízne obrysem vrstvy, takže roh je čistý pokos.
  `WallGeometry` nese `path` (referenční čáru).
- **Tepelná izolace** v knihovně = pás (verze šrafy 4); láhve v mm na papíře zrušeny. Náhledy (knihovna
  šraf, editor typu) kreslí pás přes kratší stranu obdélníku.
- Testy: `hatch/band.test.ts`, `wall/band-hatch.test.ts`; jádro a nástroje 548, prohlížeč 91, vše zelené.

### Velikost šraf podle praxe k ČSN 01 3406: hotovo, 2026-11-25
- **Chyba „šrafy jsou velmi jemné“:** sandbox kreslil šrafy pevnou velikostí na obrazovce (3,8 px na mm
  papíru), takže se při přiblížení nezvětšovaly. Teď 1 mm papíru = měřítko × zoom (`hatchPxPerMm`
  v `render/hatch.ts`), stejně jako texty (základ 29). Při velkém oddálení (pod 1 px na mm papíru) jen výplň.
- **Rozteče podle podkladu uživatele:** základní rovnoběžné šrafy mají nejhustší rozteč 2 mm na papíře
  (praxe 1 : 50 je 1,5–2 mm): Obecné, Terén, Zásypy, Beton vyztužený a prostý (plné po 4 mm, čerchované
  mezi nimi), Zdivo (45° po 2, 135° po 4), Zdivo – mřížka / čárkovaná / svislice a šikmé, Sendvič, Plasty;
  Krytina 1,9. Hustá mřížka 1,0, Dílce 4,0 (záměrně řidší). Ploché sklo: čáry pásu po 0,7 mm.
- **Pravidlo jako test** (`hatch/spacing.test.ts`): rovnoběžné šrafy 1,5–2 mm; žádná rozteč čar ani rastru
  pod 0,7 mm (= i nad 2 × 0,18 mm). Čáry šraf perem 1 = 0,13 mm (ISO 128), beze změny.
- Šrafy v knihovně mají verzi 3; uložené projekty si drží své kopie (základ 21).

## Rozhodl Code (k potvrzení)

Stěny Z5 – oblouk (2026-11-25):
- **Kresba oblouku = lomená čára** (primitiva oblouk neumějí): body na společné mřížce úhlů kolem středu,
  odchylka tětivy nejvýš 0,5 mm, krok nejvýš 3°. Na kružnici se stejným středem a poloměrem leží body vždy
  na stejných místech – proto sousední vrstvy a stěny navazují přesně.
- **Pokos v rohu s obloukem je přímka** mezi průsečíky hranic vrstev (jako Archicad), pravidla priority
  beze změny ze Z2. Roh přímka × oblouk se stejnou skladbou: jádro druhé stěny prořízne omítku (jako u
  přímého L).
- **Napojení v přímce** platí i pro oblouk navazující tečně (odchylka do 2°) – kruh ze dvou oblouků má
  v uzlech kolmý (radiální) řez bez čáry.
- **Oblouk nejvýš 350°** (kruh = aspoň dvě stěny), vnitřní líc s poloměrem aspoň 10 mm.
- **Tečně:** M přepíná způsob v nástroji; tečna se bere z konce předchozí stěny řetězu (ne z libovolné
  stěny pod kurzorem). Napsaný poloměr bez úhlu dá čtvrtkruh (90°).
- **Kolečko zakřivení** leží mimo stěnu (16 px za protilehlým lícem), aby nepřekáželo kliknutí do stěny
  a tažení líce.
- **Kóta po oblouku** měří na líci, kladné odsazení = od středu; změna čísla přepočítá posun po
  referenční čáře poměrem poloměrů. Kóta tětivy a poloměru se při vyrovnání stěny smaže.
- **Poloha otvoru po oblouku** = délka po referenční čáře; šířka otvoru také po referenční čáře (na
  vnějším líci je oblouk otvoru o poměr poloměrů delší).

Stěny Z4 – otvory (2026-11-25):
- **Šířka otvoru = stavební otvor v jádru.** Hrany otvoru (a kóty k nim) leží v líci zdiva; omítky
  zahnou do ostění, takže světlost v omítce je o tloušťku omítek menší (české výkresy kótují stavební
  otvor).
- **Obalení ostění = stejné pravidlo jako volný konec (Z2):** povrchové vrstvy každé strany zahnou do
  ostění do poloviny těla (jádro + izolace); má-li povrch jen jedna strana, zahne přes celou tloušťku
  (Obvodová zateplená 465: vnitřní omítka zahne i přes EPS). Vrstva u jádra jde nejblíž hraně otvoru.
  Okno v etapě 4 to upraví podle polohy výplně. Nika se neobaluje.
- **Otvor je ve vlastní sbírce `openings`**, ne mezi stěnami v `elements`; vztah ke stěně je uložený
  odkaz `hostId` (do IFC se zapíše jako IfcRelVoidsElement). Otvor nemá typ (IfcOpeningElement ho nemá).
- **Poloha po stěně se po příkazu přepočítá podle změny referenční čáry:** celá stěna pohnutá / stejná
  délka / stojí začátek = vzdálenost od začátku zůstane; pohnul se jen začátek = otvor stojí; jinak se
  počátek otvoru promítne. Kontrola i přepočet běží v editoru po každém příkazu (jako zámky kót).
- **Otvory se nesmí překrývat** (po délce i na výšku); Revit to dovolí, tady by výřez vrstev nebyl
  jednoznačný.
- **Nika:** hloubka od zvoleného líce, musí být menší než tloušťka stěny; v IFC typ RECESS.
- **Okótovat celou stěnu:** výchozí líc je protilehlý (u místnosti kreslené po vnitřním líci = vnější),
  řady 800 a 1200 mm od líce. Konec stěny = čelo volného konce, nebo líc napojené stěny, na kterém líc
  končí (musí být kolmý na stěnu, jinak se příkaz odmítne). Úseky mezi napojenými příčkami (bod 2
  v pravidlech interakce) zatím ne – jen otvory a celková délka. Kóty jsou asociativní a odemčené.
- **Upozornění „těsně u rohu“:** pilířek (od hrany otvoru ke konci líce u napojeného konce) pod 100 mm;
  záporný = „zasahuje do napojené stěny“. Jen upozornění v panelu a v dotazu.
- **Rovina řezu** platí pro otvory; výběr výškového pásu stěny zatím dál bere 1000 mm (Z6 použije
  rovinu řezu i pro stěny).
- **Přichytávání otvoru:** střed stěny, hrana k líci na konci stěny, hrana k hraně sousedního otvoru, osa
  k ose otvoru v jiné stěně podlaží; tolerance 10 px.
- **Čárkovaný obrys** otvoru mimo řez je konvence (typ čáry); pero a barva jdou z funkce grafiky.

Tepelná izolace (2026-11-25):
- Poměry 0,65 / 0,3 jsem odečetl z obrázku Arditu. Očka jsou na obou lících stejná, takže nezáleží na
  tom, ze které strany je jádro.
- Pás zatím jen pro Tepelnou izolaci; Akustická a varianty izolace (plástve, kroužky…) zůstávají v mm na
  papíře. Do editoru šraf patří později i pás (poměry smyčky a očka).

Velikost šraf (2026-11-25):
- Rozteč volím 2 mm (horní hranice 1,5–2), zdivo a beton tak v příčce 100 mm v 1 : 50 mají 2–3 čáry.
- Šrafy ze značek a motivů (izolace, zeminy, omítky, dřevo, sklo) jsem neměnil – podklad dává jen
  rozteč rovnoběžných čar; s opravou zoomu se zvětší samy. Řidší / hustší šrafa podle velikosti plochy
  zatím jen ručně polem „Šrafy ×“ ve stylu.
- Zatím není: nešrafovat převládající hmotu (pravidlo grafiky ve stylu), automatické vyčernění tenkých
  vrstev a otočení šrafy o 90° u sousedních konstrukcí ze stejného materiálu – viz Otevřené.

Šrafy podle ČSN:
- **Příznak odvozená** je podle katalogu šraf (13 položek). Podle normy by byly odvozené i Zdivo – mřížka,
  Zdivo – hustá mřížka a Ploché sklo – katalog jsem neměnil, k rozhodnutí.
- **Uložené projekty si nechávají své kopie šraf** (základ 21); nový vzhled dostane nový projekt nebo
  šrafa znovu načtená z knihovny. Měřítko šraf se při migraci nastaví na 1.
- Náhledy v knihovně šraf a v editoru typu kreslí šrafy v měřítku 1 (bez měřítka stylu).
- Osa y motivu míří nahoru (na papíře), úhel jako u ostatních rodin.

Stěny Z3:
- **Vršek „podlaží + N“ se ukládá relativně** (N, ne id podlaží), jak říká zadání; úroveň N = úroveň N-tého
  podlaží nad spodním, nad nejvyšším podlažím jeho vršek (úroveň + výška). Vložení podlaží mezi změní,
  kam vršek míří (jako Archicad). Migrace převede staré „id podlaží“ na N; vršek pod spodním → pevná výška.
- **Podlaží jsou naskládaná (Archicad):** změna výšky posune všechna podlaží nad ním; změna úrovně posune
  podlaží i ta nad ním a podlaží pod ním změní výšku (jen když na něj navazovalo). Úroveň nesmí klesnout
  pod podlaží pod ním.
- **Spodní podlaží stěny = podlaží stěny**; `wall.setHeight` ho nemění. Kopie na jiné podlaží si nese
  odsazení i N vůči novému podlaží.
- **Výchozí vršek nové stěny = podlaží + 1** (dřív pevná výška podlaží), aby změna výšky podlaží stěny
  přepočítala.
- **Smazání podlaží** smaže i jeho pohledy; poslední podlaží smazat nejde. Sandbox po „+ Nové podlaží“
  vytvoří i pohled (dva kroky Undo).
- **Prodloužení vrstvy:** dole platí pro nejspodnější pás, nahoře pro pás, který končí vrškem.
- **Horní profil polygon:** body {x po referenční čáře od začátku, z nad spodkem stěny}; výpočty a export
  zatím berou rovný vršek.
- **Zapisovač IFC: vlastní textový STEP** (~100 řádků) místo knihovny: entit je málo, výstup je
  deterministický a čitelný, žádná závislost za běhu (web-ifc je wasm ~4 MB a slouží jen k ověření
  v testech). Schéma IFC4, jednotky mm, čeština kódovaná \X2\…\X0\.
- **IFC podrobnosti:** tělo = obrys stěny po napojení vytažený na výšku (bez prodloužení vrstev a bez
  horního profilu); oblouk zatím jako lomená čára (přesně Z5); pozemek „Pozemek“ s výškou ±0 v Bpv;
  georeference (IfcMapConversion) zatím ne; vrstvy z pásu v rovině řezu; exportuje se jen hlavní model
  (varianty ne). Status: NEW / EXISTING / DEMOLISH.
- **Export pro AI:** export nemění model, proto není příkaz v registru jádra (balíček IFC je mimo jádro).
  AI ho dostane s připojením přes MCP (etapa 6) jako nástroj nad `exportIfc`.

Stěny Z2 – návrh algoritmu napojení (složka `packages/core/src/junction/`):
- **Vrstva = pás** mezi dvěma rovnoběžnými čarami (offsety z příčného řezu). Na každém konci ho omezí
  jedna nebo více **polorovin** („čára řezu + strana, kde vrstva zůstává“); hostitel v T a v kříži dostane
  navíc **mezery** (pás jiné vrstvy, který jím projde). Kousky jsou tak vždy průnik pásu a polorovin –
  stačí jednoduché ořezání mnohoúhelníku přímkou, **žádná knihovna** (polygon-clipping by kvůli společným
  hranám vrstev potřebovala zaokrouhlování a dělala by drobné střípky). Kousky jedné vrstvy (např. zahnutá
  omítka na volném konci) se slijí podle společných hran.
- **Roh L** (dva konce, ne v přímce): vrstvy se zpracují od nejvyšší priority materiálu. Vrstva „jede“ od
  své stěny přes uzel napříč vrstvami druhé stěny a zastaví se na první vrstvě, která tam skutečně je
  a má **vyšší** prioritu (na její bližší hranici). Stejná priorita = **pokos** úhlopříčkou buňky, kde se
  potkají (stejný materiál = bez čáry). Nezastaví-li ji nic, dojde k vnějšímu líci druhé stěny.
  Výsledek: jádro na jádro pokosem, izolace na izolaci kolem vnějšího rohu, omítka obteče vnitřní roh.
- **T** (konec na hostiteli): vrstva napojené stěny projde vrstvami hostitele s nižší prioritou a zastaví se
  na první s vyšší nebo stejnou prioritou, **na jádru hostitele vždy** (jádro hostitele se nikdy neprořízne,
  skupina A). Hostitel dostane mezery jen ve vrstvách, kterými něco prošlo. Nově: omítka napojené stěny
  končí na omítce hostitele (stejná priorita), omítka hostitele „obteče“ roh až k jádru napojené stěny.
- **Kříž X** (dvě stěny se protínají uprostřed, nový vztah ATPATH–ATPATH): v každé buňce dvou vrstev
  vyhraje vyšší priorita, při shodě hostitel (relating). Vznikne příkazem `wall.cross` nebo samočinně při
  kreslení stěny přes jinou.
- **V přímce** (dva konce ~180°, odchylka do 2°): všechny vrstvy kolmo v uzlu; stejný materiál bez čáry.
- **Tři a více konců:** jsou-li dva konce v přímce, tvoří „hostitele“ a ostatní se na ně napojí jako T
  (při dvou dvojicích vyhraje dvojice s vyšší prioritou jádra). Bez dvojice v přímce: pokos ke středu
  uzlu bez priority (tvar Y, vzácné).
- **Volný konec:** povrchové vrstvy každé strany zahnou přes čelo až do poloviny jádra (vnější omítka
  nejvíc ven); jádro a izolace se zkrátí o tloušťku omítek. Typ bez povrchových vrstev nebo jen z nich:
  kolmé čelo.
- **Nespojovat** (`noJoin` na napojení, jako Disallow Join): konec se počítá jako volný, obrysy se jen
  překryjí. Schéma 3 → 4 (nové volitelné pole).
- **Kresba:** čára se kreslí na hraně, za kterou je nic (obrys, pero řezu) nebo jiný materiál (pero vrstvy,
  jen střední podrobnost); mezi stejnými materiály se nekreslí. Hrubá: jen obrys sjednocený přes všechny
  viditelné stěny. Hrany se hledají po „svaření“ bodů (tolerance 0,001 mm) a rozdělení v cizích bodech.
- **Mezipaměť:** výsledek uzlu se drží podle identity vstupů (stěny, typy, materiály, vztahy); po změně
  se přepočítají jen uzly, kterých se změna týká. Nic se neukládá (základ 4).
- Oblouk: struktura s ním počítá (pás z rozložené křivky, čáry řezu z tečny v uzlu); přesné napojení Z5.

Stěny Z2 – výsledky konfigurací (podle testů `junction/*.test.ts` a galerie):
- **L, stejná skladba** (omítka 15 + zdivo 300 + EPS 150): jádra pokosem bez čáry, EPS spojitě kolem
  vnějšího rohu, omítky pokosem ve vnitřním rohu. Jádro prořízne omítku druhé stěny.
- **L, zateplená × Zdivo 300:** EPS podjede jádro druhé stěny až k jejímu vnějšímu líci; omítka končí na
  jádře druhé stěny. **L, zdivo × ŽB:** ŽB (priorita 70) projede zdivem až k vnějšímu líci.
- **T zevnitř** (Příčka 100 na zateplenou): jádro příčky projde omítkou hostitele k jeho jádru (zdivo na
  zdivo bez čáry), omítka příčky končí na líci omítky hostitele, omítka hostitele obteče roh. **T zvenku:**
  stěna projde izolací a končí na jádře hostitele (jádro hostitele nikdy).
- **X:** v buňce vyhraje vyšší priorita (ŽB projede příčku celou), při shodě hostitel; omítky se v koutech
  potkají. Kříž se ukládá jen příkazem nebo při kreslení přes stěnu – starší protínající se stěny se
  nečistí, dokud se nenapojí.
- **V přímce:** kolmý řez v uzlu; **oblouk navazující tečně na přímku je také „v přímce“** (dříve roh).
- **Tři a více konců:** dvojice v přímce = hostitel (při dvou dvojicích vyšší priorita jádra, pak menší id),
  ostatní jako T. Bez dvojice: pokos ke středu uzlu bez priority (Y).
- **Volný konec:** omítky každé strany zahnou do poloviny těla; **má-li povrch jen jedna strana**
  (zateplená bez vnější omítky), zahne přes celé čelo.
- **Nespojovat:** oba konce jako volné (s uzavřeným čelem), roh zůstane prázdný nebo se překryje.
- **Čára mezi dvěma stěnami** stejného materiálu se nekreslí ani u různých typů (zdivo 300 × zdivo 330).
- Velmi ostrý roh (pod ~2° od přímky) se bere jako „v přímce“; pokos by byl nekonečně dlouhý.

Stěny Z1:
- **Výškový pás** zůstává v datech jako {výška, vrstvy} (poslední pás výška null = do vršku); „od“ a „do“ se
  počítají ze součtu (stejná informace, bez migrace).
- **Nový projekt dostane všech 8 typů z knihovny** (jako šablona v Revitu); po „Vyčistit nepoužité“ jde typ
  načíst zpět z knihovny. Vyčištění i smazání vždy nechá v projektu aspoň jeden typ.
- **Názvy typů jsou v projektu jedinečné**; duplikát a nový typ po změně tloušťky dostanou „(2)“, „(3)“…
  Duplikát nemá odkaz na knihovnu (je to nový typ).
- **Referenční čára „líc jádra“ u typu bez jádra:** zvolit nejde (odmítne se, v UI zašedlé); když stěna typ
  s jádrem ztratí (změna typu nebo vrstev), přepne se na „líc“ – poloha se nemění (bez jádra je to totéž).
- **Úprava vrstev typu** (přidání, smazání, tloušťka) drží u stěn typu jejich referenční čáru na místě.
- **Editor typu** volí referenční čáru pro náhled a pro nové stěny (referenční čára je vlastnost stěny,
  ne typu). Nová vrstva se přidá na stranu tloušťky jako povrch 10 mm s materiálem poslední vrstvy.
- **Prodloužení vrstvy** smí být i záporné (zkrácení); význam a kresba v kroku Z3.
- **Klín a šikmé stěny (rozhodnutí A):** model nerovnoběžné líce nepřipouští (tvar jen přímá a oblouk).
- Starý příkaz `wallType.setLayerMaterial` zůstává (panel Vlastnosti), nově s validací; obecný je
  `wallType.updateLayer`.


## Další krok

- Uživatel posoudí šrafy po opravě velikosti a novou tepelnou izolaci (typ Obvodová zateplená 465, styl
  Projekt) a řekne, které doladit.
- Uživatel vyzkouší stěny Z5 (nástroj Oblouková stěna, tažení kolečka zakřivení, kruh ze dvou oblouků
  s otvorem, Okótovat celou stěnu u oblouku, galerie oblouků, IFC obloukové stěny v BIMvision) a potvrdí
  body „Rozhodl Code“ u Z4 a Z5.
- Potom stěny Z6 – kresba stěny v půdorysu (model Sonnet 5.5), stejnou větou „Pokračuj podle
  docs/instrukce-code-steny.md…“.

## Otevřené

- Šrafy podle ČSN 01 3406 (k rozhodnutí): převládající hmota bez šrafy (předvolba pravidla ve stylu),
  tenké vrstvy (hydroizolace, plech) vyčernit automaticky pod danou tloušťkou na papíře, sousední
  konstrukce ze stejného materiálu se šrafou otočenou o 90°.
- Připojení AI přes MCP (etapa 6): server nad jádrem a souborem projektu, nástroje Undo / Redo, uložení.

- Skupina zarovnaných kót zatím nedrží společnou polohu čáry po změně geometrie (kóty 4, druhá věta):
  poloha čáry je odsazení od středu líce, po prodloužení stěny se řada může rozejít. Návrh: uložit polohu
  skupiny v modelu (nová verze schématu + migrace) – k rozhodnutí.
- Jemná podrobnost (= střední), podle plánu krok Z6.
- `docs/STAV.md` má ~37 KB (limit ~40 KB): návrh přesunout hotové sekce Z1–Z3 (Hotovo + Rozhodl Code)
  do nového `docs/STAV-steny.md` – k rozhodnutí.
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

## Největší soubory (po stěnách Z5)

Výstup `npm run check:size`: varování 0, chyb 0 (396 souborů).

| Řádky | Soubor |
|---|---|
| 241 | apps/sandbox/src/interaction/tools/arc-wall-tool.ts |
| 223 | apps/sandbox/src/interaction/tools/wall-tool.ts |
| 217 | apps/sandbox/e2e/kresleni.spec.ts |
| 212 | packages/core/src/junction/wall.ts |
| 211 | apps/sandbox/e2e/koty-trvale.spec.ts |
