import { test, expect, openWelcome, chooseHangzhou, record, expectNoDocumentOverflow } from "./fixtures.mjs";
import { sunTimes } from "../../js/forecast.mjs";

test("saved-record reveal sizes stars and rain before the first visible frame", async ({ page, weatherApi }) => {
  await openWelcome(page);
  await chooseHangzhou(page);
  await page.clock.setFixedTime(new Date("2026-10-24T12:00:00Z"));
  await page.getByRole("button", { name: "刷新预报" }).click();
  await expect(page.locator("#event-pending")).toHaveAttribute("data-state", "live");

  for (const current of [{ weather_code: 2 }, { weather_code: 61, precipitation: 1 }]) {
    await page.reload();
    await expect(page.locator("body")).toHaveAttribute("data-unconfirmed", "true");
    await expect(page.locator("#weather-canvas")).not.toBeVisible();
    weatherApi.current = current;
    // Observe every rendered frame, not only the settled canvas after refresh.
    await page.evaluate(() => {
      window.badWeatherFrames = [];
      window.watchWeatherFrames = true;
      const watch = () => {
        const c = document.querySelector("#weather-canvas");
        const bounds = c.getBoundingClientRect();
        if (document.body.dataset.unconfirmed === "false" && bounds.width > 0) {
          const ratio = Math.min(devicePixelRatio || 1, 2);
          if (c.width !== Math.round(bounds.width * ratio) || c.height !== Math.round(bounds.height * ratio)) {
            window.badWeatherFrames.push([c.width, c.height, bounds.width, bounds.height]);
          }
        }
        if (window.watchWeatherFrames) requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    });
    await page.getByRole("button", { name: "刷新预报" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-fx", current.weather_code === 2 ? "stars" : "rain");
    await expect.poll(() => page.locator("#weather-canvas").evaluate((c) => {
      const pixels = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let occupied = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) occupied++;
      return occupied > 0 && occupied / (c.width * c.height) < 0.1;
    })).toBe(true);
    expect(await page.evaluate(() => {
      window.watchWeatherFrames = false;
      return window.badWeatherFrames;
    })).toEqual([]);
  }
});

test("clear twilight retains readable ink after astronomical sunset", async ({ page, weatherApi }) => {
  await openWelcome(page);
  weatherApi.current = { weather_code: 0, cloud_cover: 0 };
  const { sunset } = sunTimes(new Date("2026-10-24T08:00:00Z"), 30.27, 120.15);
  await page.clock.setFixedTime(new Date(sunset.getTime() + 60_000));
  await chooseHangzhou(page);
  await expect(page.locator("body")).toHaveAttribute("data-light", "night");
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dusk");
  const contrast = await page.evaluate(() => {
    const luminance = (rgb) => rgb.map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ink = getComputedStyle(document.querySelector("#home-place-name")).color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const sky = getComputedStyle(document.body).getPropertyValue("--sky-top").trim().match(/[a-f\d]{2}/gi).map((v) => parseInt(v, 16));
    const a = luminance(ink), b = luminance(sky);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test("welcome search chooses a place and renders a usable seven-day record", async ({ page, weatherApi }) => {
  await openWelcome(page);
  await expect(page.locator("#panel-ready")).not.toBeVisible();
  await chooseHangzhou(page);
  expect(weatherApi.forecasts).toBeGreaterThan(0);
  await expect(page.locator("#data-source")).toHaveAttribute("data-status", "live");
  const days = page.getByRole("group", { name: "七日预报" }).getByRole("button");
  await expect(days).toHaveCount(7);
  for (const day of await days.all()) await expect(day).toBeEnabled();
  const first = await record(page);
  await days.nth(2).click();
  await expect(days.nth(2)).toHaveAttribute("aria-pressed", "true");
  expect((await record(page))["event-date"]).not.toBe(first["event-date"]);
  await page.locator("#tab-sunrise").click();
  await expect(page.locator("#tab-sunrise")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#event-pending")).toHaveAttribute("data-state", "live");
  await expect(page.locator("#event-time")).toHaveText(/^\d{2}:\d{2}$/);
});

test("refresh outage retains the selected record, reload recovers cache, retry returns live", async ({ page, weatherApi }) => {
  await openWelcome(page);
  await chooseHangzhou(page);
  const initial = await record(page);
  const days = page.getByRole("group", { name: "七日预报" }).getByRole("button");
  await days.nth(2).click();
  const selected = await record(page);
  const updated = await page.locator("#updated-at").textContent();

  weatherApi.fail = true;
  await page.getByRole("button", { name: "刷新预报" }).click();
  await expect(page.locator("#event-pending")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#panel-ready")).toBeVisible();
  await expect(page.locator("#panel-error")).not.toBeVisible();
  await expect(page.locator("#data-source")).toHaveAttribute("data-status", "stale");
  await expect(days.nth(2)).toHaveAttribute("aria-pressed", "true");
  expect(await record(page)).toEqual(selected);
  await expect(page.locator("#updated-at")).toHaveText(updated);
  const failedRequests = weatherApi.forecasts;

  await page.reload();
  await expect(page.locator("#panel-ready")).toBeVisible();
  await expect(page.locator("#data-source")).toHaveAttribute("data-status", "stale");
  expect(await record(page)).toEqual(initial);
  expect(weatherApi.forecasts, "Young saved forecast should restore without a network request").toBe(failedRequests);

  weatherApi.fail = false;
  await page.getByRole("button", { name: "刷新预报" }).click();
  await expect(page.locator("#event-pending")).toHaveAttribute("data-state", "live");
  await expect(page.locator("#data-source")).toHaveAttribute("data-status", "live");
  expect(weatherApi.forecasts).toBeGreaterThan(failedRequests);
});

for (const width of [390, 320]) {
  test(`${width}px welcome, ready and place dialog stay within the document and remain reachable`, async ({ page, weatherApi }) => {
    await page.setViewportSize({ width, height: 844 });
    await openWelcome(page);
    await expectNoDocumentOverflow(page);
    await page.locator("#welcome-search").click();
    const dialog = page.getByRole("dialog", { name: "选择天空" });
    const close = dialog.getByRole("button", { name: "取消并关闭地点选择" });
    await expect(dialog).toBeInViewport();
    await expect(dialog.getByRole("searchbox")).toBeInViewport();
    await expect(close).toBeInViewport();
    await expectNoDocumentOverflow(page);
    await close.click();
    await chooseHangzhou(page);
    expect(weatherApi.forecasts).toBeGreaterThan(0);
    await expectNoDocumentOverflow(page);
    await page.locator("#home-place-button").click();
    await expect(dialog.getByRole("searchbox")).toBeInViewport();
    await expect(close).toBeInViewport();
    await expectNoDocumentOverflow(page);
    await close.click();
    await expect(page.locator("#panel-ready")).toBeVisible();
  });
}
