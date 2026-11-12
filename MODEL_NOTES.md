# Model notes

These are the readings behind each procedural model: what was measured, what was read off a sheet, and what was guessed.
Each model's parameters live in a data file (`src/models/<slug>.data.ts`). A correction should be an edit there, not a rebuild.

Confidence tags used below:
- **[stated]**: written on a sheet, or in `content.json`, as a number or a fact.
- **[measured]**: scaled off a drawing with the method described. Expect ±5–10 %.
- **[read]**: inferred from a render or drawing, with no number given.
- **[assumed]**: no source; chosen so the model holds together. Replace if better information turns up.

---

## 1. Residential School, Kanoi, Jaisalmer (PDF p9–15)

### Sources used
| Sheet | What it gave |
|---|---|
| p11 masterplan (crop `masterplan.jpg`, 2120×1740 px) | Every footprint position, rotation and size. Roads, lake, playground, amphitheatre, parking. North arrow points straight up the sheet. |
| p11 roof plan | Roof breaks: academic block in 4 strips, admin in 3, a bridge from academic (5) to library (6). Hostels and staff houses 10–14 read as plain flat roofs. |
| p11 section X-X′ | Ground rises from the hostels (low, left) through the mess and library to the academic block (high, right). Leftmost building is three storeys. |
| p10 climate and topography | Contour bands in 4 m steps: below 149 m to above 173 m. High ground on the west and south-west, low ground to the north-east, lake in the low band. Sun path east–west through the south. Wind from the south-west to the north-east. |
| p10 concept | "Formation of courtyards" (solid block cut into masses around a green court), yellow sandstone, jalis, "design along contours". |
| p12 admin | Ground storey on three levels, principal at top, admin middle, entrance, display and cafeteria at the bottom. Big arched gateway at the low (east) end. |
| p13 academic | G+1 bars stepping down the slope. First ground floor 161 m, last 167 m **[stated]**. Upper floors open as arcades under shallow vaults. |
| p14 library and sports | Library G+1, 159 m to 157 m **[stated]**, central court with ramps and jali walls. Sports block G+1 with a badminton court courtyard and stepped seating toward the playground. |
| p15 mess | Ground storey, level 156 m **[stated]**. Section levels +0.3, +2.7, +3.8, +6.3 m **[stated]**. Mono-pitch roof falling from the kitchen to the dining end. Chamfered corners with arched entrance porches. |
| p9 cover | Courtyard with crossing ramps between two sandstone walls clad in square-hole jali. |

### Scale
- The 1:200 and 1:100 labels do not hold at the printed A3 size (an academic classroom would come out 3.4 m wide), so no dimension is taken from a printed scale bar.
- Masterplan scale is set from three independent checks, all against the masterplan crop:
  - The driveway is labelled "6 m wide" **[stated]** and measures about 40 px.
  - The mess measures 180×163 px; its own 1:100 section, scaled by its stated heights, gives about 22.7×25.6 m.
  - Academic classrooms come out about 6.8×8 m, a normal classroom size.
- Result: **7.0 px per metre** on the masterplan crop **[measured]**, ±5 %. The site comes out about 280 m east–west by 245 m north–south, roughly 5 ha. **No site area is stated anywhere**, so this is not checkable.

### Terrain
- **[read]** Bands from p10, mapped to the masterplan by the lake and the site outline.
- **[assumed]** The ground is modelled as a profile across the site (high west, low east) with a slight rise to the south. Profile knots, in metres east of the site centre against elevation: −150 → 174, −96 → 167, −54 → 161, −18 → 158, 25 → 156, 60 → 153, 87 → 150, 140 → 148.
  - This is fitted to the four stated building levels (academic 167/161 at its west/east edges, library 159/157, mess 156) and the band diagram. It is not a survey. The real contours on the masterplan are too faint to trace.
- **[assumed]** Water level 149.6 m, lake bed 148 m. The brief says the lake was slightly enlarged; the model uses the masterplan outline as drawn.
- Each building sits on a cut-and-fill pad at its level, blended into the slope over about 4 m. This is how "different levels follow the contours" reads in 3D.
- Vertical scale is true (1:1). The relief is about 26 m over 280 m.

### Blocks
Positions are masterplan-crop pixel centres converted at 7.0 px/m. Rotation: blocks 5 and 6 (academic and library) share one axis, turned 21.8° anticlockwise from east. Blocks 9–14 sit at about 45°. Blocks 1–4, 7 and 16 are square to north.

| # | Block | Footprint (m) | Floors | Level (m) | Basis |
|---|---|---|---|---|---|
| 1 | Security cabin | 5×5 | G | 158.5 | Footprint [measured]. Level [assumed]. |
| 2 | Auditorium | 22×21 hall with curved east end, 13×8 wing | One tall volume, 10 m | 162 | Footprint [measured]. **No drawings**: height and form [assumed]. |
| 3 | Entrance and admin | 52×27.6 in three tiers, an arcaded loggia and a gateway arch | G on three levels | 165 / 162 / 159, west to east | Tier split [measured] from p12 plans. Levels [assumed]; the sheet says only "three levels". |
| 4 | Multipurpose hall | 31×28 plus 4×9 porch | One tall volume, 9 m | 160.5 | Footprint [measured]. **No drawings** [assumed]. |
| 5 | Academic | 42.6×41.1: bars A–D of 7.3, 7.3, 7.4 and 8.6 m, 3.4 m ramped passages, 7 m cross passage | G+1 (A–C), G (D) | 167 / 165 / 163 / 161, west to east | Bars [measured] from p13. End levels [stated]. Middle two [assumed], evenly spaced. |
| 6 | Library and labs | 27.7×42.7: two G+1 bars, a central court with two ramps, a connector, a bridge from the academic block | G+1 | 159 west half, 157 east half | Levels [stated]. Split [read] from p14 section. |
| 7 | Indoor sports | 26.7×42.9, U-shape open east, west corners chamfered | G+1 | 157, court 155.5 | Footprint [measured]. Levels [assumed]. |
| 8 | Playground | 25.7×57.1 | — | 155 | [measured] / [assumed] |
| 9 | Mess | 23.6×25 with chamfered dining corners and two arched porches | G, mono-pitch 6.3 m falling to 3.9 m | 156 | Level and heights [stated]. Orientation [read]: kitchen and loading platform on the south-west, dining and porches on the north-east, matching the masterplan's table rows and chamfers. |
| 10 | Boys' hostel | 20.2×20.2 at 45° | G+2 | 156.5 | Footprint [measured]. Floors [read] from section X-X′. Level follows the ground [assumed]. |
| 11 | Faculty accommodation | 20.2×20.2 at 45° | G+2 | 155 | as above, floors [assumed] |
| 12 | Girls' hostel | 20.2×20.2 at 45° | G+2 | 153.5 | as above |
| — | Octagon between 10, 11, 12 and 9 | 13 across | G, arcaded | 155.5 | Drawn roofed on the roof plan; use not labelled [assumed]. |
| 13 | Director's house | 14.6×14.6 at 45° | G+1 | 153 | Footprint [measured]. Floors and level [assumed]. |
| 14 | Deputy director's house | 14.8×14.8 at 45° | G+1 | 151.5 | as above |
| 15 | Amphitheatre | Quarter ring, radius 16–22 m, 5 rows | — | 154 | Shape [read], made a true quarter circle |
| 16 | Parking | 24.3×20 | — | 157.5 | [measured] |
| 17 | Lake | Traced outline, about 35×54 m | — | water 149.6 | [measured] outline |

Levels marked [assumed] are the modelled ground at the block's centre, rounded to 0.5 m. Each building then gets a flat pad at that level.

Floor-to-floor height is 3.6 m throughout **[assumed]**. The academic section scales to about 3.3 m and the mess to 2.7–3.8 m; 3.6 m is a round figure between them. Parapets are 0.9 m **[assumed]**.

### Proportions and facade rhythm
- **[read]** Thick sandstone masses with small, deep, round-arched windows in a regular row. Openings are about 1.2 m wide by 2.1 m high, on a bay of about 3.5 m (academic and library elevations show 6–7 arches per bar face).
- **[read]** Academic upper floors: continuous arcades of wider segmental arches, about 3 m bays, with a jali balustrade band, and a shallow barrel vault over the highest bar (section p13).
- **[read]** Library: square-hole jali panels on the two court walls (cover p9), and a stepped jali screen in the middle of the front elevation.
- **[read]** Admin: lime-washed, paler than the rest in the renders. Arched gateway about 8 m span and 7 m high at the east end.
- **[read]** Mess: two big arched porches on the chamfered corners; five arched windows per long side.
- **[read]** Sports: two rows of arched windows; the upper floor is a gallery around the court.
- Hostels, staff housing, auditorium and multipurpose hall have **no elevations** in the portfolio. They use the same window rhythm as a stand-in [assumed].

### Roof
- Flat roofs with 0.9 m parapets everywhere **[read]** from the roof plan and renders, except:
  - the mess mono-pitch **[stated]** in its section;
  - a shallow barrel vault on academic bar A **[read]** from section p13.
- Crenellated parapets (kangura) appear on part of the admin block in one render. **Not modelled.**

### Materials
| Element | Material | Tint | Basis |
|---|---|---|---|
| Walls | Yellow Jaisalmer sandstone, matte | `--sandstone` #D9C29C | [stated] |
| Admin walls | Lime-washed sandstone | `--lime` #F4EFE6 | [read] from renders |
| Jali | Sandstone jali, square holes about 0.15 m on a 0.25 m grid | `--sandstone-shade` | [read] from cover |
| Openings | Deep reveals read as shade | charcoal at about 80 % | [read] |
| Ground | Site model ground, banded by contour | lime-deep to sandstone-shade ramp | Palette from DESIGN.md, not the sheet's green-to-brown |
| Water | Still, slightly glossy | muted blue-grey | [read] |
| Court lawns, playground | Courtyard green, used only for the voids | `--court` #7D8B6A | DESIGN.md rule |

### Idea model
- **Contour-layer model.** The ground snaps to its 4 m bands and the layers draw apart, like a cardboard site model. Each block rides on its own layer, so the stepping reads as "every building belongs to a contour".
- **Run-off.** Animated lines trace rainwater down the slope through the gaps between blocks to the lake. This illustrates the brief's "space left between structures so rainwater can flow to the lake".
- **Wind.** Arrows from the south-west, as on p10.
- **Courts.** Courts are shown in court green: the library court, sports court, academic passages and hostel octagon.
- The run-off paths are computed by steepest descent on the modelled ground. They are a diagram of the idea, **not** a drainage design from the sheets.

