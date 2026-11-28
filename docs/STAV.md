# BIM-light – stav práce

Aktualizuje Claude Code na konci každého kroku. Poslední změna: 2026-11-28, střechy S1 (vícerovinná střecha v jádře, `docs/STAV-strechy.md`); popis skladby v řezu; úchopy v řezu (výška stěny, poloha desky, parapet tažením, `docs/STAV-rezy.md`); 2026-11-27 Elektro krok 1 (knihovna typů a půdorysné značky, `docs/STAV-elektro.md`); výběr prvků v okně řezu; záložky pohledů v záhlaví okna, výkazy v okně; výškové kóty v půdorysu; výškové kóty v řezech (ČSN 01 3420); řez a pohled v pracovním okně (místo dialogu); nástroj Řez a info box řezu podle Arditu; řezy a pohledy z modelu; typy desek v editoru typů; vazba desky (podlaha podle místnosti, deska podle stěn, zámek); povrchy místností (část 3: spárořez); 3D náhled běží ve druhém proudu (`docs/STAV-3d.md`).

Etapa 0 (kroky 1–4, skupina A, doplněk šraf) a její rozhodnutí jsou v `docs/STAV-etapa-0.md`.
Stěny Z1–Z5 (hotovo a rozhodnutí, Z4 a Z5 k potvrzení) jsou v `docs/STAV-steny.md`.
Rozhraní UI1–UI5 je v `docs/STAV-rozhrani.md`, šrafy v `docs/STAV-srafy.md` (hotovo i rozhodnutí k potvrzení).

## Hotovo

### Střechy, krok S1: vícerovinná střecha v jádře (2026-11-28) – v `docs/STAV-strechy.md`, scéna `?ukazka=strechy`

### Elektro, krok 1: knihovna typů a půdorysné značky (2026-11-27) – v `docs/STAV-elektro.md`, katalog `docs/katalog-elektro.md`

### Pohledy 1–4 z Obsahu (2026-11-28) – v `docs/STAV-rezy.md`, scéna `?ukazka=pohledy`

### Popis skladby v řezu (2026-11-28) – v `docs/STAV-rezy.md`, scéna `?ukazka=popis-skladeb`

### Řezy a pohledy, nástroj Řez, výškové kóty, záložky pohledů, úchopy v řezu (2026-11-27/28) – v `docs/STAV-rezy.md`

### Podlaha pod dveřmi, 2026-11-27 (pokyn uživatele; scéna `?ukazka=podlaha-dvere`, dveře v `?ukazka=dum`)

- Jádro `room/floor.ts`: průchozí otvor až k podlaze (parapet 0, stav viditelný pro místnost) přidá podlaze
  místnosti proužek v šířce otvoru přes tloušťku stěny. Výchozí `split`: každá místnost do dělicí linie
  (`floorLine` – dnes osa stěny, s dveřmi linie křídla / zárubně); bez místnosti venku jen do linie.
  Volba u otvoru `floorSplit` (split / ref = celá z A / opp = celá z B / none), příkaz `opening.setFloorSplit`,
  `opening.list` ji vrací; migrace 29 → 30. Okna s parapetem a niky nic nemění.
- Plocha místnosti (ČSN 73 4301) beze změny; proužek započítá podlaha vázaná na místnost (výkaz desek, 3D),
  povrch podlahy a spárořez (`covering.surfaces`). Posun otvoru / stěny ho přepočítá.
- Sandbox: vybraný otvor → Podlaha v otvoru. Testy `room/floor.test.ts`, AI krok v `scenario-slab-link.test.ts`.

### Typy desek v editoru typů, 2026-11-27 (hlášení uživatele; scéna `?ukazka=typy-desek`, typ P3 i v `?ukazka=dum`)

- Editor typů → záložka **Desky**: seznam rozdělený na Nosné desky a Podlahy (podle funkce), hledání,
  značka, tloušťka a počet desek. Vpravo název, značka, funkce, nosná, skladba (výběr skladeb „pro desku“,
  název, upozornění na sdílení) a vrstvy **shora dolů** (materiál, tloušťka, funkce, ↑ ↓, ×, „+ vrstva
  navrch“); Duplikovat, Smazat (jen nepoužitý typ). Uprostřed náhled řezu deskou (šrafy, kóty, horní líc =
  referenční rovina, klik vybere vrstvu). Info box desky → Konstrukce → „Upravit v editoru typů…“.
