import test from "node:test";
import assert from "node:assert/strict";
import { createForecastSession } from "../js/core/session.mjs";
import { createForecastCache, createStorage, KEYS } from "../js/core/storage.mjs";

const HZ = { name: "杭州", lat: 30.27, lon: 120.15 };
const SH = { name: "上海", lat: 31.23, lon: 121.47 };
const NOW = new Date("2026-10-24T08:00:00Z");
const DAY = 86_400_000;
const HOUR = 3_600_000;
const eventAt = (type) => new Date(NOW.getTime() + (type === "sunset" ? 9 : 22) * HOUR);

function memoryBackend() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function setup({ clock = () => NOW.getTime(), storage = createStorage(memoryBackend()) } = {}) {
  const cache = createForecastCache(storage, { now: clock });
  const requests = [];
  const calls = [];
  let panel = "welcome";
  const view = {
    isReady: () => panel === "ready",
    pendingChanged: (failed) => calls.push(["pending", session.state.pendingEvent, failed]),
    placeChanged: (place) => calls.push(["place", place.name]),
    setBusy: (busy) => calls.push(["busy", busy]),
    updateSource: () => calls.push(["source"]),
    restartTicker: () => calls.push(["ticker"]),
    stopTicker: () => calls.push(["stopTicker"]),
    announce: () => calls.push(["announce"]),
    announceText: (text) => calls.push(["announceText", text]),
    showLoading: () => { panel = "loading"; calls.push(["loading"]); },
    loadingText: () => {},
    render: () => { panel = "ready"; calls.push(["render", session.state.event, session.state.selectedEventTime?.getTime() ?? null]); return true; },
    focusResult: () => calls.push(["focus"]),
    showError: (message) => { panel = "error"; calls.push(["error", message]); }
  };
  const session = createForecastSession({
    fetchBundle: (place, eventType, eventTime) => {
      const d = deferred();
      requests.push({ place, eventType, eventTime, ...d });
      return d.promise;
    },
    cache,
    persistPlace: (place) => storage.set(KEYS.place, place),
    persistViewMode: (mode) => storage.set(KEYS.viewMode, mode),
    nextEvent: eventAt,
    now: () => new Date(clock()),
    view
  });
  const bundle = (place, eventType, { missingAt = [], missingLayer = "cloud_cover_mid" } = {}) => {
    const time = Array.from({ length: 9 * 24 }, (_, index) => (NOW.getTime() - 8 * HOUR + index * HOUR) / 1000);
    const hourly = {
      time,
      cloud_cover_low: time.map(() => 10),
      cloud_cover_mid: time.map(() => 30),
      cloud_cover_high: time.map(() => 40)
    };
    for (const date of missingAt) {
      const lower = Math.floor(date.getTime() / HOUR) * HOUR / 1000;
      hourly[missingLayer] = hourly[missingLayer].map((value, index) =>
        time[index] === lower || time[index] === lower + HOUR / 1000 ? null : value);
    }
    return { place, eventType, fetchedAt: clock(), forecasts: { local: { hourly } } };
  };
  const settle = () => new Promise((r) => setImmediate(r));
  return { session, requests, calls, cache, bundle, settle, panel: () => panel };
}

async function loadReady(ctx, place = HZ, eventType = "sunset") {
  ctx.session.load(place, { eventType });
  ctx.requests.at(-1).resolve(ctx.bundle(place, eventType));
  await ctx.settle();
}

test("首次加载显示加载面板，成功后渲染并聚焦结果", async () => {
  const ctx = setup();
  ctx.session.load(HZ);
  assert.equal(ctx.panel(), "loading");
  ctx.requests[0].resolve(ctx.bundle(HZ, "sunset"));
  await ctx.settle();
  assert.equal(ctx.panel(), "ready");
  assert.equal(ctx.session.state.stale, false);
  assert.ok(ctx.calls.some(([name]) => name === "focus"));
});

