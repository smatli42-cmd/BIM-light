# Stav – 3D náhled (druhý paralelní proud)

Samostatná session ve vlastním worktree a větvi `claude/nahled-3d-4b94ee`. Jádro (`packages/core`) jen čte;
změny jádra si vyžádá od hlavní session (sekce níže). Sloučení do `main` přes PR po zelených testech a se
souhlasem uživatele.
PR: https://github.com/smatli42-cmd/BIM-light/pull/1 – sloučen do `main` 2026-11-27 se souhlasem uživatele (3D okno, desky, barva povrchu).

## Hotovo (krok 1 – 3D okno, 2026-11-27)

- **Výpočet těles** `apps/sandbox/src/view3d/` (bez three.js, testy Vitest):
  - `solids.ts` – každá vrstva skladby stěny je těleso s barvou svého materiálu; půdorys vrstvy po napojení
    z jádra (`wallGeometry` s rovinou řezu pod vším), výška z `wallHeight` (vazba na podlaží, odsazení,
    přesahy vrstev nahoru a dolů); přímé i obloukové stěny.
  - `slice.ts` – otvory a niky bez 3D booleovských operací: výška vrstvy se rozdělí na pásy podle parapetu
    a nadpraží, v pásu se od půdorysu odečte půdorys otvoru (2D rozdíl, knihovna polygon-clipping).
  - `edges.ts` – obrysové hrany jako v Archicadu: obrys spodku a vršku, svislé rohy, na hranici pásů jen
    hrany otvoru (žádná čára přes celou fasádu).
  - `scene-model.ts` – co je vidět: stěny **všech podlaží** podle stylu, vrstev a **filtru rekonstrukce
    aktivního pohledu**; otvor skrytý filtrem stěnu nevyřízne; napojení jen mezi zobrazenými stěnami.
- **3D okno** vpravo vedle půdorysu (`View3DWindow.tsx`, `viewer.ts`, three.js 0.171):
  - levé tlačítko otáčí, prostřední a pravé posouvá, kolečko přibližuje ke kurzoru; Přizpůsobit; Zavřít.
  - **Zobrazit vše ve 3D** (Ctrl+F4, navíc Shift+F4) a **Zobrazit výběr ve 3D** (F4) – klávesy i tlačítka
    ve spodní liště (mezi Konstrukčním zobrazením a Fází) a v hlavičce 3D okna.
  - klik na stěnu ve 3D ji vybere (modře) i v půdorysu, Shift+klik přidá / ubere, klik do prázdna zruší;
    stěna jiného podlaží přepne aktivní okno na její podlaží.
  - odkaz `?…&3d` otevře 3D okno hned po načtení.
- Testy: `view3d/solids.test.ts`, `view3d/edges.test.ts` (Vitest), `e2e/nahled-3d.spec.ts` (Playwright).

## Hotovo (krok 2 – desky ve 3D, 2026-11-27)

- `main` s deskami D1 + D2 sloučen do větve (bez konfliktů).
- `view3d/slab-solids.ts`: deska = vrstvy skladby od spodního líce nahoru (`slabLevels`), každá vrstva těleso
  s barvou materiálu; strop i podlaha. Viditelnost jako u stěn (vrstva „Desky“, filtr rekonstrukce, pravidla).
- Klik na desku ve 3D ji vybere v půdorysu (Shift přidá / ubere), F4 ukáže vybrané desky.
- Testy: `view3d/slab-solids.test.ts`, e2e „deska je ve 3D…“; ukázka `dum` má ve 3D stěny i desky.

- **Barva povrchu přes funkci grafiky** (požadavek 3 splněn v `main`, fffa6dd): barva ve 3D =
  `resolveGraphics(...).effect.surfaceColor ?? barva materiálu` pro stěny i desky; přebarví všechny vrstvy prvku.

- **Rekonstrukce u otvorů ve 3D** (`view3d/patches.ts`, jako záplaty v půdorysu): probourání (nový otvor
  ve stávající stěně) je v Bouracích pracích žlutý blok v místě otvoru; v plánovaném stavu otvor, ve
  stávajícím stavu celá stěna. Zazdívka se obarví, jen když pravidlo „nový“ dává barvu povrchu.
  Oprava 2026-11-27 po připomínce uživatele (v bouracích pracích byla vidět jen příčka).

