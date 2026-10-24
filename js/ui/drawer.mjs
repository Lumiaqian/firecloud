/**
 * 窄屏底部抽屉：手柄、标题区或滚动到顶时可下拉，带橡皮筋阻尼与按释放速度投影的关闭判定。
 * 返回重置函数，打开前调用以清除上次拖拽留下的位移。
 */
import { motionAllowed } from "./motion.mjs";

export function initFluidDrawer(dialog) {
  if (!dialog) return;

  const handle = dialog.querySelector("#drawer-handle") || dialog.querySelector(".drawer-handle");
  const head = dialog.querySelector(".dialog-head");

  let isDragging = false;
  let startY = 0;
  let currentY = 0;
  let currentTranslateY = 0;
  let activePointerId = null;
  let history = [];
  let motionTimer = null;
  let motionEnd = null;
  let didDrag = false;

  function cancelMotion() {
    clearTimeout(motionTimer);
    motionTimer = null;
    if (motionEnd) dialog.removeEventListener("transitionend", motionEnd);
    motionEnd = null;
  }

  function finishMotion(callback, delay) {
    cancelMotion();
    const onEnd = (event) => {
      if (event && (event.target !== dialog || event.propertyName !== "transform")) return;
      cancelMotion();
      callback();
    };
    motionEnd = onEnd;
    dialog.addEventListener("transitionend", onEnd);
    motionTimer = setTimeout(() => onEnd(), delay);
  }

  function rubberband(overshoot, dimension = 350, constant = 0.45) {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
  }

  function project(velocity, decelerationRate = 0.992) {
    return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
  }

  function setTranslateY(y) {
    currentTranslateY = y;
    dialog.style.setProperty("--sheet-translate-y", `${y}px`);
    const height = dialog.offsetHeight || 500;
    const progress = Math.min(1, Math.max(0, 1 - (Math.max(0, y) / height)));
    dialog.style.setProperty("--backdrop-opacity", String(progress));
  }

  function resetDialogStyles() {
    cancelMotion();
    dialog.classList.remove("is-dragging", "is-settling", "is-dismissing");
    dialog.style.removeProperty("--sheet-translate-y");
    dialog.style.removeProperty("--backdrop-opacity");
    dialog.style.removeProperty("animation");
    currentTranslateY = 0;
    isDragging = false;
    activePointerId = null;
    didDrag = false;
  }

  function dismissDrawer() {
    if (!motionAllowed()) {
      dialog.close();
      resetDialogStyles();
      return;
    }
    const presentation = getComputedStyle(dialog);
    dialog.style.transform = presentation.transform;
    dialog.style.opacity = presentation.opacity;
    dialog.style.animation = "none";
    void dialog.offsetWidth;
    dialog.classList.remove("is-dragging", "is-settling");
    dialog.classList.add("is-dismissing");
    dialog.style.removeProperty("transform");
    dialog.style.removeProperty("opacity");
    dialog.style.setProperty("--backdrop-opacity", "0");
    finishMotion(() => {
      if (dialog.open) dialog.close();
      resetDialogStyles();
    }, 240);
  }

  function springBack() {
    dialog.classList.remove("is-dragging", "is-dismissing");
    dialog.classList.add("is-settling");
    setTranslateY(0);
    finishMotion(resetDialogStyles, 320);
  }

  function canStartDrag(e) {
    if (!dialog.open) return false;
    if (window.matchMedia("(min-width: 761px)").matches) return false;
    const rect = dialog.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) {
      return false;
    }
    if (handle && (e.target === handle || handle.contains(e.target))) return true;
    if (head && (e.target === head || head.contains(e.target))) {
      if (e.target.closest("button, a, input")) return false;
      return true;
    }
    if (dialog.scrollTop <= 0) {
      if (e.target.closest("button, a, input")) return false;
      return true;
    }
    return false;
  }

  dialog.addEventListener("pointerdown", (e) => {
    if (activePointerId !== null) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!canStartDrag(e)) return;

    didDrag = false;

    if (dialog.classList.contains("is-settling") || dialog.classList.contains("is-dismissing")) {
      const presentationY = new DOMMatrix(getComputedStyle(dialog).transform).m42;
      cancelMotion();
      dialog.classList.remove("is-settling", "is-dismissing");
      dialog.classList.add("is-dragging");
      setTranslateY(presentationY);
    } else {
      dialog.classList.add("is-dragging");
    }

    isDragging = true;
    activePointerId = e.pointerId;
    startY = e.clientY - currentTranslateY;
    currentY = e.clientY;
    history = [{ y: e.clientY, t: performance.now() }];
    try { dialog.setPointerCapture(e.pointerId); } catch {}

    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      document.activeElement.blur();
    }
  });

  dialog.addEventListener("pointermove", (e) => {
    if (!isDragging || e.pointerId !== activePointerId) return;

    currentY = e.clientY;
    if (Math.abs(currentY - startY) > 5) {
      didDrag = true;
    }
    const now = performance.now();
    history.push({ y: currentY, t: now });
    while (history.length > 2 && now - history[0].t > 100) {
      history.shift();
    }

    const deltaY = currentY - startY;
    let appliedY;
    if (deltaY < 0) {
      appliedY = rubberband(deltaY, 300, 0.4);
    } else {
      appliedY = deltaY;
    }

    setTranslateY(appliedY);
  });

  function handlePointerEnd(e) {
    if (!isDragging || e.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
    try { dialog.releasePointerCapture(e.pointerId); } catch {}
    if (e.type === "pointercancel") {
      if (dialog.open) springBack();
      return;
    }

    const now = performance.now();
    const recent = history.filter((p) => now - p.t < 120);
    const first = recent[0] || history[0] || { y: currentY, t: now - 16 };
    const dt = Math.max(0.016, (now - first.t) / 1000);
    const releaseVelocity = (currentY - first.y) / dt;

    const projectedY = currentTranslateY + project(releaseVelocity, 0.992);
    const dialogHeight = dialog.offsetHeight || 400;

    if (projectedY > dialogHeight * 0.35 || (releaseVelocity > 550 && currentTranslateY > 30)) {
      dismissDrawer();
    } else {
      springBack();
    }
  }

  dialog.addEventListener("pointerup", handlePointerEnd);
  dialog.addEventListener("pointercancel", handlePointerEnd);
  dialog.querySelector(".dialog-close")?.addEventListener("click", (event) => {
    if (!event.detail || !motionAllowed()) return;
    event.preventDefault();
    dismissDrawer();
  });
  dialog.addEventListener("click", (e) => {
    if (didDrag) {
      didDrag = false;
      return;
    }
    if (e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isInside = (
      rect.top <= e.clientY && e.clientY <= rect.bottom &&
      rect.left <= e.clientX && e.clientX <= rect.right
    );
    if (!isInside) {
      dismissDrawer();
    }
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open) resetDialogStyles();
  });
  return resetDialogStyles;
}
