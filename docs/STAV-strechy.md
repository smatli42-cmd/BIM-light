# BIM-light – stav: střechy a krovy

Plán (schválený návrh uživatele 2026-11-28): **S1** jádro vícerovinné střechy, **S2** nástroj Střecha podle
Arditu, **S3** napojení stěn / podkroví / IFC, **S4** generátor krovu. Zadání: `docs/rozhodnuti-prvky-stavby.md`
sekce 11 (střechy a krovy) a 15 (otvory ve střeše, vikýře).

## Hotovo

### S1 – vícerovinná střecha v jádře, 2026-11-28 (scéna `?ukazka=strechy`, valbová střecha i v `?ukazka=dum`)

- **Data** (`roof/types.ts`, migrace 41 → 42): střecha = kategorie `roof`, IFC třída IfcRoof, vrstva Střechy.
  Uložený je jen obrys referenční čáry (mnohoúhelník proti směru hodin), u každé hrany `kind` sklon / štít,
  sklon (°) a přesah (mm vodorovně za ref. čáru), výška ref. čáry nad podlažím `refOffset` (základ 12),
  úhel řezu okapu (svisle / kolmo / vodorovně), typ, stav, varianta, podlaží. Typ střechy (`model.roofTypes`)
  = značka + skladba „pro střechu“.
- **Referenční rovina = spodní líc nosné vrstvy** (první vrstva skladby s funkcí `core` = krokve s izolací);
  vrstvy pod ní a nad ní se počítají kolmo k rovině (`roofLayerOffsets`).
- **Knihovna** (`roof/library.ts`, vymyšlená data): R1 Šikmá střecha, pálená krytina (SDK, parozábrana,
  krokve + izolace 200, pojistná HI, kontralatě, latě, krytina), R2 plechová krytina, R3 studená střecha bez
  podkroví; 5 nových materiálů (Dřevo a Sádrokarton se vezmou z projektu podle jména) a jejich šrafy.
- **Výpočet rovin** (`roof/skeleton.ts`, `faces.ts`, `planes.ts`): vážený straight skeleton – každá hrana se
  posouvá dovnitř svou rychlostí (1 / tg sklonu, štít stojí), události „hrana zmizí“ a „úžlabí narazí do
  protější hrany“, vlna s nulovou plochou = hřebeny. Zvládá L / T / U půdorysy s úžlabím, různé sklony,
  štíty a nepravidelné obrysy (náhodný test 150 obrysů). Přesah posune body na hraně ven (roh = průsečík
  posunutých hran), okap = ref. čára − přesah × tg sklonu.
- **Hrany střechy** (`roof/lines.ts`): okap, štít (štítová hrana), hřeben, nároží, úžlabí – druh z geometrie
  (vypouklá / vydutá hrana, sousední hrany obrysu = nároží).
- **Příkazy:** `roof.create` (obrys nebo obdélník; předvolba `shape` hip / gable / shed, nebo `edges` po
  hranách), `roof.setEdge` (druh, sklon, přesah vybraných hran), `roof.update` (typ, ref. čára, absolutní
  okap `eaveLevel`, úhel okapu, sklon a přesah všech hran, stav), `roof.move` (posun i kopie),
  `selection.delete` `roofIds`. **Dotazy:** `roof.list` (výšky, Okap abs., hřeben, tloušťka, plocha),
  `roof.planes` (roviny: 3D obrys, normála, eaveZ, plocha; hrany s druhem a délkou; štíty) – z něj bude
  číst generátor krovu (S4), `roofType.list`. AI `ai/scenario-roofs.test.ts`.
- **Půdorys** (`roof/draw.ts`): střecha v podlaží pohledu; nad rovinou řezu čárkovaně (okap, štít, hřeben,
  nároží, úžlabí), pod rovinou řezu plně (pohled dolů v podkroví), průsečík horního a spodního líce skladby
  s rovinou řezu perem řezu. Vše přes funkci grafiky (kategorie Střechy: pero 2 / řez 5, šrafa materiálu).
