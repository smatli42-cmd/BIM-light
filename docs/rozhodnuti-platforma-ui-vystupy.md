# BIM-light – rozhodnutí: sekce 8, 10, 14, 16–20

Část katalogu rozhodnutí (rozděleno 2026-11-24 podle základu 33). Základy 1–33 a rejstřík jsou v `rozhodnuti-bim-light.md`. Číslování sekcí se nemění, odkazy typu „viz 4“ nebo „sekce 16“ platí.
Značení: **[R]** = rozhodl uživatel, **(já)** = Claude podle Revitu/Archicadu, platí, dokud uživatel nesouhlasí jinak.

## 8. Platforma – web a instalace

- **[R] Webová aplikace (offline PWA, stejná technologie jako zaměřování: TypeScript, Vite, Preact), později zabalená do desktopové instalace (Tauri) se stejným kódem.**
  - Začít čistě webově: nejrychlejší pro 2D a první kroky, na obou počítačích se jen otevře, bez instalace.
  - Obálku přidat, až se bude napojovat AI přes MCP nebo se narazí na limity souborů či paměti prohlížeče. Obálka přidá jen volný přístup k disku a MCP server.
  - 3D: WebGPU (podporované v Chrome, Edge, Firefoxu i Safari) přes hotovou knihovnu (three.js nebo Babylon.js); poběží v obou variantách. (já)
- Proč ne čistě nativní program (jako BIMCraft v Rustu): nedá se převzít kód ze zaměřování, pomalejší vývoj, horší ladění. (já)
- Viz základ 13: soubory a systém vždy přes jednu vrstvu „platforma“.

## 10. Ovládání (UI)

- Dvě vrstvy: **kostra ovládání od začátku** (základ 15), **vzhled postupně**. (já)
- Kostra: registr příkazů (tlačítka, menu, propisky u ikon, Ctrl+K vyhledávání, nástroje pro AI z jednoho místa), panel vlastností generovaný z popisu parametrů prvku, stavový řádek s nápovědou „co dělat dál“, nastavení z jednoho popisu. (já)
- **[R] Rozložení podle principu Arditu** (podrobně `koncepce-rozhrani.md`, potvrzeno 2026-11-25): paleta nástrojů a **info box (vlastnosti) vlevo**, lišta příkazů nahoře, **Obsah projektu vpravo**, spodní lišta zobrazení aktivního okna (fáze, vrstvy, styl…), přepínač sad (Studie/Projekt/Elektro) nahoře – překreslí pracovní okno a filtruje Obsah; uložené pohledy si pamatují sadu, fázi a variantu (pevně, nebo „podle okna“), výkresy obsahují jen uložené pohledy (Archicad: mapa projektu → pohledy → výkresy → export; `koncepce-rozhrani.md`, část 4). Více místa pro výkres než pás karet.
- Vzhled: **kostra, světlý a tmavý motiv a vlastní ikony hned** (kroky UI1–UI5 před stěnami Z6), v etapě 7 jen doladění. Výchozí motiv světlý.
- **[R] Návrh obrazovky (mockup)** = `koncepce-rozhrani.md` (schéma rozložení) + prázdná kostra z kroku UI1.
- **[R] Pomocné značky v interakci (přichycení, pomocné čáry, uzly, dočasné kóty, zámky) jsou světle modré.** Kóty a jejich čísla se kreslí podle ČSN (viz 16).
- Klávesy mají jít vždy do výkresu: výkres si fokus bere při najetí myší (poučení z prototypu).

## 14. 3D, kamery, materiály, render a export do 3ds Max

- **[R] Všechny čtyři části: kamery a scény, 3D materiály, vlastní render + vrstvy pro AI, export do 3ds Max.** (já pro detaily)
- Kamery (v Revitu prakticky nepoužitelné): samostatný prvek; v půdorysu značka s kuželem záběru, tažení polohy a cíle s živým náhledem. Výška oka (výchozí 1600), ohnisko v mm, poměr stran/rozlišení, svislé linie svislé (dvoubodová perspektiva).
- Scéna = kamera + sada zobrazení + varianta + datum a čas + světla; uložená, přepínaná jedním kliknutím (= „ukládání pohledů/scén“ z poznámek).
- 3D materiály: materiál z knihovny (se šrafou) má i vzhled pro 3D – barva/textura ve skutečném měřítku (mm), drsnost, lesk, kov, reliéf. Obklady a dlažby použijí skutečný spárořez.
- Světla: slunce podle skutečné polohy projektu (základ 17) + datum a čas; svítidla z elektra svítí sama (typ svítidla nese výkon, barvu světla, tvar kužele); obloha a ruční světla.
- Vlastní render (WebGPU): rychlý náhled v reálném čase se stíny, volitelně postupně zpřesňovaný kvalitnější obraz.
- Pro AI dodělávku vizualizace: k obrázku i pomocné vrstvy (hloubka, hrany, mapa materiálů), aby AI měnila vzhled, ne geometrii; program připraví popis scény jako prompt.
- Export do 3ds Max: primárně USD (plugin dodávaný s 3ds Max, přenáší materiály, sítě, kamery), alternativně glTF (bezplatný open-source importér/exportér od Khronos, i kamery a světla). Názvy objektů a skupiny podle kategorie a materiálu; opakovaný export zachová názvy (stabilní ID), aby šel model v Maxu aktualizovat.
- Pořadí: po 3D pohledu (etapa „3D pohled“), render a export spolu s ním nebo hned po něm.

