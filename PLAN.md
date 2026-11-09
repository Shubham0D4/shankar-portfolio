# Shankar Wagh: Portfolio Website Plan

Source: `portfolio.pdf` (50 A3 pages, "Architectural Portfolio – Undergraduate Selected Works").
Content: `content.json`. Images: `public/assets/` (45 project sheets, 4 dividers, 1 CV sheet, 114 cropped renders and diagrams).
Status: planning only. No website code has been written.

---

## 0. Source constraints that shape everything

- **Flattened sheets.** Every PDF page is a single flattened image, with no separate render files. All images in `public/assets/<project>/` are crops from the sheets.
- **Low-resolution sheets.** The School (p10–15), Hotel basement (p24), Bandra municipal (p30–36) and Sales Office (p44–46) sheets are embedded at 72 ppi. They look soft above about 800 px wide.
- **No source models.** There are no SketchUp, Rhino or Lumion files (confirmed). Every 3D model is built in Three.js code, traced from plans and sections. Models are presented as "interpretive massing", not as survey-accurate replicas.

---

## 1. Design identity

Shankar designs from the ground and the community outward. Nearly every project is organised around a shared void at the centre: the school's courtyards, the resort's gardens, the central green of the Mumbai towers, the Irshalpada cluster court, and Dharavi's courtyards. The architect's own diagram, a solid block split around a green core, appears on two different sheets. Climate (sun path, wind, monsoon run-off), local material (yellow sandstone, terracotta jali, CSEB, Mangalore tile, bamboo) and universal access are treated as design drivers, not decoration. Two full drawing sets, a hotel working-drawing set and a Bandra municipal submission, show a technical discipline unusual for a student portfolio.

---

## 2. Project analysis: form language and 3D potential (ranked)

| Rank | Project | Form language | 3D suitability |
|---|---|---|---|
| 1 | **Residential School**, Kanoi, Jaisalmer | Low, thick-walled sandstone blocks step down the contours from 167 to 156 m. Courtyards, arcades and jali screens cut the masses. Ramps run between levels, and the plan opens toward a lake. | **Very high.** Terrain plus massing is the whole idea, and only 3D shows it. The model also makes up for the 72 ppi sheets. |
| 2 | **Irshalpada Rehabilitation**, Raigad | Four lime-white houses with hip Mangalore-tile roofs, timber verandah posts and internal courtyards, grouped around a shared green. A black folded-slab memorial stands on a stepped plinth in water. | **High.** The geometry is small and clean. Hip roofs and verandahs are easy to build in code, and the story (home, community, memory) suits a slow reveal. |
| 3 | **Mass Housing**, Byculla, Mumbai | Slender 36-plus-storey slab towers on two curved, banded parking podiums around a central green. Wings D, E and F join into a boomerang. Heavy balcony banding. | **High for massing, low for detail.** Plain extrusions work. The four-stage design progression is ready-made scroll choreography. |
| 4 | **Dharavi Rerooted** | Plus-shaped towers with a central lobby spine, set four to a block around community courtyards. Clear SRA and saleable zoning. | **Medium-high as a diagram.** Cross plans are trivial to build in code, so it is best shown as a courtyard, airflow and zoning diagram rather than a realistic model. |
| 5 | **Sukoon Resort**, Kamshet | Small pavilions strung along a curving waterfront: butterfly or sawtooth-roof guest rooms, an octagonal hipped hall, brick and timber, terracotta jalis, a kund amphitheatre. | **Medium.** It works as a site-scale model, but many element types raise build cost. |
| 6 | **Hotel – Working Drawings** | An elongated octagonal podium with a slab block above, on a regular RCC column grid (600×400) over two basements. Brick-clad facade with revolving windows and fins. | **Medium as a technical diagram.** An exploded floor stack over the column grid shows construction literacy, but it is not a hero model. |
| 7 | **Bandra – Municipal Drawings** | A compact G+13 point block with a plus-shaped core, curved basement ramp and stilt parking. | **Low-medium.** It suits an "area diagram" extrusion (FSI and RERA colours) but is visually ordinary. |
| 8 | **Sales Office Interior** | A rectangular office lined with fluted timber panels ("Lines"), with arched reception niches. Hand-drawn. | **Low as a building, medium as a micro-study.** A small interactive fluted-panel wall could express the theme. |

---

## 3. Aesthetic directions

### A. "Courtyard & Jali" (recommended)
- **Palette.** Lime-white `#F4EFE6`, sandstone `#D9C29C`, terracotta `#B4623E`, charcoal `#2A2724`, and a muted courtyard green `#7D8B6A` used sparingly.
- **Typography.** An editorial serif for display, such as Fraunces or Cormorant, paired with a quiet grotesk for text, such as Inter Tight or Söhne-like. Large, calm headings with generous margins.
- **Motion.** Slow and led by light. A scroll-driven sun moves across each model. Jali shadow patterns drift over section dividers. Page transitions fade like clouds passing.
- **3D.** Matte "clay" models tinted by their real materials (sandstone, lime, tile), lit by each project's own sun-path diagram, in daylight against warm paper.