- **Řez** (`roof/solids.ts`, `roof/section.ts`): tělesa vrstev (rovina × vrstva; spoje v ose úhlu se sousední
  rovinou, štít svisle za přesahem, okap podle úhlu řezu) proříznutá rovinou řezu → plochy se šrafou
  materiálu (pás po sklonu); roviny za řezem = horní líc jako pohledová plocha. `section.elements` vrací
  i střechy.
- **3D** (`apps/sandbox/src/view3d/roof-solids.ts`): tělesa vrstev z jádra jako trojúhelníky v barvě
  materiálu, hrany = obrys roviny; ořezový kvádr i rovina řezu je oříznou (`clip-mesh.ts`); klik vybere.
- **Sandbox (minimum):** klik na hranu střechy (má přednost před stěnou pod ní) nebo do plochy (až po
  deskách) vybere střechu, tažení posune, Del smaže. Info box podle panelu Střecha v Arditu: Typ, Sklon
  (všechny hrany), Ref. čára nad podlahou podlaží, Ref. čára (abs.), Přesah, Úhel okapu, Okap (abs.) jen ke
  čtení, Skladba, Tloušťka kolmo, Roviny; hrany po jedné (sklon / štít a sklon); Stav; Smazat.
  E2E `strechy.spec.ts`.
- Ukázky: scéna `strechy` (valbová, sedlová se štíty, L s úžlabím a různými sklony v podkroví, Řez A),
  dům `dum` má valbovou střechu 35° nad 2.NP.

### Oprava rohů přesahu a štítky hran, 2026-11-28 (hlášení uživatele, scéna `?ukazka=strechy`)

- **Rohy při různých sklonech (třetí oprava, `roof/corners.ts`, jako Archicad / Ardit „Okap abs.“):**
  okapy všech šikmých rovin jsou v jedné výšce; rovina dál prochází referenční čárou ve výšce ref. čáry,
  takže mírnější rovina má delší vodorovný přesah (přesah = pokles / tg sklonu, pokles = největší ze
  „zadaný přesah × tg sklonu“ – každá hrana má aspoň svůj přesah). Obrys okapu je vlna kostry o pokles
  níž: každé nároží a úžlabí je jedna přímka od hřebene přes roh ref. čáry do rohu obrysu okapu.
  Ve vrstvách: roh okapu mezi dvěma rovinami je v každé vrstvě jeden společný bod na nároží vrstvy
  (`solids.ts` `eaveCorner`). Půdorys kreslí hrany horního líce a průsečíky s rovinou řezu na plochách
  vrstev (stejná tělesa jako 3D), takže se čáry v rozích potkají. Testy `roof/planes.test.ts` (okap v jedné
  výšce, nároží do rohu obrysu okapu, roviny přesně vyplní obrys okapu) a `roof/joins.test.ts` (L se třemi
  kombinacemi sklonů: spoje vrstev ve 3D, čáry průsečíku v půdorysu konec na konec, nároží až k okapu).
  Předchozí dva pokusy téhož dne (roh na nároží v okapu každé roviny zvlášť; nároží končí na prvním okapu)
  nechávaly v rozích mezery, schody nebo okap vedoucí uvnitř střechy.
- Vybraná střecha v půdorysu ukazuje u každé hrany štítek s číslem (jako v info boxu) a sklonem / „štít“,
  šipku ve směru stoupání roviny a referenční čáru čárkovaně (`apps/sandbox/src/render/roof-labels.ts`).

### S2 – nástroj Střecha, 2026-11-28 (pokyn uživatele; scéna `?ukazka=strechy-nastroj`)

- **Ikona a klávesa:** v paletě vedle Desky ikona Střecha (vlastní kresba – domek se střechou), klávesa
  **H** (volné byly C, E, G, H, I, J, Q, Y; „hřeben“), v registru jako zkratka příkazu `roof.create`.
- **Konstrukční metody** jako Deska / Ardit: mnohoúhelník, obdélník, natočený obdélník – stejné kreslení
  obrysu (přichytávání, pomocné čáry, tracker s čísly a Tab, dočasné kóty, Backspace, Esc; `slab-tool.ts`
  s cílem `roof`). Při kreslení náhled spočítané střechy (hřebeny, nároží, okap) – týž příkaz bez zápisu.
