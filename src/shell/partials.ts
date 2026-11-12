/**
 * Build-time HTML partials. Pages contain markers such as
 * `<!--shell:header-->`, and the Vite plugin in vite.config.ts replaces them
 * with the strings below. Output is static HTML, so content is crawlable and
 * paints without JavaScript.
 */
import {
  NAV,
  CATEGORIES,
  FEATURED,
  architect,
  cards,
  competitions,
  contact,
  projects,
  type ProjectCard,
} from '../data/site.ts';
import * as school from '../models/residential-school.data.ts';
import * as irshal from '../models/irshalpada.data.ts';
import * as mass from '../models/mass-housing.data.ts';
import * as sukoon from '../models/sukoon-resort.data.ts';
import * as office from '../models/sales-office.data.ts';
import * as dharavi from '../models/dharavi.data.ts';

interface KeyItem {
  id: string;
  num: string;
  name: string;
  meta: string;
  sheet: string;
}

interface ModelPage {
  stages: readonly { title: string; text: string }[];
  key: KeyItem[];
  poster: string;
  note: string;
  idea: string;
}

/** Projects with a procedural site model. The data modules are pure (no three.js). */
const MODELS: Record<string, ModelPage> = {
  'residential-school': {
    stages: school.STAGES,
    key: school.BLOCKS.filter((b) => b.num !== '—' || b.id === 'octagon').map((b) => ({
      id: b.id,
      num: b.num,
      name: b.name,
      meta: `${b.levels}${b.basis === 'footprint only' ? ', assumed' : ''}`,
      sheet: b.sheet,
    })),
    poster: '/assets/residential-school/masterplan.jpg',
    note: 'Interpretive massing, built in code from the masterplan (sheet 11) and the block sheets (12–15). Footprints are traced at about 7 px per metre. The levels of the academic block, library and mess are as written on the sheets. Every other level, and the heights of the auditorium, multipurpose hall, hostels and staff houses, are assumed: those buildings have no drawings in the portfolio.',
    idea: 'Idea model: the ground as stacked 4 m contour layers, each block riding on its own layer. Blue lines trace rain running downhill through the gaps between blocks to the lake. Arrows show the south-west wind; the arc is the sun’s path. Courts are shown green. The run-off is a diagram of the brief, not a drainage design from the sheets.',
  },
  irshalpada: {
    stages: irshal.STAGES,
    key: irshal.ITEMS.map((i, k) => ({ id: i.id, num: String(k + 1), name: i.name, meta: i.meta, sheet: i.sheet })),
    poster: '/assets/irshalpada/cluster-aerial.jpg',
    note: 'Interpretive model, built in code from the cluster, house and school sheets (40–43) and the neighbourhood render (38). Heights are as written on the sections. The sheets’ scale labels disagree with each other, so plan sizes are fitted to the stated heights and may be out by about a fifth. The Temple of Memories has no drawings: its form is read from one render.',
    idea: 'Idea model: nested courts. Roofs lift away so the plans show. Each house turns around its own courtyard, each cluster around a shared court, and every cluster opens to the green, where lines gather at the Temple of Memories: home, community, memory. A diagram of the brief, not a drawing from the sheets.',
  },
  'mass-housing': {
    stages: mass.STAGES,
    key: mass.ITEMS.map((i) => ({ id: i.id, num: i.num, name: i.name, meta: i.meta, sheet: i.sheet })),
    poster: '/assets/mass-housing/roof-plan.jpg',
    note: 'Interpretive massing, built in code from the roof and ground floor plans (sheet 4), the wing sections and elevations (sheets 7 and 8) and the progression diagram (sheet 3). Every level is as written on the sections. Plan sizes come from a scale that the stated site area and the elevation widths agree on within 8 per cent. Stages 1 and 2 are read from small diagrams, with generic towers. Materials are not stated, so the colours follow the renders. The surrounding city blocks are placeholders for scale.',
    idea: `Idea model: minimum footprint, maximum mother earth. The towers turn to ghosts, and each podium separates into its parking slabs: three basements under the ground, then the ground floor and six podium levels. The built footprint, traced in terracotta, covers about ${Math.round(mass.COVERAGE * 100)} per cent of the traced site; the rest is open ground. Arrows show the south-west wind crossing between the two podiums.`,
  },
  'sukoon-resort': {
    stages: sukoon.STAGES,
    key: sukoon.KEY_KINDS.map((k, i) => ({ id: k, num: String(i + 1), name: sukoon.KIND_INFO[k].name, meta: sukoon.KIND_INFO[k].meta, sheet: sukoon.KIND_INFO[k].sheet })),
    poster: '/assets/sukoon-resort/masterplan.jpg',
    note: 'Interpretive model, built in code from the masterplan (sheet 18) and the building sheets (19 and 20). The masterplan’s 1:750 label does not hold, and the site area is only partly legible, so plan sizes come from four buildings with detailed plans and may be out by about 15 per cent. Building heights are proportioned from the sections, whose level labels are mostly illegible. North and the sun follow the sheet’s compass.',
    idea: 'Idea model: voids between structures. Every building drops to a low dark block, like the black figure-ground of Shankar’s concept diagrams, so the open ground between them reads as the design. Dashed lines run from each guest building to the water: the visual connection to the surroundings the concept asks for. A diagram of the concept, not sight-lines checked on the sheets.',
  },
  'sales-office-interior': {
    stages: office.STAGES,
    key: office.KEY_ROOMS.map((id, i) => {
      const r = office.ROOMS.find((x) => x.id === id)!;
      return { id, num: String(i + 1), name: id === 'sales-1' ? 'Sales cabins' : r.name, meta: r.size || 'Size not given', sheet: '/assets/sheets/sales-office-interior-p45-plan-rcp-flooring-views.jpg' };
    }),
    poster: '/assets/sales-office-interior/perspective-reception.jpg',
    note: 'Interpretive cutaway, built in code from the hand-drawn plan (sheet 45) and sections (sheet 46). The sheets are 72 ppi and the room-size legend is barely legible, so sizes are read to about 10 per cent. Heights are as written on the sections. The fluted-panel cut patterns follow the sections; the exact edges of the torn band are drawn freehand there and are approximated here. Signage and the false ceiling are not modelled.',
    idea: 'Idea model: lines changed by placement and cutting. Every fluted wall cycles, flute by flute, through the three cuts in the sections: a torn band, a stepped cut and full height. Move the pointer over a wall to send a ripple through the lines.',
  },
  'dharavi-rerooted': {
    stages: dharavi.STAGES,
    key: dharavi.ITEMS.map((i, k) => ({ id: i.id, num: String(k + 1), name: i.name, meta: i.meta, sheet: i.sheet })),
    poster: '/assets/dharavi-rerooted/cluster-aerial.jpg',
    note: 'Interpretive diagram, built in code from the 1BHK and 2BHK floor plates (sheets 49 and 50) and the cluster and community-centre diagrams (sheets 48 and 50). The sheets do not place the clusters on a site, so the layout, spacing and which side is SRA are assumed. The floor plates have no scale bar; sizes are fitted to the stated flat areas and may be out by about 15 per cent. The surrounding Dharavi is a placeholder for scale, not a survey.',
    idea: 'Idea model: separate but together. The two zones take the colours of Shankar’s map, grey-violet for SRA and mauve for saleable, either side of the buffer road. Towers turn translucent so each cluster’s court and community strips read through them, and wind lines blow from the south-west between the towers and across the court. The wind is a diagram, not a simulation.',
  },
};

