# Stav – 3D náhled (druhý paralelní proud)

Samostatná session ve vlastním worktree a větvi `claude/nahled-3d-4b94ee`. Jádro (`packages/core`) jen čte;
změny jádra si vyžádá od hlavní session (sekce níže). Sloučení do `main` přes PR po zelených testech a se
souhlasem uživatele.
PR: https://github.com/smatli42-cmd/BIM-light/pull/1 (otevřený 2026-11-27, čeká na sloučení desek do `main`).

## Hotovo (krok 1 – 3D okno, 2026-11-27)

- **Výpočet těles** `apps/sandbox/src/view3d/` (bez three.js, testy Vitest):
  - `solids.ts` – každá vrstva skladby stěny je těleso s barvou svého materiálu; půdorys vrstvy po napojení
    z jádra (`wallGeometry` s rovinou řezu pod vším), výška z `wallHeight` (vazba na podlaží, odsazení,
    přesahy vrstev nahoru a dolů); přímé i obloukové stěny.
  - `slice.ts` – otvory a niky bez 3D booleovských operací: výška vrstvy se rozdělí na pásy podle parapetu
    a nadpraží, v pásu se od půdorysu odečte půdorys otvoru (2D rozdíl, knihovna polygon-clipping).
  - `edges.ts` – obrysové hrany jako v Archicadu: obrys spodku a vršku, svislé rohy, na hranici pásů jen
    hrany otvoru (žádná čára přes celou fasádu).
  - `scene-model.ts` – co je vidět: stěny **všech podlaží** podle stylu, vrstev a **filtru rekonstrukce
    aktivního pohledu**; otvor skrytý filtrem stěnu nevyřízne; napojení jen mezi zobrazenými stěnami.
- **3D okno** vpravo vedle půdorysu (`View3DWindow.tsx`, `viewer.ts`, three.js 0.171):
  - levé tlačítko otáčí, prostřední a pravé posouvá, kolečko přibližuje ke kurzoru; Přizpůsobit; Zavřít.
  - **Zobrazit vše ve 3D** (Ctrl+F4, navíc Shift+F4) a **Zobrazit výběr ve 3D** (F4) – klávesy i tlačítka
    ve spodní liště (mezi Konstrukčním zobrazením a Fází) a v hlavičce 3D okna.
  - klik na stěnu ve 3D ji vybere (modře) i v půdorysu, Shift+klik přidá / ubere, klik do prázdna zruší;
    stěna jiného podlaží přepne aktivní okno na její podlaží.
  - odkaz `?…&3d` otevře 3D okno hned po načtení.
- Testy: `view3d/solids.test.ts`, `view3d/edges.test.ts` (Vitest), `e2e/nahled-3d.spec.ts` (Playwright).

## Hotovo (krok 2 – desky ve 3D, 2026-11-27)

- `main` s deskami D1 + D2 sloučen do větve (bez konfliktů).
- `view3d/slab-solids.ts`: deska = vrstvy skladby od spodního líce nahoru (`slabLevels`), každá vrstva těleso
  s barvou materiálu; strop i podlaha. Viditelnost jako u stěn (vrstva „Desky“, filtr rekonstrukce, pravidla).
- Klik na desku ve 3D ji vybere v půdorysu (Shift přidá / ubere), F4 ukáže vybrané desky.
- Testy: `view3d/slab-solids.test.ts`, e2e „deska je ve 3D…“; ukázka `dum` má ve 3D stěny i desky.

- **Barva povrchu přes funkci grafiky** (požadavek 3 splněn v `main`, fffa6dd): barva ve 3D =
  `resolveGraphics(...).effect.surfaceColor ?? barva materiálu` pro stěny i desky; přebarví všechny vrstvy prvku.

## Co zkusit

- `?ukazka=dum&3d` → spodní lišta **Přepisy** (kombinace) → *Fáze – bourací práce*: bouraná příčka zežloutne
  v půdorysu i ve 3D.

- Uživatel vyzkoušel 2026-11-27: „3D náhled funguje“ (lokálně, `?ukazka=dum&3d`).
- `…/BIM-light/?ukazka=desky&3d` a `?ukazka=desky-kresleni&3d` – stropy a podlahy ve 3D; klik na desku ji
  vybere; nakresli novou desku nástrojem S a hned je ve 3D.
- `…/BIM-light/?ukazka=dum&3d` – dům ve 3D: obě podlaží, zateplení (barvy vrstev v ostění), okna a nika,
  oblouková příčka. Otáčet levým tlačítkem, posouvat pravým, kolečko.
