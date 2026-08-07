import { fetchForecastBundle, reverseGeocode, searchCities } from "./api.mjs?v=5";
import {
  indexBand,
  metricsAt,
  nextEvent,
  reasonsFor,
  scoreSky,
  solarAzimuth,
  solarElevation,
  stormLevelFor,
  sunDiskPosition,
  sunTimes,
  waitAdvice,
  weatherTheme
} from "./forecast.mjs?v=5";
import { atmosphereDriveFor, clearEnergyFor, createWeatherFx } from "./weather-fx.mjs?v=7";

const PLACE_KEY = "firecloud:place:v1";
const FAVORITES_KEY = "firecloud:favorites:v1";
const DATA_KEY = "firecloud:data:v1";
const CACHE_MAX_AGE = 12 * 60 * 60 * 1000;
const CACHE_LIMIT = 16;
const $ = (id) => document.getElementById(id);
const panels = ["welcome", "loading", "ready", "error"];
createWeatherFx($("weather-canvas"), {
  contactCanvas: $("weather-contact-canvas")
});
const elements = {
  themeColor: $("theme-color"), placeName: $("place-name"), openPlaces: $("open-places"),
  favorite: $("favorite-button"), refresh: $("refresh-button"), locate: $("locate-button"),
  welcomeSearch: $("welcome-search"), geoNotice: $("geo-notice"), loadingText: $("loading-text"),
  tabs: [$("tab-sunset"), $("tab-sunrise")], eventTime: $("event-time"), eventDate: $("event-date"),
  score: $("score"), band: $("band"), verdict: $("verdict"), countdown: $("countdown"),
  source: $("data-source"), updated: $("updated-at"), reasons: $("reasons"), week: $("week"),
  errorTitle: $("error-title"), errorText: $("error-text"), retry: $("retry-button"), errorSearch: $("error-search"),
  dialog: $("places-dialog"), dialogLocate: $("dialog-locate"), search: $("city-search"),
  searchStatus: $("search-status"), searchSpinner: $("search-spinner"), searchResults: $("search-results"),
  favoritesList: $("favorites-list"), favoritesEmpty: $("favorites-empty"),
  metrics: {
    low: $("metric-low"), mid: $("metric-mid"), high: $("metric-high"), pathLow: $("metric-path"),
    vis: $("metric-vis"), rh: $("metric-rh"), aod: $("metric-aod")
  }
};

const storage = {
  get(key, fallback = null) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private browsing */ }
  }
};

const state = {
  place: null,
  bundle: null,
  event: "sunset",
  stale: false,
  favorites: normalizeFavorites(storage.get(FAVORITES_KEY, [])),
  ticker: null,
  loadRequestId: 0,
  locateRequestId: 0
};

function normalizePlace(place) {
  if (!place || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lon))) return null;
  return { name: String(place.name || "未命名地点"), lat: Number(place.lat), lon: Number(place.lon) };
}

function normalizeFavorites(favorites) {
  if (!Array.isArray(favorites)) return [];
  const seen = new Set();
  return favorites.map(normalizePlace).filter((place) => {
    if (!place) return false;
    const key = placeIdentity(place);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function placeIdentity(place) {
  return `${place.lat.toFixed(4)},${place.lon.toFixed(4)}`;
}

function cacheKey(place, eventType) {
  return `${place.lat.toFixed(2)},${place.lon.toFixed(2)}:${eventType}`;
}

function readValidCache(place, eventType) {
  const entries = storage.get(DATA_KEY, {});
  const entry = entries?.[cacheKey(place, eventType)];
  if (!entry || !entry.bundle || !Number.isFinite(entry.savedAt)) return null;
  const age = Date.now() - entry.savedAt;
  if (age < 0 || age > CACHE_MAX_AGE) return null;
  return { bundle: entry.bundle, age };
}

function writeCache(bundle) {
  const entries = storage.get(DATA_KEY, {});
  entries[cacheKey(bundle.place, bundle.eventType)] = { bundle, savedAt: Date.now() };
  const newest = Object.entries(entries)
    .sort(([, a], [, b]) => (b.savedAt ?? 0) - (a.savedAt ?? 0))
    .slice(0, CACHE_LIMIT);
  storage.set(DATA_KEY, Object.fromEntries(newest));
}

function setPanel(name) {
  if (name !== "ready") stopTicker();
  document.body.dataset.state = name;
  for (const panel of panels) $(`panel-${panel}`).hidden = panel !== name;
  const ready = name === "ready";
  elements.favorite.hidden = !ready;
  elements.refresh.hidden = !ready;
}

function setBusy(busy) {
  elements.refresh.disabled = busy;
  elements.refresh.classList.toggle("spin", busy);
  for (const tab of elements.tabs) tab.disabled = busy;
}

function localTimeZone(bundle) {
  const timeZone = bundle?.forecasts?.local?.timezone;
  if (typeof timeZone !== "string" || !timeZone) return undefined;
  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone }).format(0);
    return timeZone;
  } catch {
    return undefined;
  }
}

