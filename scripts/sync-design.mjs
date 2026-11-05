// Explicit design distribution; --check is read-only and never repairs drift.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = "designs/sky-letter-system/project";
const canvasRoot = "designs/paper-place-finder/project";
const installed = `${canvasRoot}/ds/sky-letter`;
const canvasPath = `${canvasRoot}/canvas.json`;
const manifestPath = "scripts/design-consistency.json";
const foundation = "components/card-foundation.css";
const excludedPages = ["alternatives", "archive", "weather"];
const check = process.argv.includes("--check");
if (process.argv.slice(2).some((arg) => arg !== "--check")) {
  throw new Error("Usage: node scripts/sync-design.mjs [--check]");
}
const bytes = (path) => readFileSync(join(root, path));
const text = (path) => bytes(path).toString("utf8");
const json = (path) => JSON.parse(text(path));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const problems = [];

function files(path) {
  if (!existsSync(join(root, path))) return [];
  return readdirSync(join(root, path), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".DS_Store") return [];
    const child = `${path}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not design distribution files: ${child}`);
    return entry.isDirectory() ? files(child) : [child];
  }).sort();
}

function distribute(path, expected) {
  const actual = existsSync(join(root, path)) ? bytes(path) : null;
  if (actual?.equals(Buffer.from(expected))) return false;
  if (check) problems.push(`Out of sync: ${path}`);
  else {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), expected);
  }
  return true;
}

// Generated token CSS is read, never regenerated here. Remove only font-face
// rules; production's independently generated unicode-range shards stay intact.
function withoutFontFaces(css) {
  let result = "";
  let cursor = 0;
  for (const match of css.matchAll(/@font-face\s*\{/gi)) {
    if (match.index < cursor) continue;
    result += css.slice(cursor, match.index);
    let depth = 1;
    let quote = null;
    let comment = false;
    let index = match.index + match[0].length;
    for (; index < css.length && depth; index++) {
      const char = css[index];
      const next = css[index + 1];
      if (comment) {
        if (char === "*" && next === "/") { comment = false; index++; }
      } else if (quote) {
        if (char === "\\") index++;
        else if (char === quote) quote = null;
      } else if (char === "/" && next === "*") { comment = true; index++; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === "{") depth++;
      else if (char === "}") depth--;
    }
    if (depth) throw new Error("Unclosed @font-face in source tokens.css");
    cursor = index;
  }
  return `${(result + css.slice(cursor)).trimEnd()}\n`;
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)]
    .map((match) => [match[1].toLowerCase(), match[3]]));
}

function stylesheetLinks(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attributes(tag))
    .filter((attrs) => attrs.rel?.toLowerCase().split(/\s+/).includes("stylesheet"));
}

function localPath(url, owner, uploads) {
  const clean = url.split(/[?#]/)[0];
  const blob = clean.match(/^\/_blob\/([a-zA-Z0-9_-]+)$/);
  if (blob) {
    if (uploads[blob[1]] !== "text/css") throw new Error(`Stylesheet upload missing or not CSS: ${url} in ${owner}`);
    const candidates = files(`${canvasRoot}/assets`).filter((path) => posix.basename(path).startsWith(`${blob[1]}.`));
    if (candidates.length !== 1) throw new Error(`Ambiguous or missing upload bytes: ${url}`);
    return candidates[0];
  }
  if (/^(?:[a-z]+:|\/\/)/i.test(clean)) throw new Error(`Non-local stylesheet: ${url} in ${owner}`);
  const path = clean.startsWith("/") ? clean.slice(1) : posix.normalize(posix.join(posix.dirname(owner), clean));
  if (relative(root, resolve(root, path)).startsWith("..")) throw new Error(`Stylesheet escapes repository: ${url}`);
  return path;
}

function stylesheetGraph(links, owner, uploads) {
  const graph = new Map();
  function visit(url, parent, sourceName) {
    const path = localPath(url, parent, uploads);
    const content = bytes(path);
    if (sourceName) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\.css$/.test(sourceName)) throw new Error(`Invalid data-design-source: ${sourceName}`);
      if (!content.equals(bytes(`${canvasRoot}/${sourceName}`))) {
        problems.push(`Stale effective stylesheet: ${owner} -> ${url} != ${sourceName}; upload current CSS and repoint its consumers`);
      }
    } else if (url.startsWith("/_blob/")) {
      problems.push(`Uploaded stylesheet needs data-design-source: ${owner} -> ${url}`);
    }
    if (graph.has(path)) return;
    graph.set(path, { path, sha256: hash(content), ...(sourceName ? { source: `${canvasRoot}/${sourceName}` } : {}) });
    const css = content.toString("utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?[^;]*;/gi)) {
      visit(match[1], path);
    }
  }
  for (const link of links) visit(link.href, owner, link["data-design-source"]);
  return [...graph.values()].sort((a, b) => a.path.localeCompare(b.path, "en"));
}

