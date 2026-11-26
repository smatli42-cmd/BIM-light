# BIM-light – stav práce: rozhraní UI1–UI5 (archiv)

Přesunuto z `docs/STAV.md` (2026-11-26, rozdělení kvůli velikosti, základ 33; se souhlasem uživatele).
Tady jsou hotové kroky rozhraní UI1–UI5 (a úpravy vzhledu) a jejich rozhodnutí „Rozhodl Code“. Aktuální stav, otevřené body
a další krok jsou v `docs/STAV.md`.

## Hotovo (rozhraní)

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

## Rozhodl Code (k potvrzení, rozhraní)

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