### Known simplifications (decided before building)
- Interiors, stairs, lifts, classrooms and furniture are not modelled. Ramps appear only as sloped slabs in the library court and between academic bars.
- Trees are scattered procedurally (seeded) at roughly the masterplan's density, not traced one by one.
- Interior paths are simplified to the driveway, the 3 m walkway and the main paved aprons.
- The site section follows the academic–library–mess axis, which those three blocks share on the masterplan. That is the X-X′ line as best it can be placed. The sheet does not draw the section line on the masterplan.

### Verification (renders against the sheets)
Method: headless renders from `dev/model.html` (dev only, not built), compared side by side with the PDF crops. A near-orthographic top view, rendered at the masterplan's own 7 px/m, was overlaid at 50 % on `masterplan.jpg`.

**Matches**
- **Plan.** Every footprint registers on the masterplan overlay with no visible offset: position, rotation and size of all 17 elements, the roads and the lake. This also confirms the 7 px/m scale.
- **Academic block section.** The site section X-X′ shows the four academic bars stepping down from west to east, with the vault on the highest bar and the single-storey bar D, as in the p13 section.
- **Site section.** Ground falls from the academic block, through the library, to the hostels. That is the same order and direction as the p11 site section. The library court and its ramps are cut through.
- **Mess.** Mono-pitch roof falling away from the kitchen, chamfered dining corners, ground storey (p15).
- **Sports block.** U-shape opening east, sunken court, stepped seating toward the playground, G+1 with two rows of arched windows (p14).
- **Library court.** Square-hole jali on both court walls, with ramps between them, as on the cover sheet (p9).

**Differs from the real design** (known, not fixed)
- **Academic roof and massing.** The render shows one fort-like mass: continuous upper-floor arcades, a jali balustrade band, and a large light shell roof over the top terrace. The model shows four separate bars with flat roofs and a single small vault, so it reads as a row of blocks rather than one stepped building. The real section on p13 also shows deeper floor plates than the model's 7.3 m bars.
- **Academic front elevation.** It has a large central entrance void, which is not modelled.
- **Admin gateway.** In the render the arch is much larger, wider than the road, springing from the building corner to a free pier. The model's 8.6 m arch is smaller.
- **Admin finishes.** The render shows a crenellated (kangura) parapet and blue-framed windows. Neither is modelled.
- **Admin levels.** The section's level drops look larger (about 4–5 m) than the model's 3 m steps.
- **Mess porches.** The render shows a deep arched hood with steps up to a timber door. The model has a simple pierced slab.
- **Windows everywhere.** The renders show projecting arched hoods (chhajja) over each window, timber frames, and coursed sandstone. The model uses flat dark arched openings on plain walls.
- **Sports court.** The render shows it paved grey. The model colours it court green, following the DESIGN.md rule for voids and the green court on the p14 plan.
- **Library central jali.** The stepped jali screen in the middle of the front elevation is not modelled.
- **Unknown buildings.** Hostels, staff houses, the auditorium, the multipurpose hall and the octagon have no drawings. Their heights, storeys and windows are stand-ins, and should not be read as the design.
- **Interior site paths.** These are simplified. The masterplan's network of paved paths and steps between blocks is mostly missing.
- **Trees.** Scattered by a seeded random process, not traced.

**Guessed, and could be wrong**
- **Terrain.** The ground surface is fitted to four stated levels and the band diagram. It is not traced from contours. Local dips, rises and the true lake banks are unknown.
- **Unstated levels.** All levels not tagged [stated] (see the table).
- **Section X-X′ line.** The line on the masterplan is inferred: no section line is drawn there.

---

## 2. Irshalpada Rehabilitation, Irshalwadi, Raigad (PDF p37–43)

Competition entry. The sheets say "we" (team entry). Credits are still to be confirmed.

### Sources used
| Sheet | What it gave |
|---|---|
| p38 neighbourhood render (top-down, top right of the sheet) | Layout of 11 clusters around a central green, the primary school and the Temple of Memories, plus roads and a south green. North taken as up, as on the p38 site map. |
| p40 cluster plan, roof plan, sections AA′/BB′, front elevation | Cluster of 4 plots: 2 ground+1 houses side by side at the back, 2 ground-storey houses turned to face a shared court that opens forward. Roof wings and hips. Levels +600 (plinth) and +8500 (G+1 ridge) **[stated]**. |
| p41 ground-storey house plan, roof, sections | Rooms (living, kitchen, 2 bedrooms, separate toilet and bath on the same plinth), central courtyard with a tree, verandahs with timber posts. Levels +600, +1500, +3100, +5900 **[stated]**. Terracotta jali to the cooking space **[stated]**. |
| p42 ground+1 house plan, first floor, roof, sections | The same plan mirrored, with a stair, and 2 bedrooms and a balcony upstairs. Levels +600, +2600, +3100, +3500, +4600, +5800, +8500 **[stated]**. |
| p43 primary school plan, roof, sections | A main block with a gable roof, and three stepped classroom wings on each side around a multipurpose area. Levels +600, +2700, +5300, +5800 **[stated]**. |
| p39 Temple of Memories render | Tall black folded plates holding a rough stone, on a three-step stone plinth, in a pool ringed by a stone seating wall. **No plan or dimensions.** |

### Scale (the sheet scales disagree)
- The labels (1:50, 1:100, 1:200) do not hold at the printed size, and the drawings on one sheet are not even in proportion to each other.
- The sections' stated heights give their own scale, but horizontal sizes taken that way come out about 1.3× larger than the plans would give at their own labels.
- Resolution, in this order:
  1. **Heights are taken only from the stated levels.**
  2. Plan scale is set so the cluster's width agrees with section BB′ and the elevation (about 40 m). The school plan at the same scale then comes out about 38 m wide, which agrees with its size relative to the clusters in the p38 render.
  3. Result: **18.6 px/m** on the p40 and p43 originals, 22.2 px/m on p41, and 24 px/m on p42 (each house plan fitted to its footprint in the cluster).
- Room sizes then read as believable: bedrooms about 3.5 m, living rooms about 4.5×5 m, double doors about 1.4 m.
- **Uncertainty is about ±20 %.** Everything horizontal scales together, so a correction is one number per sheet.
- Neighbourhood layout: 4.63 px/m on the p38 render, calibrated from the cluster width. The neighbourhood comes out about 190 × 175 m. **No site area is given for this part of the site.** The p38 site map's 9 m and 12 m road labels are not used: that map is a different, larger plot layout.

### Footprint and floors
| Element | Size (m) | Floors | Levels (m above ground) | Basis |
|---|---|---|---|---|
| Ground-storey house | 17.7 × 14.4, L-shaped plinth | G | plinth 0.6, eaves 3.1, ridge ≤ 5.9 | Plan [measured], levels [stated] |
| Ground+1 house | 15.6 × 13.5, L-shaped plinth | G+1 over the kitchen and bedroom, single storey elsewhere | plinth 0.6, first floor 3.5, upper eaves 5.8, ridge 8.5; lower roofs eaves 3.1 | Plan [measured], levels [stated] |
| Cluster | 39.4 × 29.2, court about 10.6 m wide opening forward | 2 × G+1 + 2 × G | — | [measured] from p40 |
| Primary school | 38.4 × 19.5 | G | plinth 0.6, eaves 2.7, ridges 5.3 (wings) and 5.8 (main) | Plan [measured], levels [stated] |
| Temple of Memories | 4 black plates, 6 m tall, on the sides of a square turned 45° (2.7 m to each corner), with 0.5 m slits at the corners; plinth 8.4, 7.2 and 6.0 m in steps of 0.45 m; pool 12.5 m in a 14.5 m seating ring | — | — | **All [assumed]**, proportioned from the single render |
| Clusters in the neighbourhood | 11: 3 across the north, 3 down each side, 2 to the south facing north across the green | — | — | Positions [measured] from p38, ±2 m |

Room walls are CSEB, 0.23 m thick **[assumed]**, from plinth top to eaves. The first floor of the G+1 is a bamboo slab **[stated]**, modelled as a 0.2 m slab.

### Proportions and rhythm
- Low, wide houses under big, steep, overhanging roofs. In the elevations the roof is nearly as tall as the wall below it **[read]**. Ridge and eave heights are **[stated]**; the pitches follow from them. Eaves overhang 0.6 m **[read]**.
- Verandahs on turned timber posts at about 2.5–3 m spacing, along each courtyard and front entrance **[read]**.
- Small windows with timber shutters, one or two per room face **[read]**.
- G+1: upper storey set back over the rear rooms, with a balcony and railing facing the court **[read]**.
- The school's stepped wings form a forecourt that opens south across the green to the temple **[read]**.

### Roof
- Read from the roof plans' slope arrows: two arrows on a wing make a gable, one arrow makes a lean-to.
- **Ground-storey house:** three gabled wings. Two gable ends face the front, as on the p41 front elevation. Eaves +3.1, ridge +5.9 **[stated]**.
- **Ground+1 house:** an upper gable, eaves +5.8 to ridge +8.5 **[stated]**. Two lower lean-tos, +2.6 to +4.6 **[stated]**, matching p42's labels. Across a mirrored pair, the two front lean-tos meet in the low central gable on the p40 front elevation.
- **School:** gables **[stated]**.
- **Junctions:** wings overlap where they meet. Real valleys and junctions are not resolved.
- **First build error, since fixed:** the first build used hip roofs throughout, a misreading of the arrows. The renders showed the gable ends.

### Materials
| Element | Material | Tint | Basis |
|---|---|---|---|
| Walls | CSEB with lime plaster, white | `--lime` #F4EFE6 | [stated] CSEB and lime; white [read] |
| Roofs | Mangalore tile | Muted terracotta #A85A3C | [stated] |
| Posts, shutters, railings | Timber | Dark brown #5A3A26 | [read] |
| Plinth and floors | Stone plinth, mud floor | #CDBFA8 | [stated] (mud floor) / [read] |
| Kitchen jali | Terracotta | #B4623E | [stated] |
| Temple plates | Black stone | `--charcoal` | [read] |
| Courts and green | Lawn | `--court` #7D8B6A | DESIGN.md rule for voids |

