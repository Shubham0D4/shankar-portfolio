/**
 * "Formation of courtyards" poster, after the architect's concept diagram
 * (Residential School, PDF p10): a solid block cut by two lines in each
 * direction, parting into eight masses around a green court.
 *
 * Rendered at build time as an isometric SVG. It is the hero's poster now
 * and the no-WebGL fallback once the Three.js model mounts over it.
 *
 * Motion contract: the SVG reads one CSS custom property, `--split`
 * (0 = solid block, 1 = courtyard). Each mass carries its own plan offset
 * as `--tx`/`--ty`, so parting the block is a single property write.
 */

const U = 64; // screen px per plan unit
const COS = Math.cos(Math.PI / 6);
const H = 0.72; // mass height in plan units: low, thick-walled sandstone
const GAP = 0.5; // full gap between masses at split = 1
const GROUND = 2.75; // half-size of the ground plane

type P3 = [number, number, number];

/** Plan (x right-down, y left-down, z up) to screen. */
const iso = ([x, y, z]: P3): [number, number] => [(x - y) * U * COS, (x + y) * U * 0.5 - z * U];

const pts = (ps: P3[]) =>
  ps
    .map(iso)
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(' ');

/** Screen offset of a plan translation, as CSS px. */
const offset = (dx: number, dy: number) => {
  const [a, b] = iso([dx, dy, 0]);
  return `--tx:${a.toFixed(2)}px;--ty:${b.toFixed(2)}px`;
};

function mass(x0: number, y0: number, x1: number, y1: number, h: number): string {
  const top = pts([
    [x0, y0, h],
    [x1, y0, h],
    [x1, y1, h],
    [x0, y1, h],
  ]);
  // Visible faces in this projection: +y (left, lit) and +x (right, shaded).
  const left = pts([
    [x0, y1, 0],
    [x1, y1, 0],
    [x1, y1, h],
    [x0, y1, h],
  ]);
  const right = pts([
    [x1, y0, 0],
    [x1, y1, 0],
    [x1, y1, h],
    [x1, y0, h],
  ]);
  return (
    `<polygon class="f-left" points="${left}"/>` +
    `<polygon class="f-right" points="${right}"/>` +
    `<polygon class="f-top" points="${top}"/>`
  );
}

function line(a: P3, b: P3, cls: string, extra = ''): string {
  const [x1, y1] = iso(a);
  const [x2, y2] = iso(b);
  return `<line class="${cls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" pathLength="1"${extra}/>`;
}

export function formationSvg(): string {
  const parts: string[] = [];

  // Ground plane.
  parts.push(
    `<polygon class="ground" points="${pts([
      [-GROUND, -GROUND, 0],
      [GROUND, -GROUND, 0],
      [GROUND, GROUND, 0],
      [-GROUND, GROUND, 0],
    ])}"/>`,
  );

  // Court: appears in the centre as the block parts.
  const c = 0.5 + GAP / 2;
  parts.push(
    `<g class="court"><polygon points="${pts([
      [-c, -c, 0],
      [c, -c, 0],
      [c, c, 0],
      [-c, c, 0],
    ])}"/><ellipse cx="0" cy="0" rx="${(0.42 * U * COS).toFixed(1)}" ry="${(0.21 * U).toFixed(1)}" class="court-glow"/></g>`,
  );

  // Cut lines on the ground, visible beyond the block and in the gaps.
  // Each moves half a gap, so it stays centred in the opening.
  for (const s of [-1, 1]) {
    const k = s * 0.5;
    const half = (s * GAP) / 2;
    parts.push(
      `<g class="cut" style="${offset(half, 0)}">${line([k, -GROUND, 0], [k, GROUND, 0], 'cut-line')}</g>`,
      `<g class="cut" style="${offset(0, half)}">${line([-GROUND, k, 0], [GROUND, k, 0], 'cut-line')}</g>`,
    );
  }

  // Masses, back to front (painter's order by x + y).
  const cells: { i: number; j: number }[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.push({ i, j });
  cells.sort((a, b) => a.i + a.j - (b.i + b.j) || a.i - b.i);
  for (const { i, j } of cells) {
    const x0 = i - 1.5;
    const y0 = j - 1.5;
    const centre = i === 1 && j === 1;
    const style = offset((i - 1) * GAP, (j - 1) * GAP);
    parts.push(
      `<g class="mass${centre ? ' mass--centre' : ''}" style="${style}">${mass(x0, y0, x0 + 1, y0 + 1, H)}</g>`,
    );
  }

  // Cut lines across the top of the solid block; they fade as it parts.
  for (const k of [-0.5, 0.5]) {
    parts.push(
      line([k, -1.5, H], [k, 1.5, H], 'cut-line cut-line--top'),
      line([-1.5, k, H], [1.5, k, H], 'cut-line cut-line--top'),
    );
  }

  // viewBox from the ground plane and the tallest point.
  const [minX] = iso([-GROUND, GROUND, 0]);
  const [maxX] = iso([GROUND, -GROUND, 0]);
  const minY = iso([-1.5 - GAP, -1.5 - GAP, H])[1];
  const maxY = iso([GROUND, GROUND, 0])[1];
  const pad = 8;
  const vb = [minX - pad, Math.min(minY, iso([-GROUND, -GROUND, 0])[1]) - pad, maxX - minX + pad * 2, 0];
  vb[3] = maxY - vb[1] + pad;

  return `<svg class="formation" viewBox="${vb.map((n) => n.toFixed(1)).join(' ')}" role="img" aria-labelledby="formation-title" focusable="false">
<title id="formation-title">Isometric diagram: a solid sandstone block cut along two lines in each direction, parting into eight masses around a green courtyard.</title>
${parts.join('\n')}
</svg>`;
}
