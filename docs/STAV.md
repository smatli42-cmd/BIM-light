# BIM-light – stav práce

Aktualizuje Claude Code na konci každého kroku. Poslední změna: 2026-11-26, stěny Z8 – výkazy, legenda skladeb a značky typu.

Etapa 0 (kroky 1–4, skupina A, doplněk šraf) a její rozhodnutí jsou v `docs/STAV-etapa-0.md`.
Stěny Z1–Z5 (hotovo a rozhodnutí, Z4 a Z5 k potvrzení) jsou v `docs/STAV-steny.md`.

## Hotovo

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

### Rozhraní: UI5 část 2 hotovo, 2026-11-26 (Změnit velikost a průvodní lekce podle Arditu)
- **Ctrl+K = Změnit velikost** (jako Resize v Archicadu; „hledání příkazů“ z plánu vypuštěno, v Arditu
  Ctrl+K není). Jádro: příkaz **`wall.scale`** (vybrané stěny, výchozí bod, poměr; tloušťky a výšky
  zůstávají; otvory drží poměrnou polohu středu, šířka jen se `scaleOpenings`), `scalePath` v geometrii,
  krok scénáře AI. Sandbox: okno Měřítko (%) + Změnit i rozměry oken, dveří a otvorů → Pokračovat →
  klik výchozího bodu (náhled kolem kurzoru); ikona v liště B za Polem.
- **Průvodní lekce** (ikona ? v horní liště): seznam lekcí s počtem kroků, budoucí zašedlé
  („připravujeme“). Krok = modrý rámeček kolem části okna + bublina (Zpět / Další / Ukončit).
  **Prostředí aplikace** (8 kroků) a **Výběr a úpravy** (4 kroky, cvičný projekt – místnost s oknem;
  po ukončení se vrátí původní projekt i s historií Zpět: `Editor.saveState / restoreState` v jádře).
- Testy: jádro a nástroje 680, prohlížeč 130 (nové `velikost.spec.ts`, `lekce.spec.ts`).

### Rozhraní: UI5 část 1 hotovo, 2026-11-26 (plovoucí prvky podle screenshotů z Arditu)
- **Paleta u uzlu** (`interaction/tools/select/pet.ts`, `ui/PetPalette.tsx`): klik (ne tažení) na koncový
  uzel vybrané stěny spustí posun uzlu a ukáže paletu – nahoře Posun uzlu (běží), Odpojit roh a
  Spojovat / Nespojovat (jen u napojeného konce), Smazat uzel; dole Přesunout, Kopírovat, Otočit,
  Zrcadlit, Pole. **Paleta u hrany** (klik na líc): Odsadit (běží), Přidat bod, Zakřivit + stejný dolní řádek.
- **Karta prvku** (`ui/HoverCard.tsx`): kurzor stojí 0,8 s nad stěnou / otvorem → souhrn (stěna: délka ·
  čistá plocha boku, tloušťka, výška, skladba, plocha boku / čistá, vrstva; otvor: šířka × výška,
  parapet, spodní hrana, stěna, vrstva). Pohyb kartu schová. **Vypínač ve spodní liště** (ikona karty).
  Data počítá jádro `selection/element-info.ts`; pro AI nový dotaz **`element.info`** (+ krok scénáře).
- **Tracker jako panel** (řádky popis – číslo, aktivní modře): při kreslení stěny Délka, Úhel, ΔX, ΔY;
  při posunu uzlu Délka, Vzdálenost, ΔX, ΔY. Karta, tracker i paleta se u okraje okna překlopí dovnitř.
- Testy: jádro a nástroje 672, prohlížeč 126 (nové `plovouci.spec.ts`).

### Rozhraní: pracovní plocha, 2026-11-26 (pokyn uživatele)
- **Panely bez mezer:** paleta, info box, okna a Obsah těsně vedle sebe, oddělené čarou; zaoblená
  zůstávají jen pole, tlačítka a plovoucí nabídky. Rámeček aktivního okna (při dvou oknech) je uvnitř.
- **Šířka info boxu a Obsahu tažením dělítka** (`ui/layout/Splitter.tsx`, `ui/panel-sizes.ts`):
  200–600 px, dvojklik vrátí výchozí (270 / 300 px); pamatuje se v prohlížeči (volba obrazovky, ne model).
- **Dvě okna vedle sebe – poměr tažením dělítka** (`ui/layout/WindowSplitter.tsx`): 15–85 %, dvojklik
  vrátí půlky, pamatuje se v prohlížeči.
- **Záhlaví úzkého okna se neořezává:** název pohledu se zkrátí (…); pod 260 px zmizí tlačítko Nový
  pohled a ikona, pod 160 px i název – měřítko zůstane vždy celé (dotaz na šířku kontejneru v CSS).
- **Podrobnost (hrubá / střední / jemná) odebrána ze spodní lišty**; v jádře a pro AI zůstává
  (`view.setDetail`, základ 5), nastavovat se bude jinde. Koncepce rozhraní, tabulka G, řádek 13 upraven.
- Testy: jádro 668, prohlížeč 120 (4 nové v `rozhrani.spec.ts`).

