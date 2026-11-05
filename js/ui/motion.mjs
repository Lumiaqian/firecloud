// 动效与触感：尊重系统“减少动效”，键盘操作时也不播放过渡动画。

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

export function trackInputModality(body = document.body) {
  const preferenceKey = "firecloud:motion:v1";
  let enabled = true;
  try { enabled = JSON.parse(localStorage.getItem(preferenceKey)) !== false; } catch { /* private browsing */ }
  const toggle = document.getElementById("motion-toggle");
  const syncMotion = () => {
    body.dataset.motion = String(enabled && !reducedMotion.matches);
    if (toggle) {
      toggle.textContent = reducedMotion.matches ? "系统减弱动效" : enabled ? "动效 开" : "动效 关";
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.setAttribute("aria-description", reducedMotion.matches ? "系统减弱动态优先；纸面反馈仅显示文字" : "关闭后保留静态天气与月相");
    }
    if (body.dataset.motion === "false") {
      document.getAnimations().forEach((animation) => animation.cancel());
    }
    body.dispatchEvent(new Event("firecloud:motionchange"));
  };
  toggle?.addEventListener("click", () => {
    enabled = !enabled;
    try { localStorage.setItem(preferenceKey, JSON.stringify(enabled)); } catch { /* private browsing */ }
    syncMotion();
  });
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", syncMotion);
  else reducedMotion.addListener(syncMotion);
  syncMotion();
  document.addEventListener("pointerdown", () => { body.dataset.input = "pointer"; }, true);
  document.addEventListener("keydown", () => { body.dataset.input = "keyboard"; }, true);
}

export function motionAllowed() {
  return !reducedMotion.matches && document.body.dataset.motion !== "false" && document.body.dataset.input !== "keyboard";
}

export function triggerHaptic(pattern = 10) {
  if (navigator.vibrate && motionAllowed()) {
    try { navigator.vibrate(pattern); } catch { /* 部分浏览器在未交互时拒绝振动 */ }
  }
}

