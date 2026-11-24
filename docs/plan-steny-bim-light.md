# BIM-light – plán postupu: stěny (návrh k posouzení)

Stav: **2026-11-24 uživatel plán posoudil a bez připomínek jej přijal, platí návrhy (já) u otázek A–G.** Doplnění uživatele zatím nepřišla; až přijdou, zapíšou se sem. Označení **(já)** = návrh podle Revitu a Archicadu, platí, dokud uživatel nesouhlasí jinak. Instrukce pro Code (kroky Z1–Z6) jsou v `instrukce-code-steny.md`; kroky Z7–Z10 se rozpracují po vyzkoušení výsledku Z1–Z6. Tento plán slouží místo samostatného katalogu stěn.
Navazuje na: základy 1–34 v `rozhodnuti-bim-light.md` (hlavně 10, 12, 19, 23, 24, 32, 33), sekce 5 a 13 rozhodnutí, `katalog-kresleni-sten-kotovani.md`, `katalog-sraf-materialu.md`, `postup-etapy-bim-light.md`.

## 1. Co už o stěnách platí (stručně)

- **Tvar:** přímá nebo oblouk (základ 23); nástroj na oblouk zatím ne.
- **Poloha:** referenční čára osa / líc / líc jádra, výchozí vnitřní líc, tloušťka doleva od směru kreslení, líc zůstane na místě při změně tloušťky (sekce 5, katalog kreslení část 1 a 6).
- **Výška:** vázaná na podlaží (základ 12).
- **Skladba:** typ = výškové pásy → vrstvy (materiál, tloušťka, funkce); první verze jeden pás a jedna vrstva, tvar dat umí víc (základ 10, sekce 13). Šrafa je u materiálu, ne u typu (sekce 5, základ 34).
- **Napojení** je uložený vztah ATSTART / ATEND / ATPATH (základ 24); při odsazení se navazující stěny natáhnou (katalog kreslení část 7).
- **Otvor** je samostatný prvek, který hostitele vyřízne (základ 19); okna a dveře až v etapě 4.
- **Stav** stávající / bourání / nový; varianty; zobrazení přes styly, pera a přepisy (základy 26–32).
- **Hotové v pískovišti:** kreslení, přichytávání, výběr, kóty a zámky, základní příkazy (posun, kopie, otočení, zrcadlení, pole, ořez do rohu, rozdělení, zarovnání, obdélník).
- **Napojování vrstev v rozích** („algoritmus může přijít později, data ne“, základ 10) zatím neexistuje. To je největší díra a plán ji dává na začátek.

## 2. Srovnání: co umí stěny v Revitu a Archicadu a kde jsme

Značení: ✔ rozhodnuto nebo hotovo · ◐ částečně · ✖ chybí, navrhuji níže · ⏳ patří do pozdější etapy · ✗ záměrně nedělat. Poslední sloupec = krok z části 3.

