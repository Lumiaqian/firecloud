/**
 * 入口：创建各模块并接线。预报状态由 core/session 管理，这里只负责把状态渲染到页面。
 */
import { fetchForecastBundle } from "./api.mjs";
import {
  hasCloudLayers,
  metricsAt,
  nextEvent,
  photographicAdviceFor,
  photographicAdviceForSunDisc,
  skyBreakdown,
  solarAzimuth,
  sunDiscBreakdown,
  sunDiscPhenomenon,
  tierFor,
  viewingWindow
} from "./forecast.mjs";
import { createFrameLoop } from "./frame-loop.mjs";
import { createWeatherFx } from "./weather-fx.mjs";
import { createForecastSession } from "./core/session.mjs";
import { KEYS, createForecastCache, createStorage, normalizePlace } from "./core/storage.mjs";
import { eventLabels, formatCountdown, localTimeZone } from "./core/format.mjs";
import { $ } from "./ui/dom.mjs";
import { trackInputModality, triggerHaptic } from "./ui/motion.mjs";
import { createMoonView } from "./ui/moon.mjs";
import { createSky } from "./ui/sky.mjs";
import { createHeroView } from "./ui/hero.mjs";
import { createFactorsView } from "./ui/factors.mjs";
import { createWeekView } from "./ui/week.mjs";
import { initFluidDrawer } from "./ui/drawer.mjs";
import { createPlaces } from "./ui/places.mjs";
import { loaderMarkup } from "./ui/loaders.mjs";
import { createWelcome } from "./ui/welcome.mjs";
import { bindPaperInteractions } from "./ui/paper.mjs";
import { createPaperFx } from "./ui/paper-fx.mjs";

const PANELS = ["welcome", "loading", "ready", "error"];
const TICK_INTERVAL = 30_000;
const body = document.body;
const els = {
  placeName: $("place-name"), brand: $("open-places"), favorite: $("favorite-button"), refresh: $("refresh-button"),
  homePlace: $("home-place-name"), homePlaceButton: $("home-place-button"), homeRegion: $("home-region"), homeWeather: $("home-weather"),
  tabs: [$("tab-sunset"), $("tab-sunrise")], eventContext: $("event-context"), eventPending: $("event-pending"),
  eventPendingLabel: $("event-pending-label"), eventPendingDetail: $("event-pending-detail"), noteAction: $("forecast-note-action"),
  forecastContent: [...$("panel-ready").children].filter((element) => element.matches("article, section")),
  status: $("forecast-status"), loadingText: $("loading-text"), loadingContext: $("loading-context"),
  errorTitle: $("error-title"), errorText: $("error-text"), retry: $("retry-button"),
  placesDialog: $("places-dialog"), lunarDialog: $("lunar-dialog")
};
let failedSwitch = null;

trackInputModality(body);
$("loader-stage").innerHTML = loaderMarkup();
const storage = createStorage();
const frameLoop = createFrameLoop();
createWeatherFx($("weather-canvas"), { contactCanvas: $("weather-contact-canvas"), loop: frameLoop });
const paperFx = createPaperFx($("weather-foreground-canvas"), { loop: frameLoop });
bindPaperInteractions(paperFx);

const moonView = createMoonView();
const sky = createSky({ storage, moonView, paperFx, themeColor: $("theme-color") });
const hero = createHeroView();
const factors = createFactorsView();
const week = createWeekView({ onSelectDay: selectDay });
const welcome = createWelcome();
const resetPlacesDrawer = initFluidDrawer(els.placesDialog);
initFluidDrawer(els.lunarDialog);

const session = createForecastSession({
  fetchBundle: fetchForecastBundle,
  cache: createForecastCache(storage),
  nextEvent,
  persistPlace: (place) => storage.set(KEYS.place, place),
  persistViewMode: (mode) => storage.set(KEYS.viewMode, mode),
  viewMode: storage.get(KEYS.viewMode, "glow"),
  view: {
    isReady: () => body.dataset.state === "ready",
    pendingChanged: renderPending,
    placeChanged(place) {
      els.placeName.textContent = place.name;
      els.homePlace.textContent = place.name;
      renderRegion(place);
      els.homePlaceButton.setAttribute("aria-label", `选择地点，当前地点：${place.name}`);
      els.brand.setAttribute("aria-label", `选择地点，当前地点：${place.name}`);
    },
    setBusy,
    updateSource() { hero.updateSource(session.state); renderForecastNote(); },
    restartTicker: () => startTicker(session.currentEventTime()),
    stopTicker,
    announce,
    announceText: (text) => { els.status.textContent = text; },
    showLoading: () => setPanel("loading"),
    loadingText: (text) => { els.loadingText.textContent = text; },
    render: renderReady,
    focusResult() {
      if (!els.placesDialog.open) hero.focusTarget.focus({ preventScroll: true });
    },
    showError,
    reportError: (error) => console.error(error)
  }
});

