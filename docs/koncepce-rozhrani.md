# BIM-light – koncepce grafického rozhraní

Stav: **potvrzeno uživatelem 2026-11-25** (sepsal Claude Code podle rozhovoru a screenshotů aplikace
Ardit Designer). Rozšiřuje sekci 10 „Ovládání (UI)“ v `rozhodnuti-platforma-ui-vystupy.md`; rozhodnutí
k dřívějším rozporům jsou v části 11.

## 0. Výchozí rozhodnutí uživatele

- Koncept ovládání se přebírá **podle principu aplikace Ardit Designer** (rozložení okna, info box,
  paleta nástrojů, lišta příkazů, Obsah projektu, spodní lišta zobrazení). Časem se může upravit.
- Přebírá se **princip, ne kopie**: vlastní ikony, vlastní vzhled, vlastní názvy; žádná značka, logo
  ani grafika Arditu. Ne všechny funkce budou stejné.
- **U každé nové funkce s rozhraním** si Claude Code vyžádá screenshot, jak to vypadá v Arditu,
  a společně se rozhodne „stejně / jinak“. Rozhodnutí se zapíše sem (část 10) nebo do katalogu funkce.
- **Tmavá i světlá verze** rozhraní, vlastní sada ikon.

## 1. Zásady

1. **Vše z registru** (základy 6, 15): tlačítko, položka nabídky, zkratka, bublina a hledání berou název,
   popis, ikonu a zkratku z registru příkazů. Žádné tlačítko nemění model jinak než příkazem.
2. **Výkres má přednost**: co nejvíc místa pro okna, ovládací prvky v úzkých lištách po okrajích.
3. **Jedno místo pro nastavení**: co se týká nástroje nebo vybraného prvku, je v info boxu; co se týká
   zobrazení okna, je ve spodní liště; co se týká projektu jako celku, je v Obsahu vpravo.
4. **Klávesnice první**: každý nástroj má zkratku, čísla se píšou rovnou do trackeru u kurzoru,
   Ctrl+K najde jakýkoli příkaz. Klávesy jdou vždy do výkresu, výkres si bere fokus při najetí myší.
5. **Pomocné značky jsou světle modré** (přichycení, pomocné čáry, uzly, dočasné kóty, zámky) v obou
   motivech.
6. **Nápověda na místě**: bublina u každé ikony (název, zkratka, jedna věta), ikona (i) u sekce info
   boxu, nápověda „co dělat dál“ u kurzoru / ve stavovém řádku, později průvodce prostředím.
7. **Česky** (angličtina později); všechny texty rozhraní z jednoho místa.

## 2. Rozložení okna

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ A  Název projektu │ Studie Projekt Elektro │ ↶ ↷ │ Nový Otevřít Uložit · Uloženo │ IFC │ ☾ ⛶ ? │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ B  🔍 │ přesunout otočit zrcadlit kopírovat pole │ zarovnat do rohu rozdělit spojit │ … zámek │
├──┬────────────┬───────────────────────────────┬───────────────────────────┬────────────┬──┤
│C │ D  Info box│ E  Okno: 1.NP          1:100 ▾│ E  Okno: další pohled     │ F  Obsah   │F'│
│  │  nástroj / │  ┌─────────────────────────┐  │                           │  Projekt   │  │
│▣ │  vybraný   │  │                         │  │                           │  Pohledy … │▤ │
│▭ │  prvek     │  │        výkres           │  │                           │  podlaží   │▦ │
│◫ │            │  │                         │  │                           │  pohledy   │◧ │
│∠ │  sekce (i) │  └─────────────────────────┘  │                           │  výkazy    │  │
│  │            │                               │                           │  nastavení │  │
├──┴────────────┴───────────────────────────────┴───────────────────────────┴────────────┴──┤
│ G  zoom │ okna │ podlaží pod │ přichytávání │ mřížka │ vrstvy │ pera │ styl │ fáze │ skladba │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### A – Horní lišta aplikace
- Vlevo název programu a projektu; přepínač **sad** Studie / Projekt / Elektro (část 4: překreslí
  pracovní okno a filtruje Obsah), vedle později přepínač variant.