## 16. Kreslení a kótování (interakce)

- Převzetí: ze zaměřování geometrie, řešič, přichytávání a logika kót (core); interakce se dělá znovu pro myš a klávesnici. Hotová knihovna „kreslení stěn s kótami“ pro web neexistuje; stavební kameny ano (výpočty polygonů a odsazení, řešič geometrických podmínek pro zámky a vazby, např. ten z FreeCADu použitelný i ve webu). (já)
- Vzory: Revit – dočasné kóty při výběru (klik na číslo → změna → posun prvku; ikonou na trvalou kótu). Archicad – tracker u kurzoru (délka/úhel při kreslení), kontextová paleta u uzlu/hrany (posun uzlu, odsazení hrany, zakřivení, přidání bodu), pomocné čáry.
- **[R] Kombinace:**
  - Kreslení: tracker u kurzoru (délka, úhel, Tab přepíná pole, zadání čísla ukončí segment) – odpovídá NumPadu ze zaměřování.
  - Výběr: dočasné kóty k nejbližším lícům, osám a otvorům; klik na číslo ho změní, ikona z něj udělá trvalou kótu se zámkem; kótu lze tažením posouvat.
  - Úprava tvaru: tažení uzlu nebo líce posouvá hned, nabídka (paleta) je na pravém tlačítku.
- Vše jako jedna společná služba (základ 20).
- **[R] Podrobný katalog chování „Kreslení stěn a kótování“** (kroky nástroje, klávesy, pořadí přichytávání, které dočasné kóty a k čemu, co dělá změna čísla, zámky) – samostatný dokument, rozhodnutí tlačítky po částech. **Části 1–7 hotové v `katalog-kresleni-sten-kotovani.md`** (přímé stěny; oblouk později). Obecná pravidla interakce (výběr, příkazy, kóty, základ 25) v `pravidla-interakce-bim-light.md`.
- **Klikací prototyp interakce hotový** (uložený v `docs/reference/prototyp-interakce.html`), podle něj se katalog upravil (část 7). Další krok podle etapy 0: „pískoviště“ v Claude Code (instrukce v `instrukce-code-etapa-0.md`).

## 17. Ukládání a zálohy

- **[R] Umístění nastavitelné uživatelem** – uživatel ukládá veškerou práci na OneDrive. Zvlášť nastavitelné: složka projektu a složka záloh (může být jinde, např. OneDrive\Zálohy).
- **[R] Pravidelné automatické zálohy** do nastavené složky.
- **[R] Při každém ručním uložení navíc samostatná verze s jiným názvem** (jako v AutoCADu), např. `Projekt_2026-11-21_0915.bim`.
- Detaily (já):
  - Tři úrovně: (1) průběžné ukládání do prohlížeče (IndexedDB) po každé změně – ochrana proti pádu, žádné čekání; (2) automatická záloha do složky záloh v intervalu (výchozí 10 min, nastavitelné); (3) ruční uložení = hlavní soubor + datovaná verze.
  - Udržování: automatických záloh posledních N (výchozí 20), ručních verzí všechny (nebo volitelný limit).
  - Bezpečný zápis (dočasný soubor → nahrazení), aby OneDrive nikdy nesynchronizoval napůl zapsaný soubor.
  - Obnova: po pádu nabídka „obnovit neuloženou práci“; seznam verzí s datem a možností otevřít/obnovit.
- Webová fáze: přístup ke složce přes File System Access API v Chrome/Edge; od Chrome 122 lze udělit trvalý přístup („Povolit při každé návštěvě“). Ve Firefoxu/Safari toto API není – BIM-light se používá v Chrome nebo Edge. Desktopová obálka (Tauri) později přístup k disku zcela uvolní.
- Limity prohlížeče (paměť karty, výkon) se týkají velkých modelů; pro malé a střední projekty (rodinné domy, rekonstrukce) nejsou problém. Na kontrolu: neaktivní karta prohlížeče zpomaluje časovače – automatická záloha se pak provede při návratu do karty; průběžné ukládání do IndexedDB běží vždy. (já)

