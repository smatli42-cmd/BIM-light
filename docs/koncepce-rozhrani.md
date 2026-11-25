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
- Vlevo název programu a projektu; přepínač **sady zobrazení** Studie / Projekt / Elektro (část 4).
- Zpět / Znovu (s historií v bublině), Nový projekt, Otevřít, Uložit a stav („Uloženo“ / „Neuloženo“),
  export IFC.
- Vpravo: motiv (světlý / tmavý / podle systému), celá obrazovka, nápověda a průvodce, jazyk (později).

### B – Lišta příkazů
- Úpravy, které nezávisí na aktivním nástroji a pracují s výběrem: přesunout, otočit, zrcadlit,
  kopírovat, pole, zarovnat, do rohu, rozdělit, spojit, zakřivit / vyrovnat, odsadit, měřit, zamknout /
  odemknout, skupina.
- Vlevo **lupa = hledání příkazů (Ctrl+K)**: píše se název nebo část („rozdělit“, „kóta“), Enter spustí.
  Tady se později bude zadávat i požadavek pro AI.
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
- **Obsah** se záložkami Projekt / Pohledy / Výkresy / Export a hledáním: podlaží (s úrovní), situace,
  řezy, pohledy, 3D, výkazy. Dvojklik otevře pohled v aktivním okně.
- Pod seznamem **nastavení vybrané položky** (u podlaží název, úroveň, výška, + nad / + pod, smazat).
- **F' svislá lišta ikon** úplně vpravo přepíná sekce panelu: Obsah, Vrstvy, Typy stěn (skladby),
  Materiály, Šrafy, Styly, Podlaží, později Organizátor výkresů. Panel jde skrýt (více místa pro okna).

### G – Spodní lišta zobrazení
Platí pro aktivní okno (základ 26: pohled má svůj styl); každá položka je rychlá volba s rozbalením (›):
- zoom (přiblížit, oddálit, vše, výběr), rozvržení oken;
- zobrazení podlaží pod / nad (podklad);
- přichytávání (zapnout typy: konec, střed, průsečík, líc, osa…), mřížka;
- kombinace vrstev / skupin anotací, pera (skutečná tloušťka čar), měřítko;
- styl pohledu, **fáze** (Stávající / Bourací / Nový / Srovnávací – krok Z6), skladba (celá / jádro),
  přepisy grafiky, „Odhalit“ skryté prvky.
- Úplně vpravo informace o projektu / souřadnice kurzoru (dnešní stavový řádek).

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

## 4. Studie / Projekt / Elektro a styl pohledu

Rozhodnuto (uživatel, 2026-11-25), princip jako šablony pohledů v Revitu:
- **Každý pohled má svůj styl** (základy 26, 27). Studie / Projekt / Elektro jsou jen první předvolby;
  uživatel si časem nastaví **vlastní styly podle svých představ** a přepínač je nabídne stejně.
- Přepínač v liště A nastaví styl **aktivnímu oknu**. Kdo chce mít stejné podlaží zároveň ve dvou
  podobách, vytvoří **kopii pohledu** (jako duplikát půdorysu v Revitu) s jiným stylem; kopie jde
  v Obsahu (F) i z nabídky okna.
- Přepínač ukazuje styl aktivního okna; je-li vlastní nebo upravený, zobrazí jeho název / „upraveno“.
- **Přepisy vzhledu** (pravidla grafiky, patra přepisů, základy 11 a 30) jsou samostatná disciplína,
  kterou uživatel ještě promýšlí – rozhraní pro jejich úpravu se navrhne zvlášť, se screenshotem.

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
| UI3 příkazy a Obsah | lišta B, hledání Ctrl+K, Obsah F (podlaží, pohledy) a lišta sekcí F' | dnešní pravé záložky jsou v F/F' |
| UI4 spodní lišta a okna | lišta G (zoom, přichytávání, vrstvy, styl, měřítko, rovina řezu), více oken vedle sebe, aktivní okno | dnešní horní lišta pohledu zmizí |
| UI5 plovoucí prvky | tracker ΔX/ΔY, nabídka metody po prvním kliku, kontextová paleta u uzlu a hrany, průvodce prostředím | kreslení a úpravy bez levého panelu |

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

## 12. Mimo rozsah tohoto návrhu

3D okno a jeho lišta (přijde s etapou 3D), výkresy a organizátor výkresů (etapa 7), režim Elektro
(etapa Elektro), angličtina, uživatelské přizpůsobení lišt.
