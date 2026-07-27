import test from "node:test";
import assert from "node:assert/strict";

import { listenToMediaQuery, particleBudget, weatherEffectFor } from "../js/weather-fx.mjs";

test("天气主题映射到真实粒子效果", () => {
  assert.equal(weatherEffectFor({ weather: "rain", light: "day" }), "rain");
  assert.equal(weatherEffectFor({ weather: "snow", light: "night" }), "snow");
  assert.equal(weatherEffectFor({ weather: "clear", light: "night" }), "stars");
  assert.equal(weatherEffectFor({ weather: "partly", light: "night" }), "stars");
  assert.equal(weatherEffectFor({ weather: "overcast", light: "day" }), null);
});

test("粒子数量随画布面积变化且受上限保护", () => {
  assert.equal(particleBudget("rain", 390, 844), 78);
  assert.equal(particleBudget("snow", 390, 844), 47);
  assert.equal(particleBudget("stars", 390, 844), 24);
  assert.equal(particleBudget("rain", 8_000, 8_000), 180);
  assert.equal(particleBudget(null, 390, 844), 0);
});

test("动态偏好监听兼容现代与旧版 Safari 接口", () => {
  const listener = () => {};
  const modernCalls = [];
  const stopModern = listenToMediaQuery({
    addEventListener: (...args) => modernCalls.push(["add", ...args]),
    removeEventListener: (...args) => modernCalls.push(["remove", ...args])
  }, listener);
  stopModern();
  assert.deepEqual(modernCalls, [["add", "change", listener], ["remove", "change", listener]]);

  const legacyCalls = [];
  const stopLegacy = listenToMediaQuery({
    addListener: (...args) => legacyCalls.push(["add", ...args]),
    removeListener: (...args) => legacyCalls.push(["remove", ...args])
  }, listener);
  stopLegacy();
  assert.deepEqual(legacyCalls, [["add", listener], ["remove", listener]]);
});
