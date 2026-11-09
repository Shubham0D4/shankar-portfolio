# Shankar Wagh: Design System

Direction: **"Drafting film and indigo"**, revised on 2026-11-09 from the first pass ("Courtyard & Jali": lime cream, Eczar serif, terracotta).
That first pass read as a template: a cream ground, a serif display face and a terracotta accent are the most common look of generated sites, and hairlines everywhere pushed it further toward a broadsheet.
The site now reads as indigo ink on cool drafting film, with Jaisalmer sandstone as the one warm material. Tokens live in `src/styles/tokens.css`. This file explains them.

---

## 1. Principles

1. **The court is the centre.** Shankar's projects are organised around a shared void. The home page has one centre of gravity, the courtyard-formation block, and it stands on the same datum as the name.
2. **Ink, film and stone.** Indigo is the ink of the drawings and the poché of cut walls. The ground is drafting film, cool and grey, never cream. Gold is Jaisalmer sandstone and appears only as a solid fill.
3. **Lettering, not typesetting.** One family, Anek Latin, at its narrowest and heaviest for headings, like the lettering in a title block scaled up. The width axis is the expressive tool.
4. **A register, not a gallery.** The work is indexed the way a drawing set is: by sheet numbers from the printed portfolio. Navigation always says where you are among the eight.
5. **Motion answers people.** One orchestrated moment on the home page (the block parting). Everything else moves only when someone acts: titles widen when pointed at, the menu wipes open.
6. **Facts in HTML.** Anything in a canvas also exists as text.

### What we avoid on purpose
- Cream grounds, serif display faces and terracotta or clay accents.
- Tracked all-caps eyebrows, monospace labels, middle-dot meta strings and arrows appended to links.
- Rounded cards with shadows. Frames are square and carry no shadow.
- Fade-and-slide entrances on sections.

---

## 2. Colour

| Token | Hex | Material | Use |
|---|---|---|---|
| `--film` | `#ECEDE8` | Drafting film | Page ground. |
| `--film-deep` | `#DFE1DA` | Film in shade | Image placeholders, the ground plane in diagrams. |
| `--ink` | `#1E2756` | Indigo ink, poché | All text (12.06:1 on film), 2 px structural rules, the footer and the menu panel. |
| `--ink-soft` | `#4A5279` | Diluted ink | Secondary text on film (6.43:1) and on film-deep (5.74:1). |
| `--ink-pale` | `#A9AFC9` | | Secondary text on ink (6.53:1). |
| `--gold` | `#D9A441` | Jaisalmer sandstone | **Fills only**: the formation masses, the current-page block, the active filter, link underlines drawn as bars. Never text on film (1.91:1). Ink on gold is 6.31:1; gold on ink is 6.31:1, used for labels in the footer and menu. |
| `--gold-lit` / `--gold-shade` | `#C48F2F` / `#9C6F22` | Stone in shade | The two side faces of masses. |
| `--court` | `#6E8B5E` | Courtyard green | **Only the void**. |

**Rules.** Structural rules (the datum, section heads, register top, facts strip) are 2 px ink. Row dividers are 1 px ink at 22%. Focus is a 2 px ink outline with 3 px offset, gold on ink grounds.

**No dark theme.** The renders are daylight images. The site declares `color-scheme: light`.

**3D models** keep their own material tints (lime plaster, paving, tile). They are objects on the drawing board and are not recoloured to the site palette.

---

## 3. Typography

| Role | Face | Setting |
|---|---|---|
| Display and headings | **Anek Latin** (Ek Type, Mumbai) | Width 75, weight 680 (760 for the hero name and wordmark), leading 0.86 for display and 1.05 for headings, tracking −0.01 to −0.03em. |
| Text and UI | Anek Latin | Width 100, weight 400, leading 1.55, measure ≤ 66ch. |
| Labels and navigation | Anek Latin | Width 87.5, weight 500–600, sentence case, untracked. |

One family, self-hosted through Fontsource (`@fontsource-variable/anek-latin`). Eczar is no longer loaded. Anek's Devanagari companion leaves room for Marathi later.

**Width as motion.** Register titles and pager titles open from width 75 to 100 when pointed at or focused, like a mass extruding. Instant under reduced motion.

### Scale
The traditional scale from *The Elements of Typographic Style* (§3.1.1), set in rem:

| Token | px | Use |
|---|---|---|
| `--step--2` | 12 | Legal, figure numbers. |
| `--step--1` | 14 | Labels (Anek, width 75, weight 500), captions. |
| `--step-0` | 16 | Body on small screens, UI. |
| `--text-body` | 16 to 18 | Body copy, fluid. |
| `--step-1` | 21 | Lead paragraphs, card titles on mobile. |
| `--step-2` | 24 | Card titles, h3. |
| `--step-3` | 36 | h2. |
| `--step-4` | 48 | Page titles on mobile. |
| `--step-5` | 60 | |
| `--step-6` | 72 | Page titles on desktop. |
| `--step-display` | 72 to 192, fluid | The name in the home hero only. |
| `--text-page-title` | 60 to 120, fluid | Page and project titles. |