- Zpět / Znovu (s historií v bublině), Nový projekt, Otevřít, Uložit a stav („Uloženo“ / „Neuloženo“),
  export IFC.
- Vpravo: motiv (světlý / tmavý / podle systému), celá obrazovka, nápověda a průvodce, jazyk (později).

### B – Lišta příkazů
- Úpravy, které nezávisí na aktivním nástroji a pracují s výběrem: přesunout, otočit, zrcadlit,
  kopírovat, pole, zarovnat, do rohu, rozdělit, spojit, zakřivit / vyrovnat, odsadit, měřit, zamknout /
  odemknout, skupina.
- Vlevo **lupa = Najít a vybrat** (podle vzoru, jako Archicad; uživatel 2026-11-25): panel s kritérii –
  typ prvku (čipy), rozsah (aktuální / všechna podlaží), typ stěny, materiál, ID a název obsahuje,
  oblouková stěna, rozsahy tloušťky, výšky a šířky otvoru; „Nalezeno N prvků“, + Vybrat / − Odebrat /
  Nahradit výběr / Vymazat. Stejný dotaz jádra (`element.find`) má AI. Později uložené sady kritérií
  (součást projektu i IFC).
- **Hledání příkazů (Ctrl+K)** zůstává jako samostatná klávesová paleta (krok UI5); tam se později bude
  zadávat i požadavek pro AI.
- Příkazy v logických skupinách oddělených čárou; varianty pod malou šipkou (např. zarovnat ▾).
- Nedostupný příkaz (nic vybráno, nevhodný prvek) je zašedlý, bublina řekne proč.

### C – Paleta nástrojů (svislá, vlevo)
- Nahoře **Výběr** (Esc) a výběr rámečkem.
- Skupina **modelování**: stěna, otvor, (později) deska, střecha, okno, dveře, schodiště, místnost…
- Skupina **anotace**: kóta, úhel, výšková kóta, text, popisek.
- Skupina **2D kresba**: čára, oblouk, křivka, šrafa, bod (základ 22).
- Jen ikony; bublina = název + zkratka; nástroj s variantami má v rohu trojúhelník. **Podržení myši,
  dvojklik nebo pravé tlačítko** na nástroji otevře rychlý výběr (u Stěny seznam typů stěn; vybraný typ
  se nastaví a nástroj se zapne). Aktivní nástroj zvýrazněný. (uživatel, 2026-11-25)

### D – Info box (vlevo vedle palety)
- **Bez výběru**: nastavení aktivního nástroje (u stěny typ, referenční čára, strana, výška; u otvoru
  rozměry a druh).
- **S výběrem**: vlastnosti vybraných prvků (stejné pole pro více prvků, rozdílné hodnoty „různé“).
- Generuje se z popisu parametrů (základ 15b), po sekcích; sekce jdou sbalit, u sekce (i) s vysvětlivkou.
- Nahoře název nástroje / prvku a stručný stav („nic nevybráno“, „3 stěny“).
- **Geometrická metoda** nástroje jako řada ikon (u výběru: rámeček / kosodélník / polygon; u stěny:
  jedna stěna / řetěz / obdélník / oblouk; později natočený obdélník a oblouk středem).
- **Druh úseku (úsečka / tečný oblouk / oblouk bodem) jen u řetězu** – volí se v plovoucí nabídce u kurzoru
  po prvním kliku (I), ne v info boxu; u jedné stěny, obdélníku ani oblouku nedává smysl. (uživatel,
  2026-11-25)
- **Referenční čára** (uživatel, 2026-11-25): tři ikony **vně / uprostřed / uvnitř** a tlačítko převrácení
  strany stěny kolem referenční čáry.
- **Překlopení přímo ve výkresu: malá dvojitá šipka** u vybraného prvku (u stěny před referenčním lícem);
  klik prvek převrátí. Stejné šipky později u dveří (strana otevírání) a dalších prvků, které to umožní.
  (uživatel, 2026-11-25 – místo „sluníčka“ ze vzoru)
