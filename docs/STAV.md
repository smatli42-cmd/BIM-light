# BIM-light – stav práce

Aktualizuje Claude Code na konci každého kroku. Poslední změna: 2026-11-25, rozhraní UI2 – paleta a info box.

Etapa 0 (kroky 1–4, skupina A, doplněk šraf) a její rozhodnutí jsou v `docs/STAV-etapa-0.md`.
Stěny Z1–Z5 (hotovo a rozhodnutí, Z4 a Z5 k potvrzení) jsou v `docs/STAV-steny.md`.

## Hotovo

### Rozhraní: UI2 hotovo, 2026-11-25 (paleta a info box)
- **Info box po sekcích** (`ui/infobox/`): sbalitelné sekce s (i); přepínač **Instance / Typ** (Typ =
  editor skladby typu). Obsah podle situace: příkaz nad výběrem → jeho volby (kopie, pole); výběr →
  vlastnosti (stěny: typ, referenční čára, konstrukce, výška a úroveň, zobrazení; otvory; kóty); nástroj
  Stěna → „Výchozí nastavení nových prvků“ (typ, metoda, referenční čára, souhrn skladby); Výběr bez
  výběru → metoda výběru a mřížka.
- **Metoda Stěny** (jen u stěny): jedna stěna / řetěz / obdélník / oblouk třemi body; zkratky B a A
  přepnou metodu, v paletě zůstává jedno tlačítko Stěna (Oblouková stěna a Obdélník z palety zmizely).
- **Řetěz – plovoucí nabídka druhu úseku** po prvním kliku: úsečka / tečný oblouk (navazuje na předchozí
  úsek) / oblouk bodem (bod na oblouku, pak konec); M přepíná, Esc zruší rozkliknutý bod oblouku.
- **Rychlý výběr typu**: podržení, dvojklik nebo pravé tlačítko na nástroji Stěna otevře typy stěn.
- **Referenční čára jako ikony** (líc / osa / líc jádra) + přehození strany; **bubliny jen „název –
  zkratka“**.
- **Referenční čára vně / uprostřed / uvnitř** + převrácení (podle vzoru); v jádře nová hodnota
  `opp-face` (protilehlý líc), schéma 8 → 9 (`wall/migrate-v8.ts`, data beze změny). **Dvojitá šipka**
  u vybrané stěny (před referenčním lícem, kousek vedle středu) ji klikem převrátí.
- Rozdělení: stav řetězu a napojení úseku do `wall-chain.ts`. Testy: jádro 639, prohlížeč 106 (nové
  `rozhrani.spec.ts`; volby příkazů se v testech nastavují až při aktivním příkazu).

### Rozhraní: UI1 hotovo, 2026-11-25 (kostra podle `docs/koncepce-rozhrani.md`)
- **Rozložení A–G** (`apps/sandbox/src/ui/layout/`): A horní lišta (název, projekt, sady Studie / Projekt /
  Elektro = styl aktivního okna, Zpět / Znovu, Exportovat IFC, podklad výkresu, motiv), B lišta příkazů
  (hledání – zatím neaktivní, UI3; přesunout, kopírovat, otočit, zrcadlit, pole | zarovnat, do rohu,
  rozdělit), C paleta nástrojů (jen ikony s bublinou název – zkratka – popis z registru), D info box
  (název nástroje / výběru + dosavadní panel Vlastnosti), E okno pohledu (záložka s výběrem pohledu,
  nový pohled, měřítko, štítek „Půdorys · 1.NP (±0)“), F panel sekcí + F' svislá lišta (Podlaží, Vrstvy,
  Typy stěn, Materiály, Šrafy; křížek panel skryje), G spodní lišta (zoom, šrafy ×, rovina řezu, kóty do,
  nápověda, souřadnice).
- **Motivy** (`styles/theme.css`): barvy jen jako proměnné; světlý výchozí, tmavý přes `data-theme`.
  **Podklad výkresu** papír / tmavý (`render/paper.ts`): na tmavém se jen při zobrazení zesvětlí tmavé
  čáry a texty a ztlumí výplně; data a export beze změny. Volba se pamatuje v prohlížeči.
- **Ikony** (`ui/icons/`): vlastní sada ~50 SVG ikon (24 px, čára 1,5, barva z motivu), komponenta
  `Icon` a `IconButton`.
- Styly rozdělené na `theme.css`, `layout.css`, `controls.css`, `panels.css`; staré `Toolbar`,
  `SidePanel`, `ViewBar` nahrazeny (`ViewControls.tsx` drží ovládání pohledu).