- Ve spodní liště **Fáze** → Plánovaný stav: bouraná příčka zmizí i ve 3D; Stávající stav: nové příčky zmizí.
- Panel **Vrstvy**: skrýt vrstvu stěn → zmizí i ve 3D.
- Vybrat stěnu v půdorysu → **F4** (jen ona), **Shift+F4** zpět celý dům. Kliknout na stěnu 2.NP ve 3D →
  půdorys přejde na 2.NP a stěna je vybraná.

## Rozhodl Code (k potvrzení)

- **Knihovna three.js** (nejrozšířenější WebGL knihovna, MIT, umí i export glTF pro 3ds Max – rozhodnutí 14);
  na 2D rozdíl mnohoúhelníků **polygon-clipping** (MIT). WebGPU render (rozhodnutí 14) až v etapě render.
- **Ctrl+F4 si v Chromu bere prohlížeč** (zavře kartu), proto navíc **Shift+F4** = Zobrazit vše ve 3D.
  V desktopové verzi (Tauri) Ctrl+F4 projde.
- Myš jako OrbitControls: levé otáčí, prostřední i pravé posouvá (Archicad: prostřední posun, Shift+prostřední
  otáčení – lze přepnout podle přání).
- 3D okno je volba obrazovky (jako rozvržení oken), ne data modelu – nejde přes příkaz; stav drží
  `view3d/state.ts` vedle Session.
- 3D ukazuje všechna podlaží, styl, vrstvy a filtr rekonstrukce **aktivního okna**; F4 bez výběru = vše.
- Barva ve 3D = barva materiálu, přepíše ji jen pravidlo / styl s „barvou povrchu“ (ne výplň řezu);
  uživatel souhlasí 2026-11-27.
- Výběr ve 3D zvýrazní prvek barvou výběru (akcent rozhraní), ne obrysem.
- Typ s více výškovými pásy: vrstvy ve 3D zatím podle pásu v rovině řezu přes celou výšku (viz níže).

## Potřebuji od hlavní session (změny jádra)

1. **Exportovat `visibleWalls`** z `view/index.ts` (teď je jen interní). 3D si filtr skládá sám
   (`scene-model.ts`) a nedělá „rejoinOrphans“ (napojení konce na zobrazený konec po skryté stěně).
2. **Geometrie vrstev po výškových pásech:** `wallGeometry` vrací vrstvy jen pro pás v rovině řezu. Pro 3D
   by se hodila varianta pro zadaný pás (`wallGeometry(model, wall, cutPlane, bandIndex)` nebo
   `wallBandGeometry`), aby sokl / parapetní pás měl ve 3D svou skladbu.
3. ~~**Barva povrchu ve 3D přes funkci grafiky**~~ – hotovo (main fffa6dd) (základy 11, 30; jako „Override Surface“ v Archicadu /
   filtry pohledu v Revitu): do efektu pravidla a grafiky kategorie přidat položku `surfaceColor`
   (barva povrchu 3D, `null` = barva materiálu) s „proč“ a ve schématu balíčku stylů (`package-schema.ts`).
   Oddělit od `fillColor` (výplň řezu je ve Studii šedá – 3D by zešedlo). Pak 3D vezme barvu z
   `resolveGraphics(...).effect.surfaceColor ?? barva materiálu` a pravidlo „bourané žlutě“ platí i ve 3D.
4. **Dotaz pro AI** (základ 15) `queries/` – např. `model.solids` / `view3d.bounds`, až bude 3D potřebovat AI
   (zatím není potřeba: 3D okno nic v modelu nemění).

## Otevřené / další kroky

- Otvory v deskách (základ 19) – až je jádro bude mít, vyříznout stejně jako u stěn (`sliceLayer`).
- Povrchy místností (malby, obklady, spárořezy; návrh poslán hlavní session 2026-11-27, uživatel souhlasí):
  jádro spočítá plochy povrchů (obrys v rovině líce + transformace do 3D + spáry), 3D je jen zobrazí
  tenkou plochou před lícem a spáry čarami – stejná data jako rozvinutý pohled a výkaz.
- Řezová rovina / ořez 3D (3D výřez), skrýt podlaží, průsvitnost výběru.
- Kamery a scény, slunce podle polohy, materiály s texturou, export glTF/USD (rozhodnutí 14).
- Bundle sandboxu narostl o three.js (~600 kB); později načítat 3D okno až při otevření (dynamický import).