- **Otvory v deskách ve 3D** (D3): viditelný otvor prořízne všechny vrstvy desek v `hostIds` po celé
  tloušťce (stejný `sliceLayer`); otvor skrytý filtrem rekonstrukce desku neprořízne. F4 na vybraný otvor
  v desce ukáže desky, které prořízne.

## Hotovo (krok 3 – rozsah 3D, 2026-11-27, krok a) dohody s uživatelem)

- **Rozsah podlaží** (nabídka v hlavičce 3D okna, jako Filter and Cut Elements in 3D v Archicadu):
  zaškrtávání podlaží (nejvyšší nahoře, nabídka zůstane otevřená, poslední podlaží nejde odškrtnout),
  rychlé volby Všechna podlaží / Jen aktivní / Aktivní a níž.
- **Ořezový kvádr** (tlačítko v hlavičce, jako Section Box v Revitu): zapne se kolem výběru (BX v Revitu),
  bez výběru kolem všeho + 300 mm; úchyty na středech stěn kvádru se táhnou myší (po ose stěny), po puštění
  se tělesa oříznou. Řez je **plný** (`view3d/clip.ts` ořízne hranoly přesně: výška + 2D průnik), barva
  materiálu jako řez v Archicadu – žádná dutá skořápka.
- Obojí je od kroku 4 nastavení uloženého 3D pohledu (viz níže).
- Testy: `view3d/clip.test.ts`, e2e `nahled-3d-rozsah.spec.ts`.

## Hotovo (krok 4 – uložený 3D pohled a průhlednost, 2026-11-27)

- 3D okno ukazuje **3D pohled z modelu** (`model.views3d`, View3d z jádra): styl, vrstvy, **vlastní filtr
  rekonstrukce**, rozsah podlaží a ořezový kvádr se mění příkazy `view3d.*` – jde to přes AI i Undo.
- **Lišta 3D pohledu** pod hlavičkou okna: výběr pohledu + Nový 3D pohled, Fáze 3D pohledu, Podlaží,
  Ořezový kvádr. Volba obrazovky zůstává jen: otevřené okno, který 3D pohled, F4 „jen výběr“.
- **Průhlednost povrchu** přes funkci grafiky (`surfaceTransparency`): bourání 50 % jako v Revitu, včetně
  záplaty probourání; sklo dál 35 % krytí z materiálu (`view3d/surface.ts`).

## Hotovo (krok 5 – lišta 3D okna podle Ardit Designeru, 2026-11-27)

- **Jádro** (malé změny s testy): View3d má navíc `projection`, `renderMode`, `sun` (stíny, ručně / podle
  data a času), `cutPlane` (bod + směr) a `grid`; příkazy `view3d.setProjection / setRenderMode / setSun /
  setCutPlane / setGrid`, `view3d.list` vrací i vypočtenou polohu slunce; migrace 25 → 26; krok v AI
  scénáři. Poloha slunce `core/src/sun/` (S-JTSK → zeměpisné souřadnice, algoritmus NOAA, SEČ / SELČ).
- **Lišta** (vpravo, jako Ardit): otáčet / posouvat (ruka) / přiblížit vše, **Persp. / Axon.**, režim
  **Materiály / Bílý model / Čárový / Skryté hrany / Skica** (kreslené hrany s přetažením), **Slunce
  a stíny**, **Procházka** (Shift+F3), **Ořez** (kvádr), **Řez** + výběr roviny, **mřížka**. Vlevo zůstal
  pohled, fáze a podlaží.
- **Řez ve 3D:** rovina ořízne tělesa (od kroku 5b přesně, plná řezná plocha), odříznutá část nevrhá stín
  ani nejde vybrat; svislý podle pohledu, nebo vodorovný 1,2 m nad podlažím; modrý úchyt rovinu posouvá.
- **Karta prvku** po podržení myši i ve 3D (stejná jako v půdorysu, `ElementCard`); „i“ vpravo dole ji
  vypne (stejné nastavení jako v půdorysu).
- **Procházka:** oko 1,6 m nad aktivním podlažím, W A S D / šipky, Shift rychleji, Q / E dolů / nahoru,
  tažení rozhlížení, kolečko krok, Esc konec; klávesy nejdou do půdorysu.