test("本机存储读取受限或写入超额时，网络成功仍进入就绪态并保留新鲜预报", async () => {
  for (const denyReads of [false, true]) {
    let writes = 0;
    const storage = createStorage({
      getItem() {
        if (denyReads) throw new DOMException("Access denied", "SecurityError");
        return null;
      },
      setItem() {
        writes += 1;
        throw new DOMException("Storage full", "QuotaExceededError");
      }
    });
    const ctx = setup({ storage });
    const loading = ctx.session.load(HZ);
    const forecast = ctx.bundle(HZ, "sunset");
    ctx.requests[0].resolve(forecast);
    await loading;
    assert.equal(ctx.panel(), "ready");
    assert.equal(ctx.session.state.bundle, forecast);
    assert.equal(ctx.session.state.dataTimestamp, forecast.fetchedAt);
    assert.equal(ctx.session.state.stale, false);
    assert.equal(ctx.session.state.refreshFailed, false);
    assert.equal(ctx.session.state.refreshing, false);
    assert.equal(ctx.session.state.pendingEvent, null);
    assert.equal(ctx.cache.read(HZ, "sunset"), null);
    assert.equal(writes, 2);
    assert.equal(ctx.calls.some(([name]) => name === "error"), false);
    assert.deepEqual(ctx.calls.at(-1), ["busy", false]);
  }
});

test("损坏的缓存根节点或空条目不会使成功网络预报变成错误，且会被有效缓存替换", async () => {
  for (const raw of ["1", "null", "[]", '{"broken":null,"30.27,120.15:sunset":null}']) {
    const backend = memoryBackend();
    backend.setItem(KEYS.data, raw);
    const ctx = setup({ storage: createStorage(backend) });
    const loading = ctx.session.load(HZ);
    const forecast = ctx.bundle(HZ, "sunset");
    ctx.requests[0].resolve(forecast);
    await loading;
    assert.equal(ctx.panel(), "ready");
    assert.equal(ctx.session.state.bundle, forecast);
    assert.equal(ctx.session.state.stale, false);
    assert.equal(ctx.session.state.refreshFailed, false);
    assert.deepEqual(ctx.cache.read(HZ, "sunset"), {
      bundle: forecast, savedAt: NOW.getTime(), age: 0
    });
    assert.equal(ctx.calls.some(([name]) => name === "error"), false);
  }
});

test("同地点切换晨昏：切换期间保留当前手记并显示目标时段，成功后日期回到下一场", async () => {
  const ctx = setup();
  await loadReady(ctx);
  ctx.session.selectDay(new Date(NOW.getTime() + 2 * DAY));
  ctx.calls.length = 0;

  assert.equal(ctx.session.switchEvent("sunrise"), true);
  assert.equal(ctx.session.state.pendingEvent, "sunrise");
  assert.equal(ctx.session.state.event, "sunset");
  assert.equal(ctx.panel(), "ready");
  assert.ok(!ctx.calls.some(([name]) => name === "loading"));

  ctx.requests.at(-1).resolve(ctx.bundle(HZ, "sunrise"));
  await ctx.settle();
  assert.equal(ctx.session.state.event, "sunrise");
  assert.equal(ctx.session.state.pendingEvent, null);
  assert.equal(ctx.session.state.selectedEventTime, null);
});

test("切换失败：保留当前时段与所选日期，并提示未能读取的时段", async () => {
  const ctx = setup();
  await loadReady(ctx);
  const chosen = new Date(NOW.getTime() + 3 * DAY);
  ctx.session.selectDay(chosen);
  ctx.calls.length = 0;

  ctx.session.switchEvent("sunrise");
  ctx.requests.at(-1).reject(new Error("offline"));
  await ctx.settle();
  assert.equal(ctx.session.state.event, "sunset");
  assert.equal(ctx.session.state.pendingEvent, null);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  assert.deepEqual(ctx.calls.find(([name, , failed]) => name === "pending" && failed), ["pending", null, "sunrise"]);
  assert.equal(ctx.panel(), "ready");
});

test("切换进行中点回当前时段即取消：不发新请求，保留日期与原数据新鲜度，迟到的响应被丢弃", async () => {
  const ctx = setup();
  await loadReady(ctx);
  const chosen = new Date(NOW.getTime() + DAY);
  ctx.session.selectDay(chosen);

  ctx.session.switchEvent("sunrise");
  const pending = ctx.requests.at(-1);
  const before = ctx.requests.length;
  assert.equal(ctx.session.switchEvent("sunset"), true);
  assert.equal(ctx.requests.length, before);
  assert.equal(ctx.session.state.pendingEvent, null);
  assert.equal(ctx.session.state.stale, false);
  assert.equal(ctx.session.state.selectedEventTime, chosen);

  pending.resolve(ctx.bundle(HZ, "sunrise"));
  await ctx.settle();
  assert.equal(ctx.session.state.event, "sunset");
  assert.equal(ctx.session.state.bundle.eventType, "sunset");
});

