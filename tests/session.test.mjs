import test from "node:test";
import assert from "node:assert/strict";
import { createForecastSession } from "../js/core/session.mjs";
import { createForecastCache, createStorage } from "../js/core/storage.mjs";

const HZ = { name: "杭州", lat: 30.27, lon: 120.15 };
const SH = { name: "上海", lat: 31.23, lon: 121.47 };
const NOW = new Date("2026-10-24T08:00:00Z");
const DAY = 86_400_000;

function memoryBackend() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function setup({ clock = () => NOW.getTime() } = {}) {
  const storage = createStorage(memoryBackend());
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
    fetchBundle: (place, eventType) => {
      const d = deferred();
      requests.push({ place, eventType, ...d });
      return d.promise;
    },
    cache,
    nextEvent: (type) => new Date(NOW.getTime() + (type === "sunset" ? 9 : 22) * 3_600_000),
    now: () => new Date(clock()),
    view
  });
  const bundle = (place, eventType) => ({ place, eventType, fetchedAt: clock() });
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
