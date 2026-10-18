// Build facts.txt for the QA agent, deterministically, with no LLM and no dependencies.
// The QA agent never sees the repository or the diff; it sees this file instead. Contents:
//   1. CI results for the PR head: which npm scripts the project defines (names only, never their
//      commands) and whether each CI step ran and succeeded, from the `ci` job's step results.
//   2. For every served page: HTTP status, <html lang>, <title>, meta description, Open Graph tags,
//      landmark elements and roles, heading outline (h1 to h3), image alt counts.
//      With --shots <dir> (the output of shoot.cjs) also the narrow-screen facts per page, at 768 px and at 375 px:
//      horizontal overflow, clipped or off-screen text (max 10 each), and how many screenshot tiles exist per width.
//   3. The HTTP status of the fixed site files /robots.txt, /sitemap.xml and /404.html.
//   4. The list of built HTML pages.
// Usage:
//   node qa-facts.mjs --base http://127.0.0.1:4174 --pages pages.txt --dist dist --jobs jobs.json \
//        --package package.json --head <sha> [--shots shots] --out facts.txt
// jobs.json is the output of `gh api repos/<repo>/actions/runs/<run id>/jobs`. Missing inputs produce an
// explicit "unavailable" line, never a guess.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

// Script name -> the `ci` job step that runs it (names must match .github/workflows/pr.yml).
export const CI_SCRIPTS = [
  ["lint", "Lint"],
  ["type-check", "Type check (warning only)"],
  ["format:check", "Format check (warning only)"],
  ["test", "Unit tests"],
  ["test:regression", "Regression tests"],
  ["build", "Build"],
  ["healthcheck", "Healthcheck"],
  ["scan:secrets", "Secret scan"],
  ["audit", "Dependency audit (warning only)"],
  ["test:smoke", "Playwright smoke"],
  ["test:a11y", "Axe accessibility (warning only)"],
  ["lighthouse", "Lighthouse CI (warning only)"],
];

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " " };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m]);
const clean = (s, max = 140) => {
  const t = decode(String(s).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 3)}...` : t;
};

/** Value of an attribute in one start tag. undefined when absent, "" when present without a value. */
export function attr(tag, name) {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(tag);
  if (m) return decode(m[1] ?? m[2] ?? m[3] ?? "");
  return new RegExp(`\\s${name}(?=[\\s/>])`, "i").test(tag) ? "" : undefined;
}

const LANDMARK_ELEMENTS = ["header", "nav", "main", "footer", "aside"];
const LANDMARK_ROLES = ["banner", "navigation", "main", "contentinfo", "complementary", "search"];

/** Facts for one HTML document. Pure. */
export function pageFacts(html) {
  const src = String(html).replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  const htmlTag = /<html\b[^>]*>/i.exec(src)?.[0];
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(src);
  let description;
  for (const m of src.matchAll(/<meta\b[^>]*>/gi)) {
    if ((attr(m[0], "name") ?? "").toLowerCase() === "description") { description = attr(m[0], "content") ?? ""; break; }
  }
  const og = [];
  for (const m of src.matchAll(/<meta\b[^>]*>/gi)) {
    const prop = (attr(m[0], "property") ?? attr(m[0], "name") ?? "").toLowerCase();
    if (prop.startsWith("og:")) og.push({ property: prop, content: clean(attr(m[0], "content") ?? "", 200) });
  }
  const elements = {};
  for (const n of LANDMARK_ELEMENTS) elements[n] = [...src.matchAll(new RegExp(`<${n}\\b`, "gi"))].length;
  const roles = {};
  for (const m of src.matchAll(/<[a-z][a-z0-9-]*\b[^>]*\srole\s*=[^>]*>/gi)) {
    const r = (attr(m[0], "role") ?? "").toLowerCase();
    if (LANDMARK_ROLES.includes(r)) roles[r] = (roles[r] ?? 0) + 1;
  }
  const headings = [...src.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: clean(m[2]) }));
  const images = { total: 0, withAlt: 0, emptyAlt: 0, missingAlt: 0 };
  for (const m of src.matchAll(/<img\b[^>]*>/gi)) {
    images.total++;
    const a = attr(m[0], "alt");
    if (a === undefined) images.missingAlt++;
    else if (a.trim() === "") images.emptyAlt++;
    else images.withAlt++;
  }
  return {
    lang: htmlTag === undefined ? undefined : attr(htmlTag, "lang"),
    hasHtmlTag: htmlTag !== undefined,
    title: title ? clean(title[1]) : undefined,
    description: description === undefined ? undefined : clean(description, 300),
    og, elements, roles, headings, images,
  };
}

/** CI facts from the `ci` job's step results. `jobs` is the parsed `actions/runs/<id>/jobs` response or null. */
export function ciFacts({ jobs, scripts, head }) {
  const lines = [`# CI results${head ? ` (PR head ${String(head).slice(0, 7)})` : ""}`];
  if (scripts === null) lines.push("package.json: not present");
  else lines.push(`package.json scripts defined: ${scripts.length ? scripts.join(", ") : "(none)"}`);
  const job = (jobs?.jobs ?? []).find((j) => j.name === "CI");
  if (!job) {
    lines.push("CI job results: unavailable (the CI job was not found in the run's job list)");
    return lines;
  }
  lines.push(`CI job: ${job.conclusion ?? job.status} (the QA check only runs after the CI job succeeds)`);
  const step = (name) => (job.steps ?? []).find((s) => s.name === name);
  for (const [script, name] of CI_SCRIPTS) {
    const defined = scripts?.includes(script) ?? false;
    const s = step(name);
    let result;
    if (!defined) result = "not defined, so not run";
    else if (!s) result = "step not found in the CI job";
    else if (s.conclusion === "skipped") result = "skipped";
    else if (s.conclusion === "success") result = "ran, success";
    else if (s.conclusion == null) result = `result not final (step status ${s.status}); this is not a pass`;
    else result = `ran, ${s.conclusion}`;
    lines.push(`npm script ${script}: ${result}`);
  }
  return lines;
}

