# Styles to choose from

Eight styles that suit marketing sites for software and developer products. Adapted from the style records of `nextlevelbuilder/ui-ux-pro-max-skill` (MIT; see the NOTICE file). Colours and variables are starting points: measure contrast and keep only what passes WCAG AA. Fonts: prefer system stacks or fonts you can self-host; do not load fonts from a CDN unless the project allows network calls.

## Category defaults (the baseline to leave)
- **Developer tool / IDE:** dark base, neon or bright accent, a terminal card in the hero, a glow behind the hero, pill chips, three icon cards, centred closing "Get started" band. The source database itself recommends "Dark Mode (OLED) + Minimalism and Swiss" for this category.
- **SaaS in general:** glass or soft cards, gradient hero, feature grid, logo strip, pricing triplet.
- **Content or docs product:** left sidebar, article column, cards for everything.

## 1. Swiss Modernism 2.0
- **Feel:** rational, calm, exact.
- **Rules:** strict 12-column grid, 8 px base unit, black and white with a pale grey, **one** vibrant accent only, no gradients, no decoration, clear hierarchy by size and weight.
- **Variables:** `--grid-columns: 12`, `--grid-gap: 1rem`, `--base-unit: 8px`.
- **Fits:** documentation, SaaS, professional services, editorial. **Not:** playful or entertainment brands.
- **Don't:** add a second accent, drop shadows, or glow.

## 2. Editorial Grid / Magazine
- **Feel:** printed, considered, story first.
- **Rules:** asymmetric grid, pull quotes, strong headline type with a calm body face, large images or diagrams, high contrast black and white plus one brand colour.
- **Fits:** docs landing pages, long-form product stories, blogs. **Not:** dashboards, short-form content.
- **Don't:** use serif everywhere, or reveal-on-scroll on every block.

## 3. Exaggerated Minimalism
- **Feel:** loud and sparse.
- **Rules:** giant type (`clamp(3rem, 10vw, 12rem)`), weight 800 to 900, tracking about -0.04em, huge whitespace, black and white plus one accent.
- **Fits:** a single strong statement (portfolio, launch page). **Not:** dense content, forms, complex products.
- **Don't:** use it on a page that must explain many features.

## 4. Neubrutalism
- **Feel:** playful, honest, hand-made.
- **Rules:** 2 to 4 px black borders, hard offset shadows (`4px 4px 0 #000`), flat saturated colours, sharp corners, no gradients or blurs, bold type.
- **Fits:** startups, creative tools, tech blogs. **Not:** finance, healthcare, conservative buyers.
- **Don't:** soften it with blur or gradients; it only works when committed.

## 5. Bento Box Grid
- **Feel:** organised, modular.
- **Rules:** tiles of different sizes in one grid, one idea per tile, consistent radius and gap, a tile may hold a real product detail.
- **Fits:** feature overviews and dashboards-as-marketing. **Not:** long linear explanations.
- **Don't:** make every tile the same size; that is just a card grid.

## 6. Dark Mode (OLED)
- **Feel:** focused, technical.
- **Rules:** near-black base (`#0A0E14` to `#121212`), text contrast 7:1 or better, restrained accent, minimal glow, visible focus rings.
- **Fits:** developer audiences and low-light use. **Not:** print-first or colour-critical content.
- **Don't:** use neon accents, glow washes behind sections, or a dark base only because the category does.

## 7. Terminal / CLI
- **Feel:** the product's voice is its command line.
- **Rules:** monospace display or label type, hairline rules, prompt and cursor motifs used sparingly, real commands as the headline or hero object, a light or dark base chosen deliberately.
- **Fits:** CLI-first products. **Not:** audiences who do not use a terminal.
- **Don't:** fake output; show the real command and a short real result.

## 8. Accessible and Ethical (a rule layer)
- **Rules:** contrast at least 4.5:1 (7:1 for body in dark mode), touch targets at least 44 px, visible focus, honest labels, reduced-motion respected, no colour-only state.
- **Use:** on top of any of the styles above, never instead of one.
