import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

function worker({ scope = "https://weather.example/", fetch, cacheWriteError, cacheOpenError, cacheWrite } = {}) {
  const handlers = new Map();
  const entries = new Map();
  const requested = [];
  const key = (request) => new URL(typeof request === "string" ? request : request.url, scope).href;
  const caches = {
    async open() {
      if (cacheOpenError) throw cacheOpenError;
      return {
        async put(request, response) {
          if (cacheWriteError) throw cacheWriteError;
          if (cacheWrite) await cacheWrite();
          entries.set(key(request), response.clone());
        }
      };
    },
    async match(request) {
      return entries.get(key(request))?.clone();
    }
  };

  runInNewContext(source, {
    URL,
    caches,
    fetch(request) {
      requested.push(request.url);
      return fetch(request);
    },
    self: {
      location: new URL("sw.js", scope),
      registration: { scope },
      addEventListener(type, handler) { handlers.set(type, handler); }
    }
  }, { filename: "sw.js" });

  return {
    caches,
    requested,
    seed(path, body) {
      entries.set(key(path), new Response(body));
    },
    request(path, { mode = "navigate", method = "GET" } = {}) {
      const pending = [];
      let response;
      handlers.get("fetch")({
        request: { url: key(path), method, mode },
        waitUntil(promise) { pending.push(promise); },
        respondWith(promise) { response = promise; }
      });
      return { response, settled: Promise.all(pending) };
    }
  };
}

for (const scope of ["https://weather.example/", "https://weather.example/firecloud/"]) {
  test(`离线新查询导航回退当前作用域 index.html：${new URL(scope).pathname}`, async () => {
    const offline = new Error("offline");
    const sw = worker({ scope, fetch: async () => { throw offline; } });
    sw.seed("./index.html", "application shell");

    const event = sw.request("./?city=杭州&fresh=never-cached");
    assert.equal(await (await event.response).text(), "application shell");
    await event.settled;
    assert.equal(await sw.caches.match("./?city=杭州&fresh=never-cached"), undefined);
  });
}

test("子路径缺少 index.html 缓存时回退作用域首页，不使用站点根目录", async () => {
  const sw = worker({
    scope: "https://weather.example/firecloud/",
    fetch: async () => { throw new Error("offline"); }
  });
  sw.seed("https://weather.example/index.html", "another application");
  sw.seed("./", "scoped homepage");

  const event = sw.request("./?new=query");
  assert.equal(await (await event.response).text(), "scoped homepage");
  await event.settled;
});

test("离线未缓存资源保持精确 URL 匹配，不回退 HTML", async () => {
  const offline = new Error("offline");
  const sw = worker({ fetch: async () => { throw offline; } });
  sw.seed("./index.html", "application shell");
  sw.seed("./js/app.mjs?v=1", "cached javascript");
  sw.seed("./css/style.css?v=1", "cached stylesheet");

  for (const path of ["./js/app.mjs?v=2", "./css/style.css?v=2", "./?resource=query"]) {
    const event = sw.request(path, { mode: "cors" });
    await assert.rejects(event.response, (error) => error === offline);
    await event.settled;
  }
});

test("离线导航没有任何应用壳缓存时保留网络错误", async () => {
  const offline = new Error("offline");
  const sw = worker({ fetch: async () => { throw offline; } });
  const event = sw.request("./?new=query");

  await assert.rejects(event.response, (error) => error === offline);
  await event.settled;
});

test("离线已有精确导航和资源缓存仍可用，后台失败不拒绝 waitUntil", async () => {
  const sw = worker({ fetch: async () => { throw new Error("offline"); } });
  sw.seed("./index.html", "fallback shell");

  for (const [path, mode, body] of [
    ["./?saved=query", "navigate", "cached navigation"],
    ["./js/app.mjs?v=1", "cors", "cached javascript"],
    ["./css/style.css?v=1", "cors", "cached stylesheet"]
  ]) {
    sw.seed(path, body);
    const event = sw.request(path, { mode });
    assert.equal(await (await event.response).text(), body);
    await event.settled;
  }
  assert.equal(sw.requested.length, 3);
});