| # | Funkce | Revit | Archicad | BIM-light | Krok |
|---|---|---|---|---|---|
| **Tvar a kreslení** | | | | | |
| 1 | Přímá stěna, řetěz, uzavření obrysu | Wall | Wall | ✔ | hotovo |
| 2 | Oblouk (kreslení, zakřivení hrany) | Arc | zakřivená stěna | ◐ data ano, nástroj ne | Z5 |
| 3 | Různá tloušťka na koncích (klín) | jen přes profil | Trapezoid | ✖ otázka A | Z5 |
| 4 | Šikmá, dvojitě šikmá, polygonální | profil, šikmé nepřímo | Slanted, Double-slanted, Polygon | ✖ otázka B | po střechách |
| 5 | Vlastní profil (římsa, pilíř, nároží) | Wall Sweeps, profil | Complex Profile | ◐ přes „profil po trase“ (sekce 7) | později |
| 6 | Vytvoření stěn z obrysu nebo čar | Pick Lines / Faces | Magic Wand | ✖ (já) ano, hlavně z obrysu místnosti | Z10 |
| **Poloha a výška** | | | | | |
| 7 | Referenční čára (osa, líce, jádro) | Location Line, 6 poloh | 6 poloh u skladby + odsazení | ✔ | hotovo |
| 8 | Přehození strany | mezerník | mezerník | ✔ | hotovo |
| 9 | Výška k podlaží + odsazení nahoře a dole | Base / Top Constraint, offset | Home Story, Top link, offset | ✔ základ 12 | Z3 |
| 10 | Stěna přes více podlaží | Top Constraint o víc úrovní | Top link Home+N, multi-story | ◐ stejným mechanismem | Z3 |
| 11 | Přichycení vršku a spodku ke stropu a střeše | Attach Top / Base | Trim to Roof, Solid Element Operations | ⏳ potřebuje desky a střechy, otázka E | po deskách |
| 12 | Horní profil (štít, zkosený vršek) | Edit Profile | polygon, Trim | ✖ otázka B | po střechách |
| **Skladba** | | | | | |
| 13 | Vrstvy: materiál, tloušťka, funkce | Compound Structure | Composite skins | ✔ | Z1 |
| 14 | Jádro (core boundary) | Core Boundary | Core skin | ✔ | Z1 |
| 15 | Výškové pásy (sokl, parapet, atika) | Stacked Wall | více materiálů v profilu | ✔ data, nástroj později | Z1 |
| 16 | Prodloužení vrstvy nahoru a dolů (omítka pod strop) | Extend Layers Top / Bottom | – | ✖ (já) parametr vrstvy | Z3 |
| 17 | Obalení vrstev kolem ostění a na konci stěny | Wrapping at Inserts / Ends | ostění v nastavení okna | ✖ otázka C | Z4 |
| 18 | Proměnná tloušťka vrstvy (spád) | Variable Layer | – | ✗ zatím ne | – |
| 19 | Lišty, římsy, drážky po stěně | Sweeps, Reveals | Complex Profile | ◐ profil po trase | později |
| 20 | Malba, obklad na stěně | Paint, Split Face | Surface Painter | ✔ jiný mechanismus (sekce 9) | později |
| 21 | Knihovna typů, duplikace, náhrada, „Použití“, vyčištění nepoužitých | Type Selector, Purge | Attributes | ◐ základ 21, editor typu v sekci 5 | Z1 |
| **Napojení** | | | | | |
| 22 | Rohy L, T, X, šikmé, konec na stěně | Join: butt, miter, square off | Junction cleanup podle priority skinů | ◐ vztah ano, algoritmus ne | Z2 |
| 23 | Priorita materiálů | priorita funkce vrstvy | priorita Building Material | ✔ data | Z2 |
| 24 | Zákaz napojení (výjimka) | Disallow Join | skupina průniku vrstvy | ✖ (já) příznak na napojení | Z2 |
| 25 | Čištění průniků: stěna přes jinou stěnu | Join Geometry | Solid Element Operations | ✖ (já) jen kontrola, ne ruční booleans | Z10 |
| **Otvory** | | | | | |
| 26 | Okna a dveře | rodina s hostitelem | Window, Door | ⏳ etapa 4 (základ 19) | Z4 + etapa 4 |
| 27 | Výklenky, niky, prostupy bez okna | Wall Opening | Niche | ✖ (já) otvor bez výplně | Z4 |
| 28 | Překlady, ostění | ručně | ručně | ⏳ s okny a dveřmi | etapa 4 |
| 29 | Probourání v nosné stěně (stav bourání a nový) | Phases | Renovation | ◐ stav + rozdělení stěny / otvor se stavem | Z10 |
| **Úpravy** | | | | | |
| 30 | Posun, kopie, otočení, zrcadlení, pole, ořez, rozdělení, zarovnání, odsazení | ano | ano | ✔ pískoviště | hotovo |
| 31 | Rozdělit s mezerou | Split with Gap | – | ✖ drobnost | Z9 |
| 32 | Hromadná změna typu, kopírování vlastností, výběr stejných | Match Properties, Select All Instances | Pipeta, Find & Select | ✖ | Z9 |
| **Vlastnosti** | | | | | |
| 33 | Nosná / nenosná | Structural Usage | Structural Function | ✖ otázka D | Z7 |
| 34 | Vnější / vnitřní, funkce (základová, opěrná…) | Function | Position | ✖ | Z7 |
| 35 | Požární odolnost, akustika | parametry | klasifikace | ✖ (já) data, později výkaz | Z7 |
| 36 | Hranice místnosti | Room Bounding | Zone boundary | ✔ sekce 9 | ⏳ místnosti |
| 37 | Stav (fáze) a varianta | Phases, Design Options | Renovation | ✔ | hotovo / Z6 |
| **Zobrazení** | | | | | |
| 38 | Podrobnost hrubá / střední / jemná | Coarse / Medium / Fine | Model View Options | ✔ styly | Z6 |
| 39 | Rovina řezu a stěny pod a nad ní | View Range | Floor Plan Cut Plane, Projected | ◐ rovina řezu je jen u otvorů | Z6 |
| 40 | Šrafy, pera řezu, čáry mezi vrstvami | ano | ano | ✔ základy 29, 32 | Z6 |
| 41 | Konce stěn (ukončovací čáry) | – | Wall End Lines | ✖ drobnost | Z6 |
| 42 | Řez, pohled, 3D | ano | ano | ⏳ etapa 7 a 3D | po Z6 |
| **Výstupy** | | | | | |
| 43 | Značka typu stěny, legenda skladeb | Wall Tag, legenda | Label, Composite | ✖ pro povolení potřeba | Z8 |
| 44 | Výkaz: délka, plocha hrubá a čistá, objem, po vrstvách | Schedule, Material Takeoff | Component Schedule | ◐ sekce 9, základ 14 | Z8 |
| 45 | IFC: IfcWall, MaterialLayerSetUsage, Pset_WallCommon | ano | ano | ◐ základ 5 | Z7 |
| **Kontroly** | | | | | |
| 46 | Překrývající se, nenapojené, příliš krátké stěny | varování | kolize | ✖ (já) | Z10 |