- Jádro: příkazy `slabType.addLayer / removeLayer / moveLayer / updateLayer` (vrstvy odspodu, mění skladbu
  a tím všechny typy, které ji sdílejí, i typy stěn – ty se zkontrolují); `slabType.duplicate` má
  `ownComposition`; dotaz `slabType.list` vrací u vrstev i `materialId`.
- Testy: `commands/slab/type-layers.test.ts`, AI `ai/scenario-slab-types.test.ts`, náhled
  `preview-layout.test.ts`, e2e `typy-desek.spec.ts`.

### Vazba desky na místnost a stěny, 2026-11-27 (pokyn uživatele; scéna `?ukazka=desky-vazba`, podlahy po místnostech i v `?ukazka=dum`)

- Jádro: deska nese `link` = `{ kind: 'room', roomId }` (podlaha patří místnosti: obrys od líce k líci,
  ostrovy jako `holes`) nebo `{ kind: 'walls', wallIds, boundary }` (deska podle stěn). Editor po každém
  příkazu obrys přepočítá (`slab/link.ts`, `followSlabs` – jako otvor jde se stěnou); posun stěny, příčka,
  tloušťka i výklenek ho změní. Smazaná místnost / méně než 2 stěny vazbu zruší, deska zůstane.
- Zámek (základ 16): obrys změněný příkazem při nezměněné vazbě (bod, nový obrys, posun, kóta k hraně,
  odstup) = ruční úprava → `locked`; přepočet ji nechá být. Kopie desky je ruční.
- Příkazy `slab.create` s `roomId` (nebo `walls` – vazba se uloží), `slab.linkRoom`, `slab.linkWalls`,
  `slab.unlink`, `slab.restoreLink`; `slab.list` vrací `link` (room / walls / null, locked) a `holes`;
  migrace 28 → 29. AI `scenario-slab-link.test.ts`, testy `slab/link*.test.ts`.
- Ostrovy podlahy: plocha, obvod, výběr (klik do ostrova desku nevybere), půdorys (obrys ostrova), 3D
  (prořízne jako otvor), IFC (IfcArbitraryProfileDefWithVoids).
- Výkaz desek: ruční podlaha (bez vazby na místnost) odečte z plochy a objemu půdorys stěn, které ohraničují
  místnosti podlaží (`slab/floor-area.ts`).
- Přepočet, který změní počet bodů obrysu, smaže kóty k hranám té desky (indexy hran by ukazovaly jinam).
- Sandbox: Deska (S) → metoda **Podle místnosti** (klik do místnosti, náhled obrysu, číslo v trackeru);
  Podle stěn ukládá vazbu. Info box vybrané desky: Vazba obrysu (vázáno na místnost / stěny / ručně, zamčeno),
  Obnovit vazbu, Zrušit vazbu. E2E `desky-vazba.spec.ts`. Dům: podlahy po místnostech vázané na místnost.

### Spárořez (povrchy místností, část 3), 2026-11-27 (scéna `?ukazka=sparorez`, dlažba i v `?ukazka=dum`)

- Jádro `covering/tiling.ts`: mřížka formátu a spáry v rovině plochy (u, v) od bodu zarovnání (od rohu =
  levý dolní roh obálky, na střed = střed dlaždice ve středu, na osu = osa spáry ve středu) + uložený posun,
  ořezaná na obrys minus otvory; celé kusy, odřezy s rozměry, úzké řezy, spáry jako osy (úsečky).
  `tiles.ts`: spárořez všech ploch s formátem v místnosti (podlaha, strop, zóny stěn, ostění), pamatuje se
  pro model – změna stěn a otvorů vše přepočítá.
- Počátek je v místnosti logicky (`coverings.tileOrigins`: `floor` / `ceiling` / `wallId:strana` → posun),
  příkaz `covering.setOrigin`. Dotazy `covering.joints` (spáry + rámec do 3D, pro 3D okno) a `covering.tiles`
  (počty, úzké řezy, počátek). AI `scenario-tiling.test.ts`.
