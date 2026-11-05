// 天气批注：实测值、单位与模型分项分开呈现，理想区间收进原生 details。
import { $, el } from "./dom.mjs";

const MEASUREMENT = /^([+−-]?\d+(?:\.\d+)?)\s*(.*)$/u;
const CLOUD_KEYS = new Set(["high", "mid", "low", "pathLow"]);

function deltaText(delta) {
  const rounded = Math.round(Math.abs(delta) * 10) / 10;
  return rounded === 0 ? "0" : `${delta > 0 ? "+" : "−"}${rounded}`;
}

function idealText(item, unit) {
  if (!item.gauge) return "缺测 · 理想区间暂缺";
  // 能见度的模型原值为米，界面显示公里；其他区间沿用模型本身的单位。
  const scale = item.key === "vis" ? 1000 : 1;
  const [low, high] = item.gauge.ideal;
  const range = low === high ? `${low / scale}` : `${low / scale}–${high / scale}`;
  return `理想 ${range}${unit === "%" ? "" : unit ? " " : ""}${unit}`;
}

function createFactor() {
  const row = el("li", "factor-row");
  const label = el("span", "factor-label");
  const reading = el("div", "factor-reading");
  const value = el("strong", "factor-value");
  const number = el("span", "factor-number");
  const unit = el("span", "factor-unit measure-unit");
  const delta = el("span", "factor-delta");
  value.append(number, unit);
  reading.append(value, delta);
  row.append(label, reading);
  const reason = el("p", "factor-reason");
  const range = el("strong", "factor-range");
  const note = el("span", "factor-note");
  reason.append(range, note);
  return { row, label, number, unit, delta, reason, range, note, seen: 0 };
}

export function createFactorsView() {
  const cloudList = $("cloud-factors");
  const airList = $("air-factors");
  const attention = $("factors-attention");
  const base = $("factors-base");
  const cap = $("factors-cap");
  const explanations = $("factors-details-content");
  const rows = new Map();
  let revision = 0;

  return {
    render(breakdown) {
      revision += 1;
      // 旁批只指出实际可用要素中的最大扣分；缺测默认分不能冒充观测结论。
      let worst = null;
      for (const item of breakdown.factors) {
        if (item.gauge && item.delta < 0 && (!worst || item.delta < worst.delta)) worst = item;
      }
      let cloudIndex = 0;
      let airIndex = 0;
      for (let index = 0; index < breakdown.factors.length; index += 1) {
        const item = breakdown.factors[index];
        let factor = rows.get(item.key);
        if (!factor) {
          factor = createFactor();
          rows.set(item.key, factor);
        }
        factor.seen = revision;
        const measurement = MEASUREMENT.exec(item.display);
        const unit = measurement?.[2] ?? "";
        const change = deltaText(item.delta);
        factor.label.textContent = item.label;
        factor.number.textContent = item.gauge ? (measurement?.[1] ?? item.display) : "—";
        factor.unit.textContent = item.gauge ? unit : "缺测";
        factor.unit.hidden = item.gauge ? !unit : false;
        factor.delta.textContent = item.gauge ? change : "—";
        factor.delta.setAttribute("aria-label", item.gauge ? `计分变化 ${change} 分` : "缺测，模型沿用默认值");
        factor.row.dataset.effect = !item.gauge || change === "0" ? "flat" : item.delta > 0 ? "up" : "down";
        factor.row.toggleAttribute("data-major", item === worst);
        if (item === worst) factor.row.dataset.major = "true";
        factor.row.toggleAttribute("data-missing", !item.gauge);
        if (!item.gauge) factor.row.dataset.missing = "true";
        factor.range.textContent = `${item.label} · ${idealText(item, unit)}`;
        factor.note.textContent = item.note;
        // 只有新增项或模型顺序改变才移动节点；details 本身由页面持有，展开状态不变。
        const target = CLOUD_KEYS.has(item.key) ? cloudList : airList;
        const targetIndex = target === cloudList ? cloudIndex++ : airIndex++;
        if (target.children[targetIndex] !== factor.row) target.insertBefore(factor.row, target.children[targetIndex] ?? null);
        if (explanations.children[index] !== factor.reason) explanations.insertBefore(factor.reason, explanations.children[index] ?? null);
      }
      for (const [key, factor] of rows) {
        if (factor.seen === revision) continue;
        factor.row.remove();
        factor.reason.remove();
        rows.delete(key);
      }
      base.textContent = `基准 ${breakdown.base} 分 · 逐项增减`;
      attention.textContent = worst ? `${worst.label}是主要扣分项 · ${worst.note}` : "已测要素暂无明显扣分，仍需留意临近天气变化。";
      cap.hidden = !breakdown.capNote;
      cap.textContent = breakdown.capNote ?? "";
    }
  };
}
