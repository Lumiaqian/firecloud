import test from "node:test";
import assert from "node:assert/strict";
import { createForecastCache, createStorage, KEYS } from "../js/core/storage.mjs";

const HZ = { name: "杭州", lat: 30.27, lon: 120.15 };
const NOW = Date.parse("2026-10-24T08:00:00Z");
const HOUR = 3_600_000;
const CACHE_KEY = "30.27,120.15:sunset";
const forecast = (place = HZ) => ({ place, eventType: "sunset", fetchedAt: NOW });

function memoryBackend() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test("localStorage getter 拒绝访问时仍可使用存储与预报缓存 API，显式注入不访问 getter", (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  });
  let accesses = 0;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      accesses += 1;
      throw new DOMException("Access denied", "SecurityError");
    }
  });

  const storage = createStorage();
  const fallback = { name: "默认地点" };
  assert.equal(storage.get(KEYS.place, fallback), fallback);
  storage.set(KEYS.place, HZ);
  assert.equal(storage.get(KEYS.place), null);
  const cache = createForecastCache(storage, { now: () => NOW });
  cache.write(forecast());
  assert.equal(cache.read(HZ, "sunset"), null);
  assert.equal(accesses, 1);

  const injected = createStorage(memoryBackend());
  injected.set(KEYS.place, HZ);
  assert.deepEqual(injected.get(KEYS.place), HZ);
  assert.equal(accesses, 1);
});

test("非对象或损坏的 JSON 缓存根节点被有效预报替换", () => {
  for (const raw of ["1", "true", '"text"', "null", "[]", "[null]", "{"]) {
    const backend = memoryBackend();
    backend.setItem(KEYS.data, raw);
    const storage = createStorage(backend);
    const cache = createForecastCache(storage, { now: () => NOW });
    assert.equal(cache.read(HZ, "sunset"), null);
    const bundle = forecast();
    cache.write(bundle);
    assert.deepEqual(storage.get(KEYS.data), { [CACHE_KEY]: { bundle, savedAt: NOW } });
    assert.deepEqual(cache.read(HZ, "sunset"), { bundle, savedAt: NOW, age: 0 });
  }
});

test("无效缓存条目读取为空，写入时剔除且保留有效旧条目", () => {
  const malformed = [null, 1, "text", [], {},
    { bundle: null, savedAt: NOW },
    { bundle: 1, savedAt: NOW },
    { bundle: [], savedAt: NOW },
    { bundle: forecast(), savedAt: String(NOW) },
    { bundle: forecast(), savedAt: null }
  ];
  const storage = createStorage(memoryBackend());
  const cache = createForecastCache(storage, { now: () => NOW });
  for (const entry of malformed) {
    storage.set(KEYS.data, { [CACHE_KEY]: entry });
    assert.equal(cache.read(HZ, "sunset"), null);
  }
  const previousBundle = forecast({ name: "上海", lat: 31.23, lon: 121.47 });
  const previous = { bundle: previousBundle, savedAt: NOW - HOUR };
  storage.set(KEYS.data, {
    ...Object.fromEntries(malformed.map((entry, index) => [`broken-${index}`, entry])),
    "31.23,121.47:sunset": previous
  });
  const bundle = forecast();
  cache.write(bundle);
  assert.deepEqual(storage.get(KEYS.data), {
    [CACHE_KEY]: { bundle, savedAt: NOW },
    "31.23,121.47:sunset": previous
  });
  assert.deepEqual(cache.read(previousBundle.place, "sunset"), {
    ...previous, age: HOUR
  });
});

test("缓存按保存时间排序仅保留最新 16 条，12 小时有效期含边界且拒绝未来记录", () => {
  const storage = createStorage(memoryBackend());
  const cache = createForecastCache(storage, { now: () => NOW });
  const entries = Array.from({ length: 20 }, (_, index) => {
    const bundle = forecast({ name: `地点 ${index}`, lat: index, lon: 100 });
    return [`${index.toFixed(2)},100.00:sunset`, { bundle, savedAt: NOW - (20 - index) * HOUR }];
  });
  storage.set(KEYS.data, Object.fromEntries(entries));
  const bundle = forecast();
  cache.write(bundle);
  const expected = [[CACHE_KEY, { bundle, savedAt: NOW }], ...entries.slice(-15).reverse()];
  assert.deepEqual(Object.entries(storage.get(KEYS.data)), expected);
  assert.equal(cache.read(entries[6][1].bundle.place, "sunset"), null);
  assert.equal(cache.read(entries[8][1].bundle.place, "sunset").age, 12 * HOUR);
  assert.equal(cache.read(entries[19][1].bundle.place, "sunset").age, HOUR);

  storage.set(KEYS.data, { [CACHE_KEY]: { bundle, savedAt: NOW + 1 } });
  assert.equal(cache.read(HZ, "sunset"), null);
  storage.set(KEYS.data, { [CACHE_KEY]: { bundle, savedAt: NOW - 12 * HOUR - 1 } });
  assert.equal(cache.read(HZ, "sunset"), null);
});

test("持久化降级不吞掉调用方提供无效预报的编程错误", () => {
  const cache = createForecastCache(createStorage(memoryBackend()), { now: () => NOW });
  assert.throws(() => cache.write({ place: null, eventType: "sunset" }), TypeError);
  assert.equal(cache.read(HZ, "sunset"), null);
});
