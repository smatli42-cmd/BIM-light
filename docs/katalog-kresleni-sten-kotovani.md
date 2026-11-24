# BIM-light – katalog chování „Kreslení stěn a kótování“ (průběžný)

Značení: **[R]** = rozhodl uživatel, **(já)** = Claude podle Revitu/Archicadu, platí, dokud uživatel nesouhlasí jinak.
Navazuje na `rozhodnuti-bim-light.md`, sekce 16 a základ 20 (interakce je jedna společná služba). Rozhoduje se po částech, tlačítky.
Stav: **části 1–7 hotové (přímé stěny), upraveno podle zkoušky klikacího prototypu (část 7).** Zbývá kreslení oblouku (později). Potvrzeno 2026-11-23: úhel 90° = zatáčka doprava; změna délky stěny posune konec, který uživatel uchopí.
Prototyp: klikací HTML stránka uložená v `docs/reference/prototyp-interakce.html`, slouží jako zadání chování a zdroj scénářů do testů, kód se nepřebírá. Další pravidla interakce jsou v `pravidla-interakce-bim-light.md` (při rozporu platí ten soubor).

## ⚠ Nové základy vzniklé v této části

23. **Tvar stěny v datech je od začátku „přímá nebo oblouk“.** Stěna nese tvar osy / referenční čáry jako úsečku nebo kruhový oblouk (IFC: IfcTrimmedCurve). Všechny výpočty (líce, tloušťka, napojení, otvory, kóty, přichytávání) počítají s oběma tvary. Nástroj pro kreslení oblouku se doplní později, data ne. [R] (zapsáno v rozhodnutí)

24. **Napojení stěn je uložený vztah, ne shoda souřadnic.** Platí pro napojení konec–konec (roh, sdílený uzel) i konec–hostitel uprostřed jiné stěny (T napojení, šikmé napojení). Vztah nese hostitele a místo napojení (IFC: IfcRelConnectsPathElements s typem ATSTART / ATEND / ATPATH). Při posunu nebo odsazení hostitele se navazující stěny natahují podle vztahu, ne podle toho, co se právě trefí na souřadnici. Prototyp to hádal z geometrie, v modelu to musí být uložené od první stěny. [R podle části 7] (zapsáno v rozhodnutí)

## Část 1 – Kreslení stěny (nástroj Stěna)

Rozhodnuto:
- **[R] Strana tloušťky: doleva od směru kreslení.** Referenční čára = vnitřní líc; při obkreslení místnosti po směru hodin jde tloušťka ven. Mezerník stranu přehodí (jako Archicad/Revit); **mezerník přehazuje stranu i u vybrané, už nakreslené stěny**.
- **[R] Úhel v trackeru se zadává vůči předchozí stěně** (90° = pravý úhel). U první stěny řetězu se úhel bere od osy X. V prototypu: 90° zatáčka doprava, 270° doleva [R, potvrzeno].
- **[R] Oblouk: data ho umí od začátku (základ 23), kreslení oblouku až po přímých stěnách.**

Navrženo (já), platí, dokud nepadne námitka:
1. Nástroj Stěna: typ a výška z panelu vlastností; výška může být vázaná na podlaží (základ 12).
2. První klik = počátek. U kurzoru tracker s délkou a úhlem.
3. Každý další klik ukončí stěnu a začne další na jejím konci (řetěz).
4. Číslo stačí začít psát (jako NumPad ze zaměřování), jde do délky. Tab přepne na úhel, Enter potvrdí stěnu a pokračuje se další.
5. Klik na první bod obrys uzavře. Řetěz ukončí Esc, dvojklik nebo pravé tlačítko. Backspace vrátí poslední stěnu.

## Část 2 – Přichytávání

Rozhodnuto:
- **[R] Úhlové kroky myší: 0° a 90° vůči předchozí stěně + 45°.** Pravý úhel a kosý roh se přichytí samy, ostatní úhly volně. Shift drží jen 0/90°.
- **[R] Délka bez přichycení se při kreslení myší zaokrouhluje na 10 mm.** Zadané číslo je vždy přesné.
- **[R] Pomocné značky jsou světle modré:** značky přichycení, pomocné čáry, čtverečky uzlů, dočasné kóty, zámky a kolečka u kót.

