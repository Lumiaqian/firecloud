import test from "node:test";
import assert from "node:assert/strict";
import { createFrameLoop } from "../js/frame-loop.mjs";

function fakeFrames() {
  const queue = new Map();
  let nextId = 1;
  return {
    request(callback) { queue.set(nextId, callback); return nextId++; },
    cancel(id) { queue.delete(id); },
    pending: () => queue.size,
    step(timestamp) {
      const callbacks = [...queue.values()];
      queue.clear();
      callbacks.forEach((callback) => callback(timestamp));
    }
  };
}

test("多个任务共用一帧，任务全部移除后停止请求帧", () => {
  const frames = fakeFrames();
  const loop = createFrameLoop(frames);
  const seen = [];
  const a = (t) => seen.push(["a", t]);
  const b = (t) => seen.push(["b", t]);
  loop.add(a);
  loop.add(b);
  assert.equal(frames.pending(), 1);
  frames.step(16);
  assert.deepEqual(seen, [["a", 16], ["b", 16]]);
  assert.equal(frames.pending(), 1);

  loop.remove(a);
  loop.remove(b);
  assert.equal(frames.pending(), 0);
});

test("任务可在执行中移除自己，循环随之停止", () => {
  const frames = fakeFrames();
  const loop = createFrameLoop(frames);
  let runs = 0;
  const once = () => { runs += 1; loop.remove(once); };
  loop.add(once);
  frames.step(16);
  frames.step(32);
  assert.equal(runs, 1);
  assert.equal(frames.pending(), 0);
});
