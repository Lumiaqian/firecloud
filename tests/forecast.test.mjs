import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSamplingPoints,
  indexBand,
  metricsAt,
  nextEvent,
  scoreSky,
  waitAdvice,
  weatherTheme
} from "../js/forecast.mjs";

const cleanSky = {
  low: 5, mid: 35, high: 42, rh: 35, vis: 40_000, precip: 0,
  aod: 0.1, pm25: 8, dust: 4, pathLow: 5
};

function hourly(value) {
  return { time: [0, 3600], cloud_cover_low: [value, value] };
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

test("理想中高云且空气清洁达到极佳", () => {
  const score = scoreSky(cleanSky);
  assert.ok(score >= 80);
  assert.equal(indexBand(score), "极佳");
});

test("等待建议覆盖全部指数分档", () => {
  assert.equal(waitAdvice(80), "值得专程等待");
  assert.equal(waitAdvice(65), "值得追这场霞光");
  assert.equal(waitAdvice(50), "可以顺路看看");
  assert.equal(waitAdvice(35), "有空可以留意");
  assert.equal(waitAdvice(34), "不建议专程等待");
});

test("低云和中云同时厚重时封顶 10", () => {
  const score = scoreSky({ ...cleanSky, low: 90, mid: 80, high: 42, pathLow: 5 });
  assert.ok(score <= 10);
});

test("高 AOD 和 PM2.5 只降低相同云况得分", () => {
  const polluted = scoreSky({ ...cleanSky, aod: 0.8, pm25: 90 });
  assert.ok(polluted < scoreSky(cleanSky));
});

test("太阳方向高低云覆盖降低得分", () => {
  assert.ok(scoreSky({ ...cleanSky, pathLow: 90 }) < scoreSky({ ...cleanSky, pathLow: 5 }));
});

test("远端缺失权重归一化且全缺失返回 null", () => {
  const bundle = {
    forecasts: {
      local: { hourly: hourly(5) },
      near: { hourly: hourly(20) },
      mid: null,
      far: { hourly: hourly(80) },
      left: null,
      right: null
    },
    air: null
  };
  const metrics = metricsAt(bundle, new Date(0));
  assert.equal(metrics.pathLow, 56);
  assert.deepEqual(metrics.availableRemote, ["near", "far"]);
  assert.deepEqual(metrics.missingRemote, ["mid", "left", "right"]);
  for (const name of ["near", "mid", "far", "left", "right"]) bundle.forecasts[name] = null;
  assert.equal(metricsAt(bundle, new Date(0)).pathLow, null);
});

test("北京采样生成六个不同且距离准确的点", () => {
  const origin = { lat: 39.9042, lon: 116.4074 };
  const points = buildSamplingPoints(origin.lat, origin.lon, 270);
  assert.equal(Object.keys(points).length, 6);
  assert.equal(new Set(Object.values(points).map((point) => `${point.lat.toFixed(5)},${point.lon.toFixed(5)}`)).size, 6);
  const expected = { near: 60, mid: 120, far: 240, left: 120, right: 120 };
  for (const [name, distance] of Object.entries(expected)) {
    assert.ok(Math.abs(distanceKm(origin, points[name]) - distance) < 1, name);
  }
});

test("下一次日落可查且极昼不抛错", () => {
  const from = new Date("2026-03-20T00:00:00Z");
  const sunset = nextEvent("sunset", 0, 0, from);
  assert.ok(sunset instanceof Date);
  assert.ok(sunset > from);
  assert.equal(nextEvent("sunset", 89, 0, new Date("2026-06-21T12:00:00Z")), null);
});

test("实时天气映射为独立的背景天气与昼夜状态", () => {
  const cases = [
    [{ weatherCode: 0, isDay: 1 }, { weather: "clear", light: "day" }],
    [{ weatherCode: 2, isDay: 1 }, { weather: "partly", light: "day" }],
    [{ weatherCode: 45, isDay: 0 }, { weather: "overcast", light: "night" }],
    [{ weatherCode: 61, isDay: 0 }, { weather: "rain", light: "night" }],
    [{ weatherCode: 0, snowfall: 0.2, isDay: 1 }, { weather: "snow", light: "day" }]
  ];
  for (const [input, expected] of cases) assert.deepEqual(weatherTheme(input), expected);
});

test("旧缓存缺少 current 字段时回退到当前小时云量与本地昼夜", () => {
  assert.deepEqual(
    weatherTheme({ cloudCover: 82, fallbackLight: "night" }),
    { weather: "overcast", light: "night" }
  );
});
