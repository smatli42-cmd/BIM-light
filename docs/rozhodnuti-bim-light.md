# BIM-light – katalog rozhodnutí (průběžný)

Značení: **[R]** = rozhodl uživatel, **(já)** = Claude podle Revitu/Archicadu, platí, dokud uživatel nesouhlasí jinak.
Stav 2026-11-24: základy 1–34. Podrobnosti: základ 25 v `pravidla-interakce-bim-light.md`, základy 23–24 v `katalog-kresleni-sten-kotovani.md`, základy 26–32 v `katalog-pohledy-styly-zobrazeni.md`, základ 34 v `katalog-sraf-materialu.md` (tady jen stručně).

## ⚠ ZÁKLADY OD PRVNÍHO DNE (později se mění velmi těžko)

Tyto body musí být v kódu od začátku, i když se jejich funkce ukáže až později. Code je musí dodržet i u prvního, nejjednoduššího prvku. Když v diskusi nebo při programování vznikne další takový bod, přidá se sem.

1. **Model ve tvaru IFC:** každý prvek má stabilní GlobalId, patří do podlaží (Projekt → Budova → Podlaží → prvek), má třídu podle IFC, typ + instanci. Vztahy (otvor ve stěně, výplň v otvoru, prvek na hostiteli, vypínač ovládá svítidlo) jsou samostatné uložené objekty, ne skryté v geometrii. → 0, 1
2. **Každý prvek nese kategorii, profesi, stav** (stávající / bourání / nový) **a příslušnost k variantě** (hlavní model, nebo sada + varianta). Ani jedna vlastnost nesmí chybět, řídí se jimi viditelnost, grafika, výkazy i DXF hladiny. → 1, 4, 6
3. **Data prvků jsou 3D od začátku** (výška, odsazení od podlaží, parapet…), i když se zatím kreslí jen půdorys. → 0
4. **Nic se neukládá jako kresba.** Půdorys, značky, ostění i oblouky vazeb se vždy počítají z modelu. Geometrie se vztahuje k hostiteli (ke stěně, jejímu líci), ne k pevným souřadnicím. → 2, 3
5. **Každý generátor kreslí ve třech úrovních podrobnosti** (hrubá / střední / jemná) a respektuje sadu zobrazení. → 4
6. **Každá změna modelu je pojmenovaný příkaz** s parametry v JSON na jednom místě (store/actions). Na tom stojí UI, AI přes MCP i Undo. Žádná jiná cesta do dat. Příkaz vždy ví, do které varianty zapisuje. → 0, 6
7. **Průřezová pravidla jsou na jednom místě** (kóty, zámky, přichytávání, posuny, mazání, hostitel, výkazy, varianty) a platí pro všechny typy prvků přes tabulku „pravidlo × typ prvku“. Poučení ze zaměřování (kóty). → metoda
8. **Výkazy a legendy jsou jeden obecný mechanismus** (tabulka z modelu), ne kód pro každou tabulku zvlášť. → 3
9. **Jednotky mm, SCHEMA_VERSION s migracemi**, jádro (core) bez DOM. → převzato ze zaměřování
10. **Skladby a materiály:** typ stěny/stropu/podlahy/střechy je vždy seznam vrstev (i když má jen jednu). Vrstva = materiál + tloušťka + funkce (jádro / izolace / povrch). Materiál = položka z knihovny s prioritou napojování. Stěna má uloženou referenční čáru (osa / líc / líc jádra). **Typ stěny je seznam výškových pásů**, každý pás má vlastní skladbu (první verze má vždy jen jeden pás, ale tvar dat musí víc pásů umět – luxfery do 2 m + zdivo, sokl, atika). Algoritmus napojování vrstev může přijít později, data ne. → 5, 13
18. **„Mřížka polí“ je jeden společný mechanismus** pro okno (konfigurátor), skleněný plášť, prosklenou stěnu i výplně (zábradlí, pole luxferů). Dělení, pole, profily a typy výplní se programují jednou; ruční úpravy pole/profilu přes zámek (základ 16). → 2, 13
19. **Otvor v hostiteli je jeden mechanismus pro stěny, desky i střechy.** Otvor = samostatný prvek (IfcOpeningElement), který hostitele vyřízne; tři způsoby řezu: svisle (schodiště, šachta, komín), kolmo k rovině hostitele (střešní okno), přes více podlaží (šachta – prořízne všechny desky mezi zvolenými podlažími). Okno, dveře, střešní okno, prostup, otvor pro schodiště i vikýř na něm staví – navrhnout už s první stěnou. → 2, 15
20. **Interakce je jedna společná služba.** Přichytávání, tracker u kurzoru, dočasné kóty, kontextová paleta, výběr a náhled fungují pro všechny prvky stejně a jsou naprogramované jednou. Každý nástroj (stěna, okno, schodiště…) jen popíše své kroky („klik počátek → klik konec → hotovo“) a své referenční body/líce. Poučení ze zaměřování: kóty rozeseté po prvcích = dva dny oprav. → 16
21. **Typ v projektu je kopie s odkazem na původ.** Projekt obsahuje kopie všech typů, které používá (je soběstačný). Každý typ si pamatuje zdroj v uživatelské knihovně (ID + verze), aby šlo nabídnout „aktualizovat z knihovny“. Tvar dat od začátku, i když knihovna přijde později. → 18
22. **2D kresba je jedno společné jádro** pro samostatné 2D výkresy i pro anotace v modelových pohledech (doplňkové čáry, šrafy, texty) a používá stejnou interakci (základ 20). Čáry nikdy nejsou BIM prvky; model zůstává čistý. → 20
23. **Tvar stěny v datech je od začátku „přímá nebo oblouk“.** Stěna nese tvar osy / referenční čáry jako úsečku nebo kruhový oblouk (IFC: IfcTrimmedCurve). Všechny výpočty (líce, tloušťka, napojení, otvory, kóty, přichytávání) počítají s oběma tvary. Nástroj pro kreslení oblouku se doplní později, data ne. [R] → 16 (viz `katalog-kresleni-sten-kotovani.md`)
24. **Napojení stěn je uložený vztah, ne shoda souřadnic.** Platí pro napojení konec–konec (roh, sdílený uzel) i konec–hostitel uprostřed jiné stěny (T napojení, šikmé napojení). Vztah nese hostitele a místo napojení (IFC: IfcRelConnectsPathElements s typem ATSTART / ATEND / ATPATH). Při posunu nebo odsazení hostitele se navazující stěny natahují podle vztahu, ne podle toho, co se právě trefí na souřadnici. Odpojení a opětovné přitažení konce vztah zruší a vytvoří. [R] → 16 (viz `katalog-kresleni-sten-kotovani.md`, část 7)
25. **Vybraná entita se pohybuje, všechno ostatní zůstává na místě.** Platí v celém programu pro každý prvek a každý způsob změny (tažení, číslo v kótě, trvalá kóta, odsazení, příkaz, umísťování kót). Co má s vybranou entitou uložený vztah (základ 24), se přizpůsobí; vše ostatní stojí. Při změně délky stěny se pohne konec, který uživatel uchopí. [R] → 16 (viz `pravidla-interakce-bim-light.md`)
26. **Pohled má svůj styl zobrazení.** Pohled = podlaží (nebo řez / pohled) + výřez + měřítko + zvolený styl; styl jde přepnout jedním klikem a mění jen vzhled, nikdy model ani kóty. [R] → 4 (viz `katalog-pohledy-styly-zobrazeni.md`)
27. **Styly jsou data v projektu, ne pevný kód.** Styl = kombinace vrstev + podrobnost + kombinace grafických přepisů + popisky + výchozí měřítko. Studie / Projekt / Elektro jsou jen předvolby, uživatel si vytváří vlastní. [R] → 4
28. **Kóty, popisky a 2D kresba patří podlaží a mají skupinu anotací (vrstvu).** Styl určuje, které skupiny jsou vidět; nová kóta jde do aktivní skupiny; zámek kóty je omezení modelu a platí i ve skryté skupině. [R] → 4, 16
29. **Měřítko mění jen tloušťky čar.** Texty, značky a šrafy mají pevnou velikost na papíře, stejnou ve všech měřítcích; o obsahu rozhoduje podrobnost ze stylu. [R] → 4
30. **Pravidla grafiky jsou data:** pravidlo = podmínka (libovolná vlastnost prvku) + efekt; kombinace = seřazený seznam pravidel, vyhodnocuje ji jedna funkce pater přepisů (základ 11, patro 3). Fáze jsou předdefinovaná pravidla. (já) → 4, 6
31. **Nastavení zobrazení je přenositelný textový soubor** (JSON se schématem, verze, migrace): styly, kombinace vrstev, pravidla, kombinace přepisů, skupiny anotací, tabulka tlouštěk čar. AI ho umí číst i psát. Import nikdy nemění prvky modelu. [R] → 4
32. **Tloušťka čáry se nikdy neukládá v mm, vždy jako číslo pera.** Tabulka tlouštěk (pero × měřítko → mm na papíře) je nastavení projektu; výchozí řada ISO 128, 7 per 0,13 až 1,0 mm. [R] → 4
33. **Velikost souborů se hlídá automaticky a soubory se dělí včas.** BIM-light bude velký program. Zdrojový soubor má jednu odpovědnost, cíl do 250 řádků, tvrdý limit 400 (testy stejně); funkce cíl do 50 řádků. Každý prvek (stěna, kóta, pohled, později okno…) má vlastní složku s modulem a `index.ts` jen s exporty. Kontrolu dělá skript `npm run check:size` v každém commitu a v GitHub Actions: nad 250 řádků varování (dělit hned při dalším doteku), nad 400 chyba (build neprojde). Výjimka jen zapsaná i s důvodem a schválená uživatelem. Dokumenty v `docs/` do ~40 KB / 500 řádků, `CLAUDE.md` do 150 řádků. Knihovny dat (šrafy, symboly) po jednom souboru na skupinu. [R] → metoda
34. **Šrafa je samostatná položka knihovny a materiál ji jen odkazuje; barva je u materiálu, ne u šrafy.** Šrafa = seznam čárových, bodových a vlnových rodin s rozměry v mm na papíře (základ 29). Materiál nese odkaz na šrafu, barvu čar, barvu výplně a číslo pera (základ 32). Knihovna šraf je otevřený seznam dat: přidání šrafy nevyžaduje změnu kódu. Projekt drží kopie použitých šraf s odkazem na původ (základ 21). Změna šrafy v knihovně se projeví u všech materiálů, které ji používají. Šrafa nikdy není zabudovaná do materiálu ani kopírovaná po jednom kuse na materiál. [R] → 4, 5 (viz `katalog-sraf-materialu.md`)
11. **Grafika prvku se počítá jednou funkcí přes pevné pořadí pater přepisů** (materiál/kategorie → sada → pravidla → úprava pohledu → přepis prvku na prvku → přepis prvku v pohledu). Generátory nikdy nevolí barvu/čáru/šrafu samy, vždy se ptají této funkce. Funkce umí vrátit i „proč“ (které patro rozhodlo). → 4
12. **Výška prvku může být vázaná na podlaží**, nejen pevné číslo: spodek = podlaží + odsazení, vršek = pevná výška NEBO jiné podlaží + odsazení (stěna „po strop 2.NP“, schodiště 1.NP → 2.NP, okap střechy). Při změně výšky podlaží se prvky přizpůsobí samy. Jeden mechanismus pro všechny prvky. → 7, 11
13. **Přístup k souborům a systému přes jedno rozhraní („platforma“).** Jádro ani UI nikdy nevolají přímo API prohlížeče nebo disku. Ukládání, otevírání, export, zálohy a MCP jdou přes jednu vrstvu se dvěma implementacemi: prohlížeč (teď) a desktopová obálka Tauri (později). Díky tomu se aplikace zabalí do instalace bez přepisování. Součástí vrstvy je i ukládání a zálohy (umístění nastavitelné uživatelem, zápis bezpečný proti výpadku: nejdřív dočasný soubor, pak nahrazení). → 8, 17
14. **Povrchy se odkazují logicky, ne geometricky.** Úprava povrchu (malba, obklad, dlažba) se váže přes místnost + stěnu + stranu + výškovou zónu (resp. místnost + podlaha/strop), nikdy přes souřadnice nebo konkrétní polygon. Povrchy samy se vždy počítají z modelu. Při změně stěny, otvoru nebo výšky podlaží přiřazení přežije. Musí být navrženo už s místnostmi, i když spárořezy přijdou později. → 9
15. **Ovládání se generuje z popisů, nekreslí se ručně.** (a) Registr příkazů: každý příkaz má na jednom místě název, ikonu, popis (propiska), zkratku, skupinu a dostupnost; z něj vznikají tlačítka, menu, propisky, vyhledávání příkazů (Ctrl+K) i seznam nástrojů pro AI. (b) Každý typ prvku popíše své parametry (název, jednotka, rozsah, skupina); z toho vzniká panel vlastností, schéma pro AI i mapování na IFC Pset. (c) Nastavení programu má jeden popis, ze kterého vzniká okno nastavení. → 10
16. **Generované prvky a ruční úpravy – jeden mechanismus.** Prvky, které vytváří generátor (krov ze střechy, později i další), si pamatují svůj generátor. Ručně upravený prvek dostane příznak „zamčeno“ a generátor ho při přepočtu nepřepíše; zamčené prvky jsou vidět a jdou vrátit generátoru. → 11
17. **Poloha projektu ve světě (georeference) od začátku.** Projekt si pamatuje: počátek projektu = bod v S-JTSK (Y, X), natočení k severu, a ±0,000 = absolutní výška v Bpv. Model pracuje v místních souřadnicích (mm, malá čísla); převod se použije při importu geodetických dat, ČÚZK, a při exportu (IFC IfcMapConversion, DXF). Společný počátek všech podlaží. → 12