- Výkaz dlaždic (zdroj `tiles`, migrace 27 → 28): po místnostech a typech celé, řezané, celkem a celkem
  s prořezem (`wastePercent` výkazu, výchozí 10 %; `schedule.update`).
- Půdorys: spáry dlažby podlahy jako tenké čáry přes funkci grafiky (kategorie úprav, pero `layerPen`,
  barva spáry typu jako vlastní výchozí grafika); ve stylu `tileJoints`, příkaz `style.setTileJoints`.
- Sandbox: info box místnosti → Povrchy → Spárořez (celé + řezané = celkem, upozornění na úzké řezy, posun
  počátku X / Y podlahy a vybrané stěny); ve vybrané místnosti křížek počátku dlažby, tažením se posune.
  E2E `sparorez.spec.ts`.

### Povrchy místností, část 2, 2026-11-27 (scéna `?ukazka=povrchy`, povrchy i v `?ukazka=dum`)

- Jádro `covering/`: typ úpravy (IfcCovering) = název, druh (malba, omítka, obklad, dlažba, podlahovina,
  podhled, sokl), materiál projektu, u obkladu / dlažby / soklu formát, spára, barva spáry, zarovnání (zatím
  jen uloženo). Knihovna 8 vymyšlených typů + 5 materiálů úprav (stabilní id `cov-…`, `mat-cov-…`), migrace
  26 → 27 (+ Výkaz povrchů). Přiřazení v místnosti: zóny stěn celé místnosti, přepis `wallId:strana`,
  podlaha, strop (základ 14 – posun stěny ho nezničí).
- Jedna spočítaná plocha (`roomSurfaces`): hrany obrysu místnosti → stěna a strana (bod 1 mm za hranou),
  úseky líce rozvinuté (u po líci, v výška; oblouk = válec), minus otvory (polygon-clipping v jádře),
  zóny, ostění (boky, nadpraží, parapet, dno niky), podlaha a strop z obrysu; každá s transformací do 3D.
- Výkaz povrchů (zdroj `coverings`): m² po místnostech, povrchu a typu, odečtené otvory, ostění, délka soklu
  bez dveří; pravidlo `minOpeningArea` + `jambRule`. Razítko a Výpis místností berou povrchy z přiřazení.
- Příkazy `coveringType.create / update / duplicate / delete`, `covering.setZones`, `covering.assign`;
  dotazy `covering.surfaces` (pro 3D okno), `covering.room`, `coveringType.list`; AI `scenario-coverings`.
- Sandbox: info box místnosti, sekce Povrchy (podlaha, zóny stěn, strop, plochy po typech); klik u líce
  ve vybrané místnosti vybere stěnu → Vlastní zóny této stěny. E2E `povrchy.spec.ts`.

### Místnosti, 2026-11-27 (povrchy místností, část 1; scéna `?ukazka=mistnosti`, místnosti i v `?ukazka=dum`)

- Jádro `room/`: místnost = IfcSpace v `model.rooms` (číslo, název, bod uvnitř, vršek, stav, varianta, poloha
  razítka, ruční obrys se zámkem). Obrys se počítá (`arrangement.ts`): obrysy stěn rozložené na hrany, hranice
  volného prostoru, nejmenší smyčka kolem bodu; ostrovy (sloup, komín) se odečtou, výklenky ≥ 0,30 m / ≥ 2,00 m
  k podlaze se vyříznou ze stěn, dveře nic nemění, oblouky rozložené na body. Stav ok / neuzavřená / bod ve
  stěně / nadbytečná. Plocha 2 des. místa, obvod, výška, objem. Migrace 22 → 23 (+ Výpis místností).
- Příkazy `room.create` (N), `room.update`, `room.delete`, `selection.delete` roomIds,
  `element.setGraphicOverride` i pro místnosti; dotaz `room.list`, karta prvku; AI `scenario-rooms.test.ts`.
- Kresba: razítko podle `labels` stylu (číslo, název, plocha), písmo na papíře, výplň jen z grafiky (pravidlo,
  přepis). IFC: IfcSpace s obrysem (ostrovy = vnitřní křivky), výškou, Pset_SpaceCommon, Qto (web-ifc).