### Rules
- **Labels** appear only where a title block would have a field name.
- **Figures** in facts strips use tabular numerals.
- **Emphasis** comes from size, weight and width steps, never from colouring one word in a headline.

---

## 4. Space

A 4 px base, doubling at the upper end so section rhythm feels like structural bays rather than padding.

| Token | px |
|---|---|
| `--space-3xs` | 4 |
| `--space-2xs` | 8 |
| `--space-xs` | 12 |
| `--space-s` | 16 |
| `--space-m` | 24 |
| `--space-l` | 32 |
| `--space-xl` | 48 |
| `--space-2xl` | 64 |
| `--space-3xl` | 96 |
| `--space-4xl` | 128 |
| `--space-section` | 64 to 160, fluid |

Vertical rhythm between sections always uses `--space-section`. Inside components, use the fixed steps.

---

## 5. Layout

### Grid
| Viewport | Columns | Gutter | Page margin |
|---|---|---|---|
| < 640 px | 4 | 16 px | 16 px |
| 640–1023 px | 8 | 20–24 px | 4vw |
| ≥ 1024 px | 12 | 24–32 px | 4vw, up to 64 px |

- The frame (`.frame`) caps content at 1440 px. Full-bleed images may break out of it. Text never does.
- The grid (`.grid`) uses `repeat(var(--cols), minmax(0, 1fr))`. Components place themselves by column span, never by fixed widths.

### Alignment
- **Left-aligned throughout.** Text hangs from one strong left axis, as a drawing hangs from its binding margin. Nothing is centred except the figure inside a frame.
- **The datum.** On the home page, the name and the model share one ground line. Elements stand on lines; they do not float in the middle of boxes.
- **Sheet ratio.** Image frames use √2 (`--ratio-sheet: 1.4142`), the ratio of the A3 sheets the work was drawn on.
- **Corners and shadows.** Corners are square. There are no drop shadows. Depth comes only from the 3D models' own light.
- **Hairlines.** 1 px charcoal rules at 25% opacity, used only in the title-block footer, the facts strip and the datum.

---

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `--ease-light` | `cubic-bezier(0.65, 0, 0.35, 1)` | Slow in, slow out. Anything light-led: page transition, sun moves, cut lines drawing. |
| `--ease-response` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | Fast out, gentle settle. Replies to an action: menu, filters, hover. |
| `--dur-instant` | 120 ms | Hover and focus colour. |
| `--dur-short` | 240 ms | Menu and filter changes. |
| `--dur-medium` | 480 ms | Cut lines drawing. |
| `--dur-cloud` | 900 ms | Page transition. |

- **Page transitions** use cross-document View Transitions. A soft-edged shade crosses the page from left to right and reveals the next page, like a cloud passing over a court. The header is excluded so the navigation never moves. Browsers without support navigate normally.
- **The hero** has one orchestrated moment. The cut lines draw across the solid block on load, and scrolling parts the block along them to open the green court. The future Three.js model reads the same progress value.
- **Never animate:** entrances of every section, card lifts, parallax on text.
- **Reduced motion.** Under `prefers-reduced-motion: reduce`, page transitions are instant, nothing is scroll-linked, and the hero shows its final state with buttons to switch between "Solid block" and "Courtyard". Colour changes on hover remain.

---

## 7. Components in the shell

- **Header.** The wordmark in condensed Anek, and four links: Work (with its count, 8), Technical, About, Contact. A 2 px ink line runs under the header; the current page is a gold block standing on it, with `aria-current="page"`. Below 768 px the links fold behind a "Menu" button. Without JavaScript they wrap inline.
- **Menu.** A full-height indigo panel under the header: the five pages in large condensed type, then all eight projects with thumbnails. It wipes open from the top; Esc closes it and returns focus to the button.
- **Project bar.** Sticky on project pages: "Work, 3 of 8", jump links to Model (or Views), Project, Figures and Sheets, which mark the section on screen, and Previous and Next. Jump links hide below 768 px.
- **Register (work index).** An ordered list in portfolio order. Each row: sheet range, title, semester and place. On screens of 1024 px and up, a sticky portrait sheet beside the list previews the row being pointed at or focused. On small screens each row carries its own thumbnail. Type filters sit above it.
- **Feature rows (home).** Three projects as wide alternating rows, image and text on the √2 sheet ratio.
- **Footer, as a title block.** Ink ground, film text, gold labels. Cells for the architect, all eight projects, contact, and "This sheet", which names the current page.
- **Buttons.** Square, 2 px ink. Solid ink for the main action, outline for the second. Hover fills gold.
- **Model slot.** `[data-model-slot]` is a figure whose stage holds a poster that is also the no-WebGL fallback. Three.js mounts a canvas over it. The figcaption carries the content in HTML.
