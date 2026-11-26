# BIM-light – stav práce: šrafy (archiv)

Přesunuto z `docs/STAV.md` (2026-11-26, rozdělení kvůli velikosti, základ 33; se souhlasem uživatele).
Tady jsou hotové kroky šraf (ČSN 01 3420, tepelná izolace, velikost šraf) a jejich rozhodnutí „Rozhodl Code“. Aktuální stav, otevřené body
a další krok jsou v `docs/STAV.md`.

## Hotovo (šrafy)

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

## Rozhodl Code (k potvrzení, šrafy)

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
