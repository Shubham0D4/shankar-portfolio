/**
 * Site-level data that content.json does not hold: navigation, card
 * presentation and work categories. content.json stays the single source
 * for the architect's own facts.
 */
import content from '../../content.json' with { type: 'json' };

export type Category =
  | 'Housing'
  | 'Institutional'
  | 'Hospitality'
  | 'Rehabilitation'
  | 'Urban'
  | 'Interior'
  | 'Technical';

export const CATEGORIES: Category[] = [
  'Housing',
  'Institutional',
  'Hospitality',
  'Rehabilitation',
  'Urban',
  'Interior',
  'Technical',
];

export interface NavItem {
  label: string;
  href: string;
  /** Route prefix that marks this item as current. */
  match: string;
}

export const NAV: NavItem[] = [
  { label: 'Work', href: '/work/', match: '/work/' },
  { label: 'Technical', href: '/technical/', match: '/technical/' },
  { label: 'About', href: '/about/', match: '/about/' },
  { label: 'Contact', href: '/contact/', match: '/contact/' },
];

interface CardMeta {
  /** Short semester label for cards. */
  term: string;
  /** Short place label for cards. Null when content.json has no location. */
  place: string | null;
  cover: string;
  /** object-position for the cover crop, when the subject is off-centre. */
  focus?: string;
  /** Scale about the focus point, to crop one render out of a composite crop. */
  zoom?: number;
  categories: Category[];
  competition?: boolean;
}

/** Hand-written short labels, so cards never show half-parsed strings. */
const CARD_META: Record<string, CardMeta> = {
  'mass-housing': {
    term: 'Semester 7',
    place: 'Byculla, Mumbai',
    cover: '/assets/mass-housing/hero-towers-low-angle.jpg',
    categories: ['Housing'],
  },
  'residential-school': {
    term: 'Semester 6',
    place: 'Kanoi, Jaisalmer',
    cover: '/assets/residential-school/academic-views.jpg',
    focus: 'top',
    zoom: 1.3,
    categories: ['Institutional'],
  },
  'sukoon-resort': {
    term: 'Semester 5',
    place: 'Kamshet, Maharashtra',
    cover: '/assets/sukoon-resort/reception-isometric.jpg',
    categories: ['Hospitality'],
  },
  'hotel-working-drawing': {
    term: 'Semester 6, working drawing',
    place: null,
    cover: '/assets/hotel-working-drawing/front-elevation.jpg',
    categories: ['Hospitality', 'Technical'],
  },
  'bandra-municipal': {
    term: 'Semester 7, municipal drawing',
    place: 'Bandra, Mumbai',
    cover: '/assets/bandra-municipal/typical-floor-area-diagram.jpg',
    categories: ['Housing', 'Technical'],
  },
  irshalpada: {
    term: 'Semester 3, competition',
    place: 'Irshalwadi, Raigad',
    cover: '/assets/irshalpada/cluster-aerial.jpg',
    categories: ['Rehabilitation', 'Housing'],
    competition: true,
  },
  'sales-office-interior': {
    term: 'Semester 4, interior design',
    place: null,
    cover: '/assets/sales-office-interior/perspective-reception.jpg',
    categories: ['Interior'],
  },
  'dharavi-rerooted': {
    term: 'Competition',
    place: 'Dharavi, Mumbai',
    cover: '/assets/dharavi-rerooted/cluster-aerial.jpg',
    categories: ['Urban', 'Housing'],
    competition: true,
  },
};

export type Project = (typeof content.projects)[number];

export interface ProjectCard extends CardMeta {
  slug: string;
  title: string;
  typology: string;
  href: string;
}

export const projects: Project[] = content.projects;

export const cards: ProjectCard[] = projects.map((p) => {
  const meta = CARD_META[p.slug];
  if (!meta) throw new Error(`No card meta for project "${p.slug}"`);
  return { ...meta, slug: p.slug, title: p.title, typology: p.typology, href: `/work/${p.slug}/` };
});

/** PLAN.md §4: three featured projects on the home page. */
export const FEATURED = ['residential-school', 'irshalpada', 'mass-housing'];

export const architect = content.architect;
export const contact = content.contact;
export const competitions = content.competitions;
