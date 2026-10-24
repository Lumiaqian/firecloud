/**
 * 天幕：按地点当前天气与太阳位置写入 body 的天气数据属性与 CSS 变量，驱动背景、粒子与纸面联动。
 * 同时把天色缓存到本机，供下次打开时首帧着色（index.html 内联脚本读取）。
 */
import {
  lightFromSunClock,
  lunarPhase,
  metricsAt,
  solarAzimuth,
  solarElevation,
  stormLevelFor,
  sunDiskPosition,
  sunTimes,
  twilightWarmthFor,
  weatherConditionFor,
  weatherTheme
} from "../forecast.mjs";
import { atmosphereDriveFor, clearEnergyFor } from "../weather-fx.mjs";
import { KEYS } from "../core/storage.mjs";

export function createSky({ storage, paperFx, moonView, themeColor, body = document.body }) {
  return {
    apply(bundle, place) {
      const now = new Date();
      const current = bundle?.forecasts?.local?.current ?? {};
      const metrics = metricsAt(bundle, now);
      const cloudLayers = [metrics.low, metrics.mid, metrics.high].filter(Number.isFinite);
      const cloudCover = current.cloud_cover ?? (cloudLayers.length ? Math.max(...cloudLayers) : null);
      const sun = sunTimes(now, place.lat, place.lon);
      const apiLight = current.is_day === 0 ? "night" : "day";
      const light = lightFromSunClock(now, sun, apiLight);
      const precipitation = current.precipitation ?? metrics.precip;
      const theme = weatherTheme({
        weatherCode: current.weather_code,
        isDay: light === "night" ? 0 : 1,
        cloudCover,
        precipitation,
        snowfall: current.snowfall,
        fallbackLight: light
      });
      const {
        wind_speed_10m: windSpeed,
        wind_direction_10m: windDirection,
        wind_gusts_10m: windGust,
        pressure_msl: pressure
      } = current;
      const visibility = metrics.vis;
      const storm = stormLevelFor({ windSpeed, windGust, pressure });
      const atmosphereInputs = { precipitation, snowfall: current.snowfall, windSpeed, windDirection, windGust, pressure, visibility };
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
      const tier = body.dataset.tier || "great";
      const clearEnergy = clearEnergyFor({ twilightWarmth, tier });
      const azimuth = solarAzimuth(now, place.lat, place.lon);
      const elevation = solarElevation(now, place.lat, place.lon);
      const sunPos = theme.light === "night" ? { x: 78, y: 19, valid: false } : sunDiskPosition(azimuth, elevation);
      const moon = lunarPhase(now, place.lat, place.lon);

      const styles = {
        "--sun-x": `${sunPos.x.toFixed(1)}%`,
        "--sun-y": `${sunPos.y.toFixed(1)}%`,
        "--sun-elevation": Number.isFinite(elevation) ? elevation.toFixed(2) : "-90",
        "--moon-x": `${moon.disk.x.toFixed(1)}%`,
        "--moon-y": `${moon.disk.y.toFixed(1)}%`,
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
      body.dataset.weather = theme.weather;
      body.dataset.light = theme.light;
      body.dataset.storm = storm;
      body.dataset.windActive = String(Math.max(windSpeed ?? 0, windGust ?? 0) >= 40);
      body.dataset.lightning = String(theme.weather === "thunder" || theme.weather === "hail");
      for (const [name, value] of Object.entries(styles)) body.style.setProperty(name, value);
      for (const [name, value] of Object.entries(atmosphereInputs)) {
        if (Number.isFinite(value)) body.dataset[name] = String(value);
        else delete body.dataset[name];
      }

      const computed = getComputedStyle(body);
      const skyTop = computed.getPropertyValue("--sky-top").trim();
      if (/^#[\da-f]{6}$/i.test(skyTop)) themeColor.content = skyTop;
      storage.set(KEYS.theme, {
        light: theme.light,
        weather: theme.weather,
        storm,
        tier,
        skyTop,
        skyMid: computed.getPropertyValue("--sky-mid").trim(),
        skyHorizon: computed.getPropertyValue("--sky-horizon").trim()
      });

      paperFx?.syncWeather({
        weather: theme.weather,
        windSpeed: Number(windSpeed) || 0,
        windGust: Number(windGust) || 0,
        cloudCover: Number(current.cloud_cover) || 0,
        precipitation: Number(precipitation) || 0,
        isDay: theme.light !== "night"
      });
      moonView.render(moon);

      return weatherConditionFor({
        weather: theme.weather,
        weatherCode: current.weather_code,
        precipitation,
        cloudCover,
        temperature: current.temperature_2m
      });
    }
  };
}