- Info box nahoře přepínač **Instance / Typ**: Instance = vlastnosti prvku (nebo výchozí nastavení nových
  prvků u nástroje), Typ = úprava typu (skladby), která platí pro všechny prvky typu.
- Typ prvku: rozbalovací seznam s miniaturou skladby a hledáním (sekce 18).

### E – Okna (pohledy)
- Jedno nebo víc oken vedle sebe (půdorys, později řez, pohled, 3D, výkres). **Aktivní okno** má
  zvýrazněný rámeček; info box, spodní lišta a Obsah se vztahují k němu.
- Hlavička okna: záložka s názvem pohledu, vpravo měřítko, mřížka, posun ruky, přizpůsobit vše, maximalizovat.
- V levém horním rohu výkresu štítek pohledu („Půdorys · 1.NP (±0)“).
- Rozvržení oken (1 / 2 vedle sebe / 2 nad sebou…) se volí ve spodní liště.

### F – Obsah projektu (vpravo) a F' lišta sekcí
- **Obsah** se záložkami Projekt / Pohledy / Výkresy / Export a hledáním (část 4). Projekt: podlaží
  (s úrovní), situace, řezy, pohledy, 3D, výpisy – otevře pracovní okno. Pohledy: uložené pohledy aktuální
  sady s měřítkem, „+ Uložit pohled“ – otevře uložený pohled (okno to ukáže štítkem). Vpravo nahoře tlačítko
  Organizátor (etapa 7).
- Pod seznamem **nastavení vybrané položky**: u podlaží název, úroveň, výška, + nad / + pod, smazat; u pohledu
  název, zdroj, kombinace vrstev (styl), měřítko, řezná rovina, fáze, varianta, přiblížení, složka,
  „Načíst nastavení aktuálního okna“, smazat pohled.
- **F' svislá lišta ikon** úplně vpravo přepíná sekce panelu: Obsah, Vrstvy, Typy stěn (skladby),
  Materiály, Šrafy, Styly, Podlaží, později Organizátor výkresů. Panel jde skrýt (více místa pro okna).

### G – Spodní lišta zobrazení
Podle screenshotů vzoru (2026-11-25). Platí pro **aktivní okno**; každá položka s › má rozbalovací volby,
bubliny jsou stručné. Zleva doprava:

| # | Položka | Co dělá | U nás | Kdy |
|---|---|---|---|---|
| 1 | Oddálit, Přiblížit, **74 %** › | zoom; číslo = přiblížení, rozbalení = vše / výběr / oknem / 100 % | viewport, `zoomTo` | UI4 |
| 2 | **Rozvržení oken**: jedno okno, dvě okna vedle sebe (např. půdorys + 3D / půdorys + jiný pohled) | víc oken, aktivní okno | nové | UI4 |
| 3 | **Trasování** (Shift+F2) + **„Níž · 1.NP“** › | průsvitný odkaz jiného podlaží: Níž (auto) / Výš (auto) / konkrétní podlaží; intenzita slabá / střední / silná; kreslit odkaz nad / pod aktivním; prohodit odkaz s aktivním | kresba jiného podlaží jen pro zobrazení | UI4 |
| 4 | **Pomocné prvky** (vodicí čáry a body), **Přichytávání (S)**, **krok přichytávání** › (vyp., 10–500 mm, Alt+S) | zapnutí služby přichytávání a kroku kurzoru | služba přichytávání (základ 20), mřížka | UI4 |
| 5 | **Gravitace** › (vyp. / na desku / na střechu / na terén / na cokoli) | nový prvek se postaví na plochu pod bodem | potřebuje desky, střechy, terén | s deskami |
| 6 | **Kombinace vrstev** › (Vše, Studie půdorys / řez / pohled, DSP a PPS…, Situace, 3D model, Elektro) + **rychlé volby vrstev** › (přepnout zobrazené / skryté, skrýt vrstvy označených, skrýt ostatní, zpět / znovu změnu vrstev) | které vrstvy jsou vidět a zamčené | `layerCombinations`, místní stavy vrstev pohledu | UI4 |
| 7 | **Skutečná tloušťka čar** / vlasové, **Průchozí materiál** (stejný materiál bez dělicí čáry v řezu, pohledu i 3D), **Izolovat popisy** (model v polotónu, nevybíratelný), **Pera a barvy** (dialog sad per) + **sada per** › (Studie, Projekt, TZB, AutoCAD) | tloušťky a barvy čar | tabulka per (základ 32): zatím jedna; průchozí materiál už platí v kresbě stěn | tloušťka, izolovat popisy, dialog per: UI4; sady per: s etapou 7 |
| 8 | **Grafické přepisy** › (Šrafy, Prezentace, Barevné označení hmot, Tepelná obálka, Elektro – podklad šedě, Elektro – okruhy barevně, Upravit přepisy…) | kombinace pravidel grafiky (základ 30) | `overrideCombinations`, `view.setOverrideCombination` | výběr: UI4; „Upravit přepisy“ až s návrhem přepisů (část 4) |
| 9 | **Konstrukční zobrazení** › (Celá skladba, Bez povrchů, Jen jádro, Jen jádro nosných prvků) | jen zobrazení, model a IFC beze změny | nové v kresbě stěn (vrstvy podle funkce) | stěny Z6 |
| 10 | **Zobrazit výběr ve 3D** (F4), **Zobrazit vše ve 3D** (Ctrl+F4) | 3D okno | 3D | etapa 3D |
| 11 | **Odhalit** | dočasně ukáže skryté prvky (skrytou vrstvou, fází, filtrem) purpurově a jdou vybrat | nové | UI4 |
| 12 | **Fáze** › (Stávající / Bourací práce / Nový / Srovnávací) | filtr rekonstrukce aktivního okna | pravidla fází | stěny Z6 |
| 13 | Šrafy ×, Řez (rovina řezu), Kóty do | naše položky navíc | máme | UI4 (přesun do G); podrobnost z lišty odebrána na pokyn uživatele 2026-11-26 (bude se nastavovat jinde) |

