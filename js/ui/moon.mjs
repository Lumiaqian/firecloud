// 月相：天幕上的月亮、主卡夜间月相签条与月相详情弹窗。
import { buildMoonSvg } from "../forecast.mjs";
import { $ } from "./dom.mjs";

function adviceFor(fraction) {
  if (fraction >= 0.9) return "今宵月相趋满，银辉满天，适宜长焦拍摄地景接月或赏月夜景。";
  if (fraction >= 0.4) return "晨昏分界明显，月球环形山与月海暗影极具立体层次，适宜天文望远镜观测。";
  if (fraction >= 0.05) return "月如银钩，伴有地照微光（达芬奇辉光），极宜在暮光余晖初垂时与地景同框记录。";
  return "新月朔日，月隐星繁，天幕背景无月光干扰，极宜观测深空天体与拍摄银河暗夜。";
}

export function createMoonView() {
  const els = {
    skyDisk: $("sky-moon-disk"), skyHalo: $("sky-moon-halo"),
    badgeIcon: $("lunar-badge-icon"), badgeText: $("lunar-badge-text"),
    dialogMoon: $("lunar-dialog-moon"), dialogName: $("lunar-dialog-name"), dialogDate: $("lunar-dialog-date"),
    fraction: $("lunar-cell-fraction"), age: $("lunar-cell-age"), alt: $("lunar-cell-alt"), az: $("lunar-cell-az"),
    advice: $("lunar-dialog-advice"), stamp: $("lunar-dialog-stamp")
  };

  return {
    render(moon) {
      if (!moon) return;
      const { phaseFraction: fraction, isWaxing } = moon;
      els.skyDisk.innerHTML = buildMoonSvg(fraction, isWaxing, 76, "sky");
      els.skyHalo.style.transform = `scale(${(0.7 + fraction * 0.6).toFixed(2)})`;
      els.skyHalo.style.opacity = (0.25 + fraction * 0.5).toFixed(2);

      els.badgeIcon.innerHTML = buildMoonSvg(fraction, isWaxing, 15, "badge");
      els.badgeText.textContent = `${moon.lunarDate} · ${moon.phaseName} ${Math.round(fraction * 100)}%`;

      els.dialogMoon.innerHTML = buildMoonSvg(fraction, isWaxing, 96, "dialog");
      els.dialogName.textContent = moon.phaseName;
      els.dialogDate.textContent = `${moon.lunarDate} · 日月距角 ${moon.elongation.toFixed(1)}°`;
      els.fraction.textContent = `${(fraction * 100).toFixed(1)}%`;
      els.age.textContent = `${moon.moonAge.toFixed(1)} 天`;
      els.alt.textContent = `${moon.altitude.toFixed(1)}° (${moon.isAboveHorizon ? "地平线上" : "已入地平"})`;
      els.az.textContent = `${moon.azimuth.toFixed(1)}°`;
      els.advice.textContent = adviceFor(fraction);
      els.stamp.textContent = fraction >= 0.7 ? "宜赏月" : fraction <= 0.05 ? "宜深空" : "观象札记";
    }
  };
}
