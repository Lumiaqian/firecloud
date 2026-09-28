import { fetchForecastBundle, reverseGeocode, searchCities } from "./api.mjs?v=8";
import {
  indexBand,
  lightFromSunClock,
  metricsAt,
  nextEvent,
  reasonsFor,
  scoreSky,
  solarAzimuth,
  solarElevation,
  stormLevelFor,
  sunDiskPosition,
  moonDiskPosition,
  lunarPhase,
  buildMoonSvg,
  sunTimes,
  waitAdvice,
  weatherConditionFor,
  weatherTheme
} from "./forecast.mjs?v=8";
import { atmosphereDriveFor, clearEnergyFor, createWeatherFx } from "./weather-fx.mjs?v=9";
import { createJournalWeatherEngine } from "./journal-weather-engine.mjs?v=2";

const PLACE_KEY = "firecloud:place:v1";
const FAVORITES_KEY = "firecloud:favorites:v1";
const DATA_KEY = "firecloud:data:v1";
const CACHE_MAX_AGE = 12 * 60 * 60 * 1000;
const CACHE_LIMIT = 16;
const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
document.addEventListener("pointerdown", () => { document.body.dataset.input = "pointer"; }, true);
document.addEventListener("keydown", () => { document.body.dataset.input = "keyboard"; }, true);
function motionAllowed() {
  return !reducedMotion.matches && document.body.dataset.input !== "keyboard";
}
function triggerHaptic(pattern = 10) {
  if (navigator.vibrate && motionAllowed()) {
    try { navigator.vibrate(pattern); } catch {}
  }
}
function fadeUpdate(element) {
  if (!motionAllowed() || !element) return;
  element.getAnimations().forEach((animation) => animation.cancel());
  element.animate([
    { opacity: 0.45, filter: "blur(1.5px)", transform: "translateY(3px)" },
    { opacity: 1, filter: "blur(0)", transform: "translateY(0)" }
  ], {
    duration: 200, easing: "cubic-bezier(0.23, 1, 0.32, 1)"
  });
}
function syncEventTabs() {
  for (const tab of elements.tabs) tab.setAttribute("aria-pressed", String(tab.dataset.event === state.event));
}
const panels = ["welcome", "loading", "ready", "error"];
createWeatherFx($("weather-canvas"), {
  contactCanvas: $("weather-contact-canvas")
});
const journalWeather = createJournalWeatherEngine(
  $("weather-background-canvas"),
  $("weather-foreground-canvas")
);

// 绑定黄铜夹与朱砂印章自然微物理触控
$("hero-brass-clip")?.addEventListener("click", () => {
  triggerHaptic([15, 30, 20]);
  journalWeather?.triggerLightningStrike("clip");
});
$("hero-brass-clip")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    triggerHaptic([15, 30, 20]);
    journalWeather?.triggerLightningStrike("clip");
  }
});
$("seal-stamp")?.addEventListener("click", () => {
  triggerHaptic(25);
  journalWeather?.triggerSunWarm();
});
$("seal-stamp")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    triggerHaptic(25);
    journalWeather?.triggerSunWarm();
  }
});