Vpravo zůstane nápověda „co dělat dál“ a souřadnice kurzoru. Na úzké obrazovce se položky schovají
do rozbalovací nabídky „…“.

### I – Plovoucí prvky u kurzoru
- **Tracker**: Vzdálenost, Úhel, ΔX, ΔY (u oblouku Poloměr, Středový úhel, Tětiva); Tab přepíná pole,
  čísla se píšou rovnou.
- **Nabídka druhu úseku po prvním kliku** (jen řetěz stěn; malá lišta u kurzoru): úsečka / tečný oblouk /
  oblouk bodem (bod na oblouku, pak konec), s bublinou, co se nakreslí. Klávesa M přepíná.
- **Kontextová paleta u uzlu / hrany** (sekce 16, jako Archicad): posun uzlu, odsazení hrany, zakřivení,
  přidání bodu. Nahradí dnešní kolečko zakřivení a pravé tlačítko na uzlu.
- Dočasné kóty, zámky a nápověda „co dělat dál“ (krátký text u kurzoru nebo vlevo dole v okně).

## 3. Kam se přesune dnešní sandbox

| Dnes v sandboxu | Nové místo |
|---|---|
| Lišta nástrojů vlevo s popisky (Výběr, Stěna, Oblouková stěna, Otvor, Kóta…) | C paleta ikon; Stěna a Oblouková stěna = jeden nástroj s metodou (D, I) |
| Přesunout, Kopírovat, Otočit, Zrcadlit, Pole, Zarovnat, Do rohu, Rozdělit v levé liště | B lišta příkazů |
| Zpět, Znovu, Vše, Výběr, Okno v levé liště | A (Zpět / Znovu), G (zoom) |
| Exportovat IFC | A |
| Horní lišta: pohled, Nový pohled, Studie / Projekt, styl, měřítko, šrafy ×, řez, kóty do | A (sada), E hlavička (měřítko), G (styl, vrstvy, rovina řezu…), F (nový pohled) |
| Pravý panel: Vlastnosti, Podlaží, Vrstvy, Typy stěn, Materiály, Šrafy | D info box (vlastnosti, volby nástroje) a F/F' (podlaží, vrstvy, typy, materiály, šrafy) |
| Volby (vybírat stěny / kóty, otočit kopii, pole – počet, mřížka) | D (volby nástroje), G (mřížka, co jde vybrat) |
| Stavový řádek dole | G vpravo + nápověda u kurzoru |
| Galerie napojení (odkaz nahoře) | zůstává jako vývojářská stránka mimo hlavní rozhraní |