test("在线新查询导航返回网络响应并更新精确 URL 缓存", async () => {
  const sw = worker({ fetch: async () => new Response("online page") });
  sw.seed("./index.html", "fallback shell");
  const event = sw.request("./?new=query");

  assert.equal(await (await event.response).text(), "online page");
  await event.settled;
  assert.equal(await (await sw.caches.match("./?new=query")).text(), "online page");
  assert.equal(await (await sw.caches.match("./index.html")).text(), "fallback shell");
});

test("导航 HTTP 错误响应不触发应用壳回退或缓存更新", async () => {
  const sw = worker({ fetch: async () => new Response("not found", { status: 404 }) });
  sw.seed("./index.html", "fallback shell");
  const event = sw.request("./?new=query");
  const response = await event.response;

  assert.equal(response.status, 404);
  assert.equal(await response.text(), "not found");
  await event.settled;
  assert.equal(await sw.caches.match("./?new=query"), undefined);
});

test("缓存配额或打开失败仍返回新的网络内容，不退回旧应用壳", async () => {
  for (const failure of [
    { cacheWriteError: new Error("quota exceeded") },
    { cacheOpenError: new Error("cache unavailable") }
  ]) {
    const sw = worker({ fetch: async () => new Response("online page"), ...failure });
    sw.seed("./index.html", "fallback shell");
    const event = sw.request("./?new=query");
    assert.equal(await (await event.response).text(), "online page");
    await event.settled;
    assert.equal(await sw.caches.match("./?new=query"), undefined);
  }
});

test("新网络响应不等待缓存写入，后台写入仍受 waitUntil 保护", async () => {
  let finishWrite;
  const writing = new Promise((resolve) => { finishWrite = resolve; });
  const sw = worker({ fetch: async () => new Response("fresh asset"), cacheWrite: () => writing });
  const event = sw.request("./new.css", { mode: "cors" });
  let settled = false;
  event.settled.then(() => { settled = true; });
  assert.equal(await (await event.response).text(), "fresh asset");
  assert.equal(settled, false);
  assert.equal(await sw.caches.match("./new.css"), undefined);
  finishWrite();
  await event.settled;
  assert.equal(await (await sw.caches.match("./new.css")).text(), "fresh asset");
});

test("已有缓存立即返回，waitUntil 等待后台网络刷新完成", async () => {
  let finishFetch;
  const network = new Promise((resolve) => { finishFetch = resolve; });
  const sw = worker({ fetch: () => network });
  sw.seed("./js/app.mjs?v=1", "stale javascript");
  const event = sw.request("./js/app.mjs?v=1", { mode: "cors" });

  assert.equal(await (await event.response).text(), "stale javascript");
  assert.equal(sw.requested.length, 1);
  let settled = false;
  event.settled.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);

  finishFetch(new Response("fresh javascript"));
  await event.settled;
  assert.equal(await (await sw.caches.match("./js/app.mjs?v=1")).text(), "fresh javascript");
});

test("应用壳回退不扩展到其他作用域的同源导航", async () => {
  const offline = new Error("offline");
  const sw = worker({
    scope: "https://weather.example/firecloud/",
    fetch: async () => { throw offline; }
  });
  sw.seed("./index.html", "scoped shell");

  for (const path of ["https://weather.example/?new=query", "https://weather.example/firecloud-other/?new=query"]) {
    const event = sw.request(path);
    await assert.rejects(event.response, (error) => error === offline);
    await event.settled;
  }
});

test("跨源或非 GET 请求仍不由 Service Worker 处理", async () => {
  const sw = worker({ fetch: async () => { throw new Error("must not fetch"); } });
  for (const [path, method] of [["https://other.example/?new=query", "GET"], ["./?new=query", "POST"]]) {
    const event = sw.request(path, { method });
    assert.equal(event.response, undefined);
    await event.settled;
  }
  assert.equal(sw.requested.length, 0);
});