### Rozhraní: moderní vzhled, 2026-11-26 (připomínka uživatele podle vzoru)
- **Tři roviny barev** v obou motivech (`styles/theme.css`): podklad aplikace < panely (karty) a v nich
  barevně odlišená **pole k vyplnění** (`--field`, v tmavém tmavší, ve světlém bílá) a **tlačítka**
  (`--btn`, v tmavém světlejší, ve světlém bílá se stínem). Nadpisy sekcí tmavomodré (`--heading`).
- **Zaoblení** přes `--r-sm` / `--r` / `--r-lg` (6 / 9 / 14 px): panely, paleta a okna jsou karty s
  mezerou 6 px na podkladu; lišty A, B, G leží na podkladu bez čar. Rozbalovací pole mají vlastní šipku,
  zaměřené pole modrý prstenec, tenké posuvníky. Přepínače Studie / Projekt a Instance / Typ jsou
  segmentové „kapsle“ (`.seg`). Modrý rámeček aktivního okna jen při dvou oknech.
- `panels.css` (631 ř.) rozdělen na `panels.css`, `floating.css`, `infobox-content.css`, `find-bar.css`.
- Testy beze změny zelené: jádro 668, prohlížeč 116.

### Rozhraní: UI4 hotovo, 2026-11-26 (spodní lišta a okna, podle tabulky v koncepci, část 2 G)
- **Jádro:** příkazy `view.setLayerCombination` (kombinace vrstev okna, null = podle stylu) a
  `view.setLayerStates` (víc vrstev najednou, jeden krok Zpět); `drawView(…, { mergeMaterials })` –
  průchozí materiál jde vypnout (mezi stěnami stejného materiálu se pak kreslí dělicí čára).
- **Spodní lišta** (`ui/bottom/`): zoom s % (100 % = skutečná velikost v měřítku) a nabídka Vše / Výběr /
  Oknem / 100 %; **jedno / dvě okna vedle sebe**; **trasování** (Níž / Výš / podlaží, intenzita, nad /
  pod aktivním, prohodit odkaz); **pomocné prvky, přichytávání a krok** (vyp., 10–500 mm); **kombinace
  vrstev** a **rychlé volby** (přepnout zobrazené / skryté, skrýt vrstvy označených, skrýt ostatní, zpět
  změnu vrstev); **skutečná tloušťka / vlasové čáry**, **průchozí materiál**, **izolovat popisy** (model
  v polotónu, nevybíratelný), **Pera a barvy** (dialog tabulky per × měřítek); **grafické přepisy**,
  **podrobnost**, šrafy ×, řez, kóty do; **Odhalit** (skryté stěny purpurově čárkovaně, jdou vybrat).
- **Okna:** stav oken v sezení (`session/windows.ts`), každé okno má svůj pohled a výřez; neaktivní okno
  kreslí jen svůj pohled a klikem / kolečkem se stane aktivním (modrý rámeček). Volby okna
  (`session/screen.ts`) nejsou data modelu.
- **Oprava po vyzkoušení:** přepnutí sady (Studie / Projekt) měnilo jen aktivní okno; teď dostanou styl
  sady všechna okna, která ukazují pracovní okno podlaží (uložené pohledy se nemění).
- Testy: jádro 668, prohlížeč 116 (nové `lista.spec.ts`).

### Rozhraní: UI3 hotovo, 2026-11-25 (Obsah, uložené pohledy, sady, Najít a vybrat)
- **Jádro:** pohled má příznak `saved` – pracovní okno podlaží (false, jedno na podlaží, vzniká s
  podlažím v `storey.create`) a uložené pohledy (true). Příkazy `view.save` (Uložit pohled z okna, název
  „Půdorys 1.NP“, „… (2)“), `view.loadSettings`, `view.rename`, `view.delete` (pracovní okno smazat nejde);
  `view.create` má `saved`. Schéma 9 → 10 (`view/migrate-v9.ts`: první pohled podlaží = pracovní okno).
  Dotaz **`element.find`** (`selection/find.ts`): druh, podlaží, typ stěny, materiál, ID / název obsahuje,
  oblouková, rozsahy tloušťky, výšky a šířky otvoru. `project.info` vrací u pohledů `saved`. Krok scénáře AI.
- **Obsah vpravo** (`ui/content/`): záložky **Projekt** (podlaží → pracovní okno, nastavení podlaží) a
  **Pohledy** (uložené pohledy aktuální sady s měřítkem, + Uložit pohled, **Nastavení pohledu**: název,
  zdroj, styl, měřítko, řezná rovina, Fáze a Varianta „podle okna“ připravené, Načíst nastavení
  aktuálního okna, Smazat pohled); Výkresy a Export zašedlé (etapa 7).
- **Přepínač sad nahoře** (`session/sets.ts`): překreslí pracovní okno stylem sady a filtruje Pohledy;
  uložené pohledy jiných sad se nemění. Stav u uloženého pohledu ukáže „pohled: název · styl“.
- **Najít a vybrat** pod lupou (`ui/find/`): čipy typu prvku, kritéria, „Nalezeno N prvků“, + Vybrat /
  − Odebrat / Nahradit výběr / Vymazat; počítá stejný dotaz jádra jako AI.