### Idea model: nested courts
- Roofs lift and turn to ghosts, so the room plans show.
- Every void is drawn as one system: house courtyard → cluster court → central green → Temple of Memories. Lines link each cluster court to the temple.
- This illustrates the brief's "home, community and memory". It is a diagram, not a drawing from the sheets.

### Known simplifications (decided before building)
- **Doors:** not modelled. Rooms are closed wall rings.
- **Woodwork:** shutters are flat panels. Carved timber valances, railings' detail and the turned post profiles are not modelled.
- **Repetition:** every cluster is the same p40 cluster, rotated, though the render may vary them slightly. Mirroring follows p40.
- **Context:** distant low hills are [assumed]. They stand for the Sahyadri setting and are not traced.
- **Trees:** placed at the plan's courtyard trees, plus a seeded scatter on the greens.

### Verification (renders against the sheets)
Method: headless renders from `dev/model.html?model=irshalpada`, compared side by side with the sheet renders. A near-orthographic top view was compared with the p38 neighbourhood render.

**Matches**
- **Neighbourhood plan.** All 11 clusters sit where the p38 render puts them, each turned so its court opens the same way. School, temple, green, south green, ring roads and entry road are in the same places.
- **Cluster.** Two G+1 houses side by side at the back, two ground-storey houses turned to face each other, and a shared lawn court open at the front (p40).
- **Roof forms.** White gable ends face the court and the street. The G+1 pair's lean-tos meet in a central gable, as on the p40 front elevation.
- **Heights.** Plinth, eaves and ridge levels are as written on the sections.
- **Temple.** Seen from the front, two broad black plates meet in a V with a slit, on a stepped plinth in a square pool (p39).

**Differs from the real design** (known, not fixed)
- **Plan scale.** Uncertain by about ±20 %, because the sheets disagree. Everything scales together, so proportions hold, but absolute sizes may not.
- **Junctions and gables.** The renders show deep timber gable fascias and valances, and the roofs meet in proper valleys. The model has plain overlapping wings.
- **Verandahs.** The renders show stepped plinths with broad steps up to each verandah, and turned timber posts on stone bases. The model has a flat plinth and plain cylinders.
- **Doors and windows.** No doors are modelled. Windows are simple shutter panels, and the renders' door and window rhythm is not followed exactly.
- **Repetition.** All 11 clusters are identical copies; the renders may vary details between clusters.
- **Trees and paths.** The renders are much leafier, with many more trees, hedges and paved paths. The model has courtyard trees and a few garden trees.
- **School.** Wings are solid volumes with no rooms or doors. The stage and multipurpose area are a raised slab.
- **Temple.** Plates are flat; the render's plates may be folded, and their texture reads as a rough stone finish. The rough stone held at the top is only a stand-in.

**Guessed, and could be wrong**
- **Temple.** Every temple dimension, and the number and arrangement of the plates.
- **Plan scale.** The scale per sheet, as above.
- **Hills.** The distant hills.
- **North.** Taken as up on the p38 render.

---

## 3. Mass Housing, Byculla, Mumbai (PDF p3–8)

### Sources used
| Sheet | What it gave |
|---|---|
| p3 site analysis, concept, design progression, area tables | Site area 25,785.7 m² **[stated]**. Wind from the south-west to the north-east **[stated]**. Four design stages **[stated captions]**. Unit mix 2BHK 560, 3BHK 312, 4BHK 160 = 1,032 **[stated]**. Parking: 3 basements, ground and 6 podium levels **[stated]**. |
| p4 ground floor plan, roof plan, sections XX′ and YY′ | Podium outlines, tower positions and outlines (roof plan), landscape (pond, amphitheatre, courts, multipurpose octagon). Roads: 12.2 m DP road (north), 27.5 m Mulana Azad road (west), 27.5 m Bapurao Jagtap road (north-east) **[stated]**. North up. |
| p5 basement and podium plans | Podium edges confirmed. 3 basements under both podiums **[stated]**. |
| p6 podium top, typical and refuge floor plans | Wing outlines per floor, pool on the south podium, amenities on the podium tops. Units per floor: 2BHK 16, 3BHK 8, 4BHK 4 **[stated]**. |
| p7 D, E and F wings: north elevation (developed), section XX′, wing plan | Levels: podium top +21.45, first floor +24, 8th +46.45, 15th +67.45, 22nd +88.45, 29th +109.45, terrace +130.45, machine room +134.15 **[stated]**. |
| p8 A, B and C wings: sections and elevations | B wing terrace +139.45 and overhead tank +144.85. A and C wings terrace +145.45 and overhead tank +150.4 **[stated]**. |

### Scale (two readings that disagree)
- The labels (1:500 and 1:250) do not hold, and the p4 ground floor and roof plans are not at the same scale as each other.
- **Plan scale from the roof plan** (p4, original sheet pixels):
  - The stated plot area fits a polygon traced around the plot at **4.05 px/m**.
  - The B wing's north elevation is about 30 m wide, measured with its own stated level marks, and the B wing on the roof plan is 132 px wide: **4.4 px/m**.
  - The 12.2 m DP road band measures about 54 px: **4.4 px/m**.
- **Used: 4.2 px/m (±5 %).**
  - At this scale the traced plot is about 23,900 m² against the stated 25,786 m², with the amenity plot partly excluded from the trace.
  - B and C wings come out about 31 × 23 m.
- **Ground floor plan:** fitted to the roof plan by matching the B and C wing cores (scale 0.94). The D, E and F cores then agree within about 5 m.

### Footprint and floors
| Element | Plan | Levels | Basis |
|---|---|---|---|
| North podium | L-shaped strip along the DP road, turning south-west to the A wing; about 140 × 32 m plus the A arm | ground (retail) + 6 parking levels; top +21.45 | Outline [measured] from the p4 ground floor plan. Ground storey 4.65 m and podium storeys 2.8 m **[assumed]**, summing to the stated +21.45. |
| South podium | U-shape round the multipurpose octagon, open to the central green | as above | [measured] |
| Basements | 3 levels under each podium, 3.5 m each | −10.5 m | Count **[stated]**, height **[assumed]** |
| A wing | H-plan, 34 × 25 m, turned 50° to face the corner | podium + 40 floors, terrace +145.45 | Plan [measured], terrace [stated], floors from the unit count [read] |
| B wing | H-plan, 31.4 × 22.6 m | podium + 39 floors, terrace +139.45 | as above |
| C wing | H-plan, 31 × 23 m | podium + 40 floors, terrace +145.45 | as above |
| D, E and F wings | One connected "boomerang": three cores, each with its own cluster of flats, joined by slabs about 12–14 m deep | podium + 35 floors, terrace +130.45 | Plan [measured] as 8 rectangles. Joined form **[stated]**: "Wing D, E & F are physically connected". |
| Refuge floors | 8th, 15th, 22nd, 29th and 36th | — | Levels [stated]; every seventh floor [read] |

- **Floor height:** 3.0 m above the first floor, from the stated levels (8th to 15th is 21 m over 7 floors).
- **Floor counts:** from the units per floor, e.g. 560 2BHK ÷ 16 per floor = 35 floors for D, E and F. They agree with the terrace levels to within half a floor.

### Proportions and rhythm
- Slender towers: about 31 m wide by 145 m tall, roughly 1:4.5 **[stated heights / measured width]**.
- Strong horizontal banding of continuous balconies, one band per floor, over darker recessed glazing **[read]** from the renders and elevations.
- Refuge floors read as darker recessed bands **[read]**.
- Podiums wear horizontal louvre bands, with retail glazing at the street **[read]** from the retail view and cover renders.

### Roof
Flat terraces. Machine rooms and overhead tanks stand above them (+134.15 on D, E and F; +144.85 on B; +150.4 on A and C) **[stated]**, modelled as small boxes on the cores.

### Materials
None are stated in the portfolio. The renders read as follows:
- **Towers:** warm sandstone or ochre render, drawn in DESIGN.md `--sandstone`.
- **Podiums:** cream, drawn as `--lime-deep` with banding.
- **Central green:** `--court` green, the void.
- **Water:** muted blue-grey.

### Design progression (the scroll story)
- **Stage 1** (8 towers on one large podium) and **stage 2** (podium split in two) are rebuilt from the small diagrams on p3. Positions are read to about ±8 m **[read]**, and the tower forms are generic plus-plans 22 m across, 120 m tall **[assumed]**.
- **Stage 3** is not modelled separately. The diagram shows it close to the final layout, so the story goes from stage 2 straight to the final design.

### Idea model: "minimum footprint, maximum mother earth"
- The towers turn to ghosts.
- Each podium separates into its parking slabs (3 basements, ground and 6 podium levels), seen through a translucent ground.
- The footprint is traced on the ground in terracotta, and the open ground stays green.
- Arrows show the south-west wind crossing between the two podiums, through the central space.
- The figure "built footprint as a share of the site" is computed from the traced polygons, not stated on a sheet.

### Context
The surrounding Byculla blocks are procedural (seeded) low- and mid-rise boxes, kept off the three roads. They give scale only and are not traced.

### Verification (renders against the sheets)
Method: headless renders from `dev/model.html?model=mass-housing`, compared side by side with the sheet renders. A near-orthographic top view was overlaid at 50 % on the p4 roof plan.

**Matches**
- **Plan.** On the roof-plan overlay all six wings, both podiums, the pool, the multipurpose octagon, the pond, the amphitheatre and the courts register within about 2–3 m. The roads frame the site on the same three sides.
- **Heights.** All levels are as written on the sections. D, E and F stand lowest; B is a floor or two below A and C.
- **Massing.** In the p3 cover render and the low-angle render, the model's D–F boomerang rising from its banded podium, and the gap between the two podiums, match the renders' composition.
- **Progression.** One continuous podium with eight towers, then two podiums, follows the p3 diagrams in arrangement.

**Differs from the real design** (known, not fixed)
- **Podium corners.** The podiums in the renders have rounded corners and deep perforated louvre bands. The model's podiums are faceted polygons with painted bands.
- **Facades.** The towers in the renders have projecting balconies, deep vertical recess slots between flats and stepped crowns. The model's tower faces are flat, with banding drawn by the shader and simple machine-room boxes on top.
- **H-plans.** A, B and C are generic H-plans fitted to their outlines; the real plans have stepped edges and corner flats. D, E and F are eight rectangles, not the traced unit-by-unit outline.
- **Landscape.** The renders show far more trees, paths, the kids' play area and the deck and bridge on the podium top. The model has the main elements only.
- **Stage 3** of the progression is skipped, and the stage 1 and 2 towers are generic.
- **Reference photos.** Some photos on p3 (the east side view and the tower cluster) look like photographs of the real Future Towers, the stated inspiration, rather than renders of this design. They were not used as references.

