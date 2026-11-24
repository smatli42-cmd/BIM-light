# BIM-light – postup po etapách

Logika: **nejdřív neviditelné základy → jeden prvek celou cestou → teprve potom do šířky.** Každá etapa končí něčím, co se dá vyzkoušet, a staví jen na tom, co už funguje. Rozhodnutí jsou v `rozhodnuti-bim-light.md` (základy 1–33 platí od etapy 1; základ 25 viz `pravidla-interakce-bim-light.md`, základy 26–32 viz `katalog-pohledy-styly-zobrazeni.md`).

Metoda každé etapy: katalog chování → rozhodnutí uživatele → testy z příkladů vstup→výstup → implementace po malých krocích. Rozhodovací část se dělá předem v chatu projektu.

## Předplatné a paralelní práce (doporučení, stav 11/2026)
- Limity jsou společné pro chat i Claude Code (5hodinové okno + týdenní limit). Plány: Pro, Max ($100, 5× Pro), Ultra ($200, 10× Pro týdně, bez 5h limitu).
- Diskuze a rozhodování v chatu: stačí Pro.
- Etapy 0–2 (pískoviště, kostra, stěna celou cestou): **postupně, ne paralelně** – vše závisí na základech. Vyšší tarif zde pomáhá rychlostí (víc práce za den), ne paralelismem. Doporučení: Max na 1–2 intenzivní měsíce, pak zpět na Pro; alternativa pro nárazové špičky: dokoupené kredity k Pro.
- Paralelně až od etapy 3+ a jen u oblastí, které se neovlivňují (např. elektro × terén × povrchy). Pravidla:
  - Každý agent má vlastní větev / git worktree a vlastní oblast souborů (modul).
  - Jádro (core, model, příkazy, společné služby – základy 6, 7, 20) mění jen jedna „hlavní“ session; ostatní ho jen používají.
  - Rozhraní (typy, příkazy) se definují předem v katalogu, než se paralelně začne.
  - Sloučení jen přes PR, se zelenými testy; max. 2 paralelní proudy (úzkým hrdlem je uživatelova kontrola a testování).
- Šetření limitů: Opus na rozhodnutí a architekturu, Sonnet na běžné kódování podle katalogu; stručný CLAUDE.md + katalog místo opakovaného vysvětlování; malé kroky; nová session pro nový úkol.

## Etapa 0 – Příprava
- Dokončit zaměřování a vyzkoušet IFC export.
- Rozhodnout: sdílené jádro (core) vs. kopie.
- Návrh obrazovky (mockup): panel nástrojů vlevo, vlastnosti vpravo, přepínače sad/fází/variant nahoře.
- Katalog chování „Kreslení stěn a kótování“ (tracker, dočasné kóty, kontextová paleta, přichytávání, zámky) – hotovo.
- Ověření interakce před programováním BIM:
  1. Klikací prototyp (HTML stránka připravená v chatu) – **hotovo**, uložen v `docs/reference/prototyp-interakce.html` jako zadání chování. Chování popisují `pravidla-interakce-bim-light.md` a `katalog-kresleni-sten-kotovani.md`.
  2. **„Pískoviště“ v Claude Code: složka v tomtéž repu (`packages/core` bez DOM + `apps/sandbox`), jen se stěnami, kótami, společnou službou interakce (základ 20) a zobrazením (základy 26–32), s testy.** Píše se už podle základů 6, 7, 15, 20, takže se v etapě 2 jen připojí k modelu – nepíše se znovu. Instrukce pro Code jsou v `instrukce-code-etapa-0.md` v projektu chatu.
- Repo `smatli42-cmd/BIM-light` je založené (2026-11-24, veřejné), dokumenty jsou v `docs/`, do `CLAUDE.md` patří zkrácený seznam základů 1–33 jako závazný (základ 33: hlídání velikosti souborů). Od té chvíle je zdrojem pravdy repo.

