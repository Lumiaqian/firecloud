import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), "utf8");

function modules(dir = "js") {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(join(root, path)).isDirectory()) return modules(path);
    return name.endsWith(".mjs") ? [path] : [];
  }).sort();
}

const html = read("index.html");
const sw = read("sw.js");
const importMap = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const version = html.match(/src="js\/app\.mjs\?v=([^"]+)"/)[1];

test("import map 覆盖全部 js 模块且使用同一版本号", () => {
  const mapped = Object.keys(importMap).map((key) => key.replace(/^\.\//, "")).sort();
  assert.deepEqual(mapped, modules());
  for (const [key, value] of Object.entries(importMap)) assert.equal(value, `${key}?v=${version}`);
});

test("Service Worker 预缓存全部模块，且与页面引用的版本一致", () => {
  for (const path of modules()) assert.ok(sw.includes(`"./${path}?v=${version}"`), `sw.js 缺少 ${path}`);
  const cssVersion = html.match(/href="css\/style\.css\?v=([^"]+)"/)[1];
  assert.ok(sw.includes(`"./css/style.css?v=${cssVersion}"`));
});

test("模块之间互相引用时不带版本参数，统一由 import map 钉住", () => {
  for (const path of modules()) {
    const source = read(path);
    assert.doesNotMatch(source, /from\s+"[^"]+\?v=/, `${path} 的 import 不应带 ?v=`);
  }
});
