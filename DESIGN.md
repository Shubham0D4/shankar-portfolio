# Shankar Wagh: Design System

Direction: **"Walnut, brass and vellum"**, adopted on 2026-11-12.
It replaces every earlier direction (courtyard and jali, drafting film and indigo, and the pencil-sketch study). None of their tokens, faces or devices carry over.

The site should feel like a quiet, high-end studio: a walnut desk, brass instruments, vellum sheets under a warm lamp. One family of browns, one restrained metal accent, generous curves set against razor-thin lines.

Tokens live in `src/styles/tokens.css`; the 3D theme lives in `src/three/theme.ts`. This file explains both.

---

## 1. Principles

1. **Curvy but sharp.** Every surface that holds content (images, cards, buttons, the hero stage) has a large, smooth corner. Everything that carries information (tags, tick marks, plate numbers, rules) is crisp: square corners, 1 px lines, tabular figures.
2. **One family of browns.** Dark espresso and walnut for the hero and footer, light vellum and sand for reading. Brass is the only accent and it never fills a large area.
3. **Tone before shadow.** Depth comes from stepping between tones and from hairlines. No drop shadows on UI. The only real shadows are the ones cast by the 3D instruments.
4. **Drawing-set order.** Projects carry their plate numbers from the printed portfolio. Scale bars and tick marks appear where they help orient, never as wallpaper.
5. **Calm motion.** One signature moment on the home page: the compass opens and draws its arc. Everything else is a short, soft response.
6. **Facts in HTML.** Anything in a canvas also exists as text.

### What we avoid
- Heavy or grey drop shadows, glassmorphism, gradient washes.
- Tracked all-caps eyebrows above every heading, middle-dot meta strings, arrows appended to link text.
- Colouring or italicising one word in a headline for emphasis.
- Looping, bouncing or scroll-jacked animation.
- Brass as body text on light grounds (it fails contrast, see §2.4).

---

## 2. Colour

### 2.1 The family

| Token | Hex | Material | Notes |
|---|---|---|---|
| `--espresso` | `#1E1611` | Ebonised walnut | Deepest tone. Hero and footer ground, primary text on light. |
| `--walnut` | `#2E211A` | Oiled walnut | Raised surfaces on dark (menu panel, cards in the footer). |
| `--cocoa` | `#4A372B` | Cocoa leather | Elevated surface on dark; strong secondary text on light; focus ring on light. |
| `--umber` | `#6F5442` | Raw umber | Secondary text on light, form-field borders. |
| `--caramel` | `#B88B5E` | Pale walnut, caramel | Fills, model tints, illustration. Text only on espresso or walnut. |
| `--sand` | `#E7DDCC` | Sand, kraft card | Image mats, sunken areas, the alternate light section. |
| `--vellum` | `#F2ECE2` | Vellum | Main light page ground. |
| `--paper` | `#F9F5EE` | Cartridge paper | Elevated light surface (cards, inputs, popovers). |
| `--brass` | `#C9A46B` | Brushed brass | **The accent.** Tick marks, active indicators, focus ring on dark, text on dark. |
| `--brass-ink` | `#7A5A2A` | Aged brass | The only accent tone allowed as text on light (links on hover, the current plate). |
| `--oat` | `#C2B19B` | | Secondary text on dark. |

### 2.2 Roles

| Role | Light sections | Dark sections (hero, footer, menu) |
|---|---|---|
| `--bg` | vellum `#F2ECE2` | espresso `#1E1611` |
| `--surface` | paper `#F9F5EE` | walnut `#2E211A` |
| `--surface-elevated` | paper + 1 px hairline | cocoa `#4A372B` |
| `--surface-sunken` | sand `#E7DDCC` | `#17110D` |
| `--hairline` | espresso at 16% | vellum at 16% |
| `--hairline-strong` (inputs) | umber `#6F5442` | oat `#C2B19B` |
| `--text` | espresso `#1E1611` | vellum `#F2ECE2` |
| `--text-secondary` | umber `#6F5442` | oat `#C2B19B` |
| `--accent` | brass `#C9A46B` (fills and lines), brass-ink `#7A5A2A` (text) | brass `#C9A46B` |
| `--focus` | cocoa `#4A372B`, 2 px, 3 px offset | brass `#C9A46B`, 2 px, 3 px offset |

