/**
 * 纸缘反馈：夹端局部受光、评分圈注暖光、胶带与天空右划起风。
 * 阵风微抬原纸面及内容，不改变预报或布局；装饰反馈仅读屏播报，不显示演示说明。
 */
import { $ } from "./dom.mjs";
import { triggerHaptic } from "./motion.mjs";

const SWIPE_MIN = 90;
const SWIPE_STRONG = 160;
const SWIPE_MAX_DRIFT = 55;
const SWIPE_EXCLUDED = "button, a, input, select, textarea, label, summary, dialog, [role='dialog'], [role='button'], [contenteditable], [data-weather-surface], [data-scroll-region], .horizontal-scroll-region, .week-scroll, #week, .week-block";

export function bindPaperInteractions(paperFx) {
  const announce = (message, played) => {
    const status = $("paper-fx-status");
    if (status) {
      status.textContent = played ? message : document.body.dataset.input === "keyboard"
        ? "键盘操作 · 仅文字反馈，天气与预报不变。"
        : "动效已停用 · 仅文字反馈，天气与预报不变。";
    }
  };
  $("paper-clip-action")?.addEventListener("click", () => {
    triggerHaptic([15, 30, 20]);
    announce("夹端受光 · 一次局部光影，天气与预报不变。", paperFx.strike());
  });
  $("score-circle-action")?.addEventListener("click", () => {
    triggerHaptic(25);
    announce("圈注暖光 · 天气与预报不变。", paperFx.warm());
  });
  const windFromTape = () => {
    triggerHaptic([12, 22]);
    announce("纸缘起风。", paperFx.gust("high"));
  };
  $("paper-tape-action")?.addEventListener("click", windFromTape);

  let gesture = null;
  let suppressClickUntil = 0;
  const excludesSwipe = (target) => document.querySelector("dialog[open]") || (target instanceof Element && Boolean(target.closest(SWIPE_EXCLUDED)));
  const trackMovement = (touch) => {
    if (Math.hypot(touch.clientX - gesture.x, touch.clientY - gesture.y) > 12) {
      suppressClickUntil = performance.now() + 500;
    }
  };

  document.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1 || excludesSwipe(event.target)) {
      gesture = null;
      return;
    }
    const touch = event.touches[0];
    gesture = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  document.addEventListener("touchmove", (event) => {
    if (!gesture) return;
    if (event.touches.length !== 1 || excludesSwipe(event.target)) {
      gesture = null;
      return;
    }
    if (event.touches[0].identifier === gesture.id) trackMovement(event.touches[0]);
  }, { passive: true });
  document.addEventListener("touchcancel", () => { gesture = null; }, { passive: true });
  document.addEventListener("touchend", (event) => {
    const start = gesture;
    if (!start) return;
    const touch = event.changedTouches[0];
    if (touch?.identifier === start.id) trackMovement(touch);
    gesture = null;
    if (event.touches.length || event.changedTouches.length !== 1 || excludesSwipe(event.target) || touch.identifier !== start.id) return;
    const deltaX = touch.clientX - start.x;
    const drift = Math.abs(touch.clientY - start.y);
    if (deltaX > SWIPE_MIN && drift < SWIPE_MAX_DRIFT && deltaX > drift * 2) {
      triggerHaptic(12);
      announce("天空起风。", paperFx.gust(deltaX > SWIPE_STRONG ? "high" : "gentle"));
    }
  }, { passive: true });
  document.addEventListener("click", (event) => {
    if (performance.now() >= suppressClickUntil || event.detail === 0) return;
    if (event.sourceCapabilities?.firesTouchEvents === false) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClickUntil = 0;
  }, true);
}
