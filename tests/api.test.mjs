import test from "node:test";
import assert from "node:assert/strict";
import { fetchForecastPoint } from "../js/api.mjs";

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