- Sandbox: nástroj Místnost (náhled obrysu a plochy pod kurzorem), výběr klikem do místnosti / na razítko,
  rámečkem, filtr „Vybírat místnosti“, info box (číslo, název, plocha jen ke čtení, výška, varování), tažení
  razítka, Del. E2E `mistnosti.spec.ts`.
- Doplnění (pokyn uživatele): kategorie místností `model.roomCategories` (knihovna 6 vymyšlených, barva +
  obytná / užitková plocha; migrace 23 → 24), barva kategorie = výchozí výplň (patro 1), vlastní barva =
  přepis prvku (patro 5), pravidla umí `roomCategory`. Obsah razítka = `Style.roomStamp` (18 údajů v pořadí,
  přenáší se s nastavením zobrazení), příkaz `style.setRoomStamp`, sekce Razítko v info boxu. Zadávané údaje
  (povrchy textem, poznámka, osoby, teplota, výška podlahy) v `room.update`, info boxu i Výpisu místností.
  Příkazy `roomCategory.*`, dotaz `roomCategory.list`. Testy přepočtu: délka, tloušťka, smazání, výklenek.
- Oprava (hlášení uživatele: popisky moc velké): razítko podle ČSN 01 3420 – číslo 2,5 mm tučně, ostatní
  řádky 1,8 mm, řádkování 1,3 × výška; velikosti v `display.paperSizes` (`roomNumberText`, `roomText`,
  `roomLineSpacing`; migrace zobrazení 8 → 9, projektu 24 → 25). Ověřeno v 1:100 i 1:50 (`?ukazka=mistnosti`).

### Desky D1–D4, přesný otvor, velikost rozhraní, 3D pohledy (2026-11-27) – v `docs/STAV-archiv.md`

### Starší kroky (kóty, stěny Z7–Z10, editor typů, opravy 2026-11-26) – v `docs/STAV-archiv.md`

### Rozhraní UI1–UI5 hotovo (podrobnosti a rozhodnutí v `docs/STAV-rozhrani.md`)

### Stěny: Z1, Z2, Z3, Z4, Z5, Z6 hotovo (podrobnosti v `docs/STAV-steny.md`)
- Z1 typ a skladba (2026-11-24), Z2 napojování vrstev (2026-11-24), Z3 výška a IFC (2026-11-24),
  Z4 otvory (2026-11-25), Z5 oblouk (2026-11-25), **Z6 kresba v půdorysu (2026-11-26)**,
  **Z7 vlastnosti a úplný IFC**, **Z8 výkazy a popisky (2026-11-26, výše)**. Kroky Z9–Z10 podle plánu.

### Šrafy (ČSN 01 3420, tepelná izolace, velikost) hotovo (podrobnosti v `docs/STAV-srafy.md`)

## Rozhodl Code (k potvrzení)

- **Řezy, výškové kóty a záložky pohledů:** v `docs/STAV-rezy.md`.

- **Střechy S1** (polovalba odložena, úhel okapu vodorovně, výběr hrany před stěnou…): v `docs/STAV-strechy.md`.

- **Podlaha pod dveřmi:** A = místnost u referenčního líce stěny, B = u protilehlého. Sokl (obvod podlahy)
  zůstává podle místnosti, proužek ho nemění. Volba platí jen pro průchozí otvor k podlaze (parapet ≤ 1 mm).

- **Typy desek v editoru:** Duplikovat v editoru dá kopii **vlastní skladbu** (jako Duplikovat v Revitu –
  úprava kopie nemění původní typ); AI může kopii se sdílenou skladbou (`ownComposition` vynechat). Vrstvy
  desky se v editoru ukazují shora dolů (jako řez a Revit „Upravit skladbu“), „+ vrstva“ přidá navrch.
  Smazat jde jen typ bez desek (bez náhrady – na rozdíl od stěn). Nový typ desky jen duplikováním (Nový typ
  a načtení z knihovny zatím ne). Náhled desky má jen řez (půdorys a 3D vrstev desky nic nového neukážou).

