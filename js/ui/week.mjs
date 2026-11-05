/**
 * 未来七日共用一张无折痕横笺；原生日期按钮按位置复用，保留焦点与选择状态。
 */
import { hasCloudLayers, indexBand, metricsAt, scoreSky, scoreSunDisc, sunTimes, tierFor } from "../forecast.mjs";
import { eventLabels, localTimeZone } from "../core/format.mjs";
import { $, el } from "./dom.mjs";

// 第 5–7 天的数值预报可信度明显下降，界面上标为远期参考。
const FAR_DAY_INDEX = 4;
const DAY_MS = 86_400_000;

export function createWeekView({ onSelectDay }) {
  const strip = $("week");
  const bestButton = $("week-best");
  const scrollRegions = document.querySelectorAll("[data-scroll-region]");
  const days = [];
  let formatterTimeZone;
  let dateFormatter;
  let clockFormatter;
  let scrollUpdatePending = false;

  function updateScrollRegions() {
    scrollUpdatePending = false;
    for (const region of scrollRegions) {
      const scroller = region;
      const canScroll = scroller.scrollWidth > scroller.clientWidth + 1;
      region.classList.toggle("can-scroll", canScroll);
      region.classList.toggle("is-at-start", scroller.scrollLeft <= 2);
      region.classList.toggle("is-at-end", !canScroll || scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2);
    }
  }

  function scheduleScrollUpdate() {
    if (scrollUpdatePending) return;
    scrollUpdatePending = true;
    requestAnimationFrame(updateScrollRegions);
  }

  for (const region of scrollRegions) {
    region.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
  }
  window.addEventListener("resize", scheduleScrollUpdate, { passive: true });

  bestButton.addEventListener("click", () => onSelectDay(bestButton.dataset.eventTime));
  strip.addEventListener("click", (event) => {
    const button = event.target.closest(".day-card");
    if (button && strip.contains(button) && !button.disabled) onSelectDay(button.dataset.eventTime);
  });

  function createDay(index) {
    const button = el("button", "day-card");
    button.type = "button";
    const date = el("span", "day-date");
    const score = el("strong", "day-score");
    const band = el("span", "day-grade");
    const time = el("time", "day-time");
    const mark = el("span", "day-mark");
    button.append(date, score, band, time, mark);
    strip.append(button);
    return { button, date, score, band, time, mark, value: null, timestamp: null, label: "", far: index >= FAR_DAY_INDEX };
  }

  return {
    reset() {
      strip.replaceChildren();
      days.length = 0;
      bestButton.hidden = true;
      delete bestButton.dataset.eventTime;
    },
    render({ bundle, place, event, viewMode, base, selectedTime }) {
      if (!base) return;
      const timeZone = localTimeZone(bundle);
      if (!dateFormatter || formatterTimeZone !== timeZone) {
        formatterTimeZone = timeZone;
        dateFormatter = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "short", timeZone });
        clockFormatter = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
      }
      let best = null;
      for (let index = 0; index < 7; index += 1) {
        const day = days[index] ?? (days[index] = createDay(index));
        const probe = new Date(base.getTime() + index * DAY_MS);
        const eventTime = sunTimes(probe, place.lat, place.lon)[event];
        const metrics = eventTime ? metricsAt(bundle, eventTime) : null;
        const available = eventTime != null && hasCloudLayers(metrics);
        const score = available ? (viewMode === "sundisc" ? scoreSunDisc(metrics) : scoreSky(metrics)) : null;
        const tier = available ? tierFor(score) : "unavailable";
        const band = available ? indexBand(score) : eventTime ? "云况待测" : "无对应事件";
        const date = dateFormatter.format(eventTime ?? probe);
        const clock = eventTime ? clockFormatter.format(eventTime) : "—";
        day.value = score;
        day.timestamp = available ? eventTime.getTime() : null;
        day.label = `${date}，${eventLabels.sun[event]} ${clock}，${available ? `${viewMode === "sundisc" ? "日轮" : "霞光"}指数 ${score} 分，${band}` : eventTime ? "高空云层要素暂缺，无法研判" : "当前纬度该日无对应晨昏视窗"}`;
        day.date.textContent = date;
        day.score.textContent = score ?? "—";
        day.band.textContent = band;
        day.time.textContent = clock;
        if (eventTime) day.time.dateTime = eventTime.toISOString();
        else day.time.removeAttribute("datetime");
        day.button.disabled = !available;
        day.button.dataset.tier = tier;
        day.button.dataset.grade = available ? tier : "dull";
        day.button.classList.toggle("is-far", day.far);
        if (available) {
          day.button.dataset.eventTime = String(day.timestamp);
          if (!best || score > best.value) best = day;
        } else {
          delete day.button.dataset.eventTime;
        }
      }
      for (const day of days) {
        const active = day.timestamp != null && day.timestamp === selectedTime;
        const isBest = day === best;
        const mark = day.timestamp == null
          ? `暂不可选${day.far ? " · 远期" : ""}`
          : `${active ? "当前" : ""}${active && isBest ? " · " : ""}${isBest ? "七日最高" : ""}${day.far ? `${active || isBest ? " · " : ""}远期` : ""}`;
        day.mark.textContent = mark;
        day.button.classList.toggle("is-active-day", active);
        day.button.classList.toggle("is-best-day", isBest);
        day.button.setAttribute("aria-pressed", String(active));
        day.button.setAttribute("aria-label", `${day.label}${active ? "，当前所选" : ""}${isBest ? "，七日最高" : ""}${day.far ? "，远期预报仅供参考" : ""}`);
      }
      bestButton.hidden = !best;
      if (best) {
        bestButton.dataset.eventTime = String(best.timestamp);
        bestButton.dataset.tier = best.button.dataset.tier;
        bestButton.textContent = `7 日最高 ${best.value} 分 · ${best.date.textContent}`;
        bestButton.setAttribute("aria-label", `查看未来 7 日得分最高的一天：${best.date.textContent}，${best.value} 分，${best.band.textContent}${best.far ? "，远期预报仅供参考" : ""}`);
      } else {
        delete bestButton.dataset.eventTime;
        delete bestButton.dataset.tier;
        bestButton.removeAttribute("aria-label");
      }
      scheduleScrollUpdate();
    }
  };
}
