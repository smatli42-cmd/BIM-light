# BIM-light – rozhodnutí: sekce 7, 9, 11, 12, 13, 15

Část katalogu rozhodnutí (rozděleno 2026-11-24 podle základu 33). Základy 1–33 a rejstřík jsou v `rozhodnuti-bim-light.md`. Číslování sekcí se nemění, odkazy typu „viz 4“ nebo „sekce 16“ platí.
Značení: **[R]** = rozhodl uživatel, **(já)** = Claude podle Revitu/Archicadu, platí, dokud uživatel nesouhlasí jinak.

## 7. Schodiště a zábradlí

- Kombinace Archicadu (kreslení výstupní čarou, kontroly) a Revitu (náčrt, obecný profil po trase). (já)
- Dva způsoby vytvoření:
  - **Výstupní čárou** (automat): klik začátek a lomy, výška se převezme z podlaží (např. 1.NP → 2.NP, viz základ 12), počet stupňů se dopočítá. Tvary: přímé, lomené s podestou, se zakřivenými (vyrovnanými) stupni, točité. (já)
  - **[R] Náčrtem – libovolné schodiště:** nakreslí se obrys a čáry jednotlivých stupňů libovolně (i do oblouku, nepravidelně), program z nich udělá 3D schodiště. Výšky stupňů rovnoměrně dopočítané, nebo zadané u každého stupně zvlášť (zaměřené stávající schodiště). Důvod: v Revitu se tak řešila oblouková schodiště, která automat neuměl.
- Kontroly podle ČSN během kreslení (2h + b, výška stupně, podchodná výška, šířka ramene): upozorní, nebrání. (já)
- Půdorysná značka podle českých zvyklostí, počítaná z modelu: výstupní čára s kroužkem a šipkou, zlom v rovině řezu, část nad řezem čárkovaně, popis „9 × 166,7 / 295“, volitelně číslování stupňů. (já)
- **[R] Zábradlí stojí na obecném nástroji „profil po trase“:** trasa + profil (madlo, lišta…) + prvky v rozteči (sloupky, výplň). Trasa napojená na schodiště, nebo volná. Stejný nástroj udělá lišty, sokly, římsy, okapy, ploty. (Revitovský „trik se zábradlím“ záměrně jako obecný nástroj.)

### Konstrukce schodiště (podnět: ocelová zubová schodnice z výpalku + dřevěné stupně; v Revitu jen částečně, zbytek ve 3ds Max)
- **[R] Schodiště = geometrie stupňů + vyměnitelná konstrukce.**
  - Geometrie (výstupní čára / náčrt, výšky, podesty, kontroly) říká jen, kde jsou stupně.
  - Konstrukce jsou samostatné, vyměnitelné části navázané na geometrii: (já pro detaily)
    - Stupně: deska (např. dřevo 40), přesah, zaoblení hrany, nebo monolit.
    - Nosná konstrukce – typy: betonová deska, dvě boční schodnice, středová schodnice, zubová schodnice z výpalku (tloušťka plechu, počet schodnic, odsazení od kraje, výška profilu pod hranou). Tvar schodnice se počítá z výstupní čáry (sleduje zalomení i podestu).
    - Podpory: sloupky pod podestou a v lomu (profil, poloha), kotvení do stěny, patky.
    - Podesta: vlastní nosná konstrukce a nášlap.
  - Vlastní tvar, když hotový typ nestačí: nakreslený profil schodnice, AI skript („zubová schodnice, plech 15, zuby se zkosením“) nebo 3D ze souboru. Ruční úpravy se zamknou (základ 16).
  - Kusovník pro výrobu: ocel (výpalky m² a kg, sloupky, madla v m), dřevěné stupně s rozměry. (já)
- **[R] Zábradlí = jedna souvislá trasa přes rameno, podestu i balkon** (příčina potíží v Revitu: špatné navazování úseků). (já pro detaily)
  - Výška automaticky: na rameni od hrany stupně, na podestě od nášlapu; přechod šikmá → vodorovná se zalomí plynule.
  - Sloupky podle pravidla: vždy začátek, konec a každý lom, mezi nimi rozteč. Kotvení shora do stupně nebo z boku do schodnice.
  - Madlo = jeden profil po celé trase (profil po trase).
  - Výplň = mřížka polí (základ 18): lanka rovnoběžně se sklonem na rameni, vodorovně na podestě; případně pruty nebo sklo.
  - Při posunu podesty nebo změně výšky stupně se celé zábradlí přepočítá.

