import { test as base, expect } from "@playwright/test";

export const NOW = new Date("2026-10-24T08:00:00Z");
const MIDNIGHT = Date.parse("2026-10-24T00:00:00+08:00");

// Match the requested hourly/current fields, as tests/api.test.mjs does, rather
// than bypassing the real API adapter or session with production test hooks.
function forecastResponse(url, current) {
  const values = {
    cloud_cover_low: 10, cloud_cover_mid: 30, cloud_cover_high: 40,
    relative_humidity_2m: 55, visibility: 20_000, precipitation: 0,
    aerosol_optical_depth: 0.1, pm2_5: 12, dust: 0
  };
  const time = Array.from({ length: Number(url.searchParams.get("forecast_days")) * 24 },
    (_, hour) => MIDNIGHT / 1000 + hour * 3600);
  const hourly = { time };
  for (const field of url.searchParams.get("hourly").split(",")) {
    if (!(field in values)) throw new Error(`Missing browser weather fixture: ${field}`);
    hourly[field] = time.map(() => values[field]);
  }
  return {
    hourly,
    timezone: "Asia/Shanghai",
    utc_offset_seconds: 28_800,
    ...(url.searchParams.has("current") ? {
      current: {
        time: NOW.getTime() / 1000, weather_code: 2, temperature_2m: 22,
        is_day: 1, cloud_cover: 40, precipitation: 0, snowfall: 0,
        wind_speed_10m: 8, wind_direction_10m: 135, wind_gusts_10m: 12,
        pressure_msl: 1015,
        ...current
      }
    } : {})
  };
}

export const test = base.extend({
  uncaughtErrors: [async ({ context }, use) => {
    const errors = [];
    const watch = (page) => page.on("pageerror", (error) => errors.push(error.stack || error.message));
    context.pages().forEach(watch);
    context.on("page", watch);
    await use(errors);
    expect(errors, "No uncaught browser exceptions").toEqual([]);
  }, { auto: true }],
  weatherApi: async ({ context }, use) => {
    const api = { fail: false, forecasts: 0, current: {} };
    await context.route(/^https:\/\/(?:api|air-quality-api|geocoding-api)\.open-meteo\.com\//, async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "geocoding-api.open-meteo.com") {
        await route.fulfill({ json: { results: [{
          name: "杭州", admin1: "浙江省", country: "中国", latitude: 30.27,
          longitude: 120.15, population: 12_000_000
        }] } });
      } else {
        api.forecasts += 1;
        if (api.fail) await route.fulfill({ status: 503, json: { error: true, reason: "Fixture outage" } });
        else await route.fulfill({ json: forecastResponse(url, api.current) });
      }
    });
    await use(api);
  }
});

export { expect };

export async function openWelcome(page) {
  await page.clock.setFixedTime(NOW);
  await page.goto("./");
  await expect(page.locator("#panel-welcome")).toBeVisible();
}

export async function chooseHangzhou(page) {
  await page.locator("#welcome-search").click();
  const dialog = page.getByRole("dialog", { name: "选择天空" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox").fill("杭州");
  await dialog.getByRole("searchbox").press("Enter");
  await dialog.getByRole("button", { name: /杭州.*浙江省/ }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#panel-ready")).toBeVisible();
  await expect(page.locator("#home-place-name")).toHaveText("杭州");
  await expect(page.locator("#score")).toHaveText(/^\d{1,2}$/);
}

export async function record(page) {
  return page.locator("#hero-master-card").evaluate((card) => Object.fromEntries(
    ["score", "event-time", "event-date", "window-range", "index-label"].map((id) =>
      [id, card.querySelector(`#${id}`).textContent])
  ));
}

export async function expectNoDocumentOverflow(page) {
  await page.evaluate(() => document.fonts.ready);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
}
