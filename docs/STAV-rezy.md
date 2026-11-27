# BIM-light – stav: řezy, pohledy, výškové kóty a záložky pohledů

Rozděleno z `docs/STAV.md` 2026-11-27 (čisté přesunutí, souhlas uživatele, základ 33).

## Hotovo

### Výběr prvků v okně řezu, 2026-11-27 (pokyn uživatele; scéna `?ukazka=rezy`, Řez A)

- Jádro `section/pick.ts`: plochy prvků na výkrese řezu (řezané kusy, pohledové plochy, otvory) z téhož
  výpočtu jako kresba; `sectionPickAt` (bod → prvky, nejbližší první, otvor před svou stěnou) a
  `sectionPickBox` (zleva celé prvky, zprava i protnuté). Dotazy AI `section.pick` a `section.pickBox`.
  Testy `pick.test.ts`, krok v `ai/scenario-sections.test.ts`.
- Sandbox `ui/section/section-select.ts`: klik vybere stěnu / desku / okno (i za rovinou řezu, i z jiného
  podlaží), Shift přidá / ubere, klik do prázdna zruší, Esc zruší, Tab střídá překrývající se prvky,
  rámeček zleva / zprava, Ctrl+A, Del, filtr výběru (stěny, desky), předzvýraznění pod kurzorem, karta
  prvku (`section-card.ts`), pravé tlačítko = nabídka stěny / otvoru. Výběr je společný se všemi okny,
  info box ukazuje vybrané. Posun výkresu prostředním tlačítkem (dřív i levým do prázdna).
- E2E `rezy-vyber.spec.ts` (Studie i Projekt; klik, Shift, info box, Esc, rámeček, dvě okna, Del).

### Napojení desky na stěnu podle priority materiálů (uložení stropu), 2026-11-27 (krok schválený uživatelem)

- Jedno pravidlo v jádře `junction/slab-wall.ts` (základ 7) pro řez, 3D a výkazy: nosná deska s prioritou
  jádra ≥ priorita jádra stěny (ŽB 70 × zdivo 50) prořízne ve své výšce jádro stěny a vrstvy na straně desky
  (vnitřní omítku); vrstvy za vnějším lícem jádra (strana se zateplením – ETICS, vnější omítka) jdou přes
  čelo desky souvisle a desku samy ořízly (deska končí na vnějším líci jádra, Revit „k jádru“). Vnitřní
  nosná stěna s deskou po obou stranách: deska prořízne všechny vrstvy. Deska s nižší prioritou (dřevo na ŽB
  stěně) a podlaha (skladba podlahy) do stěny nezasahují – stěna je ořízne. Stejný materiál se v řezu slije.
- Řez: kusy vrstev stěny pod a nad deskou, deska končí na líci jádra. 3D: stejné výřezy ve stěnách i deskách
  (stávající řešení překryvů zůstává jen jako pojistka). Výkazy: objem vrstev stěny bez uložených stropů,
  objem nosné desky bez pásu zateplení (nic se nezapočítá dvakrát).
- Dotaz `section.elements` vrací u řezaných prvků `pieces` (kusy po vrstvách s materiálem a rozsahem) – AI
  i test vidí uložení. Ukázka: Řez A v `?ukazka=rezy` / `dum` – strop nad 1.NP uložený na obvodových
  stěnách, zateplení přes čelo. Testy `junction/slab-wall.test.ts`, 3D `view3d/slab-wall-3d.test.ts`,
  AI krok, e2e `rezy-ulozeni.spec.ts`.

### Oprava: přepnutí stylu u otevřeného řezu, 2026-11-27 (hlášení uživatele)

- Co se dělo: přepínač sady nahoře (Studie / Projekt) vždy otevřel pracovní okno podlaží – u otevřeného řezu
  tak okno přeskočilo na půdorys („výkres zmizel“). Řez měl a má vlastní styl (ukázka ho zakládá ve stylu
  Projekt); přepínač nahoře ale ukazoval a měnil styl pracovního okna podlaží, ne řezu – proto „pořád Projekt“.
