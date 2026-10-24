// 本机存储：地点、收藏、界面偏好与预报缓存。读写失败（隐私模式、配额）一律静默降级。

export const KEYS = {
  place: "firecloud:place:v1",
  favorites: "firecloud:favorites:v1",
  viewMode: "firecloud:view_mode:v1",
  data: "firecloud:data:v1",
  theme: "firecloud:theme:v1",
  loaderStyle: "firecloud:loader_style:v1"
};

export const FAVORITES_LIMIT = 8;
const CACHE_MAX_AGE = 12 * 60 * 60 * 1000;
const CACHE_LIMIT = 16;

export function createStorage(backend = globalThis.localStorage) {
  return {
    get(key, fallback = null) {
      try {
        const value = JSON.parse(backend.getItem(key));
        return value ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { backend.setItem(key, JSON.stringify(value)); } catch { /* private browsing */ }
    }
  };
}

export function normalizePlace(place) {
  if (!place || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lon))) return null;
  return { name: String(place.name || "未命名地点"), lat: Number(place.lat), lon: Number(place.lon) };
}

export function placeIdentity(place) {
  return `${place.lat.toFixed(4)},${place.lon.toFixed(4)}`;
}

export function samePlace(a, b) {
  return Boolean(a && b) && placeIdentity(a) === placeIdentity(b);
}

export function normalizeFavorites(favorites) {
  if (!Array.isArray(favorites)) return [];
  const seen = new Set();
  return favorites.map(normalizePlace).filter((place) => {
    if (!place) return false;
    const key = placeIdentity(place);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, FAVORITES_LIMIT);
}

/**
 * 预报缓存：按地点（两位小数）与晨昏时段分条保存，超过 12 小时失效，最多保留 16 条最新记录。
 * 缓存年龄由保存时间计算，与渲染无关。
 */
export function createForecastCache(storage, { now = Date.now } = {}) {
  const keyFor = (place, eventType) => `${place.lat.toFixed(2)},${place.lon.toFixed(2)}:${eventType}`;
  return {
    read(place, eventType) {
      const entries = storage.get(KEYS.data, {});
      const entry = entries?.[keyFor(place, eventType)];
      if (!entry || !entry.bundle || !Number.isFinite(entry.savedAt)) return null;
      const age = now() - entry.savedAt;
      if (age < 0 || age > CACHE_MAX_AGE) return null;
      return { bundle: entry.bundle, savedAt: entry.savedAt, age };
    },
    write(bundle) {
      const entries = storage.get(KEYS.data, {});
      entries[keyFor(bundle.place, bundle.eventType)] = { bundle, savedAt: now() };
      const newest = Object.entries(entries)
        .sort(([, a], [, b]) => (b.savedAt ?? 0) - (a.savedAt ?? 0))
        .slice(0, CACHE_LIMIT);
      storage.set(KEYS.data, Object.fromEntries(newest));
    }
  };
}
