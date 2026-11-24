# BIM-light – katalog chování „Pohledy a styly zobrazení“ (průběžný)

Značení: **[R]** = rozhodl uživatel, **(já)** = Claude podle Revitu/Archicadu, platí, dokud uživatel nesouhlasí jinak.
Navazuje na `rozhodnuti-bim-light.md`, sekce 4 (sady zobrazení, pořadí přepisů) a základy 5, 11, 22. Základy 26–32 jsou zapsané i v `rozhodnuti-bim-light.md` (krátce); tady je podrobný popis.
Stav: **koncept z 2026-11-24, upraveno podle panelu Vrstvy z arditu, upřesnění měřítka a tlouštěk čar.**
Vzor: ardit.designer (přepínače Studie / Projekt / Elektro, panel Vrstvy, okno Grafické přepisy; totéž má Archicad jako kombinace vrstev a kombinace grafických přepisů), Revit (tabulka tlouštěk čar).

## ⚠ Nové základy od prvního dne (stěny se jich týkají hned)

26. **Pohled má svůj styl zobrazení.** Pohled = podlaží (nebo řez / pohled) + výřez + měřítko + **zvolený styl** (+ označené místní úpravy). Styl se vybere při vytvoření pohledu a jde kdykoli přepnout jedním klikem v seznamu nahoře. Přepnutí stylu mění jen vzhled (vrstvy, podrobnost, grafika, popisky), nikdy model ani kóty. [R]
27. **Styl = jedna věc, kterou uživatel vybírá; skládá se z částí.** Styl nese: kombinaci vrstev (co je vidět, co je zamčené), podrobnost (hrubá / střední / jemná), kombinaci grafických přepisů, popisky a výchozí měřítko. Styly jsou data v projektu, ne pevný kód: Studie / Projekt / Elektro jsou jen tři přednastavené, uživatel si vytvoří vlastní (kopie + úprava, „Uložit jako…“). [R] Styl v projektu je kopie s odkazem na původ jako typy (základ 21), sdílení přes knihovnu později. (já)
28. **Kóty, popisky a 2D kresba patří podlaží a mají skupinu anotací (vrstvu).** Např. „Kóty a popisky – studie“, „– DSP a PPS“, „– PPS“, „Kresba 2D“; skupiny si uživatel může přidat. Styl určuje, které skupiny jsou vidět, takže v jednom pohledu stačí přepnout styl a kóty se přepnou s ním. Nová kóta se zapíše do aktivní skupiny (výchozí podle stylu). Kóta existuje jen jednou, ne po pohledech. Zámek kóty je omezení modelu a platí i ve skryté skupině. [R podle panelu Vrstvy] *Oprava: dřívější verze psala, že kóty patří pohledu. Špatně, uživatel zvolil „jeden pohled, mění se styl“.*
29. **Měřítko neurčuje, co se kreslí, ani velikost textů, značek a šraf.** Texty, šipky, značky (konce kót, značky řezů, elektro symboly, kroužkové značky) a šrafy mají **pevnou velikost na papíře (v mm) a jsou stejné ve všech měřítcích**, jako v Revitu. [R] Velikosti textů a značek jsou společné nastavení projektu (např. čísla kót 2,5 mm), ve stylu jdou případně změnit. **Měřítko mění jen tloušťky čar** (přes tabulku pro měřítko, základ 32). O obsahu rozhoduje podrobnost ze stylu. Styl nabízí výchozí měřítko pro nový pohled (Studie 1:100, Projekt 1:50, Elektro 1:50), které jde změnit. Praktický následek: při menším měřítku zaberou texty a značky víc místa v domě a kóty se mohou překrývat, nic se ale samo nepřesouvá.
30. **Pravidla grafiky jsou data: pravidlo = podmínka + efekt, kombinace = seřazený seznam pravidel.** Pravidlo se ptá na libovolnou vlastnost prvku (kategorie, profese, stav, variantu, materiál, typ, později U-hodnotu…) a nastaví čáru (číslo pera, typ čáry), barvu, výplň, šrafu nebo průhlednost. Kombinace říká, která pravidla jsou zapnutá a v jakém pořadí (shora má přednost). Vyhodnocuje je jedna funkce pater přepisů (základ 11, patro 3). Podmínky vznikají z popisu parametrů prvků (základ 15b). (já podle ardit / Archicad)
31. **Nastavení zobrazení je přenositelný textový soubor.** Styly, kombinace vrstev, pravidla, kombinace přepisů, skupiny anotací a tabulka tlouštěk čar jdou exportovat a importovat jako JSON se schématem (verze, migrace jako základ 9, schéma z popisu jako základ 15). AI ho umí číst i psát (v programu přes příkazy, mimo program v chatu). Import nikdy nemění prvky modelu, jen zobrazení. [R podnět uživatele]
32. **Tloušťka čáry se nikdy neukládá v mm, vždy jako číslo pera.** Tabulka tlouštěk čar (pero × měřítko → mm na papíře) je jedno nastavení projektu, jako „Tloušťky čar“ v Revitu. Všechno ostatní (kategorie, materiály a jejich šrafy, kóty, osy, pravidla, přepisy prvků, export DXF a PDF) se odkazuje jen na číslo pera; změna tabulky změní vzhled všude najednou. [R podle Revitu] Výchozí hodnoty viz část Tloušťky čar.