- **Vazba desky:** obrys vázané desky se ukládá jako poslední spočítaný (přepočítá ho editor po každém
  příkazu), aby kresba, 3D, IFC, výkazy, otvory i kóty četly jedno `outline` – zdroj pravdy je vazba.
  Revit: podlaha z hranice místnosti je po místnostech; příčka ji rozdělí (podlaha zůstane v místnosti
  s bodem). Ruční podlaha přes více místností se v půdorysu ani 3D neořezává, jen výkaz odečte stěny
  (stěny ohraničující místnosti, výška 1200 nad podlažím); nosná deska se neodečítá. Na místnost jde navázat
  jen podlaha (nosná deska → podle stěn). Posun i kopie vázané desky = ruční (kopie bez vazby). Ruční nový
  obrys u podlahy s ostrovy ostrovy ponechá. Neuzavřená místnost / chybná smyčka stěn: deska drží poslední
  obrys (vazba trvá a po opravě se obnoví). Kóty k ostrovům a přichytávání k nim zatím nejsou.

- **Spárořez:** úzký řez = rozměr odřezu pod třetinou formátu, aspoň 50 mm, nejvýš polovina formátu
  (mozaika); 600 → 200 mm, sokl 80 → 40 mm. Každý odřez = jedna dlaždice (zbytky se znovu nepočítají),
  prořez se přičte nahoru na celé kusy za místnost a typ. Počátek je jeden pro celý líc stěny (všechny zóny
  a úseky), ostění má vlastní od rohu bez posunu. Půdorys kreslí jen podlahu; výchozí podle podrobnosti
  (hrubá = Studie ne, střední / jemná = Projekt ano), ve stylu jde zapnout / vypnout. Spáry jsou osy spár
  (jedna čára), šířka spáry je v dotazu pro 3D. Tažení křížku jen u podlahy, stěny číslem v info boxu.

- **Povrchy:** ve výkazu výchozí pravidlo podle rozpočtové praxe – otvory do 4 m² se neodečítají a jejich
  ostění se nepřičítá, větší se odečtou a ostění přičte (nastavitelné u výkazu). Ostění průchozího otvoru
  do poloviny tloušťky stěny (okna zatím nejsou), nika celá + dno. Strop ve výšce vršku místnosti, stěny do
  vršku stěny nebo místnosti (nižší). Zóny odspodu, poslední „ke stropu“; přidaná zóna nahoře dědí typ.
  Typ bez materiálu = šedá. Výběr líce klikem do 12 px od líce uvnitř vybrané místnosti (stěna má přednost
  těsně u čáry). Druh soklu přidán k zadaným šesti (kvůli délkám soklů).

- **Místnosti:** místnost je zvlášť (`model.rooms`), ne mezi prvky – IfcSpace nemá typ ani skladbu.
  Hranice = stěny protínající 1200 mm nad podlahou (Revit „Computation Height“), i z podlaží pod; nová
  místnost vidí stávající + nové stěny, stávající stávající + bourané. Výchozí výška = podlaží nad. Ve stejném
  prostoru je nadbytečná druhá místnost (Revit). Klik do místnosti má přednost před deskou, u hrany desky (6 px)
  deska. Číslo „podlaží.pořadí“ (1.01, 2.01, 0.01 pro 1.PP). Zkratka N (P je Pole). Dělicí čáry místností
  nejsou (dokumenty je nemají) – přijdou s 2D kresbou. Bez kategorie bez výplně; barvu dá kategorie (patro 1
  jako Archicad Zone Category), styl, pravidlo nebo přepis. Bez kategorie = užitková plocha. Razítko je
  v datech stylu (ne typ razítka), starší styl bez seznamu bere `labels`; v IFC kategorie = ObjectType.

- **Přesný otvor:** kóty při kreslení před 1. klikem jdou od kurzoru (jen informace), po 1. kliku od položených
  bodů (stojí, klik na číslo je posune; velikost pak trackerem) – Revit u náčrtu edituje jen položené.
  Měří se od krajní hrany (nebo krajního rohu) obrysu ve směru X / Y; líc stěny má přednost před hranou desky
  na něm; hrana desky ležící na líci = vzdálenost 0 se přeskočí (měří se k dalšímu prvku).

- **Velikost rozhraní:** je volba obrazovky (jako motiv), ne data projektu, proto bez příkazu a bez ukázkové
  scény. Malé (85 %) ≈ dřívější velikost. Panely v úzkém okně max. čtvrtina šířky; tažení dělítka se tam zastaví.

