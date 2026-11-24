# BIM-light – obecná pravidla interakce (doplněk ke katalogům)

Doplňuje `rozhodnuti-bim-light.md` (základ 20; základ 25 je zapsán i tam) a `katalog-kresleni-sten-kotovani.md`. Tento soubor zůstává jako podrobný popis chování interakce (kóty, výběr, příkazy). Při rozporu se staršími texty platí tento soubor.

## Jak se pracuje (domluveno 2026-11-23)
Uživatel nechce chování po malých krůčcích zkoušet a vysvětlovat. **Standardní chování BIM programů (Revit, Archicad) se dělá rovnou v celé dávce.** Před každou další dávkou se proto projde kontrolní seznam níže: co se u daného prvku (stěna, kóta…) v BIM programech běžně dělá, co už máme a co chybí. Chybějící položky se dělají všechny najednou, uživatel jen dolaďuje detaily. Seznam se doplňuje, když se objeví něco, co v něm chybělo.
**Klik nikdy nedělá dvě věci najednou** (např. umístění kóty a zároveň výběr líce pro další kótu). Co vzniká, vzniká jen na výslovný klik.

## ⚠ Základ 25 – Vybraná entita se pohybuje, všechno ostatní zůstává na místě [R, 2026-11-23]

Platí v celém programu pro každý prvek a pro každý způsob změny (tažení, číslo v kótě, trvalá kóta, odsazení, příkaz).
- Při změně se pohne **právě ta entita, kterou uživatel vybral**. Co s ní má uložený vztah (navazující stěny, prvky na hostiteli – základ 24), se přizpůsobí. Vše ostatní stojí.
- Trvalá kóta mezi dvěma prvky: při změně hodnoty se hýbe ten z dvojice, který je **právě vybraný**; když není vybraný žádný, ten, který kótu vytvořil.
- Platí i pro přesun, otočení a šipky: pohnou se vybrané stěny, navazující stěny se natáhnou (na konci i uprostřed), nic dalšího se nehýbe.
- **Platí i pro umísťování kót: hýbe se jen to, co právě vzniká (nová kóta, nebo celá právě tvořená řada). Už usazené kóty z dřívějších sad stojí.**
- **Změna délky stěny: posune se ten konec, který uživatel uchopí** (tažením uzlu / koncového čtverečku) [R, 2026-11-23]. Přepínač trojúhelníkem u kóty zůstává jen pro zadání čísla do kóty.

## Kóty – pravidla [R, 2026-11-23]
1. **Zámek kóty se mění jen kliknutím na zámeček** (nebo v nabídce kóty). Změna čísla zámek nikdy sama nezapne ani nevypne.
2. **Každá nová kóta se po vytvoření nese na myši** bez držení tlačítka; klik ji umístí. Esc ji nechá na místě a ukončí řetěz.
3. **Kóty se samy zarovnávají** s čárou jiné rovnoběžné kóty poblíž (přichycení + světle modré vodítko). Zarovnání s dřívější řadou se uplatní po usazení řady.
4. **Zarovnané kóty tvoří skupinu a hýbou se spolu**, když se táhne už usazená kóta; Alt při tažení kótu vyjme. Skupina drží společnou polohu čáry i po změně geometrie.
5. Pole pro zadání čísla je čitelné (tmavý text).
6. **Kótu lze vybrat** (kliknutí na čáru nebo číslo), **smazat** (Del) a má **nabídku na pravé tlačítko:** Zamknout/Odemknout, Vyjmout ze skupiny zarovnání, Rozdělit rovnoměrně, Přepsat text kóty, Smazat kótu.
7. **Řetězová kóta (jako v Revitu):** v nástroji Kóta se klikají líce, **každý jen jednou**; od druhého líce vzniká řada kót a **celá řada se nese na myši**. **Klik do prázdna (mimo líc) řadu umístí a ukončí**; další klik na líc začíná novou, samostatnou sadu. Shift+klik na líc přeskočí úsek (např. tloušťku stěny). Líc se vybírá s tolerancí 12 px. Esc řadu nechá na místě a ukončí.
8. **Rozdělit rovnoměrně** (nabídka kóty ve skupině): mezilehlé stěny se posunou tak, aby všechny úseky řady byly stejně dlouhé (jednorázová akce).
9. **Úhlová kóta** (nástroj Úhel, U): klik na dvě stěny; číslo se mění kliknutím (otočí se vybraná stěna, jinak druhá), zámek funguje (0,05°).
10. **Přepsání textu kóty** (nabídka kóty); „Vrátit skutečnou hodnotu“ text zruší.
11. **Na jednom prvku (stejné dvojici líců, stejné délce) může být libovolně mnoho kót** (druhé sady) – duplicita se nikdy neodmítá.
12. **Kóty lze vybírat rámečkem spolu se stěnami**, Shift+klik na kótu přidá/ubere; **Del smaže všechny vybrané kóty (a vybrané stěny) najednou.** Jedna kliknutím vybraná kóta se maže samostatně.
13. **Skupina anotací (základ 28):** každá kóta patří podlaží a má skupinu anotací (např. studie / DSP a PPS / PPS); nová kóta jde do aktivní skupiny. **Skupina anotací (vrstva, viditelnost podle stylu) a skupina zarovnání (pravidlo 4, hýbou se spolu) jsou dvě různé věci.** Zarovnání kót a úhlové kóty jsou uložené jako vlastnost kóty v modelu (základy 1, 4).