- Testy: prohlížečové testy mají okno 1700 × 1000 (širší rozložení); testovací háček hledá plátno výkresu
  podle `data-testid` (v info boxu je i náhled skladby); nové testy rozložení a motivu. Jádro 639,
  prohlížeč 102, vše zelené.

### Stěny: Z1, Z2, Z3, Z4, Z5 hotovo (podrobnosti v `docs/STAV-steny.md`)
- Z1 typ a skladba (2026-11-24), Z2 napojování vrstev (2026-11-24), Z3 výška a IFC (2026-11-24),
  Z4 otvory (2026-11-25), Z5 oblouk (2026-11-25). Další krok stěn je Z6, až po rozhraní UI1–UI5.

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

Rozhraní UI2 (2026-11-25):
- **Uvnitř = líc u první vrstvy skladby** (výchozí „líc“ dosavadních stěn), **vně = líc u poslední vrstvy**.
  U knihovních typů je první vrstva vnitřní omítka, takže to odpovídá; u vlastních typů rozhoduje pořadí
  vrstev v editoru skladby.
- **Líc jádra** z info boxu zmizel (vzor ho nemá); zůstává v datech, pro AI a ve výběru v editoru typu.
- Dvojitá šipka je jen u jedné vybrané stěny; u více vybraných převrací tlačítko v info boxu.

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

## Další krok

- Uživatel posoudí šrafy po opravě velikosti a novou tepelnou izolaci (typ Obvodová zateplená 465, styl
  Projekt) a řekne, které doladit.
- Uživatel vyzkouší stěny Z5 (nástroj Oblouková stěna, tažení kolečka zakřivení, kruh ze dvou oblouků
  s otvorem, Okótovat celou stěnu u oblouku, galerie oblouků, IFC obloukové stěny v BIMvision) a potvrdí
  body „Rozhodl Code“ u Z4 a Z5.
- Uživatel vyzkouší UI2 (info box, metoda Stěny, nabídka úseku řetězu, rychlý výběr typu).
- Potom **UI3 – lišta příkazů a Obsah**: hledání příkazů Ctrl+K, Obsah projektu vpravo se záložkami
  (podlaží, pohledy…), lišta sekcí. Před začátkem si vyžádat screenshot Obsahu a hledání z Arditu.
  Pak UI4–UI5, až po nich stěny Z6.

## Otevřené

- Šrafy podle ČSN 01 3406 (k rozhodnutí): převládající hmota bez šrafy (předvolba pravidla ve stylu),
  tenké vrstvy (hydroizolace, plech) vyčernit automaticky pod danou tloušťkou na papíře, sousední
  konstrukce ze stejného materiálu se šrafou otočenou o 90°.
- Připojení AI přes MCP (etapa 6): server nad jádrem a souborem projektu, nástroje Undo / Redo, uložení.

- Skupina zarovnaných kót zatím nedrží společnou polohu čáry po změně geometrie (kóty 4, druhá věta):
  poloha čáry je odsazení od středu líce, po prodloužení stěny se řada může rozejít. Návrh: uložit polohu
  skupiny v modelu (nová verze schématu + migrace) – k rozhodnutí.
- Jemná podrobnost (= střední), podle plánu krok Z6.
- UI1: hledání příkazů (Ctrl+K) je zatím jen neaktivní ikona (UI3); panel Podlaží je provizorní místo
  Obsahu (UI3); úpravy Studie / Projekt jsou zatím jen dva styly bez Elektro.
- UI2: metody natočený obdélník a oblouk středem (jsou ve vzoru) zatím nejsou; tracker u tečného oblouku
  a oblouku bodem jen ukazuje poloměr a úhel (číslo napsat nejde); rychlý výběr typu zatím jen u Stěny.
- Kóty u oblouku podle uživatele nefungují správně – probrat a opravit později (zadání upřesní uživatel).
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

## Největší soubory (po stěnách Z5)

Výstup `npm run check:size`: varování 0, chyb 0 (396 souborů).

| Řádky | Soubor |
|---|---|
| 241 | apps/sandbox/src/interaction/tools/arc-wall-tool.ts |
| 223 | apps/sandbox/src/interaction/tools/wall-tool.ts |
| 217 | apps/sandbox/e2e/kresleni.spec.ts |
| 212 | packages/core/src/junction/wall.ts |
| 211 | apps/sandbox/e2e/koty-trvale.spec.ts |
