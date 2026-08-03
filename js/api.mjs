import { buildSamplingPoints, solarAzimuth } from "./forecast.mjs?v=4";

export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
export const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
export const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
export const REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const CURRENT_WEATHER_FIELDS = "weather_code,is_day,cloud_cover,precipitation,snowfall,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl";

export async function fetchJson(url, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("请求超时", { cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchForecastPoint(point, { includeCurrent = false } = {}) {
  const query = new URLSearchParams({
    latitude: Number(point.lat).toFixed(4),
    longitude: Number(point.lon).toFixed(4),
    hourly: "cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,visibility,precipitation",
    precipitation_unit: "mm",
    wind_speed_unit: "kmh",
    forecast_days: "7",
    timeformat: "unixtime",
    timezone: "auto"
  });
  if (includeCurrent) query.set("current", CURRENT_WEATHER_FIELDS);
  return fetchJson(`${FORECAST_URL}?${query}`);
}

export function fetchAir(point) {
  const query = new URLSearchParams({
    latitude: Number(point.lat).toFixed(4),
    longitude: Number(point.lon).toFixed(4),
    hourly: "aerosol_optical_depth,pm2_5,dust",
    forecast_days: "7",
    timeformat: "unixtime",
    timezone: "auto"
  });
  return fetchJson(`${AIR_URL}?${query}`);
}

export async function searchCities(query) {
  const normalized = query.trim();
  if (normalized.length < 2) return [];
  const params = new URLSearchParams({ name: normalized, count: "6", language: "zh", format: "json" });
  const data = await fetchJson(`${GEOCODE_URL}?${params}`);
  return (data.results ?? []).map((result) => ({
    name: result.name,
    detail: [result.admin1, result.country].filter(Boolean).join(" · "),
    lat: result.latitude,
    lon: result.longitude
  }));
}

export async function reverseGeocode(point) {
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lon),
    localityLanguage: "zh"
  });
  const data = await fetchJson(`${REVERSE_URL}?${params}`, 6000);
  return {
    name: data.city || data.locality || data.principalSubdivision || data.countryName || "当前位置",
    lat: point.lat,
    lon: point.lon
  };
}

export async function fetchForecastBundle(place, eventType, eventTime) {
  if (eventType !== "sunset" && eventType !== "sunrise") throw new TypeError("不支持的霞光事件");
  const samplingBearing = solarAzimuth(eventTime, place.lat, place.lon);
  const points = buildSamplingPoints(place.lat, place.lon, samplingBearing);
  const names = Object.keys(points);
  const [weatherResults, airResult] = await Promise.all([
    Promise.allSettled(names.map((name) => fetchForecastPoint(points[name], { includeCurrent: name === "local" }))),
    fetchAir(points.local).then(
      (value) => ({ status: "fulfilled", value }),
      (reason) => ({ status: "rejected", reason })
    )
  ]);

  const forecasts = {};
  const missingRemote = [];
  weatherResults.forEach((result, index) => {
    const name = names[index];
    if (result.status === "fulfilled") forecasts[name] = result.value;
    else if (name === "local") forecasts.local = null;
    else {
      forecasts[name] = null;
      missingRemote.push(name);
    }
  });
  if (!forecasts.local) {
    const localFailure = weatherResults[names.indexOf("local")];
    throw new Error("本地天气数据不可用", { cause: localFailure.reason });
  }
  if (airResult.status === "rejected") missingRemote.push("air");

  return {
    place,
    eventType,
    samplingBearing,
    forecasts,
    air: airResult.status === "fulfilled" ? airResult.value : null,
    fetchedAt: Date.now(),
    missingRemote
  };
}
