# 002 — Eliminate Particle GC Jitter in Rain Rendering

- **Status**: DONE
- **Commit**: c399c91
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file (`js/weather-fx.mjs`)

## Problem

In `js/weather-fx.mjs:640-665`, the `drawRain` function executes every single animation frame (up to 120 times per second on ProMotion / high-refresh displays). Inside this critical loop, it dynamically allocates a `new Map()` and produces dozens of temporary string keys and bucket objects:

```javascript
/* js/weather-fx.mjs:640-654 — current */
function drawRain(context, particles) {
  context.lineCap = "round";
  const buckets = new Map();
  for (const drop of particles) {
    const widthKey = Math.round(drop.width * 4) / 4;
    const alphaKey = Math.round(drop.alpha * 20) / 20;
    const key = `${widthKey}:${alphaKey}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { width: widthKey, alpha: alphaKey, drops: [] };
      buckets.set(key, bucket);
    }
    bucket.drops.push(drop);
  }
  for (const bucket of buckets.values()) {
    /* ... */
  }
}
```

This allocates over 10,000 short-lived objects and string instances every few seconds. In modern JS engines (V8 / JavaScriptCore), this triggers frequent Minor Garbage Collection sweeps, producing noticeable micro-stutter (frame hitching) on mobile devices and battery drain during extended viewing.

## Target

Eliminate all object allocations and string concatenations from the `drawRain` hot path. Use a pre-allocated fixed-size 2D bucket array (or a flat array of fixed discrete bins) with reusable particle reference lists:

```javascript
/* target structure */
// 4 discrete stroke width tiers (0.35px, 0.6px, 0.9px, 1.25px)
// 5 discrete alpha tiers (0.08, 0.16, 0.24, 0.32, 0.40)
// Total 20 static buckets allocated ONCE at module load.
```

In `drawRain`:
1. Reset the `count` of all 20 pre-allocated buckets to `0`.
2. Compute bucket index using fast integer math: `const bucketIdx = widthIndex * 5 + alphaIndex`.
3. Store drop references in the bucket's pre-allocated array slot without expanding length or creating strings.
4. Iterate and stroke only buckets where `count > 0`.

Zero allocations per frame. Zero Garbage Collection churn.

## Repo conventions to follow

- Particle limit definitions live as constants at the top of `js/weather-fx.mjs` (e.g. `PARTICLE_LIMITS`, `DEFAULT_DYNAMICS`).
- Canvas contexts utilize `context.lineCap = "round"` and `globalCompositeOperation = "screen"`.

## Steps

1. In `js/weather-fx.mjs`, create module-level static rain buckets:
   ```javascript
   const RAIN_WIDTH_TIERS = [0.35, 0.6, 0.9, 1.25];
   const RAIN_ALPHA_TIERS = [0.08, 0.16, 0.24, 0.32, 0.40];
   const STATIC_RAIN_BUCKETS = [];
   for (let w = 0; w < RAIN_WIDTH_TIERS.length; w++) {
     for (let a = 0; a < RAIN_ALPHA_TIERS.length; a++) {
       STATIC_RAIN_BUCKETS.push({
         width: RAIN_WIDTH_TIERS[w],
         alpha: RAIN_ALPHA_TIERS[a],
         style: `rgba(207, 227, 238, ${RAIN_ALPHA_TIERS[a]})`,
         drops: new Array(PARTICLE_LIMITS.rain.max),
         count: 0
       });
     }
   }
   ```

2. Rewrite `drawRain(context, particles)`:
   - Reset `bucket.count = 0` for all 20 buckets.
   - For each particle:
     - Map `drop.width` to index 0..3: `clamp(Math.floor((drop.width - 0.25) / 0.26), 0, 3)`.
     - Map `drop.alpha` to index 0..4: `clamp(Math.floor((drop.alpha - 0.05) / 0.08), 0, 4)`.
     - `const bucket = STATIC_RAIN_BUCKETS[wIdx * 5 + aIdx];`
     - `bucket.drops[bucket.count++] = drop;`
   - For each bucket where `count > 0`:
     - `context.beginPath(); context.lineWidth = bucket.width; context.strokeStyle = bucket.style;`
     - Loop from 0 to `count`: draw drop streaks with `moveTo` / `lineTo`.
     - `context.stroke();`

## Boundaries

- Do NOT change the trajectory formula or impact trigger logic in `updateRain`.
- Do NOT alter snow, hail, or star renderers unless applying the exact same zero-allocation pattern.

## Verification

- **Mechanical**: Run `npm test` to verify that all weather calculations, velocity vectors, and collisions pass 100%.
- **Feel check**:
  - Open Chrome DevTools Performance panel, record 10 seconds of heavy rain (`document.body.dataset.weather = "rain"`, `document.body.dataset.precipitation = "15"`).
  - Inspect the Memory timeline (JS Heap).
  - Confirm: The sawtooth pattern of Minor GC drops from tens of times per minute to a virtually flat line.
  - Test on a 120Hz display (e.g. MacBook Pro ProMotion or iPhone Safari) and verify that frame rates stay locked at 120fps with zero micro-stutter.
- **Done when**: `drawRain` creates 0 objects and 0 strings per frame, confirmed via DevTools Allocation Profiler.