function formatClock(date, timeZone) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  }).format(date);
}

function formatEventDate(date, timeZone) {
  const formatted = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone
  }).format(date);
  return formatted.replace(/(?=周)/, " · ");
}

function formatUpdated(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(timestamp));
}

function formatAge(milliseconds) {
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  return minutes < 60 ? `${minutes} 分钟前` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟前`;
}

function formatCountdown(target) {
  const remaining = target.getTime() - Date.now();
  if (remaining <= 0 && remaining >= -30 * 60_000) return "霞光时刻正在发生";
  if (remaining <= 0) return "等待下一次事件";
  const totalMinutes = Math.floor(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return days ? `还有 ${days} 天 ${hours} 小时` : `还有 ${hours} 小时 ${minutes} 分钟`;
}

function currentEventTime() {
  if (!state.place) return null;
  return nextEvent(state.event, state.place.lat, state.place.lon, new Date());
}

function updateFavoriteButton() {
  const active = Boolean(state.place && state.favorites.some((place) => placeIdentity(place) === placeIdentity(state.place)));
  elements.favorite.classList.toggle("is-active", active);
  elements.favorite.setAttribute("aria-pressed", String(active));
  elements.favorite.setAttribute("aria-label", active ? "取消收藏当前地点" : "收藏当前地点");
}

function setLocationStatus(message) {
  elements.geoNotice.textContent = message;
  elements.searchStatus.textContent = message;
}

function updateTicker(eventTime) {
  stopTicker();
  const tick = () => {
    elements.countdown.textContent = formatCountdown(eventTime);
  };
  tick();
  state.ticker = setInterval(tick, 30_000);
}

function stopTicker() {
  clearInterval(state.ticker);
  state.ticker = null;
}

function displayMetric(element, value, formatter) {
  element.textContent = value == null || !Number.isFinite(value) ? "—" : formatter(value);
}

function tierFor(score) {
  if (score >= 80) return "epic";
  if (score >= 65) return "great";
  if (score >= 35) return "fair";
  return "dull";
}

function twilightWarmthFor(now, { sunrise, sunset, goldenStart, goldenEnd }) {
  if (!sunrise || !sunset) return 0;
  const t = now.getTime();
  const windows = [
    [sunrise.getTime() - 35 * 60_000, (goldenEnd ?? sunrise).getTime() + 25 * 60_000],
    [(goldenStart ?? sunset).getTime() - 25 * 60_000, sunset.getTime() + 35 * 60_000]
  ];
  let warmth = 0;
  for (const [start, end] of windows) {
    if (t < start || t > end || end <= start) continue;
    const mid = (start + end) / 2;
    const half = (end - start) / 2;
    warmth = Math.max(warmth, 1 - Math.abs(t - mid) / half);
  }
  return Math.min(1, Math.max(0, warmth));
}

function applyWeatherBackground(bundle) {
  const now = new Date();
  const current = bundle?.forecasts?.local?.current ?? {};
  const metrics = metricsAt(bundle, now);
  const cloudLayers = [metrics.low, metrics.mid, metrics.high].filter(Number.isFinite);
  const sun = sunTimes(now, state.place.lat, state.place.lon);
  const { sunrise, sunset } = sun;
  const fallbackLight = sunrise && sunset && (now < sunrise || now > sunset) ? "night" : "day";
  const precipitation = current.precipitation ?? metrics.precip;
  const theme = weatherTheme({
    weatherCode: current.weather_code,
    isDay: current.is_day,
    cloudCover: current.cloud_cover ?? (cloudLayers.length ? Math.max(...cloudLayers) : null),
    precipitation,
    snowfall: current.snowfall,
    fallbackLight
  });
  const windSpeed = current.wind_speed_10m;
  const windDirection = current.wind_direction_10m;
  const windGust = current.wind_gusts_10m;
  const pressure = current.pressure_msl;
  const visibility = metrics.vis;
  const storm = stormLevelFor({ windSpeed, windGust, pressure });
  const atmosphereInputs = {
    precipitation,
    snowfall: current.snowfall,
    windSpeed,
    windDirection,
    windGust,
    pressure,
    visibility
  };
  const drive = atmosphereDriveFor({
    weather: theme.weather,
    precipitation,
    snowfall: current.snowfall,
    windSpeed,
    windDirection,
    windGust
  });
  const windStrength = Math.min(1, Math.max(0, Math.max(windSpeed ?? 0, windGust ?? 0) / 100));
  const fogDensity = Number.isFinite(visibility)
    ? Math.min(0.86, Math.max(0.2, 1 - visibility / 20_000))
    : 0.52;
  const precipFogBoost = (theme.weather === "rain" || theme.weather === "thunder")
    && Number.isFinite(visibility) && visibility < 8_000
    ? Math.min(0.85, Math.max(0.15, 1 - visibility / 8_000))
    : 0;
  const twilightWarmth = twilightWarmthFor(now, sun);
  const clearEnergy = clearEnergyFor({
    twilightWarmth,
    tier: document.body.dataset.tier || "great"
  });
  const azimuth = solarAzimuth(now, state.place.lat, state.place.lon);
  const elevation = solarElevation(now, state.place.lat, state.place.lon);
  const sunPos = theme.light === "night"
    ? { x: 78, y: 19, valid: false }
    : sunDiskPosition(azimuth, elevation);
  const atmosphereStyles = {
    "--sun-x": `${sunPos.x.toFixed(1)}%`,
    "--sun-y": `${sunPos.y.toFixed(1)}%`,
    "--sun-elevation": Number.isFinite(elevation) ? elevation.toFixed(2) : "-90",
    "--precip-intensity": drive.precipIntensity.toFixed(3),
    "--fx-density": drive.fxDensity.toFixed(3),
    "--twilight-warmth": twilightWarmth.toFixed(3),
    "--clear-energy": clearEnergy.toFixed(3),
    "--precip-fog-boost": precipFogBoost.toFixed(3),
    "--wind-strength": windStrength.toFixed(3),
    "--wind-direction": `${Number.isFinite(windDirection) ? windDirection : 0}deg`,
    "--wind-motion-add": `${(windStrength * 10).toFixed(2)}vw`,
    "--wind-back-speed-cut": `${(windStrength * 22).toFixed(2)}s`,
    "--wind-front-speed-cut": `${(windStrength * 17).toFixed(2)}s`,
    "--wind-sweep-speed-cut": `${(windStrength * 3.5).toFixed(2)}s`,
    "--fog-density": fogDensity.toFixed(3),
    "--fog-back-opacity": Math.min(0.72, 0.34 + fogDensity * 0.4).toFixed(3),
    "--fog-front-opacity": Math.min(0.74, 0.3 + fogDensity * 0.46).toFixed(3),
    "--fog-back-opacity-reduced": Math.min(0.22, 0.1 + fogDensity * 0.12).toFixed(3),
    "--fog-front-opacity-reduced": Math.min(0.22, 0.08 + fogDensity * 0.14).toFixed(3),
    "--strong-cloud-duration": `${Math.max(9, 16 - windStrength * 5).toFixed(2)}s`,
    "--severe-cloud-duration": `${Math.max(6, 11 - windStrength * 4).toFixed(2)}s`
  };
  document.body.dataset.weather = theme.weather;
  document.body.dataset.light = theme.light;
  document.body.dataset.storm = storm;
  document.body.dataset.windActive = String(Math.max(windSpeed ?? 0, windGust ?? 0) >= 40);
  document.body.dataset.lightning = String(theme.weather === "thunder" || theme.weather === "hail");
  for (const [name, value] of Object.entries(atmosphereStyles)) {
    document.body.style.setProperty(name, value);
  }
  for (const [name, value] of Object.entries(atmosphereInputs)) {
    if (Number.isFinite(value)) document.body.dataset[name] = String(value);
    else delete document.body.dataset[name];
  }
  const skyTop = getComputedStyle(document.body).getPropertyValue("--sky-top").trim();
  if (/^#[\da-f]{6}$/i.test(skyTop)) elements.themeColor.content = skyTop;
}

function updateHorizontalScrollRegions() {
  for (const region of document.querySelectorAll("[data-scroll-region]")) {
    const scroller = region.firstElementChild;
    const canScroll = scroller.scrollWidth > scroller.clientWidth + 1;
    region.classList.toggle("can-scroll", canScroll);
    region.classList.toggle("is-at-end", !canScroll || scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2);
  }
}

for (const region of document.querySelectorAll("[data-scroll-region]")) {
  region.firstElementChild.addEventListener("scroll", () => updateHorizontalScrollRegions(), { passive: true });
}
window.addEventListener("resize", updateHorizontalScrollRegions, { passive: true });

function renderWeek(bundle) {
  elements.week.replaceChildren();
  const base = currentEventTime();
  if (!base) return;
  const timeZone = localTimeZone(bundle);
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone
  });
  for (let day = 0; day < 7; day += 1) {
    const probe = new Date(base.getTime() + day * 86_400_000);
    const eventTime = sunTimes(probe, state.place.lat, state.place.lon)[state.event];
    const card = document.createElement("article");
    card.className = "day-card";
    if (!eventTime) {
      card.innerHTML = `<span>${formatter.format(probe)}</span><strong>—</strong><small>无事件</small>`;
    } else {
      const metrics = metricsAt(bundle, eventTime);
      const score = scoreSky(metrics);
      card.innerHTML = `<span>${formatter.format(eventTime)}</span><strong>${score}</strong><small>${formatClock(eventTime, timeZone)} · ${indexBand(score)}</small>`;
    }
    elements.week.append(card);
  }
  requestAnimationFrame(updateHorizontalScrollRegions);
}

function renderReady(cacheAge = 0) {
  const eventTime = currentEventTime();
  if (!eventTime || !state.bundle) {
    showError("未来三天没有可预测的日出或日落");
    return;
  }
  const metrics = metricsAt(state.bundle, eventTime);
  const score = scoreSky(metrics);
  document.body.dataset.tier = tierFor(score);
  applyWeatherBackground(state.bundle);
  const eventLabel = state.event === "sunset" ? "晚霞" : "朝霞";
  const timeZone = localTimeZone(state.bundle);
  elements.placeName.textContent = state.place.name;
  elements.openPlaces.setAttribute("aria-label", `选择地点，当前地点：${state.place.name}`);
  elements.eventTime.textContent = `${eventLabel} · ${formatClock(eventTime, timeZone)}`;
  elements.eventDate.textContent = `${formatEventDate(eventTime, timeZone)} · ${timeZone ? "地点当地时间" : "设备时间"}`;
  elements.score.textContent = String(score);
  elements.band.textContent = indexBand(score);
  elements.verdict.textContent = waitAdvice(score);
  elements.source.textContent = state.stale ? "缓存数据" : "实时数据";
  elements.updated.textContent = state.stale ? `缓存于 ${formatAge(cacheAge)}` : `更新于 ${formatUpdated(state.bundle.fetchedAt)}`;
  elements.reasons.replaceChildren(...reasonsFor(metrics).map((reason) => {
    const chip = document.createElement("span");
    chip.textContent = reason;
    return chip;
  }));
  displayMetric(elements.metrics.low, metrics.low, (value) => `${Math.round(value)}%`);
  displayMetric(elements.metrics.mid, metrics.mid, (value) => `${Math.round(value)}%`);
  displayMetric(elements.metrics.high, metrics.high, (value) => `${Math.round(value)}%`);
  displayMetric(elements.metrics.pathLow, metrics.pathLow, (value) => `${Math.round(value)}%`);
  displayMetric(elements.metrics.vis, metrics.vis, (value) => `${Math.round(value / 1000)} km`);
  displayMetric(elements.metrics.rh, metrics.rh, (value) => `${Math.round(value)}%`);
  displayMetric(elements.metrics.aod, metrics.aod, (value) => value.toFixed(2));
  for (const tab of elements.tabs) tab.setAttribute("aria-pressed", String(tab.dataset.event === state.event));
  updateFavoriteButton();
  renderWeek(state.bundle);
  updateTicker(eventTime);
  setPanel("ready");
}

function showError(message) {
  setBusy(false);
  elements.errorText.textContent = message;
  setPanel("error");
  queueMicrotask(() => elements.errorTitle.focus({ preventScroll: true }));
}

async function loadPlace(place, { preferCache = false, force = false } = {}) {
  const requestId = ++state.loadRequestId;
  const normalized = normalizePlace(place);
  if (!normalized) return showError("地点信息无效，请重新搜索");
  const eventType = state.event;
  state.place = normalized;
  storage.set(PLACE_KEY, normalized);
  elements.placeName.textContent = normalized.name;
  elements.openPlaces.setAttribute("aria-label", `选择地点，当前地点：${normalized.name}`);
  const cached = readValidCache(normalized, eventType);
  if (!force && preferCache && cached) {
    state.bundle = cached.bundle;
    state.stale = true;
    setBusy(false);
    renderReady(cached.age);
    return;
  }
  const eventTime = nextEvent(eventType, normalized.lat, normalized.lon, new Date());
  if (!eventTime) return showError("未来三天没有可预测的日出或日落");
  setPanel("loading");
  setBusy(true);
  elements.loadingText.textContent = `正在计算${eventType === "sunset" ? "晚霞" : "朝霞"}方向的云层…`;
  try {
    const bundle = await fetchForecastBundle(normalized, eventType, eventTime);
    if (requestId !== state.loadRequestId) return;
    state.bundle = bundle;
    state.stale = false;
    writeCache(bundle);
    renderReady();
  } catch (error) {
    if (requestId !== state.loadRequestId) return;
    const fallback = readValidCache(normalized, eventType);
    if (fallback) {
      state.bundle = fallback.bundle;
      state.stale = true;
      renderReady(fallback.age);
    } else {
      console.error(error);
      showError("暂无可用预测，请稍后重试");
    }
  } finally {
    if (requestId === state.loadRequestId) setBusy(false);
  }
}

function openPlaces() {
  renderFavorites();
  if (!elements.dialog.open) elements.dialog.showModal();
}

async function locate() {
  const requestId = ++state.locateRequestId;
  if (!navigator.geolocation) {
    setLocationStatus("无法获取位置，请搜索城市");
    openPlaces();
    elements.search.focus();
    return;
  }
  setLocationStatus("正在定位…");
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    if (requestId !== state.locateRequestId) return;
    const point = { lat: coords.latitude, lon: coords.longitude };
    let place = { ...point, name: "当前位置" };
    try { place = await reverseGeocode(point); } catch { /* location remains usable */ }
    if (requestId !== state.locateRequestId) return;
    setLocationStatus("");
    clearSearch();
    if (elements.dialog.open) elements.dialog.close();
    loadPlace(place);
  }, () => {
    if (requestId !== state.locateRequestId) return;
    setLocationStatus("无法获取位置，请搜索城市");
    openPlaces();
    elements.search.focus();
  }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 });
}

let searchTimer;
let searchRequestId = 0;

function clearSearch() {
  searchRequestId += 1;
  clearTimeout(searchTimer);
  elements.search.value = "";
  elements.search.removeAttribute("aria-busy");
  elements.searchResults.removeAttribute("aria-busy");
  elements.searchSpinner.hidden = true;
  elements.searchStatus.textContent = "";
  elements.searchResults.replaceChildren();
}

function choosePlace(place) {
  state.locateRequestId += 1;
  clearSearch();
  elements.dialog.close();
  loadPlace(place);
}

function renderSearchResults(results) {
  elements.searchResults.replaceChildren(...results.map((place) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    const name = document.createElement("strong");
    name.textContent = place.name;
    const detail = document.createElement("small");
    detail.textContent = place.detail || "";
    button.append(name, detail);
    button.addEventListener("click", () => choosePlace(place));
    item.append(button);
    return item;
  }));
}

elements.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const requestId = ++searchRequestId;
  const query = elements.search.value.trim();
  if (query.length < 2) {
    elements.searchResults.replaceChildren();
    elements.searchStatus.textContent = "";
    elements.searchSpinner.hidden = true;
    elements.search.removeAttribute("aria-busy");
    elements.searchResults.removeAttribute("aria-busy");
    return;
  }
  searchTimer = setTimeout(async () => {
    elements.searchSpinner.hidden = false;
    elements.search.setAttribute("aria-busy", "true");
    elements.searchResults.setAttribute("aria-busy", "true");
    elements.searchStatus.textContent = "正在搜索…";
    try {
      const results = await searchCities(query);
      if (requestId !== searchRequestId) return;
      renderSearchResults(results);
      elements.searchStatus.textContent = results.length ? `找到 ${results.length} 个地点` : "没有找到匹配城市";
    } catch {
      if (requestId !== searchRequestId) return;
      elements.searchResults.replaceChildren();
      elements.searchStatus.textContent = "城市搜索暂不可用";
    } finally {
      if (requestId === searchRequestId) {
        elements.searchSpinner.hidden = true;
        elements.search.removeAttribute("aria-busy");
        elements.searchResults.removeAttribute("aria-busy");
      }
    }
  }, 300);
});

function renderFavorites() {
  elements.favoritesList.replaceChildren(...state.favorites.map((place) => {
    const item = document.createElement("li");
    item.className = "favorite-row";
    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "favorite-place";
    choose.textContent = place.name;
    choose.addEventListener("click", () => choosePlace(place));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-favorite";
    remove.setAttribute("aria-label", `删除收藏 ${place.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      state.favorites = state.favorites.filter((candidate) => placeIdentity(candidate) !== placeIdentity(place));
      storage.set(FAVORITES_KEY, state.favorites);
      renderFavorites();
      updateFavoriteButton();
    });
    item.append(choose, remove);
    return item;
  }));
  elements.favoritesEmpty.hidden = state.favorites.length > 0;
}