## Co ukazují vzory z arditu (výkresy téhož domu)

| | Studie 1:100 | Projekt 1:50 | Elektro 1:50 |
|---|---|---|---|
| Stěna | tmavá výplň + světlý obrys, bez vrstev a šraf | šrafa materiálu, vrstvy | šedá, potlačená, bez šraf |
| Okna, dveře | otvor + čára, oblouk dveří | rámy, parapety, oblouk | potlačené |
| Místnosti | číslo, název, plocha | barevná výplň + razítko | barevná výplň |
| Kóty | jen vnější řetězy | mnoho kót, kroužkové značky | žádné |
| Navíc | značky řezů | výškové značky | elektro symboly, vazby, osy, popisky výšek |

Vše se vejde do částí stylu. Nic z tabulky není samostatná vlastnost.

## Tloušťky čar (pera)
- **Dvě vrstvy (já podle Revitu):** (1) tabulka tlouštěk: řádky = pera, sloupce = měřítka (výchozí 1:20, 1:50, 1:100, 1:200, 1:500), hodnota = tloušťka v mm na papíře; (2) přiřazení pera: kategorie má pero pro „řez“ a pro „pohled“ (stěna v řezu silné, v pohledu tenké), materiál má pero pro čáry šrafy, kóty, osy a značky mají své pero. Pravidla a přepisy prvků nastavují jen číslo pera. Výsledná tloušťka = pero z funkce pater přepisů (základ 11) + měřítko pohledu → hodnota z tabulky.
- **Co říká norma (zjištěno 2026-11-24):** ČSN ISO 128-23 (čáry na stavebních výkresech) byla v roce 2021 zrušena, základní pravidla pro čáry drží ČSN EN ISO 128-2 (nové znění nečteno, placená). Norma určuje typy čar a k čemu se používají (např. obrys řezaných částí bez šrafy nejtlustší čarou), řadu šířek a poměr velmi tlustá : tlustá : tenká = 4 : 2 : 1, značky mají šířku mezi tenkou a tlustou. **Norma neurčuje mm pro konkrétní prvek v konkrétním měřítku**; to je dohoda kanceláře.
- **Výchozí tabulka [R]: řada ISO 128, 7 per**, stejné hodnoty ve všech měřítcích (sloupce pro měřítka existují, aby se daly doladit): pero 1 = 0,13; pero 2 = 0,18; pero 3 = 0,25; pero 4 = 0,35; pero 5 = 0,5; pero 6 = 0,7; pero 7 = 1,0 mm. Tabulka jde rozšířit o další pera i upravit hodnoty po měřítkách. Tabulka z Revitu (16 per, 1:10 až 1:500) je jen vzor, výchozí není.
- **Výchozí přiřazení (já), čtyři úrovně podle normy, poměr ≈ 4 : 2 : 1 + značky:**
  - velmi tlustá = pero 5 (0,5): řezané konstrukce (stěny, sloupy, desky v řezu);
  - tlustá = pero 3 (0,25): hrany v pohledu, okna, dveře, schodiště, nábytek;
  - značky = pero 2 (0,18): značky, elektro symboly;
  - tenká = pero 1 (0,13): kóty, pomocné čáry, šrafy, osy.
  Zbylá pera (0,35 / 0,7 / 1,0) jsou k dispozici pro vlastní styly a jiné použití.
- Další zdroje hodnot později: vlastní praxe uživatele (tloušťky z AutoCAD tabulky stylů tisku, kancelářský standard, vzorový výkres), AI z popisu nebo snímku přes balíček nastavení (základ 31).
- Barva a typ čáry (plná, čárkovaná…) jsou zvlášť, nejsou součástí pera.