function modelStory(slug: string): string {
  const m = MODELS[slug];
  const last = m.stages.length - 1;
  const key = m.key
    .map(
      (b) => `<li>
  <button type="button" class="model-key__item" data-block="${b.id}">
    <span class="model-key__num">${esc(b.num)}</span>
    <span class="model-key__name">${esc(b.name)}</span>
    <span class="model-key__meta">${esc(b.meta)}</span>
  </button>
  <a class="model-key__sheet label" href="${b.sheet}">Sheet ${/-p(\d+)-/.exec(b.sheet)?.[1] ?? ''}</a>
</li>`,
    )
    .join('');
  const steps = m.stages
    .map(
      (s, i) => `<li class="model-step" data-step="${i}">
  <h3 class="model-step__title"><span class="model-step__num label">${i + 1} of ${m.stages.length}</span> ${esc(s.title)}</h3>
  <p>${esc(s.text)}</p>
  <button type="button" class="filter model-step__go" data-go="${i}" hidden>Show this step</button>
  ${i === last ? `<ul class="model-key" role="list" aria-label="Blocks">${key}</ul>` : ''}
</li>`,
    )
    .join('');
  return `<section class="model-story" data-model-story="${slug}" aria-labelledby="model-title">
  <h2 class="visually-hidden" id="model-title">Site model</h2>
  <div class="model-story__stage">
    <figure class="model-slot model-story__figure" data-model-slot="${slug}">
      <div class="model-slot__stage model-story__canvas">
        <img class="model-slot__poster" src="${m.poster}" alt="Masterplan from the portfolio sheet." decoding="async">
        <p class="model-tip label" hidden></p>
      </div>
      <figcaption class="model-story__bar">
        <div class="model-story__modes" role="group" aria-label="Model view">
          <button type="button" class="filter" data-mode="site" aria-pressed="true">Site model</button>
          <button type="button" class="filter" data-mode="idea" aria-pressed="false">Idea model</button>
        </div>
        <p class="model-story__idea" hidden>${esc(m.idea)}</p>
      </figcaption>
    </figure>
  </div>
  <ol class="model-story__steps" role="list">${steps}</ol>
  <p class="model-story__note note">${esc(m.note)}</p>
</section>`;
}

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Human name of the page at a route, used by the footer's "This sheet" cell. */
export function sheetName(route: string): string {
  if (route === '/') return 'Home';
  if (route === '/404.html') return 'Page not found';
  const project = cards.find((c) => route === c.href);
  if (project) return project.title;
  const nav = NAV.find((n) => route.startsWith(n.match));
  return nav ? nav.label : 'Page';
}

