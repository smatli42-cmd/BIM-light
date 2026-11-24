# BIM-light – instrukce pro Claude Code: stěny (kroky Z1–Z6)

Stav: připraveno 2026-11-24, k vložení do Claude Code. **Pořadí celé práce: 1. doplněk šraf a materiálů (`instrukce-code-srafy.md`) → 2. krok 4 etapy 0 (zobrazení v sandboxu) → 3. tyto kroky Z1–Z6.** Spustit až po dokončení obou předchozích. Před spuštěním musí být v repu `docs/` aktuální: `plan-steny-bim-light.md`, `rozhodnuti-bim-light.md` (se základem 34) a tři navazující soubory `rozhodnuti-*`, `katalog-sraf-materialu.md`, `katalog-kresleni-sten-kotovani.md`, `katalog-pohledy-styly-zobrazeni.md`, `pravidla-interakce-bim-light.md`.
**Každý krok = samostatná session** a vždy se vkládá stejná jedna věta (viz „Jak postupovat podle plánu“). Modely přepínám ručně já: **krok 2 (napojování) Opus 5.5**, ostatní Sonnet 5.5. Po každém kroku počkej na moje vyzkoušení, než začne další.

**Věta pro každou session:** „Pokračuj podle `docs/instrukce-code-steny.md`: zjisti v `docs/STAV.md`, který krok stěn je další, ověř jeho předpoklady a udělej jen ten jeden krok.“

---

# BIM-light: stěny, kroky Z1–Z6

## Jak postupovat podle plánu (řídicí pravidla, platí pro všechny kroky)
Kroky na sebe navazují; každý smí použít jen to, co dodaly předchozí.

| Krok | Předpoklady (musí už existovat a mít zelené testy) | Dodá dalším krokům |
|---|---|---|
| Z1 typ a skladba | etapa 0 hotová včetně kroku 4 (jádro, příkazy, sandbox, styly); doplněk šraf a materiálů hotový (ve STAV.md „Doplněk šraf a materiálů: hotovo“) | typ stěny s vrstvami a jádrem, knihovna typů |
| Z2 napojování | Z1 (vrstvy, funkce jádro / izolace / povrch); uložená napojení stěn (základ 24); priority materiálů | obrys stěny a každé vrstvy po napojení, včetně uzavřeného čela volného konce |
| Z3 výška | Z1 (pole prodloužení vrstev); podlaží s výškou a úrovní z etapy 0 | výška stěny (základna, vršek, horní profil), jednoduchý export IFC |
| Z4 otvory | Z2 (obrysy po napojení); Z3 (výška stěny pro kontrolu otvoru); kóty, skupiny anotací a pohled z etapy 0 | prvek Otvor, rovina řezu, okótování celé stěny |
| Z5 oblouk | Z2 (algoritmus napojení); Z4 (otvory a kóty, které musí fungovat i v oblouku) | oblouková stěna a její napojení |
| Z6 kresba | Z2 (obrysy); Z4 (rovina řezu); styly, pravidla a funkce grafiky z etapy 0 | kresba stěny v půdorysu, předvolby fází |

1. Na začátku přečti `docs/STAV.md` a najdi řádky „Stěny: Zn hotovo“. Dělej jen první nehotový krok, nikdy dva v jedné session.
2. Před prvním řádkem kódu ověř předpoklady z tabulky (kód a testy existují). Cokoli chybí: **zastav se**, napiš mi co, a nic nedoplňuj z jiného kroku.
3. **Nepředbíhej.** Funkci, která je v plánu později (např. desky, nosná / nenosná, výkazy), nedělej, ani když by se hodila. Potřebuješ-li ji, zapiš do STAV.md do sekce „Chybělo“, co a proč, a pokračuj bez ní nebo se zastav, pokud krok bez ní dokončit nejde.
4. Na konci kroku spusť všechny testy a `npm run check:size`, zapiš do STAV.md „Stěny: Zn hotovo, datum“, napiš zprávu a **zastav se**. Další krok nezačínej.