## Vrstvy (podle panelu Vrstvy z arditu) (já)
- Panel: nahoře seznam kombinací vrstev („Elektro“), tlačítko „Uložit jako…“ a × (zruší místní úpravy); pod tím seznam vrstev s okem (viditelná), zámkem (zamčená: nejde vybrat ani upravit) a kostkou (zobrazit ve 3D, až bude 3D); vyhledávání vrstvy.
- Vrstvy v arditu: Stěny a sloupy, Okna a dveře, Desky, Střechy, Schodiště a zábradlí, Místnosti, Nábytek, Kresba 2D, Kóty a popisky studie, Kóty a popisky DSP a PPS, Kóty a popisky PPS, Situace (+ další).
- **Vrstvy modelových prvků se nepřiřazují ručně**: prvek spadá do vrstvy podle kategorie (zachovává [R] „viditelnost odvozeně“ z rozhodnutí 4; hladiny v DXF vznikají ze stejných vlastností). Ručně se přiřazují jen anotace (skupiny, základ 28).
- Zámek vrstvy: užitečný třeba v Elektru, kde se architektura zamkne, aby se omylem nepohnula.
- **Kombinace vrstev** = uložený stav všech vrstev (viditelná / zamčená). Je součástí stylu, ale jde změnit i v pohledu; změna je označená „styl: Elektro (upraveno)“ a jde vrátit jedním tlačítkem (už [R] v rozhodnutí 4).

## Grafické přepisy: pravidla a kombinace (podle okna z arditu) (já)
- **Pravidlo** = jedna pojmenovaná věc („Elektro – stavba šedě“, „Řezané konstrukce černě“, „Barvy skupin hmot ČSN 01 3406“, „Tepelná obálka – splnění U“): podmínka (na které prvky platí) a efekt (jak se nakreslí).
- **Kombinace** = vybraná pravidla s pořadím, vyšší vyhrává (např. „Elektro – podklad šedě“ = jen pravidlo „Elektro – stavba šedě“).
- Okno „Grafické přepisy“: vlevo kombinace (Nová / Kopie / Smazat), vpravo pravidla (Nové pravidlo / Smazat), zaškrtávátka pravidel kombinace; „Použít kombinaci“, „Hotovo“.
- Pravidlo je samostatné, takže ho lze použít s jiným stylem. Každý styl nese výchozí kombinaci.
- Fáze (stávající / bourací / nový / srovnávací, rozhodnutí 6) jsou předdefinovaná pravidla ve stejném mechanismu.
- Pořadí pater přepisů z rozhodnutí 4 se nemění; pravidla z kombinace jsou patro 3. Přepis jednoho prvku vždy vyhraje (patra 5 a 6). Panel „proč to vypadá takhle“ ukáže i název pravidla, které rozhodlo.
- Předdefinovaná pravidla a kombinace jdou kopírovat a upravovat; žádná není v kódu zvláštní.

## Jednoduché ovládání (požadavek uživatele: neztratit se v nastavení) (já)
Tři úrovně, každá se otevře jen když je potřeba:
1. **Běžná práce:** jen přepínač stylu nahoře, jeden klik. Vedle něj ukazatel „styl: Projekt“ nebo „Projekt (upraveno)“ s tlačítkem Vrátit.
2. **Rychlé úpravy:** panel Vrstvy (oko a zámek); „Uložit jako styl“ z aktuálního stavu.
3. **Pokročilé:** okno Grafické přepisy, editor stylu a tabulka tlouštěk čar, jen na vyžádání.
- Každá věc má jen jedno místo; uživatel vybírá pouze styl, ostatní jsou jeho součásti.
- **AI cesta pro ty, kdo nechtějí klikat:** pole „popiš, jak má styl vypadat“ (např. „prováděcí výkres: architektura šedě, kóty jen skupina PPS, stěny se šrafou“). AI přes příkazy navrhne styl, pravidla a kombinace, ukáže náhled a použije se po potvrzení.

## Import a export nastavení zobrazení (já)
- **Co:** styly, kombinace vrstev, pravidla, kombinace přepisů, skupiny anotací, tabulka tlouštěk čar; jeden textový soubor JSON („balíček zobrazení“) s verzí schématu a migracemi.
- **Import:** nejdřív náhled („přidá 1 styl, 3 pravidla, nahradí 1 kombinaci“); při shodě názvů volba nahradit / ponechat obě. Neznámá vlastnost nebo kategorie v pravidle: pravidlo se vypne s upozorněním, nic se nerozbije. Model prvků import nikdy nemění.
- **AI v programu:** příkazy (základ 6) nad těmito daty, vždy s náhledem před použitím.
- **AI mimo program:** export balíčku, popis nebo snímky vzoru z jiného programu do chatu, upravený soubor zpět importem. Přímý import z arditu ne (jiný formát), ale popis a snímky obrazovky AI stačí.