Zdroje pro srovnání: nápověda Graphisoft (Wall Tool Settings, Basic Intersection Principles) a Autodesk (Wall properties), prověřeno 2026-11-24.

## 3. Návrh postupu: devět kroků, každý stojí na předchozích

Pořadí vychází z logiky „co potřebuje co“: skladba (Z1) → napojení vrstev (Z2) → výška a podlaží (Z3) → otvory (Z4) → tvary (Z5) → kresba (Z6) → vlastnosti a IFC (Z7) → výkazy (Z8). Úpravy (Z9) a rekonstrukční práce (Z10) navazují na všechno. Každý krok končí tím, co jde vyzkoušet. Metoda jako dosud: katalog chování → rozhodnutí uživatele → testy z příkladů → implementace po malých krocích.

### Z0 – Rozhodnutí před kódem
- Posoudit tento plán, odpovědět na otázky A–G (část 5).
- Napsat `katalog-steny-bim-light.md` (parametry stěny, pravidla napojování, příklady vstup → výstup pro testy).
- Hotovo, když: uživatel schválí katalog.

### Z1 – Typ stěny a skladba
- Editor typu: tabulka vrstev (materiál, tloušťka, funkce jádro / izolace / povrch) a živý náhled řezu. Výškové pásy v datech, v editoru zatím jeden pás.
- Knihovna typů: duplikace, přejmenování, náhrada typu, „Použití: N stěn“, vyčištění nepoužitých. Projekt drží kopii typu s odkazem na původ (základ 21).
- Změna tloušťky nebo typu jedné stěny podle katalogu kreslení, část 6.
- Navazuje na: doplněk šraf a materiálů (`instrukce-code-srafy.md`), proto až po něm.
- Hotovo, když: stěna s třemi vrstvami (omítka, zdivo, izolace) má správný řez se šrafami v Projektu a hrubou výplň ve Studii; změna tloušťky jádra nechá povrchové vrstvy beze změny.

