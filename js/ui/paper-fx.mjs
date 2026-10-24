/**
 * 纸面特效：闪电劈中黄铜夹、晴光暖印、阵风掀纸与碎屑、雨滴打在主卡上的涟漪，
 * 以及按实况天气切换的纸面状态（受潮、晴光、云影）。
 * 粒子画在前景画布上；只有存在粒子或正在下雨时才占用共享帧循环。
 */
import { reducedMotion } from "./motion.mjs";

const AMBIENT_GUST_INTERVAL = { strong: 32_000, breezy: 45_000, calm: 60_000 };
const MAX_RIPPLES = 24;

function lightningPath(fromX, hitX, hitY) {
  const segments = [];
  const startY = -40;
  let x = fromX;
  let y = startY;
  const steps = 14;
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const jitter = (1 - t * 0.6) * 45;
    const nextX = step === steps ? hitX : fromX + (hitX - fromX) * t + (Math.random() - 0.5) * jitter;
    const nextY = step === steps ? hitY : startY + (hitY - startY) * t + (Math.random() - 0.5) * 8;
    segments.push({ x1: x, y1: y, x2: nextX, y2: nextY });
    // 偶发小旁支
    if (step > 3 && step < 11 && Math.random() < 0.45) {
      segments.push({ x1: x, y1: y, x2: x + (Math.random() - 0.5) * 60, y2: y + Math.random() * 38 + 10 });
    }
    x = nextX;
    y = nextY;
  }
  return segments;
}

function flash(element, className, duration) {
  if (!element) return;
  element.classList.add(className);
  setTimeout(() => element.classList.remove(className), duration);
}