## 9. Místnosti a povrchy (malby, obklady, dlažby, spárořezy)

- **[R] Místnosti se v BIM tvoří automaticky** ze stěn (IfcSpace). (Odmítnutí automatických místností platilo jen pro zaměřování.)
  - Pravidla hranic podle českých zvyklostí – viz „Výpočet podlahové plochy“ níže.

### Výpočet podlahové plochy místnosti (ČSN 73 4301, metodika ČKAIT) – podklad od uživatele
- **[R] Plocha se měří v úrovni horního líce podlahy a vymezuje vnitřním lícem svislých konstrukcí včetně povrchových úprav** (omítky, obklady). V modelu: hranice místnosti = líc poslední vrstvy skladby stěny; u stěn importovaných ze zaměření = zaměřený líc (měří se na omítku).
- Členitá místnost: plocha přesného polygonu (odpovídá rozdělení na obdélníky a součtu). (já)
- **[R] Dveřní otvor: plocha v otvoru (pod zárubní, ve tloušťce stěny) se nezapočítává** – hranice místnosti v líci stěny.
- **[R] Výklenky a arkýře se započítávají, jen pokud jdou až k podlaze, mají hloubku ≥ 0,30 m a světlou výšku ≥ 2,00 m.** Menší niky se nezapočítávají. Program rozhodne automaticky z geometrie a u místnosti ukáže, které výklenky započítal.
- **[R] Svislé konstrukce uvnitř místnosti (komín, sloup, pilíř, instalační šachta) se odečítají.**
- **[R] Zařizovací předměty se neodečítají** (kuchyňská linka, vana, sprchový kout, vestavěná skříň).
- **[R] Šikmé stropy (podkroví): nezapočítává se část půdorysu se světlou výškou < 1,30 m** (ČSN 73 4301); hranice nastavitelná v nastavení projektu (např. 1,20 m podle novějších daňových/katastrálních předpisů). Výpočet z 3D modelu (střecha/strop nad místností).
  - Kontrola: nad alespoň polovinou započítané plochy musí být světlá výška ≥ 2,30 m – při nesplnění upozornění u místnosti (nebrání).
- **[R] Zaokrouhlení na 2 desetinná místa m²**; v nastavení volba 1 desetinné místo (katastrální/evidenční účely).
- Plochy se počítají zvlášť pro každý stav (stávající / nový) a variantu. (já)
- Mimo rozsah zatím: podlahová plocha bytu s balkony, lodžiemi a koeficienty (lze doplnit později). (já)
- Důvod tématu: v Revitu povrch nebyl prvek, jen „nátěr“ na ploše; otvory ve stěnách ho rozbíjely a používaly se složité náhradní triky.
- Povrchy místnosti: každá místnost zná své povrchy (plochy stěn po obvodu, podlaha, strop, ostění otvorů). Počítají se vždy z modelu – otvor z povrchu zmizí sám, ostění přibude jako další malá plocha. (já)
- Úprava povrchu = typ (malba, obklad 300×600, dlažba 600×600, stěrka…) s materiálem. V IFC IfcCovering. (já)
- Výškové zóny na stěně (např. sokl do 100, obklad do 2000, nad tím malba), zadané pro celou místnost nebo pro konkrétní stěnu. (já)
- Spárořez: typ obkladu/dlažby má formát, spáru a zarovnání (od rohu / na střed / na osu). Program rozloží dlaždice po povrchu a ořízne je u otvorů a rohů. (já)
  - Stěny v rozvinutém pohledu místnosti (= „pohledy na stěny“ z poznámek), dlažba v půdorysu.
  - Výchozí bod se posune tažením, řezy se hned přepočítají; upozornění na příliš úzké řezy.
