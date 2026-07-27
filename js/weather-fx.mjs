const PARTICLE_LIMITS = {
  rain: { divisor: 4_200, min: 64, max: 180 },
  snow: { divisor: 7_000, min: 46, max: 120 },
  stars: { divisor: 14_000, min: 24, max: 72 }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function weatherEffectFor({ weather, light }) {
  if (weather === "rain" || weather === "snow") return weather;
  if (light === "night" && (weather === "clear" || weather === "partly")) return "stars";
  return null;
}

export function particleBudget(effect, width, height) {
  const limits = PARTICLE_LIMITS[effect];
  if (!limits) return 0;
  return clamp(Math.round((width * height) / limits.divisor), limits.min, limits.max);
}

export function listenToMediaQuery(mediaQuery, listener) {
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }
  mediaQuery.addListener(listener);
  return () => mediaQuery.removeListener(listener);
}

function createRainDrop(width, height, initial = true) {
  const depth = 0.08 + Math.pow(Math.random(), 1.45) * 0.92;
  const length = randomBetween(7, 14) + depth * 28;
  return {
    x: randomBetween(-width * 0.14, width),
    y: initial ? randomBetween(-height * 0.2, height) : randomBetween(-height * 0.28, -length),
    depth,
    length,
    speed: 300 + depth * 850,
    wind: 24 + depth * 70,
    flutter: randomBetween(2, 9),
    phase: randomBetween(0, Math.PI * 2),
    turn: randomBetween(1.2, 2.4),
    alpha: 0.05 + depth * 0.35,
    width: 0.25 + depth * 1.05
  };
}

function createSnowflake(width, height, initial = true) {
  const depth = 0.12 + Math.pow(Math.random(), 1.3) * 0.88;
  return {
    x: randomBetween(-20, width + 20),
    y: initial ? randomBetween(-height * 0.16, height) : randomBetween(-height * 0.18, -12),
    depth,
    size: 0.5 + depth * 2.5,
    stretch: randomBetween(0.72, 1.28),
    rotation: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-0.7, 0.7),
    speed: 18 + depth * 66,
    drift: randomBetween(-8, 8),
    sway: 7 + depth * 15,
    phase: randomBetween(0, Math.PI * 2),
    turn: randomBetween(0.55, 1.2),
    alpha: 0.22 + depth * 0.56
  };
}

function createStar(width, height) {
  const depth = randomBetween(0.2, 1);
  return {
    x: randomBetween(0, width),
    y: randomBetween(0, height * 0.72),
    size: 0.35 + depth * 1.05,
    alpha: 0.16 + depth * 0.5,
    phase: randomBetween(0, Math.PI * 2),
    twinkle: randomBetween(0.55, 1.35)
  };
}

function createParticle(effect, width, height, initial = true) {
  if (effect === "rain") return createRainDrop(width, height, initial);
  if (effect === "snow") return createSnowflake(width, height, initial);
  return createStar(width, height);
}

function updateRain(particles, width, height, elapsed) {
  for (let index = 0; index < particles.length; index += 1) {
    const drop = particles[index];
    drop.phase += drop.turn * elapsed;
    drop.x += (drop.wind + Math.sin(drop.phase) * drop.flutter) * elapsed;
    drop.y += drop.speed * elapsed;
    if (drop.y > height + drop.length || drop.x > width + drop.length) {
      particles[index] = createRainDrop(width, height, false);
    }
  }
}

function updateSnow(particles, width, height, elapsed) {
  for (let index = 0; index < particles.length; index += 1) {
    const flake = particles[index];
    flake.phase += flake.turn * elapsed;
    flake.rotation += flake.spin * elapsed;
    flake.x += (flake.drift + Math.sin(flake.phase) * flake.sway) * elapsed;
    flake.y += flake.speed * elapsed;
    if (flake.y > height + 12 || flake.x < -36 || flake.x > width + 36) {
      particles[index] = createSnowflake(width, height, false);
    }
  }
}

function updateStars(particles, elapsed) {
  for (const star of particles) star.phase += star.twinkle * elapsed;
}

function drawRain(context, particles) {
  context.lineCap = "round";
  for (const drop of particles) {
    const tailX = drop.x - (drop.wind / drop.speed) * drop.length;
    context.beginPath();
    context.moveTo(tailX, drop.y - drop.length);
    context.lineTo(drop.x, drop.y);
    context.lineWidth = drop.width;
    context.strokeStyle = `rgba(207, 227, 238, ${drop.alpha})`;
    context.stroke();
  }
}

