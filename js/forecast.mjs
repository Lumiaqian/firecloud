const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const OBLIQUITY = RAD * 23.4397;
const EARTH_RADIUS_KM = 6371.0088;

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

export function reasonsFor(metrics) {
  const reasons = [];
  const pct = (value) => `${Math.round(value)}%`;
  const low = metrics.low ?? 0;
  const mid = metrics.mid ?? 0;
  const high = metrics.high ?? 0;

  if (high >= 20 && high <= 70) reasons.push(`高云 ${pct(high)}，具备染色画布`);
  else if (high > 70) reasons.push(`高云 ${pct(high)}，云幕可能偏厚`);
  else if (mid >= 20 && mid <= 60) reasons.push(`中云 ${pct(mid)}，可增加纹理`);
  else reasons.push("中高云偏少，色彩层次有限");
  if (low > 40) reasons.push(`本地低云 ${pct(low)}，可能遮挡地平线`);
  else reasons.push(`本地低云 ${pct(low)}，近处光路较通畅`);
  if (metrics.pathLow != null) {
    reasons.push(metrics.pathLow > 40 ? `太阳方向低云 ${pct(metrics.pathLow)}，远端遮挡明显` : `太阳方向低云 ${pct(metrics.pathLow)}，远端光路尚可`);
  }
  if (metrics.rh != null && metrics.rh > 75) reasons.push(`湿度 ${pct(metrics.rh)}，色彩可能发灰`);
  else if (metrics.vis != null && metrics.vis >= 30_000) reasons.push(`能见度 ${Math.round(metrics.vis / 1000)} km，空气通透`);
  if (metrics.precip != null && metrics.precip > 0) reasons.push(`有 ${metrics.precip.toFixed(1)} mm 降水，霞光受抑制`);
  if ((metrics.aod != null && metrics.aod > 0.3) || (metrics.pm25 != null && metrics.pm25 > 35)) reasons.push("气溶胶或 PM2.5 偏高，色彩可能减弱");
  if (metrics.aod == null || metrics.pm25 == null || metrics.missingRemote?.length) reasons.push("部分辅助数据缺失，指数仅供参考");
  return reasons.slice(0, 5);
}

export function indexBand(score) {
  if (score >= 80) return "极佳";
  if (score >= 65) return "值得追";
  if (score >= 50) return "有机会";
  if (score >= 35) return "一般";
  return "平淡";
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