- Oprava: když okno ukazuje řez, přepínač sady změní styl řezu (`section.update`) a okno zůstane na řezu;
  u výkazu se okno také nepřepne. Stav přepínače ukazuje styl řezu („řez: Řez A · styl: Studie“). Výběr
  stylu v záhlaví okna řezu dělá totéž. E2E `rezy-styl.spec.ts` (oba přepínače, Studie bez šraf, Projekt
  se šrafami, okno zůstane na řezu).

### Výšková kóta jedním klikem, 2026-11-27 (hlášení uživatele: výšková kóta v řezu nejde vložit)

- Co v řezu nefungovalo: kóta šla vložit jen dvěma kliky a první klik se musel trefit do 8 px od hrany nebo
  úrovně. Klik do plochy stropu / stěny (jak uživatel kliká) neudělal nic a nic nehlásil; po kliku na hranu
  se jen čekalo na druhý klik. E2E `vyskove-koty` klikal přesně na souřadnici hrany spočítanou z modelu
  a dvakrát podle návrhu, proto to nezachytil – nově je v něm klik doprostřed stropu.
- Nově **jeden klik** (pokyn uživatele): v řezu klik na hranu / úroveň (do 12 px) nebo do plochy prvku (jeho
  bližší hrana, `levelTargetPick` v jádře) hned vloží praporek hrotem na hranu v místě kliku; mimo prvky
  hláška. V půdorysu klik na podlahu / desku hned vloží rámeček s hodnotou na místo kliku; kóta terénu
  klik na roh – text šikmo ven od budovy (výchozí odsazení 12 mm na papíře), pak jde táhnout.
- Volba nástroje **S odkazovou čarou** (vypnutá, Revit „Leader“): v půdorysu druhý klik určí polohu
  hodnoty, rámeček mimo bod má odkazovou čáru od bodu. Tažení hodnoty s odkazovou čarou nechá bod na místě.

### Kóta v okně řezu, 2026-11-27 (hlášení uživatele: „Nejde mi nijak vložit kóta do výkresu.“)

- Co nefungovalo: od chvíle, kdy se řez otevírá v pracovním okně, šlo v okně řezu vložit jen výškovou kótu;
  **nástroj Kóta tam nedělal nic** (klik jen posunul výkres). V půdorysu kóty fungovaly (ověřeno lokálně
  i na webu b10bb33, Studie i Projekt, prázdný výkres i ukázky). E2E kótovaly jen v půdorysu.
- Nově: **délková kóta v řezu** (`section-dim/`, migrace 35 → 36) – svislá mezi úrovněmi (podlaží, horní /
  spodní hrana stěny nebo desky, terén), vodorovná mezi boky prvků na výkrese; asociativní (po změně modelu
  se přepočítá), kresba jako kóta ČSN (čára, šikmé čárky, odkazové čáry, číslo v mm, svislá natočená),
  pero z grafiky kategorie kót, skupina anotací Řezy a pohledy, zámek. Příkazy `sectionDim.create / update`,
  mazání `levelDim.delete` / `selection.delete`, dotazy `sectionDim.list`, `sectionDim.sides`; AI krok.
- Sandbox: nástroj **Kóta** v okně řezu – klik na úroveň nebo bok prvku, druhý klik na další (stejného
  směru), třetí klik umístí kótovací čáru; přichytí se do 8 px. Výběr klikem na čáru, tažení posune, Del
  smaže, Esc ukončí nástroj. Opraven i úklid výběru (kóty v řezu se po příkazu ztrácely z výběru).
  E2E `koty-rez.spec.ts` (Studie i Projekt).

### Oprava: výškové kóty po přepnutí Studie → Projekt, úrovně podlaží podle Arditu, 2026-11-27 (hlášení uživatele)

- Co se měnilo: v **půdorysu** výškové kóty po přepnutí stylu **zmizely** – nová kóta šla do aktivní skupiny
  anotací pohledu („Kóty a popisky – studie“), kterou styl Projekt skrývá. V řezu se neměnilo nic (skupina
  „Řezy a pohledy“ je ve všech stylech). Velikost, poloha, hodnota ani pero se neměnily.
