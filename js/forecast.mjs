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

  const tempStr = Number.isFinite(temperature) ? ` ${Math.round(temperature)}℃` : "";
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
  const civilJulian = crossing(-6);
  if (sunsetJulian == null) {
    return { sunrise: null, sunset: null, goldenStart: null, goldenEnd: null, civilDawn: null, civilDusk: null };
  }
  const sunriseJulian = noon - (sunsetJulian - noon);
  return {
    sunrise: fromJulian(sunriseJulian),
    sunset: fromJulian(sunsetJulian),
    goldenStart: goldenJulian == null ? null : fromJulian(goldenJulian),
    goldenEnd: goldenJulian == null ? null : fromJulian(noon - (goldenJulian - noon)),
    civilDawn: civilJulian == null ? null : fromJulian(noon - (civilJulian - noon)),
    civilDusk: civilJulian == null ? null : fromJulian(civilJulian)
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

const COMPASS_POINTS = ["北", "北偏东", "东北", "东偏北", "东", "东偏南", "东南", "南偏东",
  "南", "南偏西", "西南", "西偏南", "西", "西偏北", "西北", "北偏西"];

// 方位角（正北为 0°，顺时针）转为十六方位中文名
export function compassLabel(azimuthDeg) {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 22.5) % 16];
}

/**
 * 观赏窗口：以事件时刻为锚点，按当天民用晨昏蒙影时长推算。
 * - 霞光：云底受光从日落前约半段蒙影开始，余晖峰值约在日落后半段蒙影，持续到民用昏影终。
 * - 日轮：太阳仰角 6° 至触及地平。
 * 高纬极昼/极夜等无法求解时，以 25 分钟蒙影兜底。
 */
