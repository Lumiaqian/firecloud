// 加载动画模板。prefix 区分同一页面上多处实例的 SVG 渐变 id，避免互相覆盖。

export function loaderMarkup(style, prefix = "") {
  if (style === "horizon-classic") {
    return `
      <div class="loader-horizon-classic" aria-hidden="true">
        <span class="horizon-classic-glow"></span>
        <svg class="horizon-classic-svg" viewBox="0 0 160 52" fill="none">
          <defs>
            <linearGradient id="${prefix}horizon-classic-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#edb56f" stop-opacity="0"/>
              <stop offset="25%" stop-color="#ffd07c" stop-opacity="0.95"/>
              <stop offset="50%" stop-color="#ffffff" stop-opacity="1"/>
              <stop offset="75%" stop-color="#ff6e38" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#edb56f" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path class="horizon-classic-track" d="M 16 38 Q 80 18 144 38" />
          <path class="horizon-classic-beam" stroke="url(#${prefix}horizon-classic-beam-grad)" d="M 16 38 Q 80 18 144 38" />
        </svg>
        <div class="horizon-classic-vapors">
          <span class="horizon-classic-vapor v1"></span>
          <span class="horizon-classic-vapor v2"></span>
          <span class="horizon-classic-vapor v3"></span>
        </div>
      </div>
    `;
  }
  if (style === "kepler") {
    return `
      <div class="loader-kepler" aria-hidden="true">
        <span class="kepler-ambient"></span>
        <span class="kepler-shockwave"></span>
        <svg class="kepler-svg" viewBox="0 0 104 104" fill="none">
          <defs>
            <linearGradient id="${prefix}kepler-plasma-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
              <stop offset="25%" stop-color="#ffd07c" stop-opacity="1"/>
              <stop offset="65%" stop-color="#ff7e4a" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#ff7e4a" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${prefix}kepler-dust-grad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#a855f7" stop-opacity="0"/>
              <stop offset="40%" stop-color="#a855f7" stop-opacity="0.5"/>
              <stop offset="80%" stop-color="#9ebbf8" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#9ebbf8" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <ellipse class="kepler-orbit-cross" cx="52" cy="52" rx="42" ry="20" transform="rotate(32 52 52)" />
          <ellipse class="kepler-dust-stream" stroke="url(#${prefix}kepler-dust-grad)" cx="52" cy="52" rx="42" ry="20" transform="rotate(32 52 52)" />
          <ellipse class="kepler-orbit-guide" cx="52" cy="52" rx="44" ry="24" transform="rotate(-18 52 52)" />
          <ellipse class="kepler-plasma-comet" stroke="url(#${prefix}kepler-plasma-grad)" cx="52" cy="52" rx="44" ry="24" transform="rotate(-18 52 52)" />
        </svg>
        <div class="kepler-star-system">
          <span class="kepler-corona-outer"></span>
          <span class="kepler-photosphere"></span>
        </div>
      </div>
    `;
  }
  if (style === "prismatic") {
    return `
      <div class="loader-prismatic" aria-hidden="true">
        <span class="chromatic-glow-bg"></span>
        <svg class="chromatic-svg" viewBox="0 0 104 104" fill="none">
          <defs>
            <linearGradient id="${prefix}chroma-grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff4757" stop-opacity="1"/>
              <stop offset="50%" stop-color="#ff7e4a" stop-opacity="0.7"/>
              <stop offset="100%" stop-color="#ff7e4a" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${prefix}chroma-grad-green" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#2ed573" stop-opacity="1"/>
              <stop offset="40%" stop-color="#ffd07c" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#ffd07c" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${prefix}chroma-grad-blue" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#1e90ff" stop-opacity="1"/>
              <stop offset="50%" stop-color="#c48aff" stop-opacity="0.7"/>
              <stop offset="100%" stop-color="#c48aff" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${prefix}chroma-laser" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
              <stop offset="35%" stop-color="#ffffff" stop-opacity="0.95"/>
              <stop offset="70%" stop-color="#ffd07c" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#ffd07c" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <circle class="chroma-track" cx="52" cy="52" r="38" />
          <circle class="chroma-arc arc-red" stroke="url(#${prefix}chroma-grad-red)" cx="52" cy="52" r="38" />
          <circle class="chroma-arc arc-green" stroke="url(#${prefix}chroma-grad-green)" cx="52" cy="52" r="38" />
          <circle class="chroma-arc arc-blue" stroke="url(#${prefix}chroma-grad-blue)" cx="52" cy="52" r="38" />
          <circle class="chroma-arc arc-core" stroke="url(#${prefix}chroma-laser)" cx="52" cy="52" r="38" />
        </svg>
      </div>
    `;
  }
  // 默认：地平线 2.0
  return `
    <div class="loader-horizon" aria-hidden="true">
      <span class="horizon-glow"></span>
      <span class="horizon-aerosol-mist"></span>
      <span class="horizon-evening-star"></span>
      <div class="horizon-glint">
        <span class="horizon-glint-streak"></span>
        <span class="horizon-glint-core"></span>
      </div>
      <svg class="horizon-svg" viewBox="0 0 160 56" fill="none">
        <defs>
          <linearGradient id="${prefix}horizon-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#edb56f" stop-opacity="0"/>
            <stop offset="25%" stop-color="#ffd07c" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="75%" stop-color="#ff6e38" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#edb56f" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="${prefix}horizon-stratosphere-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#9ebbf8" stop-opacity="0"/>
            <stop offset="35%" stop-color="#9ebbf8" stop-opacity="0.8"/>
            <stop offset="70%" stop-color="#c48aff" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#c48aff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="horizon-track-stratosphere" d="M 22 36 Q 80 16 138 36" />
        <path class="horizon-stratosphere-glow" stroke="url(#${prefix}horizon-stratosphere-grad)" d="M 22 36 Q 80 16 138 36" />
        <path class="horizon-track-troposphere" d="M 16 42 Q 80 22 144 42" />
        <path class="horizon-beam" stroke="url(#${prefix}horizon-beam-grad)" d="M 16 42 Q 80 22 144 42" />
      </svg>
    </div>
  `;
}