## Kontext a pravidla práce
- Pokračuj podle `CLAUDE.md` a `docs/STAV.md`. Česky, stručně, bez zbytečné terminologie. Standardní chování BIM programů (Revit, Archicad) dělej celé, neptej se po kouskách; nejasnost zapiš do `docs/STAV.md` do „Rozhodl Code (k potvrzení)“ a pokračuj.
- Přečti před prvním řádkem kódu: `docs/plan-steny-bim-light.md` (celé; tabulka v části 2 a kroky v části 3 jsou závazné, otázky A–G jsou rozhodnuté podle návrhů (já)), v `rozhodnuti-bim-light.md` základy 4, 6, 9, 10, 11, 12, 19, 21, 23, 24, 32, 33, 34, v `rozhodnuti-koncepce-model-zobrazeni.md` sekce 5 a 6, v `rozhodnuti-prvky-stavby.md` sekci 13, `katalog-kresleni-sten-kotovani.md` (části 1, 6, 7), `katalog-sraf-materialu.md` a `pravidla-interakce-bim-light.md`.
- Přednost při rozporu: pravidla-interakce > katalog-pohledy-styly-zobrazeni > katalog-kresleni-sten-kotovani > plán stěn > starší části rozhodnutí.
- Navazuj na kód z etapy 0 (datový tvar stěny, typu, materiálu, příkazy, funkce grafiky). Měníš-li uložený tvar dat, zvyš `SCHEMA_VERSION` a napiš migraci (základ 9). Nepiš nic znovu, co už existuje.
- Základ 33 platí přísně: soubor do 250 řádků (tvrdý limit 400), funkce do 50, `npm run check:size` musí projít, soubor dělej hned při přerůstání 250 (samostatný commit „rozdělení …“). Struktura po prvcích: nová složka pro každý druh věci (`wall-type/`, `junction/`, `opening/` …), `index.ts` jen exportuje.
- Žádná cesta do dat mimo registr příkazů (základ 6), každý příkaz vlastní malý soubor, jedno Undo = jeden krok. Žádné pevné mm čar ani barvy (základy 11, 32). Jádro bez DOM. Model je v mm.
- Každé pravidlo = test; název testu začíná zdrojem, např. „plan-steny / Z2: roh L, tři vrstvy: …“. Oprava chyby = nejdřív test. Malé commity česky, větev main, CI při každém pushi.
- Rozhodnutí v `docs/` neměň sám (jen na můj pokyn). Repo je veřejné: žádná reálná data klientů, ukázková data vymyšlená.
- Na konci každého kroku: aktualizuj `docs/STAV.md` (hotovo, rozhodl Code k potvrzení, otevřené, pět největších souborů s počtem řádků, varování z kontroly) a napiš mi krátkou zprávu: co je hotové, co zkusit (nejvýš 5 kroků s adresou na Pages), co je otevřené.

## Rozhodnuto k těmto krokům (z plánu stěn, části 5)
- **A. Klín** (různá tloušťka stěny na koncích) a šikmé stěny **se nedělají**. Tvar zůstává přímá nebo oblouk; do `docs/STAV.md` jen poznamenej, že model nerovnoběžné líce nepřipouští.
- **B. Horní profil:** v datech je od kroku 3 pole „horní profil“ (rovný | polygon), zatím vždy rovný; nástroj a ořez střechou až s etapou střech.
- **C. Obalení vrstev:** ostění otvorů a konce stěn ano, vodorovné obalení (u stropu) ne.
- **D. Nosná / nenosná, požární odolnost** a další vlastnosti: není v krocích 1–6 (krok Z7 později).
- **E. Desky (strop a podlaha):** v těchto krocích **nedělej**; vršek stěny se tedy nepřichytává ke stropu ani střeše. Do `docs/STAV.md` zapiš, co ti při tom chybělo.
- **F. Vlastní profily (římsy, pilíře):** nejsou součást stěny, přijdou přes „profil po trase“.
- **G. Kouzelná hůlka** (stěny z obrysu místnosti) a import ze zaměřování: v těchto krocích ne.

---

## Krok 1: typ stěny a skladba (Z1)
Model: Sonnet 5.5.