/** "Sheets 37–43": where the project sits in the printed portfolio. */
function sheetRange(slug: string): string {
  const pages = projects.find((x) => x.slug === slug)?.pdf_pages ?? [];
  if (!pages.length) return '';
  const lo = Math.min(...pages);
  const hi = Math.max(...pages);
  return lo === hi ? `Sheet ${lo}` : `Sheets ${lo}–${hi}`;
}

function header(route: string): string {
  const links = NAV.map((n) => {
    const current = route.startsWith(n.match) ? ' aria-current="page"' : '';
    const count = n.href === '/work/' ? ` <span class="site-nav__count">${cards.length}</span>` : '';
    return `<li><a href="${n.href}"${current}>${n.label}${count}</a></li>`;
  }).join('');
  const homeCurrent = route === '/' ? ' aria-current="page"' : '';
  const menuPages = [{ label: 'Home', href: '/', match: '/' }, ...NAV]
    .map((n) => {
      const current = (n.href === '/' ? route === '/' : route.startsWith(n.match)) ? ' aria-current="page"' : '';
      return `<li><a href="${n.href}"${current}>${n.label}</a></li>`;
    })
    .join('');
  const menuProjects = cards
    .map((c) => {
      const current = route === c.href ? ' aria-current="page"' : '';
      return `<li><a href="${c.href}"${current}><span class="menu__thumb"><img src="${c.cover}" alt="" loading="lazy" decoding="async"${coverStyle(c)}></span><span class="menu__name">${esc(c.title)}</span><span class="menu__meta">${esc(c.term)}</span></a></li>`;
    })
    .join('');
  const tone = route === '/' ? ' data-tone="dark"' : '';
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"${tone}>
  <div class="frame site-header__inner">
    <a class="wordmark" href="/"${homeCurrent}>Shankar Wagh</a>
    <nav class="site-nav" aria-label="Primary">
      <ul class="site-nav__list">${links}</ul>
      <button class="site-nav__toggle" type="button" aria-expanded="false" aria-controls="site-menu" hidden>Menu</button>
    </nav>
  </div>
</header>
<div class="menu" id="site-menu" data-tone="dark" hidden>
  <div class="frame menu__inner">
    <nav aria-label="Pages"><ul class="menu__pages" role="list">${menuPages}</ul></nav>
    <nav class="menu__projects" aria-label="Projects">
      <p class="label">All eight projects</p>
      <ul role="list">${menuProjects}</ul>
    </nav>
  </div>
</div>`;
}

function footer(route: string): string {
  const index = cards
    .map((c) => {
      const current = route === c.href ? ' aria-current="page"' : '';
      return `<li><a href="${c.href}"${current}>${esc(c.title)}</a></li>`;
    })
    .join('');
  const linkedin = contact.linkedin_url
    ? `<a href="${esc(contact.linkedin_url)}">LinkedIn</a>`
    : `<span>LinkedIn: ${esc(contact.linkedin_label)}</span>`;
  return `<footer class="site-footer" data-tone="dark">
  <div class="frame title-block">
    <div class="tb-cell tb-cell--architect">
      <p class="label">Architect</p>
      <p class="tb-name">${esc(architect.display_name)}</p>
      <p>B.Arch, Sir J.J. College of Architecture, Mumbai</p>
    </div>
    <nav class="tb-cell tb-cell--index" aria-label="All projects">
      <p class="label">Projects</p>
      <ul class="tb-index">${index}</ul>
    </nav>
    <div class="tb-cell tb-cell--contact">
      <p class="label">Contact</p>
      <p><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></p>
      <p>${linkedin}</p>
      <p>${esc(contact.location)}, Maharashtra</p>
    </div>
    <div class="tb-cell tb-cell--sheet">
      <p class="label">This sheet</p>
      <p class="tb-sheet">${esc(sheetName(route))}</p>
      <p class="tb-note">Undergraduate selected works. Models are interpretive massing, traced from the portfolio sheets.</p>
    </div>
  </div>
  <div class="frame tb-base">
    <p>Shankar Wagh, architecture portfolio</p>
    ${scaleBar()}
  </div>
</footer>`;
}

/** A 0–10 m scale bar in five 2 m bays: alternating bays, figures under the ticks. Decorative. */
export function scaleBar(): string {
  return `<div class="scale-bar" aria-hidden="true">
    <div class="scale-bar__bays"><span></span><span></span><span></span><span></span><span></span></div>
    <div class="scale-bar__figs"><span>0</span><span>5</span><span>10 m</span></div>
  </div>`;
}

function coverStyle(c: ProjectCard): string {
  const vars = [c.focus && `--focus-point:${c.focus}`, c.zoom && `--zoom:${c.zoom}`].filter(Boolean);
  return vars.length ? ` style="${vars.join(';')}"` : '';
}

/** Work index: a drawing register. Each row names its sheets in the printed portfolio. */
function registerRow(c: ProjectCard, i: number): string {
  const place = c.place ? `<span>${esc(c.place)}</span>` : '';
  return `<li class="reg-row" data-categories="${c.categories.join(' ')}" data-cover="${c.cover}" data-index="${i}">
  <a class="reg-row__link" href="${c.href}">
    <span class="reg-row__sheets label">${esc(sheetRange(c.slug))}</span>
    <span class="reg-row__thumb"><img src="${c.cover}" alt="" loading="lazy" decoding="async"${coverStyle(c)}></span>
    <h2 class="reg-row__title">${esc(c.title)}</h2>
    <span class="reg-row__meta"><span>${esc(c.term)}</span>${place}</span>
    <span class="reg-row__type">${esc(c.categories.join(', '))}</span>
  </a>
</li>`;
}

function cardsAll(): string {
  const first = cards[0];
  return `<div class="register">
  <ol class="register__list" id="projects" role="list">${cards.map(registerRow).join('\n')}</ol>
  <figure class="register__preview" aria-hidden="true">
    <div class="register__sheet"><img src="${first.cover}" alt=""${coverStyle(first)}></div>
    <figcaption class="label"><span class="register__cap-title">${esc(first.title)}</span> <span class="register__cap-sheets">${esc(sheetRange(first.slug))}</span></figcaption>
  </figure>
</div>`;
}

/** "Plate 09": the project's first page in the printed portfolio. */
export function plate(slug: string): string {
  const pages = projects.find((x) => x.slug === slug)?.pdf_pages ?? [];
  return pages.length ? `Plate ${String(Math.min(...pages)).padStart(2, '0')}` : '';
}

/** Home: three projects as wide alternating rows. */
function cardsFeatured(): string {
  return FEATURED.map((slug) => cards.find((c) => c.slug === slug)!)
    .map((c, i) => {
      const p = projects.find((x) => x.slug === c.slug)!;
      const line = p.description.split(/(?<=\.)\s+(?=[A-Z])/)[0];
      return `<article class="feature${i % 2 ? ' feature--flip' : ''}" data-reveal>
  <a class="feature__frame" href="${c.href}" tabindex="-1" aria-hidden="true">
    <img src="${c.cover}" alt="" loading="lazy" decoding="async"${coverStyle(c)}>
    <span class="plate feature__plate">${plate(c.slug)}</span>
  </a>
  <div class="feature__text">
    <p class="feature__index label">${i + 1} of ${FEATURED.length}</p>
    <h3 class="feature__title"><a href="${c.href}">${esc(c.title)}</a></h3>
    <p class="feature__meta">${esc(c.term)}${c.place ? `, ${esc(c.place)}` : ''}</p>
    <p class="feature__line">${esc(line)}</p>
  </div>
</article>`;
    })
    .join('\n');
}

function filters(): string {
  const buttons = ['All', ...CATEGORIES]
    .map(
      (cat) =>
        `<li><button type="button" class="filter" data-filter="${cat}" aria-pressed="${cat === 'All'}">${cat}</button></li>`,
    )
    .join('');
  return `<div class="filters" role="group" aria-labelledby="filters-label" hidden>
  <p class="label" id="filters-label">Filter by type</p>
  <ul class="filters__list" role="list">${buttons}</ul>
  <p class="filters__status label" aria-live="polite"></p>
</div>`;
}

function list(items: string[]): string {
  return `<ul class="plain-list" role="list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

function about(): string {
  const edu = architect.education
    .map(
      (e) => `<li><p class="about__qual">${esc(e.qualification)}</p><p>${esc(e.institution)}</p>${
        'status' in e && e.status ? `<p class="muted">${esc(e.status)}</p>` : ''
      }<p class="muted">${esc(e.score)}</p></li>`,
    )
    .join('');
  const comps = competitions
    .map((c) => `<li><a href="/work/${c.project_slug}/">${esc(c.name)}</a></li>`)
    .join('');
  return `<div class="about grid">
  <section class="about__block" aria-labelledby="about-edu"><h2 id="about-edu">Education</h2><ul class="plain-list about__edu" role="list">${edu}</ul></section>
  <section class="about__block" aria-labelledby="about-ws"><h2 id="about-ws">Workshops and electives</h2>${list(architect.workshops_electives)}</section>
  <section class="about__block" aria-labelledby="about-sw"><h2 id="about-sw">Software</h2>${list(architect.software)}</section>
  <section class="about__block" aria-labelledby="about-lang"><h2 id="about-lang">Languages</h2>${list(architect.languages)}</section>
  <section class="about__block" aria-labelledby="about-ex"><h2 id="about-ex">Student council and placements</h2>${list(architect.extracurricular)}</section>
  <section class="about__block" aria-labelledby="about-comp"><h2 id="about-comp">Competitions entered</h2><ul class="plain-list" role="list">${comps}</ul></section>
  <section class="about__block" aria-labelledby="about-cv"><h2 id="about-cv">CV sheet</h2><p>The one-page CV from the printed portfolio.</p><p class="about__cv"><a class="button" href="${architect.cv_sheet}">Open the CV sheet</a></p></section>
</div>`;
}

/** Favicon: a brass compass on espresso, legs open. */
const FAVICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1e1611"/><g fill="none" stroke="#c9a46b" stroke-width="2.2" stroke-linecap="round"><path d="M16 5v3M16 8l-6 18M16 8l6 18"/><circle cx="16" cy="8" r="1.6" fill="#c9a46b" stroke="none"/></g></svg>`,
)}`;

/**
 * Home only: decide before first paint whether the live instrument scene will
 * load. Software WebGL (SwiftShader, llvmpipe) counts as no GPU; `?scene`
 * overrides that for testing, `?still` forces the still image. If it will, the still image waits hidden so the scene can fade up from
 * the dark ground; otherwise the still image shows at once (DESIGN.md §8).
 */
const HERO_GATE = `<script>(function(){try{var n=navigator,c=n.connection,q=new URLSearchParams(location.search);if(q.has('still'))return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(c&&c.saveData)return;if(n.deviceMemory&&n.deviceMemory<=2)return;var g=document.createElement('canvas');var x=g.getContext('webgl2')||g.getContext('webgl');if(!x)return;var d=x.getExtension('WEBGL_debug_renderer_info'),r=d?String(x.getParameter(d.UNMASKED_RENDERER_WEBGL)):'';var l=x.getExtension('WEBGL_lose_context');l&&l.loseContext();if(/swiftshader|llvmpipe|softpipe|software|basic render/i.test(r)&&!q.has('scene'))return;document.documentElement.classList.add('hero-3d')}catch(e){}})()</script>`;

/** Hero still image sizes (DESIGN.md §8). Rendered from the live scene by dev/hero-still.mjs. */
export const HERO_STILL = {
  wide: { ratio: [5, 4], widths: [960, 1440, 1920] },
  tall: { ratio: [4, 5], widths: [480, 800, 1080] },
} as const;

function heroStill(): string {
  const set = (kind: 'wide' | 'tall', ext: string) =>
    HERO_STILL[kind].widths.map((w) => `/assets/hero/instruments-${kind}-${w}.${ext} ${w}w`).join(', ');
  const alt =
    'A still life of drafting instruments on a sheet of vellum on a walnut desk: a brass compass standing on its point beside the arc it has drawn, a triangular scale rule, a smoked set square, a mechanical pencil and a rolled drawing.';
  const sources = (['avif', 'webp'] as const)
    .map(
      (ext) =>
        `<source type="image/${ext}" media="(min-width: 64em)" srcset="${set('wide', ext)}" sizes="66vw">
        <source type="image/${ext}" srcset="${set('tall', ext)}" sizes="100vw">`,
    )
    .join('\n        ');
  return `<picture class="hero__still">
        ${sources}
        <source media="(min-width: 64em)" srcset="${set('wide', 'jpg')}" sizes="66vw">
        <img src="/assets/hero/instruments-tall-800.jpg" srcset="${set('tall', 'jpg')}" sizes="100vw" width="${HERO_STILL.tall.widths[1]}" height="${(HERO_STILL.tall.widths[1] * 5) / 4}" alt="${alt}" decoding="async" fetchpriority="high">
      </picture>`;
}

/**
 * The curved divider where the dark hero meets the vellum sheet: a shallow
 * compass arc with brass ticks along it. The x axis stretches with the
 * viewport; ticks stay vertical, so nothing distorts.
 */
function heroArc(): string {
  const W = 1440;
  const H = 72;
  const edge = 56; // y at both ends
  const crown = 8; // control point y
  const y = (t: number) => (1 - t) ** 2 * edge + 2 * t * (1 - t) * crown + t ** 2 * edge;
  const ticks: string[] = [];
  for (let i = 1; i < 48; i++) {
    const t = i / 48;
    const len = i % 6 === 0 ? 10 : 5;
    const yy = y(t) - 6;
    ticks.push(`M${(t * W).toFixed(1)} ${yy.toFixed(1)}v${-len}`);
  }
  return `<svg class="hero__arc" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path class="hero__arc-sheet" d="M0 ${H}V${edge}Q${W / 2} ${crown} ${W} ${edge}V${H}Z"/>
      <path class="hero__arc-ticks" d="${ticks.join('')}"/>
    </svg>`;
}

const DESCRIPTIONS: Record<string, string> = {
  Home: 'Architecture portfolio of Shankar Wagh, B.Arch student at Sir J.J. College of Architecture, Mumbai.',
  Work: 'Eight projects: housing, a residential school, a resort, rehabilitation, urban redevelopment, interiors and two drawing sets.',
  Technical: 'Working drawings for a hotel and municipal submission drawings for a residential building in Bandra.',
  About: 'Education, workshops, software and competitions of Shankar Wagh.',
  Contact: 'How to reach Shankar Wagh.',
};

function head(route: string): string {
  const name = sheetName(route);
  const title = route === '/' ? 'Shankar Wagh, architecture portfolio' : `${name} – Shankar Wagh`;
  const project = cards.find((c) => c.href === route);
  const description = route === '/404.html' ? 'This page does not exist.' : project ? `${project.title}. ${project.typology}.` : (DESCRIPTIONS[name] ?? DESCRIPTIONS.Home);
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="${route === '/' ? '#1e1611' : '#f2ece2'}">
<link rel="icon" href="${FAVICON}">
<script>document.documentElement.classList.add('js')</script>${route === '/' ? HERO_GATE : ''}
<script type="module" src="/src/main.ts"></script>`;
}


