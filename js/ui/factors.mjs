// 影响因素：每行一个要素，数值落在理想区间示意条上，右侧是对指数的增减
import { formatDelta } from "../core/format.mjs";
import { $, el } from "./dom.mjs";

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function gaugeFor(item) {
  const gauge = el("div", "factor-gauge");
  gauge.setAttribute("aria-hidden", "true");
  if (!item.gauge) {
    gauge.dataset.missing = "true";
    return gauge;
  }
  const { min, max, ideal, value } = item.gauge;
  const span = max - min;
  const ideal0 = clamp01((ideal[0] - min) / span);
  const ideal1 = clamp01((ideal[1] - min) / span);
  const zone = el("span", "factor-ideal");
  zone.style.left = `${ideal0 * 100}%`;
  zone.style.width = `${Math.max(1.5, (ideal1 - ideal0) * 100)}%`;
  const marker = el("span", "factor-marker");
  marker.style.left = `${clamp01((value - min) / span) * 100}%`;
  gauge.append(zone, marker);
  return gauge;
}

export function createFactorsView() {
  const list = $("factors");
  const base = $("factors-base");
  const cap = $("factors-cap");

  return {
    element: list,
    render(breakdown) {
      // 增减幅度最大的两项（且至少 3 分）加粗
      const ranked = breakdown.factors.map((item) => Math.abs(item.delta)).sort((a, b) => b - a);
      const majorThreshold = Math.max(3, ranked[1] ?? 0);
      list.replaceChildren(...breakdown.factors.map((item) => {
        const row = el("li", "factor-row");
        const rounded = Math.round(item.delta);
        row.dataset.effect = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
        if (Math.abs(item.delta) >= majorThreshold) row.dataset.major = "true";
        const head = el("div", "factor-head");
        head.append(el("span", "factor-label", item.label), el("strong", "factor-value", item.display));
        row.append(head, el("span", "factor-delta", `${formatDelta(item.delta)} 分`), gaugeFor(item), el("p", "factor-note", item.note));
        return row;
      }));
      base.textContent = `基准 ${breakdown.base} 分 · 逐项增减`;
      cap.hidden = !breakdown.capNote;
      cap.textContent = breakdown.capNote ?? "";
    }
  };
}