**Datový tvar** (`packages/core/src/wall-type/`):
- **Typ stěny** = {id, název, výškové pásy[]}. Pás = {od, do (mm od základny; poslední pás „nahoru“), vrstvy[]}. Editor zatím jeden pás, data a validace umí víc (základ 10).
- **Vrstva** = {materiál (id z knihovny materiálů), tloušťka mm > 0, funkce: jádro | izolace | povrch, prodloužení nahoře a dole mm (výchozí 0; využije se v kroku 3)}.
- Pořadí vrstev **už je rozhodnuto v kódu** (STAV.md, krok 2): vrstvy jsou seřazené od referenční strany ke straně tloušťky, „líc jádra“ = začátek první vrstvy jádra. Drž se toho a nic nepřevracej.
- **Typ stěny, vrstvy a jádro už v jádru existují** (`wall/`, krok 2 etapy 0, včetně změny tloušťky = první vrstva jádra a pojmenování nového typu „Zdivo 450“). Tento krok je **rozšiřuje** (knihovna typů, editor, validace, prodloužení vrstev, náhrady, „Použití“), nepíše znovu. Měníš-li uložený tvar, migruj.
- Souvislé jádro: nejvýš jedna souvislá skupina vrstev s funkcí jádro. Volba referenční čáry „líc jádra“ je dostupná jen když jádro existuje (jako Archicad), jinak je zašedlá.
- Součet tloušťek vrstev = tloušťka stěny; tloušťka se neukládá zvlášť.
- Projekt drží kopii použitého typu s odkazem na původ (zdroj id + verze, základ 21).

**Příkazy** (registr): vytvoř typ, duplikuj, přejmenuj, uprav vrstvy (přidat, smazat, přesunout, změnit materiál, tloušťku, funkci), smaž typ (použitý: nabídne náhradu nebo odmítne), změň typ vybraných stěn, vyčisti nepoužité typy. „Použití: N stěn“ se počítá z modelu.
- **Změna tloušťky** jedné stěny (číslem nebo tažením): mění tloušťku jádra (u více jader nejtlustší, bez jádra nejtlustší vrstvy), povrchové vrstvy zůstanou; vznikne nový typ, nebo se přiřadí existující se stejnou skladbou (katalog kreslení, část 6). Referenční líc zůstane na místě.
- Výchozí knihovna 6–8 vymyšlených typů (např. obvodová 450 se zdivem a izolací, příčka 100 a 150, nosná zeď 300, ŽB 200, sádrokartonová příčka), materiály z doplňku šraf.

**UI v sandboxu:** panel Typy stěn (seznam, hledání, Použití, Duplikovat, Smazat) a editor typu: tabulka vrstev + živý náhled řezu se šrafami, součet tloušťky, volba referenční čáry. Vlastnosti vybrané stěny: výběr typu. Panely generuj z popisu parametrů (základ 15b), ne ručně pole po poli.

**Kresba:** střední podrobnost kreslí vrstvy se šrafami materiálů a čárami mezi vrstvami, hrubá jednu výplň. V tomto kroku zatím **každá stěna zvlášť, bez čištění rohů**; rohy řeší krok 2 (zapiš to jako známé omezení).

**Testy:** validace typu (jedno souvislé jádro, kladné tloušťky, platné materiály); součet tloušťky; změna tloušťky mění jen jádro; referenční líc zůstane; typ se po změně tloušťky slučuje s existujícím; náhrada při smazání použitého typu; kopie typu v projektu s odkazem; migrace starého tvaru; Studie vs. Projekt (hrubá výplň vs. vrstvy).

**Hotovo, když:** stěna s třemi vrstvami (omítka, zdivo, izolace) má v Projektu správný řez se šrafami, ve Studii hrubou výplň; změna tloušťky jádra nechá povrchové vrstvy beze změny.

---

## Krok 2: napojování vrstev v rozích (Z2)
Model: **Opus 5.5.** Největší jednotlivý kus práce, ostatní kroky na něm stojí. Napiš nejdřív stručný návrh algoritmu do `docs/STAV.md`, potom implementaci.

