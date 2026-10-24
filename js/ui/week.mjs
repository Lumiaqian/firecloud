/**
 * 未来 7 日：本周最佳按钮、窄屏分数概览与逐日卡片。
 * 卡片按位置复用旧节点，内容变化时才替换并淡入，避免整列重排与焦点丢失。
 */
import {
  hasCloudLayers,
  indexBand,
  metricsAt,
  photographicAdviceFor,
  photographicAdviceForSunDisc,
  scoreSky,
  scoreSunDisc,
  sealFor,
  sealForSunDisc,
  sunDiscPhenomenon,
  sunTimes,
  tierFor
} from "../forecast.mjs";
import { eventLabels, formatClock, localTimeZone } from "../core/format.mjs";
import { $, el } from "./dom.mjs";
import { fadeUpdate } from "./motion.mjs";

// 第 5–7 天的数值预报可信度明显下降，界面上标为远期参考
const FAR_DAY_INDEX = 4;
const DAY_MS = 86_400_000;
const SYNCED_ATTRIBUTES = ["data-tier", "data-grade", "data-event-time", "aria-label", "aria-pressed", "role", "tabindex"];
const SYNCED_CLASSES = ["is-active-day", "is-rain-damp", "is-far"];

function placeholderCard(date, seal, tag, tip) {
  return `
        <div class="day-card-perfs"><i></i><i></i><i></i><i></i></div>
        <div class="day-date-row">
          <span class="day-card-date">${date}</span>
          <span class="day-mini-seal">${seal}</span>
        </div>
        <div class="day-card-watercolor"></div>
        <div class="day-score-block">
          <span class="day-score-num">—</span>
          <div class="day-score-tag">
            <span>${tag}</span>
          </div>
        </div>
        <p class="day-tip-line">${tip}</p>
      `;
}

// 计算某一天的卡片内容与概览条目
function dayModel({ bundle, place, event, viewMode, probe, far, formatter, weekdayFormatter, timeZone }) {
  const eventTime = sunTimes(probe, place.lat, place.lon)[event];
  if (!eventTime) {
    return {
      overview: { weekday: weekdayFormatter.format(probe), score: null, tier: "unavailable", far },
      tier: "unavailable",
      html: placeholderCard(formatter.format(probe), "地平未沉", "极昼无晨昏", "当前纬度该日处于极昼/极夜，无对应晨昏视窗")
    };
  }
  const metrics = metricsAt(bundle, eventTime);
  if (!hasCloudLayers(metrics)) {
    return {
      overview: { weekday: weekdayFormatter.format(eventTime), eventTime: null, score: null, tier: "unavailable", far },
      tier: "unavailable",
      html: placeholderCard(formatter.format(eventTime), "待测", "云况待测", "高空云层要素暂缺")
    };
  }
  const isSunDiscView = viewMode === "sundisc";
  const glowScore = scoreSky(metrics);
  const sunScore = scoreSunDisc(metrics);
  const sunPhen = sunDiscPhenomenon(metrics, sunScore);
  const score = isSunDiscView ? sunScore : glowScore;
  const tier = tierFor(score);
  const band = indexBand(score);
  const advice = isSunDiscView
    ? photographicAdviceForSunDisc(metrics, sunScore, sunPhen, event)
    : photographicAdviceFor(metrics, glowScore, event);
  const date = formatter.format(eventTime);
  const seal = isSunDiscView ? sealForSunDisc(sunScore, sunPhen) : sealFor(glowScore);
  return {
    eventTime,
    tier,
    rainy: typeof metrics.precip === "number" && metrics.precip > 0.05,
    overview: { weekday: weekdayFormatter.format(eventTime), date, eventTime, score, tier, band, far },
    label: `${date} ${eventLabels.sun[event]}，${isSunDiscView ? "日轮" : "霞光"}指数 ${score}分，${band}，${advice}${far ? "，远期预报仅供参考" : ""}`,
    html: `
        <div class="day-card-perfs"><i></i><i></i><i></i><i></i></div>
        <div class="day-date-row">
          <span class="day-card-date">${date}</span>
          <span class="day-mini-seal">${seal.text}</span>
        </div>
        <div class="day-card-watercolor"></div>
        <div class="day-score-block">
          <span class="day-score-num">${score}</span>
          <div class="day-score-tag">
            <span>${band}${far ? " · 远期" : ""}</span>
            <small class="day-score-clock">${formatClock(eventTime, timeZone)}</small>
          </div>
        </div>
        <p class="day-tip-line">${advice}</p>
      `
  };
}