## 4. Sady, pohledy, výkresy, fáze a varianty

Rozhodnuto s uživatelem 2026-11-25 (princip jako Archicad a vzor; nahrazuje dřívější „přepínač = styl
aktivního okna“).

### Model je jeden, všechno ostatní je zobrazení
- Vše, co se nakreslí, je v jednom modelu a patří do všech sad (Studie, Projekt, Elektro…). Sady se liší
  jen tím, **co je vidět a jak** (vrstvy, pera, pravidla grafiky, podrobnost – styl, základy 26, 27, 30).
- **Kóty a popisy** patří podlaží a mají **skupinu anotací** (základ 28), např. „Kóty a popisy studie“,
  „Kóty a popisy DSP a PPS“. Styl sady určí, které skupiny jsou vidět. Kóty pro studii a pro projekt se
  tedy kreslí zvlášť, každé do své skupiny (aktivní skupina = „Kóty do“ ve spodní liště G).

### Čtyři úrovně (Obsah F, později Organizátor)
| Úroveň | Co to je | Archicad / Revit |
|---|---|---|
| **Projekt** | Místa v modelu: podlaží, situace, řezy, pohledy, 3D, výpisy. Otevřením vznikne **pracovní okno**; jeho nastavení se nikam neukládá. | Mapa projektu / Project Browser |
| **Pohledy** | **Uložené pohledy**: místo + pevné nastavení (sada a styl, měřítko, řezná rovina, fáze, varianta, přiblížení, složka). „+ Uložit pohled“ vezme nastavení pracovního okna; „Načíst nastavení aktuálního okna“ ho přepíše. | Mapa pohledů / pohled s View Template |
| **Výkresy** | Listy; vkládají se na ně jen uložené pohledy (a výpisy). Změna uloženého pohledu změní výkres. | Kniha výkresů / Sheets |
| **Export** | Sady pro odevzdání: PDF se seznamem výkresů, model IFC, výpisy XLSX. | Sady publikování |

Výkresy, Export a **Organizátor** (čtyři sloupce vedle sebe, přetažení Projekt → Pohledy uloží pohled,
Pohled → Výkresy umístí pohled na výkres) přijdou s etapou 7. Kdo je zvyklý na Revit, může pracovat jen
v uložených pohledech.

### Přepínač sad nahoře (lišta A)
Klik na **Elektro** (nebo jinou sadu):
1. **pracovní okno** se překreslí stylem sady;
2. **Obsah i Organizátor** ukážou pohledy, výkresy a exporty této sady (ostatní sady se skryjí);
3. co se nově uloží („+ Uložit pohled“, nový výkres), patří do této sady.
Uložené pohledy a výkresy jiných sad se **nemění** – po přepnutí zpět jsou stejné. Studie / Projekt /
Elektro jsou jen první sady; uživatel si přidá vlastní (např. „Bourací práce“, „Pro statika“).

### Tři nezávislé osy uloženého pohledu
Každý uložený pohled si pamatuje, každou buď **pevně**, nebo **„podle okna“** (bere to, co je přepnuté
nahoře):
1. **sadu / styl** – jak to vypadá a které anotace jsou vidět;
2. **fázi (filtr rekonstrukce)** – Stávající / Bourací práce / Nový / Srovnávací / Vše (sekce 6 rozhodnutí);
3. **variantu** – hlavní model, nebo varianta (např. „Kuchyně – A“).
Výkres „Půdorys 1.NP – kuchyně A“ a „… – kuchyně B“ jsou dva uložené pohledy s pevnou variantou.

### Varianty návrhu (sekce 6 rozhodnutí; ovládání je samostatná etapa)
- Prvek patří hlavnímu modelu, nebo jedné variantě; varianty jsou v nezávislých sadách (Kuchyně A/B/C,
  Koupelna A/B). Data má prvek od začátku (základ 2).
