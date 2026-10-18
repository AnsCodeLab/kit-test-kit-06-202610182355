import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const MANIFEST_NAME = '.sync-manifest.json';
export const DEFAULT_SOURCE = '/source';

export const SINGLE_FILES = [
  'catalog-data/skills.yaml',
  'catalog-data/hooks.yaml',
  'catalog-data/mcp.yaml',
  'catalog-data/agents.yaml',
  'catalog-data/ides.yaml',
  'catalog-data/presets.yaml',
  'README.md',
  'THIRD-PARTY.md',
  'LICENSE',
];

export function sourceDir() {
  return path.resolve(process.env.KIT_SOURCE || DEFAULT_SOURCE);
}

export function contentDir() {
  return path.resolve(process.env.CONTENT_DIR || 'content');
}

function listDir(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
}

// Relative POSIX paths of the kit files the site needs, sorted.
export function selectSourceFiles(src) {
  const found = new Set();
  for (const rel of SINGLE_FILES) {
    if (fs.existsSync(path.join(src, rel))) found.add(rel);
  }
  for (const e of listDir(path.join(src, 'handbook'))) {
    if (e.isFile() && e.name.endsWith('.md')) found.add(`handbook/${e.name}`);
  }
  const skills = path.join(src, 'catalog-data', 'skills');
  for (const e of listDir(skills)) {
    if (e.isFile() && /^NOTICE-.*\.md$/.test(e.name)) {
      found.add(`catalog-data/skills/${e.name}`);
    } else if (e.isDirectory() && fs.existsSync(path.join(skills, e.name, 'SKILL.md'))) {
      found.add(`catalog-data/skills/${e.name}/SKILL.md`);
    }
  }
  return [...found].sort();
}

export function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function overallChecksum(files) {
  const h = crypto.createHash('sha256');
  for (const rel of Object.keys(files).sort()) h.update(`${rel}\0${files[rel]}\n`);
  return h.digest('hex');
}

export function hashFiles(root, rels) {
  const files = {};
  for (const rel of rels) files[rel] = sha256File(path.join(root, rel));
  return files;
}

// All files under content/ except the manifest, as relative POSIX paths.
export function listContentFiles(dir) {
  const out = [];
  const walk = (d, prefix) => {
    for (const e of listDir(d)) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), rel);
      else if (rel !== MANIFEST_NAME) out.push(rel);
    }
  };
  walk(dir, '');
  return out.sort();
}

export function readManifest(dir) {
  const file = path.join(dir, MANIFEST_NAME);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Returns a list of human-readable drift messages; empty means in sync.
export function findDrift(src, dir) {
  const problems = [];
  if (!fs.existsSync(src)) return [`KIT_SOURCE not found: ${src}`];
  const manifest = readManifest(dir);
  if (!manifest) return [`missing ${MANIFEST_NAME} in ${dir}; run npm run sync`];

  const srcHashes = hashFiles(src, selectSourceFiles(src));
  const mFiles = manifest.files || {};
  const contentRels = new Set(listContentFiles(dir));

  for (const rel of new Set([...Object.keys(srcHashes), ...Object.keys(mFiles)])) {
    const s = srcHashes[rel];
    const m = mFiles[rel];
    const inContent = contentRels.has(rel);
    if (s && !m) problems.push(`added in source, not in manifest: ${rel}`);
    else if (!s && m) problems.push(`removed from source, still in manifest: ${rel}`);
    else if (s !== m) problems.push(`changed in source: ${rel}`);
    if (m && !inContent) problems.push(`missing from content: ${rel}`);
    else if (m && sha256File(path.join(dir, rel)) !== m) {
      problems.push(`content differs from manifest: ${rel}`);
    }
  }
  for (const rel of contentRels) {
    if (!(rel in mFiles)) problems.push(`extra file in content: ${rel}`);
  }
  if (manifest.checksum !== overallChecksum(mFiles)) {
    problems.push('overall checksum does not match the manifest file list');
  }
  return problems;
}
