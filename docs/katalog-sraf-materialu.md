# BIM-light – katalog: šrafy a materiály (průběžný)

Značení: **[R]** = rozhodl uživatel, **(já)** = Claude podle Revitu/Archicadu.
Navazuje na `katalog-pohledy-styly-zobrazeni.md` (základy 29, 30, 31, 32) a `rozhodnuti-koncepce-model-zobrazeni.md`, sekce 5 (šrafa je u materiálu). Základ 34 v `rozhodnuti-bim-light.md`.
Stav: **koncept z 2026-11-24; seznam materiálů (8 screenshotů), seznam šraf (5 screenshotů) a detail materiálu z arditu už máme.**

## ⚠ Základ od prvního dne
- **Šrafa je samostatná položka knihovny, materiál ji jen odkazuje. Barva je u materiálu, ne u šrafy.** [R] Stejná šrafa se používá u mnoha materiálů a liší se jen barvou (příklad z arditu: všechny druhy cihel, všechny kovy, všechny dřevěné materiály). Změna šrafy v knihovně se projeví u všech materiálů, které ji používají. Nesmí se stát, že šrafa je zabudovaná do materiálu nebo že existuje po jedné kopii na materiál.

## Vlastnosti materiálu (podle detailu z arditu) [R: zatím jen základní]
- **Teď ukládáme jen:** název (klíč, na který se odkazují prvky a skladby), kategorie, barva (u arditu „Barva 3D“), šrafa (půdorys a řezy), průhledný ve 3D (jako sklo), priorita spojování (od 2026-11-28 úroveň v tabulce priorit projektu, výš projede níž; výchozí podle kategorie, viz `docs/STAV-materialy.md`), poznámka. K tomu údaj „Použití“ (počet prvků a skladeb, spočítaný z modelu, ne uložený) a v arditu „výchozí u Stěna“ (materiál výchozí pro typ prvku; (já) jen pokud to bude snadné, jinak později).
- **Zatím NEDĚLÁME** (ardit je má, uživatel je teď nepočítá): tepelná vodivost λ, objemová hmotnost, měrná tepelná kapacita, uhlíková stopa GWP, faktor difuzního odporu μ, cena v konstrukci, vzduchová vrstva (R podle ČSN EN ISO 6946). Přidají se později jako další vlastnosti materiálu (nová verze schématu s migrací, základ 9); panel vlastností se generuje z popisu parametrů (základ 15b), takže přidání je záznam v popisu, ne nový panel.
- **Šrafa řezu a šrafa povrchu zvlášť (pokyn uživatele 2026-11-28):** materiál odkazuje dvě šrafy z knihovny –
  **řez** (řezaná konstrukce v půdorysu a řezu) a **povrch** (pohledová plocha ve fasádě, řezu za rovinou a
  případně ve 3D; např. obklad svislými lamelami, cihelný obklad, krytina). Každá může být „bez šrafy“ a jde
  přepsat pravidlem nebo přepisem prvku (základ 30). Povrchovou šrafu jde ve stylu pohledu zapnout / vypnout.
  Zatím neuděláno.
- **Barva:** materiál má jednu barvu (3D). Výplň a čáry šrafy v 2D se z ní výchozně odvodí (výplň světlá, čáry tmavé) a jde je přepsat u materiálu, pravidlem nebo přepisem prvku (základ 30). (já)
- Stav v arditu: 137 materiálů.

## Zdroj a tvar dat šraf
- **[R] Šrafy si děláme sami, jako data.** Ne kopie z arditu, Archicadu, Revitu ani AutoCADu (jejich knihovny jsou chráněné); konvence (diagonála pro zdivo, tečky pro štěrk, cik-cak pro izolaci) jsou obecné a kreslíme je vlastní. Jména a pořadí šraf převezmeme z arditu, kresba je naše.
- **Šrafa = seznam čárových rodin** {úhel, rozteč, posun, čárkování, případně body/tečky, kroužky, trojúhelníky, vlnovka}, stejný princip jako `.pat` v AutoCADu. Jedna definice dává náhled v panelu materiálů (čtvereček jako v arditu), kresbu v řezu i export DXF/PDF. (já)
- **Rozsah [R]:** chceme mít připravené **všechny** vzory ze seznamu níže; do první verze stačí asi 20 nejběžnějších. Knihovna šraf je otevřený seznam dat, ne pevný výčet v kódu; přidání nové šrafy nesmí vyžadovat změnu programu.
- **Velikost šrafy je pevná na papíře v mm (základ 29)**, tloušťka čar šrafy je číslo pera (základ 32, výchozí pero 1).
- **Přepis:** šrafu (i barvu) jde přepsat pravidlem nebo přepisem prvku (základ 30).
- **Vlastní šrafy:** editor (úhel, rozteč, čárkování) nebo popis pro AI s náhledem. Šrafy jsou součástí balíčku zobrazení (základ 31). (já)
- **„Odvozená“ šrafa (podle arditu):** ardit takto značí 13 šraf, které jsou variantou jiné šrafy. U nás jen volitelný odkaz „varianta šrafy X“ ve stejném seznamu, žádný zvláštní druh. (já)
- Import `.pat` z AutoCADu zatím neděláme; tvar dat ho později nevylučuje.