### B. "Drawing Set"
- **Palette.** Paper-white, graphite, blueprint grey, and one red-line accent.
- **Typography.** Monospace labels (IBM Plex Mono) and a condensed grotesk.
- **Motion.** Lines draw themselves. Section planes slice through models on scroll. Dimension strings animate in.
- **3D.** White models with edge lines and clipping planes, like an interactive working drawing.

### C. "Night Gallery"
- **Palette.** Near-black with warm spotlights.
- **Typography.** A large high-contrast sans.
- **Motion.** Cinematic camera fly-throughs and full-screen transitions.
- **3D.** Glowing models floating in darkness.

### Recommendation: A, borrowing B's section-cut mechanic
Direction A comes straight from the work: the materials it uses, its recurring courtyard and sun-path diagrams, and the warm daylight of the renders. It makes the site feel like the architect's own sensibility rather than a template. Direction B's clipping-plane "section cut" is kept as a tool for the Hotel and Bandra drawing sets, where technical rigour is the point. Direction C is rejected because dark 3D portfolios are generic, they clash with the bright daylight renders, and they hide the drawings.

---

## 4. Sitemap and page content

1. **Home `/`**
   - **Hero.** A 3D "courtyard formation" model: a solid block splits into four masses around a green void. Name, "Architecture student, Sir J.J. College of Architecture" and a one-line statement.
   - **Featured work.** Three projects (School, Irshalpada, Mass Housing), each with a live mini-model or poster.
   - **Statement.** The full CV statement.
   - **Footer strip.** All 8 projects as a horizontal index.
2. **Work `/work`**. A grid of 8 projects, filterable by Housing, Institutional, Hospitality, Rehabilitation, Urban, Interior and Technical. Each card shows title, semester, location and typology.
3. **Project pages `/work/<slug>`**. One template for all eight, in this order:
   1. 3D model, or hero image for projects without a model.
   2. Facts strip: semester, location, typology, key areas.
   3. Narrative: description, then key facts.
   4. Material swatches: the project's material list, with matching texture crops where available.
   5. Drawings gallery: full sheets with lightbox and zoom. The 72 ppi sheets are labelled and shown smaller.
   6. Previous and next project.
   - Competition entries carry the note "Team entry – full credits to be confirmed".
4. **Technical Practice `/technical`**. The Hotel working-drawing set and the Bandra municipal set, each with a sheet viewer. Phase 2 adds an exploded column-grid model for the Hotel and an area-diagram extrusion for Bandra.
5. **About `/about`**. Portrait (pending approval), statement, education, workshops and electives, software, languages, soft skills, extracurriculars, and competitions entered.
6. **Contact `/contact`**. Email, LinkedIn and location. Phone numbers are held back until approved.

---

## 5. 3D strategy

### Shared rig
- **Renderer and lighting.** One renderer per page. A sun light positioned from azimuth and elevation, with soft shadows on desktop only, plus hemisphere fill light.
- **Look.** Matte material tints and a subtle edge-line overlay.
- **Lazy loading.** Each model starts only when scrolled into view and pauses when it leaves.

### Home hero: Courtyard Formation
- **Abstraction.** Concept diagram, based on the architect's own "formation of courtyards" diagram (pages 10 and 17).
- **Content.** A sandstone cube on a ground plane.
- **Scroll.** The cube splits along two axes into four masses, a green void rises in the centre, and jali panels fade into the gaps.
- **Mouse.** Small camera parallax, and the sun follows the cursor so shadows sweep through the court.

### Model 1: Residential School (build first)
- **Why first.** It is the strongest form idea (architecture on contours) and the weakest images (72 ppi).
- **Abstraction.** Massing plus terrain. The terrain is stepped terraces from the contour-band diagram (below 149 m to above 173 m). The 17 masterplan components are extruded footprints with courtyard voids, the lake is a water plane, and roads and paths are flat strips.
- **Scroll.** Five stages:
  1. Bare site and lake.
  2. Contour bands rise.
  3. Blocks settle onto their levels in order: mess at 156 m, library 157–159 m, academic block 161–167 m.
  4. The sun sweeps along the sun-path arc and shades the courtyards.
  5. A clipping plane cuts section X-X' to show the stepping.
- **Mouse.** Limited orbit. Hovering a block shows its label (Admin, Academic, Library, Sports, Mess, Hostels) and links to its sheet.

### Model 2: Irshalpada Cluster
- **Why.** The cluster is easy to build in code, and the human story carries it.
- **Abstraction.** Facade-level for one cluster: four houses (2 G+1, 2 G) with hip tile roofs, verandah posts, openings, the shared court and trees. The Temple of Memories (three folded black slabs on a stepped plinth in water) appears in an adjacent scene.
- **Scroll.**
  1. Aerial view of the cluster.
  2. Roofs lift and hover to reveal the plans and internal courtyards.
  3. The camera settles at eye level in the shared court.
  4. It moves on to the Temple of Memories.