// 手帐主体卡片物理微倾动效 (Subtle 3D Physics Tilt)
const heroMasterCard = $("hero-master-card");
if (heroMasterCard) {
  let tiltRaf = 0;
  heroMasterCard.addEventListener("mousemove", (e) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(tiltRaf);
    tiltRaf = requestAnimationFrame(() => {
      const rect = heroMasterCard.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotX = -(y / (rect.height / 2)) * 1.5;
      const rotY = (x / (rect.width / 2)) * 2.0;
      heroMasterCard.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(-0.35deg) translateY(-2px)`;
    });
  });
  heroMasterCard.addEventListener("mouseleave", () => {
    cancelAnimationFrame(tiltRaf);
    heroMasterCard.style.transform = "";
  });
}

const elements = {
  themeColor: $("theme-color"), placeName: $("place-name"), openPlaces: $("open-places"),
  favorite: $("favorite-button"), refresh: $("refresh-button"), locate: $("locate-button"),
  welcomeSearch: $("welcome-search"), geoNotice: $("geo-notice"), loadingText: $("loading-text"),
  loaderStage: $("loader-stage"), devDialog: $("dev-lab-dialog"), devPreviewStage: $("dev-preview-stage"),
  devLensSlider: $("dev-lens-slider"),
  devBtnTestLoading: $("dev-btn-test-loading"), devBtnSaveDefault: $("dev-btn-save-default"),
  devBtnToggleNight: $("dev-btn-toggle-night"), devMoonSlider: $("dev-moon-slider"),
  skyMoon: $("sky-moon"), skyMoonDisk: $("sky-moon-disk"), skyMoonHalo: $("sky-moon-halo"),
  heroLunarBadge: $("hero-lunar-badge"), lunarBadgeIcon: $("lunar-badge-icon"), lunarBadgeText: $("lunar-badge-text"),
  lunarDialog: $("lunar-dialog"), lunarDialogMoon: $("lunar-dialog-moon"), lunarDialogName: $("lunar-dialog-name"),
  lunarDialogDate: $("lunar-dialog-date"), lunarCellFraction: $("lunar-cell-fraction"), lunarCellAge: $("lunar-cell-age"),
  lunarCellAlt: $("lunar-cell-alt"), lunarCellAz: $("lunar-cell-az"), lunarDialogAdvice: $("lunar-dialog-advice"),
  tabs: [$("tab-sunset"), $("tab-sunrise")], eventTime: $("event-time"), eventDate: $("event-date"),
  heroTimeSub: $("hero-time-sub"), entryTag: $("entry-tag"), sealStamp: $("seal-stamp"),
  sealGrade: $("seal-grade"), sealSub: $("seal-sub"), brassClip: $("hero-brass-clip"),
  score: $("score"), band: $("band"), verdict: $("verdict"), countdown: $("countdown"),
  status: $("forecast-status"), source: $("data-source"), updated: $("updated-at"), reasons: $("reasons"), week: $("week"),
  errorTitle: $("error-title"), errorText: $("error-text"), retry: $("retry-button"), errorSearch: $("error-search"),
  dialog: $("places-dialog"), dialogLocate: $("dialog-locate"), search: $("city-search"),
  searchStatus: $("search-status"), searchSpinner: $("search-spinner"), searchResults: $("search-results"),
  favoritesList: $("favorites-list"), favoritesEmpty: $("favorites-empty"),
  favoriteFeedback: $("favorite-feedback"), favoriteMessage: $("favorite-message"), undoFavorite: $("undo-favorite"),
  dialogFavoriteFeedback: $("dialog-favorite-feedback"), dialogFavoriteMessage: $("dialog-favorite-message"),
  dialogUndoFavorite: $("dialog-undo-favorite"),
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
  refreshing: false,
  refreshFailed: false,
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
  if (name === "loading") {
    elements.source.textContent = "更新中";
    elements.source.dataset.status = "loading";
  }
  if (name === "welcome") {
    syncWelcomeJournal();
  }
  for (const panel of panels) $(`panel-${panel}`).hidden = panel !== name;
  const ready = name === "ready";
  elements.favorite.hidden = !ready;
  elements.refresh.hidden = !ready;
}

function setBusy(busy) {
  elements.refresh.classList.toggle("spin", busy);
  elements.refresh.setAttribute("aria-busy", String(busy));
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

function formatUpdated(timestamp, timeZone) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone
  }).format(new Date(timestamp));
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
  if (days) {
    return hours ? `还有 ${days} 天 ${hours} 小时` : `还有 ${days} 天`;
  }
  if (hours) {
    return minutes ? `还有 ${hours} 小时 ${minutes} 分钟` : `还有 ${hours} 小时`;
  }
  return `还有 ${minutes} 分钟`;
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
    if (state.bundle && state.place) applyWeatherBackground(state.bundle);
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

function hasLocalCloudForecast(metrics) {
  return Number.isFinite(metrics.low) && Number.isFinite(metrics.mid) && Number.isFinite(metrics.high);
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
  const apiLight = current.is_day === 0 ? "night" : current.is_day === 1 ? "day" : "day";
  const light = lightFromSunClock(now, sun, apiLight);
  const precipitation = current.precipitation ?? metrics.precip;
  const theme = weatherTheme({
    weatherCode: current.weather_code,
    isDay: light === "night" ? 0 : 1,
    cloudCover: current.cloud_cover ?? (cloudLayers.length ? Math.max(...cloudLayers) : null),
    precipitation,
    snowfall: current.snowfall,
    fallbackLight: light
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
    light: theme.light,
    storm,
    precipitation,
    snowfall: current.snowfall,
    windSpeed,
    windDirection,
    windGust,
    visibility
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

  // 天体月相计算 (Lunar Phase & Horizon Coordinates)
  const moon = lunarPhase(now, state.place.lat, state.place.lon);
  const moonPos = moon.disk;

  const atmosphereStyles = {
    "--sun-x": `${sunPos.x.toFixed(1)}%`,
    "--sun-y": `${sunPos.y.toFixed(1)}%`,
    "--sun-elevation": Number.isFinite(elevation) ? elevation.toFixed(2) : "-90",
    "--moon-x": `${moonPos.x.toFixed(1)}%`,
    "--moon-y": `${moonPos.y.toFixed(1)}%`,
    "--moon-elevation": `${moon.altitude.toFixed(2)}`,
    "--moon-illumination": `${moon.phaseFraction.toFixed(3)}`,
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
  try {
    storage.set("firecloud:theme:v1", {
      light: theme.light,
      weather: theme.weather,
      storm,
      tier: document.body.dataset.tier || "great",
      skyTop,
      skyMid: getComputedStyle(document.body).getPropertyValue("--sky-mid").trim(),
      skyHorizon: getComputedStyle(document.body).getPropertyValue("--sky-horizon").trim()
    });
  } catch {}
  const condition = weatherConditionFor({
    weather: theme.weather,
    weatherCode: current.weather_code,
    isDay: theme.light === "night" ? 0 : 1,
    precipitation,
    cloudCover: current.cloud_cover ?? (cloudLayers.length ? Math.max(...cloudLayers) : null),
    temperature: current.temperature_2m
  });

  // 联动手帐主体卡片气象微物理状态 (Auto-sync stationery weather physics)
  journalWeather?.syncWeatherConditions({
    weather: theme.weather,
    windSpeed: Number(windSpeed) || 0,
    windGust: Number(windGust) || 0,
    cloudCover: Number(current.cloud_cover) || 0,
    precipitation: Number(precipitation) || 0,
    isDay: theme.light !== "night"
  });

  // 联动天幕与手札夜间真实月相渲染 (Update celestial moon & stationery lunar badge)
  updateMoonDisplay(moon);

  return { theme, condition };
}

function updateMoonDisplay(moon) {
  if (!moon) return;
  // 1. 天幕月亮真实矢量渲染与月晕缩放
  if (elements.skyMoonDisk) {
    elements.skyMoonDisk.innerHTML = buildMoonSvg(moon.phaseFraction, moon.isWaxing, 76, "sky");
  }
  if (elements.skyMoonHalo) {
    elements.skyMoonHalo.style.transform = `scale(${(0.7 + moon.phaseFraction * 0.6).toFixed(2)})`;
    elements.skyMoonHalo.style.opacity = (0.25 + moon.phaseFraction * 0.5).toFixed(2);
  }

  // 2. 主手札便签月相微徽章
  if (elements.lunarBadgeIcon) {
    elements.lunarBadgeIcon.innerHTML = buildMoonSvg(moon.phaseFraction, moon.isWaxing, 15, "badge");
  }
  if (elements.lunarBadgeText) {
    const pct = Math.round(moon.phaseFraction * 100);
    elements.lunarBadgeText.textContent = `${moon.lunarDate} · ${moon.phaseName} ${pct}%`;
  }

  // 3. 夜间月相天文观测详情弹窗填充
  if (elements.lunarDialogMoon) {
    elements.lunarDialogMoon.innerHTML = buildMoonSvg(moon.phaseFraction, moon.isWaxing, 96, "dialog");
  }
  if (elements.lunarDialogName) {
    elements.lunarDialogName.textContent = moon.phaseName;
  }
  if (elements.lunarDialogDate) {
    elements.lunarDialogDate.textContent = `${moon.lunarDate} · 日月距角 ${moon.elongation.toFixed(1)}°`;
  }
  if (elements.lunarCellFraction) {
    elements.lunarCellFraction.textContent = `${(moon.phaseFraction * 100).toFixed(1)}%`;
  }
  if (elements.lunarCellAge) {
    elements.lunarCellAge.textContent = `${moon.moonAge.toFixed(1)} 天`;
  }
  if (elements.lunarCellAlt) {
    elements.lunarCellAlt.textContent = `${moon.altitude.toFixed(1)}° (${moon.isAboveHorizon ? "地平线上" : "已入地平"})`;
  }
  if (elements.lunarCellAz) {
    elements.lunarCellAz.textContent = `${moon.azimuth.toFixed(1)}°`;
  }
  if (elements.lunarDialogAdvice) {
    if (moon.phaseFraction >= 0.9) {
      elements.lunarDialogAdvice.textContent = "今宵月相趋满，银辉满天，适宜长焦拍摄地景接月或赏月夜景。";
    } else if (moon.phaseFraction >= 0.4) {
      elements.lunarDialogAdvice.textContent = "晨昏分界明显，月球环形山与月海暗影极具立体层次，适宜天文望远镜观测。";
    } else if (moon.phaseFraction >= 0.05) {
      elements.lunarDialogAdvice.textContent = "月如银钩，伴有地照微光（达芬奇辉光），极宜在暮光余晖初垂时与地景同框记录。";
    } else {
      elements.lunarDialogAdvice.textContent = "新月朔日，月隐星繁，天幕背景无月光干扰，极宜观测深空天体与拍摄银河暗夜。";
    }
  }
}

function updateHorizontalScrollRegions() {
  for (const region of document.querySelectorAll("[data-scroll-region]")) {
    const scroller = region.firstElementChild;
    const canScroll = scroller.scrollWidth > scroller.clientWidth + 1;
    const isAtStart = scroller.scrollLeft <= 2;
    const isAtEnd = !canScroll || scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
    region.classList.toggle("can-scroll", canScroll);
    region.classList.toggle("is-at-start", isAtStart);
    region.classList.toggle("is-at-end", isAtEnd);
  }
}

for (const region of document.querySelectorAll("[data-scroll-region]")) {
  region.firstElementChild.addEventListener("scroll", () => updateHorizontalScrollRegions(), { passive: true });
}
window.addEventListener("resize", updateHorizontalScrollRegions, { passive: true });

function weatherSymbolFor(metrics) {
  const precip = metrics.precip ?? 0;
  const low = metrics.low ?? 0;
  const high = metrics.high ?? 0;
  const mid = metrics.mid ?? 0;
  if (precip > 0.5) return "🌧️";
  if (low > 60) return "☁️";
  if (high > 60) return "🌤️";
  if (high + mid > 40) return "⛅";
  return "☀️";
}

function photographicAdviceFor(metrics, score, eventType) {
  if (metrics.precip != null && metrics.precip > 0.2) return "降水与低层云层遮蔽光路，观测受限";
  if (score >= 80) return "高云透光且地平线光路良好，建议提前选好机位守候";
  if (score >= 65) return "中高云分层丰富，地平线光路良好，适宜摄影取景";
  if (score >= 45) return eventType === "sunrise" ? "有柔和晨光漫射，可记录层次渐变天色" : "有柔和暮光漫射，可记录层次渐变天色";
  if ((metrics.low ?? 0) > 50) return `本地低层云偏厚压制，${eventType === "sunrise" ? "朝霞" : "晚霞"}显现几率偏低`;
  return "云层染色条件不足，整体天色趋于平淡";
}

function renderWeek(bundle) {
  const previous = [...elements.week.children];
  let cardIndex = 0;
  const appendCard = (card) => {
    const old = previous[cardIndex++];
    if (!old) elements.week.append(card);
    else if (old.innerHTML !== card.innerHTML || old.dataset.tier !== card.dataset.tier) {
      card.dataset.updated = "true";
      old.replaceWith(card);
      fadeUpdate(card);
    }
  };
  const base = currentEventTime();
  if (!base) return;
  const timeZone = localTimeZone(bundle);
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone
  });
  const eventLabel = state.event === "sunset" ? "日落" : "日出";

  for (let day = 0; day < 7; day += 1) {
    const probe = new Date(base.getTime() + day * 86_400_000);
    const eventTime = sunTimes(probe, state.place.lat, state.place.lon)[state.event];
    const card = document.createElement("article");
    card.className = "day-card day-journal-card";
    card.style.setProperty("--day-idx", String(day));
    if (day === 0) card.classList.add("is-active-day");

    if (!eventTime) {
      card.dataset.tier = "unavailable";
      card.dataset.grade = "dull";
      card.innerHTML = `
        <div class="day-card-perfs"><i></i><i></i><i></i><i></i></div>
        <div class="day-date-row">
          <span class="day-card-date">${formatter.format(probe)}</span>
          <span class="day-mini-seal">无事件</span>
        </div>
        <div class="day-card-watercolor"></div>
        <div class="day-score-block">
          <span class="day-score-num">—</span>
          <div class="day-score-tag">
            <span>极昼或无事件</span>
          </div>
        </div>
        <p class="day-tip-line">当前纬度此日期无对应晨昏事件</p>
      `;
    } else {
      const metrics = metricsAt(bundle, eventTime);
      if (!hasLocalCloudForecast(metrics)) {
        card.dataset.tier = "unavailable";
        card.dataset.grade = "dull";
        card.innerHTML = `
          <div class="day-card-perfs"><i></i><i></i><i></i><i></i></div>
          <div class="day-date-row">
            <span class="day-card-date">${formatter.format(eventTime)}</span>
            <span class="day-mini-seal">暂无</span>
          </div>
          <div class="day-card-watercolor"></div>
          <div class="day-score-block">
            <span class="day-score-num">—</span>
            <div class="day-score-tag">
              <span>暂无预报</span>
            </div>
          </div>
          <p class="day-tip-line">当地云层预报暂无数据</p>
        `;
        appendCard(card);
        continue;
      }
      const score = scoreSky(metrics);
      const tier = tierFor(score);
      const advice = photographicAdviceFor(metrics, score, state.event);
      const formattedDate = formatter.format(eventTime);

      let miniSeal = "微茫";
      if (score >= 85) miniSeal = "紫金";
      else if (score >= 70) miniSeal = "晴金";
      else if (score >= 50) miniSeal = "柔光";
      else if (score >= 30) miniSeal = "休整";

      card.dataset.tier = tier;
      card.dataset.grade = tier;
      if (typeof metrics.precip === "number" && metrics.precip > 0.05) {
        card.classList.add("is-rain-damp");
      }
      card.innerHTML = `
        <div class="day-card-perfs"><i></i><i></i><i></i><i></i></div>
        <div class="day-date-row">
          <span class="day-card-date">${formattedDate}</span>
          <span class="day-mini-seal">${miniSeal}</span>
        </div>
        <div class="day-card-watercolor"></div>
        <div class="day-score-block">
          <span class="day-score-num">${score}</span>
          <div class="day-score-tag">
            <span>${indexBand(score)}</span>
            <small style="font-family:var(--font-mono);font-size:10px;color:#8c7b6a;">${formatClock(eventTime, timeZone)}</small>
          </div>
        </div>
        <p class="day-tip-line">${advice}</p>
      `;

      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `${formattedDate} ${eventLabel}，霞光指数 ${score}分，${miniSeal}，${advice}`);
      const selectCard = () => {
        triggerHaptic(12);
        elements.week.querySelectorAll(".day-journal-card").forEach(c => c.classList.remove("is-active-day"));
        card.classList.add("is-active-day");
        const targets = [elements.eventTime, elements.entryTag, elements.score, elements.verdict, elements.sealGrade, elements.sealSub];
        targets.forEach(el => el && fadeUpdate(el));
        // 联动更新 Hero 主卡片展示该日预报
        if (elements.eventTime) {
          const clock = formatClock(eventTime, timeZone);
          elements.eventTime.innerHTML = `${clock} <small id="hero-time-sub">${eventLabel} · 最佳摄影视窗</small>`;
        }
        if (elements.entryTag) {
          elements.entryTag.textContent = `${formattedDate} · ${eventLabel}观测手记`;
        }
        if (elements.score) elements.score.textContent = String(score);
        if (elements.verdict) elements.verdict.textContent = `“${advice}”`;
        if (elements.sealGrade) elements.sealGrade.textContent = miniSeal;
        if (elements.sealSub) elements.sealSub.textContent = score >= 70 ? "极力推荐" : "宜静候";
        document.body.dataset.tier = tier;

        // 若所选预测日有降雨，主卡片也呈现湿润浸染状态
        if (typeof metrics.precip === "number" && metrics.precip > 0.05) {
          journalWeather?.triggerRainSoak();
        } else if (state.theme?.weather !== "rain" && state.theme?.weather !== "thunder") {
          journalWeather?.restoreDryCard();
        }
      };

      card.addEventListener("click", selectCard);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectCard();
        }
      });
    }
    appendCard(card);
  }
  requestAnimationFrame(updateHorizontalScrollRegions);
}

function updateSourceStatus() {
  elements.source.textContent = state.refreshing ? "更新中" : state.refreshFailed ? "更新失败 · 显示上次数据" : state.stale ? "缓存数据" : "实时数据";
  elements.source.dataset.status = state.refreshing ? "loading" : state.refreshFailed ? "error" : state.stale ? "stale" : "live";
}

function announceReady() {
  const eventLabel = state.event === "sunset" ? "晚霞" : "朝霞";
  const freshness = state.refreshFailed ? "更新失败，显示上次数据（非最新）" : state.stale ? "缓存数据（非最新）" : "实时数据";
  elements.status.textContent = `${state.place.name}，${eventLabel}，霞光指数 ${elements.score.textContent}，${freshness}`;
}

function focusNewResult() {
  if (!elements.dialog.open && !elements.devDialog.open) elements.eventTime.focus({ preventScroll: true });
}

function renderReady(cacheAge = 0) {
  const eventTime = currentEventTime();
  if (!eventTime) {
    showError("未来三天没有可预测的日出或日落");
    return false;
  }
  if (!state.bundle) {
    showError("暂无可用预测，请稍后重试");
    return false;
  }
  const metrics = metricsAt(state.bundle, eventTime);
  if (!hasLocalCloudForecast(metrics)) {
    showError("当前时刻缺少当地低、中、高云层预报，无法计算霞光指数。请稍后重试或选择其他地点");
    return false;
  }
  const wasReady = document.body.dataset.state === "ready";
  const changing = [elements.eventTime, elements.eventDate, elements.score, elements.band,
    elements.verdict, elements.reasons, ...Object.values(elements.metrics)];
  const previousText = changing.map((element) => element.textContent);
  const score = scoreSky(metrics);
  document.body.dataset.tier = tierFor(score);
  const { condition } = applyWeatherBackground(state.bundle) ?? {};
  const eventLabel = state.event === "sunset" ? "晚霞" : "朝霞";
  const timeZone = localTimeZone(state.bundle);
  const conditionSuffix = condition?.summary ? ` · ${condition.summary}` : "";
  elements.placeName.textContent = `${state.place.name}${conditionSuffix}`;
  elements.openPlaces.setAttribute(
    "aria-label",
    `霞光预报 - 选择地点，当前地点：${state.place.name}${condition?.summary ? `，当前天气：${condition.summary}` : ""}`
  );
  const clockStr = formatClock(eventTime, timeZone);
  elements.eventTime.innerHTML = `${clockStr} <small id="hero-time-sub">${eventLabel} · 最佳视窗</small>`;
  elements.eventDate.textContent = `${formatEventDate(eventTime, timeZone)} · ${timeZone ? "地点当地时间" : "设备时间"}`;
  if (elements.entryTag) {
    elements.entryTag.textContent = `${formatEventDate(eventTime, timeZone)} · ${eventLabel}观测手记`;
  }
  delete document.body.dataset.switching;
  $("event-pending").hidden = true;
  elements.score.textContent = String(score);
  if (!wasReady) elements.week.replaceChildren();
  elements.band.textContent = indexBand(score);

  // 朱砂印章研判与手记建议
  let sealText = "微茫";
  let sealSub = "宜煮茶";
  if (score >= 85) { sealText = "紫金"; sealSub = "旷世绝景"; }
  else if (score >= 70) { sealText = "晴金"; sealSub = "极力推荐"; }
  else if (score >= 50) { sealText = "柔光"; sealSub = "值得驻足"; }
  else if (score >= 30) { sealText = "休整"; sealSub = "不宜蹲守"; }

  if (elements.sealGrade) elements.sealGrade.textContent = sealText;
  if (elements.sealSub) elements.sealSub.textContent = sealSub;

  const adviceText = photographicAdviceFor(metrics, score, state.event);
  elements.verdict.textContent = `“${adviceText}”`;
  updateSourceStatus();
  elements.updated.textContent = state.stale ? `缓存于 ${formatAge(cacheAge)}` : `更新于 ${formatUpdated(state.bundle.fetchedAt, timeZone)}`;
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
  syncEventTabs();
  updateFavoriteButton();
  renderWeek(state.bundle);
  updateTicker(eventTime);
  setPanel("ready");
  if (wasReady) changing.forEach((element, index) => {
    if (element.textContent !== previousText[index]) fadeUpdate(element);
  });
  return true;
}

function showError(message) {
  setBusy(false);
  delete document.body.dataset.switching;
  $("event-pending").hidden = true;
  elements.status.textContent = "";
  elements.source.dataset.status = "error";
  elements.errorText.textContent = message;
  setPanel("error");
  queueMicrotask(() => {
    if (!elements.dialog.open && !elements.devDialog.open && document.body.dataset.state === "error") {
      elements.errorTitle.focus({ preventScroll: true });
    }
  });
}

async function loadPlace(place, { preferCache = false, force = false } = {}) {
  const requestId = ++state.loadRequestId;
  const normalized = normalizePlace(place);
  if (!normalized) return showError("地点信息无效，请重新搜索");
  const eventType = state.event;
  const keepReady = document.body.dataset.state === "ready"
    && state.bundle && placeIdentity(state.bundle.place) === placeIdentity(normalized);
  const sameReady = keepReady && state.bundle.eventType === eventType;
  delete document.body.dataset.switching;
  $("event-pending").hidden = true;
  state.place = normalized;
  storage.set(PLACE_KEY, normalized);
  if (!sameReady) {
    elements.placeName.textContent = normalized.name;
    elements.openPlaces.setAttribute("aria-label", `选择地点，当前地点：${normalized.name}`);
  }
  const cached = readValidCache(normalized, eventType);
  if (!force && preferCache && cached) {
    state.bundle = cached.bundle;
    state.stale = true;
    state.refreshing = false;
    state.refreshFailed = false;
    setBusy(false);
    if (renderReady(cached.age)) {
      announceReady();
      if (!keepReady) focusNewResult();
    }
    if (cached.age > 5 * 60 * 1000) {
      loadPlace(normalized, { force: true });
    }
    return;
  }
  const eventTime = nextEvent(eventType, normalized.lat, normalized.lon, new Date());
  if (!eventTime) return showError("未来三天没有可预测的日出或日落");
  if (keepReady && !sameReady) {
    stopTicker();
    document.body.dataset.switching = "true";
    $("event-pending").textContent = `正在读取${eventType === "sunset" ? "晚霞" : "朝霞"}预报，下方暂保留上次结果`;
    $("event-pending").hidden = false;
    syncEventTabs();
  }
  state.refreshing = sameReady;
  state.refreshFailed = false;
  if (sameReady) {
    updateSourceStatus();
    elements.status.textContent = `正在更新${normalized.name}${eventType === "sunset" ? "晚霞" : "朝霞"}预报`;
  } else if (!keepReady) {
    setPanel("loading");
  }
  setBusy(true);
  elements.loadingText.textContent = `正在计算${eventType === "sunset" ? "晚霞" : "朝霞"}方向的云层…`;
  try {
    const bundle = await fetchForecastBundle(normalized, eventType, eventTime);
    if (requestId !== state.loadRequestId) return;
    state.bundle = bundle;
    state.stale = false;
    state.refreshing = false;
    writeCache(bundle);
    if (renderReady()) {
      announceReady();
      if (!keepReady) focusNewResult();
    }
  } catch (error) {
    if (requestId !== state.loadRequestId) return;
    state.refreshing = false;
    state.refreshFailed = true;
    if (keepReady) {
      state.event = state.bundle.eventType;
      delete document.body.dataset.switching;
      $("event-pending").hidden = true;
      syncEventTabs();
      updateTicker(currentEventTime());
      state.stale = true;
      updateSourceStatus();
      announceReady();
    } else {
      const fallback = readValidCache(normalized, eventType);
      if (fallback) {
        state.stale = true;
        state.bundle = fallback.bundle;
        if (renderReady(fallback.age)) {
          announceReady();
          focusNewResult();
        }
      } else {
        console.error(error);
        showError("暂无可用预测，请稍后重试");
      }
    }
  } finally {
    if (requestId === state.loadRequestId) setBusy(false);
  }
}

function openPlaces() {
  if (!elements.dialog.open) {
    renderFavorites();
    resetPlacesDrawer();
    elements.dialog.showModal();
    renderFavoriteFeedback();
  }
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
    name.className = "place-label";
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

let pendingFavorite = null;

function renderFavoriteFeedback() {
  const inDialog = elements.dialog.open;
  elements.favoriteFeedback.hidden = !pendingFavorite || inDialog;
  elements.dialogFavoriteFeedback.hidden = !pendingFavorite || !inDialog;
  for (const feedback of [elements.favoriteFeedback, elements.dialogFavoriteFeedback]) {
    feedback.inert = feedback.hidden;
    if (pendingFavorite?.error) feedback.dataset.status = "error";
    else feedback.removeAttribute("data-status");
  }
  if (pendingFavorite) {
    const message = pendingFavorite.error
      ? "最多收藏 8 个地点，请先移除一个收藏，再撤销"
      : pendingFavorite.retryRemoved
        ? `已删除收藏 ${pendingFavorite.retryRemoved}，可撤销先前删除的 ${pendingFavorite.place.name}`
        : `已删除收藏 ${pendingFavorite.place.name}`;
    (inDialog ? elements.dialogFavoriteMessage : elements.favoriteMessage).textContent = message;
  }
  scheduleFavoriteUndo();
}

function scheduleFavoriteUndo() {
  if (!pendingFavorite) return;
  clearTimeout(pendingFavorite.timer);
  const feedback = elements.dialog.open ? elements.dialogFavoriteFeedback : elements.favoriteFeedback;
  if (feedback.matches(":hover") || feedback.contains(document.activeElement)) return;
  const pending = pendingFavorite;
  pending.timer = setTimeout(() => {
    if (pendingFavorite === pending) clearFavoriteUndo();
  }, 7000);
}

function clearFavoriteUndo() {
  if (!pendingFavorite) return;
  clearTimeout(pendingFavorite.timer);
  pendingFavorite = null;
  const undoHadFocus = document.activeElement === elements.undoFavorite || document.activeElement === elements.dialogUndoFavorite;
  renderFavoriteFeedback();
  if (undoHadFocus) {
    (elements.dialog.open ? elements.search : elements.favorite.hidden ? elements.openPlaces : elements.favorite).focus({ preventScroll: true });
  }
}

function removeFavorite(place) {
  const index = state.favorites.findIndex((favorite) => placeIdentity(favorite) === placeIdentity(place));
  if (index < 0) return;
  const retryingUndo = Boolean(pendingFavorite?.error);
  if (!retryingUndo) clearFavoriteUndo();
  const [removed] = state.favorites.splice(index, 1);
  storage.set(FAVORITES_KEY, state.favorites);
  renderFavorites();
  updateFavoriteButton();
  if (elements.dialog.open) {
    const adjacent = elements.favoritesList.children[Math.min(index, state.favorites.length - 1)];
    (adjacent?.querySelector(".delete-favorite") || elements.search).focus({ preventScroll: true });
  }
  if (retryingUndo) {
    pendingFavorite.error = false;
    pendingFavorite.retryRemoved = removed.name;
  } else {
    pendingFavorite = { place: removed, index, timer: null, error: false };
  }
  renderFavoriteFeedback();
}

function undoFavorite() {
  if (!pendingFavorite) return;
  const { place, index } = pendingFavorite;
  const alreadyRestored = state.favorites.some((favorite) => placeIdentity(favorite) === placeIdentity(place));
  if (!alreadyRestored && state.favorites.length >= 8) {
    pendingFavorite.error = true;
    pendingFavorite.retryRemoved = null;
    renderFavoriteFeedback();
    (elements.dialog.open ? elements.dialogUndoFavorite : elements.undoFavorite).focus({ preventScroll: true });
    return;
  }
  clearFavoriteUndo();
  let restoredIndex = state.favorites.findIndex((favorite) => placeIdentity(favorite) === placeIdentity(place));
  if (restoredIndex < 0 && state.favorites.length < 8) {
    restoredIndex = Math.min(index, state.favorites.length);
    state.favorites.splice(restoredIndex, 0, place);
    storage.set(FAVORITES_KEY, state.favorites);
    renderFavorites();
    updateFavoriteButton();
  }
  if (elements.dialog.open) {
    (restoredIndex >= 0 ? elements.favoritesList.children[restoredIndex]?.querySelector(".favorite-place") : elements.search)
      .focus({ preventScroll: true });
  } else if (!elements.favorite.hidden) {
    elements.favorite.focus({ preventScroll: true });
  }
}

function renderFavorites() {
  const list = elements.favoritesList;
  const oldRows = new Map([...list.children].filter((row) => !row.dataset.exiting)
    .map((row) => [row.dataset.place, row]));
  const positions = new Map([...oldRows].map(([key, row]) => [key, row.getBoundingClientRect()]));
  const animate = elements.dialog.open && motionAllowed();
  const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim();
  const rows = state.favorites.map((place) => {
    const key = placeIdentity(place);
    if (oldRows.has(key)) return oldRows.get(key);
    const item = document.createElement("li");
    item.className = "favorite-row";
    item.dataset.place = key;
    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "favorite-place";
    const name = document.createElement("strong");
    name.className = "place-label";
    name.textContent = place.name;
    choose.append(name);
    choose.addEventListener("click", () => choosePlace(place));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-favorite";
    remove.setAttribute("aria-label", `删除收藏 ${place.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => removeFavorite(place));
    item.append(choose, remove);
    return item;
  });
  const retained = new Set(rows);
  for (const row of oldRows.values()) {
    if (retained.has(row)) continue;
    const rect = positions.get(row.dataset.place);
    row.remove();
    if (animate) {
      row.dataset.exiting = "true";
      row.inert = true;
      row.setAttribute("aria-hidden", "true");
      row.style.cssText = `position:absolute;top:${rect.top - list.getBoundingClientRect().top}px;left:0;width:${rect.width}px;pointer-events:none`;
      list.append(row);
      row.animate([{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(-8px)" }],
        { duration: 120, easing }).finished.then(() => row.remove(), () => row.remove());
    }
  }
  rows.forEach((row, index) => {
    if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
  });
  for (const row of rows) {
    const previous = positions.get(row.dataset.place);
    row.getAnimations().forEach((animation) => animation.cancel());
    if (!animate) continue;
    const delta = previous ? previous.top - row.getBoundingClientRect().top : 4;
    if (previous && Math.abs(delta) < 0.5) continue;
    row.animate([
      { transform: `translateY(${delta}px)`, opacity: previous ? 1 : 0 },
      { transform: "translateY(0)", opacity: 1 }
    ], { duration: 160, easing });
  }
  elements.favoritesEmpty.hidden = state.favorites.length > 0;
}

function toggleFavorite() {
  if (!state.place) return;
  const identity = placeIdentity(state.place);
  const index = state.favorites.findIndex((place) => placeIdentity(place) === identity);
  if (index >= 0) {
    removeFavorite(state.place);
    return;
  }
  if (state.favorites.length >= 8) {
    setLocationStatus("最多收藏 8 个地点");
    openPlaces();
    return;
  }
  if (pendingFavorite && placeIdentity(pendingFavorite.place) === identity) clearFavoriteUndo();
  state.favorites.push({ ...state.place });
  storage.set(FAVORITES_KEY, state.favorites);
  updateFavoriteButton();
  renderFavorites();
}

function initFluidDrawer(dialog) {
  if (!dialog) return;

  const handle = dialog.querySelector("#drawer-handle") || dialog.querySelector(".drawer-handle");
  const head = dialog.querySelector(".dialog-head");

  let isDragging = false;
  let startY = 0;
  let currentY = 0;
  let currentTranslateY = 0;
  let activePointerId = null;
  let history = [];
  let motionTimer = null;
  let motionEnd = null;

  function cancelMotion() {
    clearTimeout(motionTimer);
    motionTimer = null;
    if (motionEnd) dialog.removeEventListener("transitionend", motionEnd);
    motionEnd = null;
  }

  function finishMotion(callback, delay) {
    cancelMotion();
    const onEnd = (event) => {
      if (event && (event.target !== dialog || event.propertyName !== "transform")) return;
      cancelMotion();
      callback();
    };
    motionEnd = onEnd;
    dialog.addEventListener("transitionend", onEnd);
    motionTimer = setTimeout(() => onEnd(), delay);
  }


  function rubberband(overshoot, dimension = 350, constant = 0.45) {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
  }

  function project(velocity, decelerationRate = 0.992) {
    return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
  }

  function setTranslateY(y) {
    currentTranslateY = y;
    dialog.style.setProperty("--sheet-translate-y", `${y}px`);
    const height = dialog.offsetHeight || 500;
    const progress = Math.min(1, Math.max(0, 1 - (Math.max(0, y) / height)));
    dialog.style.setProperty("--backdrop-opacity", String(progress));
  }

  function resetDialogStyles() {
    cancelMotion();
    dialog.classList.remove("is-dragging", "is-settling", "is-dismissing");
    dialog.style.removeProperty("--sheet-translate-y");
    dialog.style.removeProperty("--backdrop-opacity");
    dialog.style.removeProperty("animation");
    currentTranslateY = 0;
    isDragging = false;
    activePointerId = null;
  }

  function dismissDrawer() {
    if (!motionAllowed()) {
      dialog.close();
      resetDialogStyles();
      return;
    }
    const presentation = getComputedStyle(dialog);
    dialog.style.transform = presentation.transform;
    dialog.style.opacity = presentation.opacity;
    dialog.style.animation = "none";
    void dialog.offsetWidth;
    dialog.classList.remove("is-dragging", "is-settling");
    dialog.classList.add("is-dismissing");
    dialog.style.removeProperty("transform");
    dialog.style.removeProperty("opacity");
    dialog.style.setProperty("--backdrop-opacity", "0");
    finishMotion(() => {
      if (dialog.open) dialog.close();
      resetDialogStyles();
    }, 240);
  }

  function springBack() {
    dialog.classList.remove("is-dragging", "is-dismissing");
    dialog.classList.add("is-settling");
    setTranslateY(0);
    finishMotion(resetDialogStyles, 320);
  }

  function canStartDrag(e) {
    if (!dialog.open) return false;
    if (window.matchMedia("(min-width: 761px)").matches) return false;
    if (handle && (e.target === handle || handle.contains(e.target))) return true;
    if (head && (e.target === head || head.contains(e.target))) {
      if (e.target.closest("button, a, input")) return false;
      return true;
    }
    if (dialog.scrollTop <= 0) {
      if (e.target.closest("button, a, input")) return false;
      return true;
    }
    return false;
  }

  dialog.addEventListener("pointerdown", (e) => {
    if (activePointerId !== null) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!canStartDrag(e)) return;

    if (dialog.classList.contains("is-settling") || dialog.classList.contains("is-dismissing")) {
      const presentationY = new DOMMatrix(getComputedStyle(dialog).transform).m42;
      cancelMotion();
      dialog.classList.remove("is-settling", "is-dismissing");
      dialog.classList.add("is-dragging");
      setTranslateY(presentationY);
    } else {
      dialog.classList.add("is-dragging");
    }

    isDragging = true;
    activePointerId = e.pointerId;
    startY = e.clientY - currentTranslateY;
    currentY = e.clientY;
    history = [{ y: e.clientY, t: performance.now() }];
    try { dialog.setPointerCapture(e.pointerId); } catch {}

    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      document.activeElement.blur();
    }
  });

  dialog.addEventListener("pointermove", (e) => {
    if (!isDragging || e.pointerId !== activePointerId) return;

    currentY = e.clientY;
    const now = performance.now();
    history.push({ y: currentY, t: now });
    while (history.length > 2 && now - history[0].t > 100) {
      history.shift();
    }

    const deltaY = currentY - startY;
    let appliedY;
    if (deltaY < 0) {
      appliedY = rubberband(deltaY, 300, 0.4);
    } else {
      appliedY = deltaY;
    }

    setTranslateY(appliedY);
  });

  function handlePointerEnd(e) {
    if (!isDragging || e.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
    try { dialog.releasePointerCapture(e.pointerId); } catch {}
    if (e.type === "pointercancel") {
      if (dialog.open) springBack();
      return;
    }

    const now = performance.now();
    const recent = history.filter((p) => now - p.t < 120);
    const first = recent[0] || history[0] || { y: currentY, t: now - 16 };
    const dt = Math.max(0.016, (now - first.t) / 1000);
    const releaseVelocity = (currentY - first.y) / dt;

    const projectedY = currentTranslateY + project(releaseVelocity, 0.992);
    const dialogHeight = dialog.offsetHeight || 400;

    if (projectedY > dialogHeight * 0.35 || (releaseVelocity > 550 && currentTranslateY > 30)) {
      dismissDrawer();
    } else {
      springBack();
    }
  }

  dialog.addEventListener("pointerup", handlePointerEnd);
  dialog.addEventListener("pointercancel", handlePointerEnd);
  dialog.querySelector(".dialog-close")?.addEventListener("click", (event) => {
    if (!event.detail || !motionAllowed()) return;
    event.preventDefault();
    dismissDrawer();
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open) resetDialogStyles();
  });
  return resetDialogStyles;
}

const resetPlacesDrawer = initFluidDrawer(elements.dialog);
initFluidDrawer(elements.devDialog);

const LOADER_STORAGE_KEY = "firecloud:loader_style:v1";
let currentLoaderStyle = storage.get(LOADER_STORAGE_KEY, "horizon");
let currentSpeedFactor = 1;

function getLoaderHTML(style, prefix = "") {
  if (style === "horizon-classic") {
    return `
      <div class="loader-horizon-classic" aria-hidden="true">
        <span class="horizon-classic-glow"></span>
        <svg class="horizon-classic-svg" viewBox="0 0 160 52" fill="none">
          <defs>
            <linearGradient id="${prefix}horizon-classic-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#edb56f" stop-opacity="0"/>
              <stop offset="25%" stop-color="#ffd07c" stop-opacity="0.95"/>
              <stop offset="50%" stop-color="#ffffff" stop-opacity="1"/>
              <stop offset="75%" stop-color="#ff6e38" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#edb56f" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path class="horizon-classic-track" d="M 16 38 Q 80 18 144 38" />
          <path class="horizon-classic-beam" stroke="url(#${prefix}horizon-classic-beam-grad)" d="M 16 38 Q 80 18 144 38" />
        </svg>
        <div class="horizon-classic-vapors">
          <span class="horizon-classic-vapor v1"></span>
          <span class="horizon-classic-vapor v2"></span>
          <span class="horizon-classic-vapor v3"></span>
        </div>
      </div>
    `;
  }
  if (style === "kepler") {
    return `
      <div class="loader-kepler" aria-hidden="true">
        <span class="kepler-ambient"></span>
        <span class="kepler-shockwave"></span>
        <svg class="kepler-svg" viewBox="0 0 104 104" fill="none">
          <defs>
            <linearGradient id="${prefix}kepler-plasma-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
              <stop offset="25%" stop-color="#ffd07c" stop-opacity="1"/>
              <stop offset="65%" stop-color="#ff7e4a" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#ff7e4a" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${prefix}kepler-dust-grad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#a855f7" stop-opacity="0"/>
              <stop offset="40%" stop-color="#a855f7" stop-opacity="0.5"/>
              <stop offset="80%" stop-color="#9ebbf8" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#9ebbf8" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <ellipse class="kepler-orbit-cross" cx="52" cy="52" rx="42" ry="20" transform="rotate(32 52 52)" />
          <ellipse class="kepler-dust-stream" stroke="url(#${prefix}kepler-dust-grad)" cx="52" cy="52" rx="42" ry="20" transform="rotate(32 52 52)" />
          <ellipse class="kepler-orbit-guide" cx="52" cy="52" rx="44" ry="24" transform="rotate(-18 52 52)" />
          <ellipse class="kepler-plasma-comet" stroke="url(#${prefix}kepler-plasma-grad)" cx="52" cy="52" rx="44" ry="24" transform="rotate(-18 52 52)" />
        </svg>
        <div class="kepler-star-system">
          <span class="kepler-corona-outer"></span>
          <span class="kepler-photosphere"></span>
        </div>
      </div>
    `;
  }
  if (style === "prismatic") {
    return `
      <div class="loader-prismatic" aria-hidden="true">
        <span class="chromatic-glow-bg"></span>
        <svg class="chromatic-svg" viewBox="0 0 104 104" fill="none">
          <defs>
            <linearGradient id="${prefix}chroma-grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff4757" stop-opacity="1"/>
              <stop offset="50%" stop-color="#ff7e4a" stop-opacity="0.7"/>
              <stop offset="100%" stop-color="#ff7e4a" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${prefix}chroma-grad-green" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#2ed573" stop-opacity="1"/>
              <stop offset="40%" stop-color="#ffd07c" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#ffd07c" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${prefix}chroma-grad-blue" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#1e90ff" stop-opacity="1"/>
              <stop offset="50%" stop-color="#c48aff" stop-opacity="0.7"/>
              <stop offset="100%" stop-color="#c48aff" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${prefix}chroma-laser" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
              <stop offset="35%" stop-color="#ffffff" stop-opacity="0.95"/>
              <stop offset="70%" stop-color="#ffd07c" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#ffd07c" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <circle class="chroma-track" cx="52" cy="52" r="38" />
          <circle class="chroma-arc arc-red" stroke="url(#${prefix}chroma-grad-red)" cx="52" cy="52" r="38" />
          <circle class="chroma-arc arc-green" stroke="url(#${prefix}chroma-grad-green)" cx="52" cy="52" r="38" />
          <circle class="chroma-arc arc-blue" stroke="url(#${prefix}chroma-grad-blue)" cx="52" cy="52" r="38" />
          <circle class="chroma-arc arc-core" stroke="url(#${prefix}chroma-laser)" cx="52" cy="52" r="38" />
        </svg>
      </div>
    `;
  }
  // 默认：horizon (地平线霞光探测仪 2.0 大气分层与宽银幕耀斑)
  return `
    <div class="loader-horizon" aria-hidden="true">
      <span class="horizon-glow"></span>
      <span class="horizon-aerosol-mist"></span>
      <span class="horizon-evening-star"></span>
      <div class="horizon-glint">
        <span class="horizon-glint-streak"></span>
        <span class="horizon-glint-core"></span>
      </div>
      <svg class="horizon-svg" viewBox="0 0 160 56" fill="none">
        <defs>
          <linearGradient id="${prefix}horizon-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#edb56f" stop-opacity="0"/>
            <stop offset="25%" stop-color="#ffd07c" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="75%" stop-color="#ff6e38" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#edb56f" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="${prefix}horizon-stratosphere-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#9ebbf8" stop-opacity="0"/>
            <stop offset="35%" stop-color="#9ebbf8" stop-opacity="0.8"/>
            <stop offset="70%" stop-color="#c48aff" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#c48aff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="horizon-track-stratosphere" d="M 22 36 Q 80 16 138 36" />
        <path class="horizon-stratosphere-glow" stroke="url(#${prefix}horizon-stratosphere-grad)" d="M 22 36 Q 80 16 138 36" />
        <path class="horizon-track-troposphere" d="M 16 42 Q 80 22 144 42" />
        <path class="horizon-beam" stroke="url(#${prefix}horizon-beam-grad)" d="M 16 42 Q 80 22 144 42" />
      </svg>
    </div>
  `;
}

function applySpeedToStage(stageEl, factor) {
  if (!stageEl) return;
  const anims = stageEl.querySelectorAll('[class*="kepler"], [class*="prism"], [class*="chroma"], [class*="horizon"]');
  anims.forEach((el) => {
    if (!el.hasAttribute("data-orig-duration")) {
      const cs = window.getComputedStyle(el);
      const dur = parseFloat(cs.animationDuration);
      if (dur > 0) el.setAttribute("data-orig-duration", dur);
    }
    const orig = parseFloat(el.getAttribute("data-orig-duration"));
    if (orig && orig > 0) {
      el.style.animationDuration = `${orig * factor}s`;
    }
  });
}

function applyLoaderStyle(style) {
  currentLoaderStyle = style;
  if (elements.loaderStage) {
    elements.loaderStage.innerHTML = getLoaderHTML(style, "main-");
  }
  if (elements.devPreviewStage) {
    elements.devPreviewStage.innerHTML = getLoaderHTML(style, "prev-");
    if (currentSpeedFactor !== 1) applySpeedToStage(elements.devPreviewStage, currentSpeedFactor);
  }
  const tabs = document.querySelectorAll(".lens-tab");
  tabs.forEach((tab) => {
    const active = tab.dataset.style === style;
    tab.setAttribute("data-active", String(active));
    if (active && elements.devLensSlider) {
      const idx = parseInt(tab.dataset.idx, 10);
      elements.devLensSlider.style.transform = `translateX(calc(${idx} * (100% + 2px)))`;
    }
  });
}

function openDevLab() {
  applyLoaderStyle(currentLoaderStyle);
  if (!elements.devDialog.open) {
    elements.devDialog.classList.remove("is-dragging", "is-settling", "is-dismissing");
    elements.devDialog.style.removeProperty("--sheet-translate-y");
    elements.devDialog.style.removeProperty("--backdrop-opacity");
    elements.devDialog.showModal();
    if (navigator.vibrate) try { navigator.vibrate(14); } catch {}
  }
}

let brandClickCount = 0;
let brandClickTimer = null;
elements.openPlaces.addEventListener("click", (e) => {
  brandClickCount++;
  clearTimeout(brandClickTimer);
  brandClickTimer = setTimeout(() => { brandClickCount = 0; }, 600);
  if (brandClickCount >= 3) {
    brandClickCount = 0;
    e.preventDefault();
    e.stopPropagation();
    openDevLab();
    return;
  }
  openPlaces();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "D" && e.shiftKey && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    openDevLab();
  }
});

