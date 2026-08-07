import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSamplingPoints,
  indexBand,
  metricsAt,
  nextEvent,
  scoreSky,
  solarAzimuth,
  solarElevation,
  stormLevelFor,
  sunDiskPosition,
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

test("实时天气映射覆盖八种背景天气与昼夜状态", () => {
  const cases = [
    [{ weatherCode: 0, isDay: 1 }, { weather: "clear", light: "day" }],
    [{ weatherCode: 2, isDay: 1 }, { weather: "partly", light: "day" }],
    [{ weatherCode: 3, isDay: 1 }, { weather: "overcast", light: "day" }],
    [{ weatherCode: 45, isDay: 0 }, { weather: "fog", light: "night" }],
    [{ weatherCode: 61, isDay: 0 }, { weather: "rain", light: "night" }],
    [{ weatherCode: 0, snowfall: 0.2, isDay: 1 }, { weather: "snow", light: "day" }],
    [{ weatherCode: 95, isDay: 1 }, { weather: "thunder", light: "day" }],
    [{ weatherCode: 96, isDay: 0 }, { weather: "hail", light: "night" }]
  ];
  for (const [input, expected] of cases) assert.deepEqual(weatherTheme(input), expected);
});

test("天气代码优先级让冰雹、雷暴和降雪胜过降水", () => {
  assert.equal(weatherTheme({ weatherCode: 99, snowfall: 1, precipitation: 2 }).weather, "hail");
  assert.equal(weatherTheme({ weatherCode: 95, snowfall: 1, precipitation: 2 }).weather, "thunder");
  assert.equal(weatherTheme({ weatherCode: 71, precipitation: 2 }).weather, "snow");
  assert.equal(weatherTheme({ weatherCode: 48 }).weather, "fog");
});

test("风暴等级覆盖边界、缺失字段与低气压增强", () => {
  assert.equal(stormLevelFor(), "calm");
  assert.equal(stormLevelFor({ windSpeed: 24.9, windGust: 39.9, pressure: 1000 }), "calm");
  assert.equal(stormLevelFor({ windSpeed: 25 }), "breezy");
  assert.equal(stormLevelFor({ windGust: 60 }), "strong");
  assert.equal(stormLevelFor({ windSpeed: 60 }), "severe");
  assert.equal(stormLevelFor({ windGust: 80 }), "severe");
  assert.equal(stormLevelFor({ pressure: 999 }), "breezy");
  assert.equal(stormLevelFor({ pressure: 984 }), "strong");
  assert.equal(stormLevelFor({ pressure: 969 }), "severe");
});

test("旧缓存缺少 current 字段时回退到当前小时云量与本地昼夜", () => {
  assert.deepEqual(
    weatherTheme({ cloudCover: 82, fallbackLight: "night" }),
    { weather: "overcast", light: "night" }
  );
});

test("微量降水不触发雨雪主题，太阳方位可映射到屏幕坐标", () => {
  assert.equal(weatherTheme({ weatherCode: 0, precipitation: 0.02 }).weather, "clear");
  assert.equal(weatherTheme({ weatherCode: 0, snowfall: 0.01 }).weather, "clear");
  assert.equal(weatherTheme({ weatherCode: 0, precipitation: 0.08 }).weather, "rain");

  const noon = new Date("2026-06-21T04:00:00Z");
  const az = solarAzimuth(noon, 31.2, 121.5);
  const el = solarElevation(noon, 31.2, 121.5);
  assert.ok(az >= 0 && az < 360);
  assert.ok(el > 20);
  const disk = sunDiskPosition(az, el);
  assert.equal(disk.valid, true);
  assert.ok(disk.x > 8 && disk.x < 92);
  assert.ok(disk.y > 8 && disk.y < 70);
  assert.deepEqual(sunDiskPosition(180, -10), { x: 78, y: 19, valid: false });
});
