# Jak spolu pracujeme (pokyny uživatele pro Claude Code)

Přeneseno z lokální paměti Claude Code 2026-11-27 kvůli přechodu na jiný počítač. Paměť se mezi počítači
nepřenáší, tento soubor ano. Na začátku session ho přečti spolu s `CLAUDE.md` a `docs/STAV.md`.

## Web místo lokálního náhledu (2026-11-24)

- Uživatel zkouší jen webovou verzi https://smatli42-cmd.github.io/BIM-light/ (GitHub Pages z `main`).
- Po každé hotové a otestované úpravě (zelené `npm run check` a `npm run test:e2e`) commit a push na `main`
  bez dalšího ptaní. Lokální náhled uživateli nespouštět.

## Ověřit CI, než řeknu „je na webu“ (2026-11-27)

- Po každém pushi do `main` zkontrolovat, že GitHub Actions prošly (kontrola i nasazení na Pages).
  2026-11-27 padalo CI pět pushů po sobě a web se nenasazoval; uživatel na to přišel sám.
- `gh` nemusí být nainstalované. Stav běhů: veřejné API
  `https://api.github.com/repos/smatli42-cmd/BIM-light/actions/runs?per_page=5` (limit 60 dotazů za hodinu
  na IP pro všechny sessions dohromady – nehlídat smyčkou), nebo stránka
  https://github.com/smatli42-cmd/BIM-light/actions ve vestavěném prohlížeči. CI běží asi 2–3 minuty.
- Testy v CI běží na Linuxu (jiné písmo než Windows) – rozvržení rozhraní musí snést širší text.

## Kontrola zadání (2026-11-24)

- Před každým krokem ověřit zadání (`docs/`, `STAV.md`) proti kódu. Chybějící věci nahlásit, drobné
  rozpory rozumně opravit a zapsat do STAV.md → „Rozhodl Code (k potvrzení)“. V závěru říct, co se odchýlilo.

## Rozhraní podle Ardit Designeru (2026-11-25)

- Ovládání vychází z principu Ardit Designeru (`docs/koncepce-rozhrani.md`), ne z kopie: vlastní ikony,
  názvy a grafika. Před novou funkcí s rozhraním požádat uživatele o screenshot z Arditu a probrat ho.

## Koordinátor a vedlejší sessions (2026-11-27)

- Hlavní chat sám neprogramuje velké kroky: předá je vedlejší session (desktop aplikace Claude, „start
  session“) s úplným zadáním a hned je volný pro uživatele. Výsledky a dotazy sessions předává uživateli,
  jeho pokyny sessions. Malé věci (pár příkazů) dělá rovnou.
- Sessions, které běží současně, pracují každá ve vlastním git worktree. Před pushem rebase na
  `origin/main`; číslo migrace (`SCHEMA_VERSION`) sjednotit až po rebase.
- Do zadání každé session: pravidla `CLAUDE.md`, push do `main` po zelených testech, jedna kontrola CI.
- Push změn, které by mohly kolidovat, a nové velké kroky jen se souhlasem uživatele vysloveným v chatu.
- Uživatel má tarif Max; úzkým hrdlem je jeho testování, ne počet sessions.
