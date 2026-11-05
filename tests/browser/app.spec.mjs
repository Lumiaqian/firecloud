import { test, expect, openWelcome, chooseHangzhou, record, expectNoDocumentOverflow } from "./fixtures.mjs";

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
