// Writes one thin page per project: work/<slug>/index.html.
// The body comes from the `project` shell partial at build time, so these
// files hold no content of their own and are not committed.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { projects } = JSON.parse(readFileSync(join(root, 'content.json'), 'utf8'));

const page = `<!doctype html>
<html lang="en">
<head>
<!--shell:head-->
</head>
<body data-page="project">
<!--shell:header-->
<main id="main">
<!--shell:project-->
</main>
<!--shell:footer-->
</body>
</html>
`;

for (const { slug } of projects) {
  const dir = join(root, 'work', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), page);
}
console.log(`Generated ${projects.length} project pages.`);