### Z2 – Napojování vrstev v rozích
Největší jednotlivý kus práce a základ pro všechno ostatní, proto hned po skladbě.
- Algoritmus pro roh L, T, kříž X, šikmé napojení, konec na stěně a stěny v jedné přímce.
- Pravidla podle priority materiálů: jádro na jádro, izolace na izolaci, omítka obteče roh (sekce 5, základ 10).
- Výstup: obrys stěny a obrys každé vrstvy po napojení; kresba, výkaz i 3D z něj budou čerpat.
- Výjimka: příznak „nespojovat“ na napojení (jako Disallow Join). (já)
- Odpojení a přitažení konce vztah zruší a vytvoří (základ 24).
- Hotovo, když: testy L, T, X a šikmého napojení pro stěny o různých skladbách; při změně tloušťky jedné stěny se přepočítají sousedi; stejný obrys dá stejný výsledek při opakování (determinismus).

### Z3 – Výška a svislé vazby
- Základna a vršek: podlaží + odsazení, nebo pevná výška; stěna přes více podlaží (vršek = podlaží + N). Změna výšky podlaží posune všechny stěny (základ 12).
- Prodloužení vrstev nahoru a dolů (omítka pod strop, sokl pod podlahu). (já)
- Datové pole pro **horní profil** (rovný, nebo polygon), samotné nástroje až po střechách (otázka B).
- Hotovo, když: změna výšky 1.NP o 100 mm změní výšku stěn a výkaz; stěna přes dvě podlaží vyjde správně.

### Z4 – Otvory ve stěně (strana stěny)
- Obecný otvor jako samostatný prvek podle základu 19: obdélník, později libovolný obrys. Ořízne všechny vrstvy a v 3D i řez.
- Niky a výklenky (neprůchozí) a prostupy bez okna jsou jen otvor s hloubkou. (já)
- Obalení vrstev kolem ostění (omítka zahne do otvoru), rozsah podle otázky C.
- Posun otvoru, jeho kóty a okótování celé stěny (rozhodnuto v prototypu jako „až s otvory“).
- Okna a dveře jsou potom jen výplň otvoru (etapa 4).
- Hotovo, když: otvor ve stěně o třech vrstvách řeže všechny vrstvy, kóta od líce k otvoru drží při změně tloušťky, smazání otvoru stěnu zacelí.

### Z5 – Tvary stěn
- Oblouk: nástroj, zakřivení hrany existující stěny (části 1 a 5 katalogu), napojení oblouk–přímka, otvory v oblouku, kóty (poloměr, délka oblouku), přichytávání (střed, tečna, kolmice).
- Podle odpovědí A a B: klín (různá tloušťka na koncích), případně šikmá stěna. Pokud ne, jen poznámka v `docs/STAV.md`, že data to nepřipouštějí.
- Hotovo, když: testy z části o oblouku, kde všechny výpočty z pískoviště fungují pro oba tvary.

### Z6 – Kresba stěny v půdorysu
- Rovina řezu podlaží u stěn: stěna zasahující rovinu = v řezu; stěna celá pod ní = pohled; stěna celá nad ní = čárkovaně (stejné pravidlo jako u otvorů, sekce 2).
- Tři podrobnosti (hrubá, střední, jemná) s čárami mezi vrstvami; stav bourání a nový podle pravidel fází.
- Konce stěn a značka osy, pokud je styl zapíná.
- Hotovo, když: tatáž stěna ve Studii, Projektu a ve stavu „Bourací práce“ má správnou kresbu a funkce grafiky vrátí důvod (základ 11).
- Řez, pohled a 3D: až po etapě řezů (etapa 7), data jsou připravená z Z1–Z3.