const list = (obj) => Object.entries(obj).filter(([, n]) => n > 0).map(([k, n]) => `${k} x${n}`).join(", ") || "none";

export function pageSection(path, status, facts) {
  const lines = [`# Page ${path} (HTTP ${status})`];
  if (!facts) return [...lines, "(no HTML to analyse)"];
  lines.push(`html lang: ${!facts.hasHtmlTag ? "no <html> element" : facts.lang === undefined ? "(missing)" : facts.lang === "" ? "(empty)" : facts.lang}`);
  lines.push(`title: ${facts.title === undefined ? "(missing)" : facts.title === "" ? "(empty)" : facts.title}`);
  lines.push(`meta description: ${facts.description === undefined ? "(missing)" : facts.description === "" ? "(empty)" : facts.description}`);
  lines.push(`open graph tags: ${facts.og?.length ? facts.og.map((t) => `${t.property} = ${t.content === "" ? "(empty)" : t.content}`).join("; ") : "(none)"}`);
  lines.push(`landmark elements: ${list(facts.elements)}`);
  lines.push(`landmark roles (role attribute): ${list(facts.roles)}`);
  const h1 = facts.headings.filter((h) => h.level === 1).length;
  lines.push(`headings (${h1} h1):`);
  if (!facts.headings.length) lines.push("  (none)");
  for (const h of facts.headings) lines.push(`  h${h.level} ${h.text}`);
  const i = facts.images;
  lines.push(`images: ${i.total} total, ${i.withAlt} with alt text, ${i.emptyAlt} with empty alt, ${i.missingAlt} without an alt attribute`);
  return lines;
}