document.querySelectorAll(".lens-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    applyLoaderStyle(tab.dataset.style);
    if (navigator.vibrate) try { navigator.vibrate(12); } catch {}
  });
});

document.querySelectorAll(".lens-speed-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lens-speed-btn").forEach(b => b.removeAttribute("data-active"));
    btn.setAttribute("data-active", "true");
    currentSpeedFactor = parseFloat(btn.dataset.speed) || 1;
    if (elements.devPreviewStage) {
      applySpeedToStage(elements.devPreviewStage, currentSpeedFactor);
    }
    if (navigator.vibrate) try { navigator.vibrate(10); } catch {}
  });
});

elements.devBtnSaveDefault.addEventListener("click", () => {
  storage.set(LOADER_STORAGE_KEY, currentLoaderStyle);
  const btn = elements.devBtnSaveDefault;
  const label = btn.firstElementChild;
  const original = label.textContent;
  label.textContent = "已设为默认 ✓";
  btn.disabled = true;
  setTimeout(() => {
    label.textContent = original;
    btn.disabled = false;
  }, 1600);
});

elements.devBtnTestLoading.addEventListener("click", () => {
  elements.devDialog.close();
  setPanel("loading");
  elements.loadingText.textContent = "正在模拟计算霞光云层…";
  setTimeout(() => {
    if (state.bundle) renderReady();
    else setPanel("welcome");
  }, 3000);
});