**Guessed, and could be wrong**
- **Plan scale.** ±5 %, from two sources that disagree by 8 %.
- **Storey split.** The ground storey (4.65 m) and podium storey (2.8 m).
- **Basements.** The basement depth.
- **Colours.** All of them.
- **Context.** The surrounding city.
- **Floor counts.** Per wing, derived from the units (±1 floor).

---

## 4. Sukoon Resort, Kamshet (PDF p16–20)

### Sources used
| Sheet | What it gave |
|---|---|
| p18 masterplan (1:750 label), sections AA′ and BB′ | 24-item legend, every building position and outline, paths, lawns, the kund amphitheatre, the pool, the waterfront amphitheatre, the stepped garden, decks, the jetty, and the access arm with reception and parking. Compass: north points to the plan's left, about 19° above horizontal. |
| p17 concept sheet | Site on the Uksan dam lake, Mawal, Kamshet. "Area 22.55 acres" **[stated, partly legible]**. Concepts: voids between structures for visual connection, terracotta jali for light and privacy, courtyard formation. The architect's statement. |
| p19 villa, spa, cafe, guest rooms, dormitories and suites | Villa: 4BHK, G+1, private pool facing the dam **[stated]**, an elongated hexagon in plan, brick, flat roof with a first-floor terrace. Guest rooms: 48 in all, 6 per cluster **[stated]**, under butterfly (V) roofs, timber-clad with jali panels **[read]**. Spa: tiled hip roof round a courtyard. Cafe: open pergola under acrylic sheet **[stated]**. Dormitories: two blocks of 10 beds around a toilet core, hip roofs. Suites: a row with a common court. |
| p20 reception, multipurpose hall, two restaurants | Reception: long, open, tiled gable roof. Hall: octagonal, with a stage and a raised roof cavity **[stated]**, brick walls. Lakefront restaurant: two wings round an entrance courtyard, gable roofs. East restaurant: hip roof, open dining deck facing the river and dam **[stated]**. |

### Scale (three readings that disagree)
- **The 1:750 label** gives 7.6 px/m on the sheet image. That makes the site only 4.3 acres, and the villas only 7.6 m wide. **Rejected.**
- **22.55 acres** (partly legible) gives 3.1–3.3 px/m, depending on whether the access arm is counted.
- **Four buildings with plans:**
  - Dormitory pair: about 17 × 15 m from bed counts.
  - Octagonal hall: about 25 m across.
  - Lakefront restaurant: about 30 × 26 m from table counts.
  - Reception: about 40 × 22 m.
  - Matched to their masterplan outlines, these give **3.5–4.5 px/m**.
- **Used: 3.8 px/m (±15 %).** At this scale the site comes out about 17 acres against the stated 22.55. Villas come out about 16 × 10 m and guest-room clusters about 29 × 14 m. Both are reasonable sizes for their plans.

### Layout read from the masterplan
| Element | Count | Basis |
|---|---|---|
| Villas (6) | 10 along the north waterfront, each turned to face the lake | Positions [measured], orientation [read] |
| Guest-room clusters (9) | 9 long clusters, 29 × 14 m. The brief says 48 rooms in clusters of 6 (8 clusters); the plan shows 9 long clusters, so one may be a suite row | [measured] |
| Suites (10) | 13 shorter blocks, 20 × 10 m, including 5 along the east service road and 2 by the service block | [measured] |
| Dormitories (7) | 2 blocks | [measured] |
| Public buildings | Reception (2), multipurpose hall (3), cafe (4), two restaurants (5, 16), gym (20), spa (21), changing (22), service block (15) | [measured] |
| Landscape | Kund amphitheatre (24) about 43 m across, with the pool (23) curving round its west side; waterfront amphitheatre (17); stepped garden (18); decks (19); jetty; multipurpose garden (14); tennis (13), badminton (11) and sit-out (12) | [measured] |

### Heights
- **Plinth +0.6 m** on every building, read from the section marks on p19 and p20.
- **Everything else is [assumed]**, proportioned from the sections and elevations, whose level labels are mostly illegible at this resolution:
  - Guest rooms: butterfly roof, 3.4 m at the valley and 4.8 m at the ends.
  - Suites and dormitories: eaves 3.3 m, hip ridges about 5.5 m.
  - Villa: two storeys, 3.0 m each.
  - Hall: brick walls to 4.5 m, octagonal hip with a raised cavity to about 9 m.
  - Reception: gable ridge about 6.5 m.
  - Restaurants: about 6–6.5 m.
  - Cafe pergola: 3.5 m.
- **Ground:** flat at +2.5 m above the water, with a bank down to the lake. Section BB′ shows steps at the waterfront and an otherwise level site **[read]**.

### Materials
| Element | Material | Basis |
|---|---|---|
| Villa, hall, restaurants | Exposed brick | [read] from renders |
| Guest rooms | Timber cladding, terracotta jali panels | [read]; jali [stated] as concept |
| Suites, dormitories, spa | Stone or plaster walls, clay tile hip roofs | [read] |
| Roofs | Clay tile | [stated] "clay roof tiles (as rendered)" |
| Cafe | Timber pergola, transparent acrylic | [stated] |

### Idea model: voids between structures
- Every building drops to a low dark block, like the concept sheet's black figure-ground ("creating void through spaces", "formation of courtyard").
- The open ground between them stays light, so the voids read as the design.
- Dashed lines run from each accommodation block to its nearest stretch of water: the concept's "visual connectivity to outer surroundings".
- The lines are a diagram of the concept, not sight-lines checked on the sheets.

### Known simplifications (decided before building)
- **Building forms:** one parametric form per building type. Room plans, doors and windows are not modelled.
- **Ground:** paths, lawns, courts and parking are painted on the ground texture, not built.
- **Trees:** rows follow the main paths, with a seeded scatter in the lawns. Not traced tree by tree.
- **External road:** the curving access road outside the site is painted only.

### Verification (renders against the sheets)
Method: headless renders from `dev/model.html?model=sukoon-resort`, compared side by side with the sheet renders. A near-orthographic top view was overlaid at 50 % on the p18 masterplan.

**Matches**
- **Plan.** All 45 buildings, the kund, the pool, the waterfront amphitheatre, the multipurpose garden, the plaza loop, parking and the bank line register on the masterplan overlay within a few metres. The east restaurant (5) is slightly off in rotation.
- **Hall.** A brick octagon with a wide tiled hip and a raised central roof, as in the p20 isometric.
- **Guest rooms.** Units side by side under butterfly (V) roofs, as in the p19 elevations.
- **Villa.** Two brick upper wings with low tiled hips, a terrace between them, and a pool towards the lake, as in the p19 elevation.

**Differs from the real design** (known, not fixed)
- **Villas.** The render's brick wings stand at the front, with the terrace bridging between them. The model's wings are inset rectangles inside a hexagon, and there is no balcony railing or window pattern.
- **Guest rooms.** The render shows timber cladding with terracotta jali panels between units and stepped plinths with stairs. The model has plain timber-coloured boxes, and the jali is not modelled.
- **Reception.** In the render it has a deep cantilevered roof and timber screens. The model has a gable over a back block with a row of posts.
- **Restaurants and spa.** Courtyards, decks and plans are simplified.
- **Decks.** The deck at the east restaurant is a single slab.
- **Landscape.** The tree pattern, hedges, flower beds and the archery strip are not traced. The tennis court is drawn as its odd masterplan outline.
- **Count.** The masterplan shows 9 long guest-room clusters where the brief says 8 (48 rooms ÷ 6). The model follows the plan.

**Guessed, and could be wrong**
- **Plan scale.** ±15 %.
- **Heights.** Every building height except the plinth.
- **Ground.** The ground and bank levels.
- **Sun.** The sun path. It uses the latitude and the sheet's compass, which matches the satellite map on p17; the time of day is chosen for the story.
- **Sight lines.** The idea model's sight-lines go to the nearest point of the bank, not to views drawn by the architect.

---

## 5. Sales Office – Interior Design (PDF p44–46)

Hand-drawn and rendered sheets for Shreepati Developers' sales office; the client is named in the brief. Theme: **"Lines"** **[stated]**.

### Sources used
| Sheet | What it gave |
|---|---|
| p44 theme and front elevation | The brief and theme text **[stated]**. Front elevation: fluted panels over the whole front, cut by a light, irregular ("torn") horizontal band that carries the builder's name. One door at the left, two square fixed windows. |
| p45 plan, RCP, flooring, four perspectives | Room layout, walls, doors, furniture, 600 mm floor tiles, false-ceiling pattern. A legend of room sizes, at 72 ppi and barely legible. Perspectives: reception with two arched fluted niches, discussion area with fluted side walls, cabin, AV room. |
| p46 sections A–A′ to F–F′ with key plan | Levels **[stated]**: +0 outside, +300 floor, +1200 and +2400 (or +3400) panel bands, +4800 top. Panel cut patterns per wall: the torn band, a stepped cut, full-height flutes, and the arched niche with logo in reception. |

### Scale
- The legend sizes I could read: reception about 5.5 × 5.5 m, discussion about 6 × 5, AV about 4 × 5, director's cabin about 4.5 × 5, admin about 7 × 3.5, toilets about 3.5 × 2, and a passage 1.5 m wide **[read, low confidence]**.
- Fitting the plan's lower row of rooms to these gives **54 px/m** on the sheet image (±10 %).
- **Overall interior: about 18.8 × 9.7 m.** The legend's "passage 22 m long" disagrees; the passage measures about 18 m.

