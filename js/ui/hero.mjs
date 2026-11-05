// 主卡：开口圈注、档位建议、独立事件时间与窗口、来源及另一视角。
import { compassLabel, indexBand } from "../forecast.mjs";
import { eventLabels, formatClock, formatEventDate, formatUpdated, localTimeZone } from "../core/format.mjs";
import { $ } from "./dom.mjs";

export function createHeroView() {
  const els = {
    entryTag: $("entry-tag"), indexLabel: $("index-label"), score: $("score"), band: $("band"),
    scoreAction: $("score-circle-action"),
    eventTime: $("event-time"), eventDate: $("event-date"),
    eventLabel: $("hero-event-label"), timeSub: $("hero-time-sub"), weekTimeLabel: $("week-time-label"),
    countdown: $("countdown"), verdict: $("verdict"),
    windowLabel: $("window-label"), windowRange: $("window-range"), windowPeak: $("window-peak"),
    companion: $("hero-companion-pill"), companionText: $("companion-text"),
    source: $("data-source"), updated: $("updated-at"), timezone: $("record-timezone")
  };

  function renderWindow({ viewing, timeZone, event, isSunDiscView }) {
    els.windowLabel.textContent = isSunDiscView ? "日轮窗口" : "观赏窗口";
    els.windowRange.textContent = `${formatClock(viewing.start, timeZone)}–${formatClock(viewing.end, timeZone)}`;
    els.windowPeak.textContent = isSunDiscView
      ? `${event === "sunset" ? "触地" : "露头"} ${formatClock(viewing.peak, timeZone)}`
      : `余晖峰值约 ${formatClock(viewing.peak, timeZone)}`;
  }

  function updateSource({ refreshFailed, stale, dataTimestamp, bundle }) {
    const saved = Boolean(stale || refreshFailed);
    const timeZone = localTimeZone(bundle);
    els.source.textContent = saved ? "保存的预报" : "预报数据";
    els.source.dataset.status = saved ? "stale" : "live";
    els.updated.textContent = dataTimestamp != null
      ? `上次更新 ${formatUpdated(dataTimestamp, timeZone)}`
      : "尚无更新记录";
  }

  return {
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
      els.source.textContent = "预报数据";
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
      els.timezone.textContent = timeZone
        ? new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "shortOffset" })
          .formatToParts(eventTime).find((part) => part.type === "timeZoneName").value.replace("GMT", "UTC")
        : "设备时间";
      els.timezone.title = timeZone || "设备时区";

      els.eventLabel.textContent = `${date} · ${eventLabels.sun[state.event]}`;
      els.eventTime.textContent = formatClock(eventTime, timeZone);
      els.timeSub.textContent = `${compassLabel(azimuth)} ${Math.round(azimuth)}°`;
      els.weekTimeLabel.textContent = `时刻为${eventLabels.sun[state.event]}时间`;
      renderWindow({ viewing, eventTime, timeZone, event: state.event, isSunDiscView });
      els.eventDate.textContent = `${date} · ${timeZone ? "地点当地时间" : "设备时间"}`;
      els.entryTag.textContent = `${viewLabel} · ${date}`;
      els.score.textContent = String(active.score);
      els.band.textContent = isSunDiscView
        ? `${indexBand(active.score)} · ${sun.phenomenon.sub}`
        : indexBand(active.score);
      els.indexLabel.textContent = isSunDiscView ? "日轮指数" : "霞光指数";
      els.scoreAction.setAttribute("aria-label", `${els.indexLabel.textContent} ${active.score} 分，${els.band.textContent}，轻触圈注`);
      els.verdict.textContent = active.advice;

      // 另一视角的分数同时作为切换入口，主卡只保留这一个视角切换
      els.companionText.textContent = isSunDiscView
        ? `霞光指数 ${glow.score}`
        : `日轮指数 ${sun.score}`;
      els.companion.setAttribute("aria-label", isSunDiscView
        ? `切换到霞光视角，霞光指数 ${glow.score} 分，${indexBand(glow.score)}`
        : `切换到日轮视角，日轮指数 ${sun.score} 分，${sun.phenomenon.name}`);

      updateSource(state);
    }
  };
}
