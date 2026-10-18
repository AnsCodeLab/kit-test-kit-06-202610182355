/** Handbook chapters that have a page in the Docs area, in navigation order. */
export const DOC_PAGES = [{ id: '02-quickstart', slug: 'quickstart' }] as const;

export type DocSlug = (typeof DOC_PAGES)[number]['slug'];

export const docPath = (slug: DocSlug) => `/docs/${slug}/`;
