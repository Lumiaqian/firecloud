const PARTICLE_LIMITS = {
  rain: { divisor: 4_200, min: 64, max: 180 },
  snow: { divisor: 7_000, min: 46, max: 120 },
  hail: { divisor: 6_000, min: 52, max: 140 },
  wind: { divisor: 18_000, min: 18, max: 64 },
  stars: { divisor: 14_000, min: 24, max: 72 }
};

const COLLISION_BANDS = {
  rain: [0.93, 1.015],
  snow: [0.91, 1.02],
  hail: [0.925, 1.015]
};
const MAX_RAIN_IMPACTS = 120;
const MAX_SNOW_CONTACTS = 90;
const MAX_HAIL_CONTACTS = 100;
const DEFAULT_DYNAMICS = Object.freeze({
  densityScale: 1,
  windX: 46,
  windY: 0,
  fallSpeedScale: 1
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
export function weatherEffectFor({
  weather,
  light,
  storm,
  windSpeed,
  windGust
} = {}) {
  if (weather === "rain" || weather === "thunder") return "rain";
  if (weather === "snow" || weather === "hail") return weather;
  const windDrive = Math.max(finiteMetric(windSpeed) ?? 0, finiteMetric(windGust) ?? 0);
  if ((storm === "strong" || storm === "severe") && windDrive >= 40) return "wind";
  if (light === "night" && (weather === "clear" || weather === "partly")) return "stars";
  return null;
}

export function particleBudget(effect, width, height, densityScale = 1) {
  const limits = PARTICLE_LIMITS[effect];
  if (!limits) return 0;
  const base = clamp(Math.round((width * height) / limits.divisor), limits.min, limits.max);
  return clamp(Math.round(base * densityScale), Math.ceil(limits.min / 2), limits.max);
}

function finiteMetric(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sameDynamics(left, right) {
  return left.densityScale === right.densityScale
    && left.windX === right.windX
    && left.windY === right.windY
    && left.fallSpeedScale === right.fallSpeedScale;
}

export function weatherDynamicsFor({
  effect,
  precipitation,
  snowfall,
  windSpeed,
  windDirection,
  windGust
} = {}) {
  if (effect !== "rain" && effect !== "snow" && effect !== "hail" && effect !== "wind") {
    return DEFAULT_DYNAMICS;
  }
  const amount = finiteMetric(effect === "snow" ? snowfall : precipitation);
  let intensityScale = 1;
  if (amount != null) {
    intensityScale = effect === "snow"
      ? 0.6 + Math.sqrt(Math.max(0, amount) / 0.2) * 0.4
      : effect === "hail"
        ? 0.72 + Math.sqrt(Math.max(0, amount)) * 0.4
        : 0.55 + Math.sqrt(Math.max(0, amount)) * 0.45;
  }

  const measuredWindSpeed = finiteMetric(windSpeed);
  const measuredWindGust = finiteMetric(windGust);
  const windDrive = Math.max(measuredWindSpeed ?? 0, measuredWindGust ?? 0);
  const safeWindSpeed = clamp(windDrive, 0, 160);
  const direction = finiteMetric(windDirection);
  const hasMeasuredWind = measuredWindSpeed != null || measuredWindGust != null;
  const windX = !hasMeasuredWind
    ? DEFAULT_DYNAMICS.windX
    : direction == null
      ? safeWindSpeed * 0.7
      : -Math.sin(direction * Math.PI / 180) * safeWindSpeed * 2.2;
  const windY = !hasMeasuredWind || direction == null
    ? DEFAULT_DYNAMICS.windY
    : Math.cos(direction * Math.PI / 180) * safeWindSpeed * 2.2;

  if (effect === "wind") {
    return {
      densityScale: clamp(0.55 + safeWindSpeed / 120, 0.55, 1.35),
      windX,
      windY,
      fallSpeedScale: 1 + Math.min(safeWindSpeed / 260, 0.5)
    };
  }

  const windDensityBoost = 1 + Math.min(safeWindSpeed / 320, 0.25);
  return {
    densityScale: clamp(intensityScale * windDensityBoost, 0.5, 1.8),
    windX,
    windY,
    fallSpeedScale: 1 + Math.min(safeWindSpeed / 300, 0.35)
  };
}

export function collisionPlane(effect, height, sample = Math.random()) {
  const [minRatio, maxRatio] = COLLISION_BANDS[effect] ?? [1, 1];
  return height * (minRatio + (maxRatio - minRatio) * clamp(sample, 0, 1));
}

export function weatherSurfaceCrossing(surfaces, x, fromY, toY) {
  if (!Array.isArray(surfaces) || !Number.isFinite(x) || toY < fromY) return null;
  let nearest = null;
  for (const surface of surfaces) {
    if (!Number.isFinite(surface?.left)
      || !Number.isFinite(surface.right)
      || !Number.isFinite(surface.y)
      || x < surface.left
      || x > surface.right
      || surface.y < fromY
      || surface.y > toY) continue;
    if (!nearest || surface.y < nearest.y) nearest = surface;
  }
  return nearest;
}

export function listenToMediaQuery(mediaQuery, listener) {
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }
  mediaQuery.addListener(listener);
  return () => mediaQuery.removeListener(listener);
}

function createRainDrop(width, height, initial = true, dynamics = DEFAULT_DYNAMICS) {
  const depth = 0.08 + Math.pow(Math.random(), 1.45) * 0.92;
  const length = randomBetween(7, 14) + depth * 28;
  const impactY = collisionPlane("rain", height);
  return {
    x: randomBetween(-width * 0.14, width),
    y: initial ? randomBetween(-height * 0.2, impactY) : randomBetween(-height * 0.28, -length),
    impactY,
    depth,
    length,
    speed: (300 + depth * 850) * dynamics.fallSpeedScale,
    wind: dynamics.windX * (0.4 + depth * 0.6) + randomBetween(-6, 6),
    flutter: randomBetween(2, 9),
    phase: randomBetween(0, Math.PI * 2),
    turn: randomBetween(1.2, 2.4),
    alpha: 0.05 + depth * 0.35,
    width: 0.25 + depth * 1.05
  };
}

function createSnowflake(width, height, initial = true, dynamics = DEFAULT_DYNAMICS) {
  const depth = 0.12 + Math.pow(Math.random(), 1.3) * 0.88;
  const impactY = collisionPlane("snow", height);
  return {
    x: randomBetween(-20, width + 20),
    y: initial ? randomBetween(-height * 0.16, impactY) : randomBetween(-height * 0.18, -12),
    impactY,
    depth,
    size: 0.5 + depth * 2.5,
    stretch: randomBetween(0.72, 1.28),
    rotation: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-0.7, 0.7),
    velocityY: (18 + depth * 66) * dynamics.fallSpeedScale,
    drift: dynamics.windX * (0.28 + depth * 0.72) + randomBetween(-8, 8),
    sway: 7 + depth * 15,
    phase: randomBetween(0, Math.PI * 2),
    turn: randomBetween(0.55, 1.2),
    alpha: 0.22 + depth * 0.56,
    grounded: false,
    settleAge: 0,
    settleLife: randomBetween(0.58, 1.18)
  };
}
function createHailstone(width, height, initial = true, dynamics = DEFAULT_DYNAMICS) {
  const depth = 0.18 + Math.pow(Math.random(), 1.35) * 0.82;
  const size = 0.9 + depth * 2.1;
  const impactY = collisionPlane("hail", height);
  return {
    x: randomBetween(-width * 0.12, width),
    y: initial ? randomBetween(-height * 0.2, impactY) : randomBetween(-height * 0.22, -size),
    impactY,
    depth,
    size,
    velocityX: dynamics.windX * (0.3 + depth * 0.7),
    velocityY: (520 + depth * 920) * dynamics.fallSpeedScale,
    gravity: 1_080,
    bounces: 0,
    alpha: 0.24 + depth * 0.5
  };
}

function createWindGust(width, height, initial = true, dynamics = DEFAULT_DYNAMICS) {
  const length = randomBetween(18, 58);
  const dynamicsSpeed = Math.hypot(dynamics.windX, dynamics.windY);
  const velocityScale = randomBetween(0.72, 1.2);
  const velocityX = (dynamicsSpeed > 0 ? dynamics.windX : DEFAULT_DYNAMICS.windX) * velocityScale;
  const velocityY = (dynamicsSpeed > 0 ? dynamics.windY : DEFAULT_DYNAMICS.windY) * velocityScale;
  const startsFromHorizontalEdge = Math.abs(velocityX) >= Math.abs(velocityY);
  return {
    x: initial || !startsFromHorizontalEdge
      ? randomBetween(-length, width + length)
      : velocityX >= 0 ? -length : width + length,
    y: initial || startsFromHorizontalEdge
      ? randomBetween(-length, height + length)
      : velocityY >= 0 ? -length : height + length,
    length,
    velocityX,
    velocityY,
    phase: randomBetween(0, Math.PI * 2),
    turn: randomBetween(1.2, 2.6),
    width: randomBetween(0.35, 0.9),
    alpha: randomBetween(0.06, 0.18)
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


function createParticle(effect, width, height, initial = true, dynamics = DEFAULT_DYNAMICS) {
  if (effect === "rain") return createRainDrop(width, height, initial, dynamics);
  if (effect === "snow") return createSnowflake(width, height, initial, dynamics);
  if (effect === "hail") return createHailstone(width, height, initial, dynamics);
  if (effect === "wind") return createWindGust(width, height, initial, dynamics);
  return createStar(width, height);
}

function createRainImpact(impacts, drop, y = drop.impactY, probability = 0.38) {
  if (drop.depth < 0.25 || Math.random() > probability || impacts.length >= MAX_RAIN_IMPACTS) return;

  const energy = 0.45 + drop.depth * 0.55;
  impacts.push({
    kind: "ripple",
    x: drop.x,
    y,
    age: 0,
    life: randomBetween(0.16, 0.24),
    radius: 2 + drop.depth * 3.5,
    expansion: 8 + drop.depth * 12,
    alpha: 0.08 + drop.depth * 0.18
  });

  const sprayCount = Math.min(2 + Math.floor(drop.depth * 3), MAX_RAIN_IMPACTS - impacts.length);
  for (let index = 0; index < sprayCount; index += 1) {
    const direction = index % 2 === 0 ? -1 : 1;
    impacts.push({
      kind: "spray",
      x: drop.x,
      y,
      velocityX: drop.wind * 0.12 + direction * randomBetween(24, 74) * energy,
      velocityY: -randomBetween(45, 125) * energy,
      gravity: randomBetween(360, 520),
      age: 0,
      life: randomBetween(0.2, 0.36),
      width: 0.3 + drop.depth * 0.48,
      alpha: 0.08 + drop.depth * 0.28
    });
  }
}

function updateRainImpacts(impacts, elapsed) {
  let activeCount = 0;
  for (const impact of impacts) {
    impact.age += elapsed;
    if (impact.age >= impact.life) continue;
    if (impact.kind === "spray") {
      impact.velocityY += impact.gravity * elapsed;
      impact.x += impact.velocityX * elapsed;
      impact.y += impact.velocityY * elapsed;
    }
    impacts[activeCount] = impact;
    activeCount += 1;
  }
  impacts.length = activeCount;
}

function createSnowContact(contacts, flake, surface) {
  if (flake.depth < 0.2 || Math.random() > 0.48 || contacts.length >= MAX_SNOW_CONTACTS) return;
  contacts.push({
    x: flake.x,
    y: surface.y,
    size: flake.size,
    stretch: flake.stretch,
    rotation: flake.rotation,
    alpha: flake.alpha * 0.82,
    age: 0,
    life: randomBetween(0.52, 0.9),
    drift: flake.drift * 0.08
  });
}

function updateSnowContacts(contacts, elapsed) {
  let activeCount = 0;
  for (const contact of contacts) {
    contact.age += elapsed;
    if (contact.age >= contact.life) continue;
    contact.x += contact.drift * elapsed;
    contacts[activeCount] = contact;
    activeCount += 1;
  }
  contacts.length = activeCount;
}
function createHailContact(contacts, stone, surface) {
  if (stone.depth < 0.18 || contacts.length >= MAX_HAIL_CONTACTS) return;
  contacts.push({
    x: stone.x,
    y: surface.y,
    size: stone.size,
    velocityX: stone.velocityX * 0.12,
    age: 0,
    life: randomBetween(0.12, 0.2),
    alpha: stone.alpha * 0.72
  });
}

function updateHailContacts(contacts, elapsed) {
  let activeCount = 0;
  for (const contact of contacts) {
    contact.age += elapsed;
    if (contact.age >= contact.life) continue;
    contact.x += contact.velocityX * elapsed;
    contacts[activeCount] = contact;
    activeCount += 1;
  }
  contacts.length = activeCount;
}

function updateHail(particles, contacts, surfaces, width, height, elapsed, dynamics) {
  for (let index = 0; index < particles.length; index += 1) {
    const stone = particles[index];
    const previousY = stone.y;
    stone.x += stone.velocityX * elapsed;
    stone.y += stone.velocityY * elapsed;
    stone.velocityY += stone.gravity * elapsed;
    const surface = weatherSurfaceCrossing(surfaces, stone.x, previousY, stone.y);
    if (surface) createHailContact(contacts, stone, surface);

    if (stone.y >= stone.impactY) {
      stone.y = stone.impactY;
      stone.velocityY = -Math.abs(stone.velocityY) * randomBetween(0.3, 0.48);
      stone.velocityX *= 0.72;
      stone.bounces += 1;
    }

    if (stone.bounces >= 2 || stone.x < -stone.size * 4 || stone.x > width + stone.size * 4) {
      particles[index] = createHailstone(width, height, false, dynamics);
    }
  }
  updateHailContacts(contacts, elapsed);
}

function updateWind(particles, width, height, elapsed, dynamics) {
  for (let index = 0; index < particles.length; index += 1) {
    const gust = particles[index];
    gust.phase += gust.turn * elapsed;
    gust.x += gust.velocityX * elapsed;
    gust.y += gust.velocityY * elapsed;
    if (gust.x < -gust.length || gust.x > width + gust.length
      || gust.y < -gust.length || gust.y > height + gust.length) {
      particles[index] = createWindGust(width, height, false, dynamics);
    }
  }
}


function updateRain(particles, groundImpacts, contactImpacts, surfaces, width, height, elapsed, dynamics) {
  for (let index = 0; index < particles.length; index += 1) {
    const drop = particles[index];
    const previousY = drop.y;
    drop.phase += drop.turn * elapsed;
    drop.x += (drop.wind + Math.sin(drop.phase) * drop.flutter) * elapsed;
    drop.y += drop.speed * elapsed;
    const surface = weatherSurfaceCrossing(surfaces, drop.x, previousY, drop.y);
    if (surface) createRainImpact(contactImpacts, drop, surface.y, 0.3);
    if (drop.y >= drop.impactY) {
      if (drop.x > -drop.length && drop.x < width + drop.length) createRainImpact(groundImpacts, drop);
      particles[index] = createRainDrop(width, height, false, dynamics);
    } else if (drop.x < -drop.length || drop.x > width + drop.length) {
      particles[index] = createRainDrop(width, height, false, dynamics);
    }
  }
  updateRainImpacts(groundImpacts, elapsed);
  updateRainImpacts(contactImpacts, elapsed);
}

function updateSnow(particles, contacts, surfaces, width, height, elapsed, dynamics) {
  for (let index = 0; index < particles.length; index += 1) {
    const flake = particles[index];
    flake.phase += flake.turn * elapsed;
    flake.rotation += flake.spin * elapsed;

    if (flake.grounded) {
      flake.settleAge += elapsed;
      flake.velocityY += 110 * elapsed;
      flake.y = Math.min(flake.impactY, flake.y + flake.velocityY * elapsed);
      if (flake.y === flake.impactY) flake.velocityY = 0;
      flake.x += flake.drift * 0.22 * elapsed;
    } else {
      const previousY = flake.y;
      flake.x += (flake.drift + Math.sin(flake.phase) * flake.sway) * elapsed;
      flake.y += flake.velocityY * elapsed;
      const surface = weatherSurfaceCrossing(surfaces, flake.x, previousY, flake.y);
      if (surface) createSnowContact(contacts, flake, surface);
      if (flake.y >= flake.impactY) {
        flake.y = flake.impactY;
        flake.velocityY *= -randomBetween(0.1, 0.2);
        flake.spin *= 0.35;
        flake.grounded = true;
      }
    }

    if (flake.settleAge >= flake.settleLife || flake.x < -36 || flake.x > width + 36) {
      particles[index] = createSnowflake(width, height, false, dynamics);
    }
  }
  updateSnowContacts(contacts, elapsed);
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

function drawRainImpacts(context, impacts) {
  context.lineCap = "round";
  for (const impact of impacts) {
    const progress = impact.age / impact.life;
    const alpha = impact.alpha * (1 - progress);
    context.beginPath();
    if (impact.kind === "ripple") {
      const radius = impact.radius + impact.expansion * progress;
      context.ellipse(impact.x, impact.y, radius, radius * 0.18, 0, 0, Math.PI * 2);
      context.lineWidth = 0.45;
    } else {
      context.moveTo(impact.x - impact.velocityX * 0.012, impact.y - impact.velocityY * 0.012);
      context.lineTo(impact.x, impact.y);
      context.lineWidth = impact.width;
    }
    context.strokeStyle = `rgba(213, 234, 244, ${alpha})`;
    context.stroke();
  }
}
function drawHail(context, particles) {
  for (const stone of particles) {
    context.beginPath();
    context.arc(stone.x, stone.y, stone.size, 0, Math.PI * 2);
    context.fillStyle = `rgba(230, 242, 248, ${stone.alpha})`;
    context.fill();
    context.beginPath();
    context.arc(stone.x - stone.size * 0.26, stone.y - stone.size * 0.3, stone.size * 0.34, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, 255, 255, ${stone.alpha * 0.6})`;
    context.fill();
  }
}

function drawHailContacts(context, contacts) {
  context.lineCap = "round";
  for (const contact of contacts) {
    const progress = contact.age / contact.life;
    const alpha = contact.alpha * (1 - progress);
    const radius = contact.size * (1 + progress * 1.8);
    context.beginPath();
    context.ellipse(contact.x, contact.y, radius * 1.55, radius * 0.28, 0, 0, Math.PI * 2);
    context.lineWidth = 0.5;
    context.strokeStyle = `rgba(237, 247, 251, ${alpha})`;
    context.stroke();
    context.beginPath();
    context.moveTo(contact.x, contact.y);
    context.lineTo(contact.x + contact.velocityX * 0.02, contact.y - radius * (1 - progress));
    context.lineWidth = Math.max(0.35, contact.size * 0.22);
    context.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    context.stroke();
  }
}

function drawWind(context, particles) {
  context.lineCap = "round";
  for (const gust of particles) {
    const speed = Math.hypot(gust.velocityX, gust.velocityY);
    if (speed === 0) continue;
    const tailX = gust.x - gust.velocityX / speed * gust.length;
    const tailY = gust.y - gust.velocityY / speed * gust.length;
    const bend = Math.sin(gust.phase) * 3;
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.quadraticCurveTo(
      (tailX + gust.x) / 2 - gust.velocityY / speed * bend,
      (tailY + gust.y) / 2 + gust.velocityX / speed * bend,
      gust.x,
      gust.y
    );
    context.lineWidth = gust.width;
    context.strokeStyle = `rgba(215, 234, 241, ${gust.alpha})`;
    context.stroke();
  }
}


function drawSnow(context, particles) {
  for (const flake of particles) {
    const settleProgress = flake.grounded ? clamp(flake.settleAge / flake.settleLife, 0, 1) : 0;
    const alpha = flake.alpha * (1 - settleProgress);
    const contact = flake.grounded && flake.y === flake.impactY;
    context.save();
    context.translate(flake.x, flake.y);
    context.rotate(flake.rotation);
    if (contact) context.scale(1 + settleProgress * 0.22, 1 - settleProgress * 0.18);
    if (flake.size > 1.7) {
      context.beginPath();
      context.ellipse(0, 0, flake.size * 2.2, flake.size * flake.stretch * 2.2, 0, 0, Math.PI * 2);
      context.fillStyle = `rgba(226, 239, 245, ${alpha * 0.1})`;
      context.fill();
    }
    context.beginPath();
    context.ellipse(0, 0, flake.size, flake.size * flake.stretch, 0, 0, Math.PI * 2);
    context.fillStyle = `rgba(243, 249, 251, ${alpha})`;
    context.fill();
    context.restore();
  }
}

function drawSnowContacts(context, contacts) {
  for (const contact of contacts) {
    const progress = clamp(contact.age / contact.life, 0, 1);
    context.save();
    context.translate(contact.x, contact.y);
    context.rotate(contact.rotation);
    context.scale(1 + progress * 0.7, Math.max(0.18, 0.48 - progress * 0.3));
    context.beginPath();
    context.ellipse(0, 0, contact.size * 1.8, contact.size * contact.stretch, 0, 0, Math.PI * 2);
    context.fillStyle = `rgba(243, 249, 251, ${contact.alpha * (1 - progress)})`;
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

export function createWeatherFx(canvas, {
  root = document.body,
  contactCanvas = null
} = {}) {
  const context = canvas?.getContext?.("2d");
  const contactContext = contactCanvas?.getContext?.("2d") ?? null;
  if (!context) return { destroy() {} };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const surfaceElements = root.querySelectorAll("[data-weather-surface]");
  let effect = null;
  let dynamics = DEFAULT_DYNAMICS;
  let particles = [];
  const groundImpacts = [];
  const contactImpacts = [];
  const snowContacts = [];
  const surfaces = [];
  const hailContacts = [];
  let width = 0;
  let height = 0;
  let animationFrame = null;
  let resizeFrame = null;
  let surfaceFrame = null;
  let previousTime = 0;

  function clearContactEffects() {
    contactImpacts.length = 0;
    snowContacts.length = 0;
    hailContacts.length = 0;
  }
  function rebuildParticles() {
    const count = particleBudget(effect, width, height, dynamics.densityScale);
    particles = Array.from({ length: count }, () => createParticle(effect, width, height, true, dynamics));
    groundImpacts.length = 0;
    clearContactEffects();
  }

  function measureSurfaces() {
    surfaces.length = 0;
    if (root.dataset.state !== "ready") return;
    for (const element of surfaceElements) {
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.bottom < 0 || bounds.bottom > height) continue;
      surfaces.push({
        left: Math.max(0, bounds.left),
        right: Math.min(width, bounds.right),
        y: bounds.bottom
      });
    }
    surfaces.sort((a, b) => a.y - b.y);
  }

  function resizeContext(targetCanvas, targetContext, pixelRatio) {
    if (!targetCanvas || !targetContext) return;
    targetCanvas.width = Math.round(width * pixelRatio);
    targetCanvas.height = Math.round(height * pixelRatio);
    targetContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds.width));
    const nextHeight = Math.max(1, Math.round(bounds.height));
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    resizeContext(canvas, context, pixelRatio);
    resizeContext(contactCanvas, contactContext, pixelRatio);
    rebuildParticles();
  }

  function clearCanvases() {
    context.clearRect(0, 0, width, height);
    contactContext?.clearRect(0, 0, width, height);
  }

  function drawFrame(timestamp) {
    const elapsed = previousTime ? Math.min((timestamp - previousTime) / 1_000, 0.04) : 0;
    previousTime = timestamp;
    clearCanvases();
    context.globalCompositeOperation = "screen";
    if (contactContext) contactContext.globalCompositeOperation = "screen";
    if (effect === "rain") {
      updateRain(particles, groundImpacts, contactImpacts, surfaces, width, height, elapsed, dynamics);
      drawRain(context, particles);
      drawRainImpacts(context, groundImpacts);
      drawRainImpacts(contactContext ?? context, contactImpacts);
    } else if (effect === "snow") {
      updateSnow(particles, snowContacts, surfaces, width, height, elapsed, dynamics);
      drawSnow(context, particles);
      drawSnowContacts(contactContext ?? context, snowContacts);
    } else if (effect === "hail") {
      updateHail(particles, hailContacts, surfaces, width, height, elapsed, dynamics);
      drawHail(context, particles);
      drawHailContacts(contactContext ?? context, hailContacts);
    } else if (effect === "wind") {
      updateWind(particles, width, height, elapsed, dynamics);
      drawWind(context, particles);
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
    clearCanvases();
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
    const nextDynamics = weatherDynamicsFor({ effect: nextEffect, ...root.dataset });
    const dynamicsChanged = !sameDynamics(nextDynamics, dynamics);
    if (nextEffect !== effect || dynamicsChanged) {
      effect = nextEffect;
      dynamics = nextDynamics;
      rebuildParticles();
    }
    queueSurfaceMeasure();
    syncAnimation();
  }

  function queueResize() {
    if (resizeFrame != null) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      resizeCanvas();
      measureSurfaces();
    });
  }

  function queueSurfaceMeasure() {
    if (surfaceFrame != null) return;
    surfaceFrame = window.requestAnimationFrame(() => {
      surfaceFrame = null;
      measureSurfaces();
      clearContactEffects();
    });
  }

  const themeObserver = new MutationObserver(syncTheme);
  const stopListeningForMotion = listenToMediaQuery(reducedMotion, syncAnimation);
  const layoutRoot = root.querySelector?.("#panel-ready");
  const layoutObserver = layoutRoot ? new MutationObserver(queueSurfaceMeasure) : null;
  layoutObserver?.observe(layoutRoot, {
    childList: true,
    subtree: true,
    characterData: true
  });
  themeObserver.observe(root, {
    attributes: true,
    attributeFilter: [
      "data-state",
      "data-weather",
      "data-light",
      "data-precipitation",
      "data-snowfall",
      "data-wind-speed",
      "data-wind-direction",
      "data-wind-gust",
      "data-storm"
    ]
  });
  window.addEventListener("resize", queueResize, { passive: true });
  window.addEventListener("scroll", queueSurfaceMeasure, { passive: true });
  document.addEventListener("visibilitychange", syncAnimation);
  resizeCanvas();
  syncTheme();

  return {
    destroy() {
      stopAnimation();
      themeObserver.disconnect();
      layoutObserver?.disconnect();
      window.removeEventListener("resize", queueResize);
      window.removeEventListener("scroll", queueSurfaceMeasure);
      document.removeEventListener("visibilitychange", syncAnimation);
      stopListeningForMotion();
      if (resizeFrame != null) window.cancelAnimationFrame(resizeFrame);
      if (surfaceFrame != null) window.cancelAnimationFrame(surfaceFrame);
    }
  };
}
