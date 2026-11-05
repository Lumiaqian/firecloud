// G · 移动手报 — 竖条信笺（竖向窄长），上方手绘天气图标，下方有手绘标注线
const path = require('node:path');
module.exports = async ({ plate, D, outDir }) => {
  const ink = '#514439';
  const P = plate({ id: 'score-compact', w: 50, h: 100, ppm: 9, paper: 'cream', seed: 'sky-compact-strip-5' });

  // 信笺边框（手绘不规则矩形）
  const border = D.curve([
    [5, 4], [45, 3.5], [45.5, 96], [5, 96.5]
  ]);
  P.outline([border], { nib: .55, color: ink });

  // 顶部装饰线
  P.curve([[9, 10], [18, 10.5], [30, 10], [42, 10.5]], { nib: .35, color: '#c4a16a', profile: 'taper' });
  P.curve([[9, 13], [20, 13.5], [32, 13], [42, 13.5]], { nib: .3, color: '#c4a16a', profile: 'taper' });

  // 手绘太阳（小号）
  const sun = D.curve([
    [20, 28], [22, 22], [26, 19], [30, 18], [34, 20], [36, 26],
    [34, 31], [30, 33], [26, 32], [22, 31]
  ]);
  P.colour([sun], '#dcaa55', { pressure: .5, passes: 2, angle: 20 });
  P.outline([sun], { nib: .5, color: ink });
  // 光线
  for (const [a, b] of [
    [[26, 18], [25, 14]], [[30, 17], [31, 13]], [[34, 20], [38, 17]],
    [[20, 24], [16, 22]], [[22, 32], [19, 35]], [[35, 30], [39, 33]]
  ]) P.ink([a, b], { nib: .3, color: '#c4a16a', profile: 'taper' });

  // 中间横线标注区
  P.curve([[9, 44], [20, 44.5], [32, 44], [42, 44.5]], { nib: .14, color: '#a09889' });
  P.curve([[9, 50], [22, 50.5], [35, 50], [42, 50.5]], { nib: .12, color: '#a09889' });
  P.curve([[9, 56], [18, 56.5], [30, 56], [42, 56.5]], { nib: .12, color: '#a09889' });

  // 小云朵（下方区域）
  const cloud = D.curve([
    [12, 66], [16, 62], [22, 61], [28, 63], [34, 61], [38, 64],
    [37, 68], [30, 70], [22, 70], [14, 69]
  ]);
  P.paper([cloud]);
  P.colour([cloud], '#b0c3c8', { pressure: .2, passes: 1, angle: 6 });
  P.outline([cloud], { nib: .4, color: ink });

  // 底部线条
  P.curve([[9, 80], [20, 80.5], [32, 80], [42, 80.5]], { nib: .12, color: '#a09889' });
  P.curve([[9, 85], [22, 85.5], [35, 85], [42, 85.5]], { nib: .12, color: '#a09889' });

  // 底部装饰小标记
  P.ink([[22, 91], [25, 88], [28, 91]], { nib: .4, color: '#b53826', profile: 'taper' });

  await P.finish(path.join(outDir, 'score-compact.png'));
};
