# BIM-light – instrukce pro Claude Code: knihovna šraf a materiály (doplněk k etapě 0)

Stav: připraveno 2026-11-24 (upraveno podle detailu materiálu z arditu: jen základní vlastnosti; 2026-11-24 večer doplněno o stav kódu podle `docs/STAV.md`). Spustit po kroku 3 etapy 0 a **před krokem 4** (zobrazení v sandboxu). Nová session. Pořadí práce: **tento doplněk → krok 4 etapy 0 → stěny Z1** (`instrukce-code-steny.md`).
Doporučený model: **Sonnet 5.5** (datové typy, knihovna a kreslení podle podrobného zadání; levnější na limity). Opus není potřeba, architektura je už schválená.
Před spuštěním musí být v repu `docs/` aktuální `rozhodnuti-bim-light.md` (se základem 34) a `docs/katalog-sraf-materialu.md`.

---

# BIM-light: knihovna šraf a materiály

## Kontext a pravidla práce
- Pokračuj podle `CLAUDE.md` a `docs/STAV.md` (česky, stručně, standardní chování BIM programů dělej celé, neptej se po kouskách; nejasnost zapiš do STAV.md „Rozhodl Code (k potvrzení)“).
- Přečti: `docs/katalog-sraf-materialu.md` (celé, je tam i seznam 40 šraf a vlastnosti materiálu), `docs/rozhodnuti-bim-light.md` základy 10, 11, 15, 21, 29, 32, 33 a **základ 34**, `docs/rozhodnuti-koncepce-model-zobrazeni.md` sekce 5. Přidej základ 34 do `CLAUDE.md` (jedna věta + odkaz).
- Tento doplněk **nahrazuje** řádek z kroku 2 „Materiál s šrafou a prioritou napojování (jen data)“: šrafa už není u materiálu zabudovaná.
- **Navazuj na existující kód:** v jádru už je materiál se šrafou a prioritou, vlastní knihovna 7 vzorů šraf a jejich kresba (krok 2 a 3, viz `docs/STAV.md`: „Šrafy: vlastní knihovna vzorů, rozteče na papíře odhadem“). Nic nepiš znovu: přesuň a rozšiř to do struktury níže, zachovej zelené testy, případně je uprav a migruj uložená data (zvyš `SCHEMA_VERSION`, základ 9).
- Dodržuj základ 33 (soubory do 250 řádků, tvrdý limit 400, `npm run check:size`); knihovna šraf po jednom souboru na skupinu.

## Co postavit

### 1. Datový tvar šrafy (`packages/core/src/hatch/`)
- **Šrafa** {id (stabilní ascii slug, např. `hatch.zdivo-mrizka`), název (česky přesně podle seznamu), skupina, `variantaOd?` (id jiné šrafy; ardit značí 13 šraf jako „odvozená“), rodiny[], verze}.
- **Rodina** je jeden ze tří druhů: **čáry** {úhel °, rozteč mm, posun mm, čárkování (dlouhá/mezera mm) nebo plná}, **značky** {tvar: tečka | kroužek | trojúhelník | křížek | šipka | šestiúhelník, velikost mm, rozteč x a y mm, posun každé druhé řady, úhel}, **vlnovka** {amplituda mm, délka vlny mm, rozteč řad mm, úhel}. Šrafa může mít víc rodin (mřížka = dvě rodiny čar).
- „bez šrafy“ je normální položka knihovny s prázdným seznamem rodin (materiál tedy vždy odkazuje na existující šrafu, žádné null).
- **Všechny rozměry jsou v mm na papíře**, stejné ve všech měřítcích (základ 29). Úhly jsou vůči výkresu. Počátek rastru je společný v souřadnicích modelu, aby šrafa sousedních stěn téhož materiálu na sebe navazovala. Nikde ne pevné barvy ani mm čar (základy 11, 32).
- Žádný kód nezná konkrétní šrafu: vše je data, přidání nové šrafy = nový záznam bez změny kódu.

### 2. Knihovna šraf
- Otevřený seznam dat v pořadí jako v `katalog-sraf-materialu.md`, **všech 40 položek**, rozdělený do souborů podle skupin (zeminy, beton, zdivo, izolace, dřevo-kov-sklo, ostatní). Registr při startu načte všechny soubory a zvaliduje: unikátní id, `variantaOd` ukazuje na existující šrafu, rozměry kladné, rodiny platného druhu.
- Vzhled šrafy navrhni podle názvu a českých zvyklostí; je to návrh, uživatel ho porovná s arditem. Vodítka (já): Zdivo = šikmé čáry 45°, rozteč ~2 mm; mřížka = 45° + 135°; hustá mřížka = totéž hustěji; čárkovaná = čárkované 45°; svislice a šikmé = 90° + 45°. Beton prostý = tečky a malé trojúhelníky; beton vyztužený = beton + šikmé čáry. Dřevo = vodorovná vlnovka. Tepelná, akustická a obecná izolace = cik-cak / kosočtverce. Štěrk a zásypy = tečky v rastru s posunem řad. Kovy = jemné šikmé čáry (~1 mm). Krytina = vodorovné čáry. Dílce = svislé čáry. Izolace proti vodě (vyčerněná) = plná černá výplň (příznak „plná“). Ostatní podle názvu.
- Do `docs/STAV.md` vypiš všech 40 šraf s krátkým popisem vzhledu, označených „návrh, k porovnání s arditem“.

