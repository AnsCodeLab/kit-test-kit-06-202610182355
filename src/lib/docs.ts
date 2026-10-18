/** Handbook chapters that have a page in the Docs area, in navigation order. */
export const DOC_PAGES = [
  { id: '01-what-and-why', slug: 'what-and-why' },
  { id: '02-quickstart', slug: 'quickstart' },
  { id: '03-the-flow', slug: 'the-flow' },
  { id: '04-catalog-guide', slug: 'catalog-guide' },
  { id: '05-team-adaptation', slug: 'team-adaptation' },
  { id: '06-measuring-effectiveness', slug: 'measuring-effectiveness' },
  { id: '07-faq', slug: 'faq' },
  { id: '08-recipes', slug: 'recipes' },
  { id: '09-skill-cards', slug: 'skill-cards' },
] as const;

export type DocSlug = (typeof DOC_PAGES)[number]['slug'];

export const docPath = (slug: DocSlug) => `/docs/${slug}/`;

/** The quickstart keeps its own page (install command above the chapter); the others use the shared route. */
export const CONCEPT_PAGES = DOC_PAGES.filter((p) => p.slug !== 'quickstart');

/** Neighbouring pages in chapter order; the first has no previous, the last no next. */
export function docNeighbours(slug: string) {
  const i = DOC_PAGES.findIndex((p) => p.slug === slug);
  return { prev: i > 0 ? DOC_PAGES[i - 1] : undefined, next: i >= 0 && i < DOC_PAGES.length - 1 ? DOC_PAGES[i + 1] : undefined };
}

const CHAPTER_LINK = /^(?:\.\/)?(\d{2}-[a-z0-9-]+)\.md(?:#.*)?$/;

/**
 * Where a link found in a handbook chapter should point on the site.
 * Absolute http(s) links are kept, except ones to the reader's own machine (localhost), which are example addresses; a link to a chapter that has a page becomes its route;
 * anything else (other files, images, missing chapters) returns undefined and is shown as plain text.
 */
export function resolveDocHref(href: string, pages: readonly { id: string; slug: string }[] = DOC_PAGES): string | undefined {
  if (/^https?:\/\//i.test(href)) return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:[/?#]|$)/i.test(href) ? undefined : href;
  const match = CHAPTER_LINK.exec(href.trim());
  if (!match) return undefined;
  const page = pages.find((p) => p.id === match[1]);
  return page ? `/docs/${page.slug}/` : undefined;
}
