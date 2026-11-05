import { runInNewContext } from "node:vm";
import { test, expect, openWelcome, chooseHangzhou, record } from "./fixtures.mjs";

// Exercise the published worker's install handler to discover its actual cache
// requests. No duplicated filename/version/font manifest in the smoke suite.
async function precacheURLs(source, workerURL) {
  const listeners = new Map();
  const urls = [];
  runInNewContext(source, {
    self: {
      addEventListener: (name, handler) => listeners.set(name, handler),
      skipWaiting() {}
    },
    caches: { open: async () => ({ addAll: async (requests) => urls.push(...requests.map((request) => request.url)) }) },
    Request: class {
      constructor(url) { this.url = new URL(url, workerURL).href; }
    }
  });
  expect(listeners.has("install"), "Published worker has an install handler").toBe(true);
  let installation;
  listeners.get("install")({ waitUntil(promise) { installation = promise; } });
  await installation;
  return urls;
}

test("published HTML, module graph, styles, manifest and precache resolve without leaking private files", async ({ page, request, baseURL }) => {
  await openWelcome(page);
  const resources = await page.evaluate(() => ({
    urls: [...document.querySelectorAll("script[src], link[href], img[src], source[src]")]
      .map((element) => element.src || element.href),
    imports: JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports
  }));
  const aliases = new Map(Object.entries(resources.imports).map(([key, value]) =>
    [new URL(key, baseURL).href, new URL(value, baseURL).href]));
  const workerURL = new URL("sw.js", baseURL).href;
  const worker = await request.get(workerURL);
  expect(worker.ok(), workerURL).toBe(true);
  const precache = await precacheURLs(await worker.text(), workerURL);
  const queue = [...resources.urls, ...aliases.keys(), ...aliases.values(), ...precache];
  const visited = new Set();
  const origin = new URL(baseURL).origin;
  const enqueue = (reference, parent, module = false) => {
    if (!reference || reference.startsWith("#") || /^(?:data|blob):/.test(reference)) return;
    const url = new URL(reference, parent).href;
    expect(new URL(url).origin, `Runtime resource must be local: ${url}`).toBe(origin);
    queue.push(module ? aliases.get(url) || url : url);
  };
  while (queue.length) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    const response = await request.get(url);
    expect(response.ok(), `Published resource: ${url} (${response.status()})`).toBe(true);
    const path = new URL(url).pathname;
    if (/\.(?:mjs|js)$/.test(path)) {
      expect(response.headers()["content-type"], url).toMatch(/javascript/);
      const source = await response.text();
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']([^"']+)["']/g)) {
        enqueue(match[1], url, true);
      }
    } else if (path.endsWith(".css")) {
      expect(response.headers()["content-type"], url).toMatch(/text\/css/);
      const source = await response.text();
      for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)|@import\s+["']([^"']+)["']/g)) {
        enqueue(match[1] || match[2], url);
      }
    } else if (path.endsWith(".webmanifest")) {
      const manifest = await response.json();
      for (const image of [...(manifest.icons || []), ...(manifest.screenshots || [])]) enqueue(image.src, url);
      enqueue(manifest.start_url, url);
    }
  }
  for (const privatePath of [
    ".git/", ".git/config", ".github/", ".github/workflows/deploy-pages.yml",
    "tests/", "tests/api.test.mjs", "tests/browser/app.spec.mjs",
    "scripts/", "scripts/build-site.mjs", "designs/", "designs/sky-letter-system/project/Motion.md",
    "plans/", "plans/README.md", "lighthouse/", "lighthouse/report.html",
    "node_modules/", "node_modules/@playwright/test/package.json",
    "package.json", "package-lock.json", "playwright.config.mjs", "README.md"
  ]) {
    const response = await request.get(new URL(privatePath, baseURL).href);
    expect(response.status(), `Private artifact must return 404: ${privatePath}`).toBe(404);
  }
});

test.describe("isolated service-worker navigation", () => {
  test.use({ serviceWorkers: "allow" });

  test("installed shell opens a saved record offline at a fresh navigation URL", async ({ page, context, baseURL, weatherApi }) => {
    await openWelcome(page);
    await chooseHangzhou(page);
    expect(weatherApi.forecasts).toBeGreaterThan(0);
    const saved = await record(page);
    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
      }
      return registration.scope;
    });
    expect(scope).toBe(baseURL);
    await context.setOffline(true);
    const response = await page.goto("./?browser-smoke-offline=1");
    expect(response.fromServiceWorker()).toBe(true);
    await expect(page.locator("#panel-ready")).toBeVisible();
    await expect(page.locator("#data-source")).toHaveAttribute("data-status", "stale");
    expect(await record(page)).toEqual(saved);
    await page.locator("#home-place-button").click();
    const dialog = page.getByRole("dialog", { name: "选择天空" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "取消并关闭地点选择" }).click();
    await expect(page.locator("#panel-ready")).toBeVisible();
  });
});