export function createWeekView({ onSelectDay }) {
  const strip = $("week");
  const overviewEl = $("week-overview");
  const bestButton = $("week-best");

  function updateScrollRegions() {
    for (const region of document.querySelectorAll("[data-scroll-region]")) {
      const scroller = region.firstElementChild;
      const canScroll = scroller.scrollWidth > scroller.clientWidth + 1;
      region.classList.toggle("can-scroll", canScroll);
      region.classList.toggle("is-at-start", scroller.scrollLeft <= 2);
      region.classList.toggle("is-at-end", !canScroll || scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2);
    }
  }
  for (const region of document.querySelectorAll("[data-scroll-region]")) {
    region.firstElementChild.addEventListener("scroll", updateScrollRegions, { passive: true });
  }
  window.addEventListener("resize", updateScrollRegions, { passive: true });

  bestButton.addEventListener("click", (event) => onSelectDay(event.currentTarget.dataset.eventTime));
  overviewEl.addEventListener("click", (event) => onSelectDay(event.target.closest(".week-bar")?.dataset.eventTime));

  function createCard(index) {
    const card = el("article", "day-card day-journal-card");
    card.style.setProperty("--day-idx", String(index));
    card.addEventListener("click", (event) => onSelectDay(event.currentTarget.dataset.eventTime));
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!event.currentTarget.dataset.eventTime) return;
      event.preventDefault();
      onSelectDay(event.currentTarget.dataset.eventTime);
    });
    // 入场动效完成后固化为静止态，避免之后的风吹动效结束时误触发入场回放
    const markSettled = () => card.classList.add("is-settled");
    card.addEventListener("animationend", (event) => {
      if (event.animationName === "day-card-in") markSettled();
    }, { once: true });
    setTimeout(markSettled, 600);
    return card;
  }

  // 把新卡片的内容与属性合并进同位置的旧卡片
  function mergeInto(old, card) {
    const changed = old.innerHTML !== card.innerHTML || old.dataset.tier !== card.dataset.tier;
    if (changed) old.innerHTML = card.innerHTML;
    for (const name of SYNCED_ATTRIBUTES) {
      const value = card.getAttribute(name);
      if (value === null) old.removeAttribute(name);
      else old.setAttribute(name, value);
    }
    for (const name of SYNCED_CLASSES) old.classList.toggle(name, card.classList.contains(name));
    if (changed) {
      old.dataset.updated = "true";
      fadeUpdate(old);
    }
  }

  function renderOverview(days, selectedTime) {
    const best = days.filter((day) => day.score != null)
      .reduce((top, day) => (top == null || day.score > top.score ? day : top), null);
    bestButton.hidden = !best;
    if (best) {
      bestButton.dataset.eventTime = String(best.eventTime.getTime());
      bestButton.dataset.tier = best.tier;
      bestButton.textContent = best.score >= 50
        ? `本周最佳 · ${best.weekday} ${best.score} 分 · ${best.band}`
        : `本周最高 ${best.score} 分 · ${best.weekday}`;
      bestButton.setAttribute("aria-label", `查看本周得分最高的一天：${best.date}，${best.score} 分，${best.band}`);
    }
    overviewEl.replaceChildren(...days.map((day) => {
      const bar = el("div", "week-bar");
      bar.dataset.tier = day.tier;
      if (day.far) bar.dataset.far = "true";
      if (day.eventTime) bar.dataset.eventTime = String(day.eventTime.getTime());
      if (day.eventTime?.getTime() === selectedTime) bar.dataset.active = "true";
      if (day === best) bar.dataset.best = "true";
      const track = el("span", "week-bar-track");
      const fill = el("span", "week-bar-fill");
      fill.style.height = `${Math.max(4, day.score ?? 0)}%`;
      track.append(fill);
      bar.append(el("span", "week-bar-score", day.score ?? "—"), track, el("span", "week-bar-day", day.weekday));
      return bar;
    }));
  }

  return {
    reset() {
      strip.replaceChildren();
    },
    render({ bundle, place, event, viewMode, base, selectedTime }) {
      if (!base) return;
      const timeZone = localTimeZone(bundle);
      const formatter = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "short", timeZone });
      const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone });
      const previous = [...strip.children];
      const overview = [];
      for (let day = 0; day < 7; day += 1) {
        const far = day >= FAR_DAY_INDEX;
        const model = dayModel({
          bundle, place, event, viewMode, far, formatter, weekdayFormatter, timeZone,
          probe: new Date(base.getTime() + day * DAY_MS)
        });
        overview.push(model.overview);
        const card = createCard(day);
        card.classList.toggle("is-far", far);
        card.dataset.tier = model.tier;
        card.dataset.grade = model.tier === "unavailable" ? "dull" : model.tier;
        card.innerHTML = model.html;
        if (model.eventTime) {
          if (model.rainy) card.classList.add("is-rain-damp");
          const active = model.eventTime.getTime() === selectedTime;
          card.setAttribute("tabindex", "0");
          card.setAttribute("role", "button");
          card.setAttribute("aria-label", model.label);
          card.dataset.eventTime = String(model.eventTime.getTime());
          card.classList.toggle("is-active-day", active);
          card.setAttribute("aria-pressed", String(active));
        }
        if (previous[day]) mergeInto(previous[day], card);
        else strip.append(card);
      }
      renderOverview(overview, selectedTime);
      requestAnimationFrame(updateScrollRegions);
    }
  };
}