test("过期请求的响应不覆盖最新选择", async () => {
  const ctx = setup();
  ctx.session.load(HZ);
  const first = ctx.requests[0];
  ctx.session.load(SH);
  ctx.requests[1].resolve(ctx.bundle(SH, "sunset"));
  await ctx.settle();
  first.resolve(ctx.bundle(HZ, "sunset"));
  await ctx.settle();
  assert.equal(ctx.session.state.bundle.place.name, "上海");
});

test("刷新同地点同时段保留所选日期；刷新失败沿用先前记录并标记更新未果", async () => {
  const ctx = setup();
  await loadReady(ctx);
  const chosen = new Date(NOW.getTime() + 2 * DAY);
  ctx.session.selectDay(chosen);

  ctx.session.refresh();
  assert.equal(ctx.session.state.refreshing, true);
  ctx.requests.at(-1).resolve(ctx.bundle(HZ, "sunset"));
  await ctx.settle();
  assert.equal(ctx.session.state.selectedEventTime, chosen);

  ctx.session.refresh();
  ctx.requests.at(-1).reject(new Error("offline"));
  await ctx.settle();
  assert.equal(ctx.session.state.refreshFailed, true);
  assert.equal(ctx.session.state.stale, true);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  assert.equal(ctx.panel(), "ready");
});

test("切换研判视角保留所选日期，且相同视角不重复渲染", async () => {
  const ctx = setup();
  await loadReady(ctx);
  const chosen = new Date(NOW.getTime() + 4 * DAY);
  ctx.session.selectDay(chosen);
  assert.equal(ctx.session.setViewMode("glow"), false);
  assert.equal(ctx.session.setViewMode("sundisc"), true);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
});

test("换到其他地点后日期回到下一场事件", async () => {
  const ctx = setup();
  await loadReady(ctx);
  ctx.session.selectDay(new Date(NOW.getTime() + 2 * DAY));
  ctx.session.load(SH);
  assert.equal(ctx.session.state.selectedEventTime, null);
});

test("有效缓存无需等待网络；缓存超过 5 分钟时后台刷新，年龄按保存时间计算", async () => {
  let clock = NOW.getTime();
  const ctx = setup({ clock: () => clock });
  ctx.cache.write(ctx.bundle(HZ, "sunrise"));
  clock += 10 * 60_000;

  ctx.session.load(HZ, { eventType: "sunrise", preferCache: true });
  assert.equal(ctx.panel(), "ready");
  assert.equal(ctx.session.state.stale, true);
  assert.equal(ctx.session.state.dataTimestamp, NOW.getTime());
  assert.equal(ctx.requests.length, 1);
  assert.equal(ctx.requests[0].eventType, "sunrise");
});

test("首次加载失败且无缓存时进入错误页；切换进行中不能选择日期", async () => {
  const ctx = setup();
  ctx.session.load(HZ);
  ctx.requests[0].reject(new Error("offline"));
  await ctx.settle();
  assert.equal(ctx.panel(), "error");

  const ready = setup();
  await loadReady(ready);
  ready.session.switchEvent("sunrise");
  assert.equal(ready.session.selectDay(new Date(NOW.getTime() + DAY)), false);
});

test("无效地点直接报错", () => {
  const ctx = setup();
  ctx.session.load({ name: "x", lat: "abc", lon: 1 });
  assert.equal(ctx.panel(), "error");
  assert.equal(ctx.requests.length, 0);
});

