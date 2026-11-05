// 月相：天幕上的月亮、主卡夜间月相签条与月相详情弹窗。
import { lunarSvgPath } from "../forecast.mjs";
import { $ } from "./dom.mjs";

// 原稿的平面月盘与坑纹；亮面仍由生产历算的比例、盈亏方向生成。
export function moonStudyMarkup(fraction, isWaxing, prefix = "study") {
  const path = lunarSvgPath(fraction, isWaxing, 88, 100, 100);
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="${prefix}-lit"><path d="${path}"/></clipPath></defs><circle cx="100" cy="100" r="88" fill="var(--moon-dark,#263b43)" stroke="var(--moon-outline,#9ba99a)" stroke-width=".6"/><path d="${path}" fill="var(--moon-lit,#e5e3c9)"/><g clip-path="url(#${prefix}-lit)" fill="var(--moon-crater,#a3aa96)" opacity=".3"><ellipse cx="132" cy="74" rx="22" ry="17"/><ellipse cx="145" cy="113" rx="16" ry="26"/><circle cx="113" cy="143" r="11"/><circle cx="151" cy="150" r="6"/></g></svg>`;
}

function observationFor({ phaseFraction: fraction, isWaxing, isAboveHorizon }) {
  if (!isAboveHorizon) return ["月已落，先看星空", "月亮已在地平线下，当前无法观月。可先寻找暗夜星空中的目标。", "月相仍在，当前观测位置不可见。"];
  if (fraction <= .05) return ["宜等候暗夜", "入夜后月光干扰少，适合深空观测与银河拍摄；勿向太阳附近寻月。", "亮面不可见；暗圆仅为月相示意。"];
  if (fraction >= .9) return ["宜赏月与地景", "试着用长焦把月亮与远处地景放在一起，记录满月夜景。", "一轮亮面，银辉落进夜色。"];
  if (fraction < .4) return isWaxing
    ? ["宜与暮色同框", "趁暮光还未散尽，将细月与地景同框，留意暗面的地照微光。", "一弯银钩，暗面留有微弱地照。"]
    : ["宜与破晓同框", "日出前留意东方低空的细月；天亮后勿向太阳附近寻月。", "破晓前的细月，亮面朝向东方。"];
  return isWaxing
    ? ["宜看环形山", "沿晨昏分界寻找环形山与月海，明暗的交界最有层次。", "明暗交界分明，山海有了轮廓。"]
    : ["宜看晨间月面", "黎明前看明暗交界，留意亏月的山影与环形山。", "同一轮明月，亮面已转向另一侧。"];
}

export function createMoonView() {
  const els = {
    skyMoon: $("sky-moon"), skyDisk: $("sky-moon-disk"), skyHalo: $("sky-moon-halo"),
    badgeIcon: $("lunar-badge-icon"), badgeText: $("lunar-badge-text"),
    dialogMoon: $("lunar-dialog-moon"), dialogName: $("lunar-dialog-name"), dialogDate: $("lunar-dialog-date"),
    fraction: $("lunar-cell-fraction"), age: $("lunar-cell-age"), alt: $("lunar-cell-alt"), az: $("lunar-cell-az"),
    advice: $("lunar-dialog-advice"), stamp: $("lunar-dialog-stamp"),
    figure: $("lunar-moon-figure"), below: $("lunar-below-mark"), halo: $("lunar-study-halo"),
    visibility: $("lunar-dialog-visibility"), observedAt: $("lunar-observed-at"),
    altLabel: $("lunar-alt-label"), azLabel: $("lunar-az-label")
  };
  let observation = {};
  const dialog = $("lunar-dialog");
  dialog.addEventListener("toggle", () => {
    if (!dialog.open) return;
    const fields = {
      "lunar-context-place": "home-place-name",
      "lunar-context-event": "entry-tag",
      "lunar-context-score": "score",
      "lunar-context-grade": "band",
      "lunar-context-time": "event-time",
      "lunar-context-window": "window-range"
    };
    for (const [target, source] of Object.entries(fields)) $(target).textContent = $(source).textContent;
  });

  return {
    render(moon, context = observation) {
      if (!moon) return;
      observation = context;
      const { phaseFraction: fraction, isWaxing } = moon;
      dialog.dataset.phase = !moon.isAboveHorizon ? "below" : fraction <= .008 ? "new" : isWaxing ? "waxing" : "waning";
      els.skyMoon.hidden = !moon.isAboveHorizon;
      els.skyHalo.hidden = fraction <= .008;
      els.skyDisk.innerHTML = moonStudyMarkup(fraction, isWaxing, "sky");
      els.skyHalo.style.transform = `scale(${(0.7 + fraction * 0.6).toFixed(2)})`;
      els.skyHalo.style.opacity = (0.25 + fraction * 0.5).toFixed(2);

      els.badgeIcon.innerHTML = moonStudyMarkup(fraction, isWaxing, "badge");
      els.badgeText.textContent = `${moon.phaseName}${moon.isAboveHorizon ? "" : " · 地平线下"} ↗`;

      els.dialogMoon.innerHTML = moonStudyMarkup(fraction, isWaxing, "lunar-detail");
      els.dialogMoon.setAttribute("aria-label", `${moon.phaseName}月相示意，照亮面${(fraction * 100).toFixed(1)}%`);
      els.figure.hidden = !moon.isAboveHorizon;
      els.below.hidden = moon.isAboveHorizon;
      els.halo.hidden = fraction <= .008;
      els.dialogName.textContent = moon.phaseName;
      els.dialogDate.textContent = `${moon.lunarDate} · 日月距角 ${moon.elongation.toFixed(1)}° · ${isWaxing ? "盈月" : "亏月"} · 不随预报日期切换`;
      els.observedAt.textContent = `${observation.placeName || $("home-place-name").textContent} · 此刻 · ${new Date().toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: observation.timeZone })}${observation.timeZone ? "" : "（设备时间）"}`;
      els.fraction.textContent = `${(fraction * 100).toFixed(1)}%`;
      els.age.textContent = moon.moonAge.toFixed(1);
      els.alt.textContent = `${moon.altitude.toFixed(1)}°`;
      els.altLabel.textContent = moon.isAboveHorizon ? "地平线上" : "已入地平";
      els.az.textContent = `${moon.azimuth.toFixed(1)}°`;
      const directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
      els.azLabel.textContent = `${directions[Math.round(moon.azimuth / 45) % 8]} · 正北为 0°`;
      const [title, advice, visibility] = observationFor(moon);
      els.advice.textContent = advice;
      els.stamp.textContent = title;
      els.visibility.textContent = visibility;
    }
  };
}