const LOW_RES_SHEETS = new Set([10, 11, 12, 13, 14, 15, 24, 30, 31, 32, 33, 34, 35, 36, 44, 45, 46]);

function sheetNumber(src: string): number | null {
  const n = /-p(\d+)-/.exec(src)?.[1];
  return n ? Number(n) : null;
}

/** "site_area_sqm" becomes "Site area", with its unit. Nested values, scales, dates and entry codes are skipped. */
function areaFacts(area: Record<string, unknown>): string {
  const rows = Object.entries(area)
    .filter(([k, v]) => (typeof v === 'number' || typeof v === 'string') && !/scale|code|date|basis/.test(k))
    .map(([k, v]) => {
      const unit = k.endsWith('_sqm') ? ' m²' : k.endsWith('_mm') ? ' mm' : k.endsWith('_m') ? ' m' : '';
      const name = k.replace(/_(sqm|mm|m)$/, '').replace(/_/g, ' ');
      const label = name.charAt(0).toUpperCase() + name.slice(1).replace(/\bbua\b/gi, 'BUA').replace(/\bfsi\b/gi, 'FSI').replace(/\blos\b/gi, 'LOS');
      const value = typeof v === 'number' ? v.toLocaleString('en-GB') + unit : String(v) + (/^[\d.]+$/.test(String(v)) ? unit : '');
      return `<div><dt class="label">${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
    });
  return rows.length
    ? `<section class="areas" aria-labelledby="areas-title"><h2 id="areas-title">Key figures</h2><dl class="areas__list">${rows.join('')}</dl></section>`
    : '';
}

function figure(src: string, alt: string, caption: string, lowRes = false): string {
  return `<li class="gallery__item${lowRes ? ' gallery__item--low' : ''}"><figure>
  <a class="gallery__link" href="${src}" data-lightbox><img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async"></a>
  <figcaption class="label">${esc(caption)}</figcaption>
</figure></li>`;
}

function prettify(src: string): string {
  const base = src.split('/').pop()!.replace(/\.\w+$/, '').replace(/^.*?-p\d+-/, '');
  const t = base.replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function gallery(title: string, images: string[], sheets: string[], hasModel: boolean): string {
  const heading = (id: string, text: string, note = '') =>
    `<h2 id="${id}">${text}</h2>${note ? `<p class="note">${note}</p>` : ''}`;
  const imgs = hasModel ? [] : images.slice(0, 40);
  const imageBlock = imgs.length
    ? `<section class="gallery" aria-labelledby="gal-images">${heading('gal-images', 'Views and drawings')}
  <ul class="gallery__grid" role="list">${imgs.map((s) => figure(s, `${title}: ${prettify(s)}.`, prettify(s))).join('')}</ul></section>`
    : '';
  const anyLow = sheets.some((s) => LOW_RES_SHEETS.has(sheetNumber(s) ?? -1));
  const sheetBlock = sheets.length
    ? `<section class="gallery" aria-labelledby="gal-sheets">${heading(
        'gal-sheets',
        'Portfolio sheets',
        anyLow ? 'Sheets marked “low resolution” were embedded at 72 ppi in the portfolio and look soft when enlarged.' : '',
      )}
  <ul class="gallery__grid gallery__grid--sheets" role="list">${sheets
    .map((s) => {
      const n = sheetNumber(s);
      const low = LOW_RES_SHEETS.has(n ?? -1);
      return figure(s, `${title}: portfolio sheet ${n ?? ''}, ${prettify(s)}.`, `Sheet ${n ?? ''}${low ? ', low resolution' : ''}`, low);
    })
    .join('')}</ul></section>`
    : '';
  return imageBlock + sheetBlock;
}

function materials(list: string[]): string {
  return list.length
    ? `<section class="materials" aria-labelledby="mat-title"><h2 id="mat-title">Materials</h2><ul class="plain-list materials__list" role="list">${list
        .map((m) => `<li>${esc(m)}</li>`)
        .join('')}</ul></section>`
    : '';
}

function keyFacts(list: string[]): string {
  return list.length
    ? `<section class="key-facts" aria-labelledby="kf-title"><h2 id="kf-title">Key facts</h2><ul class="plain-list" role="list">${list
        .map((m) => `<li>${esc(m)}</li>`)
        .join('')}</ul></section>`
    : '';
}

function projectPage(route: string): string {
  const i = cards.findIndex((c) => c.href === route);
  if (i < 0) throw new Error(`No project at ${route}`);
  const c = cards[i];
  const p = projects.find((x) => x.slug === c.slug)!;
  const prev = cards[(i - 1 + cards.length) % cards.length];
  const next = cards[(i + 1) % cards.length];
  const fact = (label: string, value: string | null) =>
    value ? `<div><dt class="label">${label}</dt><dd>${esc(value)}</dd></div>` : '';
  const paras = p.description
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .reduce<string[]>((acc, s, k) => {
      // Group sentences into short paragraphs of three.
      if (k % 3 === 0) acc.push(s);
      else acc[acc.length - 1] += ' ' + s;
      return acc;
    }, [])
    .map((s) => `<p>${esc(s)}</p>`)
    .join('');
  const team = c.competition ? `<p class="note">Team entry – full credits to be confirmed.</p>` : '';
  const hasModel = Boolean(MODELS[c.slug]);
  const figures = areaFacts(p.area_dimensions ?? {});
  const jumps = [
    hasModel ? ['#model-title', 'Model'] : ['#project-views', 'Views'],
    ['#project-text', 'Project'],
    figures ? ['#areas-title', 'Figures'] : null,
    p.sheets.length ? ['#gal-sheets', 'Sheets'] : null,
  ]
    .filter((x): x is string[] => Boolean(x))
    .map(([href, label]) => `<li><a href="${href}">${label}</a></li>`)
    .join('');
  const pagerLink = (x: ProjectCard, rel: 'prev' | 'next') => `<a class="pager__link pager__link--${rel}" href="${x.href}" rel="${rel}">
      <span class="pager__thumb"><img src="${x.cover}" alt="" loading="lazy" decoding="async"${coverStyle(x)}></span>
      <span class="label">${rel === 'prev' ? 'Previous project' : 'Next project'}</span>
      <span class="pager__title">${esc(x.title)}</span>
    </a>`;
  return `<nav class="project-bar" aria-label="Project">
  <div class="frame project-bar__inner">
    <p class="project-bar__where"><a href="/work/">Work</a> <span class="project-bar__count">${i + 1} of ${cards.length}</span></p>
    <ul class="project-bar__jumps" role="list">${jumps}</ul>
    <p class="project-bar__step"><a href="${prev.href}" rel="prev" aria-label="Previous project: ${esc(prev.title)}">Previous</a> <a href="${next.href}" rel="next" aria-label="Next project: ${esc(next.title)}">Next</a></p>
  </div>
</nav>
<article class="frame project-page">
  <header class="project-head">
    <p class="label project-head__sheets">${esc(sheetRange(c.slug))} of the portfolio</p>
    <h1>${esc(p.title)}</h1>
    <dl class="facts">
      ${fact('Semester', p.semester)}
      ${fact('Location', p.location)}
      ${fact('Typology', p.typology)}
    </dl>
  </header>
  ${
    hasModel
      ? modelStory(c.slug)
      : `<figure class="project-page__frame" id="project-views"><img src="${c.cover}"${coverStyle(c)} alt="${esc(p.title)}: cover view from the portfolio sheet."></figure>`
  }
  <div class="project-page__body grid" id="project-text">
    <div class="prose project-page__lede">${paras}${team}</div>
    <div class="project-page__side">${keyFacts(p.key_facts)}${materials(p.materials)}</div>
  </div>
  ${figures}
  ${gallery(p.title, p.images, p.sheets, hasModel)}
  <nav class="pager" aria-label="Other projects">
    ${pagerLink(prev, 'prev')}
    ${pagerLink(next, 'next')}
  </nav>
</article>`;
}

function technical(): string {
  return ['hotel-working-drawing', 'bandra-municipal']
    .map((slug) => {
      const p = projects.find((x) => x.slug === slug)!;
      const sheets = p.sheets
        .slice(0, 3)
        .map((src) => {
          const page = /-p(\d+)-/.exec(src)?.[1];
          return `<li><figure><img src="${src}" alt="" loading="lazy" decoding="async"><figcaption class="label">Portfolio sheet ${page ? Number(page) : ''}</figcaption></figure></li>`;
        })
        .join('');
      const first = p.description.split(/(?<=\.)\s+(?=[A-Z])/).slice(0, 2).join(' ');
      return `<section class="tech-set" aria-labelledby="tech-${slug}">
  <h2 id="tech-${slug}">${esc(p.title)}</h2>
  <p class="prose">${esc(first)}</p>
  <p><a href="/work/${slug}/">See the full set</a></p>
  <ul class="sheets" role="list">${sheets}</ul>
</section>`;
    })
    .join('');
}

const PARTIALS: Record<string, (route: string) => string> = {
  head,
  project: projectPage,
  technical,
  header,
  footer,
  'scale-bar': scaleBar,
  'hero-still': heroStill,
  'hero-arc': heroArc,
  statement: () => esc(architect.statement),
  'statement-lead': () => esc(architect.statement.split(/(?<=\.)\s/)[0]),
  'full-name': () => esc(architect.full_name),
  'cards-all': cardsAll,
  'cards-featured': cardsFeatured,
  filters,
  about,
  email: () => esc(contact.email),
};

export function renderShell(html: string, route: string): string {
  return html.replace(/<!--shell:([a-z-]+)-->/g, (_m, name: string) => {
    const fn = PARTIALS[name];
    if (!fn) throw new Error(`Unknown shell partial "${name}" in ${route}`);
    return fn(route);
  });
}