function toggleFavorite() {
  if (!state.place) return;
  const identity = placeIdentity(state.place);
  const index = state.favorites.findIndex((place) => placeIdentity(place) === identity);
  if (index >= 0) {
    state.favorites.splice(index, 1);
  } else {
    if (state.favorites.length >= 8) {
      setLocationStatus("最多收藏 8 个地点");
      openPlaces();
      return;
    }
    state.favorites.push({ ...state.place });
  }
  storage.set(FAVORITES_KEY, state.favorites);
  updateFavoriteButton();
  renderFavorites();
}

elements.openPlaces.addEventListener("click", openPlaces);
elements.welcomeSearch.addEventListener("click", () => { openPlaces(); elements.search.focus(); });
elements.errorSearch.addEventListener("click", () => { openPlaces(); elements.search.focus(); });
elements.locate.addEventListener("click", locate);
elements.dialogLocate.addEventListener("click", locate);
elements.favorite.addEventListener("click", toggleFavorite);
elements.refresh.addEventListener("click", () => state.place && loadPlace(state.place, { force: true }));
elements.retry.addEventListener("click", () => state.place ? loadPlace(state.place, { force: true }) : openPlaces());
for (const tab of elements.tabs) {
  tab.addEventListener("click", () => {
    if (tab.dataset.event === state.event || !state.place) return;
    state.event = tab.dataset.event;
    loadPlace(state.place, { preferCache: true });
  });
}

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));

renderFavorites();
const lastPlace = normalizePlace(storage.get(PLACE_KEY));
if (lastPlace) loadPlace(lastPlace);
else setPanel("welcome");