**Co už existuje** (STAV.md, skupina A, nepiš znovu, naváž a sjednoť): T napojení podle priority materiálů (`wall/joins.ts`, `wall/tee-gaps.ts`, přerušení čáry hostitele), rovné napojení stěn za sebou (`straight`), pokos v rohu přes celou tloušťku, čelo volného konce v `wall/outline.ts`. Chybí a dělá tento krok: roh L po vrstvách (u různých typů obtékání omítky), kříž X, šikmé napojení, tři a více konců v uzlu, přerušení šrafy hostitele v T, „nespojovat“, jednotný výstup „obrys každé vrstvy po napojení“ a galerie. Zapiš do STAV.md, co z existujícího kódu přesouváš do `junction/`.

**Zadání** (`packages/core/src/junction/`): pro každý uzel spočítej obrys každé stěny a obrys každé její vrstvy po napojení. Vstup: stěny, typy, uložené vztahy napojení (základ 24), priority materiálů. Výstup se **neukládá** (základ 4), počítá se z modelu a drží se v mezipaměti; při změně se přepočítají jen dotčené uzly.
- **Druhy uzlů:** roh L (konec–konec), T (konec stěny na hostiteli uprostřed), šikmé napojení (úhel různý od 90°), kříž X (dvě stěny se protínají uprostřed), tři a více konců v jednom bodě, stěny v jedné přímce (konec–konec téhož směru), volný konec. Kolmé i šikmé varianty. Oblouk jen připrav (struktura počítá s ním), napojení oblouků dělá krok 5.
- **Pravidlo priority** (jako Archicad, základ 10): vrstva s vyšší prioritou materiálu projede vrstvou s nižší (ta se tam ořízne). Vrstvy stejné priority a stejného materiálu splynou do jednoho tvaru; vrstvy stejné priority a různého materiálu se potkají v čáře pokosu. Jádro napojované stěny pokračuje do jádra hostitele; povrchové vrstvy (omítka) obtékají roh. Přesný výsledek každé konfigurace popiš v testech a ve STAV.md k mému potvrzení.
- **Volný konec stěny** (rozhodnuto C): povrchové vrstvy obou stran zahnou přes čelo a uzavřou ho; obrys každé vrstvy je i tam uzavřený. (Ostění otvorů řeší krok 4.)
- **Výjimka:** příznak „nespojovat“ na napojení: obrysy se nečistí, jen se překrývají (jako Disallow Join). Přepínač je v nabídce uzlu (pravý klik, katalog kreslení, část 5).
- **Vlastnosti výpočtu:** výsledek je deterministický; vrstvy jedné stěny se nepřekrývají a nemají mezery (součet ploch vrstev = plocha obrysu); změna tloušťky nebo typu jedné stěny přepočítá sousedy; odpojení a přitažení konce vztah zruší a vytvoří.
- **Kresba:** střední podrobnost kreslí obrysy vrstev po napojení; hrubá kreslí sjednocený obrys všech napojených stěn jedním tvarem bez vnitřních čar.
- **Galerie napojení** (stránka v sandboxu, jen pro mě): příklady L, T, X, šikmé, tři konce v uzlu a kolineární stěny, vždy pro stěny o různých skladbách, s přepínačem Studie / Projekt. Podle ní posoudím vzhled rohů.
- Dělení souborů (základ 33): `junction/` po druzích (roh, T, kříž, šikmé, kolineární), samostatně výběr pravidel priority a práce s vrstvami.
- Pro polygonové operace použij malou ověřenou knihovnu (např. polygon-clipping, nebo to napiš); zapiš volbu do STAV.md.

**Testy** (každá konfigurace s příklady vstup → výstup): L, T, X, šikmé, tři konce, kolineární, volný konec s uzavřeným čelem; stěny s různými skladbami a prioritami; příznak „nespojovat“; změna tloušťky sousedů; determinismus; plocha vrstev = plocha obrysu; jedno Undo vrátí vše.

**Hotovo, když:** v galerii napojení vypadají všechny konfigurace správně a testy projdou; v běžné kresbě stěn (z etapy 0) jsou rohy čisté ve všech třech podrobnostech.

---

## Krok 3: výška a svislé vazby, minimální export do IFC (Z3)
Model: Sonnet 5.5.