const places = createPlaces({
  storage,
  getCurrentPlace: () => session.state.place,
  onChoose: (place) => session.load(place),
  resetDrawer: resetPlacesDrawer
});

// ---------- 面板与全局状态 ----------
function setPanel(name) {
  if (name !== "ready") stopTicker();
  body.dataset.state = name;
  if (name === "loading") {
    hero.markLoading();
    els.loadingContext.textContent = `${session.state.place?.name || "所选地点"} · 读取预报`;
  }
  if (name === "welcome") welcome.sync();
  for (const panel of PANELS) $(`panel-${panel}`).hidden = panel !== name;
  els.favorite.hidden = name !== "ready";
  els.refresh.hidden = name !== "ready";
}

function setBusy(busy) {
  els.refresh.disabled = busy;
  els.refresh.textContent = busy ? "更新中…" : session.state.refreshFailed ? "重试" : "刷新";
  els.refresh.setAttribute("aria-busy", String(busy));
}

function syncEventTabs() {
  const { event, pendingEvent } = session.state;
  for (const tab of els.tabs) {
    tab.setAttribute("aria-pressed", String(tab.dataset.event === event));
    tab.setAttribute("aria-busy", String(tab.dataset.event === pendingEvent));
  }
}

// The compact row owns update status while the committed forecast stays in place.
function renderPending(failedEvent) {
  const { pendingEvent } = session.state;
  failedSwitch = failedEvent || null;
  const switching = pendingEvent !== null;
  if (switching) body.dataset.switching = "true";
  else delete body.dataset.switching;
  els.eventContext.hidden = false;
  for (const content of els.forecastContent) {
    content.inert = switching;
    content.setAttribute("aria-busy", String(switching));
  }
  renderForecastNote();
  syncEventTabs();
}

function renderForecastNote() {
  const { state } = session;
  const current = eventLabels.glow[state.event];
  const target = eventLabels.glow[state.pendingEvent || failedSwitch];
  let title = "已更新", detail = "", action = "", mode = "";
  if (state.pendingEvent) {
    title = "正在更新…";
    detail = `读取${target} · 沿用${current}记录`;
    action = "取消"; mode = "cancel";
  } else if (failedSwitch) {
    title = "更新未成功 · 沿用记录";
    detail = `${target}未读入 · 仍为${current}`;
    action = `重试${target}`; mode = "switch";
  } else if (state.refreshing) {
    title = "正在更新…";
  } else if (state.refreshFailed) {
    title = "更新未成功 · 沿用记录";
  } else if (state.stale) {
    title = "尚未更新";
  }
  const actionHadFocus = document.activeElement === els.noteAction;
  els.eventPending.dataset.state = state.pendingEvent ? "switching" : failedSwitch ? "switchfailed" : state.refreshing ? "refreshing" : state.refreshFailed ? "error" : state.stale ? "stale" : "live";
  els.eventPending.hidden = false;
  els.eventPendingLabel.textContent = title;
  els.eventPendingDetail.textContent = detail;
  els.eventPendingDetail.hidden = !detail;
  els.noteAction.hidden = !action;
  els.noteAction.textContent = action;
  els.noteAction.dataset.action = mode;
  if (actionHadFocus && !action) els.eventPendingLabel.focus({ preventScroll: true });
}

function showError(message) {
  els.status.textContent = "";
  hero.markError();
  els.errorText.textContent = message;
  const noEvent = Boolean(session.state.place) && !session.currentEventTime();
  const missing = message.includes("分层云量暂缺");
  els.errorTitle.textContent = noEvent ? "暂无晨昏视窗" : missing ? "云层资料暂缺" : "天空暂时失联";
  $("panel-error").dataset.forecastState = noEvent ? "empty" : missing ? "missing" : "error";
  els.retry.hidden = noEvent;
  $("error-search").textContent = missing ? "查看临近城市" : "换个地点";
  if (noEvent) els.errorText.textContent = "极昼或极夜期间，未来三天没有对应的晨昏视窗。";
  else if (missing) els.errorText.textContent = "当地高空分层云量暂缺，暂不能给出可靠评分。";
  setPanel("error");
  queueMicrotask(() => {
    if (!els.placesDialog.open && body.dataset.state === "error") {
      els.errorTitle.focus({ preventScroll: true });
    }
  });
}

function announce() {
  const { state } = session;
  const isSunDiscView = state.viewMode === "sundisc";
  const viewLabel = eventLabels[isSunDiscView ? "sundisc" : "glow"][state.event];
  els.status.textContent = `${state.place.name}，${viewLabel}，${isSunDiscView ? "日轮指数" : "霞光指数"} ${hero.scoreText}`;
}

function renderRegion(place) {
  const region = [...new Set([place.admin1, place.country].filter(Boolean))].join(" · ");
  els.homeRegion.textContent = region;
  els.homeRegion.hidden = !region;
}

// ---------- 倒计时 ----------
let ticker = null;

function stopTicker() {
  clearInterval(ticker);
  ticker = null;
}

