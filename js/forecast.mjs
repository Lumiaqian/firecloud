const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const OBLIQUITY = RAD * 23.4397;
const EARTH_RADIUS_KM = 6371.0088;
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const FOG_CODES = new Set([45, 48]);
const HAIL_CODES = new Set([96, 99]);

const toJulian = (date) => date.valueOf() / DAY_MS - 0.5 + J1970;
const fromJulian = (julian) => new Date((julian + 0.5 - J1970) * DAY_MS);
const toDays = (date) => toJulian(date) - J2000;
const solarMeanAnomaly = (days) => RAD * (357.5291 + 0.98560028 * days);
const declination = (longitude) => Math.asin(Math.sin(longitude) * Math.sin(OBLIQUITY));
const rightAscension = (longitude) => Math.atan2(Math.sin(longitude) * Math.cos(OBLIQUITY), Math.cos(longitude));
const julianCycle = (days, westLongitude) => Math.round(days - 0.0009 - westLongitude / (2 * Math.PI));
const approxTransit = (hourAngle, westLongitude, cycle) => 0.0009 + (hourAngle + westLongitude) / (2 * Math.PI) + cycle;
const solarTransitJulian = (transit, anomaly, longitude) => J2000 + transit + 0.0053 * Math.sin(anomaly) - 0.0069 * Math.sin(2 * longitude);
const gauss = (value, mean, spread) => Math.exp(-((value - mean) ** 2) / (2 * spread * spread));

export function weatherTheme({
  weatherCode,
  isDay,
  cloudCover,
  precipitation,
  snowfall,
  fallbackLight = "day"
} = {}) {
  let weather = "clear";
  if (HAIL_CODES.has(weatherCode)) weather = "hail";
  else if (weatherCode === 95) weather = "thunder";
  else if ((Number.isFinite(snowfall) && snowfall >= 0.02) || SNOW_CODES.has(weatherCode)) weather = "snow";
  else if ((Number.isFinite(precipitation) && precipitation >= 0.05) || RAIN_CODES.has(weatherCode)) weather = "rain";
  else if (FOG_CODES.has(weatherCode)) weather = "fog";
  else if (weatherCode === 3 || (Number.isFinite(cloudCover) && cloudCover >= 75)) weather = "overcast";
  else if (weatherCode === 1 || weatherCode === 2 || (Number.isFinite(cloudCover) && cloudCover >= 25)) weather = "partly";

  let light = fallbackLight === "night" ? "night" : "day";
  if (isDay === 0) light = "night";
  else if (isDay === 1) light = "day";
  return { weather, light };
}

export function weatherConditionFor({
  weather = "clear",
  weatherCode,
  isDay = 1,
  precipitation = 0,
  cloudCover = 0,
  temperature
} = {}) {
  let label = "晴朗";
  let icon = isDay === 0 ? "✨" : "☀️";

  if (weather === "hail") {
    label = "冰雹";
    icon = "🌨️";
  } else if (weather === "thunder") {
    label = "雷阵雨";
    icon = "⛈️";
  } else if (weather === "snow") {
    label = "降雪";
    icon = "❄️";
  } else if (weather === "rain") {
    if (weatherCode === 80 || weatherCode === 81 || weatherCode === 82) {
      label = "阵雨";
    } else {
      label = precipitation >= 3 ? "大雨" : precipitation >= 0.5 ? "中雨" : "小雨";
    }
    icon = "🌧️";
  } else if (weather === "fog") {
    label = "大雾";
    icon = "🌫️";
  } else if (weather === "overcast") {
    label = "阴天";
    icon = "☁️";
  } else if (weather === "partly") {
    label = weatherCode === 1 || cloudCover < 50 ? "晴间多云" : "多云";
    icon = isDay === 0 ? "🌙" : "⛅";
  } else if (weather === "wind") {
    label = "大风";
    icon = "💨";
  } else if (isDay === 0) {
    label = "晴朗";
    icon = "🌙";
  }

  const tempStr = Number.isFinite(temperature) ? ` ${Math.round(temperature)}°C` : "";
  return {
    label,
    icon,
    full: `${icon} ${label}${tempStr}`.trim(),
    summary: `${label}${tempStr}`.trim()
  };
}

