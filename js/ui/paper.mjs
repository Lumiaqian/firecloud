/**
 * 纸面彩蛋与手势：点黄铜夹引雷、点印章暖阳、点胶带或向右滑动起风，桌面端主卡随指针微倾。
 * 这些装饰不进入键盘与读屏顺序，只响应指针（见设计规范 §4）。
 */
import { $ } from "./dom.mjs";
import { reducedMotion, triggerHaptic } from "./motion.mjs";

const SWIPE_MIN = 90;
const SWIPE_STRONG = 160;
const SWIPE_MAX_DRIFT = 55;

export function bindPaperInteractions(paperFx) {
  $("hero-brass-clip").addEventListener("click", () => {
    triggerHaptic([15, 30, 20]);
    paperFx.strike();
  });
  $("seal-stamp").addEventListener("click", () => {
    triggerHaptic(25);
    paperFx.warm();
  });
  const windFromTape = () => {
    triggerHaptic([12, 22]);
    paperFx.gust("high");
  };
  $("hero-washi-tape").addEventListener("click", windFromTape);
  $("folio-washi-tape").addEventListener("click", windFromTape);

  // 手机端向右横扫唤起一阵风
  let startX = 0;
  let startY = 0;
  document.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", (event) => {
    if (event.changedTouches.length !== 1) return;
    const deltaX = event.changedTouches[0].clientX - startX;
    const deltaY = event.changedTouches[0].clientY - startY;
    if (deltaX > SWIPE_MIN && Math.abs(deltaY) < SWIPE_MAX_DRIFT) {
      triggerHaptic(12);
      paperFx.gust(deltaX > SWIPE_STRONG ? "high" : "gentle");
    }
  }, { passive: true });
}

// 桌面端主卡随指针轻微 3D 倾斜
export function bindHeroTilt(card = $("hero-master-card")) {
  let frame = 0;
  card.addEventListener("mousemove", (event) => {
    if (reducedMotion.matches) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      const rotX = -(y / (rect.height / 2)) * 1.5;
      const rotY = (x / (rect.width / 2)) * 2.0;
      card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(-0.35deg) translateY(-2px)`;
    });
  });
  card.addEventListener("mouseleave", () => {
    cancelAnimationFrame(frame);
    card.style.transform = "";
  });
}