### Plan (metres, origin at the north-west corner, front facade on the south at z = 9.7)
| Room | Rect (m) | Legend |
|---|---|---|
| Sales cabins (×2) | 0–3.15 × 0–2.5 and 0–3.15 × 2.5–4.6 | 3.5 × 2.8 |
| Print / store | 3.15–4.45 × 0–1.1 | — |
| Admin office | 4.45–11.1 × 0–3.7 | 7 × 3.5 |
| Toilets (×2) | 11.1–14.3 × 0–3.35 | 3.5 × 2 |
| Pantry | 14.3–16.7 × 0–3.35 | 2.5 × 3.5 |
| Storage | 16.7–18.8 × 0–3.35 | 1.5 × 3.5 |
| Passage | across at z 3.35–4.6 | 1.5 wide |
| Reception / waiting | 0–5.45 × 4.6–9.7 | 5.5 × 5.5 |
| Discussion area | 5.45–11.0 × 4.6–9.7 | 6 × 5 |
| AV / conference | 11.0–14.6 × 4.6–9.7 | 4 × 5 |
| Director's cabin | 14.6–18.8 × 4.6–9.7 | 4.5 × 5 |

Doors and openings are placed as drawn, to about ±0.3 m. Main entrance: front wall, in the reception, matching the elevation's left-hand door. A side door opens from the passage onto the east deck.

### Heights
- **Stated:** floor +0.3, top +4.8. Window and panel bands at +1.2 and +3.4 (sections B, D, E, F), and +2.4 (sections A, C).
- **[assumed]** Ceiling under the slab at +4.5.
- **[assumed]** The cutaway cuts walls at +3.4, the top of the panel bands, so the panels show.

### Lines: the panel patterns (from the sections)
| Pattern | Where | Rule |
|---|---|---|
| Torn band | Front facade, passage walls, cabins, director | Flutes from the floor to about +1.2 m, and from about +2.4 m to the top. Both edges are irregular, as drawn. |
| Stepped | AV room | Upper flutes start at stepped heights along the wall (section B–B′). |
| Full height | Discussion area | Flutes floor to top (discussion perspective). |
| Arched niche | Reception side walls | Flutes inside a round-headed arch (reception perspective, section A–A′). |

- **[assumed]** Flutes are 30 mm battens at 70 mm centres (100 mm on phones).
- **Signage:** the logo and the builder's name are not reproduced.

### Materials
- **Walls:** white and off-white **[stated]**.
- **Fluted panels:** warm ochre timber **[read]** from the drawings.
- **Floor:** 600 mm light tiles **[read]**.
- **Windows:** fixed glazing **[stated]**.
- **Furniture:** timber tops and dark chairs **[read]**.

### Idea model: lines that change by placement and cutting
- The building turns to a ghost and the camera faces the front facade.
- Every fluted wall cycles through the three cut patterns from the sections (torn band, stepped, full height), flute by flute along the wall. This is the brief's "different linear patterns by varying the placement and cutting of the panels".
- The pointer sends a ripple through the flutes, in any mode, as PLAN.md asks.

### Known simplifications (decided before building)
- **Ceiling:** the false ceiling and RCP coves are not modelled.
- **Lighting:** no lights, pendants or AC.
- **Furniture:** simple blocks.
- **Show flat:** not in the drawings, so not modelled.

### Verification (renders against the sheets)
Method: headless renders from `dev/model.html?model=sales-office-interior`, compared side by side with the p44 elevation and the p45 perspectives. The pointer ripple was checked by firing pointer events and diffing the frames.

**Matches**
- **Front facade.** Flutes full width, with a light torn band through the middle third, and the door and windows sitting in it. The proportions match the p44 elevation: flutes to about 30 %, band to about 60 %, flutes above.
- **Plan.** Rooms, walls and doors as on the p45 plan. Front-row room sizes are within about 10 % of the legend values I could read.
- **Reception.** Two arched fluted niches face each other, as in the reception perspective.
- **Discussion area.** Fluted side walls run the length of the room, with four tables of four chairs.
- **Heights.** Floor +0.3, panel band edges near +1.2 and +2.4, top +4.8, all as stated.

**Differs from the real design** (known, not fixed)
- **Torn band.** In the drawings the band edge is hand-drawn and irregular. The model's edge is a smooth sum of sine waves.
- **AV room.** The perspective shows dark trapezoidal (diagonally cut) panels converging on the screen. The model uses the stepped cut from section B–B′ instead.
- **Discussion area.** The drawn flutes have a stepped top edge; the model runs them full height.
- **Reception.** The arches are wider in the perspective and spring lower, with benches set into them. The fluted back wall with signage is not modelled.
- **Ceiling.** The false ceiling, coves and pendant lights (RCP and sections) are not modelled; the cutaway removes the ceiling.
- **Furniture.** Simple blocks. The reception centrepiece is a flat circular carpet with a square table on it.
- **Signage.** Shreepati Developers' name and logo are left out on purpose.

**Guessed, and could be wrong**
- **Room sizes.** All room sizes are ±10 %, because the legend is barely legible. The legend's "22 m" passage disagrees with the plan.
- **Door positions.** Where the plan's swings are unclear.
- **Flutes.** Batten size and spacing.
- **Window sill heights.** Taken from the sections' +1.2 and +3.4 marks.

---

## 6. Dharavi Rerooted (PDF p47–50)

Competition entry (Navbharat Dharavi Redevelopment Competition, code DDQ2025-02-06). The sheets say "we" (team entry). Credits are still to be confirmed.

### Sources used
| Sheet | What it gave |
|---|---|
| p48 Dharavi map, principles, costs | Sectors 1–5, SRA area and saleable apartment area as separate zones **[stated]**. A zoom circle: SRA buildings on one side of a road, saleable on the other **[stated]**. A cluster diagram: four plus-shaped towers round a central community space, with community strips between them and air arrows entering at the lower corners **[read]**. Maintenance basis: "22 floors, 16 flats per floor", one building with 4 lifts **[stated]**. Principles: modular, smart orientation, common spaces and courtyards. |
| p49 1BHK unit and floor plate | Plus-shaped plate: four arms of four flats each (16 flats per floor), a central lobby with two lift cores and two stairs. Passage "1.5 m wide" **[stated]**. Flat 32.30 m² carpet **[stated]**, height 2.9 m **[stated]**. Jali wall on the wet core, Bison panel partitions, loft. |
| p50 2BHK unit, floor plate and community centre | Plus plate with 8 longer flats per floor (one on each side of each arm). Passage "2.5 m wide" **[stated]**. Flat 46.11 m² carpet **[stated]**. Section A–A′ lengths 1.2 + 2.9 + 4.9 + 2.95 m **[stated]**. Community centre: anganwadi/balwadi 130 m², community hall 200 m², classrooms, staff room, assembly hall, toilets, pantry **[stated]**, with the diagram placing it at the edge of the cluster court. A render of three plus towers on a green with a small red-roofed building. |

### Scale (two readings that disagree)
- **The floor plates have no scale bar.** The unit plans have one, but their drawn rooms do not match their own labelled sizes.
- **From the stated passage widths:** 27 px/m (1BHK) and 31.6 px/m (2BHK). But then a flat's gross area falls below its stated carpet area, which cannot be right.
- **Used: the area-consistent scales.**
  - 1BHK: **22 px/m**. A flat comes out about 38 m² gross for 32.3 m² carpet.
  - 2BHK: **24.6 px/m**. A flat is about 12 m long, matching the section A–A′ total.
  - Uncertainty ±15 %.
- **Both plates then come out about 36 × 41 m** over the arms, with arm bodies 7–9 m deep and service bumps on the outer faces.

### Massing
| Element | Size and storeys | Basis |
|---|---|---|
| SRA towers (1BHK) | Plus plate about 37 × 42 m; 22 floors; 16 flats per floor | Plate [measured]; 22 × 16 [stated] for the maintenance case |
| Saleable towers (2BHK) | Plus plate about 34 × 40 m; 22 floors; 8 flats per floor | Plate [measured]; floors **[assumed]**, the same as SRA |
| Storey height | 3.0 m | **[assumed]**: 2.9 m clear [stated] plus slab |
| Cluster | 4 towers on a square, 76 m centre to centre, central court and four community strips | Arrangement [stated diagram]; spacing **[assumed]** |
| Community centre | One storey, about 50 × 17 m: hall, anganwadi with its playground, classrooms | Areas [stated]; layout [read] from p50; height **[assumed]** |
| SRA and saleable split | Two clusters, either side of a 36 m buffer (road and landscape) | Split [stated]; which cluster gets 2BHK is **[assumed]**: 1BHK (348 sq ft) is the SRA unit size; 2BHK taken as saleable |

**Not modelled.** The site itself is a diagram, not a traced plot. The sheets give no plan placing these clusters within the sectors, so position, orientation and the number of clusters are **[assumed]**.

### Facade
Renders: white towers with stacked vertical strips of blue glazing, the "full-slit sliding windows" **[stated]**, and perforated jali strips on the wet cores **[read]**. Both are drawn in the shader: slits on the arm faces, a jali dot pattern on the service bumps.

### Context
Existing Dharavi is drawn as a dense, seeded field of one- to three-storey boxes. It gives scale and contrast only and is **not traced**.

### Idea model: separate but together
- The two zones take the map's colours: grey-violet for SRA, mauve for saleable. Towers turn translucent so the courts and community spaces read through them.
- Wind lines blow from the south-west through each cluster's corners and across its court, as in the p48 and p50 diagrams.
- Lines are traced by steering round the tower footprints. They are a diagram, **not a CFD result**.

### Verification (renders against the sheets)
Method: headless renders from `dev/model.html?model=dharavi-rerooted`, compared side by side with the p50 cluster render and the p49 tower renders.

**Matches**
- **Cluster diagram (p48 and p50).** Four plus-shaped towers on a square round a green court, with community strips between them and the community centre on the court's edge.
- **Floor plates.** Arms, lobby core and service bumps traced from both plates. 16 flats per floor on the SRA plate and 8 on the 2BHK plate, as drawn.
- **p50 aerial render.** Tall white plus towers on open green, with a small red-roofed community building between them.
- **Zone colours.** As in the p48 map legend.

**Differs from the real design** (known, not fixed)
- **Plate outlines.** The render's towers have a deeply serrated, comb-like outline, with every flat stepping out. The model has arm bodies plus a few service bumps, so the outline reads simpler and heavier.
- **Roofs.** The render's roofs are grey and flat with a parapet grid. The model shows machine rooms only.
- **Community centre.** Massing only: a hall with a hip roof, a classroom wing and the playground. No interiors.
- **Facade.** Window slits and jali are a shader pattern, not the actual window layout.