## Výběr [R-standard, 2026-11-23]
- Klik = jedna stěna, Shift+klik přidá/ubere, tažení z prázdného místa = rámeček (stěny i kóty; zleva doprava jen celé, zprava doleva i protnuté), Ctrl+A vše, Esc zruší, Del smaže vybrané.
- Při více vybraných se dočasné kóty nezobrazují; typ, tloušťka a strana v panelu platí pro všechny vybrané stěny.
- Tab střídá překrývající se stěny pod kurzorem. Pravé tlačítko na stěně: nabídka (Vybrat stejný typ, Přesunout, Kopírovat, Otočit, Zrcadlit, Pole, Smazat).

## Příkazy nad výběrem a úpravy (prototyp v8)
Lišta vlevo + klávesy: Přesun **M**, Kopie **K**, Otočit **R**, Zrcadlit **F** (Shift+klik původní stěny nahradí), Pole **P**, Zarovnat **L**, Do rohu **T**, Rozdělit **X**, Obdélník **B**, Úhel **U**. Základní bod se přichytává, vzdálenost/úhel/rozměry lze psát a potvrdit Enterem. Ctrl+C / Ctrl+V / Ctrl+D, šipky posouvají výběr (10 mm, Shift 100, Ctrl 1000). Pohled: Home, Z, tlačítka Výběr / Okno.

## Okótování celé stěny (návrh k potvrzení, až budou otvory)
Jedním příkazem se podél vybrané stěny vytvoří řady kót podle standardu (Archicad „automatic dimensioning“): (1) celková délka, (2) úseky mezi navazujícími stěnami a příčkami, (3) otvory (šířka otvoru, vzdálenosti mezi otvory a od rohů; u oken parapet jako výšková kóta). Vyžaduje **otvory ve stěně (základ 19) a okna/dveře (sekce 2)**, proto se dělá až s nimi a ověří se na nich.
K rozhodnutí až s otvory: k čemu se otvor kótuje (hrany otvoru / osa / ostění), která strana stěny a kolik řad, zda je kóta asociativní (přepočítává se při změně stěny) nebo se jen vytvoří, jak se chovají zámky a zarovnání u vygenerovaných kót (použít stejný mechanismus skupiny zarovnaných kót).

## Kontrolní seznam standardního chování (stav po prototypu v12)

**Hotovo v prototypu (v pískovišti se dělá znovu a čistě):** vše výše + kreslení stěny řetězem s trackerem a přichytáváním, dočasné kóty + změna číslem, trvalé kóty se zámkem, posun uzlu, odsazení líce s natažením navazujících stěn, přidání bodu, změna tloušťky/typu, mezerník strana, Undo/Redo.

**V prototypu chybělo; patří do etapy 0 (pískoviště) (já):** přepnutí strany odkazových čar kóty, filtr výběru podle kategorie, vybrat čáru → stěna, radiální pole, otočení s kopií, přesun tažením celého výběru myší.

**Mimo etapu 0 (potřebují otvory, okna, oblouk nebo 3D):** okótování celé stěny (viz výše), výškové kóty, kóta poloměru, oblouk (kreslení), okna a dveře.

## Potvrzeno z prototypu [R, 2026-11-23]
- Úhel v trackeru: **90° = zatáčka doprava, 270° doleva**.
- Změna délky stěny: posune se konec, který uživatel uchopí (viz základ 25).
