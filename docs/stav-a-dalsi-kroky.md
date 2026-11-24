# BIM-light – stav a další kroky (předání mezi počítači, aktualizováno 2026-11-24 večer)

## Stav
- Repo `smatli42-cmd/BIM-light` běží, Code udělal kroky 1–3 etapy 0 (kostra, jádro, interakce v sandboxu), opravy stěn (skupina A) a ovládání přes AI v jádru. Podrobný stav je v `docs/STAV.md` v repu (zdroj pravdy). Sandbox je na https://smatli42-cmd.github.io/BIM-light/.
- **Chybí z etapy 0:** krok 4 (zobrazení v sandboxu) a doplněk šraf a materiálů.
- Dokumenty v `D:\Claude\BIM-light\docs\` jsou aktuální: základy 1–34, katalogy, plán stěn (`plan-steny-bim-light.md`), instrukce pro Code (`instrukce-code-etapa-0.md`, `instrukce-code-srafy.md`, `instrukce-code-steny.md`). Nové dokumenty jsou jen na disku, **necommitnuté**; commit a push dělá Code na tvůj pokyn.
- Prototyp interakce: `docs/reference/prototyp-interakce.html` (jen zadání chování, kód se nepřebírá).

## Rozhodnuto
- 2026-11-23: Změna délky stěny posune konec, který uživatel uchopí. Úhel v trackeru: 90° = doprava. [R]
- 2026-11-24: Pohled má styl; kóty a popisky patří podlaží a mají skupinu anotací; nastavení zobrazení je JSON; měřítko mění jen tloušťky čar; tloušťky = číslo pera (ISO 128, 7 per). [R]
- 2026-11-24: Šrafa je samostatná položka knihovny, materiál ji odkazuje, barva je u materiálu (základ 34). [R]
- 2026-11-24: Plán stěn Z1–Z10 přijat; otázky A–G podle návrhů (já); desky zatím mimo instrukce (čekají na zařazení).

## Pořadí dalších kroků pro Code (každý v nové session)
1. **Doplněk šraf a materiálů** (`docs/instrukce-code-srafy.md`, Sonnet 5.5).
2. **Krok 4 etapy 0**: zobrazení v sandboxu (`docs/instrukce-code-etapa-0.md`, sekce Krok 4, Sonnet 5.5).
3. **Stěny Z1–Z6** (`docs/instrukce-code-steny.md`, vždy jedna věta, vždy jen jeden krok; Z2 na Opus 5.5).
4. Potom Z7–Z10 (vlastnosti a IFC, výkazy, hromadné úpravy, rekonstrukce), desky, okna a dveře.

Věta pro Z1–Z6: „Pokračuj podle `docs/instrukce-code-steny.md`: zjisti v `docs/STAV.md`, který krok stěn je další, ověř jeho předpoklady a udělej jen ten jeden krok.“

## Otevřené
- Před kroky stěn zařadit **desky** (strop a podlaha) do `postup-etapy-bim-light.md`.
- Upravit `postup-etapy-bim-light.md` podle tabulky v plánu stěn, část 4.
- Pero řezu stěny: Code dal 6 (0,7 mm), katalog pohledů uvádí 5 (0,5 mm); k potvrzení (viz STAV.md, „Rozhodl Code“).

## Testování a ukládání průběhu
- Průběh v gitu (malé commity) + stav v `docs/STAV.md`; automatické testy v Code i na GitHubu při pushi; pravidla z dokumentů se stávají testy; nasazení na GitHub Pages; pocit z ovládání zkouší uživatel a hlásí v dávkách.
