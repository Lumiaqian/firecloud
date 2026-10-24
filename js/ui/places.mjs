/**
 * 地点与收藏：地点弹窗、城市搜索、设备定位、收藏星标与“移出后可撤销”反馈。
 * 选中地点后通过 onChoose 交给预报会话加载。
 */
import { reverseGeocode, searchCities } from "../api.mjs";
import { FAVORITES_LIMIT, KEYS, normalizeFavorites, placeIdentity, samePlace } from "../core/storage.mjs";
import { $, el } from "./dom.mjs";
import { motionAllowed } from "./motion.mjs";

const SEARCH_DEBOUNCE = 300;
const UNDO_TIMEOUT = 7000;

export function createPlaces({ storage, getCurrentPlace, onChoose, resetDrawer }) {
  const els = {
    dialog: $("places-dialog"), brand: $("open-places"), search: $("city-search"),
    searchStatus: $("search-status"), searchSpinner: $("search-spinner"), searchResults: $("search-results"),
    geoNotice: $("geo-notice"), favorite: $("favorite-button"),
    favoritesList: $("favorites-list"), favoritesEmpty: $("favorites-empty"),
    feedback: $("favorite-feedback"), message: $("favorite-message"), undo: $("undo-favorite"),
    dialogFeedback: $("dialog-favorite-feedback"), dialogMessage: $("dialog-favorite-message"), dialogUndo: $("dialog-undo-favorite")
  };
  let favorites = normalizeFavorites(storage.get(KEYS.favorites, []));
  let pendingFavorite = null;
  let searchTimer;
  let searchRequestId = 0;
  let locateRequestId = 0;

  const saveFavorites = () => storage.set(KEYS.favorites, favorites);
  const indexOfFavorite = (place) => favorites.findIndex((favorite) => samePlace(favorite, place));

  function setLocationStatus(message) {
    els.geoNotice.textContent = message;
    els.searchStatus.textContent = message;
  }

  function open() {
    if (els.dialog.open) return;
    renderFavorites();
    resetDrawer();
    els.dialog.showModal();
    renderFeedback();
  }

  function openForSearch() {
    open();
    els.search.focus();
  }

  // ---------- 搜索 ----------
  function setSearchBusy(busy) {
    els.searchSpinner.hidden = !busy;
    for (const node of [els.search, els.searchResults]) {
      if (busy) node.setAttribute("aria-busy", "true");
      else node.removeAttribute("aria-busy");
    }
  }

  function clearSearch() {
    searchRequestId += 1;
    clearTimeout(searchTimer);
    els.search.value = "";
    setSearchBusy(false);
    els.searchStatus.textContent = "";
    els.searchResults.replaceChildren();
  }

  function choose(place) {
    locateRequestId += 1;
    clearSearch();
    els.dialog.close();
    onChoose(place);
  }

  function renderSearchResults(results) {
    els.searchResults.replaceChildren(...results.map((place) => {
      const button = el("button");
      button.type = "button";
      button.append(el("strong", "place-label", place.name), el("small", null, place.detail || ""));
      button.addEventListener("click", () => choose(place));
      const item = el("li");
      item.append(button);
      return item;
    }));
  }

  els.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const requestId = ++searchRequestId;
    const query = els.search.value.trim();
    if (query.length < 2) {
      els.searchResults.replaceChildren();
      els.searchStatus.textContent = "";
      setSearchBusy(false);
      return;
    }
    searchTimer = setTimeout(async () => {
      setSearchBusy(true);
      els.searchStatus.textContent = "正在搜索…";
      try {
        const results = await searchCities(query);
        if (requestId !== searchRequestId) return;
        renderSearchResults(results);
        els.searchStatus.textContent = results.length ? `找到 ${results.length} 处地点` : "未寻得匹配城市，建议尝试输入省市全称";
      } catch {
        if (requestId !== searchRequestId) return;
        els.searchResults.replaceChildren();
        els.searchStatus.textContent = "城市检索网络未通，请稍后重试";
      } finally {
        if (requestId === searchRequestId) setSearchBusy(false);
      }
    }, SEARCH_DEBOUNCE);
  });

  // ---------- 定位 ----------
  function locate() {
    const requestId = ++locateRequestId;
    const fallBackToSearch = () => {
      setLocationStatus("未能获取设备定位，请尝试搜索城市");
      openForSearch();
    };
    if (!navigator.geolocation) return fallBackToSearch();
    setLocationStatus("正在探寻当前位置…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      if (requestId !== locateRequestId) return;
      const point = { lat: coords.latitude, lon: coords.longitude };
      let place = { ...point, name: "当前位置" };
      try { place = await reverseGeocode(point); } catch { /* 无地名时仍可用坐标 */ }
      if (requestId !== locateRequestId) return;
      setLocationStatus("");
      clearSearch();
      if (els.dialog.open) els.dialog.close();
      onChoose(place);
    }, () => {
      if (requestId !== locateRequestId) return;
      fallBackToSearch();
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 });
  }

  // ---------- 收藏 ----------
  function updateFavoriteButton() {
    const place = getCurrentPlace();
    const active = Boolean(place) && indexOfFavorite(place) >= 0;
    els.favorite.classList.toggle("is-active", active);
    els.favorite.setAttribute("aria-pressed", String(active));
    els.favorite.setAttribute("aria-label", active ? "取消收藏当前地点" : "收藏当前地点");
  }

  function favoritesChanged() {
    saveFavorites();
    renderFavorites();
    updateFavoriteButton();
  }

  function renderFeedback() {
    const inDialog = els.dialog.open;
    els.feedback.hidden = !pendingFavorite || inDialog;
    els.dialogFeedback.hidden = !pendingFavorite || !inDialog;
    for (const feedback of [els.feedback, els.dialogFeedback]) {
      feedback.inert = feedback.hidden;
      if (pendingFavorite?.error) feedback.dataset.status = "error";
      else feedback.removeAttribute("data-status");
    }
    if (pendingFavorite) {
      const message = pendingFavorite.error
        ? `最多珍藏 ${FAVORITES_LIMIT} 处地点，请先移出一处后再撤销`
        : pendingFavorite.retryRemoved
          ? `已移出「${pendingFavorite.retryRemoved}」，可撤销先前移出的「${pendingFavorite.place.name}」`
          : `已移出收藏「${pendingFavorite.place.name}」`;
      (inDialog ? els.dialogMessage : els.message).textContent = message;
    }
    scheduleUndoExpiry();
  }

  // 反馈条被悬停或聚焦时不自动消失
  function scheduleUndoExpiry() {
    if (!pendingFavorite) return;
    clearTimeout(pendingFavorite.timer);
    const feedback = els.dialog.open ? els.dialogFeedback : els.feedback;
    if (feedback.matches(":hover") || feedback.contains(document.activeElement)) return;
    const pending = pendingFavorite;
    pending.timer = setTimeout(() => {
      if (pendingFavorite === pending) clearUndo();
    }, UNDO_TIMEOUT);
  }

  function clearUndo() {
    if (!pendingFavorite) return;
    clearTimeout(pendingFavorite.timer);
    pendingFavorite = null;
    const undoHadFocus = document.activeElement === els.undo || document.activeElement === els.dialogUndo;
    renderFeedback();
    if (undoHadFocus) {
      (els.dialog.open ? els.search : els.favorite.hidden ? els.brand : els.favorite).focus({ preventScroll: true });
    }
  }

  function removeFavorite(place) {
    const index = indexOfFavorite(place);
    if (index < 0) return;
    const retryingUndo = Boolean(pendingFavorite?.error);
    if (!retryingUndo) clearUndo();
    const [removed] = favorites.splice(index, 1);
    favoritesChanged();
    if (els.dialog.open) {
      const adjacent = els.favoritesList.children[Math.min(index, favorites.length - 1)];
      (adjacent?.querySelector(".delete-favorite") || els.search).focus({ preventScroll: true });
    }
    if (retryingUndo) {
      pendingFavorite.error = false;
      pendingFavorite.retryRemoved = removed.name;
    } else {
      pendingFavorite = { place: removed, index, timer: null, error: false };
    }
    renderFeedback();
  }

  function undoRemoval() {
    if (!pendingFavorite) return;
    const { place, index } = pendingFavorite;
    const alreadyRestored = indexOfFavorite(place) >= 0;
    if (!alreadyRestored && favorites.length >= FAVORITES_LIMIT) {
      pendingFavorite.error = true;
      pendingFavorite.retryRemoved = null;
      renderFeedback();
      (els.dialog.open ? els.dialogUndo : els.undo).focus({ preventScroll: true });
      return;
    }
    clearUndo();
    let restoredIndex = indexOfFavorite(place);
    if (restoredIndex < 0 && favorites.length < FAVORITES_LIMIT) {
      restoredIndex = Math.min(index, favorites.length);
      favorites.splice(restoredIndex, 0, place);
      favoritesChanged();
    }
    if (els.dialog.open) {
      (restoredIndex >= 0 ? els.favoritesList.children[restoredIndex]?.querySelector(".favorite-place") : els.search)
        .focus({ preventScroll: true });
    } else if (!els.favorite.hidden) {
      els.favorite.focus({ preventScroll: true });
    }
  }

  function favoriteRow(place) {
    const item = el("li", "favorite-row");
    item.dataset.place = placeIdentity(place);
    const pick = el("button", "favorite-place");
    pick.type = "button";
    pick.append(el("strong", "place-label", place.name));
    pick.addEventListener("click", () => choose(place));
    const remove = el("button", "delete-favorite", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `移出收藏 ${place.name}`);
    remove.addEventListener("click", () => removeFavorite(place));
    item.append(pick, remove);
    return item;
  }

  // 收藏列表按地点复用行节点，并用 FLIP 动画衔接增删与位移
  function renderFavorites() {
    const list = els.favoritesList;
    const oldRows = new Map([...list.children].filter((row) => !row.dataset.exiting).map((row) => [row.dataset.place, row]));
    const positions = new Map([...oldRows].map(([key, row]) => [key, row.getBoundingClientRect()]));
    const animate = els.dialog.open && motionAllowed();
    const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim();
    const rows = favorites.map((place) => oldRows.get(placeIdentity(place)) ?? favoriteRow(place));
    const retained = new Set(rows);
    for (const row of oldRows.values()) {
      if (retained.has(row)) continue;
      const rect = positions.get(row.dataset.place);
      row.remove();
      if (!animate) continue;
      row.dataset.exiting = "true";
      row.inert = true;
      row.setAttribute("aria-hidden", "true");
      row.style.cssText = `position:absolute;top:${rect.top - list.getBoundingClientRect().top}px;left:0;width:${rect.width}px;pointer-events:none`;
      list.append(row);
      row.animate([{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(-8px)" }],
        { duration: 120, easing }).finished.then(() => row.remove(), () => row.remove());
    }
    rows.forEach((row, index) => {
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
    });
    for (const row of rows) {
      const previous = positions.get(row.dataset.place);
      row.getAnimations().forEach((animation) => animation.cancel());
      if (!animate) continue;
      const delta = previous ? previous.top - row.getBoundingClientRect().top : 4;
      if (previous && Math.abs(delta) < 0.5) continue;
      row.animate([
        { transform: `translateY(${delta}px)`, opacity: previous ? 1 : 0 },
        { transform: "translateY(0)", opacity: 1 }
      ], { duration: 160, easing });
    }
    els.favoritesEmpty.hidden = favorites.length > 0;
  }

  function toggleFavorite() {
    const place = getCurrentPlace();
    if (!place) return;
    if (indexOfFavorite(place) >= 0) {
      removeFavorite(place);
      return;
    }
    if (favorites.length >= FAVORITES_LIMIT) {
      setLocationStatus(`最多珍藏 ${FAVORITES_LIMIT} 处地点`);
      open();
      return;
    }
    if (pendingFavorite && samePlace(pendingFavorite.place, place)) clearUndo();
    favorites.push({ ...place });
    saveFavorites();
    updateFavoriteButton();
    renderFavorites();
  }

  els.favorite.addEventListener("click", toggleFavorite);
  els.undo.addEventListener("click", undoRemoval);
  els.dialogUndo.addEventListener("click", undoRemoval);
  els.dialog.addEventListener("close", renderFeedback);
  for (const feedback of [els.feedback, els.dialogFeedback]) {
    for (const event of ["pointerenter", "pointerleave", "focusin", "focusout"]) {
      feedback.addEventListener(event, () => queueMicrotask(scheduleUndoExpiry));
    }
  }
  $("locate-button").addEventListener("click", locate);
  $("dialog-locate").addEventListener("click", locate);
  $("welcome-search").addEventListener("click", openForSearch);
  $("error-search").addEventListener("click", openForSearch);
  renderFavorites();

  return { open, updateFavoriteButton, isOpen: () => els.dialog.open };
}
