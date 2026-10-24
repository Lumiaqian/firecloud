/**
 * 天体穹顶观测台（开发者实验室）：预览并选择加载动画、调速、模拟昼夜与月相。
 * 入口：连续点击品牌 3 次，或在非编辑区域按 Shift + D。
 */
import { lunarPhase } from "../forecast.mjs";
import { KEYS } from "../core/storage.mjs";
import { $ } from "./dom.mjs";
import { loaderMarkup } from "./loaders.mjs";
import { triggerHaptic } from "./motion.mjs";

const BRAND_CLICKS = 3;
const BRAND_CLICK_WINDOW = 600;

function moonPhaseName(fraction, isWaxing) {
  if (fraction > 0.95) return "满月 (望)";
  if (fraction < 0.05) return "新月 (朔)";
  if (isWaxing) return fraction > 0.4 ? "盈凸月" : "蛾眉月";
  return fraction > 0.4 ? "亏凸月" : "残月";
}

export function createDevLab({ storage, moonView, getPlace, onBrandClick, onTestLoading }) {
  const els = {
    dialog: $("dev-lab-dialog"), stage: $("dev-preview-stage"), slider: $("dev-lens-slider"),
    mainStage: $("loader-stage"), brand: $("open-places"),
    saveDefault: $("dev-btn-save-default"), testLoading: $("dev-btn-test-loading"),
    toggleNight: $("dev-btn-toggle-night"), moonSlider: $("dev-moon-slider")
  };
  const lensTabs = [...document.querySelectorAll(".lens-tab")];
  const speedButtons = [...document.querySelectorAll(".lens-speed-btn")];
  let loaderStyle = storage.get(KEYS.loaderStyle, "horizon");
  let speedFactor = 1;

  // 按倍率缩放预览中各动画的原始时长
  function applySpeed(stage, factor) {
    for (const node of stage.querySelectorAll('[class*="kepler"], [class*="prism"], [class*="chroma"], [class*="horizon"]')) {
      if (!node.hasAttribute("data-orig-duration")) {
        const duration = parseFloat(getComputedStyle(node).animationDuration);
        if (duration > 0) node.setAttribute("data-orig-duration", duration);
      }
      const original = parseFloat(node.getAttribute("data-orig-duration"));
      if (original > 0) node.style.animationDuration = `${original * factor}s`;
    }
  }

  function applyLoaderStyle(style) {
    loaderStyle = style;
    els.mainStage.innerHTML = loaderMarkup(style, "main-");
    els.stage.innerHTML = loaderMarkup(style, "prev-");
    if (speedFactor !== 1) applySpeed(els.stage, speedFactor);
    for (const tab of lensTabs) {
      const active = tab.dataset.style === style;
      tab.setAttribute("data-active", String(active));
      tab.setAttribute("aria-selected", String(active));
      if (active) els.slider.style.transform = `translateX(calc(${Number(tab.dataset.idx)} * (100% + 2px)))`;
    }
  }

  function open() {
    applyLoaderStyle(loaderStyle);
    if (els.dialog.open) return;
    els.dialog.classList.remove("is-dragging", "is-settling", "is-dismissing");
    els.dialog.style.removeProperty("--sheet-translate-y");
    els.dialog.style.removeProperty("--backdrop-opacity");
    els.dialog.showModal();
    triggerHaptic(14);
  }

  // 品牌按钮：单击交给地点弹窗，600ms 内连点 3 次打开观测台
  let brandClicks = 0;
  let brandTimer = null;
  els.brand.addEventListener("click", (event) => {
    brandClicks += 1;
    clearTimeout(brandTimer);
    brandTimer = setTimeout(() => { brandClicks = 0; }, BRAND_CLICK_WINDOW);
    if (brandClicks >= BRAND_CLICKS) {
      brandClicks = 0;
      event.preventDefault();
      event.stopPropagation();
      open();
      return;
    }
    onBrandClick();
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (event.isComposing || target instanceof HTMLElement
      && (target.isContentEditable || target.closest("input, textarea, select"))) return;
    if (event.key === "D" && event.shiftKey && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      open();
    }
  });

  lensTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      applyLoaderStyle(tab.dataset.style);
      triggerHaptic(12);
    });
    tab.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = lensTabs[(index + step + lensTabs.length) % lensTabs.length];
      next.focus();
      applyLoaderStyle(next.dataset.style);
    });
  });

  for (const button of speedButtons) {
    button.addEventListener("click", () => {
      speedButtons.forEach((other) => other.removeAttribute("data-active"));
      button.setAttribute("data-active", "true");
      speedFactor = parseFloat(button.dataset.speed) || 1;
      applySpeed(els.stage, speedFactor);
      triggerHaptic(10);
    });
  }

  els.saveDefault.addEventListener("click", () => {
    storage.set(KEYS.loaderStyle, loaderStyle);
    const label = els.saveDefault.firstElementChild;
    const original = label.textContent;
    label.textContent = "已设为默认 ✓";
    els.saveDefault.disabled = true;
    setTimeout(() => {
      label.textContent = original;
      els.saveDefault.disabled = false;
    }, 1600);
  });

  els.testLoading.addEventListener("click", () => {
    els.dialog.close();
    onTestLoading();
  });

  els.toggleNight.addEventListener("click", () => {
    triggerHaptic(12);
    const next = document.body.dataset.light === "night" ? "day" : "night";
    document.body.dataset.light = next;
    els.toggleNight.textContent = `切换夜幕天体 (当前: ${next === "night" ? "夜" : "昼"})`;
  });

  els.moonSlider.addEventListener("input", (event) => {
    const value = parseInt(event.target.value, 10);
    const fraction = value / 100;
    const isWaxing = value <= 50;
    const place = getPlace();
    moonView.render({
      ...lunarPhase(new Date(), place?.lat || 30.27, place?.lon || 120.15),
      phaseFraction: fraction,
      isWaxing,
      phaseName: moonPhaseName(fraction, isWaxing)
    });
  });

  applyLoaderStyle(loaderStyle);
  return { open };
}