### 3. Materiál odkazuje šrafu (`packages/core/src/material/`)
- **Materiál (jen základní vlastnosti, rozhodl uživatel):** {id, `název` (klíč, na který se odkazují prvky a skladby), `kategorie` (Dřevo / Zdivo / Beton a potěry / Izolace / Omítky / Kov / Sklo / Zemina a sypaniny / Ostatní), `barva` (jedna, pro 3D), `šrafa` (id), `průhledný3D` (ano/ne, jako sklo), `prioritaProtínání` (0–999, výchozí podle kategorie; spoje stěn: vyšší projede nižší), `poznámka`}. Volitelně 2D barva čar a výplně: výchozí se odvodí z `barva` (výplň světlá, čáry tmavé), jde přepsat u materiálu, pravidlem nebo přepisem prvku (patra přepisů, základ 30); zvolenou odvozovací funkci zapiš do STAV.md k potvrzení. Číslo pera šrafy (výchozí pero 1, základ 32).
- **Zatím NEDĚLEJ a neukládej:** tepelnou vodivost λ, objemovou hmotnost, měrnou tepelnou kapacitu, uhlíkovou stopu, faktor difuzního odporu μ, cenu, vzduchovou vrstvu. Přidají se později novou verzí schématu s migrací (základ 9) a popisem parametru (základ 15b); proto panel materiálu generuj z popisu parametrů, ne ručně pole po poli.
- „Použití: N prvků, M skladeb“ se spočítá z modelu, neukládá se.
- **Barva je jen u materiálu, šrafa nese jen tvar.** Změna šrafy v knihovně se projeví u všech materiálů, které ji používají.
- **Projekt drží kopie použitých šraf s odkazem na původ** (zdroj id + verze, základ 21), aby byl soběstačný. Zvyšování `SCHEMA_VERSION` + migrace, protože krok 2 už materiál s vloženou šrafou vytvořil.
- Výchozí knihovna materiálů: 10–15 základních (cihly plné, železobeton, beton prostý, minerální vata, EPS, dřevo, omítka, sádrokarton, anhydrit, ocel, štěrk, zemina, sklo). Seznam 137 materiálů z arditu **nepřebíráme**; doplní se později jako data.
- Příkazy (základ 6): vytvoř / duplikuj / smaž / uprav materiál (název, kategorie, barva, šrafa, průhlednost, priorita, poznámka), s undo, přes registr příkazů. Smazání materiálu, který se používá, nabídne náhradu nebo odmítne.

### 4. Grafika
- Funkce grafiky (základ 11) vrací pro řezanou vrstvu primitivum **šrafa** {polygon, id šrafy, barva čar, barva výplně, číslo pera, počátek rastru}.
- Jádro dál nezná canvas ani mm čar. Sandbox vykreslí šrafu přes předrenderovanou dlaždici (canvas pattern) s rozměry mm na papíře převedenými na pixely stejným koeficientem jako tloušťky čar. Rozvinutí šrafy do čar a značek ořezaných polygonem (pro DXF/PDF) **nedělej teď**, ale všechny parametry šrafy musí být číselné, aby to šlo.
- Střední podrobnost stěny kreslí šrafu materiálu; hrubá jednu výplň bez šrafy (už z kroku 2).

### 5. UI v sandboxu (minimum)
- Stránka / panel **Knihovna šraf**: mřížka náhledů (čtverec ~48 px) s názvem, přepínač barvy pro náhled; všech 40 v pořadí z arditu.
- Panel **Materiály** (podle arditu): hlavička „Materiály · počet“, hledání, seznam (náhled šrafy, název, kategorie); rozbalení = pole z vlastností výše (název, kategorie, barva, šrafa, průhledný ve 3D, priorita protínání, poznámka), „Použití“, tlačítka Duplikovat a Smazat.
- Vybraná stěna: změna materiálu vrstvy a okamžitý vzhled šrafy v řezu při střední podrobnosti.

### 6. Testy (názvy začínají zdrojem, např. „katalog-sraf-materialu / …“)
- Každá šrafa z knihovny projde validací; id jsou unikátní; všech 40 položek je v pořadí ze seznamu; `variantaOd` ukazuje na existující šrafu.
- Přidání šrafy záznamem do dat se objeví v knihovně bez změny kódu.
- Materiály odkazují jen na existující šrafy; změna šrafy v knihovně změní vzhled všech materiálů, které ji používají; změna barvy materiálu nezmění šrafu; materiál neukládá žádnou z vlastností ze seznamu „zatím nedělej“.
- Rozměry šrafy v primitivech jsou stejné v 1:50 a 1:100 (mění se jen tloušťky čar); sousední stěny téhož materiálu mají společný počátek rastru.
- Přepis šrafy a barvy pravidlem a přepisem prvku (a „proč“ vrátí správné patro); projekt drží kopie použitých šraf; migrace starého tvaru; export a import nastavení zobrazení obsahuje šrafy (stejná data po průchodu).
- Kontrola velikosti souborů (základ 33) projde.

## NEDĚLEJ
Tepelné vlastnosti, cenu, GWP a vzduchové vrstvy materiálu; editor šraf (úhel, rozteč) a tvorbu šraf přes AI; import `.pat` z AutoCADu; rozvinutí šrafy do DXF/PDF; přebírání celého seznamu 137 materiálů z arditu.

## Konec
Krátká zpráva: co je hotové; co zkusit (nejvýš 5 kroků s adresou na Pages, hlavně stránka Knihovna šraf: porovnat s arditem); co je otevřené; pět největších souborů. Aktualizuj `docs/STAV.md` (včetně seznamu 40 šraf s popisem vzhledu) a zapiš „Doplněk šraf a materiálů: hotovo, datum“. Potom se zastav.