**Výška stěny:**
- **Základna:** podlaží + odsazení (kladné i záporné). **Vršek:** podlaží + N (N ≥ 0, N = 0 jen „stejné podlaží“ s odsazením) + odsazení, nebo pevná výška („nespojeno“). Stěna přes více podlaží je jen vršek na vyšším podlaží.
- Změna výšky nebo úrovně podlaží přepočte všechny stěny (základ 12). Smazání podlaží, na kterém něco leží, příkaz odmítne a řekne kolik prvků tam je.
- **Prodloužení vrstev:** vrstva s prodloužením nahoře nebo dole (omítka pod strop, sokl pod podlahu) má při výpočtu výšku vrstvy podle toho. V této etapě jen data, výpočet a test; kresba v řezu až s řezy.
- **Horní profil** (rozhodnuto B): pole stěny {druh: rovný | polygon}, zatím jen rovný; validace, migrace a test exportu / importu. Bez nástroje.
- Kóty, zámky a výběr zůstávají 2D a nesmí se rozbít.

**Minimální export do IFC** (cíl: ověřit základy včas, jak chce `postup-etapy-bim-light.md`):
- Modul mimo `packages/core` (např. `packages/ifc`), příkaz „Exportovat IFC“ v sandboxu.
- Obsah: projekt, budova, podlaží a stěny jako IfcWall s osou, výškou, skladbou (IfcMaterialLayerSet a Usage) a materiály; GlobalId z modelu; stav jako vlastnost Status. Žádné otvory, žádné Psety kromě Status. Výběr zapisovače (vlastní textový STEP pro omezenou sadu entit, nebo knihovna) zdůvodni ve STAV.md.
- Test: soubor se po exportu otevře knihovnou web-ifc (jako devDependency) a obsahuje očekávané entity. Otevření v BIMvision zkusím já.

**Testy:** změna výšky podlaží; stěna přes dvě podlaží; odsazení nahoře a dole; fixní výška; odmítnutí smazání podlaží; prodloužení vrstev; horní profil (data, migrace); export IFC (počty entit, skladba, GlobalId stabilní při opakovaném exportu).

**Hotovo, když:** změna výšky 1.NP o 100 mm změní výšku stěn; stěna přes dvě podlaží vyjde správně; vyexportovaný IFC se stěnou o třech vrstvách jde otevřít v BIMvision (ověřím já).

---

## Krok 4: otvory ve stěně (Z4)
Model: Sonnet 5.5. Okna a dveře jsou až etapa 4 a postaví se na tomto otvoru.