## Jak to vypadá pro uživatele (já)
- **Nový pohled:** vybereš podlaží (nebo řez/pohled), styl a měřítko (nabídne výchozí ze stylu).
- **Přepnutí stylu:** jeden klik; mění vrstvy, podrobnost a grafiku, kóty se přepnou podle skupin anotací.
- **Nová kóta** jde do aktivní skupiny (výchozí podle stylu): kóta nakreslená ve Studii je ve Studii vidět a v Projektu skrytá.
- **Vlastní styl:** „Uložit jako…“ z aktuálního stavu, nebo upravit v editoru, nebo popsat AI.
- **Jedna stěna jinak:** přepis prvku; panel ukáže „proč to vypadá takhle“.
- Fáze zůstávají samostatná tlačítka (rozhodnutí 6), technicky pravidla.

## Stěna: smlouva s kreslením (já)
- Stěna drží jen data (referenční čára, typ, výška, stav…). Kreslí ji jedna funkce, která dostane stěnu, podrobnost a grafiku z funkce pater přepisů (základ 11). Stěna sama nevolí barvu, šrafu ani tloušťku čáry (jen číslo pera z funkce).
- **Hrubá (Studie):** obrys + jedna výplň, bez vrstev a šraf.
- **Střední (Projekt):** čáry vrstev + šrafa materiálu; napojení vrstev v rozích jednoduché (podle priority materiálů se doplní později).
- **Jemná:** později, tvar dat ji musí umět.
- Stav (stávající / bourání / nový) a varianta mění grafiku přes pravidla (patro 3), ne přes generátor.

## První pískoviště (stěny + kóty) – co musí být hned (já)
- Datový tvar: **Vrstva** {název, druh: kategorie | anotace}, **Kombinace vrstev** {název, stav každé vrstvy: viditelná / zamčená}, **Pravidlo** {název, podmínka, efekt}, **Kombinace přepisů** {název, seřazená pravidla}, **Styl** {název, kombinace vrstev, podrobnost, kombinace přepisů, výchozí měřítko, výchozí skupina anotací}, **Pohled** {podlaží, výřez, měřítko, styl, místní úpravy}, **Kóta** {…, skupina anotací}, **Tabulka tlouštěk čar** {pero × měřítko → mm}. Vše s verzí schématu (kvůli exportu a importu, základ 31).
- Čáry (stěna, kóty, pomocné prvky) se kreslí vždy přes číslo pera; v kódu nikde pevné mm. Výchozí tabulka a přiřazení per podle části Tloušťky čar.
- Funkce pro výslednou grafiku vrací i „proč“ (které patro a které pravidlo rozhodlo). Stěna s hrubou a střední podrobností.
- UI: přepínač stylu nahoře, ukazatel „(upraveno)“ s tlačítkem Vrátit, panel Vrstvy (oko, zámek), aktivní skupina anotací, nové pohledy, předvolby Studie a Projekt (každý s vlastní skupinou kót). Export a import JSON, okno grafických přepisů, editor tabulky tlouštěk, Elektro a editor stylů přijdou později; tvar dat je připravený hned a tabulka má výchozí hodnoty.
- Kóty z prototypu dostanou skupinu anotací a patří podlaží; zámek kóty zůstává omezením modelu.
- Testy: přepnutí stylu nezmění model ani kóty; kóta vytvořená ve Studii je v Projektu skrytá a po návratu beze změny; zámek kóty ve skryté skupině dál platí; zamčená vrstva nejde vybrat; stejná stěna ve Studii a v Projektu má stejnou geometrii a jinou kresbu; **změna měřítka mění jen tloušťky čar, velikost textů, značek a šraf na papíře zůstává**; změna hodnoty v tabulce tlouštěk změní všechny čáry s tímto perem; stejné pero v jiném měřítku vezme jiný sloupec; pravidlo vyšší v pořadí přebije nižší a funkce vrátí, které rozhodlo; export a pak import stylu dá stejná data; neplatný import program nerozbije.

## Otevřené (později)
- Doladit tabulku tlouštěk a přiřazení per podle uživatelovy praxe (AutoCAD tabulka stylů tisku, kancelářský standard, vzorový výkres); případně hodnoty po měřítkách.
- Kopírování kót mezi skupinami a automatické okótování (jako v arditu); jemnější členění kót než skupina (např. „vnější řetěz / okna / výškové“).
- Styl pro řezy a pohledy (fasády); editor stylů a okno grafických přepisů (UI); zobrazení vrstev ve 3D.
- Pravidla podle U-hodnoty (tepelná obálka) vyžadují λ a výpočet; až s tepelnými vlastnostmi materiálů.
- Sdílení stylů, pravidel a kombinací v knihovně mezi projekty.