- Oprava: nová skupina anotací **Výškové kóty** (stálé id `ann-levels`) viditelná ve všech stylech; nové
  výškové kóty v řezu i v půdorysu jdou do ní, migrace 34 → 35 do ní přesune i stávající. Test
  `level-dim/style-switch.test.ts` („katalog-pohledy 26/29: …“).
- Úrovně podlaží v řezu podle Arditu: tenká čárkovaná čára přes celý řez, vlevo mimo budovu malý prázdný
  praporek hrotem na čáře a nad ním drobný text „2.NP +3,000“ (název a výška na jednom řádku); kóta
  nejvyššího bodu také vlevo. Text výškových kót je drobný – `paperSizes.levelText` 1,8 mm (jako popis
  místnosti), i u kót v půdorysu.

### Záložky pohledů v záhlaví okna, 2026-11-27 (pokyn uživatele, princip Arditu)

- Každé otevření pohledu (podlaží, uložený pohled, řez, fasáda, výkaz / výpis, 3D) z Obsahu, dvojklikem na
  značku řezu, z info boxu nebo výběrem v záhlaví přidá do okna záložku a přepne se na ni; už otevřený
  pohled se jen přepne (bez duplicit). Klik na záložku přepne okno, × zavře (aktivní → sousední vpravo,
  jinak vlevo; poslední záložka × nemá). Ikona podle druhu (půdorys, řez, pohled, výkaz, 3D), název
  („1.NP“, „Řez A“, „Výkaz stěn“). Záložky se zúží (název „…“), pak lišta posouvá.
- Ve dvou oknech má každé okno své záložky. 3D okno převezme záložky okna, které nahradilo; záložka
  půdorysu / řezu / výkazu v 3D okně vrátí na jeho místo pracovní okno se stejnými záložkami.
- **Výkazy se otevírají do okna** (záložka), ne jako dialog: záhlaví s názvem, Export CSV, Smazat výkaz,
  pod ním tabulka a nastavení. Smazaný výkaz / řez záložku zavře.
- Stav obrazovky (`WindowState.tabs`, `session/tabs.ts`), bez příkazu jádra a migrace, po obnovení stránky
  se nepamatuje. E2E `zalozky.spec.ts`.

### Výšková kóta v půdorysu, 2026-11-27 (pokyn uživatele; v půdorysu 1.NP `?ukazka=rezy` / `dum`)

- Jádro (`level-dim/plan.ts`, migrace 33 → 34): anotace podlaží se skupinou anotací (aktivní skupina
  pohledu) a zámkem, asociativní – v bodě bere horní líc nejvyšší desky / podlahy pod ním, jinak úroveň
  podlaží; zápis ±0,000 / +0,150 / -0,450 (absolutní „m n. m.“). Značka **rámeček** (hodnota v obdélníku
  tenkou čarou, jako Ardit) nebo **kóta terénu u nároží** (kroužek s plnou polovinou a čtvercem bodu,
  odkazová čára k poličce, nad ní „RT=-0,200“ rostlý terén, pod ní „UT=-0,150“ upravený terén; hodnoty
  zadané číslem, navázaná na roh stěny – posune se s ním; popisky a co se kreslí ve stylu
  `style.setTerrainLabels`). V řezu jde kóta terénu (`ref: terrain`, číslo) s plným trojúhelníkem. Velikost písma a kroužku z `display.paperSizes`, pero
  a barva z grafiky kategorie kót. Smazaná deska vezme své kóty.
- Příkazy `planLevelDim.create / move / update`, mazání `levelDim.delete` / `selection.delete`; dotaz
  `planLevelDim.list`; AI krok v `scenario-sections`.
- Sandbox: nástroj **Výšková kóta** funguje v půdorysu (klik na bod, druhý klik = poloha hodnoty) i v okně
  řezu. Výběr klikem, tažení (u kroužku tažení hodnoty posune jen hodnotu), Del. Info box: hodnota,
  co kótuje / RT a UT, značka (rámeček / kóta terénu), absolutní, zámek. E2E `vyskove-koty-pudorys.spec.ts`.