// 每 30 秒刷新倒计时并按当前时刻重算天幕
function startTicker(eventTime) {
  stopTicker();
  const { state } = session;
  const unconfirmed = Boolean(state.stale || state.refreshFailed);
  const viewing = unconfirmed ? null : viewingWindow(state.event, eventTime, state.place.lat, state.place.lon, state.viewMode);
  const tick = () => {
    hero.setCountdown(unconfirmed ? "保存的预报时刻" : formatCountdown(viewing));
    if (state.bundle && state.place) sky.apply(state.bundle, state.place, { unconfirmed });
  };
  tick();
  ticker = setInterval(tick, TICK_INTERVAL);
}

// ---------- 渲染 ----------
function renderReady() {
  const { state } = session;
  const eventTime = session.currentEventTime();
  if (!eventTime) {
    session.fail("该纬度处于极昼或极夜，未来三天无对应晨昏视窗");
    return false;
  }
  if (!state.bundle) {
    session.fail("暂无可用预测，请稍后重试");
    return false;
  }
  const metrics = metricsAt(state.bundle, eventTime);
  if (!hasCloudLayers(metrics)) {
    session.fail("当地高空分层云量暂缺，无法完成研判，请稍后重试或选择临近城市");
    return false;
  }
  const wasReady = body.dataset.state === "ready";

  const glowBreakdown = skyBreakdown(metrics);
  const sunBreakdown = sunDiscBreakdown(metrics);
  const phenomenon = sunDiscPhenomenon(metrics, sunBreakdown.score);
  const glow = {
    score: glowBreakdown.score,
    breakdown: glowBreakdown,
    advice: photographicAdviceFor(metrics, glowBreakdown.score, state.event)
  };
  const sun = {
    score: sunBreakdown.score,
    breakdown: sunBreakdown,
    phenomenon,
    advice: photographicAdviceForSunDisc(metrics, sunBreakdown.score, phenomenon, state.event)
  };
  const active = state.viewMode === "sundisc" ? sun : glow;

  body.dataset.tier = tierFor(active.score);
  const unconfirmed = Boolean(state.stale || state.refreshFailed);
  const condition = sky.apply(state.bundle, state.place, { unconfirmed });
  els.placeName.textContent = "晨昏观测手记";
  els.homePlace.textContent = state.place.name;
  renderRegion(state.place);
  els.homePlaceButton.setAttribute("aria-label", `选择地点，当前地点：${state.place.name}`);
  els.homeWeather.textContent = unconfirmed
    ? "天气实况待更新"
    : `当前实况 · ${condition?.summary || "天气资料暂缺"}`;
  els.brand.setAttribute("aria-label",
    `霞光预报 - 选择地点，当前地点：${state.place.name}${!unconfirmed && condition?.summary ? `，当前天气：${condition.summary}` : ""}`);

  const { lat, lon } = state.place;
  hero.render({
    state,
    eventTime,
    timeZone: localTimeZone(state.bundle),
    azimuth: solarAzimuth(eventTime, lat, lon),
    viewing: viewingWindow(state.event, eventTime, lat, lon, state.viewMode),
    glow,
    sun
  });
  factors.render(active.breakdown);
  syncEventTabs();
  renderForecastNote();
  places.updateFavoriteButton();
  if (!wasReady) week.reset();
  week.render({
    bundle: state.bundle,
    place: state.place,
    event: state.event,
    viewMode: state.viewMode,
    base: nextEvent(state.event, lat, lon, new Date()),
    selectedTime: eventTime.getTime()
  });
  if (state.pendingEvent) stopTicker();
  else startTicker(eventTime);
  setPanel("ready");

  return true;
}

// ---------- 交互 ----------
els.brand.addEventListener("click", places.open);
els.homePlaceButton.addEventListener("click", places.open);
$("loading-search").addEventListener("click", places.open);
els.noteAction.addEventListener("click", () => {
  const action = els.noteAction.dataset.action;
  if (action === "cancel") session.switchEvent(session.state.event);
  else if (action === "switch" && failedSwitch) session.switchEvent(failedSwitch);
});
function selectDay(timestamp) {
  if (timestamp && session.selectDay(new Date(Number(timestamp)))) triggerHaptic(12);
}

for (const tab of els.tabs) {
  tab.addEventListener("click", () => {
    if (session.switchEvent(tab.dataset.event)) triggerHaptic(10);
  });
}
hero.companion.addEventListener("click", () => {
  if (session.setViewMode(session.state.viewMode === "glow" ? "sundisc" : "glow")) triggerHaptic(12);
});
els.refresh.addEventListener("click", () => session.refresh());
els.retry.addEventListener("click", () => {
  if (!session.refresh()) places.open();
});
$("hero-lunar-badge").addEventListener("click", () => {
  triggerHaptic(12);
  els.lunarDialog.showModal();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}

const lastPlace = normalizePlace(storage.get(KEYS.place));
if (lastPlace) session.load(lastPlace, { preferCache: true });
else setPanel("welcome");