**Guessed, and could be wrong**
- **Site.** The whole site layout: number of clusters, spacing, orientation, the buffer width, and which cluster is SRA.
- **Saleable towers.** Their height.
- **Plate scale.** ±15 %.
- **Storey height.** 3.0 m.
- **Context.** The existing Dharavi fabric.
- **Wind.** The wind paths.

---

## 7. Building inspect (audit, 2026-11-12)

The building-inspect feature lets the viewer click one building in a plan model and see it as a detailed model on its own stage. This section records the audit made before building it: what is in each plan model, how it is built, and what the PDF says about each building type.

### 7.1 Buildings in each plan model

| Model | Building type | Type id | Count | Built in the plan model as | Stable id today |
|---|---|---|---|---|---|
| Irshalpada | Ground-storey house (**type A**) | `irshalpada-house-a` | 22 | Merged into the cluster geometry. 11 clusters are drawn as instances, one InstancedMesh per material. | Cluster only (instanceId 0–10). The house is not identified. |
| Irshalpada | Ground+1 house (**type B**) | `irshalpada-house-b` | 22 | As above | Cluster only |
| Irshalpada | Primary school | `irshalpada-school` | 1 | Merged mesh per material, `aBlock = 11` | `school` |
| Irshalpada | Temple of Memories (memorial, not a building) | `irshalpada-temple` | 1 | Merged mesh per material, `aBlock = 12` | `temple` |
| Mass housing | H-plan tower (A, B, C wings) | `mass-tower-h` | 3 | One merged solid; `aBlock` per wing | `a`, `b`, `c` |
| Mass housing | D–E–F connected "boomerang" | `mass-tower-def` | 1 building, 3 wings | Same merged solid; `aBlock` per wing | `d`, `e`, `f` |
| Mass housing | Podium (north, south) | `mass-podium` | 2 | Same merged solid | `north`, `south` |
| Mass housing | Multipurpose octagon | `mass-octagon` | 1 | Merged landscape | none |
| Residential school | Academic, admin, library, sports, mess, auditorium, multipurpose hall, security cabin | one type each | 8 | One merged mesh, `aBlock` per block | `academic`, `admin`, … |
| Residential school | Hostel block (boys, girls, faculty) | `school-hostel` | 3 | As above | `boys-hostel`, `girls-hostel`, `faculty` |
| Residential school | Staff house (director, deputy) | `school-staff-house` | 2 | As above | `director`, `deputy` |
| Residential school | Octagon pavilion | `school-octagon` | 1 | As above | `octagon` |
| Sukoon resort | Villa | `sukoon-villa` | 10 | One merged mesh, `aBlock` per building (45 in all) | Index only |
| Sukoon resort | Guest-room cluster | `sukoon-guest` | 9 | As above | Index only |
| Sukoon resort | Suite block | `sukoon-suite` | 13 | As above | Index only |
| Sukoon resort | Dormitory | `sukoon-dorm` | 2 | As above | Index only |
| Sukoon resort | Reception, hall, cafe, 2 restaurants, spa, gym, changing, service | one type each | 9 | As above | Index only |
| Dharavi | SRA tower (1BHK plate) | `dharavi-sra` | 4 | One merged solid, `aBlock` per tower | Range `sra` (0–3) |
| Dharavi | Saleable tower (2BHK plate) | `dharavi-sale` | 4 | As above | Range `saleable` (4–7) |
| Dharavi | Community centre | `dharavi-centre` | 1 | As above | `centre` |
| Sales office | (one interior; nothing to select) | — | — | — | — |

There are **about 120 selectable buildings in 30 types**. Irshalpada alone has 46 buildings in 4 types.

### 7.2 Making every building selectable without changing the plan

Every model already tags each vertex or instance with its block (`aBlock`), and its pick function already returns that block. The only case where a block holds more than one building is Irshalpada, where a block is a cluster of four houses.

The proposed change is the smallest one that keeps the plan exactly as it is:
- **No geometry, material or shader in a plan model changes.** Picking stays as it is. A new step resolves the building from the hit:
  - For Irshalpada, the hit point is moved into the cluster's local frame and tested against the four house footprints. The ids come from the cluster and house index.
  - For the other models, the building is the block.
- **The registry lives in a separate data file** (`src/inspect/registry.ts`, pure data). Each building has a `buildingId`, `typeId`, `label`, a plan position, and a transform: cluster matrix × house placement × mirror. These are the `userData` fields the brief asks for, kept as data, because the plan meshes are merged and instanced and have no per-building objects to hang them on.
- **The whole-building hover highlight is an overlay.** It is one extra mesh: the house type's merged shell, placed with the building's matrix and drawn in a warm translucent tint. It exists only while something is hovered or focused, so with nothing selected the plan scene renders exactly the same draw calls as before.
- **Ids.** Plots are numbered 01–44 by cluster: `(cluster − 1) × 4 + house`, where houses 1–2 are the G+1 pair and 3–4 the ground-storey pair. A type A house on plot 12 is `irshalpada-a-12`. The others are `irshalpada-b-NN`, `irshalpada-school` and `irshalpada-temple`.

### 7.3 What the PDF gives for each Irshalpada type

| | Type A: ground-storey house (p41) | Type B: ground+1 house (p42) | Primary school (p43) | Temple of Memories (p39) |
|---|---|---|---|---|
| Plan | Floor plan with legend. Living, kitchen, 2 bedrooms, toilet, bath, courtyard. Doors shown by swing arcs; windows by double lines. **[stated]** | Ground and first floor. Living, kitchen, 3 bedrooms, toilet, bath, courtyard, stair. **[stated]** | Plan: 7 classrooms, staff room, principal, office, toilets, multipurpose area. **[stated]** | **None** |
| Roof plan | 3 gabled wings (slope arrows) | Upper gable and 2 lean-tos | Main gable plus 6 stepped wings | None |
| Sections and elevation | AA′, BB′, front elevation. Levels +600, +1500, +3100, +5900. **[stated]** | AA′, BB′, front elevation. Levels +600 to +8500. **[stated]** | AA′, BB′, front elevation. +600, +2700, +5300, +5800. **[stated]** | None |
| Renders | 4: verandah with louvred folding doors; kitchen terracotta jali; garden; interior | 4: verandah and posts; balcony railing; street; side yard | 4 | 1 |
| Materials | CSEB walls, lime plaster, Mangalore tile, mud floor, terracotta jali to the kitchen ("chul"), timber posts, doors and shutters **[stated / read]** | Same, plus a bamboo first-floor slab with mud screed and lime-mesh topping **[stated]** | Same **[read]** | Black stone plates, stone-block stepped plinth, pool, stone seat wall **[read]** |
| Dimensions | Heights only. Plan size from the fitted scale (MODEL_NOTES §2), ±20 % | Heights only | Heights only | **None** |

Readings of type A, the house built first:
- **The elevation is mirrored relative to the plan.** Its large gable, with a double door between two windows behind verandah posts, is the living-room wing, which is 8 m wide. Its small gable, with a single window, is the 5.9 m bedroom wing. The plan's widths and the elevation's gable sizes agree once mirrored, and the cluster places mirrored copies anyway. **The plan is followed; the elevation supplies the opening styles.**
- **Windows** **[read]**: dark timber frame, a glazed casement with 2 × 3 panes, and solid timber shutters folded flat against the wall. Openings are about 1.0–1.3 m wide, sill at +1.5 **[stated level]**, head about +2.7.
- **Doors** **[read]**: dark timber panel doors about 0.9 m wide. The living room's front door is a double door about 1.4 m wide.
- **Courtyard side of the living room** **[read]**, from the render: a wall-wide frame of louvred timber leaves that fold open, with a louvred transom.
- **Verandah posts** **[read]**: turned timber posts on dark bases with brass rings and a bracketed capital, carrying a beam at the eave.
- **Eaves and barges** **[read]**: carved timber fretwork valances along every eave and gable barge, with exposed rafters under the overhang.
- **Kitchen** **[stated]**: a terracotta jali to the cooking space. The render shows it as a deep square-cell jali over the upper half of a white wall.
- **Plinth** **[read]**: white-plastered, 0.6 m, with broad steps of 4 risers to the front verandah and small flights into the courtyard.
- **Floors** **[stated]**: mud flooring, reddish brown in the interior render.
- **Not in the PDF, so assumed or omitted:** gutters and downpipes (none in any render, so omitted), any chimney (the chul vents through the jali), a water tank and a solar panel (not shown, so not added), the boundary wall and gate details, and the plot planting.

### 7.4 Is the plan realistic?

Building all 30 types to this level is not realistic from this PDF. **Only Irshalpada types A and B, and the Irshalpada school, have the plans, elevations, sections and renders that an architectural-model-quality building needs.**

| Group | Types | What the PDF has | Recommended treatment |
|---|---|---|---|
| Has the drawings | Irshalpada type A, type B, school | Plan, roof plan, sections, elevation, renders | **Full detail**, as in the brief |
| Partial drawings | Residential school: academic, admin, library, sports, mess. Sukoon: villa, guest rooms, hall | Plans and renders at 72 ppi, with heights mostly illegible | A **detailed massing tier**: real openings, roofs and materials at the fidelity the sheets support, with every dimension tagged |
| No drawings | School hostels, staff houses, auditorium. Sukoon suites, dorms, spa, gym. Mass-housing podiums. Irshalpada temple | Nothing beyond the plan footprint or one render | **Do not detail.** Inspect shows the plan massing with a note that no drawings exist. |
| Too large for the stage | Mass-housing towers (about 145 m), Dharavi towers | The section and the floor plate | Detail **one typical floor plate** and the crown, not the whole tower |

The first type built end to end is **type A**, which has the richest set of sheets. **The work then stops for review**, as the brief asks.

### 7.5 How it is built

