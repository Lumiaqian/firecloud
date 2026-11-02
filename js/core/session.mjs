/**
 * 预报会话：当前地点、晨昏时段、所选日期、研判视角与数据新鲜度的唯一状态源。
 * 不直接操作 DOM，界面变化通过注入的 view 回调完成，便于在 Node 中测试状态流转。
 *
 * 行为约定（README“晨昏切换与加载反馈”）：
 * - 同地点切换晨昏时保留当前手记，切换期间显示目标时段；过期请求的响应不覆盖最新选择。
 * - 切换进行中点回当前时段即取消切换，保留原数据新鲜度。
 * - 切换失败保留当前手记与所选日期，并提示未能读取的时段。
 * - 切换研判视角、刷新同地点同时段时保留所选日期；换地点或成功切换时段后回到下一场事件。
 * - 网络响应与缓存仅在当前目标日期的本地分层云量齐全时采用；缺测沿用加载失败流程，不替换旧手记或缓存。
 */
import { normalizePlace, samePlace } from "./storage.mjs";
import { hasCloudLayers, metricsAt } from "../forecast.mjs";

const BACKGROUND_REFRESH_AGE = 5 * 60 * 1000;
const label = (eventType) => (eventType === "sunset" ? "晚霞" : "朝霞");
const MISSING_CLOUD_LAYERS = "当地高空分层云量暂缺，无法完成研判，请稍后重试或选择临近城市";

export function createForecastSession({
  fetchBundle,
  cache,
  nextEvent,
  persistPlace = () => {},
  persistViewMode = () => {},
  viewMode = "glow",
  now = () => new Date(),
  view
}) {
  const state = {
    place: null,
    bundle: null,
    dataTimestamp: null,
    event: "sunset",
    pendingEvent: null,
    selectedEventTime: null,
    viewMode,
    stale: false,
    refreshing: false,
    refreshFailed: false
  };
  let loadRequestId = 0;

  function setPending(eventType = null, failedEvent = null) {
    state.pendingEvent = eventType;
    view.pendingChanged(failedEvent);
  }

  function currentEventTime() {
    if (!state.place) return null;
    if (state.selectedEventTime) return state.selectedEventTime;
    return nextEvent(state.event, state.place.lat, state.place.lon, now());
  }

  function fail(message) {
    view.setBusy(false);
    setPending();
    view.showError(message);
  }

  function adopt(bundle, savedAt, eventType, { stale, sameForecast }) {
    if (!sameForecast) state.selectedEventTime = null;
    state.bundle = bundle;
    state.dataTimestamp = savedAt;
    state.event = eventType;
    state.stale = stale;
  }

  function targetTime(place, eventType, sameForecast) {
    return (sameForecast && state.selectedEventTime)
      || nextEvent(eventType, place.lat, place.lon, now());
  }

  function usable(bundle, eventTime) {
    return Boolean(eventTime) && hasCloudLayers(metricsAt(bundle, eventTime));
  }

  function show({ focus }) {
    if (!view.render()) return;
    view.announce();
    if (focus) view.focusResult();
  }

  async function load(place, { eventType = state.pendingEvent ?? state.event, preferCache = false, force = false } = {}) {
    const requestId = ++loadRequestId;
    const normalized = normalizePlace(place);
    if (!normalized) return fail("未获取到有效地点信息，请重新搜索");
    const sameForecast = Boolean(state.bundle)
      && samePlace(state.bundle.place, normalized) && state.bundle.eventType === eventType;
    const keepReady = view.isReady() && Boolean(state.bundle) && samePlace(state.bundle.place, normalized);
    const sameReady = keepReady && state.bundle.eventType === eventType;
    const cancelledSwitch = sameReady && state.pendingEvent !== null && !force;

    setPending();
    if (state.place && !samePlace(state.place, normalized)) state.selectedEventTime = null;
    state.place = normalized;
    persistPlace(normalized);
    if (!keepReady) {
      state.event = eventType;
      view.placeChanged(normalized);
    }

    if (cancelledSwitch) {
      state.refreshing = false;
      view.setBusy(false);
      view.updateSource();
      view.restartTicker();
      view.announce();
      return;
    }

    const eventTime = targetTime(normalized, eventType, sameForecast);
    if (!eventTime) return fail("该纬度处于极昼或极夜，未来三天无对应晨昏视窗");
    const cached = cache.read(normalized, eventType);
    if (!force && preferCache && cached && usable(cached.bundle, eventTime)) {
      adopt(cached.bundle, cached.savedAt, eventType, { stale: true, sameForecast });
      state.refreshing = false;
      state.refreshFailed = false;
      view.setBusy(false);
      show({ focus: !keepReady });
      if (cached.age > BACKGROUND_REFRESH_AGE) load(normalized, { force: true });
      return;
    }

    if (keepReady && !sameReady) {
      view.stopTicker();
      setPending(eventType);
      view.updateSource();
    }
    state.refreshing = sameReady;
    if (sameReady) {
      view.updateSource();
      view.announceText(`正在更新${normalized.name}${label(eventType)}预报`);
    } else if (!keepReady) {
      view.showLoading();
    }
    view.setBusy(true);
    view.loadingText(`正在计算${label(eventType)}方向的云层…`);

    try {
      const bundle = await fetchBundle(normalized, eventType, eventTime);
      if (requestId !== loadRequestId) return;
      // 刷新期间仍可改选日期，提交时必须校验最新选择，而非请求开始时的日期。
      if (!usable(bundle, targetTime(normalized, eventType, sameForecast))) {
        throw new Error(MISSING_CLOUD_LAYERS);
      }
      adopt(bundle, bundle.fetchedAt, eventType, { stale: false, sameForecast });
      state.refreshing = false;
      state.refreshFailed = false;
      setPending();
      cache.write(bundle);
      show({ focus: !keepReady });
    } catch (error) {
      if (requestId !== loadRequestId) return;
      state.refreshing = false;
      if (keepReady) {
        if (sameReady) {
          state.stale = true;
          state.refreshFailed = true;
        }
        setPending(null, sameReady ? null : eventType);
        view.render();
        view.announce();
      } else {
        const fallback = cache.read(normalized, eventType);
        state.refreshFailed = true;
        if (fallback && usable(fallback.bundle, targetTime(normalized, eventType, sameForecast))) {
          adopt(fallback.bundle, fallback.savedAt, eventType, { stale: true, sameForecast });
          show({ focus: true });
        } else {
          view.reportError?.(error);
          fail(error?.message === MISSING_CLOUD_LAYERS ? MISSING_CLOUD_LAYERS : "暂无可用预测，请稍后重试");
        }
      }
    } finally {
      if (requestId === loadRequestId) view.setBusy(false);
    }
  }

  return {
    state,
    load,
    fail,
    currentEventTime,

    // 选择某一天的事件；时段切换进行中时忽略
    selectDay(time) {
      if (!time || state.pendingEvent) return false;
      state.selectedEventTime = time;
      if (view.render()) view.announce();
      return true;
    },

    // 切换霞光/日轮视角，保留所选日期
    setViewMode(mode) {
      if (state.viewMode === mode) return false;
      state.viewMode = mode;
      persistViewMode(mode);
      if (state.bundle) view.render();
      return true;
    },

    // 切换晨昏时段：优先使用有效缓存
    switchEvent(eventType) {
      if (eventType === (state.pendingEvent ?? state.event) || !state.place) return false;
      load(state.place, { eventType, preferCache: true });
      return true;
    },

    refresh() {
      if (!state.place) return false;
      load(state.place, { force: true });
      return true;
    }
  };
}