### Výškové kóty v řezech a pohledech (ČSN 01 3420), 2026-11-27 (scéna `?ukazka=rezy`, Řez A i v `?ukazka=dum`)

- Jádro `level-dim/`: praporek podle ČSN 01 3420 – rovnoramenný pravoúhlý trojúhelník (vrchol 90°) hrotem na
  kótované úrovni, vodorovné raménko na úrovni (širší než trojúhelník), text nad trojúhelníkem (praporek pod
  hranou: pod ním). Zápis ±0,000 / +2,750 / -0,450 (metry, 3 místa, čárka, bez „m“); absolutní kóta
  „250,850 m n. m.“ z georeference, `zeroToBpv` = „±0,000 = 250,850 m n. m. Bpv“ (pro razítko). Relativní
  kóta nevyplněná, absolutní plná; styl může vyplňovat vždy (`style.setLevelMarkFill`, vzor Arditu).
  Velikost trojúhelníku `display.paperSizes.levelMark` (2,5 mm), pero a barva z grafiky kategorie kót.
- Kóta je anotace řezu, asociativní: odkazuje na úroveň podlaží nebo horní / spodní hranu stěny či desky
  (ne na souřadnici) – po změně výšky se přepočítá. Skupina anotací (výchozí Řezy a pohledy) a zámek
  (zamčenou nejde posunout ani změnit). Smazaný prvek / řez vezme své kóty. Migrace 32 → 33.
- Příkazy `levelDim.create / move / update / delete`, `selection.delete` s `levelDimIds`; dotazy
  `levelDim.list` (hodnota a text z modelu) a `levelDim.targets` (kam jde kótu dát). AI krok
  v `scenario-sections`. Automatické kóty úrovní podlaží v řezu jsou teď stejné praporky.
- Sandbox: nástroj **Výšková kóta** v paletě (anotace). V okně řezu: klik na hranu prvku nebo úroveň
  podlaží (přichytí do 8 px, čárkovaná modrá úroveň), druhý klik umístí praporek (myš pod hranou = praporek
  pod ní). Výběr klikem (Shift přidá), tažení posune, Del smaže, Esc ukončí nástroj. Info box: hodnota,
  co kótuje, absolutní, pod hranou, zámek. E2E `vyskove-koty.spec.ts`. Ve fasádách funguje stejně.

### Řez a pohled v pracovním okně, 2026-11-27 (pokyn uživatele; scéna `?ukazka=rezy`)

- Řez i pohled (fasáda) se otevírají jako pohled v okně, ve kterém se pracuje, místo půdorysu (jako 3D
  pohled): z Obsahu → Projekt (Řezy, Pohledy), dvojklikem na značku řezu a tlačítkem „Otevřít řez“ v info
  boxu. Podlaží z Obsahu vrátí do okna půdorys. Aktivní okno má rámeček, v Obsahu je zvýrazněný řez.
  Ve dvou oknech: řez v aktivním okně, druhé okno zůstane půdorysem (a naopak).
- Záhlaví okna řezu: výběr řezu / pohledu, styl a měřítko (příkaz `section.update`); štítek „Řez · Řez A ·
  1:100“. Kolečko přiblíží, tažení posune. Dialog okna řezu je zrušený. Okno si drží jen odkaz na řez
  (`WindowState.sectionId`, `session/section-windows.ts`). E2E `rezy.spec.ts` (Obsah, dvě okna, styl
  a měřítko), `rezy-nastroj.spec.ts` (dvojklik).

### Nástroj Řez a info box řezu (podle Arditu), 2026-11-27 (scéna `?ukazka=rezy`, zalomený Řez C i v `?ukazka=dum`)