// 🌙 月相天文观测便签点击呼出详情弹窗
elements.heroLunarBadge?.addEventListener("click", () => {
  triggerHaptic(12);
  elements.lunarDialog?.showModal();
});
elements.heroLunarBadge?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    triggerHaptic(12);
    elements.lunarDialog?.showModal();
  }
});

// 天体观测台实验室：昼夜切换与月相动态模拟滑块
elements.devBtnToggleNight?.addEventListener("click", () => {
  triggerHaptic(12);
  const cur = document.body.dataset.light;
  const next = cur === "night" ? "day" : "night";
  document.body.dataset.light = next;
  elements.devBtnToggleNight.textContent = `切换夜幕天体 (当前: ${next === "night" ? "夜" : "昼"})`;
});

elements.devMoonSlider?.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  const frac = val / 100;
  const isWax = val <= 50;
  const mockMoon = {
    ...lunarPhase(new Date(), state.place?.lat || 30.27, state.place?.lon || 120.15),
    phaseFraction: frac,
    isWaxing: isWax,
    phaseName: frac > 0.95 ? "满月 (望)" : frac < 0.05 ? "新月 (朔)" : isWax ? (frac > 0.4 ? "盈凸月" : "蛾眉月") : (frac > 0.4 ? "亏凸月" : "残月")
  };
  updateMoonDisplay(mockMoon);
});