Sections switch with a `data-tone="dark"` attribute, which reassigns the role tokens. Components use only role tokens, so they work on either ground.

### 2.3 Contrast (WCAG 2.2, computed from the hex values)

Body text needs 4.5:1, large text (24 px, or 18.66 px bold) and UI outlines need 3:1.

| Text | On | Ratio | Use | Passes |
|---|---|---|---|---|
| espresso | paper | 16.40 | Body on cards | AA, AAA |
| espresso | vellum | 15.17 | Body | AA, AAA |
| espresso | sand | 13.25 | Body on mats | AA, AAA |
| cocoa | vellum | 9.54 | Captions | AA, AAA |
| cocoa | sand | 8.34 | Captions on mats | AA, AAA |
| umber | paper | 6.39 | Secondary | AA |
| umber | vellum | 5.91 | Secondary | AA |
| umber | sand | 5.17 | Secondary on mats | AA |
| brass-ink | paper | 5.81 | Accent text | AA |
| brass-ink | vellum | 5.38 | Accent text | AA |
| brass-ink | sand | 4.70 | Accent text on mats | AA |
| vellum | espresso | 15.17 | Body on dark | AA, AAA |
| vellum | walnut | 13.25 | Body on dark surface | AA, AAA |
| vellum | cocoa | 9.54 | Body on elevated dark | AA, AAA |
| oat | espresso | 8.54 | Secondary on dark | AA, AAA |
| oat | walnut | 7.46 | Secondary on dark surface | AA, AAA |
| oat | cocoa | 5.37 | Secondary on elevated dark | AA |
| brass | espresso | 7.64 | Accent text on dark | AA, AAA |
| brass | walnut | 6.68 | Accent text on dark surface | AA |
| brass | cocoa | 4.81 | Accent text on elevated dark | AA |
| caramel | espresso | 5.85 | Plate numbers on dark | AA |
| caramel | walnut | 5.11 | Plate numbers on dark surface | AA |
| espresso | brass | 7.64 | Label on a brass button | AA, AAA |
| espresso | caramel | 5.85 | Label on a caramel fill | AA |

Non-text: the focus ring is 9.54:1 on vellum (cocoa) and 7.64:1 on espresso (brass). Form-field borders are umber, 6.39:1 on paper.

### 2.4 Pairs that fail, and the rule that keeps them out

| Pair | Ratio | Rule |
|---|---|---|
| brass on vellum | 1.98 | Brass is never text on light. On light it is lines, ticks and fills only. Text uses brass-ink. |
| caramel on vellum | 2.59 | Caramel is never text on light. |
| caramel on cocoa | 3.00 | Not used for text. |
| umber on espresso | 2.57 | Umber is a light-ground tone only. |
| Hairlines (16%) | about 1.3 | Decorative separators only. Anything a user must perceive as a boundary (inputs, the current-page mark) uses a strong tone. |

### 2.5 Theme
Light, with dark-leaning hero and footer. The site declares `color-scheme: light`; the dark sections are part of the composition, not a dark mode. There is no user-toggled dark theme, because the renders and drawings are daylight images on white paper.

---

## 3. Typography

| Role | Face | Setting |
|---|---|---|
| Display and headings | **Bodoni Moda** (variable, optical size 6–96, weight 400–900) | Weight 450, optical size matched to size (`font-optical-sizing: auto`), leading 0.95 for display, 1.1 for headings, tracking −0.02em at display sizes. Sentence case. Roman only: no italic emphasis. |
| Text and UI | **Anek Latin** (Ek Type, Mumbai, variable) | Width 100, weight 400 for text, 520 for UI labels. Leading 1.6, measure 60–68ch. |
| Figures and tags | Anek Latin | Width 87.5, weight 560, tabular numerals, sentence case, untracked. |

Why these two. Bodoni Moda's hairline serifs and round bowls are the type version of "curvy but sharp": the same contrast as a 28 px corner meeting a 1 px rule. Its optical-size axis keeps the hairlines crisp at 140 px and sturdy at 24 px. Anek Latin is already in the project, comes from a Mumbai foundry with a Devanagari companion, and reads cleanly at text sizes; it stays as the working voice so the display face can be the only flourish.

