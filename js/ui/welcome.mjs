/**
 * 欢迎页观测实录。按设备时间选择暮天 / 破晓，手动选择后保持卷别。
 * 实录明确标为非实时样例，不写入预报、地点或天气状态。
 */
import { $ } from "./dom.mjs";

const SPECIMEN_JOURNALS = {
  sunset: {
    titlePrefix: "今晚落日",
    titleSuffix: "值得等吗",
    photo: "assets/sayram_sunset.jpg",
    photoAlt: "新疆赛里木湖西海落日雪山实景观测",
    place: "新疆 · 赛里木湖",
    target: "实景照片 · 新疆赛里木湖西海落日雪山",
    stamp: "晚霞 · 极佳",
    window: "21:25–22:15"
  },
  sunrise: {
    titlePrefix: "明早破晓",
    titleSuffix: "值得早起吗",
    photo: "assets/sayram_sunrise.jpg",
    photoAlt: "新疆赛里木湖松树头晨曦霞光S弯实景观测",
    place: "新疆 · 赛里木湖",
    target: "实景照片 · 新疆赛里木湖松树头晨曦 S 弯",
    stamp: "朝霞 · 极佳",
    window: "06:40–07:25"
  }
};

const FIELDS = {
  "specimen-place": "place",
  "specimen-target": "target",
  "specimen-stamp-text": "stamp",
  "specimen-time-val": "window"
};

export function createWelcome() {
  const card = $("specimen-card");
  const photo = $("specimen-photo");
  const tabs = [...card.querySelectorAll(".specimen-tab")];
  let currentSlot = null;
  let userChose = false;

  function setSlot(slot, manual = false) {
    if (manual) userChose = true;
    currentSlot = slot;
    const data = SPECIMEN_JOURNALS[slot];
    card.dataset.slot = slot;
    for (const tab of tabs) {
      const active = tab.dataset.slot === slot;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-checked", String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    $("welcome-title-prefix").textContent = data.titlePrefix;
    $("welcome-title-suffix").textContent = data.titleSuffix;
    photo.src = data.photo;
    photo.alt = data.photoAlt;
    for (const [id, key] of Object.entries(FIELDS)) $(id).textContent = data[key];
  }

  // 傍晚前展示暮天卷，其余时间展示破晓卷
  function sync() {
    if (userChose) return;
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const slot = hour >= 4 && hour < 19.5 ? "sunset" : "sunrise";
    if (slot !== currentSlot) setSlot(slot);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => setSlot(tab.dataset.slot, true));
    tab.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (!step && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1)
        : tabs[(index + step + tabs.length) % tabs.length];
      next.focus();
      setSlot(next.dataset.slot, true);
    });
  });
  sync();

  return { sync };
}
