/**
 * 地点与收藏：地点弹窗、城市搜索、设备定位、收藏星标与“移出后可撤销”反馈。
 * 选中地点后通过 onChoose 交给预报会话加载。
 */
import { reverseGeocode, searchCities } from "../api.mjs";
import { FAVORITES_LIMIT, KEYS, normalizeFavorites, placeIdentity, samePlace } from "../core/storage.mjs";
import { $, el } from "./dom.mjs";

const SEARCH_DEBOUNCE = 300;
const UNDO_TIMEOUT = 7000;

function placeIcon(path, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);
  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("d", path);
  svg.append(shape);
  return svg;
}

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

  function setSearchStatus(message, status, detail) {
    if (status) els.searchStatus.dataset.status = status;
    else els.searchStatus.removeAttribute("data-status");
    if (status === "empty" || status === "error") {
      const path = status === "empty"
        ? "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM15 15l6 6M7 10h6"
        : "M12 3 23 22H1L12 3ZM12 9v6m0 3v1";
      const copy = el("div", "search-status-copy");
      copy.append(el("strong", null, message), el("p", null, detail));
      els.searchStatus.replaceChildren(placeIcon(path, "search-status-icon"), copy);
    } else {
      els.searchStatus.textContent = message;
    }
  }

  function setLocationStatus(message) {
    els.geoNotice.textContent = message;
    setSearchStatus(message);
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
    setSearchStatus("");
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
      setSearchStatus("");
      setSearchBusy(false);
      return;
    }
    searchTimer = setTimeout(async () => {
      setSearchBusy(true);
      setSearchStatus("正在搜索…", "loading");
      try {
        const results = await searchCities(query);
        if (requestId !== searchRequestId) return;
        renderSearchResults(results);
        if (results.length) setSearchStatus(`找到 ${results.length} 处地点`);
        else setSearchStatus("未寻得匹配城市", "empty", "试试输入省市全称，或使用设备定位。");
      } catch {
        if (requestId !== searchRequestId) return;
        els.searchResults.replaceChildren();
        setSearchStatus("城市检索网络未通", "error", "请稍后重试。也可以选择已收藏的地点。");
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
    updateFavoriteSelection(place);
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
    const number = el("span", "favorite-number");
    number.setAttribute("aria-hidden", "true");
    const copy = el("span", "favorite-copy");
    copy.append(el("strong", "place-label", place.name), el("small", null, place.detail || ""));
    const current = el("span", "favorite-current", "当前");
    current.setAttribute("aria-hidden", "true");
    current.hidden = true;
    pick.append(number, copy, current);
    pick.addEventListener("click", () => choose(place));
    const remove = el("button", "delete-favorite");
    remove.type = "button";
    remove.setAttribute("aria-label", `移出收藏 ${place.name}`);
    remove.append(placeIcon("m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 3Z"));
    remove.addEventListener("click", () => removeFavorite(place));
    item.append(pick, remove);
    return item;
  }

  function updateFavoriteSelection(place = getCurrentPlace()) {
    const identity = place ? placeIdentity(place) : null;
    for (const row of els.favoritesList.children) {
      const current = row.dataset.place === identity;
      const pick = row.querySelector(".favorite-place");
      if (current) pick.setAttribute("aria-current", "location");
      else pick.removeAttribute("aria-current");
      row.querySelector(".favorite-current").hidden = !current;
    }
  }

  // 复用保留的收藏行，增删与重新编号即时生效，不播放位移动画。
  function renderFavorites() {
    const list = els.favoritesList;
    const oldRows = new Map([...list.children].map((row) => [row.dataset.place, row]));
    const rows = favorites.map((place) => oldRows.get(placeIdentity(place)) ?? favoriteRow(place));
    const retained = new Set(rows);
    for (const row of oldRows.values()) {
      if (!retained.has(row)) row.remove();
    }
    rows.forEach((row, index) => {
      row.querySelector(".favorite-number").textContent = String(index + 1).padStart(2, "0");
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
    });
    updateFavoriteSelection();
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