**Prvek Otvor** (`packages/core/src/opening/`, základ 19): samostatný prvek, který hostitele vyřízne. Data: hostitelská stěna, poloha po stěně (vzdálenost od začátku referenční čáry k počátku otvoru), šířka, výška, parapet (spodní hrana nad základnou stěny), druh: **průchozí** nebo **nika** (hloubka a strana; neprůchozí výklenek), stav, varianta. IFC: IfcOpeningElement a IfcRelVoidsElement. Obdélník teď, obrys je v datech obecný polygon.
- **Geometrie:** otvor vyřízne všechny vrstvy stěny z obrysů po napojení (krok 2). Použij polygonovou knihovnu z kroku 2.
- **Půdorys** podle českých zvyklostí (sekce 2 a 15): otvor, který protíná rovinu řezu podlaží (výchozí 1000 mm nad podlahou, nastavení pohledu), stěnu přeruší; otvor celý nad nebo pod rovinou řezu se kreslí čárkovaně. Rovinu řezu připrav jako nastavení, krok 6 ji použije i pro stěny.
- **Kresba:** hrubá i střední podrobnost stěnu v místě otvoru přeruší (hrubá sjednocený obrys bez otvoru, střední obrysy vrstev bez otvoru).
- **Kontrola proti výšce stěny** (z kroku 3): parapet + výška otvoru nesmí přesáhnout výšku stěny; změna výšky stěny nebo podlaží, která by otvor vyřízla ven, se odmítne s vysvětlením.
- **Obalení ostění** (rozhodnuto C): povrchové vrstvy obou stran zahnou do ostění, každá do poloviny hloubky ostění (po osazení okna etapa 4 upraví podle polohy výplně). Čelo volného konce stěny už řeší krok 2. Zapiš pravidlo a příklady do STAV.md k potvrzení.
- **Interakce** (společná služba, základ 20): nástroj Otvor (klik na stěnu, šířka a výška z panelu nebo z trackeru, přichytávání ke střednici, k líci sousední stěny a k jiným otvorům); tažení posune jen vybraný otvor (základ 25); dočasné kóty od líce stěny k hraně otvoru; mazání, kopie, zrcadlení.
- **Kóty:** trvalá kóta smí odkazovat na hranu otvoru (nový druh cíle vedle líce a konce stěny), včetně zámku; příkaz **Okótovat celou stěnu** (řetěz líc – hrana – hrana – … – líc, v nové skupině anotací podle aktivní), to bylo dosud odložené „až s otvory“.
- **Vazby:** při posunu stěny jde otvor s ní; při změně tloušťky zůstává poloha vůči referenčnímu líci; zkrácení stěny tak, že by otvor vyčníval, nebo rozdělení stěny přes otvor příkaz odmítne a vysvětlí proč (nikdy tiše, jako u zámků kót). Otvor těsně u rohu jen upozorní.
- Registr příkazů: vytvoř, posun, změň rozměry, smaž, kopíruj otvor.
- **Příkazy z etapy 0 musí s otvory počítat** (jinak by je rozbily): posun, kopie, otočení, zrcadlení a pole stěny berou její otvory s sebou; smazání stěny smaže její otvory; ořez do rohu a zkrácení stěny, které by otvor odřízly, se odmítnou jako rozdělení; zarovnání a odsazení stěny otvory posunou s ní; změna typu stěny polohu otvorů nemění.
- **IFC export** z kroku 3 rozšiř o otvory (IfcOpeningElement + IfcRelVoidsElement) a nika jako neprůchozí otvor; test, že web-ifc najde otvory.

**Testy:** řez všech vrstev; kóta od líce k hraně otvoru při změně tloušťky; čárkovaně nad rovinou řezu; posun, kopie, zrcadlení a pole stěny nesou otvory; smazání stěny smaže otvory; odmítnutí zkrácení a rozdělení; kontrola proti výšce stěny; okótování celé stěny (počet a hodnoty kót); nika neprořízne vrstvu na druhé straně; obalení ostění; smazání otvoru stěnu zacelí; export otvorů do IFC; Undo.

**Hotovo, když:** otvor ve stěně o třech vrstvách řeže všechny vrstvy, ostění je obalené, kóta od líce k otvoru drží při změně tloušťky a „Okótovat celou stěnu“ vytvoří správný řetěz.

---

## Krok 5: oblouk (Z5)
Model: Sonnet 5.5.

- **Nástroj Oblouková stěna:** tři způsoby: začátek, konec a bod na oblouku (výchozí); tečné pokračování předchozí stěny; zadání poloměru číslem (tracker: Tab přepíná poloměr, úhel, délku tětivy). Tloušťka doleva od směru kreslení jako u přímé.
- **Zakřivení hrany:** tažení středu hrany vybrané přímé stěny ji převede na oblouk, příkaz „Vyrovnat“ zpět. Platí katalog kreslení, část 5, bod 5.
- **Napojení oblouk–přímka a oblouk–oblouk:** rozšiř algoritmus z kroku 2; vrstvy jsou soustředné oblouky. Kresbu jako primitivum oblouku, pokud ho primitiva umějí; jinak lomená čára s chybou nejvýš 1 mm v modelu (zvol a zapiš do STAV.md).
- **Otvory v oblouku:** poloha po délce oblouku, otvor vyříznut radiálně. Zakřivení nebo vyrovnání stěny s otvory zachová jejich polohu po délce; nevejde-li se otvor, příkaz se odmítne s vysvětlením.
- **Kóty:** poloměr, délka oblouku, délka tětivy; přichytávání: střed oblouku, kvadranty, tečna, kolmice, průsečík přímka–oblouk. Odsazení oblouku je soustředné; navazující stěny se při odsazení natahují jako u přímých (část 7).
- Klín a šikmé stěny **nedělej** (rozhodnuto A).

