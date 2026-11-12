# Shankar Wagh: Architecture Portfolio

A portfolio website for Shankar Wagh, built from the 50-page A3 print portfolio *Architectural Portfolio – Undergraduate Selected Works*. Project work is indexed like a drawing set, and several projects have procedural 3D models built in Three.js.

## Stack

- [Vite](https://vite.dev) and TypeScript (multi-page, no framework)
- [Three.js](https://threejs.org) for the procedural project models and the home hero's instrument still life
- Bodoni Moda and Anek Latin variable fonts via Fontsource
- sharp (dev only) to write the hero's still image

## Getting started

```sh
npm install
npm run dev        # generates project pages, then starts Vite
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (runs `pages` first) |
| `npm run build` | Generate pages, typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run pages` | Regenerate the per-project HTML pages under `work/` |

## Project layout

```
content.json          All copy and project facts, extracted from the PDF
portfolio.pdf         Source portfolio
public/assets/        Project sheets and cropped renders/diagrams
scripts/              generate-project-pages.mjs (writes work/<project>/)
src/
  data/site.ts        Site-level data
  models/             One procedural model per project (<slug>.ts + <slug>.data.ts)
  pages/              Page controllers: home, work, project, contact
  shell/              Nav, reveal, motion, shared partials
  hero/               The home hero's drafting-instruments scene
  styles/             tokens, base, shell, home and page CSS
  three/              Shared renderer rig, slot helpers and the 3D theme
dev/                  Standalone model viewer (dev/model.html); hero-still.mjs renders the hero's still image
about/ contact/ technical/ work/   HTML entry points
```

`work/<project>/` pages are generated and git-ignored; edit the generator or `content.json`, not the output.

## Models

Every 3D model is traced by hand from plans and sections, since no source CAD files exist. Models are interpretive massing, not survey-accurate replicas. Each model's parameters live in `src/models/<slug>.data.ts`, so a correction is a data edit rather than a rebuild. [MODEL_NOTES.md](MODEL_NOTES.md) records what was stated, measured, read or assumed for each one.

Models: Residential School (Jaisalmer), Irshalpada Rehabilitation, Mass Housing (Byculla), Dharavi Rerooted, Sukoon Resort, Sales Office.

## Documentation

- [PLAN.md](PLAN.md): content analysis, source constraints and site plan
- [DESIGN.md](DESIGN.md): the "drafting film and indigo" design system (tokens in `src/styles/tokens.css`)
- [MODEL_NOTES.md](MODEL_NOTES.md): sources and confidence for each 3D model