### Z7 – Vlastnosti stěny a IFC
- Vlastnosti: nosná / nenosná, vnější / vnitřní, funkce (obvodová, příčka, základová, opěrná), požární odolnost, akustika. Panel se generuje z popisu parametrů (základ 15b).
- IFC: IfcWall, skladba jako IfcMaterialLayerSet a Usage, Pset_WallCommon; kontrola v BIMvision.
- Hotovo, když: stěna se třemi vrstvami projde IFC exportem, v BIMvision má správnou skladbu a vlastnosti.
- Pozn.: jednoduchý export stěn (bez otvorů a bez Psetů) je už v kroku Z3 (jako chce postup etapy 2); sem patří úplný.

### Z8 – Výkazy a popisky
- Výkaz stěn: délka, plocha hrubá a čistá (bez otvorů), objem, po vrstvách a materiálech, po typu, podlaží, stavu a variantě. Odečet otvorů podle nastavitelného pravidla (sekce 9).
- Značka typu stěny v půdorysu a legenda skladeb (potřebná pro dokumentaci k povolení, viz `checklist-dps-bim-light.md`).
- Hotovo, když: výkaz seděl při ručním přepočtu na pilotním projektu.

### Z9 – Pohodlí úprav
- Hromadná změna typu, kopírování vlastností z jedné stěny na jiné, výběr stejných (typ, podlaží, stav), rozdělení s mezerou, sloučení stěn v jedné přímce stejného typu.
- Hotovo, když: každý příkaz je jeden krok Undo a jde volat z registru (i pro AI, základ 15).

### Z10 – Rekonstrukce a kontroly
- Částečné bourání: rozdělit stěnu a rozdělené části označit stavem; probourání otvoru v nosné stěně jako otvor se stavem „nový“ (nebo „bourání“ u zazdívaných).
- Import ze zaměřování (etapa 3): typy podle tloušťky, napojení z nalezených uzlů.
- „Kouzelná hůlka“: stěny z uzavřeného obrysu místnosti. U zaměřených vnitřních líců vyjde tloušťka ven. (já)
- Kontroly modelu: překrývající se stěny, nenapojené konce, stěny kratší než zadaná mez, mezery v obrysu místnosti. Varují, nebrání.
- Hotovo, když: import reálné zakázky ze zaměřování dá napojený a zkontrolovaný model.

## 4. Jak to zapadá do dosavadních etap

| Dosavadní etapa (`postup-etapy-bim-light.md`) | Obsah stěnového plánu |
|---|---|
| 0 pískoviště | hotovo: kreslení, kóty, interakce, styly; šrafy a materiály jako doplněk |
| 1 kostra | model, příkazy, ukládání; předpoklad pro Z1 |
| 2 stěna celou cestou | **Z0–Z3, Z6, základ Z7** (stěna od typu po kresbu a jednoduchý export) |
| 3 import ze zaměřování | Z10 (import) po Z2 |
| 4 okna a dveře | **Z4 (strana stěny)** a potom okna a dveře |
| 5 průřezové funkce | pískoviště hotovo; Z4 přidá okótování otvorů |
| 7 zobrazení a výkresy | řez, pohled a 3D stěn, Z8 popisky |
| Další etapy | místnosti (hranice podle Z2), schodiště, střechy (vrcholy a štíty podle B), terén |

Doporučení pro nástroje: Z0 rozhodovat v chatu (Opus); Z2 a architektura dat pro Z1 na Opus 5.5, ostatní kroky Sonnet 5.5. Pro každý krok nová session a limity velikosti souborů podle základu 33 (napojování stěn dělit na soubory: roh, T, kříž, šikmé, vrstvy).

## 5. Otevřené otázky k rozhodnutí (u každé je můj návrh)