- **Mouse.** A gentle look-around, with no free orbit.

### Model 3: Mass Housing
- **Why.** The design-progression diagram maps directly onto a scrub timeline.
- **Abstraction.** Massing only. Footprints come from the stage diagrams and the final roof plan. Towers are extruded to their section heights (about 130–145 m) with instanced floor-band lines, and the podiums are curved bands.
- **Scroll.** Scrubs through the four stages: 8 towers on one podium, the podium split, the open layout, then the final layout with fewer towers and a large central green. Each stage gets a caption from the sheet.
- **Mouse.** Moves the sun, which casts long Mumbai shadows across the green. Hovering a tower shows its wing letter and unit types.

### Phase 2
- **Dharavi.** A courtyard diagram: four plus-shaped towers, the community centre and airflow arrows, with an SRA versus saleable colour split.
- **Hotel.** An exploded floor stack over the column grid.
- **Bandra.** An area-diagram extrusion.
- **Sales Office.** A fluted-panel "Lines" wall that ripples under the cursor.

### Geometry pipeline (no Blender)
1. A dev-only tracing page loads a plan crop as a texture. Points are clicked to make polygons, and the result is exported as JSON.
2. Real dimensions from the sheets set the scale: site area, levels, 1:200 and 1:500 scale notes.
3. Code turns the polygons into extrusions, hip roofs, instanced repeats and terrain.
4. Each model lives in its own module with a small, typed parameter file, so corrections are data edits rather than rebuilds.

---

## 6. Tech stack and risks

**Stack**
- **Base.** Vite with TypeScript, using vanilla multi-page HTML and no UI framework. Project pages are generated at build time from `content.json` into static HTML, which is good for SEO and fast first paint.
- **3D.** Three.js, using extruded shapes, instanced meshes, a clipping plane and an edge-line overlay.
- **Scroll.** GSAP with ScrollTrigger for scroll-linked timelines.
- **Fonts.** Self-hosted through Fontsource.
- **Images.** A build-time sharp pipeline produces AVIF, WebP and JPEG fallbacks with responsive `srcset`, plus a lightbox for sheets.
- **Hosting.** Static hosting on Netlify, Vercel or GitHub Pages.

**Risks and mitigations**

| Risk | Mitigation |
|---|---|
| Traced geometry is inexact because some dimensions are illegible. | Label models "interpretive massing". Keep parameters in data files for easy correction. |
| 72 ppi sheets look blurry. | Cap their display size, lead those pages with 3D, and ask the architect for originals if they exist later. |
| Mobile GPU and battery cost. | Lazy init, capped device pixel ratio, no shadows on mobile, frame-rate throttling off-screen, and a poster image when WebGL is missing or slow. |
| Motion sensitivity. | Under `prefers-reduced-motion`, scroll stages become stepped static states with buttons. |
| Content locked inside the canvas. | All facts and captions also exist as HTML. Hover labels get keyboard equivalents. |
| Asset weight. | The PDF is 29 MB and the extracted JPEGs about 37 MB. Ship only responsive derivatives, and lazy-load galleries. |
| Unconfirmed content: team credits, phone numbers, portrait, roll numbers. | Hold back from publishing until confirmed. These are listed in `content.json` under `gaps`. |
| Scope creep in 3D detail. | Fix each model's level of abstraction (above) and timebox each model. |

---

## 7. Build order

| Phase | Deliverable |
|---|---|
| 0 | Extraction: `content.json`, `public/assets/`, and this plan. **Done.** |
| 1 | Vite scaffold, design tokens (palette, type scale, spacing), base layout, navigation and footer. |
| 2 | Static site from `content.json`: Home, Work, the 8 project pages, Technical, About and Contact, with image pipeline and lightbox. Shippable without 3D. |
| 3 | Shared 3D core (renderer, sun rig, materials, lazy loader, fallbacks, reduced-motion handling) and the Home "Courtyard Formation" hero. |
| 4 | Tracing tool, then Model 1: Residential School. |
| 5 | Model 2: Irshalpada cluster and the Temple of Memories. |
| 6 | Model 3: Mass Housing progression. |
| 7 | Motion polish, accessibility audit, and performance budget (Lighthouse at least 90 on mobile for non-3D pages). |
| 8 | Deploy and domain. |
| 9 | Phase-2 diagrams: Dharavi, Hotel, Bandra and Sales Office. |

## Assumptions in force
- **Display name** is "Shankar Wagh". The full name, Shankar Shilpa Abhijit Wagh, appears on the About page.
- **Audience** is architecture firms recruiting interns or graduates, and academic juries.
- **Public contact** is email and LinkedIn only. Phone numbers, the portrait and roll or entry numbers are withheld until approved.