export function viewingWindow(type, eventTime, lat, lng, mode = "glow") {
  const times = sunTimes(eventTime, lat, lng);
  const minute = 60_000;
  const at = (offset) => new Date(eventTime.getTime() + offset);
  const twilight = type === "sunset"
    ? (times.civilDusk && times.sunset ? times.civilDusk - times.sunset : 25 * minute)
    : (times.civilDawn && times.sunrise ? times.sunrise - times.civilDawn : 25 * minute);
  if (mode === "sundisc") {
    const golden = type === "sunset"
      ? (times.goldenStart && times.sunset ? times.sunset - times.goldenStart : 35 * minute)
      : (times.goldenEnd && times.sunrise ? times.goldenEnd - times.sunrise : 35 * minute);
    return type === "sunset"
      ? { start: at(-golden), end: at(2 * minute), peak: eventTime }
      : { start: at(-2 * minute), end: at(golden), peak: eventTime };
  }
  return type === "sunset"
    ? { start: at(-twilight / 2), end: at(twilight), peak: at(twilight / 2) }
    : { start: at(-twilight), end: at(twilight / 2), peak: at(-twilight / 2) };
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

const pct = (value) => `${Math.round(value)}%`;
const km = (value) => `${Math.round(value / 1000)} km`;

function factor(key, label, value, display, gauge, delta, note) {
  // 缺测时沿用评分模型的默认取值计算 delta，只把展示改为“缺测”
  if (value == null || !Number.isFinite(value)) {
    return { key, label, display: "缺测", gauge: null, delta, note: "该要素暂缺" };
  }
  return { key, label, display: display(value), gauge: { value, ...gauge }, delta, note };
}

function sumBreakdown(base, factors, { capAfter = null, cap = null, capNote = null, floor = 2, ceiling = 99 } = {}) {
  let score = base;
  for (const item of factors) {
    score += item.delta;
    if (capAfter === item.key && cap != null) score = Math.min(score, cap);
  }
  if (capAfter == null && cap != null) score = Math.min(score, cap);
  return {
    base,
    factors,
    capNote: cap != null ? capNote : null,
    score: Math.max(floor, Math.min(cap ?? ceiling, Math.round(score)))
  };
}

/**
 * 霞光指数逐项拆解：每一项的 delta 即该要素对分数的增减，主卡下方“影响因素”直接展示。
 * scoreSky 只是取其总分，保证展示与评分永远一致。
 */
export function skyBreakdown(metrics) {
  const { low, mid, high, pathLow, rh, vis, precip, aod, pm25, dust } = metrics;
  const overcast = (low ?? 0) > 85 && (mid ?? 0) > 70;
  const factors = [
    factor("high", "高云", high, pct, { min: 0, max: 100, ideal: [20, 65] },
      48 * (gauss(high ?? 0, 42, 24) - 1),
      high > 70 ? "高云过厚，光线难以透入" : high >= 20 ? "高云适中，受光后最易烧红" : "高云稀少，缺少受光云幕"),
    factor("mid", "中云", mid, pct, { min: 0, max: 100, ideal: [15, 55] },
      16 * (gauss(mid ?? 0, 35, 22) - 1),
      mid > 60 ? "中云偏厚，容易压暗天色" : mid >= 20 ? "中云丰富霞光层次" : "中云偏少，层次单薄"),
    factor("low", "本地低云", low, pct, { min: 0, max: 100, ideal: [0, 15] },
      (low ?? 0) > 15 ? -0.75 * (low - 15) : 0,
      low > 40 ? "本地低云厚，地平视线受阻" : low > 15 ? "本地低云有一定遮挡" : "本地低云少，近处通透"),
    factor("pathLow", "太阳方向低云", pathLow, pct, { min: 0, max: 100, ideal: [0, 15] },
      pathLow != null && pathLow > 15 ? -Math.min(24, 0.4 * (pathLow - 15)) : 0,
      pathLow > 40 ? "远端低云厚，阳光难照到云底" : pathLow > 15 ? "远端有低云，光路部分受阻" : "远端光路通畅，阳光能照上云底"),
    factor("rh", "湿度", rh, pct, { min: 0, max: 100, ideal: [20, 65] },
      rh == null ? 0 : rh > 65 ? -Math.min(14, (rh - 65) * 0.4) : rh < 40 ? 5 : 0,
      rh > 75 ? "水汽丰沛，天色偏朦胧" : rh > 65 ? "湿度略高，色彩稍淡" : rh < 40 ? "空气干爽，色彩更饱和" : "湿度适中"),
    factor("vis", "能见度", vis, km, { min: 0, max: 50_000, ideal: [30_000, 50_000] },
      vis == null ? 0 : vis >= 30_000 ? 6 : vis < 10_000 ? -Math.min(12, (10_000 - vis) / 800) : 0,
      vis >= 30_000 ? "大气清朗，远处云霞清晰" : vis < 10_000 ? "能见度低，远处天色发灰" : "能见度一般"),
    factor("aod", "气溶胶 AOD", aod, (value) => value.toFixed(2), { min: 0, max: 1, ideal: [0, 0.3] },
      aod != null && aod > 0.3 ? -Math.min(15, (aod - 0.3) * 30) : 0,
      aod > 0.3 ? "空气偏浊，余晖发暗" : "空气洁净，色彩纯正"),
    factor("pm25", "PM2.5", pm25, (value) => `${Math.round(value)} μg/m³`, { min: 0, max: 150, ideal: [0, 35] },
      pm25 != null && pm25 > 35 ? -Math.min(10, (pm25 - 35) / 5) : 0,
      pm25 > 35 ? "颗粒物偏多，天色偏灰" : "颗粒物少")
  ];
  if (precip != null && precip > 0) {
    factors.push(factor("precip", "降水", precip, (value) => `${value.toFixed(1)} mm`, { min: 0, max: 5, ideal: [0, 0] },
      -Math.min(18, precip * 6), "有降水，天色暗淡"));
  }
  if (dust != null && dust > 20) {
    factors.push(factor("dust", "沙尘", dust, (value) => `${Math.round(value)} μg/m³`, { min: 0, max: 200, ideal: [0, 20] },
      -Math.min(8, (dust - 20) / 10), "沙尘偏多，色彩发黄发灰"));
  }
  // 基准取理想云况（高云 42%、中云 35%）时的 89 分，云况偏离理想即表现为扣分
  return sumBreakdown(25 + 48 + 16, factors, overcast
    ? { capAfter: "low", cap: 10, capNote: "低云与中云同时厚重，霞光指数封顶 10 分" }
    : {});
}

export function scoreSky(metrics) {
  return skyBreakdown(metrics).score;
}

// 唯一档位表：主卡、印章、7 日卡片与主题色都从这里取值，避免分界各自漂移。
const GRADES = [
  { min: 80, tier: "epic", band: "极佳", advice: "值得专程等待", seal: { text: "紫金", sub: "绝艳霞天" } },
  { min: 65, tier: "great", band: "值得追", advice: "值得追这场霞光", seal: { text: "晴金", sub: "绚彩可期" } },
  { min: 50, tier: "good", band: "有机会", advice: "可以顺路看看", seal: { text: "柔光", sub: "浮云堪赏" } },
  { min: 35, tier: "fair", band: "一般", advice: "有空可以留意", seal: { text: "敛光", sub: "云厚光微" } },
  { min: -Infinity, tier: "dull", band: "平淡", advice: "不建议专程等待", seal: { text: "微茫", sub: "且待新晴" } }
];

export function gradeFor(score) {
  return GRADES.find((grade) => score >= grade.min);
}

export function sealFor(score) {
  return { ...gradeFor(score).seal };
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
  return gradeFor(score).band;
}

export function waitAdvice(score) {
  return gradeFor(score).advice;
}

export function tierFor(score) {
  return gradeFor(score).tier;
}

/**
 * 日出 / 落日 太阳圆盘观赏指数 (Sun Disc Visibility & Aesthetics Score)
 * 核心气象逻辑：
 * 1. 0% 云量（晴空万里）是观日出/落日的顶级条件，基础分为 92 分；
 * 2. 低云（Low Cloud）与远端光路低云（pathLow）是太阳圆盘在地平线（0°~5°）能否露头的致命杀手，惩罚权重极高；
 * 3. 中云较多时遮挡太阳，高云薄卷云少量无碍；
 * 4. 降水、重度霾、大雾等强行封顶。
 */
/**
 * 日轮指数逐项拆解：地平低云是太阳圆盘能否露头的关键，惩罚最重；
 * 厚重低云、阴天与降水按封顶规则处理。
 */
export function sunDiscBreakdown(metrics) {
  const low = metrics?.low;
  const mid = metrics?.mid;
  const high = metrics?.high;
  const pathLow = metrics?.pathLow ?? low;
  const precip = metrics?.precip ?? 0;
  const { vis, rh, aod, pm25 } = metrics ?? {};
  const softened = (aod != null && aod >= 0.16 && aod <= 0.45) || (pm25 != null && pm25 >= 30 && pm25 <= 80);
  const factors = [
    factor("low", "本地低云", low, pct, { min: 0, max: 100, ideal: [0, 8] },
      (low ?? 0) > 8 ? -Math.min(50, (low - 8) * 1.1) : 0,
      low > 40 ? "低云厚，太阳易提前没入云层" : low > 8 ? "地平附近有零散低云" : "低云极少，视线直达地平"),
    factor("pathLow", "太阳方向低云", pathLow, pct, { min: 0, max: 100, ideal: [0, 10] },
      (pathLow ?? 0) > 10 ? -Math.min(40, (pathLow - 10) * 0.9) : 0,
      pathLow > 45 ? "太阳方向低云堆叠，难见完整日轮" : pathLow > 10 ? "太阳方向有低云扰动" : "太阳方向地平通透"),
    factor("mid", "中云", mid, pct, { min: 0, max: 100, ideal: [0, 20] },
      (mid ?? 0) > 20 ? -Math.min(25, (mid - 20) * 0.45) : 0,
      mid > 20 ? "中云可能遮挡日轮" : "中云少，不挡太阳"),
    factor("high", "高云", high, pct, { min: 0, max: 100, ideal: [0, 20] },
      (high ?? 0) <= 20 ? 2 : high > 60 ? -Math.min(12, (high - 60) * 0.3) : 0,
      high > 60 ? "高云厚，日轮轮廓被雾化" : high > 20 ? "薄高云为日轮添一层纱" : "高云少，日轮轮廓清晰"),
    factor("vis", "能见度", vis, km, { min: 0, max: 50_000, ideal: [30_000, 50_000] },
      vis == null ? 0 : vis >= 30_000 ? 4 : vis < 10_000 ? -Math.min(18, (10_000 - vis) / 600) : 0,
      vis >= 30_000 ? "大气通透，地平线清晰如剪影" : vis < 10_000 ? "能见度低，地平泛白" : "能见度一般"),
    factor("rh", "湿度", rh, pct, { min: 0, max: 100, ideal: [0, 80] },
      rh != null && rh > 80 ? -Math.min(10, (rh - 80) * 0.5) : 0,
      rh > 80 ? "水汽重，地平易起薄霭" : "湿度不影响日轮"),
    factor("aod", "气溶胶 AOD", aod, (value) => value.toFixed(2), { min: 0, max: 1, ideal: [0, 0.55] },
      aod != null && aod > 0.55 ? -Math.min(22, (aod - 0.55) * 45) : 0,
      aod > 0.55 ? "灰霾较重，太阳未落地便失色" : softened ? "适度消光滤去眩光，日轮更红润" : "空气洁净，日轮金亮"),
    factor("pm25", "PM2.5", pm25, (value) => `${Math.round(value)} μg/m³`, { min: 0, max: 150, ideal: [0, 80] },
      pm25 != null && pm25 > 80 ? -Math.min(16, (pm25 - 80) / 4) : 0,
      pm25 > 80 ? "颗粒物多，太阳发暗" : "颗粒物不影响日轮")
  ];
  if (precip > 0) {
    factors.push(factor("precip", "降水", precip, (value) => `${value.toFixed(1)} mm`, { min: 0, max: 5, ideal: [0, 0] },
      0, "有降水，云遮雾障"));
  }
  const caps = [
    precip > 0.1 && { cap: 10, capNote: "有降水，日轮指数封顶 10 分" },
    (low ?? 0) > 70 && (mid ?? 0) > 50 && { cap: 8, capNote: "低云与中云同时厚重，日轮指数封顶 8 分" },
    ((low ?? 0) > 40 || (pathLow ?? 0) > 45) && { cap: 18, capNote: "地平低云厚重，日轮指数封顶 18 分" }
  ].filter(Boolean).sort((a, b) => a.cap - b.cap);
  return sumBreakdown(92, factors, caps[0] ?? {});
}

export function scoreSunDisc(metrics) {
  return sunDiscBreakdown(metrics).score;
}

/**
 * 日轮视觉形态智能研判 (Sun Disc Phenomenon)
 * 返回形态分类及属性：
 * - egg_yolk: 🍳 红润咸蛋黄 (Soft Crimson Disc)
 * - crisp_gold: ☀️ 澄金贯日 (Crisp Golden Disc)
 * - crepuscular: ⛅ 云隙漏金 / 丁达尔 (Dramatic Sunbreak)
 * - swallowed: 🌫️ 地平吞日 (Swallowed by Horizon Clouds)
 * - clear_disc: 🌤️ 晴晖丽日 (Clear Disc)
 */
export function sunDiscPhenomenon(metrics, score) {
  const low = metrics?.low ?? 0;
  const pathLow = metrics?.pathLow ?? low;
  const mid = metrics?.mid ?? 0;
  const high = metrics?.high ?? 0;
  const precip = metrics?.precip ?? 0;
  const aod = metrics?.aod;
  const pm25 = metrics?.pm25;
  const vis = metrics?.vis;
  const rh = metrics?.rh;

  // 1. 地平吞日 (Swallowed)
  if (score < 40 || precip > 0.2 || low >= 45 || pathLow >= 50 || (aod != null && aod >= 0.7) || (pm25 != null && pm25 >= 115)) {
    return {
      key: "swallowed",
      name: "地平吞日",
      sub: "隐入云墙",
      icon: "🌫️",
      title: "地平低云遮蔽 · 难见日轮入地",
      desc: precip > 0.2
        ? "降水伴随低空阴云，地平视线完全受阻"
        : low >= 45 || pathLow >= 50
        ? "地平线方向低云堆叠，太阳落山前恐提前没入云墙"
        : "低层尘霾较重，太阳未及地平便已消散失色"
    };
  }

  // 2. 红润咸蛋黄 (Egg Yolk)
  // 条件：低云少（能看到地平），且底层有适量消光气溶胶或适度水汽过滤强光
  const hasExtinction = (aod != null && aod >= 0.16 && aod <= 0.45)
    || (pm25 != null && pm25 >= 30 && pm25 <= 80)
    || (rh != null && rh >= 55 && vis != null && vis >= 10_000 && vis <= 25_000);
  if (score >= 65 && low <= 20 && pathLow <= 25 && hasExtinction) {
    return {
      key: "egg_yolk",
      name: "红润咸蛋黄",
      sub: "融融红日",
      icon: "🍳",
      title: "适度消光滤去眩光 · 柔润可直视",
      desc: "近地气溶胶与水汽自然散射刺目白光，太阳退去强芒，呈现肉眼可直视的温润红盘"
    };
  }

  // 3. 澄金贯日 (Crisp Gold)
  // 条件：低云极低，能见度极高，空气纯净低AOD，光芒万道
  const isSuperClear = (aod == null || aod < 0.16) && (pm25 == null || pm25 < 25) && (vis == null || vis >= 25_000);
  if (score >= 75 && low <= 12 && pathLow <= 15 && isSuperClear) {
    return {
      key: "crisp_gold",
      name: "澄金贯日",
      sub: "极目无遮",
      icon: "☀️",
      title: "极净大气澄澈无瑕 · 金乌朗曜",
      desc: "地平线空旷无障，大气极其通透，金盘光芒万丈，地平呈现纯净绚丽金橙梯度"
    };
  }

  // 4. 云隙漏金 (Crepuscular Rays)
  // 条件：中高云 25%~60%，低云不过分厚，有云缝投射光柱
  if (score >= 50 && low <= 30 && (mid >= 25 || high >= 35)) {
    return {
      key: "crepuscular",
      name: "云隙漏金",
      sub: "破云漏光",
      icon: "⛅",
      title: "云际层叠光影交错 · 丁达尔神光",
      desc: "中高云隙间洒落束束流光金柱，光影明暗交织，具强烈油画质感"
    };
  }

  // 5. 常规晴好日轮 (Clear Disc)
  return {
    key: "clear_disc",
    name: "晴晖丽日",
    sub: "日轮分明",
    icon: "🌅",
    title: "地平通透平稳 · 完整目送晨昏",
    desc: "地平视线通畅，太阳轮廓明晰，可安然静赏日出日落全过程"
  };
}

/**
 * 日轮朱砂印章研判
 */
export function sealForSunDisc(score, phenomenon) {
  if (phenomenon) {
    if (phenomenon.key === "egg_yolk") return { text: "丹曦", sub: "融融红日" };
    if (phenomenon.key === "crisp_gold") return { text: "澄金", sub: "极目无遮" };
    if (phenomenon.key === "crepuscular") return { text: "云隙", sub: "破云漏光" };
    if (phenomenon.key === "swallowed") return { text: "吞日", sub: "隐入云墙" };
  }
  if (score >= 85) return { text: "圆明", sub: "金乌朗曜" };
  if (score >= 70) return { text: "清晖", sub: "日轮分明" };
  if (score >= 50) return { text: "薄霭", sub: "微光映影" };
  if (score >= 30) return { text: "敛曜", sub: "地平云重" };
  return { text: "微茫", sub: "日隐重云" };
}

/**
 * 日轮天空线索 (Reasons for Sun Disc)
 */
export function reasonsForSunDisc(metrics, phenomenon) {
  const reasons = [];
  const pct = (value) => `${Math.round(value)}%`;
  const low = metrics?.low ?? 0;
  const pathLow = metrics?.pathLow ?? low;
  const mid = metrics?.mid ?? 0;
  const high = metrics?.high ?? 0;

  if (low <= 15 && pathLow <= 15) {
    reasons.push(`地平低云仅 ${pct(Math.max(low, pathLow))}，视线直达天际无遮挡`);
  } else if (low > 40 || pathLow > 45) {
    reasons.push(`太阳方向低云 ${pct(Math.max(low, pathLow))}，太阳易提前沉入云层`);
  } else {
    reasons.push(`低云 ${pct(low)}，地平附近稍有零散云气扰动`);
  }

  if (phenomenon?.key === "egg_yolk") {
    reasons.push("底层气溶胶适度消光，太阳柔和不刺目，呈红润圆盘");
  } else if (phenomenon?.key === "crisp_gold") {
    reasons.push(`能见度 ${metrics?.vis ? Math.round(metrics.vis / 1000) + " km" : "极佳"}，空气纤尘不染，金光夺目`);
  } else if (phenomenon?.key === "crepuscular") {
    reasons.push(`中云 ${pct(mid)}，云块开合易形成破空云隙光柱`);
  } else if (high > 50) {
    reasons.push(`高云 ${pct(high)}，太阳轮廓略带薄纱晕染`);
  }

  if (metrics?.vis != null) {
    if (metrics.vis >= 30_000) reasons.push("大气极其通透，地平线轮廓如剪纸般清晰");
    else if (metrics.vis < 10_000) reasons.push(`能见度仅 ${Math.round(metrics.vis / 1000)} km，远方天空泛白略浑浊`);
  }

  if (metrics?.rh != null && metrics.rh > 75) {
    reasons.push(`湿度 ${pct(metrics.rh)}，水汽较盛可能加深地平薄霭`);
  }

  if (metrics?.precip != null && metrics.precip > 0) {
    reasons.push(`降水 ${metrics.precip.toFixed(1)} mm，云遮雾障无缘观日`);
  }

  return reasons.slice(0, 5);
}

/**
 * 日轮摄影与观赏建议
 */
export function photographicAdviceForSunDisc(metrics, score, phenomenon, eventType) {
  const eventLabel = eventType === "sunrise" ? "日出" : "日落";
  if (phenomenon?.key === "egg_yolk") {
    return `${eventLabel}圆润红艳如咸蛋黄，光线柔和，长焦与地景特写绝佳`;
  }
  if (phenomenon?.key === "crisp_gold") {
    return "万里无云、地平通透至极，宜用小光圈拍摄金阳星芒与大地剪影";
  }
  if (phenomenon?.key === "crepuscular") {
    return "云层开合有致，极易偶遇丁达尔云隙光，适宜广角捕捉神圣光柱";
  }
  if (phenomenon?.key === "swallowed") {
    return `地平低云厚重，太阳恐怕提前隐入云墙，难见完整${eventLabel}`;
  }
  if (score >= 75) {
    return `地平视线通畅，${eventLabel}过程完整清晰，适宜驻足静静守候`;
  }
  return "低空云气略显杂乱，可留意太阳穿出云隙的短暂瞬间";
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