/** Prefer local sunrise/sunset over a stale API is_day once the page has been sitting open. */
export function lightFromSunClock(now, { sunrise, sunset } = {}, fallbackLight = "day") {
  if (now instanceof Date && !Number.isNaN(now.valueOf()) && sunrise && sunset) {
    return now < sunrise || now > sunset ? "night" : "day";
  }
  return fallbackLight === "night" ? "night" : "day";
}

export function stormLevelFor({ windSpeed, windGust, pressure } = {}) {
  const speed = Number.isFinite(windSpeed) ? windSpeed : 0;
  const gust = Number.isFinite(windGust) ? windGust : 0;
  const mslPressure = Number.isFinite(pressure) ? pressure : Infinity;

  if (speed >= 60 || gust >= 80 || mslPressure < 970) return "severe";
  if (speed >= 40 || gust >= 60 || mslPressure < 985) return "strong";
  if (speed >= 25 || gust >= 40 || mslPressure < 1000) return "breezy";
  return "calm";
}

function eclipticLongitude(anomaly) {
  const center = RAD * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly));
  return anomaly + center + RAD * 102.9372 + Math.PI;
}

function horizonHourAngle(angle, latitude, solarDeclination) {
  const cosine = (Math.sin(angle) - Math.sin(latitude) * Math.sin(solarDeclination)) /
    (Math.cos(latitude) * Math.cos(solarDeclination));
  return Math.acos(cosine);
}

export function sunTimes(date, lat, lng) {
  const westLongitude = -lng * RAD;
  const latitude = lat * RAD;
  const days = toDays(date);
  const cycle = julianCycle(days, westLongitude);
  const transit = approxTransit(0, westLongitude, cycle);
  const anomaly = solarMeanAnomaly(transit);
  const longitude = eclipticLongitude(anomaly);
  const solarDeclination = declination(longitude);
  const noon = solarTransitJulian(transit, anomaly, longitude);

  const crossing = (angleDegrees) => {
    const angle = horizonHourAngle(angleDegrees * RAD, latitude, solarDeclination);
    if (Number.isNaN(angle)) return null;
    return solarTransitJulian(approxTransit(angle, westLongitude, cycle), anomaly, longitude);
  };

  const sunsetJulian = crossing(-0.833);
  const goldenJulian = crossing(6);
  if (sunsetJulian == null) return { sunrise: null, sunset: null, goldenStart: null, goldenEnd: null };
  const sunriseJulian = noon - (sunsetJulian - noon);
  return {
    sunrise: fromJulian(sunriseJulian),
    sunset: fromJulian(sunsetJulian),
    goldenStart: goldenJulian == null ? null : fromJulian(goldenJulian),
    goldenEnd: goldenJulian == null ? null : fromJulian(noon - (goldenJulian - noon))
  };
}

export function solarAzimuth(date, lat, lng) {
  const days = toDays(date);
  const longitude = eclipticLongitude(solarMeanAnomaly(days));
  const solarDeclination = declination(longitude);
  const hourAngle = RAD * (280.16 + 360.9856235 * days) + lng * RAD - rightAscension(longitude);
  const azimuthFromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(lat * RAD) - Math.tan(solarDeclination) * Math.cos(lat * RAD)
  );
  return (azimuthFromSouth * DEG + 180 + 360) % 360;
}

export function solarElevation(date, lat, lng) {
  const days = toDays(date);
  const longitude = eclipticLongitude(solarMeanAnomaly(days));
  const solarDeclination = declination(longitude);
  const hourAngle = RAD * (280.16 + 360.9856235 * days) + lng * RAD - rightAscension(longitude);
  const sinAltitude = Math.sin(lat * RAD) * Math.sin(solarDeclination)
    + Math.cos(lat * RAD) * Math.cos(solarDeclination) * Math.cos(hourAngle);
  return Math.asin(Math.min(1, Math.max(-1, sinAltitude))) * DEG;
}