function drawSnow(context, particles) {
  for (const flake of particles) {
    context.save();
    context.translate(flake.x, flake.y);
    context.rotate(flake.rotation);
    if (flake.size > 1.7) {
      context.beginPath();
      context.ellipse(0, 0, flake.size * 2.2, flake.size * flake.stretch * 2.2, 0, 0, Math.PI * 2);
      context.fillStyle = `rgba(226, 239, 245, ${flake.alpha * 0.1})`;
      context.fill();
    }
    context.beginPath();
    context.ellipse(0, 0, flake.size, flake.size * flake.stretch, 0, 0, Math.PI * 2);
    context.fillStyle = `rgba(243, 249, 251, ${flake.alpha})`;
    context.fill();
    context.restore();
  }
}

function drawStars(context, particles) {
  for (const star of particles) {
    const shimmer = 0.58 + Math.sin(star.phase) * 0.42;
    const alpha = star.alpha * shimmer;
    context.beginPath();
    context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    context.fillStyle = `rgba(224, 238, 250, ${alpha})`;
    context.fill();
    if (star.size > 1.15 && shimmer > 0.8) {
      context.beginPath();
      context.moveTo(star.x - star.size * 2.4, star.y);
      context.lineTo(star.x + star.size * 2.4, star.y);
      context.moveTo(star.x, star.y - star.size * 2.4);
      context.lineTo(star.x, star.y + star.size * 2.4);
      context.lineWidth = 0.45;
      context.strokeStyle = `rgba(224, 238, 250, ${alpha * 0.42})`;
      context.stroke();
    }
  }
}

export function createWeatherFx(canvas, root = document.body) {
  const context = canvas?.getContext?.("2d");
  if (!context) return { destroy() {} };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let effect = null;
  let particles = [];
  let width = 0;
  let height = 0;
  let animationFrame = null;
  let resizeFrame = null;
  let previousTime = 0;

  function rebuildParticles() {
    const count = particleBudget(effect, width, height);
    particles = Array.from({ length: count }, () => createParticle(effect, width, height));
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds.width));
    const nextHeight = Math.max(1, Math.round(bounds.height));
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    rebuildParticles();
  }

  function clearCanvas() {
    context.clearRect(0, 0, width, height);
  }

  function drawFrame(timestamp) {
    const elapsed = previousTime ? Math.min((timestamp - previousTime) / 1_000, 0.04) : 0;
    previousTime = timestamp;
    clearCanvas();
    context.globalCompositeOperation = "screen";
    if (effect === "rain") {
      updateRain(particles, width, height, elapsed);
      drawRain(context, particles);
    } else if (effect === "snow") {
      updateSnow(particles, width, height, elapsed);
      drawSnow(context, particles);
    } else if (effect === "stars") {
      updateStars(particles, elapsed);
      drawStars(context, particles);
    }
    animationFrame = window.requestAnimationFrame(drawFrame);
  }

  function stopAnimation() {
    if (animationFrame != null) window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
    previousTime = 0;
    clearCanvas();
  }

  function shouldAnimate() {
    return root.dataset.state === "ready" && effect && !document.hidden && !reducedMotion.matches;
  }

  function syncAnimation() {
    if (!shouldAnimate()) {
      stopAnimation();
      return;
    }
    if (animationFrame == null) animationFrame = window.requestAnimationFrame(drawFrame);
  }

  function syncTheme() {
    const nextEffect = weatherEffectFor(root.dataset);
    if (nextEffect !== effect) {
      effect = nextEffect;
      rebuildParticles();
    }
    syncAnimation();
  }

  function queueResize() {
    if (resizeFrame != null) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      resizeCanvas();
    });
  }

  const observer = new MutationObserver(syncTheme);
  const stopListeningForMotion = listenToMediaQuery(reducedMotion, syncAnimation);
  observer.observe(root, { attributes: true, attributeFilter: ["data-state", "data-weather", "data-light"] });
  window.addEventListener("resize", queueResize, { passive: true });
  document.addEventListener("visibilitychange", syncAnimation);
  resizeCanvas();
  syncTheme();

  return {
    destroy() {
      stopAnimation();
      observer.disconnect();
      window.removeEventListener("resize", queueResize);
      document.removeEventListener("visibilitychange", syncAnimation);
      stopListeningForMotion();
      if (resizeFrame != null) window.cancelAnimationFrame(resizeFrame);
    }
  };
}