## 18. Katalog a výběr typů

- Vzory: Revit – výběr typu jako seznam názvů, náhled až v „Upravit typ“; Archicad – knihovna se 2D a 3D náhledem, kapátko (převzetí nastavení z prvku).
- **[R] Automatické miniatury:** náhled se generuje z typu (generátor 2D/3D), při změně typu se překreslí; nic se nekreslí ani nefotí ručně.
  - Okna, dveře: 2D značka + 3D miniatura. Stěny, stropy, střechy: řez skladbou se šrafami a tloušťkami. Elektro: značka + popis a výška. (já)
  - Před hotovým 3D pohledem jen 2D náhledy, 3D miniatury potom. (já)
- Výběr typu (já):
  - Rychle v panelu vlastností: rozbalovací seznam s miniaturami a hledáním („okno 1200“).
  - Prohlížeč typů: strom kategorií, filtr podle profese, oblíbené, „použité v projektu“; velký náhled (otáčitelné 3D, 2D ve třech podrobnostech) + parametry.
  - Kapátko: klik na prvek ve výkresu → nástroj převezme typ i nastavení.
- **[R] Vlastní knihovna typů sdílená mezi projekty, ve složce nastavitelné uživatelem (OneDrive).** Projekt má kopie typů s odkazem na původ (základ 21); při změně v knihovně nabídka „aktualizovat v projektu“.
- AI: hledání podobných typů a vytvoření nového typu z popisu („Porotherm 44 + omítky“) včetně náhledu. (já)

## 19. Výkresy a dokumentace pro povolení stavby

- **[R] Hlavní cíl: výkresová část dokumentace pro povolení stavby (rodinné domy, rekonstrukce) bez dodělávky v AutoCADu.** Kontrolní seznam podle vyhl. 131/2024 Sb. v dokumentu `checklist-dps-bim-light.md`.
- **[R] Řezy a pohledy jsou povinná součást BIM-light**, generované z modelu (bez nich BIM nemůže existovat). Poznámka „řezy se nekreslí“ platila jen pro zaměřování.
  - Řez: rovina řezu a hloubka pohledu, výškové kóty, popis skladeb, podrobnost podle sady zobrazení, fáze. (já)
  - Pohledy: fasády s výškovými kótami, materiály, terén, okolní zástavba. (já)
- Důvody, proč se to v Revitu nedařilo, a odpověď BIM-light: české zvyklosti od začátku (ne úpravou), 2D doplňky ve stejném programu, situace z dat ČÚZK, výkresové listy s razítkem; DXF export jako bezpečnostní síť.
- Textové části (průvodní list, technická zpráva) mimo program; AI může připravit koncept z dat modelu. (já)
- Postup: pilotní projekt (menší rekonstrukce) souběžně s jistotou AutoCADu.

## 20. 2D výkresy (kreslení jako v AutoCADu)

- Podnět: BIM klon Lapin má samostatnou 2D část kreslenou jako v AutoCADu; dosud se taková kresba dělala v AutoCADu mimo projekt. Obdoba: Revit „kreslicí pohledy“, Archicad „pracovní listy/detaily“ – ale ovládání ne jako AutoCAD.
- 2D výkres = samostatný pohled v projektu, nezávislý na modelu, vlastní měřítko, vlastní skupina v prohlížeči projektu. (já)
- Nástroje (já): úsečka, křivka, oblouk, kružnice, obdélník, šrafa, text, kóta, odsazení, ořez/prodloužení, zaoblení/zkosení, zrcadlení, pole, bloky (opakované značky).
- **[R] Hladiny jako v AutoCADu – jen ve 2D výkresech** (barva, typ a tloušťka čáry, zapnout/vypnout). Model zůstává bez ručních hladin (sekce 4).
- **[R] Zkratky + příkazový řádek jako v AutoCADu** (L, PL, O, TR, EX, CO, M…), i v modelu, kde to dává smysl. Realizace přes registr příkazů (základ 15) s AutoCAD aliasy.
- Přichytávání, tracker a zadávání čísel stejné jako v modelu (základ 20). (já)
- Na výkresovém listu se 2D výkres vkládá vedle pohledů z modelu – jeden projekt, jedno PDF, jedno razítko. (já)
- **[R] Import: DXF** (upravitelná kresba) **a PDF jako podklad** (obrázek pod kresbu, např. staré výkresy). DWG ne (uzavřený formát). Export DXF.
- Bonus (já): stejné 2D jádro i pro anotace v modelových pohledech (základ 22); 2D výkres/DXF lze vložit jako podklad pod model a obkreslit stěny (nebo nechat převést AI).