Navrženo (já), platí, dokud nepadne námitka:
1. Pořadí priorit při konfliktu: koncový bod stěny → průsečík → střed → líc stěny (kolmo nebo rovnoběžně) → volný bod.
2. Přichytává se k lícům a koncům existujících stěn. Osa se nabízí jen při střídání kandidátů.
3. Kandidát na přichycení se u kurzoru označí značkou s popiskem a pořadím (např. „konec 2/4“). **Kandidáty střídá klávesa C** (Tab je obsazený přepínáním pole délka/úhel v trackeru, zjištěno v prototypu). C má smysl jen tam, kde je kandidátů víc (u rohu, na líci).
4. Pomocné čáry: z uchycených bodů se vodorovně a svisle (a v úhlových krocích) táhne tečkovaná čára, na které se dá přichytit další bod.
5. Zadané číslo má vždy přednost před přichycením.
6. Mřížka není; jde zapnout v nastavení.
7. Přichytávání jde dočasně vypnout podržením Altu.
8. Přichytávání je jedna společná služba (základ 20) a počítá s přímými i obloukovými stěnami (základ 23).
9. Klávesy mají jít vždy do výkresu: výkres si fokus bere, když na něj najedeš myší.

## Část 3 – Dočasné kóty při výběru stěny

Rozhodnuto:
- **[R] Dočasné kóty se měří k lícům** (světlá vzdálenost mezi líci), odpovídá zaměřování a českým zvyklostem. Osa je dostupná přepnutím.
- **[R] Při změně čísla se navazující stěny natahují nebo zkracují** (viz část 7, odsazení): zachovají směr a změní délku, roh zůstane uzavřený.
- **[R] Dočasné kóty jsou světle modré. Číslo kóty je bez rámečku a vypadá podle ČSN:** kótovací čára se šikmými čárkami, odkazové čáry, číslo nad čarou rovnoběžně s ní (čitelné zdola a zprava), v mm bez jednotky.
- **[R] Kótu lze po kliknutí posouvat tažením** (kótovací čára se odsouvá od měřeného místa, odkazové čáry ji doprovází). Klik na číslo (bez tažení) otevře úpravu hodnoty.

Navrženo (já), platí, dokud nepadne námitka:
1. Po výběru jedné stěny se zobrazí dočasné kóty. Příčně: vzdálenost k nejbližšímu líci nebo prvku na obou stranách. Podélně: délka stěny (líc).
2. Zobrazí se jen nejbližší kóta na každé straně, aby výkres nebyl zahlcený. Při výběru více prvků se nezobrazí žádná.
3. Po Enteru se posune vybraná stěna, druhý prvek zůstane na místě.
4. Změna podélné kóty posune ten konec stěny, který uživatel uchopil [R, 2026-11-23] (tažením uzlu / koncového čtverečku); přepínač trojúhelníkem u kóty zůstává jen pro zadání čísla do kóty. Navazující kolmá stěna jde s posouvaným koncem.
5. Kolečko u kóty z ní udělá trvalou kótu (část 4).
6. Změna proběhne jedním příkazem (základ 6), takže Undo ji vrátí celou.

## Část 4 – Trvalá kóta a zámek

Rozhodnuto:
- **[R] Při kolizi zámků (změna by porušila zamčenou kótu, nebo jsou dva zámky v rozporu) se změna odmítne a program vysvětlí proč.** Zámky se nikdy tiše nerozbijí. Zvýrazní se kóta, která brání, a nabídne se její odemknutí.
- **[R] Nová trvalá kóta vytvořená z dočasné je ve výchozím stavu odemknutá, zamkne se jedním klikem.** Zámek je vědomé rozhodnutí, aby se model nepřeurčil.
- **[R] Zámek je světle modrý. Trvalá kóta má vzhled podle ČSN (černá), stejně jako v části 3, a lze ji posouvat tažením.**

Navrženo (já), platí, dokud nepadne námitka:
1. Trvalá kóta je samostatný prvek modelu (vztah podle základu 1). Odkazuje se na líce a konce konkrétních stěn, ne na souřadnice (základ 4), takže přežije změnu tloušťky i posun. Pozice kótovací čáry (odsazení) je vlastnost kóty. Kóta patří podlaží a má skupinu anotací (základ 28).
2. Vzniká kolečkem u dočasné kóty nebo nástrojem Kóta (dva kliky na líce).
3. Zámek je vlastnost kóty, ne samostatný objekt. Zamčená kóta drží hodnotu při každé další změně modelu.
4. Odemčená kóta jen zobrazuje aktuální hodnotu. Změna čísla posune prvek jednou (jako dočasná kóta) a dál se nic nedrží.
5. Zámek je vidět malou ikonou u čísla. V pohledech a tisku zámek není, kóta se tam zobrazí podle stylu zobrazení.
6. Všechny zámky v projektu řeší jeden řešič na jednom místě (základ 7).
7. Stěny importované ze zaměřování zámky nemají. Zaměřené kóty se dají převést na trvalé jedním příkazem.

