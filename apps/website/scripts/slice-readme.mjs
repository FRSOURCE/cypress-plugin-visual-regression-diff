// The Cypress plugin page renders the package README so the docs have one source of truth.
// Keep everything from "Getting started" up to the migration section (badges, logo and the
// maintainer sections at the end are GitHub material), and turn the <details> FAQ into plain
// headings, which the markdown renderer understands and the "on this page" list can pick up.
export const sliceReadme = (markdown) => {
  const start = markdown.indexOf('\n## Getting started');
  const end = markdown.indexOf('\n## Migrating from');
  if (start === -1)
    throw new Error('README.md: "## Getting started" heading not found');
  return markdown
    .slice(start, end === -1 ? undefined : end)
    .replace(
      /<details><summary>(.*?)<\/summary>/g,
      (_, question) => `### ${question}`,
    )
    .replace(/<\/details>/g, '')
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    .replace(
      '](./examples)',
      '](https://github.com/pixsame/pixsame/tree/main/examples)',
    );
};