- **A. Klín (různá tloušťka na koncích).** Zaměřené stávající stěny nebývají přesně rovnoběžné. Archicad má pro to stěnu Trapezoid. (já) První kolo ne: tvar „přímá, oblouk“ stačí, nerovnoběžnost řešit rozdělením stěny. Jde to přidat později jako třetí tvar (základ 23 počítá s rozšířením).
- **B. Šikmé stěny a horní profil (štíty, kolenní zdi, zkosený vršek).** (já) V datech pole „horní profil“ už od Z3, nástroj a ořez střechou až s etapou střech.
- **C. Obalení vrstev.** Kolik z toho chceme? (já) Ostění otvorů a konce stěn ano, vodorovné obalení (u stropu) ne.
- **D. Nosná / nenosná.** Chceme jen vlastnost (pro IFC a výkazy), nebo i jiné zobrazení v půdorysu (např. barvou, jiná šrafa)? (já) Jen vlastnost a pravidlo do stylů.
- **E. Desky (strop a podlaha).** V `postup-etapy-bim-light.md` nejsou jako samostatný krok, ale stěna k nim potřebuje „přichytit vršek“ a místnosti od nich berou výšku. (já) Jednoduchá deska po Z3 (obrys, výška, jedna vrstva), skladba později.
- **F. Vlastní profily stěn (římsa, pilíř, nároží).** (já) Jen přes „profil po trase“ (sekce 7), ne jako zvláštní druh stěny.
- **G. Kouzelná hůlka a import (Z10).** Chceme ji hned, nebo až po importu ze zaměřování? (já) Až po importu, je to jeho zobecnění.

## 6. Záměrně nedělat (pro stěny)

Proměnná tloušťka vrstvy, srubová stěna (Log Wall), stěna z hmoty nebo plochy, statický analytický model a výztuž, základové pásy pod stěnou jako součást stěny (budou samostatný prvek), ruční booleovské operace mezi stěnami (jen kontrola kolizí), obklady a malby jako součást stěny (jsou povrchy místnosti, sekce 9).

## 7. Po schválení

1. Hotovo 2026-11-24: odpovědi A–G přijaty podle návrhů (já); blok instrukcí pro Code je v `instrukce-code-steny.md` (kroky Z1–Z6, Z7 jen jednoduchý export IFC).
2. **Desky (otázka E) zatím nejsou v žádných instrukcích.** Jsou to samostatný prvek (strop a podlaha, sekce 5) a patří jim vlastní krok po Z3; čeká na pokyn uživatele, kam je v postupu zařadit.
3. Zbývá upravit `postup-etapy-bim-light.md` (etapa 2 podle tabulky v části 4).
4. Kroky Z7–Z10 se rozpracují po vyzkoušení výsledku Z1–Z6.

## 8. Kontrola závislostí kroků Z1–Z6 (2026-11-24)
Každý krok jsem prošel proti tomu, co potřebuje z předchozích. Předpoklady jsou v tabulce na začátku `instrukce-code-steny.md`. Nalezené mezery a oprava:
- Uzavření čela volného konce stěny patřilo do Z2 (obrys vrstev), ne do Z4 → přesunuto do Z2.
- Příkazy z etapy 0 (kopie, zrcadlení, pole, ořez, rozdělení, smazání) by po Z4 rozbily otvory → Z4 je musí s otvory počítat.
- Otvor nesmí přesáhnout výšku stěny, ta vzniká až v Z3 → Z4 má kontrolu a Z3 je jeho předpoklad.
- Export IFC z Z3 neměl otvory ani oblouk → Z4 a Z5 ho rozšiřují.
- Předvolby fází v Z6 potřebují efekt pravidla „skrýt“, který v pravidlech z etapy 0 není → Z6 ho přidá jako první.
- Zakřivení stěny s otvory (Z5) nemělo pravidlo → polohu po délce zachová, jinak odmítne.
- Hrubá podrobnost stěny s otvorem nebyla popsaná → doplněno do Z4.
Z7–Z10 zatím neověřeno, rozpracují se později.
