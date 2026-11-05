// Only browser runtime resources belong in the Pages artifact.
import { cp, mkdir, rm } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const output = new URL("dist/", root);
const paths = [
  "index.html", "sw.js", "manifest.webmanifest", ".nojekyll", "LICENSE",
  "css", "js", "assets", "icons"
];

await rm(output, { recursive: true, force: true });
await mkdir(output);
await Promise.all(paths.map((path) => cp(new URL(path, root), new URL(path, output), { recursive: true })));
console.log("Production site: dist/ (runtime files only)");