// 挂载全局方法，支持控制台即时调用测试
window.renderMoonPhase = (fraction = 0.96, isWaxing = false) => {
  const mockMoon = {
    ...lunarPhase(new Date(), state.place?.lat || 30.27, state.place?.lon || 120.15),
    phaseFraction: Math.max(0, Math.min(1, fraction)),
    isWaxing,
    phaseName: fraction > 0.95 ? "满月 (望)" : fraction < 0.05 ? "新月 (朔)" : isWaxing ? "上弦月/盈月" : "亏凸月/亏月"
  };
  updateMoonDisplay(mockMoon);
  return mockMoon;
};

elements.welcomeSearch.addEventListener("click", () => { openPlaces(); elements.search.focus(); });
elements.errorSearch.addEventListener("click", () => { openPlaces(); elements.search.focus(); });
elements.locate.addEventListener("click", locate);
elements.dialogLocate.addEventListener("click", locate);
elements.favorite.addEventListener("click", toggleFavorite);
elements.undoFavorite.addEventListener("click", undoFavorite);
elements.dialogUndoFavorite.addEventListener("click", undoFavorite);
elements.dialog.addEventListener("close", renderFavoriteFeedback);
for (const feedback of [elements.favoriteFeedback, elements.dialogFavoriteFeedback]) {
  for (const event of ["pointerenter", "pointerleave", "focusin", "focusout"]) {
    feedback.addEventListener(event, () => queueMicrotask(scheduleFavoriteUndo));
  }
}
elements.refresh.addEventListener("click", () => state.place && loadPlace(state.place, { force: true }));
elements.retry.addEventListener("click", () => state.place ? loadPlace(state.place, { force: true }) : openPlaces());
for (const tab of elements.tabs) {
  tab.addEventListener("click", () => {
    if (tab.dataset.event === state.event || !state.place) return;
    triggerHaptic(10);
    state.event = tab.dataset.event;
    loadPlace(state.place, { preferCache: true });
  });
}

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));