## Část 5 – Uzel a hrana (přímá manipulace + nabídka)

Rozhodnuto:
- **[R] Koncový bod (uzel) vybrané stěny: klik nebo tažení rovnou posouvá.** Žádná paleta před posunem. Pravé tlačítko na uzlu otevře nabídku: Odpojit roh, Smazat uzel.
- **[R] Odpojený konec se po přitažení k uzlu jiné stěny automaticky připojí.** Přitažení = pustit konec u cizího uzlu (v dosahu přichycení). Zobrazí se krátké potvrzení.
- **[R] Paleta se otevírá pravým tlačítkem, ne najetím ani levým klikem** (nahrazuje dřívější rozhodnutí „po kliknutí“).
- **[R] „Odsadit hranu“ posune celou stěnu, tloušťka zůstává** (jako Archicad). Tloušťka se mění v typu a vlastnostech (část 6).

Navrženo (já), platí, dokud nepadne námitka:
1. Stejně jako u uzlu: tažení líce vybrané stěny = odsazení hned, pravé tlačítko na líci = nabídka: Odsadit (s napsaným číslem), Přidat bod (rozdělí stěnu).
2. Při tažení uzlu platí přichytávání z části 2 a zobrazují se dočasné kóty z části 3.
3. Rozdělení stěny vytvoří dvě samostatné stěny, protože stěna je úsečka nebo oblouk (základ 23). Typ a výška se zdědí.
4. „Rozdělit stěnu“ se nabízí u hrany, ne u uzlu (u uzlu nedávalo smysl).
5. Zakřivení hrany (převod na oblouk) přijde spolu s kreslením oblouku (část 1). Zaoblení a zkosení rohu až později.
6. Každá akce je jeden příkaz (základ 6), takže Undo vrací jeden krok.

## Část 6 – Změna tloušťky a typu stěny

Rozhodnuto:
- **[R] Změna tloušťky jedné stěny (číslem nebo tažením): vznikne nový typ, nebo se přiřadí existující se stejnou tloušťkou.** Změní se jen tato stěna. Odpovídá importu ze zaměřování, kde se typy slučují podle tloušťky.
- **[R] Výchozí osazení okna nebo dveří v tloušťce stěny se vztahuje k vnitřnímu (referenčnímu) líci.** Při ztluštění stěny okno zůstane na stejném místě od zaměřované místnosti, hloubka ostění roste směrem ven.

Navrženo (já), platí, dokud nepadne námitka:
1. Referenční líc zůstává na místě (rozhodnuto v sekci 5), stěna se tloušťením rozšiřuje na stranu tloušťky, doleva od směru kreslení.
2. Napojené stěny v rozích se přepočítají podle priorit materiálů (základ 10): jádro na jádro, omítka obteče roh.
3. Přepnutí referenční čáry (osa, líc, líc jádra) stěnu nepohne: změní se jen vztažný bod, geometrie zůstane na místě.
4. Změna typu stěny na jiný s jinou tloušťkou funguje stejně jako změna tloušťky.
5. Ostění a značky otvorů se vždy přepočítají z modelu (základ 4). Mění se jen to, ke které ploše se osazení vztahuje.
6. Všechno je jeden příkaz (základ 6), takže Undo vrací jeden krok.

## Část 7 – Odsazení stěny a navazující stěny (z prototypu)

Rozhodnuto:
- **[R] Při odsazení stěny (tažením líce, příkazem Odsadit, nebo změnou příčné kóty) se natáhnou všechny stěny, které na ni navazují, a všechno ostatní zůstane na místě.** Platí pro navázání na konci (roh) i uprostřed (T napojení) i pro šikmé stěny. Navazující stěna zachová směr a změní délku.
- Vyžaduje uložené napojení stěn (základ 24).

## Další části (k probrání)
- Kreslení oblouku a zakřivení hrany (až po přímých stěnách).
- Pískoviště v repu BIM-light (etapa 0, viz `postup-etapy-bim-light.md`).