- **Info box nové střechy** (`RoofNewInfo.tsx`): Konstrukční metoda, Tvar (pultová / sedlová / valbová),
  Geometrie – Sklon, Ref. čára nad podlahou podlaží, Ref. čára (abs.), Přesah, Úhel okapu, Okap (abs.)
  jen ke čtení; Skladba – Typ, Tloušťka kolmo a Vrstva jen ke čtení; Stav. Výchozí metoda obdélník, valbová.
- **Úpravy v půdorysu:** klik na štítek hrany („2 · 35°“), na okapovou čáru nebo hranu ref. čáry vybrané
  střechy vybere hranu (zvýrazněný okap a štítek); info box → Hrany → Hrana N: druh sklon / štít, sklon,
  přesah (`roof.setEdge`); klik na řádek hrany ji vybere také. Modré úchopy v rozích ref. čáry se táhnou
  nebo kliknou (přichytávání, Alt vypne) – příkaz `roof.moveVertex`; tažení střechy posune (`roof.move`),
  Del, Ctrl+Z. Nový příkaz `roof.setOutline` (celý obrys, volitelně hrany) – AI krok v `scenario-roofs`.
- E2E `strechy-nastroj.spec.ts` (obdélník, náhled, hrana na štít, úchop bodu, Ctrl+Z).

### S2 – polovalba, střecha podle obrysu budovy, tažení hrany, 2026-11-28 (pokyn uživatele; scéna `?ukazka=strechy-polovalba`)

- **Polovalba** (`roof/halfhip.ts`, `skeleton-wave.ts`): druh hrany `halfhip` s výškou zlomu `breakHeight`
  (mm nad ref. čárou). Do výšky zlomu je hrana štít (svislá rovina, v kostře stojí), nad zlomem valba se
  sklonem hrany (v kostře se od výšky zlomu začne posouvat – událost „start hrany“). V `roof.planes` je
  valba polovalby samostatná rovina (spodní hrana = okap valby ve výšce zlomu, eaveZ) a štít pod zlomem
  v `gables`; nároží valby a štítové hrany sousedních rovin navazují i ve všech vrstvách (test
  `roof/halfhip.test.ts`). Předvolba **polovalbová**: kratší hrany čtyřúhelníku polovalba se zlomem
  v polovině výšky hřebene (po 10 mm). Příkaz `roof.setEdge` s `kind: 'halfhip'` a `breakHeight`.
  Info box: Tvar polovalbová; Hrana → druh polovalba, Výška zlomu nad ref. čárou, sklon, přesah; štítek
  „2 · polovalba 40°“. Přesah polovalby = přesah štítu (spodní svislá část), okap valby nad štítem.
- **Podle obrysu budovy** (`roof/from-walls.ts`): `roof.create` s `fromWalls: { point?, wallIds? }` –
  ref. čára = vnější smyčka sjednocení **jader** stěn podlaží (vnější líc nosné vrstvy, tam leží pozednice;
  zateplení a omítky jsou vně, střecha je přesahem překryje), bod uvnitř budovy vybere budovu; vybrané
  stěny obrys omezí. Výška ref. čáry = nejvyšší vršek obvodových stěn (vázaný na podlaží), když není
  `refOffset`. Nástroj Střecha → Konstrukční metoda „Podle obrysu budovy“: náhled střechy pod kurzorem,
  klik vytvoří (`roof-building-tool.ts`).
- **Tažení hrany**: kolečko uprostřed každé hrany ref. čáry vybrané střechy – tažení (nebo klik a klik)
  posune hranu rovnoběžně, sousední hrany se prodlouží / zkrátí po své přímce (základ 25); přichytávání,
  tracker Posun s číslem a Enter, Esc, jedno Undo (`roof-modes.ts`). Příkaz `roof.moveEdge` (index,
  distance kladně ven).
- AI `ai/scenario-roofs-s2.test.ts` (obrys budovy, polovalba, posun hrany), e2e `strechy-s2.spec.ts`.

## Rozhodl Code (k potvrzení)

