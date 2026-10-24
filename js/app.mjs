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
  sealFor,
  sealForSunDisc,
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
import { fadeUpdate, trackInputModality, triggerHaptic } from "./ui/motion.mjs";
import { createMoonView } from "./ui/moon.mjs";
import { createSky } from "./ui/sky.mjs";
import { createHeroView } from "./ui/hero.mjs";
import { createFactorsView } from "./ui/factors.mjs";
import { createWeekView } from "./ui/week.mjs";
import { initFluidDrawer } from "./ui/drawer.mjs";
import { createPlaces } from "./ui/places.mjs";
import { createDevLab } from "./ui/dev-lab.mjs";
import { createWelcome } from "./ui/welcome.mjs";
import { bindHeroTilt, bindPaperInteractions } from "./ui/paper.mjs";
import { createPaperFx } from "./ui/paper-fx.mjs";

const PANELS = ["welcome", "loading", "ready", "error"];
const TICK_INTERVAL = 30_000;
const body = document.body;
const els = {
  placeName: $("place-name"), brand: $("open-places"), favorite: $("favorite-button"), refresh: $("refresh-button"),
  tabs: [$("tab-sunset"), $("tab-sunrise")], eventContext: $("event-context"), eventPending: $("event-pending"),
  eventPendingLabel: $("event-pending-label"), eventPendingDetail: $("event-pending-detail"),
  forecastContent: [...$("panel-ready").children].filter((element) => element.matches("article, section")),
  status: $("forecast-status"), loadingText: $("loading-text"),
  errorTitle: $("error-title"), errorText: $("error-text"), retry: $("retry-button"),
  placesDialog: $("places-dialog"), devDialog: $("dev-lab-dialog"), lunarDialog: $("lunar-dialog")
};

trackInputModality(body);
const storage = createStorage();
const frameLoop = createFrameLoop();
createWeatherFx($("weather-canvas"), { contactCanvas: $("weather-contact-canvas"), loop: frameLoop });
const paperFx = createPaperFx($("weather-foreground-canvas"), { loop: frameLoop });
bindPaperInteractions(paperFx);
bindHeroTilt();