/** Map solar azimuth/elevation to CSS percentage coords for the sun disk. */
export function sunDiskPosition(azimuthDeg, elevationDeg, {
  fallbackX = 78,
  fallbackY = 19
} = {}) {
  if (!Number.isFinite(azimuthDeg) || !Number.isFinite(elevationDeg) || elevationDeg < -1) {
    return { x: fallbackX, y: fallbackY, valid: false };
  }
  const x = Math.min(92, Math.max(8, 50 + Math.sin(azimuthDeg * RAD) * 38));
  const y = Math.min(86, Math.max(8, 82 - Math.min(elevationDeg, 88) / 88 * 70));
  return { x, y, valid: true };
}

/**
 * 将月球方位/高度角映射到屏幕百分比坐标
 * 映射至中央偏右空旷天幕视觉走廊 (X: 30% ~ 66%, Y: 7% ~ 15%)，确保绝不与顶栏收藏刷新胶囊或时段胶囊按钮产生重叠夹逼
 */
export function moonDiskPosition(azimuthDeg, elevationDeg, {
  fallbackX = 56,
  fallbackY = 11
} = {}) {
  if (!Number.isFinite(azimuthDeg) || !Number.isFinite(elevationDeg) || elevationDeg < -1) {
    return { x: fallbackX, y: fallbackY, valid: false, aboveHorizon: false };
  }
  // 水平方位：东方(90°)偏右(~64%)，南方(180°)居中(~48%)，西方(270°)偏左(~32%)，开阔无遮挡
  const x = Math.min(66, Math.max(30, 48 + Math.sin(azimuthDeg * RAD) * 16));
  // 垂直高度：天顶(90°)位于穹顶(~8%)，地平线(0°)位于天幕底部(~14%)
  const y = Math.min(16, Math.max(7, 14 - (Math.min(Math.max(0, elevationDeg), 90) / 90) * 6));
  return { x, y, valid: true, aboveHorizon: true };
}

/**
 * 天文月相与月球坐标算法 (Jean Meeus 算法)
 */