- **Desky D4:** vazba vršku je druh vršku ve výšce stěny (ne samostatný vztah) – jako Archicad „spojit
  s deskou“; celá stěna končí na spodním líci (Revit by stěnu ořízl po tvaru desky, šikmé desky zatím nejsou).
  Deska nad stěnou = obrys nad některým bodem osy, nejnižší spodní líc nad spodkem stěny (nosný strop, ne
  podlaha). Odpojení zachová výšku jako „podlaží + 1 + odsazení“. Kopie na jiné podlaží vazbu nenese.
  Schéma +1 (21 → 22) kvůli výchozímu výkazu desek. Roh desky se kótuje rovnoběžně s druhým lícem, dva rohy
  vodorovně / svisle podle větší vzdálenosti (Revit). Rozdělit rovnoměrně (EQ) jen u řady ke stěnám.
  Zámek kóty k desce brání posunu desky jako u stěn. Záložka Typ desky v info boxu nestihla → Otevřené.

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

Stav k 2026-11-28 (přechod na jiný počítač): vše je v `main` (c19f67d), CI zelené, žádná rozdělaná práce
ani neuložené změny v sessions. Na novém počítači stačí napsat „pokračuj“ (postup v `CLAUDE.md`), pracovní
pokyny jsou v `docs/pracovni-postup.md` (koordinátor + vedlejší sessions, push po zelených testech, kontrola CI).
Řezy, výškové kóty a záložky pohledů vede `docs/STAV-rezy.md`, elektro `docs/STAV-elektro.md`.

**Čeká na rozhodnutí uživatele (z 2026-11-27):**
- Elektro: stejné barvy skupin z legendy (Data = Zabezpečení tyrkys, Silnoproud = Řízení červená) nechat,
  nebo odlišit; typy mimo legendu (dvojzásuvka a složené z legendy, PIR jako obdélník „PIR“, svítidlo
  nástěnné = přisazené na držáku) potvrdit, nebo uživatel doplní legendu v Corelu.
- Legenda značek uživatele (Corel SVG, zdroj tvarů elektro značek) je jen na původním počítači
  v `D:\Download\legenda elektro znacek.svg` (mimo repo, repo je veřejné); tvary už jsou v knihovně jádra.
- Řezy: žlutá barva fáze bourání v řezu a další body „Rozhodl Code“ v `docs/STAV-rezy.md`.

0. **Střechy S2–S4** (nástroj podle Arditu, napojení stěn a podkroví, krov) – „Další krok“ v `docs/STAV-strechy.md`.
1. **Řezy – dál:** výškové kóty parapetů, nadpraží a terénu, tlačítko „plné praporky“ ve stylu, „Řez A / Řez B“ v rozbalovači 3D okna (data:
   `section.list` → `cutPlane3d`), okna a dveře v řezu (etapa 4), terén.
2. **Spáry ve 3D** (3D okno) z dotazu `covering.joints` (tvar ve `docs/STAV-3d.md` / popis dotazu v registru).
3. **Podlahy a stropy** (poslední část povrchů místností) a rozvinutý pohled stěny se spárořezem (Otevřené).
4. Body „Rozhodl Code (k potvrzení)“ projít s uživatelem (i nové v `docs/STAV-elektro.md`).
5. **Elektro, krok 2** (po probrání se screenshoty Arditu): nástroj pro vkládání a výběr elektro prvků,
   vazby vypínač → svítidla, okruhy a rozvaděč, legenda značek (vzor legendy Arditu, nový zdroj výkazu) – podrobně „Další krok“ v `docs/STAV-elektro.md`.

**Uživatel může vyzkoušet** (ukázky `…/BIM-light/?ukazka=<klíč>`): `strechy`, `popis-skladeb`, `rezy-uchopy`, `elektro`, `rezy`, `podlaha-dvere`, `typy-desek`, `desky-vazba`,
`sparorez`, `povrchy`, `mistnosti`, `desky-d4`, `desky-presny-otvor`, `desky-otvory`, `desky-kresleni`,
`desky`, `dum` (i s `&3d`). Starší seznam „vyzkouší“ je v `docs/STAV-archiv.md`.

## Otevřené

