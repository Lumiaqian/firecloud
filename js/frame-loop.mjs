/**
 * 共享帧循环：天幕粒子与纸面特效挂在同一个 requestAnimationFrame 上。
 * 没有任务时自动停表，页面空闲时不再每帧清空画布。
 */
export function createFrameLoop({
  request = (callback) => requestAnimationFrame(callback),
  cancel = (id) => cancelAnimationFrame(id)
} = {}) {
  const tasks = new Set();
  let frame = null;

  function run(timestamp) {
    frame = null;
    for (const task of [...tasks]) task(timestamp);
    if (tasks.size && frame == null) frame = request(run);
  }

  return {
    add(task) {
      tasks.add(task);
      if (frame == null) frame = request(run);
    },
    remove(task) {
      tasks.delete(task);
      if (!tasks.size && frame != null) {
        cancel(frame);
        frame = null;
      }
    },
    has: (task) => tasks.has(task)
  };
}