export function lunarPhase(date = new Date(), lat = 30.27, lng = 120.15) {
  const d = toDays(date);

  // 1. 太阳平黄经与真黄经
  const L_sun = (280.466 + 0.98564736 * d) % 360;
  const M_sun = (357.529 + 0.98560028 * d) % 360;
  const lambda_sun = (L_sun + 1.915 * Math.sin(M_sun * RAD) + 0.020 * Math.sin(2 * M_sun * RAD) + 360) % 360;

  // 2. 月球平黄经、平近点角与升交点黄经
  const L_moon = (218.316 + 13.176396 * d) % 360;
  const M_moon = (134.963 + 13.064993 * d) % 360;
  const F_moon = (93.272 + 13.229350 * d) % 360;

  // 3. 月球真黄经与黄纬摄动修正
  const lambda_moon = (L_moon + 6.289 * Math.sin(M_moon * RAD)
    - 1.274 * Math.sin((M_moon - 2 * (L_moon - lambda_sun)) * RAD)
    + 0.658 * Math.sin(2 * (L_moon - lambda_sun) * RAD)
    - 0.214 * Math.sin(2 * M_moon * RAD)
    - 0.186 * Math.sin(M_sun * RAD)
    + 360) % 360;
  const beta_moon = 5.128 * Math.sin(F_moon * RAD);

  // 4. 日月距角与照亮比例
  const elongation = (lambda_moon - lambda_sun + 360) % 360;
  const phaseFraction = (1 - Math.cos(elongation * RAD)) / 2;
  const isWaxing = elongation < 180;
  const moonAge = (elongation / 360) * 29.530588853;

  // 5. 月相中文名称与分类
  let phaseName = "新月";
  let phaseKey = "new";
  if (elongation < 15 || elongation >= 345) {
    phaseName = "新月 (朔)";
    phaseKey = "new";
  } else if (elongation < 75) {
    phaseName = "蛾眉月";
    phaseKey = "waxing-crescent";
  } else if (elongation < 105) {
    phaseName = "上弦月";
    phaseKey = "first-quarter";
  } else if (elongation < 165) {
    phaseName = "盈凸月";
    phaseKey = "waxing-gibbous";
  } else if (elongation < 195) {
    phaseName = "满月 (望)";
    phaseKey = "full";
  } else if (elongation < 255) {
    phaseName = "亏凸月";
    phaseKey = "waning-gibbous";
  } else if (elongation < 285) {
    phaseName = "下弦月";
    phaseKey = "last-quarter";
  } else {
    phaseName = "残月";
    phaseKey = "waning-crescent";
  }

  // 6. 农历月日格式化 (利用 Intl 原生中历引擎)
  let lunarDate = "";
  try {
    const formatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "long", day: "numeric" });
    const parts = formatter.format(date);
    const match = parts.match(/^(.*?)(\d+)日?$/);
    if (match) {
      const monthPart = match[1];
      const dayNum = parseInt(match[2], 10);
      const dayNames = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
        "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
        "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
      lunarDate = `农历${monthPart}${dayNames[dayNum] || match[2]}`;
    } else {
      lunarDate = `农历${parts}`;
    }
  } catch {
    lunarDate = `月龄 ${moonAge.toFixed(1)}天`;
  }

  // 7. 赤道与地平天球坐标 (赤经、赤纬、时角、高度角、方位角)
  const lRad = lambda_moon * RAD;
  const bRad = beta_moon * RAD;
  const x = Math.cos(bRad) * Math.cos(lRad);
  const y = Math.cos(OBLIQUITY) * Math.cos(bRad) * Math.sin(lRad) - Math.sin(OBLIQUITY) * Math.sin(bRad);
  const z = Math.sin(OBLIQUITY) * Math.cos(bRad) * Math.sin(lRad) + Math.cos(OBLIQUITY) * Math.sin(bRad);

  const ra = (Math.atan2(y, x) * DEG + 360) % 360;
  const dec = Math.asin(Math.max(-1, Math.min(1, z))) * DEG;

  const gst = (280.46061837 + 360.98564736629 * d) % 360;
  const lst = (gst + lng + 360) % 360;
  const ha = (lst - ra + 360) % 360;

  const latRad = lat * RAD;
  const decRad = dec * RAD;
  const haRad = ha * RAD;

  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * DEG;

  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * DEG;
  if (Math.sin(haRad) > 0) azimuth = 360 - azimuth;

  const isAboveHorizon = altitude > -1;
  const disk = moonDiskPosition(azimuth, altitude);

  return {
    elongation,
    phaseFraction,
    isWaxing,
    moonAge,
    phaseKey,
    phaseName,
    lunarDate,
    altitude,
    azimuth,
    isAboveHorizon,
    disk
  };
}

/**
 * 生成精确月相切线 SVG 矢量路径
 */
export function lunarSvgPath(fraction, isWaxing, R = 40, cx = 50, cy = 50) {
  const top = `${cx} ${cy - R}`;
  const bottom = `${cx} ${cy + R}`;
  const rx = Math.max(0.1, R * Math.abs(2 * fraction - 1));

  if (fraction >= 0.992) {
    return `M ${cx - R} ${cy} A ${R} ${R} 0 1 0 ${cx + R} ${cy} A ${R} ${R} 0 1 0 ${cx - R} ${cy}`;
  }
  if (fraction <= 0.008) {
    return "";
  }

  if (isWaxing) {
    // 亮面在右：顺时针外圆弧至底部，椭圆内弧回顶部
    const sweep = fraction >= 0.5 ? 1 : 0;
    return `M ${top} A ${R} ${R} 0 0 1 ${bottom} A ${rx.toFixed(2)} ${R} 0 0 ${sweep} ${top} Z`;
  } else {
    // 亮面在左：逆时针外圆弧至底部，椭圆内弧回顶部
    const sweep = fraction >= 0.5 ? 0 : 1;
    return `M ${top} A ${R} ${R} 0 0 0 ${bottom} A ${rx.toFixed(2)} ${R} 0 0 ${sweep} ${top} Z`;
  }
}

/**
 * 生成手帐素描与水墨晕染质感的真实月相 SVG 矢量图形
 * 杜绝生硬几何色块与卡通斑点，采用连续自然月海流线与羽化水墨浸染，大尺寸模式附带复古天象刻度环
 */