## Seznam šraf z arditu (pořadí jako v arditu, 2026-11-24)
Poznámka: ze screenshotu jsou jen názvy, bez náhledů. Vzhled šrafy podle názvu navrhneme sami a uživatel ho porovná s arditem. U 2 položek (Zdivo, Sendvičové konstrukce) jsou názvy v arditu tučně; bereme je jako základní šrafy, ke kterým patří varianty níže.

1. bez šrafy
2. Obecné (bez rozlišení hmot)
3. Terén (zemina)
4. Zásypy a násypy
5. Zeminy – kamenivo (odvozená)
6. Zeminy – čárky (odvozená)
7. Zeminy – šipky (odvozená)
8. Štěrk
9. Beton vyztužený (železobeton)
10. Beton nevyztužený (prostý)
11. Beton – kroužky (odvozená)
12. Beton – trojúhelníky (odvozená)
13. Beton – čárkovaná s kroužky (odvozená)
14. Zdivo (tučně)
15. Zdivo – mřížka
16. Zdivo – čárkovaná (odvozená)
17. Zdivo – hustá mřížka
18. Zdivo – svislice a šikmé (odvozená)
19. Dílce (prefabrikáty)
20. Dřevo
21. Sendvičové konstrukce (tučně)
22. Sendvič – křížky (odvozená)
23. Sendvič – kroužky (odvozená)
24. Tepelná izolace
25. Izolace obecná
26. Akustická izolace
27. Izolace – plástve (odvozená)
28. Izolace – trojúhelníky (odvozená)
29. Izolace – kroužky (odvozená)
30. Izolace proti vodě (vyčerněná)
31. Kámen (kromě zdiva)
32. Kovy
33. Sklo
34. Ploché sklo
35. Omítky, sádra, stěrky
36. Sádrokarton
37. Anhydrit (potěr)
38. Plasty, pryž, pružný tmel
39. Bourané konstrukce
40. Krytina

Otevřené: nevíme, zda mezi screenshoty a za položkou Krytina nechybí další šrafy; uživatel doplní, pokud ano.

## Co ukázal seznam materiálů z arditu (137 položek)
- Panel materiálu: náhled (šrafa + barva), název, kategorie, λ nebo „bez λ“ (λ u nás zatím ne). Rozbalením se otevírá editace; tlačítka Duplikovat a Smazat; údaj „Použití“.
- Kategorie: Dřevo; Zdivo; Beton a potěry; Izolace; Omítky; Kov; Sklo; Zemina a sypaniny; Ostatní.
- Seznam je velký a z velké části generovaný (podle uživatele ho dělala AI), tedy není to ručně vybraná sada. Šrafy se v něm opakují; **materiálů je mnohem víc než šraf** (137 materiálů proti 39 šrafám).
- Mnoho materiálů je jen plná barva bez šrafy (omítky, lepidla, fólie, hydroizolace, voda, plast, vzduch, topná rohož); v našem tvaru dat mají šrafu „bez šrafy“.

## Výchozí sada pro první verzi (~20, já)
Nejběžnější: bez šrafy, Obecné, Terén, Zásypy a násypy, Štěrk, Beton vyztužený, Beton nevyztužený, Zdivo, Dílce (prefabrikáty), Dřevo, Tepelná izolace, Izolace obecná, Akustická izolace, Izolace proti vodě, Kámen, Kovy, Sklo, Omítky/sádra/stěrky, Sádrokarton, Anhydrit, Plasty/pryž, Bourané konstrukce, Krytina. Zbytek jsou varianty (mřížky, kroužky, trojúhelníky…), které se dopíší stejným mechanismem.
