/**
 * 《霞光观测手记》天幕气象微物理互动引擎
 * Field Observation Journal - Sky Weather & Micro-physics Engine
 */

export function createJournalWeatherEngine(bgCanvas, fgCanvas) {
  if (!bgCanvas || !fgCanvas) return null;

  const bgCtx = bgCanvas.getContext("2d");
  const fgCtx = fgCanvas.getContext("2d");
  let width = 0;
  let height = 0;

  // 粒子与物理状态
  let bgParticles = [];
  let activeCloudPuffs = [];
  let activeLightningBolts = [];
  let lightningSparks = [];
  let windDebris = [];
  let isSnowCollapsed = false;
  let snowHeight = 0;

  // 雨水浸润与涟漪微物理状态 (Rain Soak & Water Ripple System)
  let isRaining = false;
  let cardRainRipples = [];
  let nextCardRippleTime = 0;
  let rainSoakTimer = null;

  // 闪电与风暴状态
  const stormLightning = {
    active: false,
    startTime: 0,
    nextStrike: performance.now() + 4000
  };

  function resizeCanvases() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    bgCanvas.width = width * dpr;
    bgCanvas.height = height * dpr;
    bgCtx.scale(dpr, dpr);

    fgCanvas.width = width * dpr;
    fgCanvas.height = height * dpr;
    fgCtx.scale(dpr, dpr);
  }

  window.addEventListener("resize", resizeCanvases);
  resizeCanvases();

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let isReducedMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener?.("change", e => { isReducedMotion = e.matches; });

  // ⚡ 1. 触发真实折线闪电分支击中长尾夹或印章
  function triggerLightningStrike(target = "clip", customDuration = null) {
    const heroCard = document.getElementById("hero-master-card");
    const clipEl = document.querySelector(".hero-brass-clip") || document.querySelector(".deck-brass-clip");
    const sealEl = document.querySelector(".cinnabar-seal-stamp") || document.querySelector(".deck-cinnabar-seal");
    const scoreEl = document.querySelector(".score-number-display") || document.querySelector(".deck-score-num");
    const timeEl = document.querySelector(".hero-event-time");

    let hitX = width * 0.72;
    let hitY = height * 0.28;

    if (target === "seal" && sealEl) {
      const rect = sealEl.getBoundingClientRect();
      hitX = rect.left + rect.width * 0.5;
      hitY = rect.top + rect.height * 0.5;
    } else if (clipEl) {
      const rect = clipEl.getBoundingClientRect();
      hitX = rect.left + rect.width * 0.5;
      hitY = rect.top + rect.height * 0.3;
    }

    const startX = hitX + (Math.random() - 0.5) * 260 + (Math.random() > 0.5 ? 120 : -120);
    const startY = -40;

    const boltSegments = [];
    let curX = startX;
    let curY = startY;
    const steps = 14;

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const targetInterpX = startX + (hitX - startX) * t;
      const targetInterpY = startY + (hitY - startY) * t;
      const jitter = (1 - t * 0.6) * 45;

      const nextX = s === steps ? hitX : targetInterpX + (Math.random() - 0.5) * jitter;
      const nextY = s === steps ? hitY : targetInterpY + (Math.random() - 0.5) * 8;
      boltSegments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });

      // 偶发小旁支
      if (s > 3 && s < 11 && Math.random() < 0.45) {
        boltSegments.push({
          x1: curX,
          y1: curY,
          x2: curX + (Math.random() - 0.5) * 60,
          y2: curY + Math.random() * 38 + 10
        });
      }
      curX = nextX;
      curY = nextY;
    }

    activeLightningBolts.push({
      segments: boltSegments,
      hitX,
      hitY,
      startTime: performance.now(),
      duration: customDuration || 480
    });

    // 喷发白热金黄电火花粒子
    for (let k = 0; k < 32; k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9.0 + 3.0;
      lightningSparks.push({
        x: hitX + (Math.random() - 0.5) * 6,
        y: hitY + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.8,
        radius: Math.random() * 2.4 + 1.2,
        alpha: 1.0,
        color: Math.random() > 0.35 ? "rgba(255, 245, 195," : "rgba(255, 205, 80,"
      });
    }

    // 触发 DOM 元素受击反应
    if (target === "seal" && sealEl) {
      sealEl.classList.add("is-lightning-struck");
      setTimeout(() => sealEl.classList.remove("is-lightning-struck"), 650);
    } else if (clipEl) {
      clipEl.classList.add("is-lightning-struck");
      setTimeout(() => clipEl.classList.remove("is-lightning-struck"), 380);
    }

    // EMP 电磁波及：主体时间/分数大字跳闪
    if (scoreEl) {
      scoreEl.classList.add("is-lightning-flicker");
      setTimeout(() => scoreEl.classList.remove("is-lightning-flicker"), 450);
    }
    if (timeEl) {
      timeEl.classList.add("is-lightning-flicker");
      setTimeout(() => timeEl.classList.remove("is-lightning-flicker"), 450);
    }

    stormLightning.active = true;
    stormLightning.startTime = performance.now();
  }

  // ☀️ 2. 晴阳透射与暖光照耀
  function triggerSunWarm() {
    const heroCard = document.getElementById("hero-master-card");
    const seal = document.querySelector(".cinnabar-seal-stamp") || document.querySelector(".deck-cinnabar-seal");
    const clip = document.querySelector(".hero-brass-clip") || document.querySelector(".deck-brass-clip");
    const washi = document.querySelector(".hero-washi-tape-topleft") || document.querySelector(".deck-washi-tape-torn");

    if (seal) seal.classList.add("is-sun-warmed");
    if (clip) clip.classList.add("is-sun-glowing");
    if (washi) washi.classList.add("is-sun-translucent");

    setTimeout(() => {
      document.querySelectorAll(".is-sun-warmed").forEach(el => el.classList.remove("is-sun-warmed"));
      document.querySelectorAll(".is-sun-glowing").forEach(el => el.classList.remove("is-sun-glowing"));
      document.querySelectorAll(".is-sun-translucent").forEach(el => el.classList.remove("is-sun-translucent"));
    }, 3600);
  }

  // ☁️ 3. 云影光线漫射过渡
  function triggerCloudShadow() {
    const targetCard = document.getElementById("hero-master-card") || document.querySelector(".deck-card--top");
    if (!targetCard) return;

    // 主体轻微柔和天光漫射折射
    targetCard.classList.add("is-cloud-shadowed");
    const scoreEl = targetCard.querySelector(".score-number-display") || targetCard.querySelector(".deck-score-num");
    if (scoreEl) scoreEl.classList.add("is-cloud-obscured");

    setTimeout(() => {
      targetCard.classList.remove("is-cloud-shadowed");
      if (scoreEl) scoreEl.classList.remove("is-cloud-obscured");
    }, 4200);
  }

  let windGustTimer = null;
  let ambientWindInterval = null;

  // 💨 4. 自然风拂过与狂风呼啸掀起便签与风屑 (Paper Flutter & Wind Debris - 60fps GPU Composited)
  function triggerWindGust(intensity = "high") {
    if (isReducedMotion) return;

    clearTimeout(windGustTimer);
    document.body.setAttribute("data-paper-wind", intensity);

    const count = intensity === "high" ? 14 : 7;
    const speedBase = intensity === "high" ? 8 : 4.5;
    const speedVar = intensity === "high" ? 9 : 5.5;

    for (let k = 0; k < count; k++) {
      // 粒子错落分布在全屏高度（从顶部主卡片一直到未来 7 日区域）
      const spawnY = Math.random() * (height * 0.88) + height * 0.04;
      const typeRand = Math.random();
      let type = "chaff";
      if (typeRand > 0.62) type = "leaf";
      else if (typeRand > 0.32) type = "petal";

      windDebris.push({
        x: -40 - Math.random() * 120, // 从屏幕左侧外错开进入
        y: spawnY,
        vx: Math.random() * speedVar + speedBase,
        vy: (Math.random() - 0.42) * (intensity === "high" ? 3.0 : 1.8),
        size: Math.random() * 6 + 3,
        angle: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * (intensity === "high" ? 0.20 : 0.10),
        alpha: intensity === "high" ? (Math.random() * 0.22 + 0.6) : (Math.random() * 0.18 + 0.4),
        type
      });
    }

    const duration = intensity === "high" ? 2200 : 1800;
    windGustTimer = setTimeout(() => {
      document.body.removeAttribute("data-paper-wind");
    }, duration);
  }

  // 🍃 周期性自然微风调度器 (Periodic Natural Breeze Loop)
  function startAmbientWindLoop(windSpeed = 5) {
    if (ambientWindInterval) clearInterval(ambientWindInterval);
    // 根据实际风速自适应微风周期：大风 32s，微风 45s，静风 60s
    const intervalMs = windSpeed >= 20 ? 32000 : (windSpeed >= 8 ? 45000 : 60000);
    ambientWindInterval = setInterval(() => {
      if (document.hidden) return; // 页面切后台时不空耗
      triggerWindGust("gentle");
    }, intervalMs);
  }

  // ❄️ 5. 暴雪压垮卡片
  function triggerSnowCollapse() {
    isSnowCollapsed = true;
    const heroCard = document.getElementById("hero-master-card");
    const deckCard = document.querySelector(".deck-card--top");
    if (heroCard) heroCard.classList.add("is-snow-collapsed");
    if (deckCard) deckCard.classList.add("is-snow-collapsed");
  }

  // ❄️ 6. 拂雪复原
  function restoreSnowCard() {
    isSnowCollapsed = false;
    const heroCard = document.getElementById("hero-master-card");
    const deckCard = document.querySelector(".deck-card--top");
    [heroCard, deckCard].forEach(card => {
      if (!card) return;
      card.classList.remove("is-snow-collapsed");
      card.classList.add("is-restoring");
      setTimeout(() => card.classList.remove("is-restoring"), 700);
    });
  }

  // 🌧️ 7. 雨水浸润手札卡片 (Soak stationery paper with rain water)
  function triggerRainSoak(duration = null) {
    isRaining = true;
    const heroCard = document.getElementById("hero-master-card");
    const deckCard = document.querySelector(".deck-card--top");
    if (heroCard) heroCard.classList.add("is-rain-damp");
    if (deckCard) deckCard.classList.add("is-rain-damp");

    if (rainSoakTimer) {
      clearTimeout(rainSoakTimer);
      rainSoakTimer = null;
    }

    if (typeof duration === "number" && duration > 0) {
      rainSoakTimer = setTimeout(() => {
        restoreDryCard();
      }, duration);
    }
  }

  // 🌧️ 8. 干燥复原卡片 (Dry and restore stationery paper)
  function restoreDryCard() {
    isRaining = false;
    const heroCard = document.getElementById("hero-master-card");
    const deckCard = document.querySelector(".deck-card--top");
    if (heroCard) heroCard.classList.remove("is-rain-damp");
    if (deckCard) deckCard.classList.remove("is-rain-damp");
    if (rainSoakTimer) {
      clearTimeout(rainSoakTimer);
      rainSoakTimer = null;
    }
  }

  // 🌟 根据实际气象数据自动联动卡片微物理状态 (Automatic Weather x Stationery Elements Linkage)
  let weatherSyncInterval = null;
  function syncWeatherConditions({ weather, windSpeed = 0, windGust = 0, cloudCover = 0, precipitation = 0, isDay = true } = {}) {
    const heroCard = document.getElementById("hero-master-card");
    const seal = document.querySelector(".cinnabar-seal-stamp");
    const clip = document.querySelector(".hero-brass-clip");
    const washi = document.querySelector(".hero-washi-tape-topleft");

    if (weatherSyncInterval) {
      clearInterval(weatherSyncInterval);
      weatherSyncInterval = null;
    }

    // 1. ⚡ 雷暴/闪电天气：自动触发闪电劈向黄铜长尾夹
    if (weather === "thunder") {
      triggerLightningStrike("clip");
      weatherSyncInterval = setInterval(() => {
        if (Math.random() < 0.65) triggerLightningStrike("clip");
      }, 7000 + Math.random() * 5000);
    }

    // 2. ☀️ 晴朗阳光：黄铜夹暖金反光，朱砂印温润生辉
    if ((weather === "clear" || weather === "sunny") && isDay) {
      if (clip) clip.classList.add("is-sun-glowing");
      if (seal) seal.classList.add("is-sun-warmed");
      if (washi) washi.classList.add("is-sun-translucent");
    } else {
      if (clip) clip.classList.remove("is-sun-glowing");
      if (seal) seal.classList.remove("is-sun-warmed");
      if (washi) washi.classList.remove("is-sun-translucent");
    }

    // 3. 💨 气象风力联动与自然微风周期启动 (Ambient Wind Loop & Gust)
    startAmbientWindLoop(windSpeed);
    if (windSpeed >= 18 || windGust >= 28) {
      if (washi) washi.classList.add("is-wind-breeze");
      if (clip) clip.classList.add("is-wind-vibrating");
      triggerWindGust("high");
    } else {
      if (washi) washi.classList.remove("is-wind-breeze");
      if (clip) clip.classList.remove("is-wind-vibrating");
      // 页面载入 1.2 秒后轻拂过一阵温和的自然桌面微风
      setTimeout(() => triggerWindGust("gentle"), 1200);
    }

    // 4. ☁️ 多云/阴天：光线柔和漫射
    if (cloudCover >= 75 || weather === "cloudy") {
      if (heroCard) heroCard.classList.add("is-cloud-shadowed");
    } else {
      if (heroCard) heroCard.classList.remove("is-cloud-shadowed");
    }

    // 5. ❄️ 降雪天气：黄铜夹边缘微霜
    if (weather === "snow") {
      if (clip) clip.classList.add("is-frost-edged");
      if (seal) seal.classList.add("is-frost-cracked");
    } else {
      if (clip) clip.classList.remove("is-frost-edged");
      if (seal) seal.classList.remove("is-frost-cracked");
    }

    // 6. 🌧️ 雨水浸润手札纸面与水花涟漪
    const hasRain = (weather === "rain" || weather === "thunder" || (typeof precipitation === "number" && precipitation > 0.05));
    if (hasRain) {
      triggerRainSoak();
    } else {
      restoreDryCard();
    }
  }

  // 渲染主循环
  function renderLoop() {
    requestAnimationFrame(renderLoop);

    bgCtx.clearRect(0, 0, width, height);
    fgCtx.clearRect(0, 0, width, height);

    const now = performance.now();

    // ----------------------------------------------------------------------
    // ⚡ 真实折线闪电分支与电弧火花绘制
    // ----------------------------------------------------------------------
    for (let b = activeLightningBolts.length - 1; b >= 0; b--) {
      const bolt = activeLightningBolts[b];
      const elapsed = now - bolt.startTime;
      if (elapsed > bolt.duration) {
        activeLightningBolts.splice(b, 1);
        continue;
      }
      const alpha = Math.max(0, 1 - (elapsed / bolt.duration));

      fgCtx.save();
      // 外层辉光电弧
      fgCtx.beginPath();
      for (let s = 0; s < bolt.segments.length; s++) {
        const seg = bolt.segments[s];
        if (s === 0) fgCtx.moveTo(seg.x1, seg.y1);
        fgCtx.lineTo(seg.x2, seg.y2);
      }
      fgCtx.strokeStyle = `rgba(255, 240, 180, ${alpha * 0.85})`;
      fgCtx.lineWidth = 5.5 * alpha;
      fgCtx.shadowBlur = 18;
      fgCtx.shadowColor = "rgba(255, 220, 120, 0.95)";
      fgCtx.stroke();

      // 内层白炽主芯
      fgCtx.beginPath();
      for (let s = 0; s < bolt.segments.length; s++) {
        const seg = bolt.segments[s];
        if (s === 0) fgCtx.moveTo(seg.x1, seg.y1);
        fgCtx.lineTo(seg.x2, seg.y2);
      }
      fgCtx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      fgCtx.lineWidth = 2.2;
      fgCtx.stroke();

      // 击中点强烈辐射闪光晕环
      fgCtx.beginPath();
      fgCtx.arc(bolt.hitX, bolt.hitY, (14 + (1 - alpha) * 24), 0, Math.PI * 2);
      fgCtx.fillStyle = `rgba(255, 245, 210, ${alpha * 0.75})`;
      fgCtx.fill();

      fgCtx.restore();
    }

    // 电火花粒子更新与绘制
    for (let s = lightningSparks.length - 1; s >= 0; s--) {
      const sp = lightningSparks[s];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += 0.28; // 重力
      sp.alpha *= 0.94;

      fgCtx.beginPath();
      fgCtx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
      fgCtx.fillStyle = `${sp.color} ${sp.alpha})`;
      fgCtx.shadowColor = "rgba(255, 220, 100, 0.8)";
      fgCtx.shadowBlur = 6;
      fgCtx.fill();

      if (sp.alpha < 0.05) {
        lightningSparks.splice(s, 1);
      }
    }

    // ----------------------------------------------------------------------
    // 💨 狂风纸屑碎叶粒子
    // ----------------------------------------------------------------------
    for (let w = windDebris.length - 1; w >= 0; w--) {
      const db = windDebris[w];
      db.x += db.vx;
      db.y += db.vy;
      db.angle += db.vrot;

      fgCtx.save();
      fgCtx.translate(db.x, db.y);
      fgCtx.rotate(db.angle);

      if (db.type === "chaff") {
        fgCtx.fillStyle = `rgba(244, 236, 222, ${db.alpha})`;
        fgCtx.fillRect(-db.size * 0.5, -db.size * 0.3, db.size, db.size * 0.6);
      } else if (db.type === "petal") {
        fgCtx.fillStyle = `rgba(235, 172, 142, ${db.alpha * 0.9})`;
        fgCtx.beginPath();
        fgCtx.arc(0, 0, db.size * 0.42, 0, Math.PI * 2);
        fgCtx.fill();
      } else {
        fgCtx.fillStyle = `rgba(186, 126, 72, ${db.alpha})`;
        fgCtx.beginPath();
        fgCtx.ellipse(0, 0, db.size * 0.7, db.size * 0.35, 0, 0, Math.PI * 2);
        fgCtx.fill();
      }
      fgCtx.restore();

      if (db.x > width + 60) {
        windDebris.splice(w, 1);
      }
    }

    // ----------------------------------------------------------------------
    // 🌧️ 雨水打在手札卡片上的水花与扩散微涟漪 (Raindrop Ripples on Card Surface)
    // ----------------------------------------------------------------------
    if (isRaining && now >= nextCardRippleTime) {
      const activeCard = document.getElementById("hero-master-card") || document.querySelector(".deck-card--top");
      if (activeCard) {
        const rect = activeCard.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50 && rect.bottom > 0 && rect.top < height) {
          const paddingX = Math.min(32, rect.width * 0.1);
          const paddingY = Math.min(32, rect.height * 0.1);
          const count = Math.random() < 0.4 ? 2 : 1;
          for (let c = 0; c < count; c++) {
            if (cardRainRipples.length < 24) {
              cardRainRipples.push({
                x: rect.left + paddingX + Math.random() * (rect.width - paddingX * 2),
                y: rect.top + paddingY + Math.random() * (rect.height - paddingY * 2),
                radius: 1.5,
                maxRadius: Math.random() * 16 + 10,
                speed: Math.random() * 0.35 + 0.45,
                alpha: Math.random() * 0.25 + 0.55
              });
            }
          }
        }
      }
      nextCardRippleTime = now + (Math.random() * 120 + 80);
    }

    // 绘制并更新卡面水波涟漪
    for (let r = cardRainRipples.length - 1; r >= 0; r--) {
      const rip = cardRainRipples[r];
      rip.radius += rip.speed;
      rip.alpha *= 0.945;

      const progress = rip.radius / rip.maxRadius;
      if (rip.alpha < 0.02 || progress >= 1.0) {
        cardRainRipples.splice(r, 1);
        continue;
      }

      fgCtx.save();
      // 外层柔和水膜折射圆环
      fgCtx.beginPath();
      fgCtx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      fgCtx.strokeStyle = `rgba(165, 205, 235, ${rip.alpha * 0.55})`;
      fgCtx.lineWidth = Math.max(0.6, (1 - progress) * 1.6);
      fgCtx.stroke();

      // 上方高光弧线（模拟斜射天光水珠反射）
      fgCtx.beginPath();
      fgCtx.arc(rip.x, rip.y, rip.radius, Math.PI * 1.15, Math.PI * 1.85);
      fgCtx.strokeStyle = `rgba(255, 255, 255, ${rip.alpha * 0.75})`;
      fgCtx.lineWidth = Math.max(0.5, (1 - progress) * 1.2);
      fgCtx.stroke();

      // 刚滴落时的中心极微晶莹水珠点
      if (rip.radius < 5.0) {
        fgCtx.beginPath();
        fgCtx.arc(rip.x, rip.y, 1.2, 0, Math.PI * 2);
        fgCtx.fillStyle = `rgba(235, 248, 255, ${rip.alpha * 0.85})`;
        fgCtx.fill();
      }
      fgCtx.restore();
    }
  }

  requestAnimationFrame(renderLoop);

  // 挂载到全局，方便快速体验和调用
  window.triggerLightningStrike = triggerLightningStrike;
  window.triggerSunWarm = triggerSunWarm;
  window.triggerCloudShadow = triggerCloudShadow;
  window.triggerWindGust = triggerWindGust;
  window.triggerSnowCollapse = triggerSnowCollapse;
  window.restoreSnowCard = restoreSnowCard;
  window.triggerRainSoak = triggerRainSoak;
  window.restoreDryCard = restoreDryCard;
  window.syncWeatherConditions = syncWeatherConditions;

  return {
    triggerLightningStrike,
    triggerSunWarm,
    triggerCloudShadow,
    triggerWindGust,
    triggerSnowCollapse,
    restoreSnowCard,
    triggerRainSoak,
    restoreDryCard,
    syncWeatherConditions
  };
}