// The editor injects bundle CSS into each preview document; relative @imports
// would resolve from that document rather than from components/. Flatten the
// two authored sources here so editor and standalone consumers use identical CSS.
distribute(`${source}/components/bundle.css`,
  `/* Generated by npm run design:sync; edit card-foundation.css or preview-layout.css. */\n${text(`${source}/${foundation}`)}\n${text(`${source}/components/preview-layout.css`)}`);

const sourceFiles = files(source);
if (!sourceFiles.length || !sourceFiles.includes(`${source}/design-system.json`)) throw new Error("Source design system is missing");
const sourceInventory = Object.fromEntries(sourceFiles.map((path) => [path.slice(source.length + 1), hash(bytes(path))]));
const sourceHash = hash(serialize(sourceInventory));
const expectedInstalled = new Set(sourceFiles.map((path) => `${installed}/${path.slice(source.length + 1)}`));
let installationChanged = false;
for (const path of sourceFiles) {
  if (distribute(`${installed}/${path.slice(source.length + 1)}`, bytes(path))) installationChanged = true;
}
for (const path of files(installed)) {
  if (expectedInstalled.has(path)) continue;
  installationChanged = true;
  if (check) problems.push(`Obsolete installed file: ${path}`);
  else rmSync(join(root, path));
}
const tokenSnapshot = withoutFontFaces(text(`${source}/tokens.css`));
distribute("css/sky-letter-tokens.css", tokenSnapshot);
distribute("css/sky-letter-cards.css", bytes(`${source}/${foundation}`));

const canvas = json(canvasPath);
const record = canvas.designSystems?.find((system) => system.namespace === "sky-letter");
if (!record) throw new Error("Canvas has no sky-letter installation record");
const artifact = "designs/sky-letter-system";
const copiedAtValid = typeof record.copiedAt === "string" && Number.isFinite(Date.parse(record.copiedAt));
if (installationChanged || record.sourceHash !== sourceHash || record.artifact !== artifact || !copiedAtValid) {
  if (check) problems.push(`Stale canvas installation metadata: ${canvasPath}`);
  else {
    record.sourceHash = sourceHash;
    record.artifact = artifact;
    record.copiedAt = new Date().toISOString();
    distribute(canvasPath, serialize(canvas));
  }
}

const uploads = json(`${canvasRoot}/assets/index.json`);
const activeBoards = [];
for (const [file, board] of Object.entries(canvas.boards).sort(([a], [b]) => a.localeCompare(b, "en"))) {
  const page = board.page ?? canvas.pages?.[0]?.id;
  if (excludedPages.includes(page)) continue;
  const path = `${canvasRoot}/${file}`;
  const html = text(path);
  const stylesheets = stylesheetGraph(stylesheetLinks(html), path, uploads);
  const cardTypes = [...new Set([...html.matchAll(/\bdata-sl-card\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]))].sort();
  if (cardTypes.length && !stylesheets.some((sheet) => sheet.path === `${installed}/${foundation}`)) {
    problems.push(`Shared card stylesheet is not loaded: ${file}`);
  }
  activeBoards.push({ file, page, sha256: hash(html), cardTypes, stylesheets });
}
const productionStylesheets = stylesheetGraph(stylesheetLinks(text("index.html")), "index.html", {});
for (const required of ["css/sky-letter-tokens.css", "css/sky-letter-cards.css", "css/fonts.css"]) {
  if (!productionStylesheets.some((sheet) => sheet.path === required)) problems.push(`Production does not load ${required}`);
}
const manifest = {
  schemaVersion: 1,
  scope: "File distribution and effective stylesheet dependency inventory; not visual or runtime acceptance.",
  source,
  sourceHash,
  installed,
  sourceFiles: sourceInventory,
  production: {
    tokens: { path: "css/sky-letter-tokens.css", sha256: hash(tokenSnapshot), transform: "Remove @font-face only" },
    cards: { path: "css/sky-letter-cards.css", source: `${source}/${foundation}`, sha256: hash(bytes(`${source}/${foundation}`)) },
    stylesheets: productionStylesheets
  },
  canvas: { path: canvasPath, excludedPages, activeBoards }
};
// A stale upload is not repaired by copying DS files or by refreshing evidence.
if (!problems.length || check) distribute(manifestPath, serialize(manifest));
if (problems.length) {
  console.error(problems.join("\n"));
  console.error("Run npm run design:sync after updating source designs and uploaded stylesheet consumers.");
  process.exitCode = 1;
} else {
  console.log(`${check ? "Checked" : "Synced"} ${sourceFiles.length} design files and ${activeBoards.length} active boards; no visual acceptance implied.`);
}