Both are self-hosted through Fontsource (`@fontsource-variable/bodoni-moda`, `@fontsource-variable/anek-latin`), Latin subset only, `font-display: swap`, and the two files used above the fold are preloaded.

### Scale (fluid, 360 px to 1440 px)

| Token | Min → max | Use |
|---|---|---|
| `--step--2` | 12 → 12 | Legal, tick labels. |
| `--step--1` | 13 → 14 | Tags, captions, figure numbers. |
| `--step-0` | 16 → 18 | Body. |
| `--step-1` | 19 → 22 | Lead paragraphs, card titles. |
| `--step-2` | 23 → 28 | h3. |
| `--step-3` | 28 → 40 | h2. |
| `--step-4` | 36 → 60 | Page titles. |
| `--step-5` | 44 → 88 | Project titles. |
| `--step-display` | 52 → 136 | The name in the home hero only. |

### Rules
- Hierarchy comes from size and the change of face, not from colour.
- Plate numbers, areas and dates use tabular numerals.
- Labels appear only where a drawing's title block would name a field.

---

## 4. Shape language

| Token | Value | Use |
|---|---|---|
| `--r-stage` | `clamp(20px, 2.4vw, 36px)` | The hero stage, project hero, model slots. |
| `--r-card` | `clamp(16px, 1.8vw, 28px)` | Images, project thumbnails, cards, the portrait. |
| `--r-control` | `999px` | Buttons and filter chips: full pill. |
| `--r-field` | `14px` | Inputs and text areas. |
| `--r-tag` | `0` | Tags, plate numbers, tick labels: sharp. |

- **Superellipse.** Where the browser supports `corner-shape: superellipse()`, cards and images get a squircle corner (`superellipse(1.6)`), which reads smoother than a circular arc. Elsewhere the same radius is a plain `border-radius`.
- **Hairlines.** 1 px, never 2. Rules run the full width of their column and stop exactly at the gutter.
- **Ticks.** Small square tick marks (1 × 6 px) mark section starts and scale bars. They are brass on dark, espresso at 40% on light.
- **The arc.** One curved divider, a quarter of a compass arc with tick marks, sits where the dark hero meets the first light section. It is the only curved divider on the site.
- **Mixed corners.** A card is rounded; the tag pinned to it is square. A button is a pill; the focus ring follows its shape at a 3 px offset.

---

## 5. Space

A 4 px base. Section rhythm uses `--space-section`; components use fixed steps.

| Token | px |
|---|---|
| `--space-3xs` … `--space-4xl` | 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 |
| `--space-section` | 80 → 176, fluid |

---

## 6. Layout

### Grid
| Viewport | Columns | Gutter | Page margin |
|---|---|---|---|
| < 640 px | 4 | 16 px | 16 px (360 px is the floor) |
| 640–1023 px | 8 | 24 px | 5vw |
| ≥ 1024 px | 12 | 32 px | 5vw, up to 80 px |

- `.frame` caps content at 1440 px. Hero stages and full-bleed images may break out; running text never does.
- **Disciplined asymmetry.** Text blocks start on column 1 or column 5 and never centre. Images take 7 or 8 columns against 4 or 5 of text, alternating sides down a page.
- **Ratios.** Project thumbnails 4:5 (portrait) in the index and 3:2 on the home page. The project hero is 16:9 on desktop, 4:5 on phones. Sheets keep √2.
- **Plate numbers.** Each project shows its first portfolio page as a plate number ("Plate 09") in a square tag.
- **Scale bar.** One 0–5–10 m style scale bar in the footer title block and under the hero, as a quiet ordering device.

---

## 7. Motion

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | Reveals, hovers, menus. |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Page transitions, the compass opening. |
| `--dur-hover` | 200 ms | Colour and underline changes. |
| `--dur-short` | 320 ms | Menus, filters, page cross-fade. |
| `--dur-reveal` | 600 ms | Scroll reveals. |
| `--rise` | 12 px | Reveal distance. |