- **Přepínač variant nahoře** vedle sad („Kuchyně: [A] B C“); ve variantě barevný rámeček kolem výkresu
  „Kreslíš do: Kuchyně – B“.
- Úprava prvku hlavního modelu uvnitř varianty = automatická kopie do varianty; originál zůstane pro
  ostatní. Varianta a stav jsou nezávislé. „Přijmout variantu“ sloučí do hlavního modelu. Výkazy po
  variantách.
- V UI3 se připraví jen místo pro přepínač variant a pole „Fáze“ a „Varianta“ v nastavení pohledu.

### Přepisy vzhledu
Pravidla grafiky a patra přepisů (základy 11, 30) jsou samostatná disciplína, kterou uživatel ještě
promýšlí – rozhraní pro jejich úpravu se navrhne zvlášť, se screenshotem.

## 5. Motivy (světlý a tmavý)

- Barvy rozhraní jsou **proměnné na jednom místě** (tokeny: podklad, plocha panelu, text, tlumený text,
  okraj, zvýraznění, varování, chyba, pomocná modrá). Motiv mění jen jejich hodnoty; volba světlý /
  tmavý / podle systému se pamatuje v prohlížeči.
- **Podklad výkresu** je samostatná volba okna: „papír“ (bílý, výkres jako při tisku) nebo „tmavý“.
  Na tmavém podkladu se **jen při zobrazení** zesvětlí tmavé barvy čar (černá → světle šedá); barvy
  výplní a šraf zůstanou, jen ztlumené. Data, tisk a export mají vždy původní barvy (základy 11, 32).
- Pomocná modrá a značky výběru mají v obou motivech dost kontrastu (kontrolní test kontrastu tokenů).
- **Výchozí motiv: světlý** (rozhraní i podklad výkresu, rozhodnutí uživatele); tmavý se přepne jedním
  klikem.

## 6. Ikony

- **Vlastní sada**, jedna pro oba motivy: SVG v mřížce 24 × 24 px, čára 1,5 px, zaoblené konce, barva
  z motivu (`currentColor`), bez výplní kromě drobných akcentů.
- Obecné ikony (zpět, lupa, oko, zámek, složka…) se smí převzít z otevřené sady s licencí MIT
  (např. Lucide) – licence se uvede v repu. BIM ikony (stěna, oblouková stěna, otvor, kóta, deska,
  podlaží, řez…) se nakreslí ve stejném stylu.
- Ikona je **název v registru** (pole `icon` příkazu / nástroje); jedna komponenta ji vykreslí. Test hlídá,
  že každý příkaz v liště B a nástroj v paletě C ikonu má.
- Velikosti: 20 px v lištách, 16 px v seznamech, 24 px v paletě.

## 7. Bubliny, nabídky, hlášky

- Bublina: **jen název – zkratka**, stručně (dlouhé popisy nikdo nečte; uživatel, 2026-11-25). Delší
  vysvětlení patří pod (i) u sekce info boxu.
- Pravé tlačítko = kontextová nabídka toho, co je pod kurzorem (prvek, uzel, kóta, okno); položky jsou
  příkazy z registru, nahoře nejčastější.
- Hlášky (toast) vpravo dole, krátké; chyba s tlačítkem nápravy (např. „Odemknout kótu“).
- Dialogy jen tam, kde je nutné potvrzení (smazání použitého typu, podlaží s prvky).

## 8. Velikosti a hustota

- Šířky: paleta C 40 px, info box D 240–280 px (jde zúžit / skrýt), Obsah F 300 px (jde skrýt), lišta
  F' 36 px; výšky: A 44 px, B 36 px, G 36 px.
- Písmo bezpatkové systémové 13 px (panely), 12 px (lišty), čísla v trackeru a polích neproporcionální.
- Na malé obrazovce se nejdřív skryje F, pak D (zůstane jako vyjížděcí panel).

## 9. Testy a technika

- Vzhled se mění, chování ne: e2e testy používají `data-testid`, ne texty ani polohy; přesun ovládacích
  prvků nesmí rozbít testy logiky.