- Prohlížeč rozdělen: `camera-rig.ts`, `sun-light.ts`, `cut-gizmo.ts`, `handles.ts`, `grid.ts`, `walk.ts`,
  `sketch.ts`, `use-viewer.ts`, `use-hover-3d.ts`, `Toolbar3D.tsx`, `Sun3D.tsx`, `Cut3D.tsx`.

## Hotovo (oprava – výběr ve 3D nepřepíná podlaží, 2026-11-27)

- Klik ve 3D vybere prvek z libovolného podlaží a půdorys zůstane (dřív okno přeskočilo na podlaží prvku).
  Info box ukáže a mění vybraný prvek jiného podlaží. Test `e2e/nahled-3d-vyber.spec.ts`.

## Hotovo (krok 5b – kvalita 3D, 2026-11-27, hlášení uživatele „zobrazuje se to špatně“)

- **Hrany prvku jen na obrysu** (`view3d/element-edges.ts`): pásy všech vrstev prvku se sloučí, takže deska
  ze tří vrstev má hrany jen dole a nahoře a stěna jen obrys – vrstvy jsou vidět barvou v řezu.
- **Hrany uvnitř jiného tělesa se skryjí** (deska pod stěnou, styk stropu a zdi) – kontrola po kouscích
  150 mm, hrana na povrchu jiného tělesa zůstane.
- **Řez rovinou je přesný** (`clip-plane.ts`, jako ořezový kvádr): svislá a vodorovná rovina ořízne tělesa
  i povrchy, řezná plocha je plná v barvách vrstev (dřív jen ořez obrazu – dovnitř těles šlo vidět a desky
  vypadaly jako tenké pláty). Obraz se ořezává jen během tažení úchytu a u šikmé roviny; průsvitný obdélník
  roviny jen během tažení.
- **Skica jemněji:** přetah 2 % délky (15–60 mm), odchylka konce ±4 mm.
- **Stíny:** výchozí vypnuté (beze změny), zapnuté měkké (PCF), menší bias a normalBias proti „akné“.
- Přesah desky v domě (465 / 315 mm) je správně: obdélník stěn jde od zadané čáry ven, deska končí v líci.

## Hotovo (krok 6 – povrchy místností ve 3D, 2026-11-27)

- Úpravy povrchů z jádra (`allSurfaces`, stejný zdroj jako výkaz povrchů) jako tenké plochy 1 mm před lícem
  (`view3d/surface-sheets.ts`, `sheets-mesh.ts`): barva a průhlednost přes funkci grafiky (`surfaceLook`,
  kategorie covering), plocha bez úpravy se nekreslí. Líc obloukové stěny po pruzích 200 mm.
- Filtr 3D pohledu: vrstva / kategorie covering, filtr rekonstrukce (místnost i stěna), podlaží, výběr F4
  (povrchy vybraných stěn), ořezový kvádr (přesný ořez trojúhelníků, `clip-triangles.ts`), rovina řezu.
- Jen v režimu **Materiály**; Bílý model, Skica, Skryté hrany a Čárový povrchy nekreslí. Plochy nejdou
  vybrat kliknutím (klik trefí stěnu za nimi).
- Scéna `?ukazka=3d-povrchy`: dům, koupelna obklad do 1,5 m + dlažba, kuchyně béžová + dlažba, jinde bílá
  malba + vinyl.

## Co zkusit

- `?ukazka=3d-povrchy&3d` → Řez › Vodorovný (nad podlažím): podlahy vinyl a dlažba, malby, obklad koupelny
  do 1,5 m; přepni na Skicu – barvy povrchů zmizí.

- `?ukazka=3d-lista` → Obsah → 3D: dům v axonometrii ve Skice se stíny 21. 6. v 15:00 a svislým řezem.
  Přepínej Persp. / Axon. a režimy, ☀ Slunce: datum a čas (stíny se pohnou), Řez: táhni modrý úchyt,
  vodorovný řez; mřížka; podrž myš nad stěnou (karta); Shift+F3 procházka (W A S D, Esc).

- `?ukazka=dum&3d` → v liště 3D okna **Fáze ›** Bourací práce: bourané žlutě a poloprůhledně, půdorys
  beze změny; **3D ›** Nový 3D pohled – má vlastní nastavení; Ctrl+Z vrátí změnu kvádru.
- `?ukazka=dum&3d` → v liště 3D okna **Všechna podlaží ›**: odškrtni 2.NP; **ořezový kvádr** (ikona
  krychle s tečkami): táhni horní modrý úchyt dolů – řez domem ve výšce parapetů. Vybraná stěna + kvádr =
  kvádr jen kolem ní.
