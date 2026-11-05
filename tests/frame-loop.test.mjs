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

test("帧内新增任务延至下一帧，重复添加不重复派发或预约", () => {
  const frames = fakeFrames();
  const loop = createFrameLoop(frames);
  const seen = [];
  const later = (t) => seen.push(["later", t]);
  const first = (t) => {
    seen.push(["first", t]);
    loop.add(later);
    loop.add(later);
  };
  loop.add(first);
  loop.add(first);
  frames.step(16);
  assert.deepEqual(seen, [["first", 16]]);
  assert.equal(frames.pending(), 1);
  frames.step(32);
  assert.deepEqual(seen, [["first", 16], ["first", 32], ["later", 32]]);
  assert.equal(frames.pending(), 1);
  loop.remove(first);
  loop.remove(later);
  assert.equal(frames.pending(), 0);
});

test("帧内移除保留当前快照派发，下一帧不再运行已移除任务", () => {
  const frames = fakeFrames();
  const loop = createFrameLoop(frames);
  const seen = [];
  const removed = (t) => seen.push(["removed", t]);
  const first = (t) => {
    seen.push(["first", t]);
    loop.remove(removed);
  };
  loop.add(first);
  loop.add(removed);
  frames.step(16);
  assert.equal(loop.has(removed), false);
  assert.deepEqual(seen, [["first", 16], ["removed", 16]]);
  frames.step(32);
  assert.deepEqual(seen, [["first", 16], ["removed", 16], ["first", 32]]);
  loop.remove(first);
});

test("帧内清空并重新添加仍按原快照执行，闲置重启不残留旧任务", () => {
  const frames = fakeFrames();
  const loop = createFrameLoop(frames);
  const seen = [];
  const replacement = (t) => {
    seen.push(["replacement", t]);
    loop.remove(replacement);
  };
  const removed = (t) => seen.push(["removed", t]);
  const first = (t) => {
    seen.push(["first", t]);
    loop.remove(first);
    loop.remove(removed);
    loop.add(replacement);
  };
  loop.add(first);
  loop.add(removed);
  frames.step(16);
  assert.deepEqual(seen, [["first", 16], ["removed", 16]]);
  assert.equal(frames.pending(), 1);
  frames.step(32);
  assert.deepEqual(seen.at(-1), ["replacement", 32]);
  assert.equal(frames.pending(), 0);
  loop.add(replacement);
  frames.step(48);
  assert.deepEqual(seen, [["first", 16], ["removed", 16], ["replacement", 32], ["replacement", 48]]);
  assert.equal(frames.pending(), 0);
});

test("任务异常后清理快照，移除并重启不会重新派发旧回调", () => {
  const frames = fakeFrames();
  const loop = createFrameLoop(frames);
  const seen = [];
  const failure = new Error("frame failure");
  const broken = () => { throw failure; };
  const skipped = () => seen.push("skipped");
  loop.add(broken);
  loop.add(skipped);
  assert.throws(() => frames.step(16), (error) => error === failure);
  assert.equal(frames.pending(), 0);
  loop.remove(broken);
  loop.remove(skipped);
  const restarted = () => { seen.push("restarted"); loop.remove(restarted); };
  loop.add(restarted);
  frames.step(32);
  assert.deepEqual(seen, ["restarted"]);
  assert.equal(frames.pending(), 0);
});