test("切换返回缺测云层时保留原手记、日期和缓存，之后有效响应可恢复切换", async () => {
  for (const missingLayer of ["cloud_cover_low", "cloud_cover_mid", "cloud_cover_high"]) {
    const ctx = setup();
    await loadReady(ctx);
    const previous = ctx.session.state.bundle;
    const timestamp = ctx.session.state.dataTimestamp;
    const chosen = new Date(NOW.getTime() + 3 * DAY);
    ctx.session.selectDay(chosen);
    const cached = ctx.cache.read(HZ, "sunset");

    ctx.session.switchEvent("sunrise");
    ctx.requests.at(-1).resolve(ctx.bundle(HZ, "sunrise", { missingAt: [eventAt("sunrise")], missingLayer }));
    await ctx.settle();
    assert.equal(ctx.panel(), "ready");
    assert.equal(ctx.session.state.bundle, previous);
    assert.equal(ctx.session.state.event, "sunset");
    assert.equal(ctx.session.state.selectedEventTime, chosen);
    assert.equal(ctx.session.state.dataTimestamp, timestamp);
    assert.equal(ctx.session.state.stale, false);
    assert.deepEqual(ctx.cache.read(HZ, "sunset"), cached);
    assert.equal(ctx.cache.read(HZ, "sunrise"), null);
    assert.deepEqual(ctx.calls.find(([name, , failed]) => name === "pending" && failed), ["pending", null, "sunrise"]);

    ctx.session.switchEvent("sunrise");
    const recovered = ctx.bundle(HZ, "sunrise");
    ctx.requests.at(-1).resolve(recovered);
    await ctx.settle();
    assert.equal(ctx.session.state.bundle, recovered);
    assert.equal(ctx.session.state.event, "sunrise");
    assert.equal(ctx.session.state.selectedEventTime, null);
    assert.deepEqual(ctx.cache.read(HZ, "sunrise").bundle, recovered);
  }
});

test("刷新验证所选日期而非下一场，缺测保留原手记及缓存，有效后续刷新清除失败状态", async () => {
  const ctx = setup();
  await loadReady(ctx);
  const previous = ctx.session.state.bundle;
  const chosen = new Date(NOW.getTime() + 6 * DAY);
  ctx.session.selectDay(chosen);
  const cached = ctx.cache.read(HZ, "sunset");

  ctx.session.refresh();
  ctx.requests.at(-1).resolve(ctx.bundle(HZ, "sunset", { missingAt: [chosen] }));
  await ctx.settle();
  assert.equal(ctx.session.state.bundle, previous);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  assert.equal(ctx.session.state.stale, true);
  assert.equal(ctx.session.state.refreshFailed, true);
  assert.equal(ctx.session.state.refreshing, false);
  assert.equal(ctx.panel(), "ready");
  assert.deepEqual(ctx.cache.read(HZ, "sunset"), cached);

  ctx.session.refresh();
  const recovered = ctx.bundle(HZ, "sunset", { missingAt: [eventAt("sunset")] });
  ctx.requests.at(-1).resolve(recovered);
  await ctx.settle();
  assert.equal(ctx.session.state.bundle, recovered);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  assert.equal(ctx.session.state.stale, false);
  assert.equal(ctx.session.state.refreshFailed, false);
  assert.deepEqual(ctx.cache.read(HZ, "sunset").bundle, recovered);
});

test("刷新提交时以请求期间最新改选日期为准，迟到的旧刷新缺测响应不覆盖有效数据", async () => {
  const ctx = setup();
  await loadReady(ctx);
  const previous = ctx.session.state.bundle;
  ctx.session.refresh();
  const chosen = new Date(NOW.getTime() + 5 * DAY);
  ctx.session.selectDay(chosen);
  ctx.requests.at(-1).resolve(ctx.bundle(HZ, "sunset", { missingAt: [chosen] }));
  await ctx.settle();
  assert.equal(ctx.session.state.bundle, previous);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  assert.equal(ctx.session.state.refreshFailed, true);

  ctx.session.refresh();
  const obsolete = ctx.requests.at(-1);
  ctx.session.refresh();
  const recovered = ctx.bundle(HZ, "sunset");
  ctx.requests.at(-1).resolve(recovered);
  await ctx.settle();
  obsolete.resolve(ctx.bundle(HZ, "sunset", { missingAt: [chosen] }));
  await ctx.settle();
  assert.equal(ctx.session.state.bundle, recovered);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  assert.equal(ctx.session.state.refreshFailed, false);
  assert.deepEqual(ctx.cache.read(HZ, "sunset").bundle, recovered);
});

test("刷新期间改选有效日期后，不因请求开始时所选日期缺测而拒收", async () => {
  const ctx = setup();
  await loadReady(ctx);
  const original = new Date(NOW.getTime() + 2 * DAY);
  const chosen = new Date(NOW.getTime() + 4 * DAY);
  ctx.session.selectDay(original);
  ctx.session.refresh();
  ctx.session.selectDay(chosen);
  const updated = ctx.bundle(HZ, "sunset", { missingAt: [original] });
  ctx.requests.at(-1).resolve(updated);
  await ctx.settle();
  assert.equal(ctx.session.state.bundle, updated);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  assert.equal(ctx.session.state.refreshFailed, false);
});

