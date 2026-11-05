import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSamplingPoints,
  indexBand,
  lightFromSunClock,
  metricsAt,
  nextEvent,
  scoreSky,
  hasCloudLayers,
  twilightWarmthFor,
  skyBreakdown,
  sunDiscBreakdown,
  viewingWindow,
  sunTimes,
  compassLabel,
  tierFor,
  scoreSunDisc,
  sunDiscPhenomenon,
  solarAzimuth,
  solarElevation,
  stormLevelFor,
  sunDiskPosition,
  moonDiskPosition,
  lunarPhase,
  lunarSvgPath,
  weatherConditionFor,
  weatherTheme
} from "../js/forecast.mjs";

const cleanSky = {
  low: 5, mid: 35, high: 42, rh: 35, vis: 40_000, precip: 0,
  aod: 0.1, pm25: 8, dust: 4, pathLow: 5
};

function hourly(value) {
  return { time: [0, 3600], cloud_cover_low: [value, value] };
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

test("理想中高云且空气清洁达到极佳", () => {
  const score = scoreSky(cleanSky);
  assert.ok(score >= 80);
  assert.equal(indexBand(score), "极佳");
});

test("评分文字与主题档位共用同一组分界", () => {
  for (const [score, band, tier] of [
    [80, "极佳", "epic"], [79, "值得追", "great"],
    [65, "值得追", "great"], [64, "有机会", "good"],
    [50, "有机会", "good"], [49, "一般", "fair"],
    [35, "一般", "fair"], [34, "平淡", "dull"]
  ]) {
    assert.equal(indexBand(score), band);
    assert.equal(tierFor(score), tier);
  }
});

test("低云和中云同时厚重时封顶 10", () => {
  const score = scoreSky({ ...cleanSky, low: 90, mid: 80, high: 42, pathLow: 5 });
  assert.ok(score <= 10);
});

test("高 AOD 和 PM2.5 只降低相同云况得分", () => {
  const polluted = scoreSky({ ...cleanSky, aod: 0.8, pm25: 90 });
  assert.ok(polluted < scoreSky(cleanSky));
});

test("太阳方向高低云覆盖降低得分", () => {
  assert.ok(scoreSky({ ...cleanSky, pathLow: 90 }) < scoreSky({ ...cleanSky, pathLow: 5 }));
});

test("远端缺失权重归一化且全缺失返回 null", () => {
  const bundle = {
    forecasts: {
      local: { hourly: hourly(5) },
      near: { hourly: hourly(20) },
      mid: null,
      far: { hourly: hourly(80) },
      left: null,
      right: null
    },
    air: null
  };
  const metrics = metricsAt(bundle, new Date(0));
  assert.equal(metrics.pathLow, 56);
  assert.deepEqual(metrics.availableRemote, ["near", "far"]);
  assert.deepEqual(metrics.missingRemote, ["mid", "left", "right"]);
  for (const name of ["near", "mid", "far", "left", "right"]) bundle.forecasts[name] = null;
  assert.equal(metricsAt(bundle, new Date(0)).pathLow, null);
});

test("远端低云全缺失时沿用本地低云评分但展示为缺测", () => {
  const local = {
    time: [0],
    cloud_cover_low: [48],
    cloud_cover_mid: [12],
    cloud_cover_high: [8],
    relative_humidity_2m: [55],
    visibility: [25_000],
    precipitation: [0]
  };
  const metrics = metricsAt({ forecasts: { local: { hourly: local } } }, new Date(0));
  const missing = sunDiscBreakdown(metrics);
  const measuredFallback = sunDiscBreakdown({ ...metrics, pathLow: metrics.low });
  const pathLow = missing.factors.find((item) => item.key === "pathLow");

  assert.equal(metrics.pathLow, null);
  assert.equal(missing.score, measuredFallback.score);
  assert.equal(pathLow.delta, measuredFallback.factors.find((item) => item.key === "pathLow").delta);
  assert.deepEqual(
    { display: pathLow.display, gauge: pathLow.gauge, note: pathLow.note },
    { display: "缺测", gauge: null, note: "该要素暂缺" }
  );
});

test("北京采样生成六个不同且距离准确的点", () => {
  const origin = { lat: 39.9042, lon: 116.4074 };
  const points = buildSamplingPoints(origin.lat, origin.lon, 270);
  assert.equal(Object.keys(points).length, 6);
  assert.equal(new Set(Object.values(points).map((point) => `${point.lat.toFixed(5)},${point.lon.toFixed(5)}`)).size, 6);
  const expected = { near: 60, mid: 120, far: 240, left: 120, right: 120 };
  for (const [name, distance] of Object.entries(expected)) {
    assert.ok(Math.abs(distanceKm(origin, points[name]) - distance) < 1, name);
  }
});

test("下一次日落可查且极昼不抛错", () => {
  const from = new Date("2026-03-20T00:00:00Z");
  const sunset = nextEvent("sunset", 0, 0, from);
  assert.ok(sunset instanceof Date);
  assert.ok(sunset > from);
  assert.equal(nextEvent("sunset", 89, 0, new Date("2026-06-21T12:00:00Z")), null);
});

test("实时天气映射覆盖八种背景天气与昼夜状态", () => {
  const cases = [
    [{ weatherCode: 0, isDay: 1 }, { weather: "clear", light: "day" }],
    [{ weatherCode: 2, isDay: 1 }, { weather: "partly", light: "day" }],
    [{ weatherCode: 3, isDay: 1 }, { weather: "overcast", light: "day" }],
    [{ weatherCode: 45, isDay: 0 }, { weather: "fog", light: "night" }],
    [{ weatherCode: 61, isDay: 0 }, { weather: "rain", light: "night" }],
    [{ weatherCode: 0, snowfall: 0.2, isDay: 1 }, { weather: "snow", light: "day" }],
    [{ weatherCode: 95, isDay: 1 }, { weather: "thunder", light: "day" }],
    [{ weatherCode: 96, isDay: 0 }, { weather: "hail", light: "night" }]
  ];
  for (const [input, expected] of cases) assert.deepEqual(weatherTheme(input), expected);
});

test("天气代码优先级让冰雹、雷暴和降雪胜过降水", () => {
  assert.equal(weatherTheme({ weatherCode: 99, snowfall: 1, precipitation: 2 }).weather, "hail");
  assert.equal(weatherTheme({ weatherCode: 95, snowfall: 1, precipitation: 2 }).weather, "thunder");
  assert.equal(weatherTheme({ weatherCode: 71, precipitation: 2 }).weather, "snow");
  assert.equal(weatherTheme({ weatherCode: 48 }).weather, "fog");
});

test("风暴等级覆盖边界、缺失字段与低气压增强", () => {
  assert.equal(stormLevelFor(), "calm");
  assert.equal(stormLevelFor({ windSpeed: 24.9, windGust: 39.9, pressure: 1000 }), "calm");
  assert.equal(stormLevelFor({ windSpeed: 25 }), "breezy");
  assert.equal(stormLevelFor({ windGust: 60 }), "strong");
  assert.equal(stormLevelFor({ windSpeed: 60 }), "severe");
  assert.equal(stormLevelFor({ windGust: 80 }), "severe");
  assert.equal(stormLevelFor({ pressure: 999 }), "breezy");
  assert.equal(stormLevelFor({ pressure: 984 }), "strong");
  assert.equal(stormLevelFor({ pressure: 969 }), "severe");
});

test("本地太阳钟覆盖过期的 is_day，极昼极夜回退 API 昼夜", () => {
  const sunrise = new Date("2026-06-21T04:00:00Z");
  const sunset = new Date("2026-06-21T18:00:00Z");
  assert.equal(lightFromSunClock(new Date("2026-06-21T12:00:00Z"), { sunrise, sunset }, "night"), "day");
  assert.equal(lightFromSunClock(new Date("2026-06-21T20:00:00Z"), { sunrise, sunset }, "day"), "night");
  assert.equal(lightFromSunClock(new Date("2026-06-21T03:00:00Z"), { sunrise, sunset }, "day"), "night");
  assert.equal(lightFromSunClock(new Date("2026-06-21T12:00:00Z"), {}, "night"), "night");
  assert.equal(lightFromSunClock(new Date("2026-06-21T12:00:00Z"), { sunrise: null, sunset: null }, "day"), "day");
});

test("旧缓存缺少 current 字段时回退到当前小时云量与本地昼夜", () => {
  assert.deepEqual(
    weatherTheme({ cloudCover: 82, fallbackLight: "night" }),
    { weather: "overcast", light: "night" }
  );
});

test("微量降水不触发雨雪主题，太阳方位可映射到屏幕坐标", () => {
  assert.equal(weatherTheme({ weatherCode: 0, precipitation: 0.02 }).weather, "clear");
  assert.equal(weatherTheme({ weatherCode: 0, snowfall: 0.01 }).weather, "clear");
  assert.equal(weatherTheme({ weatherCode: 0, precipitation: 0.08 }).weather, "rain");

  const noon = new Date("2026-06-21T04:00:00Z");
  const az = solarAzimuth(noon, 31.2, 121.5);
  const el = solarElevation(noon, 31.2, 121.5);
  assert.ok(az >= 0 && az < 360);
  assert.ok(el > 20);
  const disk = sunDiskPosition(az, el);
  assert.equal(disk.valid, true);
  assert.ok(disk.x > 8 && disk.x < 92);
  assert.ok(disk.y > 8 && disk.y < 70);
  assert.deepEqual(sunDiskPosition(180, -10), { x: 78, y: 19, valid: false });
});

test("实况天气中文描述与温度准确映射", () => {
  const xiamen = weatherConditionFor({
    weather: "partly",
    weatherCode: 1,
    isDay: 1,
    cloudCover: 49,
    temperature: 28.7
  });
  assert.equal(xiamen.label, "晴间多云");
  assert.equal(xiamen.summary, "晴间多云 29℃");

  const overcast = weatherConditionFor({ weather: "overcast", isDay: 1, temperature: 22.1 });
  assert.equal(overcast.label, "阴天");
  assert.equal(overcast.summary, "阴天 22℃");

  const thunder = weatherConditionFor({ weather: "thunder", weatherCode: 95, isDay: 1, precipitation: 4 });
  assert.equal(thunder.label, "雷阵雨");
  assert.equal(thunder.summary, "雷阵雨");

  const clearNight = weatherConditionFor({ weather: "clear", isDay: 0, temperature: 18 });
  assert.equal(clearNight.label, "晴朗");
  assert.equal(clearNight.summary, "晴朗 18℃");
});

test("天文月相算法准确计算照亮比例、月相命名与地点时区农历映射", () => {
  const hangzhouZone = "Asia/Shanghai";

  // 同一绝对时刻按杭州当地日期应为农历九月十六。
  const hangzhouMoon = lunarPhase(new Date("2026-10-24T17:00:00Z"), 30.27, 120.15, hangzhouZone);
  assert.equal(hangzhouMoon.lunarDate, "农历九月十六");

  // 1. 中秋满月 (2026-09-25)
  const fullMoon = lunarPhase(new Date("2026-09-25T20:00:00+08:00"), 30.27, 120.15, hangzhouZone);
  assert.ok(fullMoon.phaseFraction > 0.95);
  assert.ok(fullMoon.phaseName.includes("满月") || fullMoon.phaseName.includes("望"));
  assert.equal(fullMoon.lunarDate, "农历八月十五");

  // 2. 亏凸月 (2026-09-28)
  const waningGibbous = lunarPhase(new Date("2026-09-28T19:00:00+08:00"), 30.27, 120.15, hangzhouZone);
  assert.equal(waningGibbous.phaseName, "亏凸月");
  assert.equal(waningGibbous.isWaxing, false);
  assert.ok(waningGibbous.phaseFraction > 0.9);

  // 3. 新月朔日 (2026-09-11)
  const newMoon = lunarPhase(new Date("2026-09-11T20:00:00+08:00"), 30.27, 120.15, hangzhouZone);
  assert.ok(newMoon.phaseFraction < 0.05);
  assert.equal(newMoon.phaseName, "新月 (朔)");

  // 4. 上弦月 (2026-09-18)
  const quarter = lunarPhase(new Date("2026-09-18T20:00:00+08:00"), 30.27, 120.15, hangzhouZone);
  assert.ok(Math.abs(quarter.phaseFraction - 0.5) < 0.1);
  assert.equal(quarter.phaseName, "上弦月");
  assert.equal(quarter.isWaxing, true);

  assert.doesNotThrow(() => lunarPhase(
    new Date("2026-10-24T17:00:00Z"), 30.27, 120.15, "Invalid/Place"
  ));
});

test("月球屏幕映射与月相矢量 SVG 路径生成", () => {
  // 屏幕映射在合理视口范围内
  const pos = moonDiskPosition(120, 35);
  assert.equal(pos.valid, true);
  assert.equal(pos.aboveHorizon, true);
  assert.ok(pos.x >= 10 && pos.x <= 90);
  assert.ok(pos.y >= 5 && pos.y <= 20);

  // 地平线下回退
  const sub = moonDiskPosition(120, -15);
  assert.equal(sub.aboveHorizon, false);

  // SVG 路径生成
  const fullSvg = lunarSvgPath(1.0, true, 40, 50, 50);
  assert.ok(fullSvg.includes("A 40 40"));

  const halfWaxSvg = lunarSvgPath(0.5, true, 40, 50, 50);
  assert.ok(halfWaxSvg.startsWith("M 50 10"));
  assert.ok(halfWaxSvg.includes("A 40 40 0 0 1 50 90"));

  const halfWanSvg = lunarSvgPath(0.5, false, 40, 50, 50);
  assert.ok(halfWanSvg.startsWith("M 50 10"));
  assert.ok(halfWanSvg.includes("A 40 40 0 0 0 50 90"));
});

test("晴空万里时日轮评分达到 90 分以上且霞光处于较低分", () => {
  const clearSky0 = {
    low: 0, mid: 0, high: 0, pathLow: 0,
    vis: 35_000, rh: 40, precip: 0, aod: 0.08, pm25: 10
  };
  const sunScore = scoreSunDisc(clearSky0);
  const glowScore = scoreSky(clearSky0);

  assert.ok(sunScore >= 90, `晴空日轮评分应 >= 90，实测 ${sunScore}`);
  assert.ok(glowScore <= 55, `晴空无云霞光评分应处于中低分段，实测 ${glowScore}`);
  assert.ok(sunScore - glowScore >= 35, `日轮评分应显著高于无云霞光评分，差值实测 ${sunScore - glowScore}`);
});

test("厚重低云或降水严重压制日轮观赏得分并触发地平吞日", () => {
  const overcastHorizon = {
    low: 55, mid: 20, high: 10, pathLow: 60,
    vis: 12_000, rh: 70, precip: 0, aod: 0.2
  };
  const rainHorizon = {
    low: 10, mid: 10, high: 10, pathLow: 10,
    vis: 15_000, rh: 85, precip: 1.5, aod: 0.2
  };

  const overcastScore = scoreSunDisc(overcastHorizon);
  assert.ok(overcastScore <= 18, `地平厚低云应压制在 18 分以下，实测 ${overcastScore}`);
  const phenOvercast = sunDiscPhenomenon(overcastHorizon, overcastScore);
  assert.equal(phenOvercast.key, "swallowed");

  const rainScore = scoreSunDisc(rainHorizon);
  assert.ok(rainScore <= 10, `降水应压制在 10 分以下，实测 ${rainScore}`);
  const phenRain = sunDiscPhenomenon(rainHorizon, rainScore);
  assert.equal(phenRain.key, "swallowed");
});

test("适度气溶胶与通透地平准确判定为红润咸蛋黄", () => {
  const eggYolkSky = {
    low: 4, mid: 5, high: 10, pathLow: 6,
    vis: 18_000, rh: 55, precip: 0, aod: 0.26, pm25: 45
  };
  const score = scoreSunDisc(eggYolkSky);
  assert.ok(score >= 80, `咸蛋黄天气日轮评分应较高，实测 ${score}`);

  const phen = sunDiscPhenomenon(eggYolkSky, score);
  assert.equal(phen.key, "egg_yolk");
});

test("极度清朗无污染触发澄金贯日", () => {
  const crispSky = {
    low: 0, mid: 0, high: 5, pathLow: 0,
    vis: 45_000, rh: 30, precip: 0, aod: 0.06, pm25: 8
  };
  const score = scoreSunDisc(crispSky);
  assert.ok(score >= 90);

  const phen = sunDiscPhenomenon(crispSky, score);
  assert.equal(phen.key, "crisp_gold");
});

test("中高云开合触发云隙漏金", () => {
  const breakSky = {
    low: 15, mid: 45, high: 40, pathLow: 18,
    vis: 25_000, rh: 50, precip: 0, aod: 0.12, pm25: 15
  };
  const score = scoreSunDisc(breakSky);
  assert.ok(score >= 50);

  const phen = sunDiscPhenomenon(breakSky, score);
  assert.equal(phen.key, "crepuscular");
});



test("逐项拆解的基准分加各项增减与评分一致（未触发封顶时）", () => {
  for (const [breakdown, metrics] of [
    [skyBreakdown, cleanSky],
    [skyBreakdown, { ...cleanSky, low: 30, rh: 80, vis: 8000, aod: 0.5 }],
    [sunDiscBreakdown, { low: 5, mid: 30, high: 70, pathLow: 8, vis: 20_000, rh: 85, aod: 0.6, pm25: 90 }]
  ]) {
    const result = breakdown(metrics);
    const sum = result.base + result.factors.reduce((total, item) => total + item.delta, 0);
    assert.equal(result.capNote, null);
    assert.equal(result.score, Math.max(2, Math.min(99, Math.round(sum))));
  }
});

test("厚重低云触发封顶时给出封顶说明", () => {
  const result = skyBreakdown({ ...cleanSky, low: 90, mid: 80 });
  assert.ok(result.score <= 10);
  assert.match(result.capNote, /封顶 10 分/);
});

test("观赏窗口包住事件时刻，霞光峰值在日落之后、日出之前", () => {
  const sunset = sunTimes(new Date("2026-10-24T04:00:00Z"), 30.27, 120.15).sunset;
  const dusk = viewingWindow("sunset", sunset, 30.27, 120.15);
  assert.ok(dusk.start < sunset && sunset < dusk.peak && dusk.peak < dusk.end);
  const minutes = (dusk.end - dusk.start) / 60_000;
  assert.ok(minutes > 25 && minutes < 60, `窗口时长 ${minutes} 分钟`);

  const sunrise = sunTimes(new Date("2026-10-24T04:00:00Z"), 30.27, 120.15).sunrise;
  const dawn = viewingWindow("sunrise", sunrise, 30.27, 120.15);
  assert.ok(dawn.start < dawn.peak && dawn.peak < sunrise && sunrise < dawn.end);

  const disc = viewingWindow("sunset", sunset, 30.27, 120.15, "sundisc");
  assert.equal(disc.peak, sunset);
  assert.ok(disc.start < sunset && sunset < disc.end);
});

test("方位角转十六方位中文名", () => {
  assert.equal(compassLabel(0), "北");
  assert.equal(compassLabel(359), "北");
  assert.equal(compassLabel(90), "东");
  assert.equal(compassLabel(225), "西南");
  assert.equal(compassLabel(257), "西偏南");
  assert.equal(compassLabel(-90), "西");
});

test("三层云量缺任意一层时不做研判", () => {
  assert.equal(hasCloudLayers({ low: 10, mid: 20, high: 30 }), true);
  assert.equal(hasCloudLayers({ low: 10, mid: null, high: 30 }), false);
  assert.equal(hasCloudLayers({ low: Number.NaN, mid: 20, high: 30 }), false);
});

test("晨昏暖色在日落附近最高、正午为零", () => {
  const sun = sunTimes(new Date("2026-10-24T04:00:00Z"), 30.27, 120.15);
  const noon = new Date("2026-10-24T04:00:00Z");
  assert.equal(twilightWarmthFor(noon, sun), 0);
  const nearSunset = new Date(sun.sunset.getTime() - 5 * 60_000);
  assert.ok(twilightWarmthFor(nearSunset, sun) > 0.6);
  assert.equal(twilightWarmthFor(noon, { sunrise: null, sunset: null }), 0);
});
