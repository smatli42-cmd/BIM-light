# BIM-light – stav práce

Aktualizuje Claude Code na konci každého kroku. Poslední změna: 2026-11-24, etapa 0 / krok 1 (kostra).

## Hotovo

### Krok 1 – kostra (2026-11-24)
- Monorepo (npm workspaces): `packages/core` (jádro bez DOM) a `apps/sandbox` (Vite + Preact, prázdné plátno).
- TypeScript strict, ESLint + Prettier, Vitest, Playwright (Chromium).
- ESLint hlídá, že jádro nevolá prohlížeč, disk ani UI (základy 9, 13) a že funkce mají do 50 řádků (varování).
- Kontrola velikosti souborů `npm run check:size` (`tools/check-size.mjs`, pravidla v `tools/size-rules.mjs`
  s testy, výjimky v `tools/size-exceptions.json`); běží v pre-commit hooku (husky) i v CI.
- GitHub Actions (`.github/workflows/ci.yml`): typecheck, lint, formátování, velikost, testy, e2e, sestavení;
  po zelených testech nasazení na GitHub Pages.
- `CLAUDE.md`, `README.md`, tento soubor.
- GitHub Pages zapnuté (Source: GitHub Actions): https://smatli42-cmd.github.io/BIM-light/

## Rozhodl Code (k potvrzení)

- Dokumenty v `docs/` nad 500 řádků nebo 40 KB dávají v `check:size` jen **varování**, ne chybu (dělí je jen
  uživatel, build kvůli nim nemá padat). `CLAUDE.md` nad 150 řádků je chyba.
- Kontrola velikosti počítá `.ts`, `.tsx`, `.md`; pomocné skripty `.mjs` v `tools/` nepočítá (jsou malé).
- Sandbox běží i lokálně na adrese `/BIM-light/` (stejně jako na Pages), aby se lokál a web nelišily.
- Testy v prohlížeči běží proti sestavené stránce (`vite preview`, port 4317), tedy stejně jako na Pages.
- Jádro se do sandboxu načítá přímo ze zdrojů TypeScriptu (bez samostatného sestavení balíčku).
- CI běží na Node LTS (`lts/*`); lokálně stačí Node 22 a novější.

## Otevřené

- Krok 2: jádro (model, stěna, příkazy, zobrazení) – v nové session, model Opus.

## Největší soubory (po kroku 1)

Výstup `npm run check:size`: varování 0, chyb 0.

| Řádky | Soubor |
|---|---|
| 23 | apps/sandbox/src/canvas/DrawingCanvas.tsx |
| 19 | apps/sandbox/playwright.config.ts |
| 18 | apps/sandbox/src/app/App.tsx |
| 17 | apps/sandbox/e2e/kostra.spec.ts |
| 10 | apps/sandbox/vite.config.ts |
