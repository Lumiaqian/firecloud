// 动效与触感：尊重系统“减少动效”，键盘操作时也不播放过渡动画。

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

export function trackInputModality(body = document.body) {
  document.addEventListener("pointerdown", () => { body.dataset.input = "pointer"; }, true);
  document.addEventListener("keydown", () => { body.dataset.input = "keyboard"; }, true);
}

export function motionAllowed() {
  return !reducedMotion.matches && document.body.dataset.input !== "keyboard";
}

export function triggerHaptic(pattern = 10) {
  if (navigator.vibrate && motionAllowed()) {
    try { navigator.vibrate(pattern); } catch { /* 部分浏览器在未交互时拒绝振动 */ }
  }
}

// 数据更新时的轻微淡入，提示内容已变化
export function fadeUpdate(element) {
  if (!motionAllowed() || !element) return;
  element.getAnimations().forEach((animation) => animation.cancel());
  element.animate([
    { opacity: 0.45, transform: "translateY(3px)" },
    { opacity: 1, transform: "translateY(0)" }
  ], {
    duration: 200, easing: "cubic-bezier(0.23, 1, 0.32, 1)"
  });
}