- **Polovalba – parametr:** výška zlomu nad referenční čárou (mm), sklon valby = sklon hrany. Archicad
  polovalbu dělá jako štít do výšky + valbovou rovinu nad ním; výška je pro zaměření i výkres
  srozumitelnější než délka valby. Výchozí zlom předvolby = polovina výšky hřebene.
- **Obrys budovy:** ref. čára po vnějším líci nosné vrstvy (jádra) obvodových stěn – pozednice leží na
  zdivu; bez jádra (např. SDK) celá stěna. Výška ref. čáry = nejvyšší vršek obvodových stěn.

- **S2:** sedlová předvolba se na obrys, který není čtyřúhelník, nepoužije – nástroj vytvoří valbovou
  (štíty jde pak přepnout po hranách). Polovalbová v Tvaru zatím není (potřebuje výšku zlomu, viz Otevřené).

- **Okap v jedné výšce:** přesah zadaný u hrany je nejmenší vodorovný přesah; u mírnějších rovin se
  prodlouží tak, aby okap byl ve výšce okapu nejstrmější / nejdelší hrany (info box Okap abs. = jedna
  hodnota). Velmi mírná rovina vedle strmé tak může mít velký přesah.

- **Polovalba odložena:** v S1 jen sklon / štít po hranách. Polovalba (hrana se sklonem a výškou zlomu)
  a mansarda přijdou s nástrojem (S2) – vyžadují druhou rovinu nad jednou hranou.
- **Úhel řezu okapu „vodorovně“:** vodorovná rovina ve výšce horního líce skladby na okapové čáře (střecha
  v půdorysu nepřesáhne okapovou čáru; nižší vrstvy končí dál uvnitř). „Kolmo“ = rovina kolmá k rovině
  střechy přes okapovou čáru v referenční rovině.
- **Štít a přesah:** u štítové hrany přesah = přesah štítu (střecha přečnívá přes štítovou zeď); štít sám
  (svislý trojúhelník v ref. čáře) je v `roof.planes` → `gables` pro napojení štítové zdi (S3).
- **Rozdílné přesahy / sklony v rohu:** roh okapu je průsečík posunutých hran; nároží se nad přesahem
  ohne (jako Archicad bez ruční úpravy).
- **Výběr v půdorysu:** klik na hranu střechy má přednost před stěnou (střecha leží nad), klik do plochy
  až po deskách a místnostech.
- **Půdorys:** střecha se kreslí jen v podlaží, kterému patří (jako deska); v nižších podlažích ne.
- **Typ střechy je zvláštní seznam** `roofTypes` (jako typy desek), skladba je společná (Použít pro střechu).
- **Sklon 1–85°, přesah 0–3000 mm**; aspoň jedna hrana musí mít sklon.

## Otevřené

- Roviny téže střechy se v pohledu řezu navzájem nezakrývají (zakrývání bere jen jiné prvky).
- Šrafa / výplň průsečíku střechy s rovinou řezu v půdorysu (teď jen dvě čáry perem řezu).
- Výkaz střech (plochy rovin, délky hřebenů, okapů a úžlabí pro klempíře) – mechanismus výkazů.
- Mansarda (druhá rovina nad hranou se zlomem sklonu).
- Vložení / smazání bodu obrysu v půdorysu (zatím `roof.setOutline`).
- Střecha podle obrysu budovy se neváže na stěny (posun stěny ji nepřepočítá) – vazba jako u desky (S3).
- Stěny pod střechou se nedořezávají (štítová zeď, nadezdívka) – S3.

## Další krok

1. **S2 – zbytky:** mansarda, vložení / smazání bodu obrysu, vazba na stěny (Otevřené).
2. **S3 – napojení:** stěny se dořezávají ke střeše (štítová zeď pod střechu, nadezdívka), podkroví
   (výška místností pod střechou), IFC export IfcRoof složená z IfcSlab po rovinách.
3. **S4 – krov:** generátor vaznicové soustavy z `roof.planes` (krokve, pozednice, vaznice, kleštiny,
   nárožní a úžlabní krokve), trámy jako samostatné prvky se zámkem ruční úpravy (základ 16), kusovník.
