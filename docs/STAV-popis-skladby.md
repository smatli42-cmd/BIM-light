# BIM-light – stav: popis skladby v řezu

Rozděleno z `docs/STAV-rezy.md` 2026-11-28 (čisté přesunutí, souhlas uživatele, základ 33).

## Hotovo

### Popis skladby v řezu, 2026-11-28 (úkol uživatele; scéna `?ukazka=popis-skladeb`, Řez A i v `?ukazka=dum`)

- **Úprava podle výkresu uživatele (2026-11-28, migrace 39 → 40):** odkazová čára vždy protne konstrukci
  kolmo (deska svisle, stěna vodorovně) přes celou tloušťku – od protilehlého líce; může se lomit (body
  čáry `leader`, pravidlo v jádře `composition-tag/leader.ts`). Na konci kolečko s číslem konstrukce (značka
  typu: S3, D1, P1), pod ním svislá čára a řádky vrstev, každý s vodorovnou čárkou – vpravo nebo vlevo.
  Řádek „Materiál tl. 20 mm“ (bez pomlčky). Nastavení popisky: číslo v kolečku, název typu s celkovou
  tloušťkou, tloušťky, číslování, obrácené pořadí, strana řádků (`compositionTag.update`, info box).
  Kreslení: klik do konstrukce, další kliky = lomy (první srovnaný na kolmici, další vodorovně / svisle,
  Shift = volně), dvojklik / Enter / pravé tlačítko dokončí, Esc ubere bod. Tažení kolečka posune konec
  čáry, úseky zůstanou v pravých úhlech (`compositionTag.move` `delta`). Testy `leader.test.ts`.
  Tečka a polička z první verze zrušené.
- **Zarovnání textu (pokyn uživatele 2026-11-28, migrace 40 → 41):** řádky v bloku vlevo / na střed /
  vpravo (`align`); čárka od svislé čáry vždy dosáhne k textu (u zarovnání od čáry dál se prodlouží, jako
  P1 na výkresu uživatele). Dosavadní popisy si vzhled nechaly. Test `align.test.ts`.
- **Oprava a jednotný tvar (hlášení uživatele se screenshotem 2026-11-28):** zarovnání nefungovalo –
  jádro odhadovalo šířku písma a řádky kladlo středem, takže se okraje rozjížděly. Nově má textové
  primitivum kotvu (`align`: levý okraj / střed / pravý okraj) a řádky zarovná až vykreslení (písmo zná jen
  ono); odhad šířky zůstal jen pro délku čárek a obdélník výběru. Popiska má vždy stejný tvar: nahoře
  kolečko, z něj svislá čára dolů s řádky, odkazová čára vychází vždy dole (poslední bod čáry = spodek
  popisky, ne kolečko – dosavadní popisy se posunou nahoru o výšku řádků). Při kreslení lomené čáry i při
  tažení je vidět náhled celé popisky (stejná kresba z jádra).
- **Popis skladby na střeše (úkol 2026-11-28):** klik na proříznutou rovinu střechy vloží popis; odkazová
  čára jde kolmo k rovině střechy (na výkrese kolmo ke stopě roviny v řezu) přes celou skladbu od SDK po
  krytinu, vrstvy shora dolů (od krytiny), číslo = značka typu střechy (R1…); text z typu, změna skladby ho
  přepíše. Jádro `composition-tag/cross.ts` (průřez: bod uchycení, kolmice, oba líce – deska svisle, stěna
  vodorovně, střecha z roviny) a `roof.ts` (rovina střechy v místě bodu z `roof/planes.ts`, tloušťka na
  výkrese; kde se potká víc rovin, platí nejvyšší). Bod uchycení na střeše = poměr po délce a přes tloušťku
  skladby. Kolmice odkazové čáry je obecný směr (ne jen svisle / vodorovně); tažení konce ji zalomí
  vodorovně. Testy `roof.test.ts`, `leader.test.ts`, AI krok ve `scenario-composition-tag.test.ts`, e2e
  `popis-skladeb.spec.ts`; čtvrtý popis (R1) v Řezu A domu a ve scéně `popis-skladeb`.