## Rejstřík sekcí (rozděleno 2026-11-24, základ 33)

Číslování sekcí zůstává; odkazy „viz 4“, „sekce 16“ apod. v ostatních dokumentech se hledají podle tohoto rejstříku.

| Soubor | Sekce |
|---|---|
| `rozhodnuti-koncepce-model-zobrazeni.md` | 0 Základní koncepce · 1 Datový model · 2 Okna a dveře · 3 Elektro · 4 Zobrazení – sady · 5 Konstrukce (stěny, stropy, podlahy) · 6 Fáze a varianty |
| `rozhodnuti-prvky-stavby.md` | 7 Schodiště a zábradlí · 9 Místnosti a povrchy · 11 Střechy a krovy · 12 Terén a zemní práce · 13 Složené stěny a skleněný plášť · 15 Otvory v deskách a střechách, vikýře |
| `rozhodnuti-platforma-ui-vystupy.md` | 8 Platforma · 10 Ovládání (UI) · 14 3D, kamery, render, export do 3ds Max · 16 Kreslení a kótování · 17 Ukládání a zálohy · 18 Katalog a výběr typů · 19 Dokumentace pro povolení stavby · 20 2D výkresy |

Základy 1–34 jsou jen v tomto souboru a zůstávají v jednom kuse. Novou sekci přidávej do souboru podle tématu; když soubor přeroste ~40 KB, rozděl ho a doplň rejstřík.

## Otevřené (k probrání)
- Z checklistu DPS: základy (pasy, patky, deska), okolní zástavba (hmoty), import katastrální mapy a podkladu ČÚZK, prvky situace (zpevněné plochy, komunikace, vegetace, hranice staveniště, zábory, přípojky), výkresové listy + razítko + PDF, požárně nebezpečný prostor.
- Výkazy (tabulky z modelu: legenda elektro, výpis oken a dveří, místnosti, povrchy, kusovník krovu, zemní práce) jako jedna společná funkce.
- Podlahová plocha bytu (balkony, lodžie, koeficienty) – později.
- Sdílený balíček core vs. kopie (rozhodnuto 2026-11-23: jedno repo BIM-light, `packages/core`; zaměřování zůstává samostatné).
- Co BIM nutně potřebuje a co v Revitu chybí.
- Jak přesně má AI pracovat (prompt → návrh → potvrzení?).
- Zdroj nábytku a zařizovacích předmětů (2D symbol + 3D kvádr / import ze souboru / převzít ze zaměřování).
- Mockup obrazovky (před etapou 1).
- Kreslení oblouku a zakřivení hrany (po přímých stěnách).
- Okótování celé stěny (až s otvory a okny).
