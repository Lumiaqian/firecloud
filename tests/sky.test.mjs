import test from "node:test";
import assert from "node:assert/strict";
import { createSky } from "../js/ui/sky.mjs";
import { lightFromSunClock, solarElevation, sunTimes } from "../js/forecast.mjs";
import { KEYS } from "../js/core/storage.mjs";

const PLACE = { name: "杭州", lat: 30.27, lon: 120.15 };
const MEASURED_KEYS = ["precipitation", "snowfall", "windSpeed", "windDirection", "windGust", "pressure", "visibility"];

function setup() {
  const properties = new Map();
  const writes = [];
  const paper = [];
  const moons = [];
  const body = {
    dataset: {},
    querySelector: () => null,
    addEventListener: () => {},
    style: { setProperty: (name, value) => properties.set(name, value) }
  };
  const sky = createSky({
    body,
    storage: { set: (key, value) => writes.push({ key, value }) },
    paperFx: { syncWeather: (conditions) => paper.push(conditions) },
    moonView: { render: (moon, context) => moons.push({ moon, context }) },
    themeColor: { content: "" }
  });
  return { sky, body, properties, writes, paper, moons };
}

function withComputedStyle(callback) {
  const original = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "#123456" });
  try {
    callback();
  } finally {
    if (original === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = original;
  }
}

test("保留记录清除实测天空和纸面驱动，不写缓存，成功刷新后恢复", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-03T12:00:00Z") });
  withComputedStyle(() => {
    const ctx = setup();
    const now = new Date();
    const bundle = {
      forecasts: {
        local: {
          timezone: "Asia/Shanghai",
          current: {
            weather_code: 95,
            cloud_cover: 100,
            precipitation: 8,
            snowfall: 0,
            wind_speed_10m: 72,
            wind_direction_10m: 90,
            wind_gusts_10m: 110,
            pressure_msl: 965,
            temperature_2m: 9
          },
          hourly: { time: [now.getTime() / 1000], visibility: [500] }
        }
      }
    };

    assert.equal(ctx.sky.apply(bundle, PLACE).label, "雷阵雨");
    assert.equal(ctx.body.dataset.unconfirmed, "false");
    assert.equal(ctx.body.dataset.weather, "thunder");
    assert.equal(ctx.body.dataset.storm, "severe");
    assert.equal(ctx.body.dataset.windActive, "true");
    assert.equal(ctx.body.dataset.visibility, "500");
    assert.ok(Number(ctx.properties.get("--precip-intensity")) > 0);
    assert.equal(ctx.paper.at(-1).weather, "thunder");
    assert.equal(ctx.writes.length, 1);
    assert.equal(ctx.writes[0].key, KEYS.theme);

    assert.equal(ctx.sky.apply(bundle, PLACE, { unconfirmed: true }), null);
    assert.equal(ctx.body.dataset.unconfirmed, "true");
    assert.equal(ctx.body.dataset.weather, "clear");
    assert.equal(ctx.body.dataset.storm, "calm");
    assert.equal(ctx.body.dataset.windActive, "false");
    for (const key of MEASURED_KEYS) assert.equal(ctx.body.dataset[key], undefined, key);
    for (const key of ["--precip-intensity", "--fx-density", "--wind-strength", "--precip-fog-boost"]) {
      assert.equal(ctx.properties.get(key), "0.000", key);
    }
    assert.deepEqual(ctx.paper.at(-1), {
      weather: null,
      windSpeed: 0,
      windGust: 0,
      cloudCover: 0,
      precipitation: 0,
      isDay: ctx.body.dataset.light !== "night",
      light: ctx.body.dataset.theme
    });
    assert.equal(ctx.writes.length, 1);
    assert.equal(ctx.moons.length, 2);
    assert.deepEqual(ctx.moons.at(-1).context, { placeName: PLACE.name, timeZone: "Asia/Shanghai" });
    const moon = ctx.moons.at(-1).moon;
    assert.ok(Number.isFinite(moon.altitude));
    assert.equal(ctx.properties.get("--moon-illumination"), moon.phaseFraction.toFixed(3));

    ctx.sky.apply(bundle, PLACE);
    assert.equal(ctx.body.dataset.unconfirmed, "false");
    assert.equal(ctx.body.dataset.weather, "thunder");
    assert.equal(ctx.body.dataset.storm, "severe");
    assert.equal(ctx.body.dataset.windSpeed, "72");
    assert.equal(ctx.paper.at(-1).weather, "thunder");
    assert.equal(ctx.writes.length, 2);
  });
});

test("天幕把地点时区注入农历与观测时间展示", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-24T17:00:00Z") });
  withComputedStyle(() => {
    const ctx = setup();
    ctx.sky.apply({
      forecasts: {
        local: {
          timezone: "Asia/Shanghai",
          current: {},
          hourly: {}
        }
      }
    }, PLACE);

    assert.equal(ctx.moons.length, 1);
    assert.deepEqual(ctx.moons[0].context, {
      placeName: PLACE.name,
      timeZone: "Asia/Shanghai"
    });
    assert.equal(ctx.moons[0].moon.lunarDate, "农历九月十六");
  });
});

test("未确认记录不读取实况或小时天气，昼夜和月亮仍由地点当前天文计算", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-03T12:00:00Z") });
  withComputedStyle(() => {
    const ctx = setup();
    const bundle = {
      forecasts: {
        local: {
          timezone: "Asia/Shanghai",
          get current() { throw new Error("不应读取旧实况"); },
          get hourly() { throw new Error("不应读取旧小时天气"); }
        }
      }
    };
    ctx.sky.apply(bundle, PLACE, { unconfirmed: true });
    const now = new Date();
    const fallback = solarElevation(now, PLACE.lat, PLACE.lon) >= 0 ? "day" : "night";
    assert.equal(ctx.body.dataset.light, lightFromSunClock(now, sunTimes(now, PLACE.lat, PLACE.lon), fallback));
    assert.equal(ctx.body.dataset.weather, "clear");
    assert.equal(ctx.moons.length, 1);
    assert.ok(Number.isFinite(ctx.moons[0].moon.phaseFraction));
    assert.equal(ctx.writes.length, 0);
  });
});