- Jádro `composition-tag/` (migrace 38 → 39): anotace řezu – vazba na řez a řezanou stěnu / desku, bod
  uchycení poměrem na řezu prvku (pohne se s prvkem), poloha textu vůči bodu, volby obsahu (název typu
  s celkovou tloušťkou, tloušťky vrstev, číslování, obrácené pořadí), skupina anotací (výchozí Řezy
  a pohledy) a zámek. Text se neukládá – řádky se počítají z typu (deska shora dolů, stěna od referenční
  strany; u vícepásové stěny pás v místě bodu); změna skladby popis hned přepíše (základ 4).
- Kresba (ČSN 01 3420, Archicad Composite label): plná tečka na konstrukci, odkazová čára k poličce, pod
  ní řádky „– Materiál 15 mm“ zarovnané k začátku poličky (text vpravo od bodu zleva, vlevo zprava). Pero
  a barva z funkce grafiky kategorie Popisy, písmo = výška popisu, řádkování jako razítko místnosti.
- Příkazy `compositionTag.create / move / update`, mazání `levelDim.delete` / `selection.delete`
  `levelDimIds` (jako kóty v řezu); smazaný prvek nebo řez vezme své popisy. Dotaz `compositionTag.list`
  (řádky, vrstvy, body). AI `ai/scenario-composition-tag.test.ts`, testy `composition-tag.test.ts`.
- Sandbox: nástroj **Popis skladby** v paletě (vedle Výškové kóty) – v okně řezu klik na řezanou stěnu
  nebo desku, druhý klik = poloha textu; v půdorysu jen nápověda. Výběr klikem na text nebo odkazovou
  čáru (Shift přidá), tažení posune text, Del smaže, Esc vrátí krok / ukončí nástroj. Info box: výchozí
  volby nového popisu; vybraný popis – řádky z typu, volby, zámek, smazání. E2E `popis-skladeb.spec.ts`.

## Rozhodl Code (k potvrzení)

- **Popis skladby (podle výkresu uživatele 2026-11-28; plný text ČSN 01 3420 není volně dostupný):**
  kolečko s číslem je vždy na konci čáry a řádky visí pod ním (na výkresu uživatele je u P1 kolečko
  u konstrukce a řádky na druhém konci – dá se napodobit lomenou čárou). Lomy se srovnávají do pravých úhlů,
  Shift = libovolný úhel. Čára začíná na protilehlém líci konstrukce, bez tečky. Výchozí obsah: kolečko
  s číslem + „Materiál tl. 20 mm“; název typu (vypnutý) a čísla vrstev volbou. Nastavení je u každého popisu
  (a výchozí u nástroje); společný „styl popisky“ pro celý projekt zatím není. Deska shora dolů (ČSN, Revit); stěna od referenční strany typu (vnitřní →
  vnější podle uložení skladby) – volba „obrácené pořadí“ ji otočí; podle strany textu se pořadí samo
  nemění. Popis jen u řezaného prvku (ne u prvku v pohledu za rovinou); když ho rovina řezu přestane
  protínat, nekreslí se (data zůstanou). Skupina anotací Řezy a pohledy. V půdorysu zatím ne (Revit to
  umí u řezaných stěn – přijde, až bude potřeba). Výběr a mazání jdou přes výběr anotací řezu
  (`levelDimIds`), aby nebyl další druh výběru.
- **Popis skladby na střeše:** kde řez vede valbou podél vrstevnice (Řez A domu dál od okapu), je
  rovina v řezu vodorovná a čára svislá – správně podle geometrie. Výběr v řezu (`section.pick`) střechy
  zatím nezná; nástroj Popis skladby je najde vlastním výpočtem (`roofCutAt`). Do výběru v řezu je
  doplní práce na střechách (souběžná session). Popis v půdorysu podkroví (řezaná rovina střechy pod
  rovinou řezu půdorysu) by šel stejným jádrem s kolmicí k průsečnici – zapsáno v Otevřené (`STAV.md`).