**Testy:** všechny výpočty z etapy 0 (líce, tloušťka, rohy, T napojení) pro oblouk i smíšené uzly; otvor v oblouku; kóty a přichytávání; zakřivení a vyrovnání (Undo); napojení oblouk–oblouk s různými poloměry a skladbami; export IFC obloukové stěny (osa jako oblouk) včetně otvorů.

**Hotovo, když:** kruhová stěna z několika oblouků se třemi vrstvami má čisté napojení, otvor v ní jde okótovat a posunout.

---

## Krok 6: kresba stěny v půdorysu (Z6)
Model: Sonnet 5.5.

- **Rovina řezu podlaží u stěn** (nastavení pohledu z kroku 4): stěna protínající rovinu se kreslí v řezu (pero řezu, šrafy podle podrobnosti); stěna celá pod rovinou (parapetní zídka) jako pohled (hrany tenčím perem, bez šrafy); stěna celá nad rovinou čárkovaně. Stejné pravidlo jako u otvorů.
- **Tři podrobnosti:** hrubá (sjednocený obrys, jedna výplň), střední (vrstvy, šrafy, čáry mezi vrstvami), jemná (střední + čáry hran povrchových vrstev silnějším perem). Konkrétní vzhled jemné napiš do STAV.md k potvrzení.
- **Efekt pravidla „skrýt“** už existuje (`visible: false`, STAV.md krok 2), stejně jako pravidla a kombinace „Fáze – stávající / bourací práce / nový / srovnávací“. Nepřidávej znovu; v tomto kroku jen ověř, že fungují i na stěny s vrstvami a otvory, a doplň čtyři tlačítka v sandboxu, pokud ještě nejsou (krok 4 etapy 0 je mohl zavést).
- **Stav a fáze:** čtyři hotové předvolby fází jedním klikem (Stávající stav, Bourací práce, Nový stav, Srovnávací) jako kombinace přepisů podle sekce 6 rozhodnutí: stávající černě, bourané žlutě čárkovaně, nové červeně ve srovnávací. Prvek je může vždy přepsat (patra přepisů, základ 11).
- **Konce stěn:** čelní čára u volného konce (výchozí zapnuto, volba ve stylu); **značka referenční čáry** jako tenká čerchovaná čára, volitelně pravidlem stylu (výchozí vypnuto).
- Funkce grafiky vrací i „proč“ (patro a pravidlo), panel stěny ho ukáže.
- Řez, pohled a 3D **nedělej**; data (výška, vrstvy, horní profil, otvory) jsou pro ně už připravená.

**Testy:** stěna v řezu, pod a nad rovinou řezu; změna roviny řezu; tři podrobnosti; čtyři předvolby fází (včetně přepisu prvku, který vyhraje); „proč“; konce stěn; změna měřítka mění jen tloušťky čar; export a import stylu s novými pravidly.

**Hotovo, když:** tatáž stěna ve Studii, v Projektu a ve stavu „Bourací práce“ má správnou kresbu a panel řekne, které pravidlo rozhodlo.

---

## NEDĚLEJ (v krocích 1–6)
Klín a šikmé stěny, nástroj na horní profil, ořez stěn střechou a stropem, desky, vlastnosti nosná / nenosná / požární odolnost, výkazy, značku typu stěny a legendu skladeb, hromadné úpravy a kopírování vlastností, import ze zaměřování, kouzelnou hůlku, kontroly modelu, řezy, pohledy a 3D, okna a dveře (jen otvor), proměnnou tloušťku vrstvy, srubovou stěnu, ruční booleovské operace mezi stěnami.

## Konec
Po kroku 6 krátká zpráva: co je hotové, co zkusit (nejvýš 5 kroků s adresou na Pages), co je otevřené, pět největších souborů. Aktualizuj `docs/STAV.md`. Další kroky (Z7 vlastnosti a úplný IFC, Z8 výkazy a popisky, Z9 pohodlí úprav, Z10 rekonstrukce a kontroly) rozpracuji po vyzkoušení.
