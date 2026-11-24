# BIM-light – kontrolní seznam: dokumentace pro povolení stavby

Cíl **[R]**: BIM-light musí zvládnout výkresovou část dokumentace pro povolení stavby (rodinné domy, rekonstrukce) bez dodělávky v AutoCADu. Podklad: vyhláška č. 131/2024 Sb., o dokumentaci staveb, příloha č. 1. Ověřit proti aktuálnímu znění vyhlášky před pilotním projektem.

Stav: ✅ = pokryto v katalogu rozhodnutí · 🟡 = částečně / v poznámkách · ❌ = chybí, doplnit

## Části dokumentace
- **A Průvodní list, B Souhrnná technická zpráva** – textové, mimo program. 🟡 AI může připravit koncept z dat modelu (plochy, skladby, materiály, stavy, výšky, poloha).
- **C Situační výkresy** – viz níže.
- **D Dokumentace objektů** – D.1.1 architektonicko-stavební řešení (níže); D.1.2 základní stavebně konstrukční a D.1.3 požárně bezpečnostní řešení obvykle zpracovávají specialisté – BIM-light jim dává podklad (DXF/IFC).
- **Dokladová část** – mimo program.

## C – Situační výkresy
| Výkres | Požadavek vyhlášky | BIM-light | Stav |
|---|---|---|---|
| C.1 Širší vztahy | zákres stavby a napojení na dopravní a technickou infrastrukturu, hranice pozemků | podklad mapy ČÚZK (otevřená data, S-JTSK – základ 17) + 2D kresba | ❌ import mapového podkladu |
| C.2 Katastrální situace | stavba a pozemky na podkladu katastrální mapy, vazby a vlivy na okolí | import katastrální mapy (ČÚZK) v S-JTSK | ❌ import katastru |
| C.3 Koordinační situace (max. 1:200) | stávající stavby, infrastruktura, hranice a parc. čísla, výškopis a polohopis, ±0,00 v Bpv, upravený terén, max. výška staveb, navržené/odstraňované stavby, komunikace a zpevněné plochy, vegetace, okótované odstupy, zábory, hranice staveniště a vjezd, odstupy, požárně nebezpečné prostory, přístup a nástupní plochy hasičů, zdroje požární vody | ±0,00 v Bpv ✅ (zákl. 17), terén a upravený terén ✅ (sekce 12), stavy ✅, kóty ✅; chybí: katastr, prvky situace (zpevněné plochy, komunikace, vegetace, hranice staveniště, zábory, sítě/přípojky), požárně nebezpečný prostor (v poznámkách jako analýza) | 🟡 |
| C.4 Speciální výkresy | ochranná pásma, chráněná území, sondy, organizace výstavby… | 2D kresba + hladiny | 🟡 |
| C.5 Dělení/scelení pozemků | v měřítku katastrální mapy | katastr + kresba | ❌ (vzácné) |

## D.1.1 Architektonicko-stavební řešení – výkresy
| Výkres | Požadavek vyhlášky | BIM-light | Stav |
|---|---|---|---|
| Půdorysy všech podlaží | se zohledněním statických prvků a s popisem funkčních ploch | půdorysy z modelu ✅, místnosti a plochy podle ČSN 73 4301 ✅, sady zobrazení ✅, fáze ✅ | ✅ |
| Charakteristické řezy | typický svislý řez schodištěm nebo řezy navazující na stávající zástavbu, s ohledem na hloubku založení | **řezy generované z modelu [R]**; potřeba základy (pasy, patky) a okolní zástavba | ❌ řezy, ❌ základy, ❌ okolní zástavba |
| Základní pohledy | vč. začlenění stavby do stávající zástavby nebo krajiny | **pohledy generované z modelu [R]** + okolní budovy (zjednodušené hmoty) + terén | ❌ pohledy, ❌ okolní zástavba |

## Společné pro všechny výkresy
| Požadavek | BIM-light | Stav |
|---|---|---|
| Výkresové listy, formát, měřítko | rozvržení pohledů na list | 🟡 v poznámkách (PDF podle velikosti výkresu) |
| Razítko | razítko z údajů projektu | 🟡 v poznámkách |
| Export PDF | PDF z listů | 🟡 v poznámkách |
| Export DXF (podklad pro specialisty, záloha) | DXF s hladinami | ✅ |
| České zvyklosti kreslení | značky, kóty, šrafy, výškové kóty, popisy | ✅ (sekce 2, 4, 5, 7) |
| Doplňkové 2D výkresy a detaily (bez AutoCADu) | 2D výkresy jako v AutoCADu, import DXF a PDF podkladu, vložení na list | ✅ (sekce 20) |

## Co doplnit do katalogu (souhrn ❌)
1. Řezy a pohledy generované z modelu (výškové kóty, popis skladeb, podrobnost podle sady).
2. Základy (pasy, patky, deska) – kvůli hloubce založení v řezu a výkopům.
3. Okolní zástavba – zjednodušené hmoty pro pohledy a situaci.
4. Import katastrální mapy a mapového podkladu ČÚZK (S-JTSK).
5. Prvky situace: zpevněné plochy, komunikace, vegetace, hranice staveniště, zábory, přípojky.
6. Výkresové listy + razítko + PDF (z poznámek formalizovat).
7. Požárně nebezpečný prostor (analýza z poznámek) – pro C.3.

Postup: pilotní projekt (menší rekonstrukce) souběžně s jistotou AutoCADu; zapisovat, co chybělo, a doplňovat sem.