- Výkazy: plochy maleb a obkladů po místnostech, počet dlaždic vč. odřezů, délky soklů a lišt. Odečet otvorů a přičtení ostění podle nastavitelného pravidla (rozpočtové zvyklosti se liší). (já)
- Při změně modelu (posun okna, tloušťka stěny, výška podlaží) se spárořez i výkaz přepočítají bez ručních úprav. Viz základ 14. (já)

## 11. Střechy a krovy

- Vzor: vícerovinná střecha Archicadu (v Revitu střechy problematické; krovy nemá ani Revit, Archicad jen doplňky; plnohodnotné krovy dělají tesařské programy, např. SEMA, Dietrich's).

### Střechy (já)
- Vícerovinná střecha: obrys po okapech, u každé hrany sklon / štít / valba / polovalba. Hřebeny, nároží a úžlabí se dopočítají; úprava = klik na hranu a změna.
- Výška vázaná na podlaží (základ 12), např. okap = strop 2.NP + 300. Přesahy po hranách.
- Skladba vrstev jako u stěn (základ 10). V IFC IfcRoof složená z desek.
- Stěny se ke střeše samy dořízne (štítová zeď pod střechu), při změně sklonu se přizpůsobí.
- Střešní okna a vikýře mají střechu jako hostitele.
- Rekonstrukce: nepravidelnou stávající střechu lze „odpojit od automatu“ a upravit jednotlivé roviny ručně.

### Krovy
- **[R] Rozsah: generátor + ruční trámy + kusovník.** Bez statického výpočtu a bez tesařských spojů (čepy, plátování).
- Generátor vaznicové soustavy z rovin střechy: krokve v rozteči, pozednice, vaznice (středová, vrcholová), sloupky, kleštiny, pásky, nárožní a úžlabní krokve, výměny u komínů a střešních oken. (já)
- Každý prvek krovu je samostatný BIM prvek; typ = průřez + materiál (např. 140×180, C24). IFC: IfcBeam / IfcMember / IfcColumn. (já)
- Obecný nástroj „trám“ (dva body, průřez, natočení) pro ruční doplnění a hlavně pro zaměřený stávající krov. (já)
- Kusovník pro tesaře: označení, průřez, délka, počet, objem m³ – z modelu (mechanismus výkazů). (já)
- Výkresy krovu: půdorys krovu s označením prvků, příčná vazba – počítané z modelu. (já)
- **[R] Ručně upravený vygenerovaný prvek se zamkne:** generátor ho při další změně střechy nepřepíše, ostatní prvky se přepočítají. Zamčené prvky jsou označené a jdou vrátit generátoru. (Základ 16.)
- Pořadí: střechy a krovy až po 3D pohledu (bez 3D se špatně kontrolují).

## 12. Terén a zemní práce

- Vzor: Revit (toposurface / toposolid / building pad) – výkopy jen porovnáním povrchů a triky; Archicad – terén jako síť (mesh), výkopy ořezy těles, samostatný nástroj na zemní práce nemá. Pořádně to umí až inženýrské programy (Civil 3D apod.).

### Terén (já)
- Povrch z bodů (trojúhelníková síť, TIN). Vrstevnice počítané s nastavitelným intervalem, výškové kóty bodů.
- Původní terén = stav „stávající“, upravený terén = stav „nový“ (tlačítka fází fungují i na terén).
- IFC 4.3: IfcGeographicElement (terén), IfcEarthworksCut / IfcEarthworksFill (zemní práce).
- **[R] Import:** zaměření geodeta (seznam bodů č./Y/X/Z jako CSV/TXT, DXF s výškovými body), státní data ČÚZK DMR 5G (otevřená data zdarma, S-JTSK + Bpv), ruční zadání bodů a vrstevnic. Mračno bodů (LAS/LAZ ze skeneru/dronu) zatím ne.

### Zemní práce
- **[R] Rozsah: jáma, rýhy, ornice, úprava terénu + výkaz objemů.**
- Stavební jáma: obrys dna (lze převzít ze základů), výška dna, sklon svahu (např. 1:1) nebo svislé pažení, pracovní prostor. Program najde průsečík svahu s terénem a nakreslí horní hranu výkopu. (já)
- Rýhy pro základy: výkop po trase se šířkou a hloubkou. (já)
- Sejmutí ornice: plocha × tloušťka. (já)
- Úprava terénu: plošiny a svahy, mapa výkop/násyp v barvách. (já)
- Výkaz: objem výkopu, zásypu (výkop − konstrukce), násypu a ornice v m³; volitelně vlastnost třída těžitelnosti. (já)
- Při změně základů nebo terénu se vše přepočítá (zemní práce jsou generované z modelu). (já)
- Poloha projektu v S-JTSK a ±0,000 v Bpv: viz základ 17.

## 13. Složené stěny a skleněný plášť

### Stěna z více materiálů po výšce (např. luxfery do 2 m, nad tím zdivo)
- **[R] Obě cesty:**
  - **Skládaná stěna** (jako „stacked wall“ v Revitu): typ stěny má výškové pásy (např. 0–2000 luxfery 80, od 2000 zdivo 115 + omítky), každý pás vlastní skladbu i tloušťku, nastavitelný společný líc. Stejně sokl, parapetní zdivo, atika. Pro program je to jedna stěna (kreslí, kótuje, vykazuje se jako jedna). Viz základ 10.
  - **Pole luxferů jako výplň otvoru:** luxfery = další druh výplně v konfigurátoru oken, rastr tvárnic 190×190 zarovnaný na celé kusy; otvor, ostění a výkaz jako u okna.

### Skleněný plášť (lehký obvodový plášť, IfcCurtainWall)
- **[R] Plný rozsah:** (já pro detaily)
  - Trasa (přímá, lomená, oblouk), výška vázaná na podlaží.
  - Mřížka: svislé a vodorovné dělení v rozteči nebo na pevných pozicích; každou čáru mřížky lze posunout nebo smazat.
  - Profily: sloupky a příčle s průřezem (např. 50×150), rohové sloupky.
  - Pole: sklo, neprůhledný panel, okno nebo dveře vložené do pole.
  - Vložení do stěny: plášť vyřízne otvor ve zdivu.
  - Ruční změna jednoho pole/profilu se zamkne (základ 16).
  - Výkaz: panely podle rozměrů, metry profilů, plocha skla.
  - Půdorys: sloupky v řezu, sklo čarou, podrobnost podle sady.
- **[R] Společný mechanismus „mřížka polí“** pro okno, plášť, prosklené stěny a výplně (základ 18).

## 15. Otvory v deskách a střechách, vikýře

- Společný mechanismus otvoru (základ 19). Otvor ořízne obě desky najednou (nosný strop i skladbu podlahy). V půdorysu podle českých zvyklostí: otvor ve stropě s úhlopříčkami (křížem), nad rovinou řezu čárkovaně. (já)

### Otvor pro schodiště
- **[R] Automaticky ze schodiště:** schodiště samo vyřízne otvor do stropu nad sebou, velikost z kontroly podchodné výšky podle ČSN; při posunu/otočení schodiště jde otvor s ním. Ruční úprava obrysu = zámek (základ 16), program pak jen upozorní, když podchodná výška nevychází.
- Šachta / prostup přes více podlaží: ruční obrys + rozsah podlaží. (já)

### Otvory ve střeše (já)
- Střešní okno: hostitel střecha, osazení kolmo k rovině; výška spodní hrany zobrazená nad podlahou podkroví.
- Komín, prostup: svislý otvor.
- Krov u všech otvorů automaticky vygeneruje výměny.

### Vikýře
- **[R] Generátor typů + ruční odpojení.** Typy: sedlový, valbový, pultový, trojúhelníkový, „štítový“ s čelem v líci fasády.
- Parametry: šířka, výška čela, odstup od okapu, sklon a přesahy střechy vikýře. (já)
- Generuje všechny části najednou: čelní stěna, bočnice, střecha vikýře včetně napojení na hlavní střechu (úžlabí), otvor v hlavní střeše, výměny v krovu; do čela se vloží okno. Každá část je samostatný BIM prvek (skladba, výkaz, zámek ruční úpravy). (já)
- V půdorysu posun/roztažení tažením, vše se přepočítá. Nepravidelný stávající vikýř lze odpojit a upravit ručně. (já)