const moonView = createMoonView();
const sky = createSky({ storage, moonView, paperFx, themeColor: $("theme-color") });
const hero = createHeroView();
const factors = createFactorsView();
const week = createWeekView({ onSelectDay: selectDay });
const welcome = createWelcome();
const resetPlacesDrawer = initFluidDrawer(els.placesDialog);
initFluidDrawer(els.devDialog);
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
      els.brand.setAttribute("aria-label", `选择地点，当前地点：${place.name}`);
    },
    setBusy,
    updateSource: () => hero.updateSource(session.state),
    restartTicker: () => startTicker(session.currentEventTime()),
    stopTicker,
    announce,
    announceText: (text) => { els.status.textContent = text; },
    showLoading: () => setPanel("loading"),
    loadingText: (text) => { els.loadingText.textContent = text; },
    render: renderReady,
    focusResult() {
      if (!els.placesDialog.open && !els.devDialog.open) hero.focusTarget.focus({ preventScroll: true });
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
createDevLab({
  storage,
  moonView,
  getPlace: () => session.state.place,
  onBrandClick: places.open,
  onTestLoading() {
    setPanel("loading");
    els.loadingText.textContent = "正在模拟计算霞光云层…";
    setTimeout(() => (session.state.bundle ? renderReady() : setPanel("welcome")), 3000);
  }
});

// ---------- 面板与全局状态 ----------
function setPanel(name) {
  if (name !== "ready") stopTicker();
  body.dataset.state = name;
  if (name === "loading") hero.markLoading();
  if (name === "welcome") welcome.sync();
  for (const panel of PANELS) $(`panel-${panel}`).hidden = panel !== name;
  els.favorite.hidden = name !== "ready";
  els.refresh.hidden = name !== "ready";
}

function setBusy(busy) {
  els.refresh.disabled = busy;
  els.refresh.classList.toggle("spin", busy);
  els.refresh.setAttribute("aria-busy", String(busy));
}

function syncEventTabs() {
  const { event, pendingEvent } = session.state;
  for (const tab of els.tabs) {
    tab.setAttribute("aria-pressed", String(tab.dataset.event === (pendingEvent ?? event)));
    tab.setAttribute("aria-busy", String(tab.dataset.event === pendingEvent));
  }
}

// 时段切换中或切换失败时，在工具栏说明目标时段与暂留的手记，并冻结正文交互
function renderPending(failedEvent) {
  const { event, pendingEvent } = session.state;
  const switching = pendingEvent !== null;
  if (switching) body.dataset.switching = "true";
  else delete body.dataset.switching;
  els.eventContext.hidden = switching || Boolean(failedEvent);
  els.eventPending.hidden = !switching && !failedEvent;
  els.eventPending.dataset.status = failedEvent ? "error" : "loading";
  const target = eventLabels.glow[pendingEvent ?? failedEvent];
  els.eventPendingLabel.textContent = switching ? `正在读取${target}` : failedEvent ? `${target}读取未果` : "";
  els.eventPendingDetail.textContent = switching || failedEvent ? `暂留${eventLabels.glow[event]}手记` : "";
  for (const content of els.forecastContent) {
    content.inert = switching;
    content.setAttribute("aria-busy", String(switching));
  }
  syncEventTabs();
}

function showError(message) {
  els.status.textContent = "";
  hero.markError();
  els.errorText.textContent = message;
  setPanel("error");
  queueMicrotask(() => {
    if (!els.placesDialog.open && !els.devDialog.open && body.dataset.state === "error") {
      els.errorTitle.focus({ preventScroll: true });
    }
  });
}

function announce() {
  const { state } = session;
  const isSunDiscView = state.viewMode === "sundisc";
  const viewLabel = eventLabels[isSunDiscView ? "sundisc" : "glow"][state.event];
  const freshness = state.refreshFailed ? "更新未果，沿用先前观测记录" : state.stale ? "先前观测记录" : "实时数据";
  els.status.textContent = `${state.place.name}，${viewLabel}，${isSunDiscView ? "日轮指数" : "霞光指数"} ${hero.scoreText}，${freshness}`;
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
  const viewing = viewingWindow(state.event, eventTime, state.place.lat, state.place.lon, state.viewMode);
  const tick = () => {
    hero.setCountdown(formatCountdown(viewing));
    if (state.bundle && state.place) sky.apply(state.bundle, state.place);
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
  const changing = [...hero.changing, factors.element];
  const previousText = changing.map((element) => element.textContent);

  const glowBreakdown = skyBreakdown(metrics);
  const sunBreakdown = sunDiscBreakdown(metrics);
  const phenomenon = sunDiscPhenomenon(metrics, sunBreakdown.score);
  const glow = {
    score: glowBreakdown.score,
    breakdown: glowBreakdown,
    seal: sealFor(glowBreakdown.score),
    advice: photographicAdviceFor(metrics, glowBreakdown.score, state.event)
  };
  const sun = {
    score: sunBreakdown.score,
    breakdown: sunBreakdown,
    phenomenon,
    seal: sealForSunDisc(sunBreakdown.score, phenomenon),
    advice: photographicAdviceForSunDisc(metrics, sunBreakdown.score, phenomenon, state.event)
  };
  const active = state.viewMode === "sundisc" ? sun : glow;

  body.dataset.tier = tierFor(active.score);
  const condition = sky.apply(state.bundle, state.place);
  const weatherSuffix = condition?.summary ? ` · ${condition.summary}` : "";
  els.placeName.textContent = `${state.place.name}${weatherSuffix}`;
  els.brand.setAttribute("aria-label",
    `霞光预报 - 选择地点，当前地点：${state.place.name}${condition?.summary ? `，当前天气：${condition.summary}` : ""}`);

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

  // 所选事件时刻有降水时纸面受潮；当前实况在下雨时保持受潮
  if (typeof metrics.precip === "number" && metrics.precip > 0.05) paperFx.soak();
  else if (body.dataset.weather !== "rain" && body.dataset.weather !== "thunder") paperFx.dry();
  if (wasReady) changing.forEach((element, index) => {
    if (element.textContent !== previousText[index]) fadeUpdate(element);
  });
  return true;
}

// ---------- 交互 ----------
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