- `?ukazka=desky-otvory&3d` – otvory v deskách (prostup, schodiště) proříznou strop i podlahu.
- `?ukazka=dum&3d` → spodní lišta **Přepisy** (kombinace) → *Fáze – bourací práce*: bouraná příčka zežloutne
  v půdorysu i ve 3D a v nosné zdi je žlutě probourání dveří 900 × 2100.

- Uživatel vyzkoušel 2026-11-27: „3D náhled funguje“ (lokálně, `?ukazka=dum&3d`).
- `…/BIM-light/?ukazka=desky&3d` a `?ukazka=desky-kresleni&3d` – stropy a podlahy ve 3D; klik na desku ji
  vybere; nakresli novou desku nástrojem S a hned je ve 3D.
- `…/BIM-light/?ukazka=dum&3d` – dům ve 3D: obě podlaží, zateplení (barvy vrstev v ostění), okna a nika,
  oblouková příčka. Otáčet levým tlačítkem, posouvat pravým, kolečko.
- Ve spodní liště **Fáze** → Plánovaný stav: bouraná příčka zmizí i ve 3D; Stávající stav: nové příčky zmizí.
- Panel **Vrstvy**: skrýt vrstvu stěn → zmizí i ve 3D.
- Vybrat stěnu v půdorysu → **F4** (jen ona), **Shift+F4** zpět celý dům. Kliknout ve 3D na desku nebo
  stěnu 2.NP → vybere se, půdorys **zůstane** na svém podlaží a info box ji ukáže a mění (typ, horní hrana).

## Rozhodl Code (k potvrzení)

- **Knihovna three.js** (nejrozšířenější WebGL knihovna, MIT, umí i export glTF pro 3ds Max – rozhodnutí 14);
  na 2D rozdíl mnohoúhelníků **polygon-clipping** (MIT). WebGPU render (rozhodnutí 14) až v etapě render.
- **Ctrl+F4 si v Chromu bere prohlížeč** (zavře kartu), proto navíc **Shift+F4** = Zobrazit vše ve 3D.
  V desktopové verzi (Tauri) Ctrl+F4 projde.
- Myš jako OrbitControls: levé otáčí, prostřední i pravé posouvá (Archicad: prostřední posun, Shift+prostřední
  otáčení – lze přepnout podle přání).
- 3D okno je volba obrazovky (jako rozvržení oken), ne data modelu – nejde přes příkaz; stav drží
  `view3d/state.ts` vedle Session.
- 3D pohled má **vlastní** styl, vrstvy a filtr rekonstrukce (jako každý pohled v Revitu, 3D okno
  v Archicadu); dřív bral filtr aktivního okna. F4 bez výběru = vše.
- Ovládání rozsahu je v **liště pod hlavičkou 3D okna** (v hlavičce se nevešlo a nabídky by se ořízly).
- Vrstvy 3D pohledu zatím nejdou přepnout z panelu Vrstvy (ten mění aktivní půdorys); příkaz
  `view3d.setLayerState` je – UI doplnit.
- Barva ve 3D = barva materiálu, přepíše ji jen pravidlo / styl s „barvou povrchu“ (ne výplň řezu);
  uživatel souhlasí 2026-11-27.
- Výběr ve 3D zvýrazní prvek barvou výběru (akcent rozhraní), ne obrysem.
- Typ s více výškovými pásy: vrstvy ve 3D zatím podle pásu v rovině řezu přes celou výšku (viz níže).

- **Lišta 3D (krok 5):** Ctrl+Y pro Řez (jako Ardit) se nepoužije – v BIM-light je Ctrl+Y Znovu.
  Režim Skica bere stíny podle nastavení slunce (nezapíná je sám). Bílý model a skica mají mírný vlastní jas,
  aby plochy na slunci byly skoro bílé. Natočení georeference = úhel osy Y projektu od severu po směru
  hodin (od azimutu slunce se odečítá). Bez georeference (S-JTSK 0, 0) se slunce počítá pro střed ČR.
  Mřížka je ve výšce aktivního podlaží (2 mm pod ním, aby podlaha neblikala). Otáčet / posouvat a procházka
  jsou ovládání kamery, ne data pohledu. Ukázkový dům (`house.ts`) beze změny – nastavení je ve scéně
  `3d-lista` (dům se pak nemusí měnit kvůli e2e testům výchozího 3D).

