import test from "node:test";
import assert from "node:assert/strict";

import {
  collisionPlane,
  listenToMediaQuery,
  particleBudget,
  weatherDynamicsFor,
  weatherEffectFor,
  weatherSurfaceCrossing
} from "../js/weather-fx.mjs";

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
test("粒子数量随雨雪强度和风速动态变化", () => {
  const lightRain = weatherDynamicsFor({ effect: "rain", precipitation: 0.1, windSpeed: 0 });
  const heavyRain = weatherDynamicsFor({
    effect: "rain",
    precipitation: 4,
    windSpeed: 64,
    windDirection: 90
  });
  assert.equal(particleBudget("rain", 390, 844, lightRain.densityScale), 54);
  assert.equal(particleBudget("rain", 390, 844, heavyRain.densityScale), 136);
  assert.ok(heavyRain.windX < 0);
  assert.ok(heavyRain.fallSpeedScale > lightRain.fallSpeedScale);

  const lightSnow = weatherDynamicsFor({ effect: "snow", snowfall: 0.05, windSpeed: 0 });
  const heavySnow = weatherDynamicsFor({ effect: "snow", snowfall: 0.8, windSpeed: 32 });
  assert.equal(particleBudget("snow", 390, 844, lightSnow.densityScale), 38);
  assert.equal(particleBudget("snow", 390, 844, heavySnow.densityScale), 72);
  assert.deepEqual(
    weatherDynamicsFor({ effect: "stars", precipitation: 4, windSpeed: 64 }),
    { densityScale: 1, windX: 46, fallSpeedScale: 1 }
  );
});

test("风向按气象来向转换为屏幕横向速度", () => {
  const eastWind = weatherDynamicsFor({ effect: "rain", windSpeed: "32", windDirection: "90" });
  const westWind = weatherDynamicsFor({ effect: "rain", windSpeed: "32", windDirection: "270" });
  assert.ok(eastWind.windX < 0);
  assert.ok(westWind.windX > 0);
  assert.ok(Math.abs(eastWind.windX + westWind.windX) < 1e-9);
});

test("雨雪虚拟地面碰撞带保持在视口底部", () => {
  assert.equal(Math.round(collisionPlane("rain", 1_000, 0)), 930);
  assert.equal(Math.round(collisionPlane("rain", 1_000, 1)), 1_015);
  assert.equal(Math.round(collisionPlane("snow", 1_000, 0)), 910);
  assert.equal(Math.round(collisionPlane("snow", 1_000, 1)), 1_020);
  assert.equal(Math.round(collisionPlane("stars", 1_000, 0.5)), 1_000);
});

test("雨雪穿过页面分隔线时命中最近的可见表面", () => {
  const surfaces = [
    { id: 0, left: 20, right: 370, y: 180 },
    { id: 1, left: 20, right: 370, y: 320 }
  ];
  assert.equal(weatherSurfaceCrossing(surfaces, 120, 160, 340), surfaces[0]);
  assert.equal(weatherSurfaceCrossing(surfaces, 120, 181, 340), surfaces[1]);
  assert.equal(weatherSurfaceCrossing(surfaces, 10, 160, 340), null);
  assert.equal(weatherSurfaceCrossing(surfaces, 120, 340, 160), null);
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
