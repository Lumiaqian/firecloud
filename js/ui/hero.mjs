// 主卡：指数与印章、档位建议、事件时间与方位、观赏窗口、评语、另一视角切换、数据来源。
import { compassLabel, indexBand, waitAdvice } from "../forecast.mjs";
import { eventLabels, formatAge, formatClock, formatEventDate, formatUpdated } from "../core/format.mjs";
import { $ } from "./dom.mjs";

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function createHeroView() {
  const els = {
    entryTag: $("entry-tag"), indexLabel: $("index-label"), score: $("score"), band: $("band"),
    sealGrade: $("seal-grade"), sealSub: $("seal-sub"), eventTime: $("event-time"), eventDate: $("event-date"),
    countdown: $("countdown"), verdict: $("verdict"),
    windowLabel: $("window-label"), windowRange: $("window-range"), windowPeak: $("window-peak"),
    windowEventMark: $("window-event-mark"), windowPeakMark: $("window-peak-mark"),
    companion: $("hero-companion-pill"), companionText: $("companion-text"),
    source: $("data-source"), updated: $("updated-at")
  };

  function renderWindow({ viewing, eventTime, timeZone, event, isSunDiscView }) {
    const span = viewing.end - viewing.start;
    els.windowLabel.textContent = isSunDiscView ? "日轮窗口" : "观赏窗口";
    els.windowRange.textContent = `${formatClock(viewing.start, timeZone)}–${formatClock(viewing.end, timeZone)}`;
    els.windowPeak.textContent = isSunDiscView
      ? `${event === "sunset" ? "触地" : "露头"} ${formatClock(viewing.peak, timeZone)}`
      : `余晖峰值约 ${formatClock(viewing.peak, timeZone)}`;
    els.windowEventMark.style.left = `${clamp01((eventTime - viewing.start) / span) * 100}%`;
    els.windowPeakMark.style.left = `${clamp01((viewing.peak - viewing.start) / span) * 100}%`;
    els.windowPeakMark.hidden = isSunDiscView;
  }

  function updateSource({ pendingEvent, refreshing, refreshFailed, stale }) {
    els.source.textContent = pendingEvent
      ? `读取${eventLabels.glow[pendingEvent]}中`
      : refreshing ? "更新中" : refreshFailed ? "更新未果 · 沿用先前记录" : stale ? "先前记录" : "实时数据";
    els.source.dataset.status = pendingEvent || refreshing ? "loading" : refreshFailed ? "error" : stale ? "stale" : "live";
  }

  return {
    // 数据刷新后需要淡入提示的元素
    changing: [els.eventTime, els.eventDate, els.score, els.band, els.verdict, els.windowRange],
    focusTarget: els.eventTime,
    companion: els.companion,

    get scoreText() {
      return els.score.textContent;
    },

    setCountdown(text) {
      els.countdown.textContent = text;
    },

    updateSource,

    markLoading() {
      els.source.textContent = "更新中";
      els.source.dataset.status = "loading";
    },

    markError() {
      els.source.dataset.status = "error";
    },

    render({ state, eventTime, timeZone, azimuth, viewing, glow, sun }) {
      const isSunDiscView = state.viewMode === "sundisc";
      const active = isSunDiscView ? sun : glow;
      const viewLabel = eventLabels[isSunDiscView ? "sundisc" : "glow"][state.event];
      const date = formatEventDate(eventTime, timeZone);

      els.eventTime.innerHTML = `${formatClock(eventTime, timeZone)} <small id="hero-time-sub">${eventLabels.sun[state.event]} · ${compassLabel(azimuth)} ${Math.round(azimuth)}°</small>`;
      renderWindow({ viewing, eventTime, timeZone, event: state.event, isSunDiscView });
      els.eventDate.textContent = `${date} · ${timeZone ? "地点当地时间" : "设备时间"}`;
      els.entryTag.textContent = `${date} · ${viewLabel}观测手记`;
      els.score.textContent = String(active.score);
      els.band.textContent = isSunDiscView
        ? `${indexBand(active.score)} · ${sun.phenomenon.sub}`
        : `${indexBand(active.score)} · ${waitAdvice(active.score)}`;
      els.indexLabel.textContent = isSunDiscView ? "日轮指数" : "霞光指数";
      els.sealGrade.textContent = active.seal.text;
      els.sealSub.textContent = active.seal.sub;
      els.verdict.textContent = `“${active.advice}”`;

      // 另一视角的分数同时作为切换入口，主卡只保留这一个视角切换
      els.companionText.textContent = isSunDiscView
        ? `霞光指数 ${glow.score} 分 · ${glow.seal.text}`
        : `日轮指数 ${sun.score} 分 · ${sun.phenomenon.name}`;
      els.companion.setAttribute("aria-label", isSunDiscView
        ? `切换到霞光视角，霞光指数 ${glow.score} 分，${glow.seal.text}`
        : `切换到日轮视角，日轮指数 ${sun.score} 分，${sun.phenomenon.name}`);

      updateSource(state);
      els.updated.textContent = state.stale
        ? `缓存于 ${formatAge(Date.now() - state.dataTimestamp)}`
        : `更新于 ${formatUpdated(state.bundle.fetchedAt, timeZone)}`;
    }
  };
}
