import test from "node:test";
import assert from "node:assert/strict";
import { fetchForecastBundle, fetchForecastPoint, searchCities } from "../js/api.mjs";
import { hasCloudLayers, metricsAt, nextEvent, sunTimes } from "../js/forecast.mjs";

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
    "weather_code,temperature_2m,is_day,cloud_cover,precipitation,snowfall,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl"
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

test("下一场在明天时七张日卡均有天气，第七天空气质量越界或失败仍正常降级", async () => {
  const originalFetch = globalThis.fetch;
  const place = { name: "杭州", lat: 30.27, lon: 120.15 };
  const now = new Date("2026-10-24T14:00:00Z");
  const localMidnight = Date.parse("2026-10-24T00:00:00+08:00");
  const values = {
    cloud_cover_low: 10, cloud_cover_mid: 30, cloud_cover_high: 40,
    relative_humidity_2m: 55, visibility: 20_000, precipitation: 0,
    aerosol_optical_depth: 0.1, pm2_5: 12, dust: 0
  };
  let airAvailable = true;
  globalThis.fetch = async (url) => {
    const request = new URL(url);
    const isAir = request.hostname === "air-quality-api.open-meteo.com";
    const days = Number(request.searchParams.get("forecast_days"));
    // 模拟两个端点各自的实际范围：天气可扩展，空气质量仍仅提供七个当地日。
    if (isAir && (!airAvailable || days > 7)) {
      return { ok: false, status: 503 };
    }
    const time = Array.from({ length: days * 24 }, (_, hour) => localMidnight / 1000 + hour * 3600);
    const hourly = { time };
    for (const key of request.searchParams.get("hourly").split(",")) {
      hourly[key] = time.map(() => values[key]);
    }
    return { ok: true, json: async () => ({ hourly, timezone: "Asia/Shanghai" }) };
  };

  try {
    for (const available of [true, false]) {
      airAvailable = available;
      for (const eventType of ["sunrise", "sunset"]) {
        const base = nextEvent(eventType, place.lat, place.lon, now);
        assert.ok(base.getTime() > Date.parse("2026-10-25T00:00:00+08:00"));
        const bundle = await fetchForecastBundle(place, eventType, base);
        const events = Array.from({ length: 7 }, (_, index) =>
          sunTimes(new Date(base.getTime() + index * 86_400_000), place.lat, place.lon)[eventType]);
        assert.ok(events.at(-1).getTime() > localMidnight + 7 * 86_400_000);
        for (const eventTime of events) {
          const metrics = metricsAt(bundle, eventTime);
          assert.equal(hasCloudLayers(metrics), true, `${eventType} ${eventTime.toISOString()}`);
          assert.equal(metrics.availableRemote.length, 5);
        }
        assert.equal(metricsAt(bundle, events[0]).aod, available ? 0.1 : null);
        assert.equal(metricsAt(bundle, events.at(-1)).aod, null);
        assert.equal(bundle.missingRemote.includes("air"), !available);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
