/**
 * 纸缘特效：手动夹端受光、评分圈注暖光、阵风碎屑与实况纸缘接触。
 * 四张纸面分别承接天气；透明的主卡分组与纸上文字不参与运动。
 * 粒子画在前景画布上，系统减弱动态实时清理所有未完成反馈。
 */
import { motionAllowed, reducedMotion } from "./motion.mjs";

const AMBIENT_GUST_INTERVAL = { strong: 32_000, breezy: 45_000 };
const STRIKE_DURATION = 650;
const WARM_DURATION = 3600;
const GUST_DURATION = 2200;

function lightningPath(fromX, hitX, hitY) {
  const segments = [];
  const startY = hitY - 64;
  let x = fromX;
  let y = startY;
  const steps = 8;
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const jitter = (1 - t * 0.6) * 12;
    const nextX = step === steps ? hitX : fromX + (hitX - fromX) * t + (Math.random() - 0.5) * jitter;
    const nextY = step === steps ? hitY : startY + (hitY - startY) * t + (Math.random() - 0.5) * 8;
    segments.push({ x1: x, y1: y, x2: nextX, y2: nextY });
    // 偶发小旁支
    if (step > 2 && step < 7 && Math.random() < 0.3) {
      segments.push({ x1: x, y1: y, x2: x + (Math.random() - 0.5) * 20, y2: y + Math.random() * 12 + 4 });
    }
    x = nextX;
    y = nextY;
  }
  return segments;
}