applyLoaderStyle(currentLoaderStyle);
renderFavorites();

const SPECIMEN_JOURNALS = {
  sunset: {
    titlePrefix: "今晚落日",
    titleSuffix: "值得等吗",
    intro: "读取云幕、远端光路与空气通透度，为下一次朝霞或晚霞给出一份简明判断。",
    photo: "assets/sayram_sunset.jpg",
    photoAlt: "新疆赛里木湖西海落日雪山实景观测",
    place: "新疆 · 赛里木湖 (2,073 m)",
    target: "暮天火烧云与雪峰漫射实录 · 标杆观测",
    stamp: "晚霞极佳 · 值得专程等待",
    window: "21:25 – 22:15",
    m1Title: "云幕受光",
    m1Desc: "博罗科努高层卷云迎阳，预计触发 30 分钟火烧云",
    m2Title: "地平光路",
    m2Desc: "西海低云仅 8%，太阳落入地平前无遮挡",
    m3Title: "高山空气",
    m3Desc: "视距超 80km，瑞利散射纯净，雪山倒影赤红"
  },
  sunrise: {
    titlePrefix: "明早破晓",
    titleSuffix: "值得早起吗",
    intro: "读取东方低层光路与高空卷云受光角，为明早第一缕晨光给出一份出行建言。",
    photo: "assets/sayram_sunrise.jpg",
    photoAlt: "新疆赛里木湖松树头晨曦霞光S弯实景观测",
    place: "新疆 · 赛里木湖 (2,073 m)",
    target: "晨曦破晓映S弯与金顶实录 · 标杆观测",
    stamp: "朝霞极佳 · 建议定闹钟早起",
    window: "06:40 – 07:25",
    m1Title: "东方初阳",
    m1Desc: "卷云受光仰角 14.8°，率先捕获第一缕晨曦金光",
    m2Title: "地影天幕",
    m2Desc: "反日点粉蓝地影弧（维纳斯带）横贯天际",
    m3Title: "镜面水色",
    m3Desc: "晨风微弱，松树头 S 弯水面静如明镜，倒映金山"
  }
};