| Part | Where | Notes |
|---|---|---|
| Registry | `src/inspect/registry.ts` | Pure data. Every building has an id, a type and a label. |
| Placement | `src/models/irshalpada.place.ts` | House-local to world matrices, the same chain `buildCluster()` applies. Also picks the house from a cluster hit. |
| Plan side | `src/models/irshalpada.ts`, `src/inspect/controller.ts` | Covers hover, select, the camera glide, pause, the dim, keyboard access and the URL. With nothing hovered, nothing extra is drawn. |
| Stage | `src/inspect/inspect.ts` | Its own renderer and scene, rendered on demand. Controls: orbit, day and dusk, people, labels, roof lift, section cut, plan inset, and previous and next. |
| Detailed types | `src/inspect/buildings/irshalpada-house-a.ts`, `irshalpada-house-b.ts` and `irshalpada-school.ts` | Each module holds only its own readings. The fixed fabric is cached per device tier. Leaves, planting and people vary with the plot number. |
| Shared vocabulary | `src/inspect/buildings/vernacular.ts` | Roof planes (a gable is two planes, a lean-to is one), with valances and rafter tails only on edges in the open. Walls whose tops follow the roofs or stop under a slab. Casements, shutters, panelled and louvred doors, jali, vents, turned posts, beams, plinths, steps and compound walls. |
| Fallback | `src/inspect/buildings/massing.ts` | Any type without a detailed module shows the plan model's own massing, labelled "Massing only". |
| Materials | `src/inspect/tex.ts` | Procedural PBR, built from tileable height fields: colour, normal, and packed AO, roughness and metalness. Capped at 512 px (256 on the low tier). |
| Props | `src/inspect/props.ts` | People, trees, plants, laundry, bicycle, firewood, pots and the tulsi vrindavan. Low-poly and vertex-coloured. |

- **Lifetime.** The renderer, ground, lamps and material set are created on the first visit and kept for the page. Each visit's building instance, props, controls, listeners and DOM are disposed on exit. Everything is released on `pagehide`.
  - Why keep them: three.js leaves listeners on geometries for each renderer that has drawn them. A fresh renderer on every visit would leak.
- **Device tier.** The low tier applies to coarse pointers, `deviceMemory` ≤ 4 or ≤ 4 cores. It halves texture sizes, uses a 1024 shadow map, caps the pixel ratio at 1.25 instead of 2, uses no MSAA and a coarser ground mesh. `?tier=low` or `?tier=high` forces either one.
- **Reduced motion.** With `prefers-reduced-motion`, there is no glide, rise, fade or damping. Roof lift and dusk switch instantly.

### 7.6 Type A: readings and assumptions beyond §7.3

| Item | Value | Basis |
|---|---|---|
| Plinth, eaves, ridge | +0.60, +3.10, +5.90 | **[stated]** |
| Window sill | +1.50 | **[stated]**, the +1500 level on the sections |
| Window head | +2.65 | [read] from the elevation |
| Door head | +2.70 | [read] |
| Bedroom wing ridge | +5.40 | [read]. The same value as the plan model's data. The sections give only +5900. |
| Rooms, doors, windows | As listed in `WALLS` | [read] off the p41 plan at about 40 px/m on the crop, ±0.3 m |
| Wall thickness | 0.23 m | [assumed] |
| Roof build-up over the wall plate | 0.16 m | [assumed] |
| Step risers | 3 × 0.20 m | [assumed]. The plan's hatching gives the flights only. |
| Front steps | Moved outside a shortened verandah plinth (13.6 m deep), total depth 14.3 m | Plan: 14.4 m. Changed so the gable stands on its posts. |
| Roof wing extents | Trimmed so every gable stands on a wall or a post line and every eave is 0.6 m beyond its bearing line | They differ from the plan model's data by up to 1 m at the wing ends. The roof plan is not dimensioned. |
| Chul bay | Its own lean-to, falling outwards | [read] from the jali render |
| Posts | Positions from the plan circles, plus side and corner posts where an eave needs carrying | [read] / [assumed] |
| Post bases | Basalt | [assumed]: the local Deccan stone |
| Jali screen by the WC | Freestanding, 2 m | [read] from the plan hatching. Its purpose is [assumed]. |
| Second bedroom: courtyard window | Added | [assumed], from the brief that every room opens to the courtyard |
| Furniture and lamps | Chul platform, shelf, diwan, cots, cupboard, bucket, pan | [assumed] |
| Plot | Compound wall 1.2 m, plastered, basalt coping; gate on the steps' axis; basalt path | [assumed] |
| Planting | Courtyard tree **[stated]**. Back-yard trees [read] from the plan symbols. Front tree, kitchen garden and tulsi vrindavan [assumed]. | |
| Everyday life | Laundry line [read] from the p38 photos of the old village. Firewood, pots and bicycle [assumed]. | |
| Gutters, downpipes, tank, solar | **None.** None appear in any drawing or render, and the eaves throw rain clear of the plinth. | Matches the PDF |

### 7.7 Performance

All figures are from headless Chrome with software WebGL (SwiftShader) at 1440 × 900. Frame times are therefore CPU-bound and only comparable with each other.

**Main scene, nothing selected** (`dev/model.html?model=irshalpada`, fixed camera; before = commit c2eb1fa, after = HEAD):

| Story position | Draw calls | Triangles | Geometries | Programs | CPU submit per frame |
|---|---|---|---|---|---|
| p = 0.2, before | 33 | 31,372 | 15 | 16 | 0.6–0.9 ms |
| p = 0.2, after | 33 | 31,372 | 15 | 16 | 0.3–0.4 ms |
| p = 1, before | 41 | 75,116 | 19 | 19 | 0.6 ms |
| p = 1, after | 41 | 75,116 | 19 | 19 | 0.5 ms |

- **The plan scene is unchanged.** Its hover shell is two meshes with no geometry until something is hovered.
- **While inspecting, the plan scene does not render at all.**

**Inspect stage, per type:**

| Type | Tier | Draw calls | Triangles | Texture memory (estimate) |
|---|---|---|---|---|
| A, detailed | high | 50 | 82,900 | 14.2 MB materials + 16 MB shadow map |
| A, detailed | low | 50 | 65,900 | 3.6 MB materials + 4 MB shadow map |
| B, detailed | high | 83 | 94,400 | 15.5 MB materials + 16 MB shadow map |
| B, detailed | low | 83 | 77,400 | 3.9 MB materials + 4 MB shadow map |
| School, detailed | high | 38 | 138,900 | 15.5 MB materials + 16 MB shadow map |
| School, detailed | low | 38 | 121,900 | 3.9 MB materials + 4 MB shadow map |
| Temple, massing | high / low | 7 | 24,800 / 7,800 | Ground textures only |

- The stage ground accounts for 24,000 triangles on the high tier and 7,000 on the low tier.
- The stage renders only when something changes: an orbit, a toggle or a transition. A still view costs nothing.
- **Bundles**, loaded on the first selection only (gzipped):

| Chunk | Size |
|---|---|
| Stage | 16.9 KB |
| Type A | 4.4 KB |
| Type B | 5.4 KB |
| School | 4.6 KB |
| Shared vocabulary | in a shared chunk |
| Fallback | 1.5 KB |

### 7.8 Verification

The scripts are in `dev/inspect-checks/`: a CDP driver and its scenarios, run against `npm run dev` on port 5199.

**Selection**

| Check | Result |
|---|---|
| Hover on a type A house | The whole house is highlighted in a warm wash, with the label "House type A, plot 39 …" |
| Click | The camera glides in and the plan dims. The URL becomes `?building=irshalpada-a-39`. |
| Esc | Returns to the plan and restores the URL |
| Keyboard | Tab to the third building, then Enter: opens `?building=irshalpada-a-03` |
| Shared link | `?building=irshalpada-a-12` opens directly |
| Empty space | A click on the plan clears the selection. A click on the stage backdrop leaves the stage. |

**Repeated visits**

- **Method.** Ten enter and exit cycles, alternating plots 03, 12 and 39, with the garbage collector forced before each reading.
- **Used heap:**

| Reading | Used heap |
|---|---|
| Before any visit | 9.35 MB |
| After the first visit | 11.50 MB |
| After each of the next ten visits | 11.83, 12.03, 12.01, 12.12, 12.19, 12.19, 12.29, 12.27, 12.38, 12.40 MB |
| Continued to 25 visits | Levels off at 12.55–12.68 MB |

- The first visit's 2.15 MB rise is the stage, the material set and the type cache, which are kept on purpose (§7.5).
- **The used heap is not flat over the first ten visits:** it rises 0.57 MB, then levels off. A heap-snapshot diff between visit 6 and visit 15 explains the rise:
  - **Application objects: +1.2 KB.** No three.js object is retained.
  - **V8 compiled code (JIT tiering): +280 KB.**
  - **Blink's computed-style caches: about +110 KB,** from the dim's gradient being re-keyed per building.
  - These are browser caches, not objects the feature keeps.
- **Two real leaks were found and fixed during testing:**
  - The renderer's cached render list held the last instance when a close finished before its final frame. It is now cleared on exit.
  - Each visit created new interior lights, which three.js caches by id. The lamps now live on the stage.
- **After the run:** no inspect dialog is left in the DOM, and the stage holds only its permanent objects.

**Screenshots** (in `.inspect-review/`, not committed):

| View | File |
|---|---|
| Hover | `1-hover` |
| Mid-transition: the glide | `2a` |
| Mid-transition: the stage | `2b` |
| Arrival | `3` |
| Front | `4` |
| Aerial | `5` |
| Facade detail | `6` |
| Jali detail | `6b` |
| Roof lift | `7` |
| Section | `8` |
| Dusk with people | `9` |
| Phone | `11` |
| Fallback types | `12-*` |

**Reduced motion:** the stage opens without a fade, there is no damping, and the roof lifts instantly.

### 7.9 Fidelity report: house type A

**Matches the PDF**
- **Plan.** Living, kitchen, two bedrooms, the courtyard with its tree, and the toilet and bath apart on the same plinth (p41 plan and text). Doors and windows are where the plan's swings and double lines put them.
- **Living room.** A double door between two windows on the front. Wall-wide louvred folding doors to the courtyard verandah, with a louvred transom (p41 render).
- **Levels.** Plinth +0.60, sill +1.50, eaves +3.10, ridge +5.90, as written on the sections.
- **Roof form.** Three gabled wings, matching the roof plan's slope arrows. The two gable ends face the front, as in the elevation. The wings meet in valleys.
- **Materials.**
  - White lime plaster on CSEB.
  - Mangalore tile.
  - Mud floor.
  - Timber posts, doors and shutters.
  - A terracotta jali to the chul, on a projecting bay: deep square cells over the upper half of a white wall (p41 render and text).
- **Woodwork** (renders):
  - Turned timber posts with brass rings, on dark bases, carrying an eave beam.
  - Carved valances along every eave and barge.
  - Exposed rafter tails.
  - Casements of 2 × 3 panes with timber shutters folded back.
  - Panelled doors.