test("缺测缓存不能用于首次加载或网络失败回退，首次缺测返回有意义错误且可重试恢复", async () => {
  const ctx = setup();
  const invalid = ctx.bundle(HZ, "sunrise", { missingAt: [eventAt("sunrise")] });
  ctx.cache.write(invalid);
  ctx.session.load(HZ, { eventType: "sunrise", preferCache: true });
  assert.equal(ctx.panel(), "loading");
  assert.equal(ctx.session.state.bundle, null);
  assert.equal(ctx.requests.length, 1);
  ctx.requests.at(-1).reject(new Error("offline"));
  await ctx.settle();
  assert.equal(ctx.panel(), "error");
  assert.equal(ctx.session.state.bundle, null);

  ctx.session.refresh();
  ctx.requests.at(-1).resolve(invalid);
  await ctx.settle();
  assert.equal(ctx.panel(), "error");
  assert.equal(ctx.session.state.bundle, null);
  assert.match(ctx.calls.findLast(([name]) => name === "error")[1], /分层云量暂缺/);

  ctx.session.refresh();
  const recovered = ctx.bundle(HZ, "sunrise");
  ctx.requests.at(-1).resolve(recovered);
  await ctx.settle();
  assert.equal(ctx.panel(), "ready");
  assert.equal(ctx.session.state.bundle, recovered);
  assert.equal(ctx.session.state.refreshFailed, false);
  assert.deepEqual(ctx.cache.read(HZ, "sunrise").bundle, recovered);
});

test("切换跳过缺测缓存，失败不替换旧手记；刷新回退只采用目标日期可用的缓存", async () => {
  const ctx = setup();
  await loadReady(ctx);
  const previous = ctx.session.state.bundle;
  const chosen = new Date(NOW.getTime() + 4 * DAY);
  ctx.session.selectDay(chosen);
  const invalid = ctx.bundle(HZ, "sunrise", { missingAt: [eventAt("sunrise")] });
  ctx.cache.write(invalid);
  ctx.session.switchEvent("sunrise");
  assert.equal(ctx.session.state.bundle, previous);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  ctx.requests.at(-1).resolve(invalid);
  await ctx.settle();
  assert.equal(ctx.session.state.bundle, previous);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  assert.deepEqual(ctx.cache.read(HZ, "sunrise").bundle, invalid);

  const fresh = setup();
  const valid = fresh.bundle(HZ, "sunset");
  fresh.cache.write(valid);
  fresh.session.load(HZ);
  fresh.requests.at(-1).resolve(fresh.bundle(HZ, "sunset", { missingAt: [eventAt("sunset")] }));
  await fresh.settle();
  assert.equal(fresh.panel(), "ready");
  assert.deepEqual(fresh.session.state.bundle, valid);
  assert.equal(fresh.session.state.stale, true);
  assert.equal(fresh.session.state.refreshFailed, true);
});

test("缓存读取也以当前所选日期校验，不能用只覆盖下一场的缓存替换有效手记", async () => {
  const ctx = setup();
  await loadReady(ctx);
  const previous = ctx.session.state.bundle;
  const chosen = new Date(NOW.getTime() + 6 * DAY);
  ctx.session.selectDay(chosen);
  const invalid = ctx.bundle(HZ, "sunset", { missingAt: [chosen] });
  ctx.cache.write(invalid);
  ctx.session.load(HZ, { preferCache: true });
  assert.equal(ctx.requests.length, 2);
  assert.equal(ctx.session.state.bundle, previous);
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  ctx.requests.at(-1).resolve(ctx.bundle(HZ, "sunset"));
  await ctx.settle();
  assert.equal(ctx.panel(), "ready");
  assert.equal(ctx.session.state.selectedEventTime, chosen);
  assert.equal(ctx.session.state.stale, false);
});

test("首次缺测且没有缓存时保留空数据，显示云层缺测而非渲染不可用手记", async () => {
  const ctx = setup();
  ctx.session.load(HZ);
  ctx.requests.at(-1).resolve(ctx.bundle(HZ, "sunset", { missingAt: [eventAt("sunset")] }));
  await ctx.settle();
  assert.equal(ctx.panel(), "error");
  assert.equal(ctx.session.state.bundle, null);
  assert.equal(ctx.cache.read(HZ, "sunset"), null);
  assert.match(ctx.calls.findLast(([name]) => name === "error")[1], /分层云量暂缺/);
  assert.equal(ctx.calls.some(([name]) => name === "render"), false);
});