let currentSpecimenSlot = null;
let specimenUserManual = false;

function setSpecimenSlot(slot, manual = false) {
  if (manual) specimenUserManual = true;
  currentSpecimenSlot = slot;
  const data = SPECIMEN_JOURNALS[slot];
  if (!data) return;

  const card = $("specimen-card");
  if (!card) return;
  card.dataset.slot = slot;

  for (const tab of card.querySelectorAll(".specimen-tab")) {
    const active = tab.dataset.slot === slot;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-checked", String(active));
  }

  const titlePrefix = $("welcome-title-prefix");
  if (titlePrefix) titlePrefix.textContent = data.titlePrefix;
  const titleSuffix = $("welcome-title-suffix");
  if (titleSuffix) titleSuffix.textContent = data.titleSuffix;
  const intro = $("welcome-intro");
  if (intro) intro.textContent = data.intro;

  const body = $("specimen-body");
  const photo = $("specimen-photo");
  const place = $("specimen-place");
  const target = $("specimen-target");
  const stamp = $("specimen-stamp-text");
  const windowEl = $("specimen-time-val");
  const m1T = $("specimen-m1-title"), m1D = $("specimen-m1-desc");
  const m2T = $("specimen-m2-title"), m2D = $("specimen-m2-desc");
  const m3T = $("specimen-m3-title"), m3D = $("specimen-m3-desc");

  const apply = () => {
    if (photo) { photo.src = data.photo; photo.alt = data.photoAlt; }
    if (place) place.textContent = data.place;
    if (target) target.textContent = data.target;
    if (stamp) stamp.textContent = data.stamp;
    if (windowEl) windowEl.textContent = data.window;
    if (m1T && m1D) { m1T.textContent = data.m1Title; m1D.textContent = data.m1Desc; }
    if (m2T && m2D) { m2T.textContent = data.m2Title; m2D.textContent = data.m2Desc; }
    if (m3T && m3D) { m3T.textContent = data.m3Title; m3D.textContent = data.m3Desc; }
  };

  if (body) {
    body.classList.add("fade-out");
    if (photo) photo.classList.add("fade-out");
    setTimeout(() => {
      apply();
      body.classList.remove("fade-out");
      if (photo) photo.classList.remove("fade-out");
    }, 120);
  } else {
    apply();
  }
}

function syncWelcomeJournal() {
  if (specimenUserManual) return;
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const autoSlot = (h >= 4 && h < 19.5) ? "sunset" : "sunrise";
  if (autoSlot !== currentSpecimenSlot) {
    setSpecimenSlot(autoSlot, false);
  }
}

function initWelcomeJournalEvents() {
  const card = $("specimen-card");
  if (!card) return;
  const tabs = Array.from(card.querySelectorAll(".specimen-tab"));
  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => setSpecimenSlot(tab.dataset.slot, true));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = tabs[(idx + 1) % tabs.length];
        next.focus();
        setSpecimenSlot(next.dataset.slot, true);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        prev.focus();
        setSpecimenSlot(prev.dataset.slot, true);
      }
    });
  });
  syncWelcomeJournal();
}

initWelcomeJournalEvents();

const lastPlace = normalizePlace(storage.get(PLACE_KEY));
if (lastPlace) loadPlace(lastPlace, { preferCache: true });
else setPanel("welcome");
