// J · 晨昏窗口轨 — 弧形时间轨迹上有日出/日落标记点和天空云层
const path = require('node:path');
module.exports = async ({ plate, D, outDir }) => {
  const ink = '#514439';
  const P = plate({ id: 'score-timeline', w: 140, h: 70, ppm: 7, paper: 'cream', seed: 'sky-timeline-arc-5' });

  // 时间弧线（大弧，从左到右跨画面）
  P.curve([
    [12, 52], [22, 38], [35, 26], [50, 18], [70, 14],
    [90, 18], [105, 26], [118, 38], [128, 52]
  ], { nib: .55, color: ink, profile: 'taper' });

  // 弧线上的日出点（左侧小太阳）
  const sunrise = D.ell(28, 36, 5, 5);
  P.colour([sunrise], '#dcaa55', { pressure: .45, passes: 2, angle: 22 });
  P.outline([sunrise], { nib: .4, color: ink });
  // 日出光线
  for (const [a, b] of [
    [[28, 31], [28, 27]], [[23, 33], [20, 30]], [[33, 33], [36, 30]]
  ]) P.ink([a, b], { nib: .3, color: '#c4a16a', profile: 'taper' });

  // 弧线上的正午太阳（顶部）
  const noon = D.ell(70, 14, 7, 7);
  P.colour([noon], '#cf7959', { pressure: .55, passes: 2, angle: 28 });
  P.outline([noon], { nib: .5, color: ink });
  // 正午光线
  for (const [a, b] of [
    [[70, 7], [70, 3]], [[63, 11], [59, 7]], [[77, 11], [81, 7]],
    [[63, 18], [59, 21]], [[77, 18], [81, 21]]
  ]) P.ink([a, b], { nib: .35, color: '#c4a16a', profile: 'taper' });

  // 弧线上的日落点（右侧小太阳）
  const sunset = D.ell(112, 36, 5, 5);
  P.colour([sunset], '#b5604a', { pressure: .45, passes: 2, angle: -15 });
  P.outline([sunset], { nib: .4, color: ink });
  // 日落光线
  for (const [a, b] of [
    [[112, 31], [112, 27]], [[107, 33], [104, 30]], [[117, 33], [120, 30]]
  ]) P.ink([a, b], { nib: .3, color: '#c4a16a', profile: 'taper' });

  // 地平线
  P.curve([[6, 55], [30, 54], [55, 55], [80, 54], [105, 55], [134, 54]], { nib: .4, color: ink });

  // 弧线下方的地面
  const ground = D.curve([
    [6, 55], [35, 56], [70, 55], [105, 56], [134, 55],
    [134, 65], [6, 65]
  ]);
  P.colour([ground], '#c1b68d', { pressure: .16, passes: 1, angle: 3 });

  // 云朵（弧线中间位置附近的装饰）
  const cloud = D.curve([
    [45, 28], [50, 24], [56, 23], [62, 25], [65, 29],
    [62, 32], [55, 33], [48, 32]
  ]);
  P.paper([cloud]);
  P.colour([cloud], '#b0c3c8', { pressure: .2, passes: 1, angle: 8 });
  P.outline([cloud], { nib: .4, color: ink });

  // 右上小云
  const cloud2 = D.curve([
    [90, 22], [95, 19], [100, 19], [104, 22], [101, 25], [95, 26]
  ]);
  P.paper([cloud2]);
  P.colour([cloud2], '#b9c8cd', { pressure: .15, passes: 1, angle: -6 });
  P.outline([cloud2], { nib: .35, color: ink });

  // 时间刻度标注线（弧线下方）
  P.curve([[15, 58], [30, 58.5], [45, 58]], { nib: .12, color: '#a09889' });
  P.curve([[55, 58], [70, 58.5], [85, 58]], { nib: .12, color: '#a09889' });
  P.curve([[95, 58], [110, 58.5], [125, 58]], { nib: .12, color: '#a09889' });

  await P.finish(path.join(outDir, 'score-timeline.png'));
};
