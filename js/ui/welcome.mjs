/**
 * 欢迎页：扉页标题与“标杆实录”示例卡片。示例卡按设备时间在暮天卷/破晓卷间自动切换，
 * 用户手动选过后不再自动切换。
 */
import { $ } from "./dom.mjs";

const SPECIMEN_JOURNALS = {
  sunset: {
    titlePrefix: "今晚落日",
    titleSuffix: "值得等吗",
    intro: "读取云幕、远端光路与空气通透度，为下一次朝霞或晚霞给出一份简明判断。",
    photo: "assets/sayram_sunset.jpg",
    photoAlt: "新疆赛里木湖西海落日雪山实景观测",
    place: "新疆 · 赛里木湖 (2,073 m)",
    target: "暮天火烧云与雪峰漫射实录 · 标杆观测",
    stamp: "晚霞极佳 · 值得专程等待",
    window: "21:25 – 22:15",
    m1Title: "云幕受光",
    m1Desc: "博罗科努高层卷云迎阳，将映衬出近半小时壮阔火烧云",
    m2Title: "地平光路",
    m2Desc: "西海低云仅 8%，太阳落入地平前无遮挡",
    m3Title: "高山空气",
    m3Desc: "视距超 80km，瑞利散射纯净，雪山倒影赤红"
  },
  sunrise: {
    titlePrefix: "明早破晓",
    titleSuffix: "值得早起吗",
    intro: "读取东方低层光路与高空卷云受光角，为明早第一缕晨光给出一份出行参考。",
    photo: "assets/sayram_sunrise.jpg",
    photoAlt: "新疆赛里木湖松树头晨曦霞光S弯实景观测",
    place: "新疆 · 赛里木湖 (2,073 m)",
    target: "晨曦破晓映S弯与金顶实录 · 标杆观测",
    stamp: "朝霞极佳 · 值得拂晓守候",
    window: "06:40 – 07:25",
    m1Title: "东方初阳",
    m1Desc: "卷云受光仰角 14.8°，率先捕获第一缕晨曦金光",
    m2Title: "地影天幕",
    m2Desc: "反日点粉蓝地影弧（维纳斯带）横贯天际",
    m3Title: "镜面水色",
    m3Desc: "晨风微弱，松树头 S 弯水面静如明镜，倒映金山"
  }
};

const FIELDS = {
  "specimen-place": "place",
  "specimen-target": "target",
  "specimen-stamp-text": "stamp",
  "specimen-time-val": "window",
  "specimen-m1-title": "m1Title", "specimen-m1-desc": "m1Desc",
  "specimen-m2-title": "m2Title", "specimen-m2-desc": "m2Desc",
  "specimen-m3-title": "m3Title", "specimen-m3-desc": "m3Desc"
};

export function createWelcome() {
  const card = $("specimen-card");
  const body = $("specimen-body");
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
    }
    $("welcome-title-prefix").textContent = data.titlePrefix;
    $("welcome-title-suffix").textContent = data.titleSuffix;
    $("welcome-intro").textContent = data.intro;

    body.classList.add("fade-out");
    photo.classList.add("fade-out");
    setTimeout(() => {
      photo.src = data.photo;
      photo.alt = data.photoAlt;
      for (const [id, key] of Object.entries(FIELDS)) $(id).textContent = data[key];
      body.classList.remove("fade-out");
      photo.classList.remove("fade-out");
    }, 120);
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
      if (!step) return;
      event.preventDefault();
      const next = tabs[(index + step + tabs.length) % tabs.length];
      next.focus();
      setSlot(next.dataset.slot, true);
    });
  });
  sync();

  return { sync };
}