- **Scroll reveal.** Content blocks fade in and rise 12 px once, when they first enter the viewport, at 600 ms ease-out. Items in a row stagger by 60 ms, at most four. They never animate out.
- **Hover.** Thumbnails scale the image 1.03 inside a fixed frame (a crop shift, the frame does not move) and lift the caption's underline; buttons change tone. 200 ms.
- **Page transitions.** A cross-document View Transition: a 320 ms cross-fade, header excluded. Browsers without support navigate normally.
- **Smooth scrolling.** `scroll-behavior: smooth` for in-page links only. No scroll-jacking library.
- **Signature moment.** The hero instruments (§8).
- **Reduced motion.** Under `prefers-reduced-motion: reduce`: reveals are off (content is simply there), page transitions are instant, smooth scrolling is off, and the hero shows its still image instead of the live scene. Hover colour changes remain.

---

## 8. Landing hero: the instrument still life

The courtyard-formation block (SVG poster, scroll choreography, step buttons, favicon motif) is removed.

### Composition
A walnut-and-vellum desk seen from a three-quarter overhead camera (about 52° elevation, 26° field of view), lit by a warm lamp from the upper left. Five instruments, arranged on a sheet of vellum like a considered still life:

| Piece | Material | Detail |
|---|---|---|
| **Drafting compass** | Brushed brass body, steel needle and lead legs, knurled steel handle | The hero object. Lies on the sheet at the centre right, legs slightly open. Opens once on arrival while a fine umber arc draws on the sheet beneath it, then rests. |
| **Triangular scale rule** | Sand-coloured matte plastic, three bevelled faces | Lies along the lower edge, parallel to the frame. Engraved ticks are real geometry (recessed bars), numerals for 1:100 and 1:200 are a texture with a matching normal map. |
| **45° set square** | Smoked caramel acrylic, polished bevelled edges, a cut-out inner triangle | Upper left, overlapping the sheet's edge. Graduations along the hypotenuse. |
| **Mechanical pencil** | Matte espresso barrel, knurled steel grip, brass clip and push cap | Lies diagonally across the scale rule, pointing toward the compass, so the eye travels pencil, compass, arc. |
| **Rolled drawing** | Cartridge paper with a visible spiral end, a cocoa cloth band | Back right, half out of frame, giving depth. |