export function buildMoonSvg(fraction, isWaxing, size = 72, idPrefix = "moon") {
  const isLarge = size >= 80;
  const R = isLarge ? 38 : 40;
  const cx = 50;
  const cy = 50;
  const litPath = lunarSvgPath(fraction, isWaxing, R, cx, cy);
  const gradId = `${idPrefix}-ivory-wash-${Math.round(fraction * 100)}-${isWaxing ? "w" : "wn"}`;
  const clipId = `${idPrefix}-lit-clip-${Math.round(fraction * 100)}-${isWaxing ? "w" : "wn"}`;
  const blurId = `${idPrefix}-ink-blur`;

  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" class="lunar-moon-svg">
  <defs>
    <!-- 温润素雅的象牙和纸月辉渐变 (契合手帐质感，去除暗哑死黄) -->
    <radialGradient id="${gradId}" cx="42%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#fbf7ee"/>
      <stop offset="76%" stop-color="#eee5d4"/>
      <stop offset="100%" stop-color="#dfd3bf"/>
    </radialGradient>

    <!-- 真实水墨晕染羽化滤镜 (让月海暗斑柔润渗化在和纸上，消除突兀硬圆) -->
    <filter id="${blurId}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.4"/>
    </filter>

    ${litPath ? `<clipPath id="${clipId}"><path d="${litPath}" /></clipPath>` : ""}
  </defs>

  ${isLarge ? `<!-- 复古天象观测刻度规环 (Vintage Celestial Reticle) -->
  <circle cx="${cx}" cy="${cy}" r="46" fill="none" stroke="rgba(195, 175, 145, 0.45)" stroke-width="0.75" stroke-dasharray="2 3"/>
  <line x1="50" y1="1" x2="50" y2="6" stroke="rgba(185, 160, 125, 0.65)" stroke-width="1"/>
  <line x1="50" y1="94" x2="50" y2="99" stroke="rgba(185, 160, 125, 0.65)" stroke-width="1"/>
  <line x1="1" y1="50" x2="6" y2="50" stroke="rgba(185, 160, 125, 0.65)" stroke-width="1"/>
  <line x1="94" y1="50" x2="99" y2="50" stroke="rgba(185, 160, 125, 0.65)" stroke-width="1"/>` : ""}

  <!-- 暗面微光地照底盘 (淡素描铅灰平涂，无黑框突兀边缘) -->
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="rgba(60, 50, 40, 0.15)" stroke="rgba(195, 175, 145, 0.4)" stroke-width="0.75"/>

  <!-- 受光月体 -->
  ${litPath ? `<!-- 受光本体象牙和纸月相 -->
  <path d="${litPath}" fill="url(#${gradId})" />

  <!-- 真实连贯的自然月海水墨流线 (风暴洋、雨海、澄海、静海、危海柔润水墨层) -->
  <g clip-path="url(#${clipId})" filter="url(#${blurId})" opacity="0.30" fill="#4d4235">
    <!-- 西北风暴洋与雨海水墨大团 -->
    <path d="M 35 29 C 26 36, 28 51, 36 57 C 43 61, 47 51, 44 42 C 43 33, 39 26, 35 29 Z"/>
    <!-- 雨海暗影核心 -->
    <ellipse cx="41" cy="35" rx="7" ry="5.5"/>
    <!-- 澄海与静海 (中央偏东水墨层) -->
    <path d="M 46 37 C 52 31, 63 33, 62 44 C 60 52, 49 54, 46 47 C 43 42, 45 39, 46 37 Z"/>
    <!-- 丰富海与危海 (东侧自然暗晕) -->
    <ellipse cx="67" cy="42" rx="4.5" ry="5.5"/>
    <ellipse cx="62" cy="57" rx="5.5" ry="6.5"/>
    <!-- 南部云海与第谷辐射柔影 -->
    <ellipse cx="45" cy="66" rx="7.5" ry="4.5"/>
  </g>

  <!-- 手绘细线素描轮廓 -->
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(185, 165, 135, 0.55)" stroke-width="0.8"/>` : ""}
</svg>`;
}


export function destinationPoint(lat, lng, bearingDeg, distanceKm) {
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const latitude = lat * RAD;
  const longitude = lng * RAD;
  const bearing = bearingDeg * RAD;
  const destinationLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
    Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const destinationLongitude = longitude + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
    Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(destinationLatitude)
  );
  return {
    lat: destinationLatitude * DEG,
    lon: ((destinationLongitude * DEG + 540) % 360) - 180
  };
}

export function buildSamplingPoints(lat, lng, bearingDeg) {
  return {
    local: { lat, lon: lng },
    near: destinationPoint(lat, lng, bearingDeg, 60),
    mid: destinationPoint(lat, lng, bearingDeg, 120),
    far: destinationPoint(lat, lng, bearingDeg, 240),
    left: destinationPoint(lat, lng, bearingDeg - 15, 120),
    right: destinationPoint(lat, lng, bearingDeg + 15, 120)
  };
}

export function hourlyAt(hourly, key, date) {
  const times = hourly?.time;
  const values = hourly?.[key];
  if (!Array.isArray(times) || !Array.isArray(values) || times.length === 0) return null;
  const timestamp = date.getTime() / 1000;
  if (timestamp < times[0] - 5400 || timestamp > times.at(-1) + 5400) return null;
  let upper = times.findIndex((time) => time > timestamp);
  if (upper === -1) upper = times.length;
  const lower = Math.max(0, upper - 1);
  upper = Math.min(times.length - 1, upper);
  const a = values[lower];
  const b = values[upper];
  if (a == null && b == null) return null;
  if (a == null || lower === upper) return b ?? a;
  if (b == null) return a;
  const range = times[upper] - times[lower];
  if (!range) return a;
  return a + (b - a) * ((timestamp - times[lower]) / range);
}

export function metricsAt(bundle, date) {
  const localHourly = bundle?.forecasts?.local?.hourly;
  const remoteWeights = { near: 0.2, mid: 0.3, far: 0.3, left: 0.1, right: 0.1 };
  let weightedLow = 0;
  let availableWeight = 0;
  const availableRemote = [];
  const missingRemote = [];

  for (const [name, weight] of Object.entries(remoteWeights)) {
    const value = hourlyAt(bundle?.forecasts?.[name]?.hourly, "cloud_cover_low", date);
    if (value == null) {
      missingRemote.push(name);
    } else {
      weightedLow += value * weight;
      availableWeight += weight;
      availableRemote.push(name);
    }
  }

  const airHourly = bundle?.air?.hourly;
  return {
    low: hourlyAt(localHourly, "cloud_cover_low", date),
    mid: hourlyAt(localHourly, "cloud_cover_mid", date),
    high: hourlyAt(localHourly, "cloud_cover_high", date),
    rh: hourlyAt(localHourly, "relative_humidity_2m", date),
    vis: hourlyAt(localHourly, "visibility", date),
    precip: hourlyAt(localHourly, "precipitation", date),
    aod: hourlyAt(airHourly, "aerosol_optical_depth", date),
    pm25: hourlyAt(airHourly, "pm2_5", date),
    dust: hourlyAt(airHourly, "dust", date),
    pathLow: availableWeight > 0 ? weightedLow / availableWeight : null,
    availableRemote,
    missingRemote
  };
}

export function scoreSky(metrics) {
  const low = metrics.low ?? 0;
  const mid = metrics.mid ?? 0;
  const high = metrics.high ?? 0;
  const overcast = low > 85 && mid > 70;
  let score = 25;
  score += 48 * gauss(high, 42, 24);
  score += 16 * gauss(mid, 35, 22);
  if (low > 15) score -= 0.75 * (low - 15);
  if (overcast) score = Math.min(score, 10);
  if (metrics.pathLow != null && metrics.pathLow > 15) score -= Math.min(24, 0.4 * (metrics.pathLow - 15));
  if (metrics.rh != null) {
    if (metrics.rh > 65) score -= Math.min(14, (metrics.rh - 65) * 0.4);
    else if (metrics.rh < 40) score += 5;
  }
  if (metrics.vis != null) {
    if (metrics.vis >= 30_000) score += 6;
    else if (metrics.vis < 10_000) score -= Math.min(12, (10_000 - metrics.vis) / 800);
  }
  if (metrics.precip != null && metrics.precip > 0) score -= Math.min(18, metrics.precip * 6);
  if (metrics.aod != null && metrics.aod > 0.3) score -= Math.min(15, (metrics.aod - 0.3) * 30);
  if (metrics.pm25 != null && metrics.pm25 > 35) score -= Math.min(10, (metrics.pm25 - 35) / 5);
  if (metrics.dust != null && metrics.dust > 20) score -= Math.min(8, (metrics.dust - 20) / 10);
  return Math.max(2, Math.min(overcast ? 10 : 99, Math.round(score)));
}

export function sealFor(score) {
  if (score >= 85) return { text: "紫金", sub: "绝艳霞天" };
  if (score >= 70) return { text: "晴金", sub: "绚彩可期" };
  if (score >= 50) return { text: "柔光", sub: "浮云堪赏" };
  if (score >= 30) return { text: "敛光", sub: "云厚光微" };
  return { text: "微茫", sub: "且待新晴" };
}

export function reasonsFor(metrics) {
  const reasons = [];
  const pct = (value) => `${Math.round(value)}%`;
  const low = metrics.low ?? 0;
  const mid = metrics.mid ?? 0;
  const high = metrics.high ?? 0;

  if (high >= 20 && high <= 70) reasons.push(`高云 ${pct(high)}，利于霞光映照生辉`);
  else if (high > 70) reasons.push(`高云 ${pct(high)}，云幕层叠透光受阻`);
  else if (mid >= 20 && mid <= 60) reasons.push(`中云 ${pct(mid)}，丰富霞光层叠肌理`);
  else reasons.push("中高云偏少，天际层次较单薄");
  if (low > 40) reasons.push(`本地低云 ${pct(low)}，地平视线有所遮挡`);
  else reasons.push(`本地低云 ${pct(low)}，近处光路通透`);
  if (metrics.pathLow != null) {
    reasons.push(metrics.pathLow > 40 ? `太阳方向低云 ${pct(metrics.pathLow)}，远端光线难穿透` : `太阳方向低云 ${pct(metrics.pathLow)}，远端光路通畅`);
  }
  if (metrics.rh != null && metrics.rh > 75) reasons.push(`湿度 ${pct(metrics.rh)}，水汽丰沛天色略朦胧`);
  else if (metrics.vis != null && metrics.vis >= 30_000) reasons.push(`能见度 ${Math.round(metrics.vis / 1000)} km，大气清朗通透`);
  if (metrics.precip != null && metrics.precip > 0) reasons.push(`有 ${metrics.precip.toFixed(1)} mm 降水，天色暗淡阴沉`);
  if ((metrics.aod != null && metrics.aod > 0.3) || (metrics.pm25 != null && metrics.pm25 > 35)) reasons.push("空气微浊，落日余晖稍泛暗沉");
  if (metrics.aod == null || metrics.pm25 == null || metrics.missingRemote?.length) reasons.push("部分高空要素缺测，研判仅供参考");
  return reasons.slice(0, 5);
}

export function indexBand(score) {
  if (score >= 80) return "极佳";
  if (score >= 65) return "值得追";
  if (score >= 50) return "有机会";
  if (score >= 35) return "一般";
  return "平淡";
}

export function waitAdvice(score) {
  if (score >= 80) return "值得专程等待";
  if (score >= 65) return "值得追这场霞光";
  if (score >= 50) return "可以顺路看看";
  if (score >= 35) return "有空可以留意";
  return "不建议专程等待";
}

export function nextEvent(type, lat, lng, from = new Date()) {
  if (type !== "sunset" && type !== "sunrise") throw new TypeError('事件类型必须是 "sunset" 或 "sunrise"');
  const graceStart = from.getTime() - 30 * 60 * 1000;
  for (let day = 0; day < 3; day += 1) {
    const probe = new Date(from.getTime() + day * DAY_MS);
    const event = sunTimes(probe, lat, lng)[type];
    if (event && event.getTime() >= graceStart) return event;
  }
  return null;
}