export function createPaperFx(canvas, { loop, body = document.body }) {
  const ctx = canvas.getContext("2d");
  const els = {
    sheets: [...document.querySelectorAll("[data-weather-surface]")].map((element) => ({ element, rect: element.getBoundingClientRect() })),
    clip: document.getElementById("paper-clip-action"),
    circle: document.getElementById("score-circle-action"),
    tape: document.getElementById("paper-tape-action")
  };
  for (const { element } of els.sheets) {
    if (!element.closest("#panel-ready")) continue;
    const edge = document.createElement("span");
    edge.className = "paper-edge-contact";
    edge.setAttribute("aria-hidden", "true");
    edge.innerHTML = "<i></i><i></i>";
    element.append(edge);
    const corner = document.createElement("i");
    corner.className = "paper-free-edge";
    corner.setAttribute("aria-hidden", "true");
    element.append(corner);
  }
  const bolts = [];
  const sparks = [];
  const debris = [];
  let width = 0;
  let height = 0;
  let gustTimer = null;
  let strikeTimer = null;
  let warmTimer = null;
  let ambientTimer = null;
  let lastConditions = null;
  let measureFrame = null;
  const ambientMotionAllowed = () => !reducedMotion.matches && body.dataset.motion !== "false" && !document.hidden;

  function measureSheets() {
    for (const sheet of els.sheets) sheet.rect = sheet.element.getBoundingClientRect();
    measureFrame = null;
  }

  function queueMeasure() {
    if (measureFrame == null) measureFrame = requestAnimationFrame(measureSheets);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    measureSheets();
  }

  const busy = () => bolts.length || sparks.length || debris.length;
  const wake = () => { if (ambientMotionAllowed()) loop.add(frame); };

  // ---------- 夹端的一次局部引雷：从不自动触发，不触及评分或时间 ----------
  function strike() {
    if (!motionAllowed() || !els.clip) return;
    clearTimeout(strikeTimer);
    bolts.length = 0;
    sparks.length = 0;
    const rect = els.clip.getBoundingClientRect();
    const hitX = rect.left + rect.width * 0.5;
    const hitY = rect.top + rect.height * 0.3;
    els.clip.classList.add("is-lightning-struck");
    const fromX = hitX + (Math.random() - 0.5) * 36;
    bolts.push({ segments: lightningPath(fromX, hitX, hitY), hitX, hitY, startTime: performance.now(), duration: STRIKE_DURATION });
    for (let k = 0; k < 16; k += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.4 + 0.5;
      sparks.push({
        x: hitX,
        y: hitY,
        hitX,
        hitY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: Math.random() * 1.2 + 0.7,
        alpha: 1,
        color: Math.random() > 0.35 ? "rgba(255, 245, 195," : "rgba(255, 205, 80,"
      });
    }
    strikeTimer = setTimeout(() => {
      strikeTimer = null;
      els.clip.classList.remove("is-lightning-struck");
      bolts.length = 0;
      sparks.length = 0;
      wake();
    }, STRIKE_DURATION);
    wake();
  }

  // ---------- 晴光 ----------
  function setSunlit(on) {
    els.clip?.classList.toggle("is-sun-glowing", on);
    els.tape?.classList.toggle("is-sun-translucent", on);
  }

  function warm() {
    if (!motionAllowed()) return;
    clearTimeout(warmTimer);
    els.circle?.classList.add("is-sun-warmed");
    warmTimer = setTimeout(() => {
      warmTimer = null;
      els.circle?.classList.remove("is-sun-warmed");
    }, WARM_DURATION);
  }

  // ---------- 阵风 ----------
  function gust(intensity = "high") {
    if (!ambientMotionAllowed() || body.dataset.input === "keyboard") return;
    clearTimeout(gustTimer);
    body.dataset.paperWind = intensity;
    debris.length = 0;

    const strong = intensity === "high";
    for (let k = 0; k < (strong ? 14 : 7); k += 1) {
      const roll = Math.random();
      debris.push({
        startX: -40 - k * 11,
        startY: Math.random() * (height * 0.88) + height * 0.04,
        startedAt: performance.now(),
        duration: strong ? 1400 : 2300,
        travel: strong ? 1450 : 1000,
        size: Math.random() * 6 + 3,
        angle: Math.random() * Math.PI * 2,
        alpha: strong ? Math.random() * 0.22 + 0.6 : Math.random() * 0.18 + 0.4,
        type: roll > 0.62 ? "leaf" : roll > 0.32 ? "petal" : "chaff"
      });
    }
    wake();
    gustTimer = setTimeout(() => {
      gustTimer = null;
      delete body.dataset.paperWind;
      debris.length = 0;
      wake();
    }, GUST_DURATION);
  }

  // ---------- 雨 ----------
  function soak() {
    els.sheets.forEach(({ element }) => element.classList.add("is-rain-damp"));
  }

  function dry() {
    els.sheets.forEach(({ element }) => element.classList.remove("is-rain-damp"));
  }

  function clearEffects() {
    clearTimeout(strikeTimer);
    clearTimeout(warmTimer);
    clearTimeout(gustTimer);
    clearInterval(ambientTimer);
    strikeTimer = warmTimer = gustTimer = ambientTimer = null;
    delete body.dataset.paperWind;
    els.clip?.classList.remove("is-lightning-struck");
    els.circle?.classList.remove("is-sun-warmed");
    setSunlit(Boolean(lastConditions?.sunlit));
    bolts.length = sparks.length = debris.length = 0;
    loop.remove(frame);
    ctx.clearRect(0, 0, width, height);
  }

  function startAmbientWind() {
    if (!ambientMotionAllowed() || !lastConditions || lastConditions.ambient === "calm") return;
    ambientTimer = setInterval(() => {
      if (ambientMotionAllowed()) gust("gentle");
    }, AMBIENT_GUST_INTERVAL[lastConditions.ambient]);
  }

  // 只消费当前实况；预报日期与朝晚霞选择不改写纸面天气。
  function syncWeather({ weather, windSpeed = 0, windGust = 0, cloudCover = 0, precipitation = 0, isDay = true, light = isDay ? "day" : "night" } = {}) {
    queueMeasure();
    const conditions = {
      weather, light,
      thunder: weather === "thunder",
      sunlit: (weather === "clear" || weather === "sunny") && isDay,
      windy: windSpeed >= 18 || windGust >= 28,
      ambient: windSpeed >= 20 ? "strong" : windSpeed >= 8 ? "breezy" : "calm",
      cloudy: cloudCover >= 75 || ["overcast", "rain", "thunder", "hail"].includes(weather),
      snowy: weather === "snow",
      hailing: weather === "hail",
      rainy: weather === "rain" || weather === "thunder" || (!["snow", "hail"].includes(weather) && precipitation > 0.05)
    };
    const previous = lastConditions;
    if (previous && Object.keys(conditions).every((key) => conditions[key] === previous[key])) return;
    clearEffects();
    lastConditions = conditions;
    setSunlit(conditions.sunlit);
    startAmbientWind();
    if (conditions.windy) gust("high");
    els.sheets.forEach(({ element }) => {
      element.classList.toggle("is-cloud-shadowed", conditions.cloudy);
      element.classList.toggle("is-thunder-ambient", conditions.thunder);
      element.classList.toggle("is-snow-contact", conditions.snowy);
      element.classList.toggle("is-hail-contact", conditions.hailing);
    });
    if (conditions.rainy) soak();
    else dry();
  }

  // ---------- 绘制 ----------
  function drawBolts(now) {
    for (let index = bolts.length - 1; index >= 0; index -= 1) {
      const bolt = bolts[index];
      const elapsed = now - bolt.startTime;
      if (elapsed > bolt.duration) {
        bolts.splice(index, 1);
        continue;
      }
      const alpha = Math.max(0, 1 - elapsed / bolt.duration);
      const trace = () => {
        ctx.beginPath();
        bolt.segments.forEach((segment, i) => {
          if (i === 0) ctx.moveTo(segment.x1, segment.y1);
          ctx.lineTo(segment.x2, segment.y2);
        });
      };
      ctx.save();
      // One local pulse above the clip: never cross into the score or time.
      ctx.beginPath();
      ctx.rect(bolt.hitX - 40, bolt.hitY - 78, 80, 84);
      ctx.clip();
      trace();
      ctx.strokeStyle = `rgba(255, 240, 180, ${alpha * 0.85})`;
      ctx.lineWidth = 5.5 * alpha;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(255, 220, 120, 0.95)";
      ctx.stroke();
      trace();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bolt.hitX, bolt.hitY, 6 + (1 - alpha) * 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 245, 210, ${alpha * 0.75})`;
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSparks() {
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.vy += 0.28;
      spark.alpha *= 0.94;
      if (spark.y > spark.hitY + 8 || Math.abs(spark.x - spark.hitX) > 28 || spark.alpha < 0.05) {
        sparks.splice(index, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(spark.hitX - 40, spark.hitY - 78, 80, 84);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${spark.color} ${spark.alpha})`;
      ctx.shadowColor = "rgba(255, 220, 100, 0.8)";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  function drawDebris(now) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    for (const { rect } of els.sheets) ctx.rect(rect.left, rect.top, rect.width, rect.height);
    ctx.clip("evenodd");
    for (let index = debris.length - 1; index >= 0; index -= 1) {
      const piece = debris[index];
      const progress = (now - piece.startedAt) / piece.duration;
      if (progress >= 1) { debris.splice(index, 1); continue; }
      piece.x = piece.startX + progress * piece.travel;
      piece.y = piece.startY + 15 - progress * 55;
      piece.angle = (-10 + progress * 100) * Math.PI / 180;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.angle);
      if (piece.type === "chaff") {
        ctx.fillStyle = `rgba(244, 236, 222, ${piece.alpha})`;
        ctx.fillRect(-piece.size * 0.5, -piece.size * 0.3, piece.size, piece.size * 0.6);
      } else {
        ctx.fillStyle = piece.type === "petal"
          ? `rgba(235, 172, 142, ${piece.alpha * 0.9})`
          : `rgba(186, 126, 72, ${piece.alpha})`;
        ctx.beginPath();
        if (piece.type === "petal") ctx.arc(0, 0, piece.size * 0.42, 0, Math.PI * 2);
        else ctx.ellipse(0, 0, piece.size * 0.7, piece.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (piece.x > width + 60) debris.splice(index, 1);
    }
    ctx.restore();
  }


  function frame() {
    if (!ambientMotionAllowed()) {
      clearEffects();
      return;
    }
    const now = performance.now();
    ctx.clearRect(0, 0, width, height);
    drawBolts(now);
    drawSparks();
    drawDebris(now);
    if (!busy()) loop.remove(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("resize", queueMeasure, { passive: true });
  window.addEventListener("scroll", queueMeasure, { passive: true });
  const layoutObserver = new MutationObserver(queueMeasure);
  const layoutRoot = document.getElementById("panel-ready");
  if (layoutRoot) layoutObserver.observe(layoutRoot, { childList: true, subtree: true });
  const onMotionChange = () => {
    clearEffects();
    if (ambientMotionAllowed()) {
      startAmbientWind();
    }
  };
  body.addEventListener("firecloud:motionchange", onMotionChange);
  document.addEventListener("visibilitychange", onMotionChange);
  resize();

  return { strike, warm, gust, syncWeather };
}
