// 按 js/ 下的实际模块重写 index.html 的 import map 与 sw.js 的预缓存列表。
// 用法: node scripts/sync-modules.mjs [--bump]   --bump 同时把模块版本号与 SHELL_CACHE 加一
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const bump = process.argv.includes("--bump");

function modules(dir = "js") {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(join(root, path)).isDirectory()) return modules(path);
    return name.endsWith(".mjs") ? [path] : [];
  }).sort();
}

let html = readFileSync(join(root, "index.html"), "utf8");
let sw = readFileSync(join(root, "sw.js"), "utf8");
let version = Number(html.match(/src="js\/app\.mjs\?v=(\d+)"/)[1]);
if (bump) version += 1;
const files = modules();

const imports = Object.fromEntries(files.map((path) => [`./${path}`, `./${path}?v=${version}`]));
const mapJson = JSON.stringify({ imports }, null, 2).replace(/\n/g, "\n    ");
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">\n    ${mapJson}\n  </script>`);
html = html.replace(/src="js\/app\.mjs\?v=\d+"/, `src="js/app.mjs?v=${version}"`);

const cssVersion = html.match(/href="css\/style\.css\?v=([^"]+)"/)[1];
sw = sw.replace(/const SHELL = \[[\s\S]*?\];/, (block) => {
  const keep = block.match(/"[^"]+"/g).filter((entry) => !entry.startsWith('"./js/') && !entry.startsWith('"./css/'));
  const entries = [
    ...keep.slice(0, 2),
    `"./css/style.css?v=${cssVersion}"`,
    ...files.map((path) => `"./${path}?v=${version}"`),
    ...keep.slice(2)
  ];
  return `const SHELL = [\n${entries.map((entry) => `  ${entry}`).join(",\n")}\n];`;
});
if (bump) sw = sw.replace(/firecloud-shell-v(\d+)/, (_, n) => `firecloud-shell-v${Number(n) + 1}`);

writeFileSync(join(root, "index.html"), html);
writeFileSync(join(root, "sw.js"), sw);
console.log(`modules ${files.length} · v=${version}`);