- Hlídač `tools/ui-commands.test.mjs` platí dál (obrazovka používá jen příkazy z registru).
- Rozložení v Preactu po komponentách (A–G každá zvlášť, základ 33); styly přes proměnné CSS.

## 10. Postup zavedení (návrh kroků)

| Krok | Obsah | Hotovo, když |
|---|---|---|
| UI1 kostra | rozložení A–G (prázdné oblasti), motivy světlý / tmavý, podklad výkresu, komponenta ikony + prvních ~30 ikon | sandbox běží v novém rozložení v obou motivech, testy zelené |
| UI2 nástroje a info box | paleta C, info box D z popisu parametrů (nástroj i výběr), metoda geometrie, sloučení Stěna + Oblouková stěna | vše z dnešní levé lišty a panelu Vlastnosti je v C a D |
| UI3 příkazy a Obsah | lišta B, Najít a vybrat (lupa), Obsah F se záložkami Projekt / Pohledy (pracovní okno podlaží, uložené pohledy, + Uložit pohled, nastavení pohledu s fází a variantou), přepínač sad filtruje Obsah, lišta sekcí F' | dnešní pravé záložky a výběr pohledu jsou v F/F' |
| UI4 spodní lišta a okna | lišta G podle tabulky v části 2 G (položky „UI4“), dvě okna vedle sebe, aktivní okno, trasování podlaží, odhalit | dnešní ovládání pohledu je v G, okno jde rozdělit |
| UI5 plovoucí prvky | hledání příkazů Ctrl+K, tracker ΔX/ΔY, nabídka metody po prvním kliku, kontextová paleta u uzlu a hrany, průvodce prostředím | kreslení a úpravy bez levého panelu |

Před každým krokem: screenshot odpovídající části Arditu → porovnání → zapsat rozhodnutí.
**Pořadí (rozhodnuto): nejdřív UI1–UI5, potom stěny Z6** (předvolby fází patří do lišty G).

## 11. Rozhodnutí k rozporům se sekcí 10 (uživatel, 2026-11-25)

1. **Vlastnosti vlevo** v info boxu, vpravo Obsah projektu (sekce 10 upravena).
2. **Kostra, motivy a ikony se dělají hned** (UI1–UI5); v etapě 7 jen doladění.
3. **Přepínač sad** = styl aktivního okna, styly vlastní a rozšiřitelné, jiná podoba téhož podlaží
   = kopie pohledu (část 4).
4. **Výchozí motiv světlý.**
5. **Pořadí: UI1–UI5 před stěnami Z6.**
6. **Mockup obrazovky** = tento dokument (schéma v části 2) + prázdná kostra z kroku UI1.

## 11a. Editor typů (rozhodnutí uživatele, 2026-11-26)

- Typy všech prvků (stěny, desky, střechy, později okna, dveře, parametrický nábytek) se upravují v jednom
  samostatném okně **Editor typů**: vlevo seznam podle druhu, uprostřed náhled, vpravo vrstvy a vlastnosti.
  Otevírá se z lišty sekcí (ikona Editor typů) a ze záložky Typ v info boxu („Upravit v editoru typů…“).
- Náhled: svislý řez skladbou (vrstvy nastojato jako skutečná stěna, šrafy, kóty tlouštěk) a pseudo-3D výsek
  s odstupňovanými vrstvami; výběr vrstvy v náhledu = výběr v tabulce.
- **Skladba je samostatná položka projektu společná pro stěny, desky a střechy** (vzor Arditu „Skladby“,
  zaškrtávátka Použít pro); typ prvku na ni odkazuje a přidává své údaje (výška, referenční čára, vlastnosti).
- Postup po krocích s vyzkoušením: 1) okno se seznamem a tabulkou vrstev, 2) řez a pseudo-3D náhled,
  3) společné skladby (nová verze schématu s migrací).

## 12. Mimo rozsah tohoto návrhu

3D okno a jeho lišta (přijde s etapou 3D), výkresy a organizátor výkresů (etapa 7), režim Elektro
(etapa Elektro), angličtina, uživatelské přizpůsobení lišt.
