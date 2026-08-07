import test from "node:test";
import assert from "node:assert/strict";

import {
  atmosphereDriveFor,
  collisionPlane,
  listenToMediaQuery,
  particleBudget,
  weatherDynamicsFor,
  weatherEffectFor,
  weatherSurfaceCrossing
} from "../js/weather-fx.mjs";

test("天气主题映射到真实粒子效果", () => {
  assert.equal(weatherEffectFor({ weather: "rain", light: "day" }), "rain");
  assert.equal(weatherEffectFor({ weather: "thunder", light: "night" }), "rain");
  assert.equal(weatherEffectFor({ weather: "snow", light: "night" }), "snow");
  assert.equal(weatherEffectFor({ weather: "hail", light: "day" }), "hail");
  assert.equal(weatherEffectFor({ weather: "clear", storm: "strong", windGust: "40" }), "wind");
  assert.equal(weatherEffectFor({ weather: "overcast", storm: "severe", windSpeed: 48 }), "wind");
  assert.equal(weatherEffectFor({ weather: "overcast", storm: "severe", windSpeed: 0, windGust: "0" }), null);
  assert.equal(weatherEffectFor({ weather: "clear", light: "night" }), "stars");
  assert.equal(weatherEffectFor({ weather: "partly", light: "night" }), "stars");
  assert.equal(weatherEffectFor({ weather: "overcast", light: "day", storm: "calm" }), null);
});

test("粒子数量随画布面积变化且受上限保护", () => {
  assert.equal(particleBudget("rain", 390, 844), 78);
  assert.equal(particleBudget("snow", 390, 844), 47);
  assert.equal(particleBudget("hail", 390, 844), 55);
  assert.equal(particleBudget("wind", 390, 844), 18);
  assert.equal(particleBudget("stars", 390, 844), 24);
  assert.equal(particleBudget("hail", 8_000, 8_000), 140);
  assert.equal(particleBudget("wind", 8_000, 8_000), 64);
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
    { densityScale: 1, windX: 46, windY: 0, fallSpeedScale: 1 }
  );
});

test("雷暴雨强于同降水普通雨，并输出统一大气强度驱动", () => {
  const rain = weatherDynamicsFor({ effect: "rain", weather: "rain", precipitation: 1, windSpeed: 0 });
  const thunder = weatherDynamicsFor({ effect: "rain", weather: "thunder", precipitation: 1, windSpeed: 0 });
  assert.ok(thunder.densityScale > rain.densityScale);

  const drive = atmosphereDriveFor({ weather: "thunder", precipitation: 2, windSpeed: 20 });
  assert.ok(drive.precipIntensity > 0.3);
  assert.ok(drive.fxDensity > 0.3);
  assert.deepEqual(
    atmosphereDriveFor({ weather: "clear", windSpeed: 10 }),
    { precipIntensity: 0, fxDensity: 0, densityScale: 1 }
  );
  const windDrive = atmosphereDriveFor({ weather: "clear", windSpeed: 48, windDirection: 90 });
  assert.ok(windDrive.fxDensity > 0);
});

test("冰雹和干燥强风分别随降水及阵风增强", () => {
  const lightHail = weatherDynamicsFor({ effect: "hail", precipitation: 0.1, windSpeed: 0 });
  const heavyHail = weatherDynamicsFor({
    effect: "hail",
    precipitation: 4,
    windSpeed: 24,
    windGust: 80,
    windDirection: 90
  });
  assert.ok(heavyHail.densityScale > lightHail.densityScale);
  assert.ok(heavyHail.windX < 0);
  assert.ok(heavyHail.fallSpeedScale > lightHail.fallSpeedScale);

  const steadyWind = weatherDynamicsFor({
    effect: "wind",
    windSpeed: 32,
    windDirection: 270
  });
  const gustingWind = weatherDynamicsFor({
    effect: "wind",
    windSpeed: 32,
    windGust: 80,
    windDirection: 270
  });
  assert.ok(gustingWind.windX > steadyWind.windX);
  assert.ok(gustingWind.densityScale > steadyWind.densityScale);
  assert.ok(gustingWind.fallSpeedScale > steadyWind.fallSpeedScale);
  assert.ok(Math.abs(gustingWind.windY) < 1e-9);
});

test("干燥风按气象来向转换为二维屏幕速度，雨雪消费小比例纵向风", () => {
  const northWind = weatherDynamicsFor({ effect: "wind", windSpeed: 32, windDirection: 0 });
  const eastWind = weatherDynamicsFor({ effect: "wind", windSpeed: 32, windDirection: 90 });
  const southWind = weatherDynamicsFor({ effect: "wind", windSpeed: 32, windDirection: 180 });
  const westWind = weatherDynamicsFor({ effect: "wind", windSpeed: 32, windDirection: 270 });
  assert.ok(northWind.windY > 0);
  assert.ok(eastWind.windX < 0);
  assert.ok(southWind.windY < 0);
  assert.ok(westWind.windX > 0);
  assert.ok(Math.abs(eastWind.windY) < 1e-9);
  assert.ok(Math.abs(northWind.windX) < 1e-9);

  const rain = weatherDynamicsFor({ effect: "rain", windSpeed: 32, windDirection: 0 });
  const snow = weatherDynamicsFor({ effect: "snow", windSpeed: 32, windDirection: 180 });
  assert.ok(Math.abs(rain.windX) < 1e-9);
  assert.ok(Math.abs(snow.windX) < 1e-9);
  assert.ok(rain.windY > 0);
  assert.ok(snow.windY < 0);
  assert.ok(rain.windY < northWind.windY);
  assert.ok(Math.abs(snow.windY) < Math.abs(southWind.windY));
});

test("降水虚拟地面碰撞带保持在视口底部，横风不产生碰撞", () => {
  assert.equal(Math.round(collisionPlane("rain", 1_000, 0)), 930);
  assert.equal(Math.round(collisionPlane("rain", 1_000, 1)), 1_015);
  assert.equal(Math.round(collisionPlane("snow", 1_000, 0)), 910);
  assert.equal(Math.round(collisionPlane("snow", 1_000, 1)), 1_020);
  assert.equal(Math.round(collisionPlane("hail", 1_000, 0)), 925);
  assert.equal(Math.round(collisionPlane("hail", 1_000, 1)), 1_015);
  assert.equal(Math.round(collisionPlane("wind", 1_000, 0.5)), 1_000);
  assert.equal(Math.round(collisionPlane("stars", 1_000, 0.5)), 1_000);
});

test("雨雪穿过页面表面顶边时命中下落路径上最近的一层", () => {
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