## Etapa 1 – Kostra (na obrazovce skoro nic)
- Projekt → budova → podlaží, prázdný prvek se všemi povinnými vlastnostmi (kategorie, profese, stav, varianta, typ/instance, GlobalId).
- Poloha projektu (počátek v S-JTSK, ±0,000 v Bpv) uložená v projektu, i když se zatím nepoužívá.
- Příkazy + Undo, ukládání přes vrstvu „platforma“, SCHEMA_VERSION a migrace.
- Ukládání a zálohy: volba složky projektu a záloh (OneDrive), průběžné ukládání do prohlížeče, automatická záloha v intervalu, při ručním uložení datovaná verze, obnova po pádu (katalog, sekce 17).
- Kostra ovládání: registr příkazů, panel vlastností z popisu parametrů, stavový řádek, rozložení podle mockupu (jednoduchý vzhled).
- Hotovo, když: testy vytvoří podlaží příkazem, projekt se uloží, znovu otevře a Undo funguje; příkaz z registru se objeví jako tlačítko s propiskou.

## Etapa 2 – Stěna celou cestou (nejdůležitější)
- Jeden prvek přes všechny základy: typ s jednou vrstvou a materiálem, referenční čára (výchozí vnitřní líc), výška vázaná na podlaží, kreslení v půdorysu, grafika přes funkci přepisů, 3 úrovně podrobnosti, stav.
- Hned export do IFC a kontrola v BIMvision.
- Smysl: chyby v základech se opraví na jednom prvku, ne na dvaceti.

## Etapa 3 – Import ze zaměřování
- Typy stěn automaticky podle tloušťky, materiál „stávající zdivo (neurčeno)“.
- Od té chvíle se pracuje na skutečných budovách.

## Etapa 4 – Okna a dveře
- Konfigurátor, otvor ve stěně (hostitel), značka počítaná ze stěny, typy O1/D1.

## Etapa 5 – Průřezové funkce
- Přichytávání, kóty, zámky. Každá jednou, na jednom místě, s tabulkou „pravidlo × typ prvku“ (poučení ze zaměřování).

## Etapa 6 – Napojení AI (MCP)
- Příkazy existují od etapy 1, AI je jen další uživatel. Přidá se instalační obálka (Tauri).
- Záměrně brzy: hlavní výhoda projektu a prověrka, že jsou příkazy dobře navržené.

## Etapa 7 – Zobrazení a výkresy
- Sady Studie / Projekt, tlačítka fází, přepisy grafiky, skladby se šrafami, export DXF.
- Uhlazení vzhledu ovládání (ikony, propisky).
- **První použitelnost na reálnou zakázku.**

## Milník: dokumentace pro povolení stavby (hlavní cíl)
- Řezy a pohledy z modelu, výkresové listy s razítkem a PDF, situace (katastr, terén, prvky situace), základy, okolní zástavba.
- 2D výkresy jako v AutoCADu (hladiny, zkratky, příkazový řádek, import DXF a PDF podkladu) – na listy vedle pohledů z modelu. Jádro 2D kresby vznikne už s anotacemi v etapě 7.
- Kontrola proti `checklist-dps-bim-light.md`; ověření na pilotním projektu (menší rekonstrukce) souběžně s AutoCADem.
- Řezy, pohledy a listy patří hned za etapu 7 (spolu s místnostmi a výkazy) – bez nich není BIM-light použitelný na povolení.

## Další etapy (pořadí lze měnit)
1. Místnosti (automaticky) a výkazy, PDF s razítkem.
2. Elektro.
3. Varianty (data existují od etapy 1, přibude ovládání).
4. Schodiště a profil po trase (zábradlí, lišty…).
5. Povrchy místností: malby, obklady, dlažby, spárořezy, rozvinuté pohledy.
6. 3D pohled (lze předřadit kdykoli po etapě 2, data jsou 3D od začátku), pak kamery a scény, 3D materiály, render s vrstvami pro AI a export do 3ds Max (USD / glTF).
7. Terén a zemní práce (import geodet/ČÚZK, jáma, rýhy, ornice, úprava terénu, výkaz m³).
8. Střechy a krovy (po 3D pohledu).