- Jádro (migrace 31 → 32): čára řezu je seznam bodů – **zalomený řez** (úseky rovnoběžné s prvním řežou
  každý ve své hloubce, kolmé jsou zalomení); **vzdálená oblast od** (`farClip`, prvky dál tence šedě –
  grafika `display.farArea`, patro 4 funkce grafiky); **styly řezu** (`model.sectionPresets`, výchozí
  „Řez – celá hloubka“ a „Řez – 6 m, vzdálená oblast od 3 m“); skupina anotací **Řezy a pohledy** (stálé
  id, viditelná ve všech stylech) jako výchozí vrstva značky. Příkazy `section.move`,
  `sectionPreset.create / update / delete`, `selection.delete` umí `sectionIds`; dotaz `sectionPreset.list`.
- Sandbox: nástroj **Řez** v paletě – rovný řez: klik začátek, konec, klik na stranu pohledu (šipky jdou
  za myší); zalomený: kliky po úsecích (srovnají se kolmo / rovnoběžně), Enter / dvojklik / pravé tlačítko
  ukončí, pak strana. Info box „Výchozí nastavení nových prvků“: Instance / Styl, styl řezu („– bez
  stylu –“), Vrstva, Geometrická metoda (rovný / zalomený), Řez: Hloubka (prázdné = neomezená), Vzdálená
  oblast od (prázdné = vyp.); se stylem jsou hodnoty jen ke čtení, záložka Styl je upravuje.
- Výběr značky nástrojem Výběr: klik na čáru (Shift přidá), tažení posune celý řez, úchyty na koncích,
  dvojklik otevře okno řezu, Del smaže. Info box vybraného řezu: název, vrstva, hloubka, vzdálená oblast,
  měřítko, Otočit směr, Otevřít řez, Smazat. E2E `rezy-nastroj.spec.ts`, AI krok v `scenario-sections`.

### Řezy a pohledy z modelu – jádro a kresba, 2026-11-27 (scéna `?ukazka=rezy`, řezy A, B a 4 pohledy i v `?ukazka=dum`)

- Jádro `section/`: řez i pohled (fasáda) je druh pohledu v projektu (`model.sections`, migrace 30 → 31):
  druh, název, označení (A, B… / 1–4), čára start–end v půdorysu, směr pohledu (doleva / doprava), hloubka
  (výchozí 15 m, pohled bez omezení), rozsah výšky, měřítko, styl, místní úpravy, filtr rekonstrukce, přepisy
  prvků, skupina anotací značky. Pro 3D okno rovina řezu `cutPlane3d` (dotaz `section.list`).
- Příkazy `section.create / update / rename / delete`, `elevation.create` (4 pohledy kolem obálky, název
  podle světové strany s natočením k severu); dotazy `section.list`, `section.elements` (co řez protíná:
  rozsah u / z a materiály; co je vidět za rovinou a jak daleko). AI `ai/scenario-sections.test.ts`.
- Kresba řezu (`drawSection`, jen primitiva): stěny přímé i oblouk a desky proříznuté po vrstvách – výplň a
  šrafa materiálu přes funkci grafiky (i izolace pásem), obrys perem řezu sjednocený přes stejný materiál
  (stěna + strop z betonu bez čáry), hranice vrstev, jemná = hranice jádra; otvory (parapet, nadpraží, nika
  do své hloubky); za rovinou do hloubky pohledu pohledové hrany perem pohledu se zakrytím bližšími prvky.
  Tři podrobnosti, filtr rekonstrukce, vrstvy. Úrovně podlaží čerchovaně s názvem a výškové kóty (±0,000,
  +3,000) + kóta nejvyššího bodu. Pohled (fasáda) = jen pohledové hrany.
- Značka řezu v půdorysu (`section/mark.ts`): tlusté konce, tenká čerchovaná čára, šipky směru, písmeno;
  skupina anotací (základ 28), pera z grafiky kategorie Značky, velikosti od výšky popisu.
- Přesun do jádra beze změny chování: `drawCutLines` (čáry řezu stěn), `materialHatch`, `openingFootprint`.
- Sandbox: Obsah → Projekt → skupiny **Řezy** a **Pohledy**, klik otevře okno s kresbou (kolečko přiblíží,
  tažení posune, Esc zavře); kresba se přepočítá po každé změně modelu. E2E `rezy.spec.ts`.

