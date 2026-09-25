# 004 — LERP Wind Dynamics to Prevent Abrupt Vector Snapping

- **Status**: DONE
- **Commit**: c399c91
- **Severity**: MEDIUM
- **Category**: Physicality & Easing
- **Estimated scope**: 1 file (`js/weather-fx.mjs`)

## Problem

In `js/weather-fx.mjs:934-957`, whenever meteorological conditions change (e.g. wind speed fluctuates from 10km/h to 35km/h, or wind direction rotates from East to North during hourly forecasts), `retargetDynamics` instantly overwrites the velocity vectors of all active airborne particles:

```javascript
/* js/weather-fx.mjs:934-957 — current */
function retargetDynamics() {
  for (const particle of particles) {
    if (effect === "rain") {
      particle.wind = dynamics.windX * (0.4 + particle.depth * 0.6);
      particle.windY = dynamics.windY * (0.35 + particle.depth * 0.45);
      particle.speed = (300 + particle.depth * 850) * dynamics.fallSpeedScale;
    } else if (effect === "snow") {
      /* ... instantaneous vector reassignment ... */
    }
  }
}
```

This causes airborne rain streaks and snowflakes to snap their angle abruptly within a single frame (a harsh geometric bend), violating physical inertia and momentum.

## Target

Introduce **Exponential Damped Interpolation (LERP)** for active weather dynamics:
1. Maintain internal smoothed physics state:
   - `smoothWindX` (approaching `targetDynamics.windX`)
   - `smoothWindY` (approaching `targetDynamics.windY`)
   - `smoothFallSpeedScale` (approaching `targetDynamics.fallSpeedScale`)
2. In each frame calculation (`drawFrame`):
   ```javascript
   // Exponential smoothing factor: frame-rate independent
   const smoothingRate = 3.8; // ~450ms half-life response
   const factor = 1 - Math.exp(-elapsed * smoothingRate);
   smoothWindX += (dynamics.windX - smoothWindX) * factor;
   smoothWindY += (dynamics.windY - smoothWindY) * factor;
   smoothFallSpeedScale += (dynamics.fallSpeedScale - smoothFallSpeedScale) * factor;
   ```
3. Particles dynamically consume `smoothWindX`, `smoothWindY`, and `smoothFallSpeedScale` during updates. Rain streaks tilt smoothly like natural precipitation caught in shifting gusts.

## Repo conventions to follow

- Physics velocity scales live in `js/weather-fx.mjs:21-26` (`DEFAULT_DYNAMICS`).
- Calculations use SI / Cartesian angles with `Math.hypot`, `clamp`, and `randomBetween`.

## Steps

1. In `createWeatherFx`:
   Define smoothed dynamic state initialized to `dynamics`:
   ```javascript
   let smoothWindX = dynamics.windX;
   let smoothWindY = dynamics.windY;
   let smoothFallSpeedScale = dynamics.fallSpeedScale;
   ```

2. In `syncTheme`:
   When `dynamicsChanged`:
   Do NOT violently mutate individual particle properties in a hard loop. Simply update target `dynamics = nextDynamics`. When switching to a totally new weather effect (`nextEffect !== effect`), snap `smoothWindX = nextDynamics.windX; smoothWindY = nextDynamics.windY;` to prevent lagging on unrelated initial spawns.

3. In `drawFrame`:
   Before running `updateRain` / `updateSnow` / `updateHail` / `updateWind`:
   Update smoothed dynamics:
   ```javascript
   const factor = 1 - Math.exp(-elapsed * 3.8);
   smoothWindX += (dynamics.windX - smoothWindX) * factor;
   smoothWindY += (dynamics.windY - smoothWindY) * factor;
   smoothFallSpeedScale += (dynamics.fallSpeedScale - smoothFallSpeedScale) * factor;
   ```
   Pass the smoothed dynamics proxy object `{ windX: smoothWindX, windY: smoothWindY, fallSpeedScale: smoothFallSpeedScale, densityScale: dynamics.densityScale }` to particle update methods.

## Boundaries

- Do NOT alter raw meteorological parsing in `weatherDynamicsFor`.
- Do NOT add external math libraries; keep implementation lightweight and native.

## Verification

- **Mechanical**: Run `npm test` and verify all 28 tests pass.
- **Feel check**:
  - In DevTools console, dynamically alter wind properties:
    `document.body.dataset.windDirection = "90";` then 1 second later `document.body.dataset.windDirection = "270";`.
  - Confirm: Rain streaks and gusts of wind gently sweep and rotate over 400–600ms, mimicking a real gust of wind sweeping through rather than a harsh digital jump cut.
- **Done when**: Sudden wind changes result in continuous, natural rotational inertia with zero single-frame angle snaps.