- **Verandahs.** One at every entrance, as the brief asks, with broad steps and courtyard steps.
- **People** in the renders' poses: a woman at a post, an elder seated on the plinth, a woman carrying a pot on her head, and children.

**Assumed** (tagged "Assumed" with a dashed leader on the model)
- Wall thickness, step risers and roof build-up.
- Basalt post bases.
- Compound wall, gate and path.
- Kitchen garden, tulsi vrindavan, front tree and bicycle.
- Furniture and lamp positions.
- The second bedroom's courtyard window.
- The purpose of the jali screen by the WC.

The full list is in §7.6.

**Differs from the PDF** (known)
- **Elevation.** The p41 elevation is drawn mirrored against the plan. The model follows the plan.
- **Front steps.** They sit outside a slightly shorter verandah plinth: 14.3 m total depth against 14.4 m.
- **Roof ends.** The wing ends are trimmed so each gable bears on a wall or posts. They differ from the site model's roofs by up to 1 m.
- **Valance.** A generic jhalar motif (board, scallop, pendant), not the render's exact pattern.
- **Posts.** Simplified lathe profiles, with block capitals instead of carved brackets.
- **Louvred doors.** Six leaves, where the render suggests seven or eight.
- **Plan scale.** ±20 %, inherited from §2. All plan sizes scale together.
- **Interior.** Room walls run up to the roof, as in section AA′. There is no ceiling, and the furniture is massing only.

### 7.10 Type B: the ground+1 house (p42), built 2026-11-12

**Readings**

| Item | Value | Basis |
|---|---|---|
| Plinth, ground sill, ground window head | +0.60, +1.50, +2.60 | **[stated]** |
| Lean-to roofs | Tile top +2.60 at the low edge, +4.60 at the high edge | **[stated]** |
| Eaves (wall plate) | +3.10 | **[stated]** |
| First floor | +3.50 | **[stated]**. Bamboo slab with mud screed **[stated]**. Soffit at +3.30 [read]. |
| Upper sill, upper head | +4.60, +5.80 | **[stated]** on section AA′ |
| Ridge | +8.50 | **[stated]** |
| Upper wall plate | +6.30 | [read]. Scaled off section AA′, whose upper eave falls between the +5800 and +8500 marks. |
| Ground plan | WC, bath, two bedrooms, kitchen with a chul bay, stair hall, living room, courtyard with a tree, and the terracotta jali screen by the WC | [read] off the p42 plan at about 41 px/m, ±0.3 m |
| First-floor plan | Two bedrooms over the ground bedroom and kitchen, and the stair hall, opening onto a balcony 1.7 m deep | [read] off the first-floor plan |
| Roofs | Upper gable over the two-storey block. West lean-to over the WC, bath and west bedroom. East lean-to over the living room and its verandah. Both lean-tos fall west, matching the roof plan's arrows. A small canopy over the courtyard's west verandah. A lean-to over the chul bay. | [read] |
| Front elevation | Drawn the right way round: window and two doors on each floor of the block; window, double door and window on the living room. Not mirrored, unlike p41. | [read] |
| Balcony | Turned posts stacked at the balcony edge on both floors. A railing of pierced pickets in pointed arches. | [read] from the elevation and the p42 render |
| Party wall | Each type B house is one of a mirrored pair sharing its east wall (p40). The twin is shown as plain massing from the plan model. The roof edges that meet it carry no valance. | **[stated]** |

**Assumed**

| Item | Basis |
|---|---|
| Stair form | Dog-leg, 16 risers of 181 mm: a masonry first flight and a timber second flight. The plans show only a stair. |
| Front verandah posts at z 12.6 | Needed to carry the east lean-to. The plan shows only the courtyard-corner posts. |
| Post at the west lean-to's free high edge | Needed for support |
| Canopy brackets | Needed for support |
| Living-room ceiling under the balcony | At the slab soffit |
| West bedroom's courtyard window | From the brief that every room opens onto the courtyard |
| Furniture | Not in the drawings |
| Kitchen garden, tulsi vrindavan, laundry, firewood, bicycle | Not in the drawings |
| Compound wall height | Its line is [read] from the plan |

**Lift.** "Separate the floors" lifts three layers apart:

| Layer | Lift |
|---|---|
| Ground-floor roofs | 3.6 m |
| Upper storey (bamboo floor, rooms, balcony, the man on it) | 3.6 m |
| Upper roof | 7.2 m |

**Verification**
- Front, aerial, back, balcony close-up, floors separated, section, dusk and a mirrored plot (06) were rendered. The screenshots are in `.inspect-review/b*.png`.
- Main-scene numbers are unchanged; nothing in the plan model was touched for type B.
- **Heap over 10 visits** to plots 05, 06 and 41: 11.66 MB after the first visit, then 11.93 → 12.60 MB, the same warm-up curve as type A. A heap-snapshot diff between visit 6 and visit 15 shows no retained application or three.js objects; the growth is compiled code and browser caches.
- **Refactor.** Type A was rebuilt on the shared vocabulary in the same change. It renders the same as before: front, jali and roof-lift views were compared with the earlier screenshots.

**Fidelity report: type B**

*Matches the PDF*
- **Levels.** Every level is as written on the sections.
- **Plans.** The ground and first-floor rooms, doors and windows, and the courtyard with its tree.
- **Roofs.** The roof forms and their fall directions.
- **Balcony.** The bedrooms open onto it.
- **Floor.** The bamboo first floor, its soffit visible from the verandah.
- **Woodwork.**
  - Stacked turned posts with brass rings.
  - Carved valances.
  - The pointed-arch railing.
  - Louvred folding doors from the living room to the courtyard verandah.
- **Chul bay** with its jali.
- **Toilet and bath** apart from the rooms on the same plinth.
- **The pair.** The mirrored twin is attached at the party wall.

*Differs* (known)
- **Party-wall end.** The upper roof stops at the party wall, where the drawing's continuous roof over the pair carries on. The twin's massing comes from the simpler plan model.
- **Canopy.** Its extent is fitted between the elevation and section BB′, which do not agree exactly.
- **Railing.** A generic pattern, not traced from the render.
- **Plan scale.** ±20 %, as for type A.

### 7.11 The primary school (p43), built 2026-11-12

**Readings**

| Item | Value | Basis |
|---|---|---|
| Legend | 1 classroom, 2 staff room, 3 principal cabin, 4 office, 5 toilet, 6 multi-purpose area | **[stated]** |
| Plinth, door and window heads, wing ridges, main ridge | +0.60, +2.70, +5.30, +5.80 | **[stated]** |
| Window sills | About +1.60 | [read] from section BB′ |
| Main eaves | About +3.30 | [read]. Scaled off section BB′ at about 37.7 px/m vertically. |
| Wing outer eaves | About +3.60 | [read], as for the main eaves |
| Plan | Main block 26.6 × 10.2 m. Two toilets at the back corners, a classroom each side, the principal's cabin and office on the left of the hall, the staff room and stores on the right. The hall runs straight through the block. Three classroom wings on each side step out round the court. The stage projects into the court with steps on three sides. | [read] at about 32 px/m on the 250 dpi crop, which agrees with the plan model's footprint |
| Classrooms | **Eight** (labelled 1): one each side in the main block and three in each set of wings | [read] from the labels. MODEL_NOTES §2 had seven. |
| Roofs | Every ridge runs north–south: all the roof plan's arrows point east or west, and both sections and the elevation agree. The main block is one shallow gable from +5.80 to +3.30 over x ±13.5. Each wing has its own gable to +5.30, with the ridge on the classroom's inner wall. The roof extents are from the roof plan at about 31 px/m. The wings' court-side slopes keep the outer slope's pitch, so their eaves stand higher (about +3.6 to +4.4) over the verandahs. | [read] |
| Hall | Open at both ends, tall turned posts at its mouths (elevation and section BB′). Timber battened screens between +3.5 and the roof over the hall's verandah ends. | [read] from section AA′ |
| Steps | North entrance from the road. The stage on three sides. Off the outermost wings to the south and from the middle wings into the court. | [read] |
| Trees | Nine, at the plan's tree symbols | [read] |
| People | Children in light-blue shirts with navy shorts or skirts: a ring game on the court, a class on the stage, children seated on a wing verandah | [read] from the four renders |

**Assumed**

| Item | Basis |
|---|---|
| Door swings and some window positions where the plan's arcs are unclear | ±0.3 m |
| Names of the three small rooms on the right | Store, staff WC, store |
| Classroom furniture: a blackboard on the outer wall, a teacher's table and rows of durries | The renders show children seated on the floor |
| Office, cabin and staff-room furniture, and toilet cubicle partitions | Not in the drawings |
| Flagpole on the court | Not in the drawings |
| Tree species | Not stated |
| Riser height | 200 mm |

**Verification**
- Arrival, court, aerial, back, hall, wing verandah, roofs lifted, section and dusk were rendered. The screenshots are in `.inspect-review/s*.png`.
- **Heap.** Ten visits alternating the school and a type A house: 11.57 MB after the first visit, then 11.74 → 12.55 MB. This is the same levelling warm-up curve as the houses.
- **Stage changes.** The stage now fits its shadow camera, zoom limit and pan range to each building's size. The school is about 40 m across; the houses keep their settings.

**Fidelity report: the school**

*Matches the PDF*
- **Plan.** Room layout and legend, the hall through the block, and the three stepped wings each side holding the court and stage.
- **Roofs.** All ridges north–south. A shallow main gable to +5.80, and a gable to +5.30 on each wing with the ridge on the classroom's inner wall.
- **Elevation.** The white gables and the central opening flanked by tall posts, as in the court render.
- **Woodwork.** Turned posts with brass rings, and carved valances.
- **Verandahs.** Plinths and steps down to the lawn, as in the renders.

*Differs* (known)
- **Wing pitch.** The court-side pitch of the wing roofs is inferred from the roof plan's extents. The sections show those slopes only in part.
- **Overlaps.** Where a wing roof overlaps its neighbour or the main roof, the tiles intersect instead of meeting in a proper valley.
- **Battened screens.** Their extent is read from one section.
- **Triangle count.** It is high for the low tier: about 122,000. Most of it is the nine trees and 25 people; the low tier saves only on the ground.
- **Plan scale.** ±20 %, as for the houses.