## Rozhodl Code (k potvrzení)

- **Uložení stropu:** vnější strana stěny = strana s vrstvou funkce „izolace“; bez izolace rozhodne, nad
  kterými vrstvami deska z větší části neleží (obě strany zakryté = vnitřní stěna, žádná vnější strana).
  Při stejné prioritě vyhrává deska. Vazba vršku stěny na spodní líc desky (D4) zůstává beze změny – celá
  stěna končí pod deskou (pro příčky); obvodová nosná stěna se nechává do výšky podlaží a deska se do ní
  uloží podle priority (Archicad: stěna k desce + priorita – zateplení přes čelo u vázané stěny zatím ne).
  Půdorys: deska v rovině řezu půdorysu se kreslí dál jen obrysem (uložení v půdorysu zatím ne). Otvor
  v desce u stěny se respektuje (výřez jen tam, kde deska je).

- **Výšková kóta jedním klikem:** volba „S odkazovou čarou“ platí v půdorysu (rámeček); v řezu je praporek
  vždy hrotem na hraně (poloha a „pod hranou“ se mění tažením). Klik do plochy prvku bere bližší z jeho
  horní a spodní hrany; úroveň podlaží jen do 12 px. Výchozí text kóty terénu je šikmo ven podle středu
  obálky modelu (u L-půdorysu může mířit dovnitř – pak ho stačí táhnout).

- **Kóta v řezu:** jen svislé a vodorovné kóty (ne šikmé); vodorovná kótuje okraje prvku tak, jak je řez
  vidí (řezaný prvek má přednost před prvkem v pohledu); řetězová kóta a kóta otvoru v řezu zatím ne.
  Skupina anotací Řezy a pohledy (vidět ve všech stylech). Hodnota v mm bez jednotky jako v půdorysu.

- **Výškové kóty a styly:** výškové kóty mají vlastní skupinu anotací viditelnou ve Studii i v Projektu
  (výška je údaj modelu); délkové kóty dál patří skupině stylu, ve kterém vznikly (Studie / DSP). Skupinu
  jde u kóty změnit. Trojúhelník praporku zůstal 2,5 mm (spodní mez ČSN 01 3420), text 1,8 mm; Ardit má
  praporek možná menší – lze změnit v `paperSizes.levelMark`. Kóta terénu u úrovní podlaží v řezu se
  automaticky nekreslí (terén není v modelu); jde vložit ručně (`ref: terrain`).

- **Záložky pohledů:** zavření aktivní záložky přepne na sousední vpravo, jinak vlevo (jako prohlížeče
  a Revit); poslední záložka okna se zavřít nedá (okno nesmí být prázdné). Pracovní okno podlaží má
  v záložce název podlaží („1.NP“), uložený pohled svůj název. Lišta záložek je samostatný řádek nad
  záhlavím okna (výběr pohledu, styl, měřítko zůstaly v záhlaví). Výkaz v okně nemá posun a přiblížení.

- **Výšková kóta v půdorysu:** kroužek = kóta terénu u nároží RT / UT (upřesnil uživatel). Na roh stěny se
  naváže, když je bod do 100 mm od rohu líce stěny; smazaná stěna = kóta zůstane na posledním bodě. Kóta
  rámečku odkazuje
  na desku, která byla pod bodem při vložení – posun kóty desku nemění. Rámeček má velikost podle odhadu
  šířky textu (jádro písmo nezná). Bez nové položky velikostí: text = výška popisu, kroužek = `levelMark`.
- **Výškové kóty v řezu:** relativní kóta má prázdný trojúhelník (rozhodl uživatel 2026-11-27, ČSN 01 3420);
  přepínač stylu `style.setLevelMarkFill` (vždy plné jako Ardit) zůstal jen jako volba přes příkaz. Kóta patří řezu (ne podlaží jako kóty
  v půdorysu) – v jiném řezu by měla jinou polohu. Kótovat jde úroveň podlaží a horní / spodní hranu stěny
  nebo desky (hrany vrstev desky, parapety a terén zatím ne). Hrana prvku má při přichycení přednost před
  úrovní podlaží ve stejné výšce. Text praporku je nad trojúhelníkem uprostřed (screenshot Arditu), raménko
  1,6 × výška trojúhelníku na každou stranu. Automatické kóty podlaží zůstávají spočítané (nejsou data).