## Potřebuji od hlavní session (změny jádra)

1. **Exportovat `visibleWalls`** z `view/index.ts` (teď je jen interní). 3D si filtr skládá sám
   (`scene-model.ts`) a nedělá „rejoinOrphans“ (napojení konce na zobrazený konec po skryté stěně).
2. **Geometrie vrstev po výškových pásech:** `wallGeometry` vrací vrstvy jen pro pás v rovině řezu. Pro 3D
   by se hodila varianta pro zadaný pás (`wallGeometry(model, wall, cutPlane, bandIndex)` nebo
   `wallBandGeometry`), aby sokl / parapetní pás měl ve 3D svou skladbu.
3. ~~**Barva povrchu ve 3D přes funkci grafiky**~~ – hotovo (main fffa6dd) (základy 11, 30; jako „Override Surface“ v Archicadu /
   filtry pohledu v Revitu): do efektu pravidla a grafiky kategorie přidat položku `surfaceColor`
   (barva povrchu 3D, `null` = barva materiálu) s „proč“ a ve schématu balíčku stylů (`package-schema.ts`).
   Oddělit od `fillColor` (výplň řezu je ve Studii šedá – 3D by zešedlo). Pak 3D vezme barvu z
   `resolveGraphics(...).effect.surfaceColor ?? barva materiálu` a pravidlo „bourané žlutě“ platí i ve 3D.
4. ~~**Sytější žlutá bourání ve 3D:**~~ hotovo (main 850f562, `#f2c200`, ve 3D ověřeno). `surfaceColor` pravidla „Bourání žlutě čárkovaně“ `#fff3b0` splývá
   s omítkou `#d8cfc0` – probourání ani bouraná příčka ve 3D nejsou vidět (uživatel 2026-11-27). Návrh
   `#f2c200`, výplň řezu v půdorysu nechat světlou. Posláno hlavní session.
5. ~~**Průhlednost povrchu ve 3D**~~ hotovo (main 6ec4101) (`surfaceTransparency` v efektu pravidla, bourání 50 %, jako Revit) –
   posláno 2026-11-27.
6. ~~**3D pohled v jádře**~~ hotovo (main 6ec4101), 3D okno přepojeno (druh pohledu: styl, filtr, vrstvy, `storeyIds`, `sectionBox`; příkazy
   `view3d.create / setStoreys / setSectionBox / rename`, dotaz, scénář AI) – posláno 2026-11-27. Pak 3D okno
   přepojit z `view3d/state.ts` na data pohledu.
7. **Dotaz pro AI** (základ 15) `queries/` – např. `model.solids` / `view3d.bounds`, až bude 3D potřebovat AI
   (zatím není potřeba: 3D okno nic v modelu nemění).

## Otevřené / další kroky

- Povrchy ve 3D: **spárořez** obkladu a dlažby čarami (formát a spára jsou v typu úpravy), výběr / karta
  povrchu kliknutím ve 3D.
- **Úpravy myší přímo ve 3D** (táhnout uzly, hrany, výšky; pokyn uživatele 2026-11-27 – samostatná
  kategorie, až ke konci). Teď se ve 3D jen vybírá a mění přes info box.
- **Další kroky lišty podle Arditu** (zapsáno na pokyn 2026-11-27):
  - **Studie oslunění** – stíny po hodinách (např. 8–18 h) jako animace a jako výkres na list.
  - **Kamera** (Ctrl+Alt+F3) – dvoubodová perspektiva (svislice svisle), pohledy podle světových stran,
    figurka (pohled z místa).
  - **Scény** (ikona filmového pásu) – uložené pohledy kamery s nastavením, přehrávání jako animace.
  - **Řez A / Řez B** v nabídce Řezu – až budou řezy v jádře: rovina z uloženého řezu, hloubka, výplně
    řezu, výškové kóty v řezu, pohled na řez, uložit jako scénu.
  - Místnosti ve 3D (průhledné objemy v barvě místnosti) – až bude jádro místností v `main` (dá vědět
    hlavní session).
- Skrýt podlaží, průsvitnost výběru, materiály s texturou, export glTF/USD (rozhodnutí 14).
- Bundle sandboxu narostl o three.js (~600 kB); později načítat 3D okno až při otevření (dynamický import).