- **Detail napojení 1:5–1:10** (pokyn uživatele): kreslí se zvlášť jako 2D detail nad výřezem řezu (Revit
  Callout + 2D kresba, základ 22); model dává základní napojení pro 1:50 a 1:100. Zatím nedělat.
- **Uložení stropu – zbývá:** zateplení přes čelo u stěny s vazbou vršku na desku (D4), uložení v půdorysu,
  věnec / pozednice jako samostatný prvek, atika (přesah stěny nad deskou jiného podlaží).
- **Terén:** zatím není v modelu – RT / UT u kóty terénu a výška terénu v řezu jsou čísla zadaná u značky;
  až bude terén (situace, etapa), vezmou se z něj.
- **Řezy – zbývá:** výběr řezu rámečkem, přidání / ubrání zalomení u hotového
  řezu, úchyty hloubky pohledu v půdorysu, popis skladby v půdorysu, materiály a terén
  ve fasádě, okolní zástavba, šikmé střechy a schodiště (až budou prvky), hrany prvků za
  rovinou podrobněji (rohy šikmo viděných stěn, ostění u fasády), místnosti a kóty v řezu, výškové kóty
  parapetů a nadpraží na fasádě, uložení vlastní polohy výškových kót.

- **Povrchy – zbývá:** okno typů úprav (dnes jen příkazy / AI a výběr v info boxu), rozvinutý pohled
  stěny se spárořezem (dotaz `covering.joints` ho umí), spárořez stropu (podhledu) v pohledu nahoru, vazba
  spárořezu stěn přes roh (dnes každý líc od svého rohu), vazba (na střih / půl / třetinu) a natočení dlažby, IfcCovering v exportu IFC, ostění u otvoru s obecným obrysem, plochy nad započítaným výklenkem,
  povrchy ve 3D (3D proud).

- **Místnosti – zbývá:** šikmé stropy (< 1,30 m, ČSN 73 4301) po střechách; volba 1 desetinného místa v nastavení
  projektu (funkce `areaM2` ji umí); úprava ručního obrysu myší (příkaz je); místnosti ve variantách v kresbě.
- **Desky – zbývá:** záložka Typ desky v info boxu (dnes tlačítko do editoru typů), Nový typ desky a načtení
  z knihovny v editoru, oblouky v obrysu; vršek stěny po tvaru šikmé desky;
  délková kóta hrany desky (dnes jen vzdálenost); vazba vršku v IFC (IfcRelConnectsElements) zatím není.
- **Z10 zbývá:** kontrola překryvu oblouků, mezery v obrysu místnosti (s místnostmi), import ze
  zaměřování a kouzelná hůlka (etapa 3).
- **Skladby – další:** výpočty u skladby podle vzoru Arditu (U, R, plošná hmotnost, CO₂e, cena,
  kondenzace, Rw) – vyžadují vlastnosti materiálů (λ, hustota…); seznam samotných skladeb (bez typu)
  v okně a jejich přímé zakládání; desky a střechy skladby použijí, až budou.
- **Lineární prvek stěny (nápad uživatele 2026-11-26):** přidání nebo vybrání hmoty podle profilu (sokl,
  římsa, drážka) jako Obklad stěny / Drážka v Revitu; profil jako položka knihovny, součást typu nebo
  instance, vybrání přes společný mechanismus otvorů (základ 19). Zařadit po oknech a dveřích.
- Z8: výběr a tažení značky typu myší (dnes jen info box a příkaz); legenda skladeb jako kresba (řez
  skladbou se šrafami) na výkrese – s etapou 7 (listy); export XLSX
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
  **Výšková kóta** (parapet) v půdorysu zatím neexistuje. **Řez** – otvor se v řezu kreslí jako prázdný
  (parapet, nadpraží); výplň okna / dveří až s etapou 4.

## Největší soubory (po řezech a pohledech)

Výstup `npm run check:size`: bez varování (STAV.md 35 KB).

| Řádky | Soubor |
|---|---|
| 250 | apps/sandbox/src/interaction/tools/select/select-tool.ts |
| 248 | apps/sandbox/src/session/session.ts |
| 245 | packages/core/src/samples/house.ts |
| 244 | apps/sandbox/e2e/koty-trvale.spec.ts |
| 241 | apps/sandbox/src/view3d/viewer.ts |