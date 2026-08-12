import test from "node:test";
import assert from "node:assert/strict";
import { fetchForecastPoint, searchCities } from "../js/api.mjs";

test("本地点位请求包含当前天气字段，远端点位保持原请求", async () => {
  const requested = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requested.push(new URL(url));
    return { ok: true, json: async () => ({}) };
  };

  try {
    await fetchForecastPoint({ lat: 39.9042, lon: 116.4074 }, { includeCurrent: true });
    await fetchForecastPoint({ lat: 39.5, lon: 117 }, { includeCurrent: false });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    requested[0].searchParams.get("current"),
    "weather_code,is_day,cloud_cover,precipitation,snowfall,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl"
  );
  assert.equal(requested[0].searchParams.get("precipitation_unit"), "mm");
  assert.equal(requested[0].searchParams.get("wind_speed_unit"), "kmh");
  assert.equal(requested[1].searchParams.has("current"), false);
});

test("城市搜索补全行政区、去重并优先精确高人口结果", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).searchParams.get("count"), "12");
    return {
      ok: true,
      json: async () => ({
        results: [
          { name: "上海", admin1: "云南", admin2: "大理州", country: "中国", latitude: 26, longitude: 100, population: 1000 },
          { name: "上海", admin1: "上海市", country: "中国", latitude: 31.23, longitude: 121.47, population: 24000000 },
          { name: "上海", admin1: "上海市", country: "中国", latitude: 31.2301, longitude: 121.4701, population: 24000000 },
          { name: "上海县", admin1: "上海市", country: "中国", latitude: 31.1, longitude: 121.3, population: 30000000 }
        ]
      })
    };
  };

  try {
    assert.deepEqual(await searchCities("上海"), [
      { name: "上海", detail: "上海市 · 中国", lat: 31.23, lon: 121.47 },
      { name: "上海", detail: "大理州 · 云南 · 中国", lat: 26, lon: 100 },
      { name: "上海县", detail: "上海市 · 中国", lat: 31.1, lon: 121.3 }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