The sheet itself carries a faint plan drawing in umber (a courtyard plan, a nod to Shankar's recurring court), which the compass arc completes.

### Light and materials
- Physically based materials: brass and steel metallic (roughness 0.28–0.4), acrylic with clearcoat and transparency, matte plastic and paper with high roughness, walnut with a procedural grain map.
- A procedural room environment (Three.js `RoomEnvironment`, tinted warm) gives the metals something to reflect. No downloaded models, textures or HDRIs.
- Key: warm directional light at about 3200 K from upper left with soft shadows. Fill: a dim cool-neutral hemisphere. Rim: a faint brass-toned back light so the compass edge reads against the dark desk.
- Soft contact shadows: a shadow map from the key light (rendered once, then frozen) plus a blurred contact-shadow texture under each object.
- Ground: the vellum sheet on a dark walnut desk that falls off into the espresso page background, so the scene's edges dissolve into the hero.

### Motion
- **Reveal on load** (about 2.4 s total): the scene fades up from espresso while the camera eases in from 6° higher; the compass legs open from 18° to 34° and the arc draws in step; then everything rests.
- **Idle:** a camera drift of ±1.5° over about 24 s, sinusoidal, barely perceptible.
- **Pointer:** a gentle tilt of up to 2.5° following the pointer, damped. None on touch.
- No loops that call attention to themselves.

### Hero copy
On desktop the copy sits in columns 1–5 over the dark ground, the scene in columns 5–12 behind and beside it. On phones the copy comes first and the scene follows at 4:5. Copy: the name in Bodoni Moda at `--step-display`, one line of positioning, and one primary link ("See the work") plus a quiet secondary ("About Shankar").

### Performance
- The page renders and is usable with no 3D at all: the hero shows a still image of the same composition (AVIF, WebP, JPEG, responsive widths, rendered from the scene itself) with explicit dimensions.
- The scene module and Three.js load only after first paint, when the browser is idle and the hero is in view.
- Pixel ratio capped at 1.5 (1.25 on coarse pointers). Shadows are frozen after the reveal.
- Rendering pauses when the hero leaves the viewport or the tab is hidden, and the idle drift runs at 30 fps.
- The still image stays, and the scene never loads, when WebGL is missing, under reduced motion, with Save-Data, or on devices reporting 2 GB of memory or less.

---

## 9. Components

- **Header.** Wordmark in Bodoni Moda, then Work, Technical, About and Contact in Anek. Transparent over the dark hero, vellum with a hairline once scrolled. The current page is marked by a 1 × 6 px brass tick and a 1 px underline, plus `aria-current="page"`. Below 768 px the links fold behind a "Menu" pill.
- **Menu.** A walnut panel with large rounded bottom corners: pages in Bodoni Moda, then the eight projects with 4:5 thumbnails. Esc closes it and returns focus.
- **Buttons.** Pills. Primary: espresso fill with vellum text on light, brass fill with espresso text on dark. Secondary: 1 px strong outline. Hover steps one tone; no shadow.
- **Project thumbnails.** Rounded image frame on a sand mat, a square plate tag pinned to the top-left corner, title in Bodoni Moda below, semester and place in secondary text. Hover crops in 3% and underlines the title.
- **Project bar.** Sticky on project pages: "Plate 09, 2 of 8", jump links to Model, Project, Figures and Sheets, Previous and Next.
- **Forms.** Paper fields with umber borders and a 14 px radius, labels above, errors in text with an icon, never colour alone.
- **Footer as title block.** Espresso ground, a grid of hairline cells: architect, projects, contact, this sheet, and the scale bar. Brass labels.
- **404.** A blank vellum sheet with a single compass arc that does not close, and a link back to the work.
- **Model slot.** `[data-model-slot]` keeps its contract: a poster that is also the no-WebGL fallback, a canvas mounted over it, and a figcaption carrying the facts. The stage gets `--r-stage` corners and the 3D theme background.
- **Building inspect.** Behaviour unchanged. Its stage background, panel colours and day and dusk light read from the 3D theme (§11). Callouts keep their drafting convention: solid leader for facts from the drawings, dashed leader and outlined tag for assumptions. MODEL_NOTES.md §7 describes the model.

---

## 10. Imagery

- **Formats.** Every image ships as AVIF and WebP with a JPEG fallback, at 480, 800, 1200 and 1600 px widths, generated at build time with sharp. All below-the-fold images use `loading="lazy"` and `decoding="async"`; all carry width and height.
- **Consistent frames.** Renders sit in rounded frames at the ratios in §6. Line drawings and sheets sit on sand mats and use `mix-blend-mode: multiply`, so their white paper takes the sand tone. This is the only colour grade: renders are not recoloured, because they record the design.
- **Portrait.** 4:5, `--r-card` corners, a sand mat, and a very light warm grade (CSS `sepia(0.08) saturate(0.95)`). It appears on the About page only once the architect approves it (see PLAN.md, "Assumptions in force").
- **Alt text.** Renders describe what is shown and from where ("The central green seen from the podium bridge"). Sheets name their content and plate number. Decorative textures have empty alt.

---

## 11. 3D theme hooks

`src/three/theme.ts` is the single source for every canvas's surroundings:

- `stage`: the slot background colour (sand on light pages) and the canvas clear colour.
- `hemi`: sky and ground colours and intensity of the fill light.
- `sun`: key light colour and intensity.
- `inspect.day` and `inspect.dusk`: the building-inspect stage background, fog and light colours.
- `hero`: the instrument scene's desk, paper, light colours and exposure.

The shared rig (`src/three/rig.ts`) and the inspect stage read these values. Model geometry, materials and tints (`TINT`) are not changed.

---

## 12. Accessibility and performance commitments

- WCAG 2.2 AA throughout; the pairs in §2.3 are the only text pairs used.
- Visible focus on every interactive element: 2 px ring at 3 px offset, following the element's radius, cocoa on light and brass on dark.
- Targets at least 44 × 44 px on touch.
- Usable at 360 px wide with no horizontal scroll.
- Lighthouse (mobile) targets: accessibility 100, performance ≥ 95 on Home, About and Contact, and no regression on project pages.
