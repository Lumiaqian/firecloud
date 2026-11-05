import test from "node:test";
import assert from "node:assert/strict";
import { createWeatherFx } from "../js/weather-fx.mjs";

function browserEnvironment(t) {
  const element = () => {
    const node = new EventTarget();
    const classes = new Set();
    return Object.assign(node, {
      dataset: {},
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }
      },
      querySelectorAll: () => [],
      querySelector: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
      setAttribute() {}
    });
  };
  const body = element();
  const ids = new Map(["paper-clip-action", "score-circle-action", "paper-tape-action", "paper-fx-status"].map((id) => [id, element()]));
  const document = Object.assign(new EventTarget(), {
    body, hidden: false,
    getElementById: (id) => ids.get(id) ?? null,
    querySelectorAll: () => [],
    querySelector: () => null,
    getAnimations: () => []
  });
  const media = Object.assign(new EventTarget(), { matches: false });
  const raf = new Map();
  let nextId = 1;
  const requestAnimationFrame = (callback) => { const id = nextId++; raf.set(id, callback); return id; };
  const cancelAnimationFrame = (id) => raf.delete(id);
  const window = Object.assign(new EventTarget(), {
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 1,
    matchMedia: () => media, requestAnimationFrame, cancelAnimationFrame
  });
  const observers = [];
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() {}
  }
  const globals = {
    document, window, matchMedia: window.matchMedia, MutationObserver,
    requestAnimationFrame, cancelAnimationFrame,
    localStorage: { getItem: () => null, setItem() {} }
  };
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const cleanups = [];
  t.after(() => {
    cleanups.forEach((cleanup) => cleanup());
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const timeouts = new Map();
  const intervals = new Map();
  t.mock.method(globalThis, "setTimeout", (callback, delay) => { const id = nextId++; timeouts.set(id, { callback, delay }); return id; });
  t.mock.method(globalThis, "clearTimeout", (id) => timeouts.delete(id));
  t.mock.method(globalThis, "setInterval", (callback, delay) => { const id = nextId++; intervals.set(id, { callback, delay }); return id; });
  t.mock.method(globalThis, "clearInterval", (id) => intervals.delete(id));
  const tasks = new Set();
  const loop = {
    add: (task) => tasks.add(task),
    remove: (task) => tasks.delete(task),
    step: (timestamp) => [...tasks].forEach((task) => task(timestamp))
  };
  const fills = [];
  const context = {
    globalAlpha: 1,
    setTransform() {}, clearRect() { fills.length = 0; },
    save() {}, restore() {}, beginPath() {}, arc() {}, ellipse() {},
    moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, stroke() {}, rect() {}, clip() {},
    translate() {}, rotate() {}, scale() {}, fillRect() {}, closePath() {},
    fill() { fills.push(this.fillStyle); }
  };
  const canvas = Object.assign(element(), { getContext: () => context });
  return { body, ids, document, media, observers, cleanups, timeouts, intervals, tasks, loop, fills, canvas };
}

test("键盘只停主动纸面反馈，实况阵风继续且所有全局暂停都清理未完成反馈", async (t) => {
  const env = browserEnvironment(t);
  const { createPaperFx } = await import("../js/ui/paper-fx.mjs");
  const { bindPaperInteractions } = await import("../js/ui/paper.mjs");
  const { trackInputModality } = await import("../js/ui/motion.mjs");
  trackInputModality(env.body);
  const fx = createPaperFx(env.canvas, { body: env.body, loop: env.loop });
  bindPaperInteractions(fx);
  let now = 0;
  t.mock.method(performance, "now", () => now);
  const positions = [];
  t.mock.method(env.canvas.getContext("2d"), "translate", (x, y) => positions.push([x, y]));
  fx.gust("gentle");
  now = 2200;
  env.loop.step();
  assert.equal(env.body.dataset.paperWind, "gentle", "轻风不可在粒子退场前截断");
  const crossing = positions.splice(0);
  assert.ok(crossing.some(([x]) => x > 0 && x < 390), "手机上轻风仍在经过视口");
  fx.gust("high");
  env.loop.step();
  assert.deepEqual(positions.splice(0), crossing, "追加阵风不能重置仍在飞行的粒子");
  now = 9000;
  env.loop.step();
  assert.equal(env.body.dataset.paperWind, undefined);
  assert.equal(env.tasks.size, 0, "最后一批粒子退场后停止绘制");
  env.document.dispatchEvent(new Event("keydown"));
  for (const id of ["paper-clip-action", "score-circle-action", "paper-tape-action"]) {
    env.ids.get(id).dispatchEvent(new Event("click"));
    assert.equal(env.body.dataset.paperWind, undefined);
    assert.equal(env.tasks.size, 0);
    assert.equal(env.timeouts.size, 0);
  }
  fx.syncWeather({ weather: "clear", windSpeed: 10 });
  const ambient = [...env.timeouts.values()][0];
  env.timeouts.clear();
  ambient.callback();
  assert.equal(env.body.dataset.paperWind, "gentle");
  assert.equal(env.tasks.size, 1);
  assert.equal(fx.gust("high"), false);
  assert.equal(env.body.dataset.paperWind, "gentle");
  fx.syncWeather({ weather: "clear", windSpeed: 25 });
  assert.equal(env.body.dataset.paperWind, "high");

  const pauseModes = [
    { pause() { env.media.matches = true; env.media.dispatchEvent(new Event("change")); }, resume() { env.media.matches = false; env.media.dispatchEvent(new Event("change")); } },
    { pause() { env.document.hidden = true; env.document.dispatchEvent(new Event("visibilitychange")); }, resume() { env.document.hidden = false; env.document.dispatchEvent(new Event("visibilitychange")); } },
    { pause() { env.body.dataset.motion = "false"; env.body.dispatchEvent(new Event("firecloud:motionchange")); }, resume() { env.body.dataset.motion = "true"; env.body.dispatchEvent(new Event("firecloud:motionchange")); } }
  ];
  for (const mode of pauseModes) {
    env.document.dispatchEvent(new Event("pointerdown"));
    assert.equal(fx.strike(), true);
    assert.equal(fx.warm(), true);
    assert.equal(fx.gust("high"), true);
    assert.ok(env.timeouts.size > 0);
    mode.pause();
    assert.equal(env.body.dataset.paperWind, undefined);
    assert.equal(env.ids.get("paper-clip-action").classList.contains("is-lightning-struck"), false);
    assert.equal(env.ids.get("score-circle-action").classList.contains("is-sun-warmed"), false);
    assert.equal(env.tasks.size, 0);
    assert.equal(env.timeouts.size, 0);
    assert.equal(env.intervals.size, 0);
    ambient.callback();
    assert.equal(env.body.dataset.paperWind, undefined);
    for (const id of ["paper-clip-action", "score-circle-action", "paper-tape-action"]) {
      env.ids.get(id).dispatchEvent(new Event("click"));
      assert.equal(env.tasks.size, 0);
      assert.equal(env.timeouts.size, 0);
    }
    mode.resume();
    assert.equal(env.body.dataset.paperWind, undefined);
    assert.equal(env.tasks.size, 0);
    env.document.dispatchEvent(new Event("keydown"));
    const nextAmbient = [...env.timeouts.values()][0];
    env.timeouts.clear();
    nextAmbient.callback();
    assert.equal(env.body.dataset.paperWind, "gentle");
  }
});

for (const weather of ["clear", "rain"]) {
  test(`${weather === "clear" ? "常规" : "叠加"}星空每帧只推进一次，相位暂停后不补跑`, (t) => {
    const env = browserEnvironment(t);
    t.mock.method(Math, "random", () => 0.1);
    Object.assign(env.body.dataset, { state: "ready", weather, light: "night", motion: "true" });
    const fx = createWeatherFx(env.canvas, { root: env.body, loop: env.loop });
    env.cleanups.push(() => fx.destroy());
    const starAlpha = () => {
      const style = env.fills.find((fill) => fill.startsWith("rgba(188, 210, 230,"));
      assert.ok(style, "a star must actually be drawn");
      return Number(style.slice(style.lastIndexOf(",") + 1, -1));
    };
    const expected = (elapsed) => {
      const amplitude = (0.12 + (0.15 + (0.38 - 0.15) * 0.1) * 0.52) * 0.62 * 0.75 * (weather === "clear" ? 1 : 0.38);
      return amplitude * (0.58 + Math.sin(Math.PI * 2 * 0.1 + Math.PI / 7 * elapsed) * 0.42);
    };
    const assertAlpha = (elapsed) => assert.ok(Math.abs(starAlpha() - expected(elapsed)) < 1e-12);
    env.loop.step(16);
    env.loop.step(36);
    assertAlpha(0.02);
    env.loop.step(56);
    assertAlpha(0.04);
    const pauseModes = [
      { pause() { env.media.matches = true; env.media.dispatchEvent(new Event("change")); }, resume() { env.media.matches = false; env.media.dispatchEvent(new Event("change")); } },
      { pause() { env.document.hidden = true; env.document.dispatchEvent(new Event("visibilitychange")); }, resume() { env.document.hidden = false; env.document.dispatchEvent(new Event("visibilitychange")); } },
      { pause() { env.body.dataset.motion = "false"; env.observers[0].callback(); }, resume() { env.body.dataset.motion = "true"; env.observers[0].callback(); } }
    ];
    let elapsed = 0.04;
    let timestamp = 56;
    for (const mode of pauseModes) {
      const snapshottedFrame = [...env.tasks][0];
      mode.pause();
      assert.equal(env.tasks.size, 0);
      assert.equal(env.body.dataset.fxVisible, "false");
      assert.equal(env.body.dataset.contactVisible, "false");
      assert.deepEqual(env.fills, []);
      timestamp += 60_000;
      snapshottedFrame(timestamp);
      assert.equal(env.tasks.size, 0);
      assert.deepEqual(env.fills, []);
      env.loop.step(timestamp);
      assert.deepEqual(env.fills, []);
      mode.resume();
      assert.equal(env.tasks.size, 1);
      env.loop.step(timestamp + 16);
      assertAlpha(elapsed);
      env.loop.step(timestamp + 36);
      elapsed += 0.02;
      assertAlpha(elapsed);
      timestamp += 36;
    }
    fx.destroy();
    assert.equal(env.tasks.size, 0);
  });
}