- **Řez v okně:** styl a měřítko řezu jsou v záhlaví okna řezu (spodní lišta dál patří půdorysu, protože
  nástroje kreslí do půdorysu). Výběr prvků v řezu funguje jako v půdorysu (pokyn uživatele 2026-11-27,
  staré „klik jen aktivuje okno“ zrušeno); kreslicí nástroje dál pracují s půdorysem okna (Revit dovoluje kreslit i v řezu – přijde s 2D kresbou).
  Řez otevřený přes 3D okno nahradí 3D okno půdorysem s řezem na stejném místě (stejně jako podlaží).

- **Nástroj Řez (podle Arditu):** výchozí hloubka nového řezu je teď **neomezená** (prázdné pole jako
  v Arditu; dřív 15 m) a výchozí vrstva značky je nová skupina anotací „Řezy a pohledy“ (dřív „Kresba 2D“).
  Strana pohledu třetím klikem (Archicad; Revit dává směr hned a otáčí se šipkami – to umí „Otočit směr“).
  Zalomení jen kolmá, první a poslední úsek řeže (Revit); hloubka se měří od roviny každého úseku.
  Vzdálená oblast = celý prvek, jehož nejbližší bod je dál než hranice (Archicad dělí i prvek); grafika
  tenké pero + šedá z nastavení zobrazení, přebije styl i pravidla, přepis prvku ji může změnit. Styl
  řezu přebije hloubku a vzdálenou oblast instance (pole jsou pak jen ke čtení); smazaný styl nechá
  hodnoty v řezech. Ardit „Styl“ chápu jako pojmenovanou předvolbu řezu (ne styl zobrazení). Metoda
  vybraného řezu je jen ke čtení (změna rovný ↔ zalomený = nový řez). Dvojklik se pozná podle času dvou
  stisků (400 ms). Vrstva nabízí jen skupiny anotací (značka je anotace, základ 28).
- **Řezy a pohledy:** řez i pohled jsou jeden druh dat (`kind`), jako Revit Section / Elevation. Směr pohledu
  = doleva / doprava od čáry start → end (výchozí doleva); na výkrese je vpravo pravá ruka pozorovatele.
  Hloubka pohledu bez omezení (viz Nástroj Řez); výchozí styl = styl prvního půdorysu, měřítko 1:100.
  Šířka výkresu = délka čáry (Revit ořízne pohled šířkou čáry). Vícepásové typy stěn se v řezu kreslí
  celou výškou podle vrstev pásu v rovině řezu (jako 3D). Pohledové hrany: obrys části prvku v pásmu pohledu
  (stěna = šířka × výška minus otvory, deska = šířka × tloušťka), zakrytí podle nejbližšího bodu prvku;
  hrany splývající s hranou bližšího prvku zůstanou. Deska v řezu má šrafu materiálu (výchozí grafika
  kategorie Desky, migrace ji doplní; půdorys desky šrafu dál nekreslí). Úrovně podlaží: čerchovaná čára,
  název vlevo, výšková kóta vpravo (trojúhelník hrotem na čáře, metry na 3 místa). Značka řezu se kreslí
  v půdorysech podlaží, která řez protíná (bez rozsahu ve všech), ve skupině anotací viditelné ve všech
  stylech (výchozí „Kresba 2D“), aby byla vidět ve Studii i v Projektu (Revit: značka ve všech půdorysech).
  Velikosti značky jsou násobky výšky popisu (bez nové položky velikostí na papíře). Pohledy (fasády)
  značku v půdorysu nemají (české výkresy je nekreslí). Názvy pohledů podle strany, kam fasáda hledí
  (Pohled jižní…), označení 1–4. Okno řezu je zatím dialog nad výkresem jako okno výkazu.