export function createPaperFx(canvas, { loop, body = document.body }) {
  const ctx = canvas.getContext("2d");
  const els = {
    card: document.getElementById("hero-master-card"),
    clip: document.querySelector(".hero-brass-clip"),
    seal: document.querySelector(".cinnabar-seal-stamp"),
    tape: document.querySelector(".hero-washi-tape-topleft"),
    score: document.querySelector(".score-number-display"),
    time: document.querySelector(".hero-event-time")
  };
  const bolts = [];
  const sparks = [];
  const debris = [];
  const ripples = [];
  let width = 0;
  let height = 0;
  let raining = false;
  let nextRippleAt = 0;
  let gustTimer = null;
  let ambientTimer = null;
  let thunderTimer = null;
  let lastConditions = null;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  const busy = () => bolts.length || sparks.length || debris.length || ripples.length || raining;
  const wake = () => loop.add(frame);

  // ---------- 闪电 ----------
  function strike() {
    let hitX = width * 0.72;
    let hitY = height * 0.28;
    if (els.clip) {
      const rect = els.clip.getBoundingClientRect();
      hitX = rect.left + rect.width * 0.5;
      hitY = rect.top + rect.height * 0.3;
    }
    flash(els.clip, "is-lightning-struck", 380);
    flash(els.score, "is-lightning-flicker", 450);
    flash(els.time, "is-lightning-flicker", 450);
    // 减少动效时只保留纸面状态，不画闪电与火花
    if (reducedMotion.matches) return;

    const fromX = hitX + (Math.random() - 0.5) * 260 + (Math.random() > 0.5 ? 120 : -120);
    bolts.push({ segments: lightningPath(fromX, hitX, hitY), hitX, hitY, startTime: performance.now(), duration: 480 });
    for (let k = 0; k < 32; k += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 3;
      sparks.push({
        x: hitX + (Math.random() - 0.5) * 6,
        y: hitY + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.8,
        radius: Math.random() * 2.4 + 1.2,
        alpha: 1,
        color: Math.random() > 0.35 ? "rgba(255, 245, 195," : "rgba(255, 205, 80,"
      });
    }
    wake();
  }

  // ---------- 晴光 ----------
  function setSunlit(on) {
    els.clip?.classList.toggle("is-sun-glowing", on);
    els.seal?.classList.toggle("is-sun-warmed", on);
    els.tape?.classList.toggle("is-sun-translucent", on);
  }

  function warm() {
    setSunlit(true);
    setTimeout(() => setSunlit(Boolean(lastConditions?.sunlit)), 3600);
  }

  // ---------- 阵风 ----------
  function gust(intensity = "high") {
    if (reducedMotion.matches) return;
    clearTimeout(gustTimer);
    // 正在起风时先移除再设置，让纸面动画从头播放
    if (body.dataset.paperWind) {
      delete body.dataset.paperWind;
      void body.offsetWidth;
    }
    body.dataset.paperWind = intensity;

    const strong = intensity === "high";
    for (let k = 0; k < (strong ? 14 : 7); k += 1) {
      const roll = Math.random();
      debris.push({
        x: -40 - Math.random() * 120,
        y: Math.random() * (height * 0.88) + height * 0.04,
        vx: Math.random() * (strong ? 9 : 5.5) + (strong ? 8 : 4.5),
        vy: (Math.random() - 0.42) * (strong ? 3 : 1.8),
        size: Math.random() * 6 + 3,
        angle: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * (strong ? 0.2 : 0.1),
        alpha: strong ? Math.random() * 0.22 + 0.6 : Math.random() * 0.18 + 0.4,
        type: roll > 0.62 ? "leaf" : roll > 0.32 ? "petal" : "chaff"
      });
    }
    wake();
    // 等纸面动画（主卡 2.0s / 1.6s，子卡错峰至 0.36s）完全落定后再移除属性，避免跳动
    gustTimer = setTimeout(() => { delete body.dataset.paperWind; }, strong ? 2500 : 2100);
  }

  // ---------- 雨 ----------
  function soak() {
    els.card?.classList.add("is-rain-damp");
    raining = true;
    wake();
  }

  function dry() {
    els.card?.classList.remove("is-rain-damp");
    raining = false;
  }

  /**
   * 按实况天气切换纸面状态。只在条件变化时生效：天幕每 30 秒重算一次，
   * 重复调用不会重置环境风周期，也不会重复触发阵风或闪电。
   */
  function syncWeather({ weather, windSpeed = 0, windGust = 0, cloudCover = 0, precipitation = 0, isDay = true } = {}) {
    const conditions = {
      thunder: weather === "thunder",
      sunlit: (weather === "clear" || weather === "sunny") && isDay,
      windy: windSpeed >= 18 || windGust >= 28,
      ambient: windSpeed >= 20 ? "strong" : windSpeed >= 8 ? "breezy" : "calm",
      cloudy: cloudCover >= 75 || weather === "cloudy",
      rainy: weather === "rain" || weather === "thunder" || precipitation > 0.05
    };
    const previous = lastConditions;
    if (previous && Object.keys(conditions).every((key) => conditions[key] === previous[key])) return;
    lastConditions = conditions;

    if (conditions.thunder !== previous?.thunder) {
      clearInterval(thunderTimer);
      thunderTimer = null;
      if (conditions.thunder) {
        strike();
        thunderTimer = setInterval(() => {
          if (Math.random() < 0.65) strike();
        }, 7000 + Math.random() * 5000);
      }
    }
    setSunlit(conditions.sunlit);
    if (conditions.ambient !== previous?.ambient) {
      clearInterval(ambientTimer);
      ambientTimer = setInterval(() => {
        if (!document.hidden) gust("gentle");
      }, AMBIENT_GUST_INTERVAL[conditions.ambient]);
    }
    if (conditions.windy !== previous?.windy || !previous) {
      if (conditions.windy) gust("high");
      else setTimeout(() => gust("gentle"), 1200);
    }
    els.card?.classList.toggle("is-cloud-shadowed", conditions.cloudy);
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
      ctx.arc(bolt.hitX, bolt.hitY, 14 + (1 - alpha) * 24, 0, Math.PI * 2);
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
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${spark.color} ${spark.alpha})`;
      ctx.shadowColor = "rgba(255, 220, 100, 0.8)";
      ctx.shadowBlur = 6;
      ctx.fill();
      if (spark.alpha < 0.05) sparks.splice(index, 1);
    }
    ctx.shadowBlur = 0;
  }

  function drawDebris() {
    for (let index = debris.length - 1; index >= 0; index -= 1) {
      const piece = debris[index];
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.angle += piece.vrot;
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
  }

  // 雨滴打在主卡上的扩散涟漪
  function spawnRipples(now) {
    if (!raining || reducedMotion.matches || now < nextRippleAt || !els.card) return;
    const rect = els.card.getBoundingClientRect();
    if (rect.width > 50 && rect.height > 50 && rect.bottom > 0 && rect.top < height) {
      const padX = Math.min(32, rect.width * 0.1);
      const padY = Math.min(32, rect.height * 0.1);
      const count = Math.random() < 0.4 ? 2 : 1;
      for (let c = 0; c < count && ripples.length < MAX_RIPPLES; c += 1) {
        ripples.push({
          x: rect.left + padX + Math.random() * (rect.width - padX * 2),
          y: rect.top + padY + Math.random() * (rect.height - padY * 2),
          radius: 1.5,
          maxRadius: Math.random() * 16 + 10,
          speed: Math.random() * 0.35 + 0.45,
          alpha: Math.random() * 0.25 + 0.55
        });
      }
    }
    nextRippleAt = now + Math.random() * 120 + 80;
  }

  function drawRipples() {
    for (let index = ripples.length - 1; index >= 0; index -= 1) {
      const ripple = ripples[index];
      ripple.radius += ripple.speed;
      ripple.alpha *= 0.945;
      const progress = ripple.radius / ripple.maxRadius;
      if (ripple.alpha < 0.02 || progress >= 1) {
        ripples.splice(index, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(165, 205, 235, ${ripple.alpha * 0.55})`;
      ctx.lineWidth = Math.max(0.6, (1 - progress) * 1.6);
      ctx.stroke();
      // 上方高光弧线，模拟斜射天光在水珠上的反射
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, Math.PI * 1.15, Math.PI * 1.85);
      ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.alpha * 0.75})`;
      ctx.lineWidth = Math.max(0.5, (1 - progress) * 1.2);
      ctx.stroke();
      if (ripple.radius < 5) {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 248, 255, ${ripple.alpha * 0.85})`;
        ctx.fill();
      }
    }
  }

  function frame() {
    const now = performance.now();
    ctx.clearRect(0, 0, width, height);
    drawBolts(now);
    drawSparks();
    drawDebris();
    spawnRipples(now);
    drawRipples();
    if (!busy()) loop.remove(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  return { strike, warm, gust, soak, dry, syncWeather };
}
