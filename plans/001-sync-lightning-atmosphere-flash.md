# 001 — Synchronize Lightning Bolts with Atmosphere Flash

- **Status**: DONE
- **Commit**: c399c91
- **Severity**: HIGH
- **Category**: Physicality & Cohesion
- **Estimated scope**: 2 files (`js/weather-fx.mjs`, `css/style.css`)

## Problem

In thunderstorm weather, there is a total decoupling between the Canvas electrical arcs and the background atmospheric illumination:
- In `js/weather-fx.mjs:1024-1038`, lightning arcs are generated stochastically via `lightningWait` (triggering 1–2 bolts every 2.4s–7.2s, each lasting only 60–140ms).
- In `css/style.css:723-728`, the atmosphere lightning flash is running on a hardcoded 11.5s independent CSS keyframe loop:

```css
/* css/style.css:723-728 — current */
--atmosphere-light-animation: atmosphere-thunder-exposure;
--atmosphere-light-duration: 11.5s;
--atmosphere-light-timing: linear;
--atmosphere-light-blend: screen;
--atmosphere-light-mask: radial-gradient(ellipse 96% 82% at 60% 12%, var(--ink) 0 24%, transparent 80%);
--atmosphere-light-opacity: 1;
```

As a result, the background atmosphere flashes white when no lightning bolt exists in the sky, and when high-voltage arcs strike across the canvas, the sky remains completely dark. This destroys physical believability.

## Target

Eliminate the static 11.5s CSS loop. Drive the atmosphere exposure dynamically from the active lightning bolt intensity in the canvas animation loop:

```css
/* css/style.css — target */
body[data-state="ready"][data-weather="thunder"] .weather-atmosphere {
  --atmosphere-light-image:
    radial-gradient(circle at 72% 10%, var(--atmosphere-lightning-core) 0, transparent 28%),
    radial-gradient(circle at 38% 18%, rgba(220, 236, 255, 0.35) 0, transparent 18%),
    linear-gradient(180deg, var(--atmosphere-lightning-wash), var(--atmosphere-rain-wash) 55%, transparent 82%);
  --atmosphere-light-animation: none;
  --atmosphere-light-blend: screen;
  --atmosphere-light-mask: radial-gradient(ellipse 96% 82% at 60% 12%, var(--ink) 0 24%, transparent 80%);
  --atmosphere-light-opacity: var(--atmosphere-lightning-flash, 0);
}
```

In `js/weather-fx.mjs`, during `drawFrame`:
Calculate the peak illumination intensity from all active `lightningBolts` (`maxFlash = Math.max(0, ...bolts.map(b => ...))`). Set `--atmosphere-lightning-flash` directly on `root.style` (or `.weather-atmosphere`) when lightning is active, and reset to `0` when bolts clear.

## Repo conventions to follow

- Dynamic weather drivers are injected as CSS variables on `root` (`document.body`) or mapped via `atmosphereDriveFor` (see `js/weather-fx.mjs:180-211`).
- Clean teardown: `destroy()` in `createWeatherFx` must remove any inline `--atmosphere-lightning-flash` property to prevent stale state.

## Steps

1. In `css/style.css:723-728`:
   Remove `--atmosphere-light-animation: atmosphere-thunder-exposure;`, `--atmosphere-light-duration: 11.5s;`, and `--atmosphere-light-timing: linear;`.
   Set `--atmosphere-light-opacity: var(--atmosphere-lightning-flash, 0);`.
   Ensure `body[data-state="ready"][data-weather="thunder"] .atmosphere-layer--light` has `transition: opacity 60ms ease-out;` to smooth out sub-frame decays without lagging behind the discharge.

2. In `js/weather-fx.mjs`:
   In `drawFrame(timestamp)`:
   Compute the instantaneous flash value:
   ```javascript
   let flashIntensity = 0;
   if (lightningBolts.length > 0) {
     for (const bolt of lightningBolts) {
       const progress = clamp(bolt.age / bolt.life, 0, 1);
       const flash = progress < 0.18 ? 1 : 1 - (progress - 0.18) / 0.82;
       flashIntensity = Math.max(flashIntensity, bolt.alpha * flash);
     }
   }
   ```
   If `flashIntensity > 0` or previously active:
   `root.style.setProperty("--atmosphere-lightning-flash", flashIntensity > 0.02 ? flashIntensity.toFixed(3) : "0");`

3. In `stopAnimation()` and `destroy()` of `js/weather-fx.mjs`:
   Clean up `root.style.removeProperty("--atmosphere-lightning-flash");`.

## Boundaries

- Do NOT change the lightning bolt procedural path generation (`createLightningBolt`).
- Do NOT alter other weather themes (`rain`, `snow`, `fog`, `clear`).
- Keep `@media (prefers-reduced-motion: reduce)` behavior intact.

## Verification

- **Mechanical**: Run `npm test` to ensure existing 28 tests pass with 0 failures.
- **Feel check**:
  - Run the local server and simulate thunder (`document.body.dataset.weather = "thunder"`, `document.body.dataset.lightning = "true"`).
  - Open Chrome DevTools Animations panel or record at 60fps.
  - Confirm: Every single time an electrical arc tears across the screen, the entire sky explodes in white-blue light in the exact same frame, fading out simultaneously as the arc dissipates.
  - Confirm: When there are no bolts in the sky, the atmosphere does NOT randomly blink on its own.
- **Done when**: Atmosphere illumination and Canvas bolt strikes are 100% frame-synchronized with zero phantom flashes.