- Testy: jádro 658, prohlížeč 110 (nové `obsah.spec.ts`; záložka Podlaží → Obsah `tab-contents`).

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

### Stěny: Z1, Z2, Z3, Z4, Z5, Z6 hotovo (podrobnosti v `docs/STAV-steny.md`)
- Z1 typ a skladba (2026-11-24), Z2 napojování vrstev (2026-11-24), Z3 výška a IFC (2026-11-24),
  Z4 otvory (2026-11-25), Z5 oblouk (2026-11-25), **Z6 kresba v půdorysu (2026-11-26)**,
  **Z7 vlastnosti a úplný IFC**, **Z8 výkazy a popisky (2026-11-26, výše)**. Kroky Z9–Z10 podle plánu.

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
- **Změnit velikost:** mění se jen půdorysné vzdálenosti; výšky stěn, výšky otvorů a parapety stojí
  (zaškrtnutí změní jen šířku otvoru). Volba „Změnit i velikost textu“ z Arditu vynechána – volné texty
  zatím nejsou a kóty mají text pevně na papíře (základ 29). Okno se otevře jen s vybranými stěnami.
- **Lekce:** jen pro hotové funkce; ostatní v seznamu zašedlé s poznámkou, kdy přibudou. Lekce se
  nespouští sama při prvním otevření (jen tlačítkem ?).
- **UI5 paleta u uzlu:** horní řádek jsem podle vzoru naplnil našimi příkazy uzlu (Posun uzlu, Odpojit
  roh, Spojovat / Nespojovat, Smazat uzel); dolní řádek = příkazy celé stěny. Kolečko zakřivení a
  nabídka na pravé tlačítko zatím zůstávají (koncepce je chce paletou nahradit – po vyzkoušení odebrat).
  Karta prvku po 0,8 s; při běžícím příkazu nebo otevřené paletě se neukazuje; volba se nepamatuje
  po obnovení stránky (stejně jako ostatní volby okna).
- **Vzhled:** rámeček aktivního okna se ukazuje jen při dvou oknech vedle sebe (u jednoho okna rušil);
  písmo Segoe UI Variable (Windows), jinak systémové – bez stahování webového písma.
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
- Uživatel vyzkouší UI2–UI4 (info box, Obsah a pohledy, Najít a vybrat, spodní lišta, dvě okna,
  trasování, vrstvy, izolovat / odhalit, pera).
- UI5, stěny Z6 a rekonstrukce (filtr rekonstrukce, stav nových prvků) uživatel vyzkoušel 2026-11-26:
  „vše funguje“ (po opravě mezery v plánovaném stavu).
- **Uživatel vyzkouší Z8:** Obsah → Projekt → Výkazy → Výkaz stěn (přepočítá se po změně stěn), Výkaz
  materiálů, Legenda skladeb, + Nový výkaz, Exportovat CSV a otevřít v Excelu; vybrat stěnu → Popis →
  Značka typu v půdorysu; Výběr bez výběru → Označit všechny stěny; přepočet výkazu ručně na pilotním projektu.
- **Uživatel vyzkouší Z7:** vybrat stěnu → info box Vlastnosti (nosná, požární odolnost), záložka Typ →
  Vlastnosti typu, spodní lišta → Jen jádro nosných, Exportovat IFC a otevřít v BIMvision (Pset_WallCommon
  u stěny i typu, skladba).
- **Další:** stěny Z9 – pohodlí úprav (hromadná změna typu, kopírování vlastností, výběr stejných, rozdělení
  s mezerou, sloučení stěn v přímce; plán stěn, část 3).

## Otevřené

- `STAV.md` má 35 KB (limit ~40 KB): návrh rozdělení – sekce „Rozhraní UI1–UI5“ a „Šrafy“ z Hotovo
  přesunout do `docs/STAV-rozhrani.md` a `docs/STAV-srafy.md` (jako `STAV-steny.md`); čeká na souhlas.
- Z8: výběr a tažení značky typu myší (dnes jen info box a příkaz); legenda skladeb jako kresba (řez
  skladbou se šrafami) na výkrese – s etapou 7 (listy); výkaz ve vlastní záložce okna; export XLSX
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
- Kóty u oblouku podle uživatele nefungují správně – probrat a opravit později (zadání upřesní uživatel).
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
  **Výšková kóta** (parapet) v půdorysu zatím neexistuje. **Řez a 3D** – otvor je v datech celý (výška,
  parapet), kresba jen v půdorysu.

## Největší soubory (po stěnách Z8)

Výstup `npm run check:size`: varování 0, chyb 0 (534 souborů).

| Řádky | Soubor |
|---|---|
| 247 | apps/sandbox/src/session/session.ts |
| 236 | apps/sandbox/src/render/overlay.ts |
| 235 | apps/sandbox/src/interaction/tools/wall-tool.ts |
| 232 | apps/sandbox/src/interaction/tools/arc-wall-tool.ts |
| 227 | packages/core/src/ai/scenario-walls.test.ts |