/** Same file stem shoot.cjs uses for a page path. */
export const shotName = (p) => (p === "/" ? "_root" : p.replace(/\//g, "_"));

/** Narrow-screen widths measured by shoot.cjs: key in <name>.meta.json, label in facts.txt. */
export const NARROW_WIDTHS = [["tablet", "tablet", 768], ["mobile", "mobile", 375]];

function widthLines(meta, key, label, width) {
  const v = meta?.[key];
  if (!v?.facts) return [`${label} (${width} px): unavailable (no ${label} measurement for this page)`];
  const m = v.facts; const lines = [];
  lines.push(`${label} (${m.innerWidth} px) horizontal overflow: ${m.overflowX ? `YES (content ${m.scrollWidth} px wide in a ${m.innerWidth} px viewport)` : `no (content ${m.scrollWidth} px in a ${m.innerWidth} px viewport)`}`);
  const c = m.clipped ?? [];
  if (!c.length) lines.push(`${label} clipped or off-screen text: none found`);
  else {
    lines.push(`${label} clipped or off-screen text: ${m.clippedTotal} element(s)${m.clippedTotal > c.length ? `, first ${c.length} listed` : ""}:`);
    for (const x of c) lines.push(`  ${x.kind === "clipped" ? "clipped" : "off-screen"}: ${x.selector} "${x.text}" (${x.detail})`);
  }
  return lines;
}

const tileText = (v, w) => `${v?.tiles ?? 0} tile(s) (${w} px wide, page ${v?.pageHeight ?? "?"} px tall${v?.truncated ? ", cut off after the last tile" : ""})`;

/**
 * Layout facts per width (768 px tablet, 375 px mobile) of one page from shoot.cjs's <name>.meta.json, plus the screenshot tile
 * counts per width. A width without a measurement says "unavailable". Pure.
 */
export function mobileSection(meta) {
  const lines = [];
  for (const [key, label, width] of NARROW_WIDTHS) lines.push(...widthLines(meta, key, label, width));
  if (meta?.mobile?.facts || meta?.tablet?.facts) lines.push(`screenshots: desktop ${tileText(meta.desktop, 1440)}, tablet ${tileText(meta.tablet, 768)}, mobile ${tileText(meta.mobile, 375)}`);
  return lines;
}

export function listBuiltPages(distDir) {
  const out = [];
  const walk = (dir) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, d.name);
      if (d.isDirectory()) walk(p);
      else if (d.name.endsWith(".html")) {
        const rel = relative(distDir, p).split("\\").join("/");
        out.push(rel === "index.html" ? "/" : rel.endsWith("/index.html") ? `/${rel.slice(0, -"index.html".length)}` : `/${rel}`);
      }
    }
  };
  if (existsSync(distDir)) walk(distDir);
  return out.sort();
}

/** Fixed files a deployed site is expected to serve. /_headers is never served by Cloudflare Pages, so it is not probed. */
export const SITE_FILES = ["/robots.txt", "/sitemap.xml", "/404.html"];

/** HTTP status of each fixed site file, one line each. Never guesses: a failed request says so. */
export async function siteFileFacts(base, f = globalThis.fetch) {
  const lines = ["# Site files (HTTP status of fixed paths)"];
  for (const p of SITE_FILES) {
    try { lines.push(`${p}: HTTP ${(await f(base + p)).status}`); }
    catch (e) { lines.push(`${p}: unavailable (${String(e.message ?? e).slice(0, 120)})`); }
  }
  return lines;
}

export async function buildFacts({ base, pages, distDir, jobs, packageJson, head, shotsDir, fetch: f = globalThis.fetch }) {
  let scripts = null;
  if (packageJson && existsSync(packageJson)) {
    try { scripts = Object.keys(JSON.parse(readFileSync(packageJson, "utf8")).scripts ?? {}).sort(); }
    catch { scripts = []; }
  }
  const out = [...ciFacts({ jobs, scripts, head }), ""];
  for (const p of pages) {
    try {
      const res = await f(base + (p.startsWith("/") ? p : `/${p}`));
      const type = res.headers?.get?.("content-type") ?? "";
      const body = await res.text();
      const section = pageSection(p, res.status, /html/i.test(type) || /<html\b/i.test(body) ? pageFacts(body) : null);
      if (shotsDir) {
        let meta = null;
        try { meta = JSON.parse(readFileSync(join(shotsDir, `${shotName(p)}.meta.json`), "utf8")); } catch { /* reported as unavailable */ }
        section.push(...mobileSection(meta));
      }
      out.push(...section, "");
    } catch (e) {
      out.push(`# Page ${p} (unavailable: ${String(e.message ?? e).slice(0, 120)})`, "");
    }
  }
  out.push(...(await siteFileFacts(base, f)), "");
  const built = listBuiltPages(distDir);
  out.push("# Built HTML pages", built.length ? built.join("\n") : "(none)", "");
  return out.join("\n");
}

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 2) o[argv[i].replace(/^--/, "")] = argv[i + 1];
  return o;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  let jobs = null;
  try { jobs = JSON.parse(readFileSync(a.jobs, "utf8")); } catch { /* reported as unavailable */ }
  const pages = readFileSync(a.pages, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
  const text = await buildFacts({ base: a.base, pages, distDir: a.dist, jobs, packageJson: a.package, head: a.head, shotsDir: a.shots });
  writeFileSync(a.out, text);
  console.log(`facts: ${text.split("\n").length} lines -> ${a.out}`);
}
