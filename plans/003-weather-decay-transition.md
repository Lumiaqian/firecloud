# 003 — Smooth Particle Decay-Out on Weather State Transitions

- **Status**: DONE
- **Commit**: c399c91
- **Severity**: MEDIUM
- **Category**: Interruptibility & Physicality
- **Estimated scope**: 1 file (`js/weather-fx.mjs`)

## Problem

When the user selects another city or the weather conditions transition from one category to another (e.g. from rain to snow, or from thunderstorm to clear night), `syncTheme` executes an instantaneous hard reset:

```javascript
/* js/weather-fx.mjs:1107-1115 — current */
if (nextEffect !== effect) {
  effect = nextEffect;
  dynamics = nextDynamics;
  rebuildParticles();
}
```

Inside `rebuildParticles()`:
All existing particles, contacts, and impact ripples are wiped out within a single frame. The previous rain drops instantly vanish into thin air, and a full screen of brand new snowflakes or stars instantly appears. Even with a CSS opacity fade on the canvas element, this hard purge breaks the physical illusion of natural weather.

## Target

Implement a **Decay-Out / Cross-Fade Lifecycle** for weather transitions:
1. When `nextEffect !== effect`:
   - Move active particles to a `retiringParticles` queue (tagged with `retiringEffect` and an `exitOpacity` fade from 1.0 down to 0.0 over 650ms).
   - Retiring particles stop respawning from the top; they fall out of view or collide naturally with surfaces.
   - Initialize new `particles` for `nextEffect`, with an `entryOpacity` ramping from 0.0 to 1.0 over 450ms.
2. During the 650ms cross-fade window, both sets update and render. Once retiring particles leave the screen or fade to 0, they are automatically purged.
3. Rapid interruptions: If the user rapidly switches cities again mid-transition, the retiring queue immediately absorbs any existing particles and restarts decay without hitching.

## Repo conventions to follow

- Particle updates use `elapsed` seconds (clamped to max 0.04s in `drawFrame`).
- Particle creation helpers (`createRainDrop`, `createSnowflake`, `createHailstone`, etc.) accept `initial = false` when generating particles off-screen above the viewport.

## Steps

1. In `createWeatherFx`:
   Add internal transition state:
   ```javascript
   let retiringParticles = [];
   let retiringEffect = null;
   let retiringGroundImpacts = [];
   let retiringContactImpacts = [];
   let retiringSnowContacts = [];
   let retiringHailContacts = [];
   let transitionProgress = 1; // 1 = fully transitioned
   const TRANSITION_DURATION = 0.65; // seconds
   ```

2. Modify `syncTheme`:
   When `nextEffect !== effect`:
   - If `effect` had active particles, transfer them:
     `retiringParticles = particles; retiringEffect = effect;`
     Transfer active contact arrays (`retiringContactImpacts = contactImpacts.slice();`, etc.).
   - Set `effect = nextEffect; dynamics = nextDynamics;`
   - Initialize new `particles` using `createParticle` with `initial = false` (or spawn above screen so new weather falls in naturally), or set initial `entryAlpha = 0`.
   - Set `transitionProgress = 0;`.

3. In `drawFrame`:
   - If `transitionProgress < 1`:
     Advance `transitionProgress = Math.min(1, transitionProgress + elapsed / TRANSITION_DURATION)`.
     Update and draw `retiringParticles` with alpha multiplied by `(1 - transitionProgress)`.
     Update and draw new `particles` with alpha multiplied by `transitionProgress`.
     When `transitionProgress >= 1`: clear `retiringParticles` and retiring contact arrays.

4. In `clearCanvases()` and `stopAnimation()`:
   Ensure `retiringParticles` and associated contact arrays are cleaned up properly.

## Boundaries

- Do NOT change the calculation of `weatherEffectFor` or `weatherDynamicsFor`.
- Do NOT modify UI layout or card surface measurements.
- Only handle the transition lifecycle inside `createWeatherFx`.

## Verification

- **Mechanical**: Run `npm test` and ensure all 28 tests pass.
- **Feel check**:
  - In the app, switch between a city with heavy rain (e.g. Chongqing) and a city with snow or clear sky (e.g. Harbin).
  - Observe the transition in slow motion (e.g. 20% CPU throttle in DevTools):
    - Confirm: Rain drops continue falling to the bottom and splashing against the glass card top edges as they leave.
    - Confirm: Snow flakes begin gently drifting in from the top without a sudden flash of 100 particles appearing mid-air.
    - Confirm: No frame drops or visual clipping during the 650ms handover.
- **Done when**: Weather transitions feel like natural atmospheric shifts rather than a screen reload.
